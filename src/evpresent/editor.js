// EVPresent slide editor (Milestones 4a-4b). Slides are plain HTML elements on a 960-unit-wide canvas (no canvas library).
import * as FM from '../shared/file-manager.js';
import {chartSvg} from '../evcell/charts.js';
import {parseCsv,toCsv} from '../evcell/import-export.js';
const W=960,FONTS=['Arial','Times New Roman','Georgia','Courier New','Noto Sans Bengali'],SHAPES={rect:'Rectangle',ellipse:'Ellipse',round:'Rounded'},CT=['column','bar','line','area','pie'];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const okc=c=>/^#[0-9a-f]{3,8}$/i.test(c||''),uid=()=>Math.random().toString(36).slice(2,9),SH=d=>d.ratio==='4:3'?720:540;
const getText=el=>el.innerText!==undefined?el.innerText:el.textContent;
const DEF_TH=()=>({heading:'Arial',body:'Arial',colors:['#2b6cd9','#1f9d55','#f2724b','#e8b931']});
let TH=DEF_TH();
const R=v=>/^T:[0-3]$/.test(v||'')?TH.colors[+v[2]]:v,rc=v=>{const c=R(v);return okc(c)?c:''},F=f=>f==='T:heading'?TH.heading:f==='T:body'?TH.body:FONTS.includes(f)?f:'Arial';
const bgCss=s=>s.grad&&okc(s.grad.c1)&&okc(s.grad.c2)?`background:linear-gradient(${Math.round(+s.grad.angle||0)}deg,${s.grad.c1},${s.grad.c2});`:`background:${okc(s.bg)?s.bg:'#ffffff'};`;
let cur=null;
export const flush=async()=>{if(cur&&cur.dirty)await cur.save()};
export const unmount=()=>{if(cur){cur.dispose();cur=null}};
addEventListener('beforeunload',e=>{if(cur&&cur.dirty){e.preventDefault();e.returnValue=''}});
const T=(x,y,w,h,text,fs,ex={})=>({type:'text',x,y,w,h,text,fs,color:'#222222',font:'T:body',...ex});
function layoutObjects(l,h,title){let ob=[];const hd={bold:true,font:'T:heading'};
 if(l==='title')ob=[T(80,h/2-110,800,110,title||'Presentation title',48,hd),T(80,h/2+20,800,60,'Subtitle or presenter',24,{color:'#666666'})];
 else if(l==='content')ob=[T(60,40,840,70,title||'Slide title',36,hd),T(60,130,840,h-190,'• First point\n• Second point\n• Third point',24)];
 else if(l==='two')ob=[T(60,40,840,70,title||'Slide title',36,hd),T(60,130,410,h-190,'• Left column',24),T(490,130,410,h-190,'• Right column',24)];
 else if(l==='section')ob=[{type:'shape',shape:'rect',x:60,y:h/2-90,w:10,h:130,fill:'T:2',stroke:'',sw:0,text:'',color:'#ffffff',fs:24,font:'T:body'},T(90,h/2-90,780,130,title||'Section title',44,hd)];
 return ob.map(o=>({id:uid(),...o}))}
function look(o){let s=`left:${+o.x||0}px;top:${+o.y||0}px;width:${Math.max(1,+o.w||1)}px;height:${Math.max(1,+o.h||1)}px;`;if(o.type==='image'||o.type==='chart')return s;
 s+=`font-family:'${F(o.font)}',sans-serif;font-size:${Math.max(6,Math.min(300,+o.fs||24))}px;color:${rc(o.color)||'#222222'};text-align:${['left','center','right'].includes(o.al)?o.al:o.type==='shape'?'center':'left'};`;
 if(o.bold)s+='font-weight:bold;';if(o.italic)s+='font-style:italic;';if(rc(o.fill))s+=`background:${rc(o.fill)};`;
 if(rc(o.stroke)&&+o.sw>0)s+=`border:${Math.min(40,+o.sw)}px solid ${rc(o.stroke)};`;
 if(o.type==='shape'){if(o.shape==='ellipse')s+='border-radius:50%;';else if(o.shape==='round')s+='border-radius:24px;'}return s}
const chartData=o=>{const d=o.data;if(!d||!Array.isArray(d.labels)||!Array.isArray(d.series))return{labels:[],series:[]};const labels=d.labels.slice(0,50).map(String);
 return{labels,series:d.series.slice(0,8).map(s=>({name:String(s&&s.name||'Series'),values:labels.map((_,i)=>{const v=Number(s&&Array.isArray(s.values)?s.values[i]:0);return Number.isFinite(v)?v:0})}))}};
const objHtml=(o,live,ss)=>{const isSel=live&&ss.has(o.id),one=isSel&&ss.size===1;let inner;
 if(o.type==='image')inner=/^data:image\//.test(o.src||'')?`<img src="${esc(o.src)}" alt="${esc(o.alt||'Image')}" draggable="false">`:'';
 else if(o.type==='chart'){const tt=o.title?28:0;inner=`${tt?`<div class="ep-ctitle">${esc(o.title)}</div>`:''}${chartSvg({type:CT.includes(o.ctype)?o.ctype:'column',title:o.title||''},chartData(o),Math.max(60,Math.round(o.w)),Math.max(60,Math.round(o.h)-tt))}`}
 else if(o.type==='table'){const hf=rc(o.hfill||'T:0')||'#2b6cd9';inner=`<table class="ep-tbl"><tbody>${(Array.isArray(o.rows)?o.rows:[]).map((r,ri)=>`<tr>${r.map((c,ci)=>`<td data-cr="${ri}" data-cc="${ci}"${ri===0&&o.hdr!==false?` style="background:${hf};color:#ffffff;font-weight:bold"`:''}>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`}
 else inner=`<div class="ep-t">${esc(o.text||'')}</div>`;
 return`<div class="ep-o ep-${esc(o.type)}${isSel?' sel':''}" data-id="${esc(o.id)}" style="${look(o)}">${inner}${one?['nw','ne','sw','se'].map(h=>`<i class="ep-h ep-h-${h}" data-h="${h}"></i>`).join(''):''}</div>`};
export function mount(view,file){
 unmount();const data=file.data;data.ratio=data.ratio==='4:3'?'4:3':'16:9';
 const th0=data.theme;if(!th0||!FONTS.includes(th0.heading)||!FONTS.includes(th0.body)||!Array.isArray(th0.colors)||th0.colors.length!==4||!th0.colors.every(okc))data.theme=DEF_TH();TH=data.theme;
 if(!Array.isArray(data.slides)||!data.slides.length)data.slides=[{layout:'blank',objects:[]}];
 data.slides.forEach(s=>{if(!Array.isArray(s.objects))s.objects=s.layout==='cover'?layoutObjects('title',SH(data),s.title):s.layout==='text'?layoutObjects('content',SH(data),s.title):[];
  s.bg=s.bg||'#ffffff';s.notes=s.notes||'';s.objects.forEach(o=>{o.id=o.id||uid()})});
 let si=0,selIds=new Set(),editing=null,dirty=false,rev=0,timer,undo=[],redo=[],drag=null,marq=null,zoom='fit',sc=1;
 const ib=(a,l,t)=>`<button class="btn" data-act="${a}" title="${t}" aria-label="${t}">${l}</button>`;
 view.innerHTML=`<div class="ew-root"><div class="ew-bar"><button class="btn" data-act="home">← Home</button><b id="title"></b><button class="btn" data-act="rename">Rename</button><button class="btn" data-act="saveas">Save as copy</button>
 <select id="lay" aria-label="New slide"><option value="">+ New slide…</option><option value="title">Title slide</option><option value="content">Title and content</option><option value="two">Two columns</option><option value="section">Section header</option><option value="blank">Blank</option></select>
 ${ib('sdup','Duplicate','Duplicate slide')}${ib('sdel','Delete slide','Delete slide')}${ib('sup','↑','Move slide up')}${ib('sdown','↓','Move slide down')}${ib('undo','↶','Undo')}${ib('redo','↷','Redo')}
 <select id="ratio" aria-label="Slide size"><option>16:9</option><option>4:3</option></select><select id="zoom" aria-label="Zoom"><option value="fit">Fit</option><option value="50">50%</option><option value="75">75%</option><option value="100">100%</option></select>${ib('pdf','PDF / Print','Print or save as PDF')}<button class="btn primary" data-act="present">▶ Present</button></div>
 <div class="ew-bar"><b>Insert:</b>${ib('addtext','Text','Text box')}${ib('addrect','Rectangle','Rectangle')}${ib('addellipse','Ellipse','Ellipse')}${ib('addround','Rounded','Rounded rectangle')}${ib('addline','Line','Horizontal line')}${ib('addimage','Image','Image')}${ib('addtable','Table','Table')}${ib('addchart','Chart','Chart')}<input type="file" id="img" accept="image/*" hidden></div>
 <div class="ep-main"><div class="ep-thumbs" id="th" aria-label="Slides"></div><div class="ep-center"><div class="ep-stage" id="stage" tabindex="0"><div id="wrap"><div id="slide" class="ep-slide"></div></div></div><textarea id="notes" placeholder="Speaker notes" aria-label="Speaker notes"></textarea></div><div class="ep-props" id="pr"></div></div>
 <div class="ew-status"><span id="info"></span><span id="save" role="status"></span></div></div>`;
 const root=view.firstElementChild,$=s=>root.querySelector(s),slideEl=$('#slide');$('#title').textContent=file.name;
 const sl=()=>data.slides[si],objs=()=>sl().objects,H=()=>SH(data),one=()=>selIds.size===1?[...selIds][0]:null,sel=()=>{const i=one();return i?objs().find(o=>o.id===i):undefined},selObjs=()=>objs().filter(o=>selIds.has(o.id));
 const snap=()=>JSON.stringify({ratio:data.ratio,slides:data.slides,theme:data.theme}),restore=t=>{const d=JSON.parse(t);data.ratio=d.ratio;data.slides=d.slides;data.theme=d.theme;TH=data.theme};
 const setS=t=>$('#save').textContent=t;
 async function save(){clearTimeout(timer);const r=rev;setS('Saving…');try{await FM.save(file);if(r===rev){dirty=false;setS('Saved '+new Date().toLocaleTimeString())}else setS('Unsaved changes')}catch(err){console.error(err);setS('SAVE FAILED: use Save as copy / download from Home')}}
 const touch=()=>{rev++;dirty=true;setS('Unsaved changes');clearTimeout(timer);timer=setTimeout(save,1500)};
 function calcScale(){const st=$('#stage');if(zoom==='fit')sc=Math.max(.2,Math.min(((st.clientWidth||900)-24)/W,((st.clientHeight||520)-24)/H()));else sc=+zoom/100}
 function renderSlide(){const s=sl();slideEl.style.cssText=`width:${W}px;height:${H()}px;${bgCss(s)}transform:scale(${sc});`;
  $('#wrap').style.cssText=`width:${W*sc}px;height:${H()*sc}px`;slideEl.innerHTML=s.objects.map(o=>objHtml(o,true,selIds)).join('')}
 function renderThumbs(){const k=164/W,none=new Set();$('#th').innerHTML=data.slides.map((s,i)=>`<div class="ep-th${i===si?' on':''}" data-th="${i}" draggable="true" style="width:164px;height:${H()*k}px" aria-label="Slide ${i+1}"><div class="ep-thin" style="width:${W}px;height:${H()}px;transform:scale(${k});${bgCss(s)}">${s.objects.map(o=>objHtml(o,false,none)).join('')}</div><span>${i+1}</span></div>`).join('')}
 const chartCsv=o=>{const d=chartData(o);return toCsv([['',...d.series.map(s=>s.name)],...d.labels.map((l,i)=>[l,...d.series.map(s=>s.values[i])])])};
 const alignBtns=()=>`<div class="ep-g">${ib('al_l','⇤ Left','Align left')}${ib('al_c','↔ Center','Align center')}${ib('al_r','⇥ Right','Align right')}${ib('al_t','⤒ Top','Align top')}${ib('al_m','↕ Middle','Align middle')}${ib('al_b','⤓ Bottom','Align bottom')}</div>`;
 function renderProps(){const o=sel(),p=$('#pr');
  if(selIds.size>1){p.innerHTML=`<b>${selIds.size} objects</b>${alignBtns()}<div class="ep-g">${ib('dist_h','Distribute ↔','Distribute horizontally')}${ib('dist_v','Distribute ↕','Distribute vertically')}${ib('odup','Duplicate','Duplicate objects')}${ib('odel','Delete','Delete objects')}</div><p class="tag">Aligns to the selection. Drag to move them together.</p>`;return}
  if(!o){const g=sl().grad,hx=c=>okc(c)&&c.length===7?c:'#ffffff',fo=k=>FONTS.map(f=>`<option ${f===TH[k]?'selected':''}>${f}</option>`).join('');
   p.innerHTML=`<b>Slide ${si+1}</b><label>Background <select data-sp="mode"><option value="solid" ${g?'':'selected'}>Solid</option><option value="grad" ${g?'selected':''}>Gradient</option></select></label>
   ${g?`<label>Colour 1 <input type="color" data-sp="g1" value="${hx(g.c1)}"></label><label>Colour 2 <input type="color" data-sp="g2" value="${hx(g.c2)}"></label><label>Angle <input type="number" data-sp="ga" min="0" max="360" value="${Math.round(+g.angle||0)}"></label>`:`<label>Colour <input type="color" data-sp="bg" value="${hx(sl().bg)}"></label>`}
   <b>Theme</b><label>Heading font <select data-th="heading">${fo('heading')}</select></label><label>Body font <select data-th="body">${fo('body')}</select></label>
   <div class="ep-g">${TH.colors.map((c,i)=>`<label>Colour ${i+1} <input type="color" data-th="c${i}" value="${hx(c)}"></label>`).join('')}</div>
   <p class="tag">Objects set to a Theme colour or font follow these choices (new slides from layouts do). Objects made before themes keep their own. Click an object to edit it; double-click text to type.</p>`;return}
  const num=(k,l)=>`<label>${l} <input type="number" data-p="${k}" value="${Math.round(o[k]||0)}"></label>`;
  const tsel=k=>`<select data-t="${k}" aria-label="Theme colour for ${k}"><option value="">Custom</option>${[0,1,2,3].map(i=>`<option value="${i}" ${o[k]==='T:'+i?'selected':''}>Theme ${i+1}</option>`).join('')}</select>`;
  const col=(k,l)=>`<label>${l} <input type="color" data-p="${k}" value="${rc(o[k]).length===7?rc(o[k]):'#000000'}">${tsel(k)}</label>`;
  const fontSel=`<select data-p="font" aria-label="Font">${FONTS.map(f=>`<option ${f===o.font?'selected':''}>${f}</option>`).join('')}<option value="T:heading" ${o.font==='T:heading'?'selected':''}>Theme heading font</option><option value="T:body" ${o.font==='T:body'?'selected':''}>Theme body font</option></select>`;
  const nm={image:'Image',shape:'Shape',table:'Table',chart:'Chart'}[o.type]||'Text box';
  let h=`<b>${nm}</b><div class="ep-g">${num('x','X')}${num('y','Y')}${num('w','W')}${num('h','H')}</div>${alignBtns()}`;
  if(o.type==='text'||o.type==='shape'){h+=`${fontSel}<label>Size <input type="number" data-p="fs" min="6" max="300" value="${o.fs||24}"></label>${col('color','Text')}
   <div class="ep-g">${ib('bold','<b>B</b>','Bold')}${ib('italic','<i>I</i>','Italic')}${ib('al-left','L','Align text left')}${ib('al-center','C','Align text center')}${ib('al-right','R','Align text right')}</div>
   ${col('fill','Fill')}<button class="btn" data-act="fillnone">No fill</button>${col('stroke','Line')}<label>Width <input type="number" data-p="sw" min="0" max="40" value="${o.sw||0}"></label>`;
   if(o.type==='shape')h+=`<select data-p="shape" aria-label="Shape">${Object.entries(SHAPES).map(([k,v])=>`<option value="${k}" ${o.shape===k?'selected':''}>${v}</option>`).join('')}</select>`}
  if(o.type==='table')h+=`${fontSel}<label>Size <input type="number" data-p="fs" min="6" max="300" value="${o.fs||18}"></label>${col('color','Text')}${col('hfill','Header fill')}<label><input type="checkbox" data-hdr ${o.hdr!==false?'checked':''}> Header row</label>
   <div class="ep-g">${ib('al-left','L','Align text left')}${ib('al-center','C','Align text center')}${ib('al-right','R','Align text right')}</div><div class="ep-g">${ib('tr_add','+ Row','Add row at the end')}${ib('tr_del','− Row','Remove last row')}${ib('tc_add','+ Col','Add column at the end')}${ib('tc_del','− Col','Remove last column')}</div><p class="tag">Double-click a cell to type.</p>`;
  if(o.type==='chart')h+=`<select data-ct aria-label="Chart type">${CT.map(c=>`<option ${c===o.ctype?'selected':''}>${c}</option>`).join('')}</select><label>Title <input data-ctitle value="${esc(o.title||'')}"></label>
   <label class="ep-col">Data (CSV: header row, then label and numbers)<textarea data-cdata rows="6">${esc(chartCsv(o))}</textarea></label>`;
  h+=`<div class="ep-g">${ib('fwd','Forward','Bring forward')}${ib('bwd','Backward','Send backward')}${ib('front','To front','Bring to front')}${ib('back','To back','Send to back')}${ib('odup','Duplicate','Duplicate object')}${ib('odel','Delete','Delete object')}</div>`;p.innerHTML=h}
 function fullRender(){calcScale();si=Math.max(0,Math.min(si,data.slides.length-1));$('#ratio').value=data.ratio;selIds=new Set([...selIds].filter(id=>objs().some(o=>o.id===id)));
  renderSlide();renderThumbs();renderProps();$('#notes').value=sl().notes;$('#info').textContent=`Slide ${si+1} of ${data.slides.length} · ${data.ratio}`}
 function mutate(fn){undo.push(snap());if(undo.length>50)undo.shift();redo=[];fn();touch();fullRender()}
 function doUndo(isRedo){const from=isRedo?redo:undo,to=isRedo?undo:redo;if(!from.length)return;to.push(snap());restore(from.pop());editing=null;touch();fullRender()}
 const add=o=>mutate(()=>{o.id=uid();objs().push(o);selIds=new Set([o.id])});
 const base={font:'T:body',fs:24,color:'#ffffff',stroke:'',sw:0,text:''};
 const dupObjs=()=>{const A=selObjs();if(A.length)mutate(()=>{const n=A.map(o=>({...structuredClone(o),id:uid(),x:o.x+20,y:o.y+20}));objs().push(...n);selIds=new Set(n.map(o=>o.id))})};
 const delObjs=()=>{if(selIds.size)mutate(()=>{sl().objects=objs().filter(o=>!selIds.has(o.id));selIds=new Set()})};
 function alignObjs(k){const A=selObjs();if(!A.length)return;const b=A.length===1?{x:0,y:0,w:W,h:H()}:{x:Math.min(...A.map(o=>o.x)),y:Math.min(...A.map(o=>o.y))};
  if(A.length>1){b.w=Math.max(...A.map(o=>o.x+o.w))-b.x;b.h=Math.max(...A.map(o=>o.y+o.h))-b.y}
  mutate(()=>A.forEach(o=>{if(k==='l')o.x=b.x;else if(k==='c')o.x=Math.round(b.x+(b.w-o.w)/2);else if(k==='r')o.x=b.x+b.w-o.w;else if(k==='t')o.y=b.y;else if(k==='m')o.y=Math.round(b.y+(b.h-o.h)/2);else if(k==='b')o.y=b.y+b.h-o.h}))}
 function distObjs(ax){const A=selObjs().sort((p,q)=>ax==='h'?p.x-q.x:p.y-q.y);if(A.length<3)return alert('Select three or more objects to distribute.');
  const pos=ax==='h'?'x':'y',len=ax==='h'?'w':'h',first=A[0][pos],last=A[A.length-1][pos]+A[A.length-1][len],gap=(last-first-A.reduce((s,o)=>s+o[len],0))/(A.length-1);
  mutate(()=>{let p=first;A.forEach(o=>{o[pos]=Math.round(p);p+=o[len]+gap})})}
 function parseChartCsv(t){const rows=parseCsv(t).filter(r=>r.some(c=>c.trim()!==''));if(rows.length<2||rows[0].length<2)return null;
  const series=rows[0].slice(1).map((n,j)=>({name:n.trim()||'Series '+(j+1),values:[]})),labels=[];let bad=0;
  rows.slice(1).forEach(r=>{labels.push((r[0]||'').trim());series.forEach((s,j)=>{const raw=String(r[j+1]==null?'':r[j+1]).trim(),v=Number(raw);if(raw===''||!isFinite(v)){if(raw!=='')bad++;s.values.push(0)}else s.values.push(v)})});
  if(labels.length>50||series.length>8)return null;return{labels,series,bad}}
 function startEdit(id,el){el=el||slideEl.querySelector(`.ep-o[data-id="${id}"] .ep-t`);if(!el)return;editing=id;el.contentEditable='true';el.focus();
  try{const r=document.createRange();r.selectNodeContents(el);const s=document.getSelection();s.removeAllRanges();s.addRange(r)}catch{}}
 slideEl.addEventListener('focusout',ev=>{const t=ev.target;if(!editing||!t.classList)return;const isCell=t.dataset&&t.dataset.cr!==undefined;if(!isCell&&!t.classList.contains('ep-t'))return;
  const o=objs().find(x=>x.id===editing);editing=null;if(!o)return;const txt=getText(t).replace(/\n$/,'');
  if(isCell){const r=+t.dataset.cr,c=+t.dataset.cc;if(o.rows&&o.rows[r]&&o.rows[r][c]!==txt)mutate(()=>{o.rows[r][c]=txt});else fullRender();return}
  if(txt!==(o.text||''))mutate(()=>{o.text=txt});else fullRender()});
 slideEl.addEventListener('paste',ev=>{ev.preventDefault();document.execCommand&&document.execCommand('insertText',false,ev.clipboardData.getData('text/plain'))});
 slideEl.addEventListener('dblclick',ev=>{const el=ev.target.closest('.ep-o');if(!el||!el.dataset.id||el.classList.contains('ep-image')||el.classList.contains('ep-chart'))return;
  selIds=new Set([el.dataset.id]);startEdit(el.dataset.id,el.classList.contains('ep-table')?ev.target.closest('td[data-cr]'):undefined)});
 const pt=ev=>{const r=slideEl.getBoundingClientRect();return{x:(ev.clientX-r.left)/sc,y:(ev.clientY-r.top)/sc}};
 slideEl.addEventListener('mousedown',ev=>{if(editing)return;const hd=ev.target.closest('[data-h]'),el=ev.target.closest('.ep-o');ev.preventDefault();$('#stage').focus();
  if(!el){const p=pt(ev);if(!ev.shiftKey&&selIds.size){selIds=new Set();renderSlide();renderProps()}marq={x0:p.x,y0:p.y,x1:p.x,y1:p.y,shift:ev.shiftKey,base:ev.shiftKey?new Set(selIds):new Set()};return}
  const o=objs().find(x=>x.id===el.dataset.id);if(!o)return;
  if(ev.shiftKey){if(selIds.has(o.id))selIds.delete(o.id);else selIds.add(o.id);renderSlide();renderProps();return}
  if(!selIds.has(o.id)){selIds=new Set([o.id]);renderSlide();renderProps()}
  drag={mode:hd?hd.dataset.h:'move',x:ev.clientX,y:ev.clientY,items:(hd?[o]:selObjs()).map(q=>({o:q,ox:q.x,oy:q.y,ow:q.w,oh:q.h})),before:snap()}});
 const onMove=ev=>{
  if(marq){const p=pt(ev);marq.x1=p.x;marq.y1=p.y;let m=slideEl.querySelector('.ep-marq');if(!m){m=document.createElement('div');m.className='ep-marq';slideEl.append(m)}
   m.style.cssText=`left:${Math.min(marq.x0,marq.x1)}px;top:${Math.min(marq.y0,marq.y1)}px;width:${Math.abs(marq.x1-marq.x0)}px;height:${Math.abs(marq.y1-marq.y0)}px`;return}
  if(!drag)return;const dx=Math.round((ev.clientX-drag.x)/sc),dy=Math.round((ev.clientY-drag.y)/sc),m=drag.mode;
  for(const it of drag.items){const o=it.o;
   if(m==='move'){o.x=it.ox+dx;o.y=it.oy+dy}else{let x=it.ox,y=it.oy,w=it.ow,h=it.oh;
    if(m.includes('e'))w=Math.max(20,it.ow+dx);if(m.includes('s'))h=Math.max(10,it.oh+dy);
    if(m.includes('w')){w=Math.max(20,it.ow-dx);x=it.ox+it.ow-w}if(m.includes('n')){h=Math.max(10,it.oh-dy);y=it.oy+it.oh-h}Object.assign(o,{x,y,w,h})}
   const el=slideEl.querySelector(`.ep-o[data-id="${o.id}"]`);if(el)el.style.cssText=look(o)}};
 const onUp=()=>{
  if(marq){const q=marq;marq=null;const m=slideEl.querySelector('.ep-marq');if(m)m.remove();
   if(Math.abs(q.x1-q.x0)>=3||Math.abs(q.y1-q.y0)>=3){const x1=Math.min(q.x0,q.x1),x2=Math.max(q.x0,q.x1),y1=Math.min(q.y0,q.y1),y2=Math.max(q.y0,q.y1);
    selIds=new Set([...q.base,...objs().filter(o=>o.x<x2&&o.x+o.w>x1&&o.y<y2&&o.y+o.h>y1).map(o=>o.id)]);renderSlide();renderProps()}return}
  if(!drag)return;const moved=drag.items.some(it=>it.o.x!==it.ox||it.o.y!==it.oy||it.o.w!==it.ow||it.o.h!==it.oh);
  if(moved){undo.push(drag.before);if(undo.length>50)undo.shift();redo=[];touch()}drag=null;renderSlide();renderThumbs();renderProps()};
 const vis=()=>{if(document.hidden&&dirty)save()},onResize=()=>{if(zoom==='fit'){calcScale();renderSlide()}};
 document.addEventListener('mousemove',onMove);document.addEventListener('mouseup',onUp);document.addEventListener('visibilitychange',vis);addEventListener('resize',onResize);
 root.addEventListener('keydown',ev=>{const tg=ev.target,m=ev.ctrlKey||ev.metaKey;
  if(editing){if(ev.key==='Escape')tg.blur();return}
  if(/^(INPUT|SELECT|TEXTAREA)$/.test(tg.tagName))return;
  if(m){const x=ev.key.toLowerCase();if(x==='z'){ev.preventDefault();doUndo(ev.shiftKey)}else if(x==='y'){ev.preventDefault();doUndo(true)}else if(x==='d'){ev.preventDefault();dupObjs()}
   else if(x==='a'){ev.preventDefault();selIds=new Set(objs().map(o=>o.id));renderSlide();renderProps()}return}
  if(!selIds.size)return;
  if(ev.key==='Delete'||ev.key==='Backspace'){ev.preventDefault();delObjs()}else if(ev.key==='Escape'){selIds=new Set();renderSlide();renderProps()}
  else{const mv={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[ev.key];if(mv){ev.preventDefault();const k=ev.shiftKey?10:1,A=selObjs();mutate(()=>A.forEach(o=>{o.x+=mv[0]*k;o.y+=mv[1]*k}))}}});
 root.addEventListener('change',ev=>{const t=ev.target;
  if(t.id==='lay'){const l=t.value;t.value='';if(!l)return;mutate(()=>{data.slides.splice(si+1,0,{layout:l,bg:'#ffffff',notes:'',objects:layoutObjects(l,H())});si++;selIds=new Set()});return}
  if(t.id==='ratio'){mutate(()=>{data.ratio=t.value});return}if(t.id==='zoom'){zoom=t.value;fullRender();return}
  if(t.id==='notes'){mutate(()=>{sl().notes=t.value});return}if(t.id==='img'){addImage(t);return}
  if(t.dataset.sp){const k=t.dataset.sp,s=sl();
   if(k==='mode')mutate(()=>{if(t.value==='grad')s.grad={c1:okc(s.bg)?s.bg:'#ffffff',c2:'#dddddd',angle:135};else delete s.grad});
   else if(k==='bg'){if(okc(t.value))mutate(()=>{s.bg=t.value})}else if(k==='g1'||k==='g2'){if(okc(t.value)&&s.grad)mutate(()=>{s.grad[k==='g1'?'c1':'c2']=t.value})}
   else if(k==='ga'){const v=Number(t.value);if(t.value.trim()!==''&&isFinite(v)&&s.grad)mutate(()=>{s.grad.angle=Math.max(0,Math.min(360,v))})}return}
  if(t.dataset.th){const k=t.dataset.th;if(k==='heading'||k==='body'){if(FONTS.includes(t.value))mutate(()=>{data.theme[k]=t.value})}else if(okc(t.value))mutate(()=>{data.theme.colors[+k[1]]=t.value});return}
  const o=sel();if(!o)return;
  if(t.dataset.t){const k=t.dataset.t;mutate(()=>{o[k]=t.value===''?(rc(o[k])||'#000000'):'T:'+t.value});return}
  if(t.dataset.hdr!==undefined){mutate(()=>{o.hdr=t.checked});return}
  if(t.dataset.ct!==undefined){if(CT.includes(t.value))mutate(()=>{o.ctype=t.value});return}
  if(t.dataset.ctitle!==undefined){mutate(()=>{o.title=t.value.slice(0,80)});return}
  if(t.dataset.cdata!==undefined){const d=parseChartCsv(t.value);if(!d){alert('Chart data needs a header row, at least one data row, and at most 50 rows x 8 series.');renderProps();return}
   if(d.bad)alert(d.bad+' cell(s) were not numbers and were set to 0.');mutate(()=>{o.data={labels:d.labels,series:d.series}});return}
  const k=t.dataset.p;if(!k)return;let v=t.value;
  if(['x','y','w','h','fs','sw'].includes(k)){if(v.trim()===''||!isFinite(Number(v)))return;v=Number(v);const lim={x:[-2000,3000],y:[-2000,3000],w:[1,3000],h:[1,3000],fs:[6,300],sw:[0,40]}[k];v=Math.max(lim[0],Math.min(lim[1],v))}
  else if(k==='font'){if(!FONTS.includes(v)&&v!=='T:heading'&&v!=='T:body')return}else if(k==='shape'){if(!SHAPES[v])return}else if(!okc(v))return;
  mutate(()=>{o[k]=v})});
 function addImage(inp){const f=inp.files[0];inp.value='';if(!f)return;if(!/^image\/(png|jpe?g|gif|webp|svg\+xml)$/.test(f.type))return alert('Please choose a PNG, JPG, GIF, WebP or SVG image.');
  if(f.size>3*1048576)return alert('Image is larger than 3 MB. Please use a smaller image.');
  const r=new FileReader();r.onerror=()=>alert('Could not read the image.');r.onload=()=>{const im=new Image();im.onerror=()=>alert('This image could not be opened.');
   im.onload=()=>{const k=Math.min(1,500/im.naturalWidth,(H()-80)/im.naturalHeight),w=Math.round(im.naturalWidth*k),h=Math.round(im.naturalHeight*k);add({type:'image',x:Math.round((W-w)/2),y:Math.round((H()-h)/2),w,h,src:r.result,alt:f.name})};im.src=r.result};r.readAsDataURL(f)}
 function present(start){let i=start;const ov=document.createElement('div');ov.className='ep-present';ov.tabIndex=0;document.body.append(ov);const none=new Set();
  const draw=()=>{const s=data.slides[i],h=H(),k=Math.min((innerWidth||W)/W,(innerHeight||h)/h);
   ov.innerHTML=`<div class="ep-pslide" style="width:${W}px;height:${h}px;transform:scale(${k});${bgCss(s)}">${s.objects.map(o=>objHtml(o,false,none)).join('')}</div><div class="ep-pcount">${i+1} / ${data.slides.length}</div>`};
  const go=d=>{const n=i+d;if(n>=0&&n<data.slides.length){i=n;draw()}};
  const end=()=>{document.removeEventListener('keydown',kd,true);document.removeEventListener('fullscreenchange',fc);removeEventListener('resize',draw);ov.remove();if(document.fullscreenElement&&document.exitFullscreen)document.exitFullscreen().catch(()=>{})};
  const kd=ev=>{if(['ArrowRight','ArrowDown',' ','PageDown','Enter'].includes(ev.key)){ev.preventDefault();ev.stopPropagation();go(1)}
   else if(['ArrowLeft','ArrowUp','PageUp','Backspace'].includes(ev.key)){ev.preventDefault();ev.stopPropagation();go(-1)}else if(ev.key==='Escape'){ev.stopPropagation();end()}};
  const fc=()=>{if(!document.fullscreenElement)end()};
  ov.addEventListener('click',()=>{if(i<data.slides.length-1)go(1);else end()});document.addEventListener('keydown',kd,true);addEventListener('resize',draw);draw();ov.focus();
  try{if(ov.requestFullscreen){ov.requestFullscreen().then(()=>document.addEventListener('fullscreenchange',fc)).catch(()=>{})}}catch{}}
 function printDeck(){const h=H(),none=new Set(),box=document.createElement('div'),st=document.createElement('style');box.id='ep-print';
  st.textContent=`@page{size:10in ${h===720?'7.5in':'5.625in'};margin:0}#ep-print{display:none}@media print{body>*:not(#ep-print){display:none!important}#ep-print{display:block}.ep-pg{position:relative;width:960px;height:${h}px;overflow:hidden;break-after:page;page-break-after:always;-webkit-print-color-adjust:exact;print-color-adjust:exact}.ep-pg:last-child{break-after:auto;page-break-after:auto}.ep-pg .ep-o{position:absolute}}`;
  box.innerHTML=data.slides.map(s=>`<div class="ep-pg" style="${bgCss(s)}">${s.objects.map(o=>objHtml(o,false,none)).join('')}</div>`).join('');
  document.head.append(st);document.body.append(box);const clean=()=>{box.remove();st.remove()};addEventListener('afterprint',clean,{once:true});
  try{print()}catch(err){clean();alert('Could not open the print dialog: '+err.message)}}
 $('#th').addEventListener('click',ev=>{const t=ev.target.closest('[data-th]');if(!t)return;si=+t.dataset.th;selIds=new Set();fullRender()});
 $('#th').addEventListener('dragstart',ev=>{const t=ev.target.closest('[data-th]');if(t&&ev.dataTransfer)ev.dataTransfer.setData('text/plain',t.dataset.th)});
 $('#th').addEventListener('dragover',ev=>ev.preventDefault());
 $('#th').addEventListener('drop',ev=>{ev.preventDefault();const t=ev.target.closest('[data-th]');if(!t||!ev.dataTransfer)return;const from=+ev.dataTransfer.getData('text/plain'),to=+t.dataset.th;if(!(from>=0)||from===to)return;
  mutate(()=>{const[s]=data.slides.splice(from,1);data.slides.splice(to,0,s);si=to})});
 root.addEventListener('click',async ev=>{const b=ev.target.closest('button');if(!b)return;const x=b.dataset.act;if(!x)return;const o=sel();
  if(x==='home'){await flush();location.hash='#/'}
  else if(x==='rename'){const n=prompt('Presentation name',file.name);if(n&&n.trim()){file.name=n.trim();$('#title').textContent=file.name;touch()}}
  else if(x==='saveas'){const n=prompt('Name for the copy',file.name+' (copy)');if(!n||!n.trim())return;await save();if(dirty)return;const c=await FM.duplicate(file.id);await FM.rename(c.id,n.trim());location.hash='#/file/'+c.id}
  else if(x==='sdup')mutate(()=>{const c=structuredClone(sl());c.objects.forEach(q=>{q.id=uid()});data.slides.splice(si+1,0,c);si++;selIds=new Set()});
  else if(x==='sdel'){if(data.slides.length<2)return alert('A presentation needs at least one slide.');if(confirm('Delete slide '+(si+1)+'? You can undo this.'))mutate(()=>{data.slides.splice(si,1);si=Math.min(si,data.slides.length-1);selIds=new Set()})}
  else if(x==='sup'){if(si>0)mutate(()=>{[data.slides[si-1],data.slides[si]]=[data.slides[si],data.slides[si-1]];si--})}
  else if(x==='sdown'){if(si<data.slides.length-1)mutate(()=>{[data.slides[si+1],data.slides[si]]=[data.slides[si],data.slides[si+1]];si++})}
  else if(x==='undo')doUndo(false);else if(x==='redo')doUndo(true);else if(x==='present')present(si);else if(x==='pdf')printDeck();
  else if(x==='addtext')add(T(120,120,400,60,'Text',24));
  else if(x==='addrect')add({type:'shape',shape:'rect',x:200,y:180,w:240,h:140,fill:'T:0',...base});else if(x==='addellipse')add({type:'shape',shape:'ellipse',x:200,y:180,w:200,h:140,fill:'T:1',...base});
  else if(x==='addround')add({type:'shape',shape:'round',x:200,y:180,w:240,h:120,fill:'T:2',...base});else if(x==='addline')add({type:'shape',shape:'rect',x:200,y:260,w:300,h:4,fill:'#222222',...base});
  else if(x==='addimage')$('#img').click();
  else if(x==='addtable'){const r=+prompt('Rows (1-20)','4'),c=+prompt('Columns (1-10)','3');if(!(r>=1&&r<=20&&c>=1&&c<=10))return alert('Please enter rows 1-20 and columns 1-10.');
   add({type:'table',x:80,y:140,w:Math.min(800,c*160),h:r*44,rows:Array.from({length:r},(_,i)=>Array.from({length:c},(_,j)=>i===0?'Header '+(j+1):'')),hdr:true,hfill:'T:0',fs:18,color:'#222222',font:'T:body'})}
  else if(x==='addchart')add({type:'chart',ctype:'column',title:'Chart title',x:200,y:120,w:520,h:340,data:{labels:['Q1','Q2','Q3','Q4'],series:[{name:'Sales (sample)',values:[4,7,5,9]},{name:'Costs (sample)',values:[3,4,4,6]}]}});
  else if(x.startsWith('al_')&&x.length===4)alignObjs(x[3]);else if(x==='dist_h')distObjs('h');else if(x==='dist_v')distObjs('v');
  else if(x==='odel')delObjs();else if(x==='odup')dupObjs();
  else if(!o)return;
  else if(x==='bold')mutate(()=>{o.bold=!o.bold});else if(x==='italic')mutate(()=>{o.italic=!o.italic});else if(x.startsWith('al-'))mutate(()=>{o.al=x.slice(3)});
  else if(x==='fillnone')mutate(()=>{o.fill=''});
  else if(x==='fwd'||x==='bwd')mutate(()=>{const a=objs(),i=a.indexOf(o),j=x==='fwd'?i+1:i-1;if(j>=0&&j<a.length)[a[i],a[j]]=[a[j],a[i]]});
  else if(x==='front')mutate(()=>{const a=objs();a.splice(a.indexOf(o),1);a.push(o)});else if(x==='back')mutate(()=>{const a=objs();a.splice(a.indexOf(o),1);a.unshift(o)});
  else if(o.type==='table'&&x.startsWith('t')){mutate(()=>{const R2=o.rows;
   if(x==='tr_add'&&R2.length<20)R2.push(R2[0].map(()=>''));else if(x==='tr_del'&&R2.length>1)R2.pop();
   else if(x==='tc_add'&&R2[0].length<10)R2.forEach((r,i)=>r.push(i===0?'Header '+(r.length+1):''));else if(x==='tc_del'&&R2[0].length>1)R2.forEach(r=>r.pop())})}});
 fullRender();setS('Opened');
 cur={get dirty(){return dirty},save,dispose(){clearTimeout(timer);document.removeEventListener('mousemove',onMove);document.removeEventListener('mouseup',onUp);document.removeEventListener('visibilitychange',vis);removeEventListener('resize',onResize)}};
}
