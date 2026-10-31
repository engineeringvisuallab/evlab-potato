// EVCell spreadsheet editor (Milestone 3a). Windowed rendering: only visible rows are drawn.
import * as FM from '../shared/file-manager.js';
import {createEngine,colName,colIdx,parseRef,shiftRefs,remapSameRow} from './formulas.js';
import {toCsv,importCsvFile} from './import-export.js';
import {chartSvg,extractData} from './charts.js';
import {lib as xlib,exportXlsx,importSpreadsheet} from './xlsx.js';
const RH=24,HW=46,DW=96,esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const okColor=c=>/^#[0-9a-f]{3,8}$/i.test(c||'');
let cur=null;
export const flush=async()=>{if(cur&&cur.dirty)await cur.save()};
export const unmount=()=>{if(cur){cur.dispose();cur=null}};
addEventListener('beforeunload',e=>{if(cur&&cur.dirty){e.preventDefault();e.returnValue=''}});
const ib=(a,l,t)=>`<button class="btn" data-act="${a}" title="${t}" aria-label="${t}">${l}</button>`;
function shiftSheet(sh,axis,at,delta){const mv=(obj,isCell)=>{const out={};for(const k in obj){const m=/^([A-Z]+)(\d+)$/.exec(k);if(!m)continue;let c=colIdx(m[1]),r=+m[2]-1,v=axis==='r'?r:c;
  if(delta>0){if(v>=at)v+=delta}else{if(v===at)continue;if(v>at)v+=delta}
  if(axis==='r')r=v;else c=v;out[colName(c)+(r+1)]=isCell?shiftRefs(obj[k],axis,at,delta):obj[k]}return out};
 sh.cells=mv(sh.cells,true);sh.fmt=mv(sh.fmt||{},false);
 const sk=(o)=>{const n={};for(const k in o){let c=+k;if(delta>0){if(c>=at)c+=delta}else{if(c===at)continue;if(c>at)c+=delta}n[c]=o[k]}return n};
 if(axis==='c')sh.colW=sk(sh.colW||{});else sh.rowH=sk(sh.rowH||{});
 const lo=axis==='r'?'r1':'c1',hi=axis==='r'?'r2':'c2';
 for(const key of ['merges','cf','dv','charts'])sh[key]=(sh[key]||[]).map(m=>{let L=m[lo],H=m[hi];
  if(delta>0){if(L>=at)L+=delta;if(H>=at)H+=delta}else{if(L===H&&L===at)return null;if(at<L){L--;H--}else if(at<=H)H--}
  return{...m,[lo]:L,[hi]:H}}).filter(Boolean);
 const hadF=!!sh.filter;delete sh.filter;return hadF}
export function mount(view,file){
 unmount();
 const data=file.data;if(!Array.isArray(data.sheets)||!data.sheets.length)data.sheets=[{name:'Sheet1',cells:{}}];
 data.sheets.forEach(s=>{s.cells=s.cells||{};s.fmt=s.fmt||{};s.colW=s.colW||{};s.rowH=s.rowH||{};s.merges=s.merges||[];s.freeze=s.freeze||{};s.cf=s.cf||[];s.dv=s.dv||[];s.charts=s.charts||[]});
 let si=0,a={c:0,r:0},e={c:0,r:0},editing=false,dirty=false,rev=0,timer,undo=[],redo=[],drag=false,rz=null,rz2=null,raf=0,eng,D,hid=new Set(),mmap=new Map(),SP=[],CUM=[0];
 view.innerHTML=`<div class="ew-root"><div class="ew-bar"><button class="btn" data-act="home">← Home</button><b id="title"></b>
 <button class="btn" data-act="rename">Rename</button><button class="btn" data-act="saveas">Save as copy</button>
 <button class="btn" data-act="importcsv">Import .csv / .xlsx</button><input type="file" id="csvin" accept=".csv,.xlsx" hidden><button class="btn" data-act="exportcsv">Export .csv</button><button class="btn" data-act="exportxlsx">Export .xlsx</button>
 ${ib('undo','↶','Undo')}${ib('redo','↷','Redo')}</div>
 <div class="ew-bar">${ib('b','<b>B</b>','Bold')}${ib('i','<i>I</i>','Italic')}${ib('left','L','Align left')}${ib('center','C','Align center')}${ib('right','R','Align right')}
 <input type="color" id="bg" value="#ffff99" aria-label="Fill color"><input type="color" id="fg" value="#000000" aria-label="Text color">
 <select id="nf" aria-label="Number format"><option value="gen">General</option><option value="n0">Number (0 dp)</option><option value="n2">Number (2 dp)</option><option value="cur">Currency</option><option value="pct">Percent</option><option value="date">Date</option></select>
 ${ib('bd','Border','Toggle border')}${ib('addrow','+Row','Insert row above')}${ib('delrow','−Row','Delete row')}${ib('addcol','+Col','Insert column left')}${ib('delcol','−Col','Delete column')}</div>
 <div class="ew-bar">${ib('sortasc','Sort A→Z','Sort ascending')}${ib('sortdesc','Sort Z→A','Sort descending')}${ib('filter','Filter on/off','Turn filter on or off')}${ib('filtercol','Filter column…','Choose values for the selected column')}${ib('freezer','Freeze row','Freeze or unfreeze the top row')}${ib('freezec','Freeze column','Freeze or unfreeze the first column')}${ib('merge','Merge','Merge selected cells')}${ib('unmerge','Unmerge','Unmerge selected cell')}${ib('find','Find &amp; replace','Find and replace (Ctrl+F)')}${ib('cf','Cond. format','Conditional formatting')}${ib('dv','Validation','Data validation')}${ib('chart','Chart','Insert chart from selection')}</div>
 <div class="ew-bar" id="fbar" hidden><input id="fq" placeholder="Find" aria-label="Find"><input id="fr" placeholder="Replace with" aria-label="Replace with"><button class="btn" data-act="fprev" aria-label="Previous match">↑</button><button class="btn" data-act="fnext" aria-label="Next match">↓</button><button class="btn" data-act="frep">Replace</button><button class="btn" data-act="frepall">Replace all</button><span id="fcount" class="tag" role="status"></span></div>
 <div class="ec-fbar"><input id="nb" class="ec-nb" aria-label="Name box"><span>fx</span><input id="fx" aria-label="Formula bar"><select id="dvsel" hidden aria-label="Choose a value"></select></div>
 <div class="ec-scroll" id="sc" tabindex="0" aria-label="Spreadsheet grid"><table id="tb"></table><div id="clayer"></div></div><div id="fpop" class="ec-pop" hidden></div>
 <div class="ec-tabs" id="tabs"></div><div class="ec-status"><span id="stat"></span><span id="save" role="status"></span></div></div>`;
 const root=view.firstElementChild,$=s=>root.querySelector(s),sc=$('#sc'),fx=$('#fx'),nb=$('#nb');
 $('#title').textContent=file.name;
 const sh=()=>data.sheets[si],K=(c,r)=>colName(c)+(r+1),raw=(c,r)=>sh().cells[K(c,r)],fmtOf=(c,r)=>sh().fmt[K(c,r)]||{},cw=c=>sh().colW[c]||DW;
 const mkEng=()=>{eng=createEngine((c,r)=>sh().cells[K(c,r)])};
 const dims=()=>{let C=26,R=100;for(const k in sh().cells){const m=/^([A-Z]+)(\d+)$/.exec(k);if(m){C=Math.max(C,colIdx(m[1])+3);R=Math.max(R,+m[2]+20)}}return{C:Math.min(C,702),R:Math.min(R,100000)}};
 mkEng();D=dims();
 const rc=()=>({c1:Math.min(a.c,e.c),c2:Math.max(a.c,e.c),r1:Math.min(a.r,e.r),r2:Math.max(a.r,e.r)});
 const each=(q,fn)=>{for(let r=q.r1;r<=q.r2;r++)for(let c=q.c1;c<=q.c2;c++)fn(c,r)};
 const area=q=>(q.c2-q.c1+1)*(q.r2-q.r1+1);
 const show=(v,f)=>{if(v==null)return'';if(v&&v.err)return v.err;if(typeof v==='boolean')return v?'TRUE':'FALSE';
  if(typeof v==='number'){const nf=f.nf||'gen';
   if(nf==='n0'||nf==='n2'){const d=nf==='n0'?0:2;return v.toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d})}
   if(nf==='cur')return v.toLocaleString('en-US',{style:'currency',currency:'BDT'});if(nf==='pct')return(v*100).toFixed(2)+'%';
   if(nf==='date'){const d=new Date(Date.UTC(1899,11,30)+v*864e5);return isNaN(d)?'#VALUE!':d.toISOString().slice(0,10)}
   return String(+v.toPrecision(12))}return String(v)};
 const sty=f=>(f.b?'font-weight:bold;':'')+(f.i?'font-style:italic;':'')+(['left','center','right'].includes(f.al)?'text-align:'+f.al+';':'')+(okColor(f.bg)?'background:'+f.bg+';':'')+(okColor(f.fg)?'color:'+f.fg+';':'')+(f.bd?'border:1px solid #000;':'');

 const hgt=r=>hid.has(r)?0:(sh().rowH[r]||RH);
 function buildSP(){const st=new Set([...Object.keys(sh().rowH).map(Number),...hid]);SP=[...st].sort((x,y)=>x-y);CUM=[0];SP.forEach(r=>CUM.push(CUM[CUM.length-1]+hgt(r)-RH))}
 const lb=x=>{let lo=0,hi=SP.length;while(lo<hi){const m=(lo+hi)>>1;if(SP[m]<x)lo=m+1;else hi=m}return lo};
 const top=r=>r*RH+CUM[lb(r)];
 const rowAt=y=>{let lo=0,hi=D.R;while(lo<hi){const m=(lo+hi)>>1;if(top(m+1)<=y)lo=m+1;else hi=m}return lo};
 function render(){const{C,R}=D,vh=sc.clientHeight||600,q=rc(),fz=sh().freeze||{},fr=fz.r?1:0,fc=fz.c?1:0,mg=sh().merges||[],fl=sh().filter;
  const start=Math.max(fr,rowAt(sc.scrollTop)-4),rows=fr?[0]:[];let y=0,r0=start;
  for(;r0<R&&y<vh+RH*8;r0++){if(hid.has(r0))continue;rows.push(r0);y+=hgt(r0)}
  const end=r0,pos=new Set(rows),sp0=top(start)-top(fr),spc=n=>`<tr class="sp" style="height:${n}px"><td colspan="${C+1}"></td></tr>`;let spaced=false;
  let h='<colgroup><col style="width:'+HW+'px">';for(let c=0;c<C;c++)h+=`<col style="width:${cw(c)}px">`;
  h+='</colgroup><thead><tr style="height:'+RH+'px"><th class="corner"></th>';
  for(let c=0;c<C;c++)h+=`<th class="${c>=q.c1&&c<=q.c2?'hl':''}${fc&&c===0?' fch':''}${fl&&fl.rules&&fl.rules[c]?' filt':''}">${colName(c)}<i class="rs" data-rs="${c}"></i></th>`;
  h+='</tr></thead><tbody>';
  for(const r of rows){if(!spaced&&!(fr&&r===0)){spaced=true;if(sp0>0)h+=spc(sp0)}
   h+=`<tr style="height:${hgt(r)}px"><th class="${r>=q.r1&&r<=q.r2?'hl':''}"><i class="rsr" data-rsr="${r}"></i>${r+1}</th>`;
   for(let c=0;c<C;c++){const mm=mmap.get(c+','+r);let span='';
    if(mm){const m=mg[mm.i];if(mm.a)span=` colspan="${m.c2-m.c1+1}" rowspan="${rows.filter(x=>x>=m.r1&&x<=m.r2).length}"`;else if(pos.has(m.r1))continue}
    const f=fmtOf(c,r),v=eng.value(c,r),isE=v&&v.err;
    const cls=[c>=q.c1&&c<=q.c2&&r>=q.r1&&r<=q.r2?'sel':'',c===a.c&&r===a.r?'act':'',isE?'err':'',typeof v==='number'&&!f.al?'num':'',fr&&r===0?'fr':'',fc&&c===0?'fc':'',dvList(c,r)?'dvl':''].join(' ');
    h+=`<td data-c="${c}" data-r="${r}"${span} class="${cls}" style="${sty(f)}${cfStyle(c,r,v)}"${isE?` title="${esc(v.msg||v.err)}"`:''}>${esc(show(v,f))}</td>`}h+='</tr>'}
  if(end<R){const b=top(R)-top(end);if(b>0)h+=spc(b)}$('#tb').innerHTML=h+'</tbody>'}
 const rawStr=(c,r)=>{const v=raw(c,r);return v==null?'':String(v)};
 const stats=()=>{const q=rc();let s='';if(area(q)>1&&area(q)<=50000){let sum=0,n=0;each(q,(c,r)=>{const v=eng.value(c,r);if(typeof v==='number'){sum+=v;n++}});s=`Count ${n} · Sum ${+sum.toPrecision(12)} · Avg ${n?+(sum/n).toPrecision(12):'-'}`}const fl=sh().filter;if(fl){const t=Math.max(0,lastRow()-fl.r);s+=(s?' · ':'')+`Filter: ${t-hid.size} of ${t} rows shown`}$('#stat').textContent=s};
 const sync=()=>{nb.value=K(a.c,a.r);if(!editing)fx.value=rawStr(a.c,a.r);stats();dvUi()};
 const parseIn=t=>{const s=String(t);if(s.trim()==='')return undefined;if(s[0]==='=')return s;return/^-?(\d+\.?\d*|\.\d+)$/.test(s.trim())?Number(s.trim()):s};
 const putRaw=(c,r,v)=>{if(c<0||r<0||c>=702||r>=100000)return;if(v===undefined)delete sh().cells[K(c,r)];else sh().cells[K(c,r)]=v};
 const setS=t=>$('#save').textContent=t;
 async function save(){clearTimeout(timer);const r=rev;setS('Saving…');
  try{await FM.save(file);if(r===rev){dirty=false;setS('Saved '+new Date().toLocaleTimeString())}else setS('Unsaved changes')}catch(err){console.error(err);setS('SAVE FAILED: use Export .csv to keep a copy')}}
 const touch=()=>{rev++;dirty=true;setS('Unsaved changes');clearTimeout(timer);timer=setTimeout(save,1500)};
 const tabs=()=>{$('#tabs').innerHTML=data.sheets.map((s,i)=>`<button class="btn tab ${i===si?'on':''}" data-tab="${i}">${esc(s.name)}</button>`).join('')+'<button class="btn" data-act="addsheet" aria-label="Add sheet">+</button><button class="btn" data-act="rensheet">Rename sheet</button><button class="btn" data-act="delsheet">Delete sheet</button>'};
 function afterChange(){rebuild();touch();render();sync()}
 function mutate(fn){undo.push(JSON.stringify(data.sheets));if(undo.length>50)undo.shift();redo=[];fn();afterChange()}
 function doUndo(isRedo){const from=isRedo?redo:undo,to=isRedo?undo:redo;if(!from.length)return;to.push(JSON.stringify(data.sheets));
  data.sheets=JSON.parse(from.pop());si=Math.min(si,data.sheets.length-1);afterChange();tabs()}
 function commit(){if(!editing)return true;const v=parseIn(fx.value),bad=v===undefined?null:dvCheck(a.c,a.r,v);
  if(bad){let keep=false;if(bad.mode==='warn')keep=confirm(bad.msg+'\nKeep this value anyway?');else alert(bad.msg);if(!keep){fx.focus();return false}}
  editing=false;if(v!==raw(a.c,a.r))mutate(()=>putRaw(a.c,a.r,v));else sync();return true}
 function startEdit(init){editing=true;if(init!==undefined)fx.value=init;fx.focus();const n=fx.value.length;try{fx.setSelectionRange(n,n)}catch{}}
function ensure(c,r){const y=top(r),hh=hgt(r),H=(sc.clientHeight||600)-RH-(sh().freeze&&sh().freeze.r?RH:0);if(y<sc.scrollTop)sc.scrollTop=y;else if(y+hh>sc.scrollTop+H)sc.scrollTop=y+hh-H;
  let x=0;for(let i=0;i<c;i++)x+=cw(i);const vw=(sc.clientWidth||800)-HW;if(x<sc.scrollLeft)sc.scrollLeft=x;else if(x+cw(c)>sc.scrollLeft+vw)sc.scrollLeft=x+cw(c)-vw}
 function move(dc,dr,ext){const t=ext?e:a;let c=Math.max(0,Math.min(701,t.c+dc)),r=Math.max(0,Math.min(99999,t.r+dr));
  if(dr){const sg=dr>0?1:-1;while(hid.has(r)&&r>0&&r<99999)r+=sg;if(hid.has(r))r=t.r}
  if(ext)e={c,r};else{a={c,r};e={c,r}}D.R=Math.max(D.R,r+20);D.C=Math.min(702,Math.max(D.C,c+3));ensure(c,r);render();sync()}
  function applyFmt(patch){const q=rc();if(area(q)>50000)return alert('Selection is too large to format (limit 50,000 cells).');
  mutate(()=>each(q,(c,r)=>{const k=K(c,r),f={...(sh().fmt[k]||{}),...patch};for(const x in f)if(f[x]===undefined||f[x]===false)delete f[x];if(Object.keys(f).length)sh().fmt[k]=f;else delete sh().fmt[k]}))}
 const toggle=key=>applyFmt({[key]:!fmtOf(a.c,a.r)[key]});
 function clearRange(){const q=rc();mutate(()=>{for(const k in sh().cells){const m=/^([A-Z]+)(\d+)$/.exec(k),c=colIdx(m[1]),r=+m[2]-1;if(c>=q.c1&&c<=q.c2&&r>=q.r1&&r<=q.r2)delete sh().cells[k]}})}
 const tsv=()=>{const q=rc(),rows=[];for(let r=q.r1;r<=q.r2;r++){const row=[];for(let c=q.c1;c<=q.c2;c++)row.push(rawStr(c,r));rows.push(row.join('\t'))}return rows.join('\n')};
 function switchSheet(i){if(commit()===false)return;si=i;a={c:0,r:0};e={c:0,r:0};rebuild();sc.scrollTop=0;sc.scrollLeft=0;render();sync();tabs()}
 const dl=(name,type,text)=>{const x=document.createElement('a');x.href=URL.createObjectURL(new Blob([text],{type}));x.download=name;x.click();URL.revokeObjectURL(x.href)};
 const base=()=>file.name.replace(/[^\w\- ]+/g,'_');
 function exportCsv(){let C=0,R=0;for(const k in sh().cells){const m=/^([A-Z]+)(\d+)$/.exec(k);C=Math.max(C,colIdx(m[1])+1);R=Math.max(R,+m[2])}
  const rows=[];for(let r=0;r<R;r++){const row=[];for(let c=0;c<C;c++){const v=eng.value(c,r);row.push(v==null?'':v&&v.err?v.err:typeof v==='boolean'?(v?'TRUE':'FALSE'):v)}rows.push(row)}
  dl(base()+'.csv','text/csv;charset=utf-8','\uFEFF'+toCsv(rows))}
 async function exportX(){try{setS('Exporting .xlsx…');const r=await exportXlsx(data,await xlib());
  dl(base()+'.xlsx','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',r.buffer);setS('Exported .xlsx');if(r.warnings.length)alert('Exported with notes:\n'+r.warnings.join('\n'))}
  catch(err){console.error(err);setS('XLSX export failed: '+err.message)}}
 // events
 sc.addEventListener('keydown',ev=>{if(editing)return;const k=ev.key,m=ev.ctrlKey||ev.metaKey;
  if(m){const x=k.toLowerCase();if(x==='z'){ev.preventDefault();doUndo(ev.shiftKey)}else if(x==='y'){ev.preventDefault();doUndo(true)}
   else if(x==='f'||x==='h'){ev.preventDefault();toggleFind()}else if(x==='b'){ev.preventDefault();toggle('b')}else if(x==='i'){ev.preventDefault();toggle('i')}
   else if(x==='a'){ev.preventDefault();a={c:0,r:0};e={c:D.C-1,r:D.R-1};render();sync()}return}
  const mv={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]}[k];
  if(mv){ev.preventDefault();move(mv[0],mv[1],ev.shiftKey)}else if(k==='Enter'){ev.preventDefault();move(0,ev.shiftKey?-1:1)}
  else if(k==='Tab'){ev.preventDefault();move(ev.shiftKey?-1:1,0)}else if(k==='Delete'||k==='Backspace'){ev.preventDefault();clearRange()}
  else if(k==='F2'){ev.preventDefault();startEdit()}else if(k.length===1&&!ev.altKey){ev.preventDefault();startEdit(k)}});
 fx.addEventListener('input',()=>{editing=true});
 fx.addEventListener('keydown',ev=>{if(ev.key==='Enter'){ev.preventDefault();if(commit()===false)return;move(0,1);sc.focus()}
  else if(ev.key==='Tab'){ev.preventDefault();if(commit()===false)return;move(1,0);sc.focus()}else if(ev.key==='Escape'){editing=false;sync();sc.focus()}});
 nb.addEventListener('keydown',ev=>{if(ev.key!=='Enter')return;ev.preventDefault();const p=parseRef(nb.value);if(!p){alert('Invalid cell reference');sync();return}
  a={c:p.c,r:p.r};e={...a};D.R=Math.max(D.R,p.r+20);D.C=Math.max(D.C,p.c+3);ensure(p.c,p.r);render();sync();sc.focus()});
 sc.addEventListener('mousedown',ev=>{const rr=ev.target.closest('[data-rsr]');if(rr){ev.preventDefault();rz2={r:+rr.dataset.rsr,y:ev.clientY,h:hgt(+rr.dataset.rsr)};return}
  const rs=ev.target.closest('[data-rs]');if(rs){ev.preventDefault();rz={c:+rs.dataset.rs,x:ev.clientX,w:cw(+rs.dataset.rs)};return}
  const td=ev.target.closest('td[data-c]');if(!td)return;ev.preventDefault();if(commit()===false)return;const c=+td.dataset.c,r=+td.dataset.r;
  if(ev.shiftKey)e={c,r};else{a={c,r};e={c,r}}drag=true;render();sync();sc.focus()});
 sc.addEventListener('mouseover',ev=>{if(!drag)return;const td=ev.target.closest('td[data-c]');if(!td)return;const c=+td.dataset.c,r=+td.dataset.r;if(c!==e.c||r!==e.r){e={c,r};render();sync()}});
 sc.addEventListener('dblclick',ev=>{if(ev.target.closest('td[data-c]'))startEdit()});
 sc.addEventListener('scroll',()=>{if(!raf)raf=requestAnimationFrame(()=>{raf=0;render()})});
 sc.addEventListener('copy',ev=>{ev.preventDefault();ev.clipboardData.setData('text/plain',tsv())});
 sc.addEventListener('cut',ev=>{ev.preventDefault();ev.clipboardData.setData('text/plain',tsv());clearRange()});
 sc.addEventListener('paste',ev=>{ev.preventDefault();const t=ev.clipboardData.getData('text/plain');if(!t)return;
  const rows=t.replace(/\r/g,'').replace(/\n$/,'').split('\n').map(l=>l.split('\t'));
  if(rows.length*Math.max(...rows.map(r=>r.length))>50000)return alert('Paste is too large (limit 50,000 cells).');
  mutate(()=>rows.forEach((row,i)=>row.forEach((v,j)=>putRaw(a.c+j,a.r+i,parseIn(v)))))});
 const onMove=ev=>{if(rz){sh().colW[rz.c]=Math.max(30,rz.w+ev.clientX-rz.x);render()}if(rz2){sh().rowH[rz2.r]=Math.max(18,Math.min(400,rz2.h+ev.clientY-rz2.y));buildSP();render()}if(cd){if(cd.mode==='move'){cd.ch.x=Math.max(0,cd.ox+ev.clientX-cd.x);cd.ch.y=Math.max(0,cd.oy+ev.clientY-cd.y)}else{cd.ch.w=Math.max(200,Math.min(1200,cd.ow+ev.clientX-cd.x));cd.ch.h=Math.max(150,Math.min(900,cd.oh+ev.clientY-cd.y))}renderCharts()}};
 const onUp=()=>{drag=false;if(rz){rz=null;touch()}if(rz2){rz2=null;touch()}if(cd){cd=null;touch()}};
 const vis=()=>{if(document.hidden&&dirty)save()};
 document.addEventListener('mousemove',onMove);document.addEventListener('mouseup',onUp);document.addEventListener('visibilitychange',vis);
 $('#bg').onchange=ev=>okColor(ev.target.value)&&applyFmt({bg:ev.target.value});$('#fg').onchange=ev=>okColor(ev.target.value)&&applyFmt({fg:ev.target.value});
 $('#nf').onchange=ev=>applyFmt({nf:ev.target.value==='gen'?undefined:ev.target.value});
 $('#csvin').onchange=async ev=>{const f=ev.target.files[0];ev.target.value='';if(!f)return;
  try{const r=await importSpreadsheet(f,FM);if(r.warnings.length)alert('Imported as a new spreadsheet. Notes:\n'+r.warnings.join('\n'));location.hash='#/file/'+r.file.id}catch(err){console.error(err);alert('Import failed: '+err.message)}};
 root.addEventListener('click',async ev=>{const b=ev.target.closest('button');if(!b)return;
  if(b.dataset.tab!==undefined)return switchSheet(+b.dataset.tab);const x=b.dataset.act;if(commit()===false)return;
  if(x==='home'){await flush();location.hash='#/'}
  else if(x==='rename'){const n=prompt('Spreadsheet name',file.name);if(n&&n.trim()){file.name=n.trim();$('#title').textContent=file.name;touch()}}
  else if(x==='saveas'){const n=prompt('Name for the copy',file.name+' (copy)');if(!n||!n.trim())return;await save();if(dirty)return;
   const c=await FM.duplicate(file.id);await FM.rename(c.id,n.trim());location.hash='#/file/'+c.id}
  else if(x==='importcsv')$('#csvin').click();else if(x==='exportcsv')exportCsv();else if(x==='exportxlsx')await exportX();
  else if(x==='undo')doUndo(false);else if(x==='redo')doUndo(true);
  else if(x==='b'||x==='i'||x==='bd')toggle(x);else if(['left','center','right'].includes(x))applyFmt({al:x});
  else if(x==='addrow')struct('r',1);else if(x==='delrow')struct('r',-1);
  else if(x==='addcol')struct('c',1);else if(x==='delcol')struct('c',-1);
  else if(x==='addsheet'){mutate(()=>data.sheets.push({name:'Sheet'+(data.sheets.length+1),cells:{},fmt:{},colW:{},rowH:{},merges:[],freeze:{}}));switchSheet(data.sheets.length-1)}
  else if(x==='rensheet'){const n=prompt('Sheet name',sh().name);if(n&&n.trim()){mutate(()=>{sh().name=n.trim().slice(0,31)});tabs()}}
  else if(x==='delsheet'){if(data.sheets.length<2)return alert('A workbook needs at least one sheet.');
   if(confirm('Delete sheet "'+sh().name+'"? You can undo this.')){mutate(()=>data.sheets.splice(si,1));si=Math.min(si,data.sheets.length-1);switchSheet(si)}}
  else if(b.dataset.chd){mutate(()=>{sh().charts=sh().charts.filter(c=>c.id!==b.dataset.chd)})}
  else if(x==='cf')cfPop();else if(x==='dv')dvPop();else if(x==='chart')chartPop();
  else if(x==='cfadd'){const q=rc(),op=$('#cf-op').value,v1=$('#cf-v1').value,v2=$('#cf-v2').value;
   if(!['blank','nonblank'].includes(op)&&v1==='')return alert('Enter a value for the rule.');if(op==='between'&&v2==='')return alert('Enter both values for "between".');
   if(['gt','lt','between'].includes(op)&&(!isFinite(v1)||(op==='between'&&!isFinite(v2))))return alert('This rule needs numbers.');
   mutate(()=>sh().cf.push({...q,op,v1,v2,bg:$('#cf-bg').value,fg:$('#cf-fg').value}));cfPop()}
  else if(x==='cfdel'){mutate(()=>sh().cf.splice(+b.dataset.i,1));cfPop()}
  else if(x==='dvapply'){const q=rc(),type=$('#dv-type').value,min=$('#dv-min').value.trim(),max=$('#dv-max').value.trim(),list=$('#dv-list').value;
   if(type==='list'&&!list.split(',').some(t=>t.trim()))return alert('Enter at least one list item.');
   if(type!=='list'&&((min!==''&&!isFinite(min))||(max!==''&&!isFinite(max))))return alert('Min and max must be numbers.');
   if(type!=='list'&&min===''&&max==='')return alert('Enter a min, a max, or both.');
   mutate(()=>{sh().dv=sh().dv.filter(m=>!overlap(m,q));sh().dv.push({...q,type,min,max,list,mode:$('#dv-mode').value,msg:$('#dv-msg').value})});$('#fpop').hidden=true}
  else if(x==='dvremove'){const q=rc();mutate(()=>{sh().dv=sh().dv.filter(m=>!overlap(m,q))});$('#fpop').hidden=true}
  else if(x==='chinsert'){const q=rc(),hr=$('#ch-hr').checked,hc=$('#ch-hc').checked;
   if(area(q)>10000)return alert('Chart data is too large (limit 10,000 cells).');
   if(q.r2-q.r1+1<=(hr?1:0)||q.c2-q.c1+1<=(hc?1:0))return alert('The selection has no data cells after removing the label row/column.');
   mutate(()=>sh().charts.push({id:Date.now()+''+Math.floor(Math.random()*1000),type:$('#ch-type').value,title:$('#ch-title').value.trim(),...q,hdrRow:hr,hdrCol:hc,x:Math.round(sc.scrollLeft+HW+20),y:Math.round(sc.scrollTop+RH+20),w:420,h:300}));$('#fpop').hidden=true}
  else if(x==='sortasc')sortRange(false);else if(x==='sortdesc')sortRange(true);
  else if(x==='filter')toggleFilter();else if(x==='filtercol')filterPop();
  else if(x==='fapply'||x==='fclear'){const pop=$('#fpop'),c=pop._c,list=pop._list;let allowed;
   if(x==='fapply'){const on=[...pop.querySelectorAll('input[data-v]')].filter(i=>i.checked).map(i=>list[+i.dataset.v]);allowed=on.length===list.length?undefined:on}
   mutate(()=>{const f=sh().filter;if(!f)return;if(allowed)f.rules[c]=allowed;else delete f.rules[c]});pop.hidden=true}
  else if(x==='fclose')$('#fpop').hidden=true;
  else if(x==='freezer')mutate(()=>{sh().freeze={...sh().freeze,r:sh().freeze&&sh().freeze.r?0:1}});
  else if(x==='freezec')mutate(()=>{sh().freeze={...sh().freeze,c:sh().freeze&&sh().freeze.c?0:1}});
  else if(x==='merge')doMerge();else if(x==='unmerge')doUnmerge();
  else if(x==='find')toggleFind();else if(x==='fnext')gof(1);else if(x==='fprev')gof(-1);else if(x==='frep')repOne();else if(x==='frepall')repAll();
  sc.focus()});

 function buildMerge(){mmap=new Map();(sh().merges||[]).forEach((m,i)=>{for(let r=m.r1;r<=m.r2;r++)for(let c=m.c1;c<=m.c2;c++)mmap.set(c+','+r,{i,a:c===m.c1&&r===m.r1})})}
 const lastRow=()=>{let R=0;for(const k in sh().cells){const m=/^([A-Z]+)(\d+)$/.exec(k);if(m)R=Math.max(R,+m[2]-1)}return R};
 function recalcHidden(){hid=new Set();const f=sh().filter;if(!f||!f.rules)return;const L=lastRow(),cols=Object.keys(f.rules).map(Number);
  for(let r=f.r+1;r<=L;r++)for(const c of cols){const v=show(eng.value(c,r),{})||'(blank)';if(!f.rules[c].includes(v)){hid.add(r);break}}}
 function rebuild(){const s0=sh();for(const k of ['cf','dv','charts','merges'])s0[k]=s0[k]||[];for(const k of ['cells','fmt','colW','rowH','freeze'])s0[k]=s0[k]||{};mkEng();D=dims();buildMerge();recalcHidden();buildSP();renderCharts()}
 const struct=(ax,d)=>mutate(()=>{if(shiftSheet(sh(),ax,ax==='r'?a.r:a.c,d))alert('The filter was removed because rows/columns changed.')});
 function sortRange(desc){let q=rc(),keyC=a.c;
  if(area(q)===1){let C=0;for(const k in sh().cells){const m=/^([A-Z]+)/.exec(k);C=Math.max(C,colIdx(m[1]))}q={c1:0,c2:C,r1:0,r2:lastRow()}}else if(a.c<q.c1||a.c>q.c2)keyC=q.c1;
  if(confirm('Does the first row contain headers? OK = yes (it stays in place), Cancel = no.'))q.r1++;
  if(q.r2<=q.r1)return;
  if((sh().merges||[]).some(m=>m.r2>=q.r1&&m.r1<=q.r2&&m.c2>=q.c1&&m.c1<=q.c2))return alert('Sorting a range with merged cells is not supported. Unmerge them first.');
  const rows=[];for(let r=q.r1;r<=q.r2;r++){const cells=[],fm=[];for(let c=q.c1;c<=q.c2;c++){cells.push(raw(c,r));fm.push(sh().fmt[K(c,r)])}rows.push({r,cells,fm,key:eng.value(keyC,r)})}
  const rank=v=>v==null||v===''?3:v&&v.err?2:typeof v==='number'?0:1;
  rows.sort((x,y)=>{const p=rank(x.key),o=rank(y.key);if(p===3||o===3)return p-o;if(p!==o)return desc?o-p:p-o;
   const d=p===0?x.key-y.key:p===1?String(x.key).toLowerCase().localeCompare(String(y.key).toLowerCase()):0;return desc?-d:d});
  mutate(()=>{for(let r=q.r1;r<=q.r2;r++)for(let c=q.c1;c<=q.c2;c++){delete sh().cells[K(c,r)];delete sh().fmt[K(c,r)]}
   rows.forEach((row,i)=>{const nr=q.r1+i;row.cells.forEach((v,j)=>{const c=q.c1+j;if(v!==undefined)sh().cells[K(c,nr)]=remapSameRow(v,row.r,nr);if(row.fm[j])sh().fmt[K(c,nr)]=row.fm[j]})})})}
 function toggleFilter(){const s=sh();if(s.filter){mutate(()=>{delete sh().filter});return}
  const r=a.r;mutate(()=>{sh().filter={r,rules:{}}});alert('Filter is on. Row '+(r+1)+' is the header row. Select a column and press "Filter column…" to choose values.')}
 function filterPop(){const f=sh().filter;if(!f)return alert('Turn the filter on first (select the header row, then press "Filter on/off").');
  const c=a.c,L=lastRow(),vals=new Set();for(let r=f.r+1;r<=L;r++)vals.add(show(eng.value(c,r),{})||'(blank)');
  if(vals.size>200)return alert('This column has more than 200 different values; filtering is limited to 200.');
  const list=[...vals].sort((x,y)=>x.localeCompare(y,undefined,{numeric:true})),al=f.rules[c],pop=$('#fpop');
  pop.innerHTML=`<b>Filter column ${colName(c)}</b><div class="ec-list">${list.map((v,i)=>`<label><input type="checkbox" data-v="${i}" ${!al||al.includes(v)?'checked':''}> ${esc(v)}</label>`).join('')}</div><button class="btn primary" data-act="fapply">Apply</button> <button class="btn" data-act="fclear">Clear column</button> <button class="btn" data-act="fclose">Close</button>`;
  pop._list=list;pop._c=c;pop.hidden=false}
 function doMerge(){const q=rc();if(area(q)<2)return alert('Select two or more cells to merge.');if(area(q)>10000)return alert('Merge area is too large (limit 10,000 cells).');
  let others=false;each(q,(c,r)=>{if((c!==q.c1||r!==q.r1)&&raw(c,r)!==undefined)others=true});
  if(others&&!confirm('Merging keeps only the top-left value; other values in the range will be removed. Continue?'))return;
  mutate(()=>{const s=sh();s.merges=(s.merges||[]).filter(m=>!(m.c1<=q.c2&&m.c2>=q.c1&&m.r1<=q.r2&&m.r2>=q.r1));
   each(q,(c,r)=>{if(c!==q.c1||r!==q.r1)delete s.cells[K(c,r)]});s.merges.push({c1:q.c1,c2:q.c2,r1:q.r1,r2:q.r2});a={c:q.c1,r:q.r1};e={...a}})}
 const doUnmerge=()=>mutate(()=>{sh().merges=(sh().merges||[]).filter(m=>!(a.c>=m.c1&&a.c<=m.c2&&a.r>=m.r1&&a.r<=m.r2))});
 let fm=[];const isF=(c,r)=>{const v=raw(c,r);return typeof v==='string'&&v[0]==='='};
 const txt=(c,r)=>isF(c,r)?show(eng.value(c,r),{}):rawStr(c,r);
 function toggleFind(){const b=$('#fbar');b.hidden=!b.hidden;if(!b.hidden){$('#fq').focus();$('#fq').select()}else sc.focus()}
 function findAll(){const q=$('#fq').value.toLowerCase();fm=[];if(!q)return;
  for(const k in sh().cells){const m=/^([A-Z]+)(\d+)$/.exec(k),c=colIdx(m[1]),r=+m[2]-1;if(txt(c,r).toLowerCase().includes(q))fm.push({c,r})}fm.sort((x,y)=>x.r-y.r||x.c-y.c)}
 function gof(d){findAll();const ct=$('#fcount');if(!fm.length){ct.textContent=$('#fq').value?'No matches':'';return}
  let i;if(d===0){i=fm.findIndex(m=>m.r>a.r||(m.r===a.r&&m.c>=a.c));if(i<0)i=0}
  else{const cu=fm.findIndex(m=>m.r===a.r&&m.c===a.c);i=cu<0?(d>0?0:fm.length-1):(cu+d+fm.length)%fm.length}
  const m=fm[i];a={c:m.c,r:m.r};e={...a};ensure(m.c,m.r);render();sync();ct.textContent=(i+1)+' of '+fm.length}
 const rx=()=>new RegExp($('#fq').value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'gi');
 function repOne(){findAll();const m=fm.find(x=>x.r===a.r&&x.c===a.c);if(!m)return gof(1);
  if(isF(m.c,m.r)){$('#fcount').textContent='That cell is a formula, so Replace skips it';return gof(1)}
  const rp=$('#fr').value;mutate(()=>putRaw(m.c,m.r,parseIn(txt(m.c,m.r).replace(rx(),()=>rp))));gof(1)}
 function repAll(){findAll();const todo=fm.filter(m=>!isF(m.c,m.r)),sk=fm.length-todo.length,note=sk?' ('+sk+' formula cells skipped)':'';
  if(!todo.length){$('#fcount').textContent='Replaced 0'+note;return}const rp=$('#fr').value;
  mutate(()=>todo.forEach(m=>putRaw(m.c,m.r,parseIn(txt(m.c,m.r).replace(rx(),()=>rp)))));$('#fcount').textContent='Replaced '+todo.length+note}
 $('#fq').addEventListener('keydown',ev=>{if(ev.key==='Enter'){ev.preventDefault();gof(ev.shiftKey?-1:1)}});$('#fq').addEventListener('input',()=>gof(0));

 let cd=null;
 const rtxt=m=>colName(m.c1)+(m.r1+1)+':'+colName(m.c2)+(m.r2+1),inR=(m,c,r)=>c>=m.c1&&c<=m.c2&&r>=m.r1&&r<=m.r2,overlap=(m,q)=>!(m.c1>q.c2||m.c2<q.c1||m.r1>q.r2||m.r2<q.r1);
 const CFN={gt:'greater than',lt:'less than',eq:'equal to',ne:'not equal to',between:'between',contains:'text contains',blank:'is blank',nonblank:'is not blank'};
 function cfHit(m,v){if(v&&v.err)return false;const t=String(v==null?'':v).toLowerCase(),num=m.v1!==''&&isFinite(m.v1);
  switch(m.op){case'blank':return v==null||v==='';case'nonblank':return!(v==null||v==='');
   case'gt':return typeof v==='number'&&v>+m.v1;case'lt':return typeof v==='number'&&v<+m.v1;
   case'between':return typeof v==='number'&&v>=Math.min(+m.v1,+m.v2)&&v<=Math.max(+m.v1,+m.v2);
   case'eq':return num?typeof v==='number'&&v===+m.v1:t===String(m.v1).toLowerCase();
   case'ne':return num?!(typeof v==='number'&&v===+m.v1):t!==String(m.v1).toLowerCase();
   case'contains':return t.includes(String(m.v1).toLowerCase())}return false}
 const cfStyle=(c,r,v)=>{let st='';for(const m of sh().cf)if(inR(m,c,r)&&cfHit(m,v)){if(okColor(m.bg))st+='background:'+m.bg+';';if(okColor(m.fg))st+='color:'+m.fg+';'}return st};
 function cfPop(){const pop=$('#fpop'),rs=sh().cf;
  pop.innerHTML=`<b>Conditional formatting</b><div class="ec-list">${rs.map((m,i)=>`<div>${rtxt(m)} ${CFN[m.op]} ${esc(m.v1)}${m.op==='between'?' and '+esc(m.v2):''} <span class="swatch" style="background:${okColor(m.bg)?m.bg:'none'};color:${okColor(m.fg)?m.fg:'inherit'}">Aa</span> <button class="btn" data-act="cfdel" data-i="${i}">Delete</button></div>`).join('')||'<span class="tag">No rules yet.</span>'}</div>
  <div>New rule for ${rtxt(rc())}:</div><select id="cf-op">${Object.entries(CFN).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select> <input id="cf-v1" placeholder="value" size="8"> <input id="cf-v2" placeholder="and" size="8"> fill <input type="color" id="cf-bg" value="#ffc7ce"> text <input type="color" id="cf-fg" value="#9c0006"><br><button class="btn primary" data-act="cfadd">Add rule</button> <button class="btn" data-act="fclose">Close</button>`;pop.hidden=false}
 const rng=m=>(m.min!==''&&m.min!=null?' from '+m.min:'')+(m.max!==''&&m.max!=null?' to '+m.max:'');
 const dvRule=(c,r)=>{const L=sh().dv;for(let i=L.length-1;i>=0;i--)if(inR(L[i],c,r))return L[i]};
 const dvList=(c,r)=>{const m=dvRule(c,r);return m&&m.type==='list'?m.list.split(',').map(t=>t.trim()).filter(Boolean):null};
 function dvCheck(c,r,v){const m=dvRule(c,r);if(!m||(typeof v==='string'&&v[0]==='='))return null;
  const lo=m.min===''||m.min==null?-Infinity:+m.min,hi=m.max===''||m.max==null?Infinity:+m.max;let ok=true,def='';
  if(m.type==='whole'){ok=typeof v==='number'&&Number.isInteger(v)&&v>=lo&&v<=hi;def='Enter a whole number'+rng(m)}
  else if(m.type==='decimal'){ok=typeof v==='number'&&v>=lo&&v<=hi;def='Enter a number'+rng(m)}
  else if(m.type==='length'){const n=String(v).length;ok=n>=lo&&n<=hi;def='Enter text with a length'+rng(m)}
  else if(m.type==='list'){const L=dvList(c,r);ok=L.some(t=>t.toLowerCase()===String(v).toLowerCase());def='Choose one of: '+L.join(', ')}
  return ok?null:{mode:m.mode,msg:m.msg||def}}
 function dvUi(){const s=$('#dvsel'),L=dvList(a.c,a.r);if(!L){s.hidden=true;return}s.innerHTML='<option value="">▾ choose…</option>'+L.map(t=>`<option>${esc(t)}</option>`).join('');s.hidden=false}
 $('#dvsel').onchange=ev=>{const v=ev.target.value;if(!v)return;mutate(()=>putRaw(a.c,a.r,parseIn(v)));sc.focus()};
 function dvPop(){const pop=$('#fpop');pop.innerHTML=`<b>Data validation for ${rtxt(rc())}</b><br><select id="dv-type"><option value="whole">Whole number</option><option value="decimal">Number (decimal)</option><option value="list">List</option><option value="length">Text length</option></select> <input id="dv-min" placeholder="min" size="6"> <input id="dv-max" placeholder="max" size="6"><br><input id="dv-list" placeholder="List items, comma separated" size="30"><br><select id="dv-mode"><option value="stop">Block invalid entries</option><option value="warn">Warn but allow</option></select><br><input id="dv-msg" placeholder="Message (optional)" size="30"><br><button class="btn primary" data-act="dvapply">Apply</button> <button class="btn" data-act="dvremove">Remove from selection</button> <button class="btn" data-act="fclose">Close</button><p class="tag">Applying replaces any rule that touches the selection. Typed entries are checked; pasted values and existing values are not.</p>`;pop.hidden=false}
 function chartPop(){const q=rc();if(area(q)<2)return alert('Select the data first, including labels (for example A1:C6).');const pop=$('#fpop');
  pop.innerHTML=`<b>Insert chart from ${rtxt(q)}</b><br><select id="ch-type"><option>column</option><option>bar</option><option>line</option><option>area</option><option>pie</option></select> <input id="ch-title" placeholder="Title" size="20"><br><label><input type="checkbox" id="ch-hr" checked> First row = series names</label><br><label><input type="checkbox" id="ch-hc" checked> First column = category labels</label><br><button class="btn primary" data-act="chinsert">Insert</button> <button class="btn" data-act="fclose">Close</button>`;pop.hidden=false}
 function renderCharts(){$('#clayer').innerHTML=(sh().charts||[]).map(ch=>`<div class="ec-chart" data-ch="${ch.id}" style="left:${ch.x}px;top:${ch.y}px;width:${ch.w}px;height:${ch.h}px"><div class="ec-chh" data-chm="${ch.id}"><span class="ec-cht" data-chn="${ch.id}" title="Double-click to rename">${esc(ch.title||'Chart')}</span><select data-cht="${ch.id}" aria-label="Chart type">${['column','bar','line','area','pie'].map(t=>`<option ${t===ch.type?'selected':''}>${t}</option>`).join('')}</select><button class="btn" data-chd="${ch.id}" aria-label="Delete chart">✕</button></div><div class="ec-chb">${chartSvg(ch,extractData(ch,(c,r)=>eng.value(c,r)),ch.w,ch.h-30)}</div><i class="ec-chr" data-chr="${ch.id}"></i></div>`).join('')}
 $('#clayer').addEventListener('mousedown',ev=>{if(ev.target.closest('select,button'))return;const mv=ev.target.closest('[data-chm]'),rs=ev.target.closest('[data-chr]'),id=mv?mv.dataset.chm:rs?rs.dataset.chr:null;if(!id)return;
  const ch=sh().charts.find(c=>c.id===id);if(!ch)return;ev.preventDefault();ev.stopPropagation();cd={ch,mode:mv?'move':'size',x:ev.clientX,y:ev.clientY,ox:ch.x,oy:ch.y,ow:ch.w,oh:ch.h}});
 root.addEventListener('change',ev=>{const id=ev.target.dataset&&ev.target.dataset.cht;if(!id)return;mutate(()=>{const ch=sh().charts.find(c=>c.id===id);if(ch)ch.type=ev.target.value})});
 root.addEventListener('dblclick',ev=>{const t=ev.target.closest('[data-chn]');if(!t)return;const ch=sh().charts.find(c=>c.id===t.dataset.chn);if(!ch)return;const n=prompt('Chart title',ch.title||'');
  if(n!==null)mutate(()=>{const c2=sh().charts.find(c=>c.id===ch.id);if(c2)c2.title=n.trim()})});
 rebuild();tabs();render();sync();setS('Opened');
 cur={get dirty(){return dirty},save,dispose(){clearTimeout(timer);document.removeEventListener('mousemove',onMove);document.removeEventListener('mouseup',onUp);document.removeEventListener('visibilitychange',vis)}};
}
