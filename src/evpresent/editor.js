// EVPresent slide editor (Milestone 4a). Slides are plain HTML elements on a 960-unit-wide canvas (no canvas library).
import * as FM from '../shared/file-manager.js';
const W=960,FONTS=['Arial','Times New Roman','Georgia','Courier New','Noto Sans Bengali'],SHAPES={rect:'Rectangle',ellipse:'Ellipse',round:'Rounded'};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const okc=c=>/^#[0-9a-f]{3,8}$/i.test(c||''),uid=()=>Math.random().toString(36).slice(2,9),SH=d=>d.ratio==='4:3'?720:540;
const getText=el=>el.innerText!==undefined?el.innerText:el.textContent;
let cur=null;
export const flush=async()=>{if(cur&&cur.dirty)await cur.save()};
export const unmount=()=>{if(cur){cur.dispose();cur=null}};
addEventListener('beforeunload',e=>{if(cur&&cur.dirty){e.preventDefault();e.returnValue=''}});
const T=(x,y,w,h,text,fs,ex={})=>({type:'text',x,y,w,h,text,fs,color:'#222222',font:'Arial',...ex});
function layoutObjects(l,h,title){let ob=[];
 if(l==='title')ob=[T(80,h/2-110,800,110,title||'Presentation title',48,{bold:true}),T(80,h/2+20,800,60,'Subtitle or presenter',24,{color:'#666666'})];
 else if(l==='content')ob=[T(60,40,840,70,title||'Slide title',36,{bold:true}),T(60,130,840,h-190,'• First point\n• Second point\n• Third point',24)];
 else if(l==='two')ob=[T(60,40,840,70,title||'Slide title',36,{bold:true}),T(60,130,410,h-190,'• Left column',24),T(490,130,410,h-190,'• Right column',24)];
 else if(l==='section')ob=[{type:'shape',shape:'rect',x:60,y:h/2-90,w:10,h:130,fill:'#f2724b',stroke:'',sw:0,text:'',color:'#ffffff',fs:24,font:'Arial'},T(90,h/2-90,780,130,title||'Section title',44,{bold:true})];
 return ob.map(o=>({id:uid(),...o}))}
function look(o){let s=`left:${+o.x||0}px;top:${+o.y||0}px;width:${Math.max(1,+o.w||1)}px;height:${Math.max(1,+o.h||1)}px;`;if(o.type==='image')return s;
 s+=`font-family:'${FONTS.includes(o.font)?o.font:'Arial'}',sans-serif;font-size:${Math.max(6,Math.min(300,+o.fs||24))}px;color:${okc(o.color)?o.color:'#222222'};text-align:${['left','center','right'].includes(o.al)?o.al:o.type==='shape'?'center':'left'};`;
 if(o.bold)s+='font-weight:bold;';if(o.italic)s+='font-style:italic;';if(okc(o.fill))s+=`background:${o.fill};`;
 if(okc(o.stroke)&&+o.sw>0)s+=`border:${Math.min(40,+o.sw)}px solid ${o.stroke};`;
 if(o.type==='shape'){if(o.shape==='ellipse')s+='border-radius:50%;';else if(o.shape==='round')s+='border-radius:24px;'}return s}
const objHtml=(o,live,selId)=>{const isSel=live&&o.id===selId;
 const inner=o.type==='image'?(/^data:image\//.test(o.src||'')?`<img src="${esc(o.src)}" alt="${esc(o.alt||'Image')}" draggable="false">`:''):`<div class="ep-t">${esc(o.text||'')}</div>`;
 return`<div class="ep-o ep-${o.type}${isSel?' sel':''}" data-id="${esc(o.id)}" style="${look(o)}">${inner}${isSel?['nw','ne','sw','se'].map(h=>`<i class="ep-h ep-h-${h}" data-h="${h}"></i>`).join(''):''}</div>`};
export function mount(view,file){
 unmount();const data=file.data;data.ratio=data.ratio==='4:3'?'4:3':'16:9';
 if(!Array.isArray(data.slides)||!data.slides.length)data.slides=[{layout:'blank',objects:[]}];
 data.slides.forEach(s=>{if(!Array.isArray(s.objects))s.objects=s.layout==='cover'?layoutObjects('title',SH(data),s.title):s.layout==='text'?layoutObjects('content',SH(data),s.title):[];
  s.bg=s.bg||'#ffffff';s.notes=s.notes||'';s.objects.forEach(o=>{o.id=o.id||uid()})});
 let si=0,selId=null,editing=null,dirty=false,rev=0,timer,undo=[],redo=[],drag=null,zoom='fit',sc=1;
 const ib=(a,l,t)=>`<button class="btn" data-act="${a}" title="${t}" aria-label="${t}">${l}</button>`;
 view.innerHTML=`<div class="ew-root"><div class="ew-bar"><button class="btn" data-act="home">← Home</button><b id="title"></b><button class="btn" data-act="rename">Rename</button><button class="btn" data-act="saveas">Save as copy</button>
 <select id="lay" aria-label="New slide"><option value="">+ New slide…</option><option value="title">Title slide</option><option value="content">Title and content</option><option value="two">Two columns</option><option value="section">Section header</option><option value="blank">Blank</option></select>
 ${ib('sdup','Duplicate','Duplicate slide')}${ib('sdel','Delete slide','Delete slide')}${ib('sup','↑','Move slide up')}${ib('sdown','↓','Move slide down')}${ib('undo','↶','Undo')}${ib('redo','↷','Redo')}
 <select id="ratio" aria-label="Slide size"><option>16:9</option><option>4:3</option></select><select id="zoom" aria-label="Zoom"><option value="fit">Fit</option><option value="50">50%</option><option value="75">75%</option><option value="100">100%</option></select><button class="btn primary" data-act="present">▶ Present</button></div>
 <div class="ew-bar"><b>Insert:</b>${ib('addtext','Text','Text box')}${ib('addrect','Rectangle','Rectangle')}${ib('addellipse','Ellipse','Ellipse')}${ib('addround','Rounded','Rounded rectangle')}${ib('addline','Line','Horizontal line')}${ib('addimage','Image','Image')}<input type="file" id="img" accept="image/*" hidden></div>
 <div class="ep-main"><div class="ep-thumbs" id="th" aria-label="Slides"></div><div class="ep-center"><div class="ep-stage" id="stage" tabindex="0"><div id="wrap"><div id="slide" class="ep-slide"></div></div></div><textarea id="notes" placeholder="Speaker notes" aria-label="Speaker notes"></textarea></div><div class="ep-props" id="pr"></div></div>
 <div class="ew-status"><span id="info"></span><span id="save" role="status"></span></div></div>`;
 const root=view.firstElementChild,$=s=>root.querySelector(s),slideEl=$('#slide');$('#title').textContent=file.name;
 const sl=()=>data.slides[si],objs=()=>sl().objects,sel=()=>objs().find(o=>o.id===selId),H=()=>SH(data);
 const snap=()=>JSON.stringify({ratio:data.ratio,slides:data.slides}),restore=t=>{const d=JSON.parse(t);data.ratio=d.ratio;data.slides=d.slides};
 const setS=t=>$('#save').textContent=t;
 async function save(){clearTimeout(timer);const r=rev;setS('Saving…');try{await FM.save(file);if(r===rev){dirty=false;setS('Saved '+new Date().toLocaleTimeString())}else setS('Unsaved changes')}catch(err){console.error(err);setS('SAVE FAILED: use Save as copy / download from Home')}}
 const touch=()=>{rev++;dirty=true;setS('Unsaved changes');clearTimeout(timer);timer=setTimeout(save,1500)};
 function calcScale(){const st=$('#stage');if(zoom==='fit')sc=Math.max(.2,Math.min(((st.clientWidth||900)-24)/W,((st.clientHeight||520)-24)/H()));else sc=+zoom/100}
 function renderSlide(){const s=sl();slideEl.style.cssText=`width:${W}px;height:${H()}px;background:${okc(s.bg)?s.bg:'#fff'};transform:scale(${sc});`;
  $('#wrap').style.cssText=`width:${W*sc}px;height:${H()*sc}px`;slideEl.innerHTML=s.objects.map(o=>objHtml(o,true,selId)).join('')}
 function renderThumbs(){const k=164/W;$('#th').innerHTML=data.slides.map((s,i)=>`<div class="ep-th${i===si?' on':''}" data-th="${i}" draggable="true" style="width:164px;height:${H()*k}px" aria-label="Slide ${i+1}"><div class="ep-thin" style="width:${W}px;height:${H()}px;transform:scale(${k});background:${okc(s.bg)?s.bg:'#fff'}">${s.objects.map(o=>objHtml(o,false)).join('')}</div><span>${i+1}</span></div>`).join('')}
 function renderProps(){const o=sel(),p=$('#pr');
  if(!o){p.innerHTML=`<b>Slide ${si+1}</b><label>Background <input type="color" data-sp="bg" value="${okc(sl().bg)&&sl().bg.length===7?sl().bg:'#ffffff'}"></label><p class="tag">Click an object to edit it. Double-click text to type. Drag to move; drag a corner to resize.</p>`;return}
  const num=(k,l)=>`<label>${l} <input type="number" data-p="${k}" value="${Math.round(o[k]||0)}"></label>`,col=(k,l)=>`<label>${l} <input type="color" data-p="${k}" value="${okc(o[k])&&o[k].length===7?o[k]:'#000000'}"></label>`;
  let h=`<b>${o.type==='image'?'Image':o.type==='shape'?'Shape':'Text box'}</b><div class="ep-g">${num('x','X')}${num('y','Y')}${num('w','W')}${num('h','H')}</div>`;
  if(o.type!=='image'){h+=`<select data-p="font" aria-label="Font">${FONTS.map(f=>`<option ${f===(o.font||'Arial')?'selected':''}>${f}</option>`).join('')}</select><label>Size <input type="number" data-p="fs" min="6" max="300" value="${o.fs||24}"></label>${col('color','Text')}
   <div class="ep-g">${ib('bold','<b>B</b>','Bold')}${ib('italic','<i>I</i>','Italic')}${ib('al-left','L','Align left')}${ib('al-center','C','Align center')}${ib('al-right','R','Align right')}</div>
   ${col('fill','Fill')}<button class="btn" data-act="fillnone">No fill</button>${col('stroke','Line')}<label>Width <input type="number" data-p="sw" min="0" max="40" value="${o.sw||0}"></label>`;
   if(o.type==='shape')h+=`<select data-p="shape" aria-label="Shape">${Object.entries(SHAPES).map(([k,v])=>`<option value="${k}" ${o.shape===k?'selected':''}>${v}</option>`).join('')}</select>`}
  h+=`<div class="ep-g">${ib('fwd','Forward','Bring forward')}${ib('bwd','Backward','Send backward')}${ib('odup','Duplicate','Duplicate object')}${ib('odel','Delete','Delete object')}</div>`;p.innerHTML=h}
 function fullRender(){calcScale();si=Math.max(0,Math.min(si,data.slides.length-1));$('#ratio').value=data.ratio;if(!objs().some(o=>o.id===selId))selId=null;
  renderSlide();renderThumbs();renderProps();$('#notes').value=sl().notes;$('#info').textContent=`Slide ${si+1} of ${data.slides.length} · ${data.ratio}`}
 function mutate(fn){undo.push(snap());if(undo.length>50)undo.shift();redo=[];fn();touch();fullRender()}
 function doUndo(isRedo){const from=isRedo?redo:undo,to=isRedo?undo:redo;if(!from.length)return;to.push(snap());restore(from.pop());editing=null;touch();fullRender()}
 const add=o=>mutate(()=>{o.id=uid();objs().push(o);selId=o.id});
 const base={font:'Arial',fs:24,color:'#ffffff',stroke:'',sw:0,text:''};
 const dupObj=()=>{const o=sel();if(o)mutate(()=>{const c={...structuredClone(o),id:uid(),x:o.x+20,y:o.y+20};objs().push(c);selId=c.id})};
 const delObj=()=>{if(selId)mutate(()=>{sl().objects=objs().filter(o=>o.id!==selId);selId=null})};
 function startEdit(id){const el=slideEl.querySelector(`.ep-o[data-id="${id}"] .ep-t`);if(!el)return;editing=id;el.contentEditable='true';el.focus();
  try{const r=document.createRange();r.selectNodeContents(el);const s=document.getSelection();s.removeAllRanges();s.addRange(r)}catch{}}
 slideEl.addEventListener('focusout',ev=>{const t=ev.target;if(!editing||!t.classList||!t.classList.contains('ep-t'))return;const o=objs().find(x=>x.id===editing);editing=null;if(!o)return;
  const txt=getText(t).replace(/\n$/,'');if(txt!==(o.text||''))mutate(()=>{o.text=txt});else fullRender()});
 slideEl.addEventListener('paste',ev=>{ev.preventDefault();document.execCommand&&document.execCommand('insertText',false,ev.clipboardData.getData('text/plain'))});
 slideEl.addEventListener('dblclick',ev=>{const el=ev.target.closest('.ep-o');if(el&&el.dataset.id&&!el.classList.contains('ep-image')){selId=el.dataset.id;startEdit(selId)}});
 slideEl.addEventListener('mousedown',ev=>{if(editing)return;const hd=ev.target.closest('[data-h]'),el=ev.target.closest('.ep-o');ev.preventDefault();$('#stage').focus();
  if(!el){if(selId){selId=null;renderSlide();renderProps()}return}
  const o=objs().find(x=>x.id===el.dataset.id);if(!o)return;if(selId!==o.id){selId=o.id;renderSlide();renderProps()}
  drag={o,mode:hd?hd.dataset.h:'move',x:ev.clientX,y:ev.clientY,ox:o.x,oy:o.y,ow:o.w,oh:o.h,before:snap()}});
 const onMove=ev=>{if(!drag)return;const{o}=drag,dx=Math.round((ev.clientX-drag.x)/sc),dy=Math.round((ev.clientY-drag.y)/sc),m=drag.mode;
  if(m==='move'){o.x=drag.ox+dx;o.y=drag.oy+dy}else{let x=drag.ox,y=drag.oy,w=drag.ow,h=drag.oh;
   if(m.includes('e'))w=Math.max(20,drag.ow+dx);if(m.includes('s'))h=Math.max(10,drag.oh+dy);
   if(m.includes('w')){w=Math.max(20,drag.ow-dx);x=drag.ox+drag.ow-w}if(m.includes('n')){h=Math.max(10,drag.oh-dy);y=drag.oy+drag.oh-h}Object.assign(o,{x,y,w,h})}
  const el=slideEl.querySelector(`.ep-o[data-id="${o.id}"]`);if(el)el.style.cssText=look(o)};
 const onUp=()=>{if(!drag)return;const{o}=drag;const moved=o.x!==drag.ox||o.y!==drag.oy||o.w!==drag.ow||o.h!==drag.oh;
  if(moved){undo.push(drag.before);if(undo.length>50)undo.shift();redo=[];touch()}drag=null;renderSlide();renderThumbs();renderProps()};
 const vis=()=>{if(document.hidden&&dirty)save()},onResize=()=>{if(zoom==='fit'){calcScale();renderSlide()}};
 document.addEventListener('mousemove',onMove);document.addEventListener('mouseup',onUp);document.addEventListener('visibilitychange',vis);addEventListener('resize',onResize);
 root.addEventListener('keydown',ev=>{const tg=ev.target,m=ev.ctrlKey||ev.metaKey;
  if(editing){if(ev.key==='Escape')tg.blur();return}
  if(/^(INPUT|SELECT|TEXTAREA)$/.test(tg.tagName))return;
  if(m){const x=ev.key.toLowerCase();if(x==='z'){ev.preventDefault();doUndo(ev.shiftKey)}else if(x==='y'){ev.preventDefault();doUndo(true)}else if(x==='d'){ev.preventDefault();dupObj()}return}
  const o=sel();if(!o)return;
  if(ev.key==='Delete'||ev.key==='Backspace'){ev.preventDefault();delObj()}else if(ev.key==='Escape'){selId=null;renderSlide();renderProps()}
  else{const mv={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[ev.key];if(mv){ev.preventDefault();const k=ev.shiftKey?10:1;mutate(()=>{o.x+=mv[0]*k;o.y+=mv[1]*k})}}});
 root.addEventListener('change',ev=>{const t=ev.target;
  if(t.id==='lay'){const l=t.value;t.value='';if(!l)return;mutate(()=>{data.slides.splice(si+1,0,{layout:l,bg:'#ffffff',notes:'',objects:layoutObjects(l,H())});si++;selId=null});return}
  if(t.id==='ratio'){mutate(()=>{data.ratio=t.value});return}if(t.id==='zoom'){zoom=t.value;fullRender();return}
  if(t.id==='notes'){mutate(()=>{sl().notes=t.value});return}if(t.id==='img'){addImage(t);return}
  if(t.dataset.sp==='bg'){if(okc(t.value))mutate(()=>{sl().bg=t.value});return}
  const k=t.dataset.p,o=sel();if(!k||!o)return;let v=t.value;
  if(['x','y','w','h','fs','sw'].includes(k)){if(v.trim()===''||!isFinite(Number(v)))return;v=Number(v);const lim={x:[-2000,3000],y:[-2000,3000],w:[1,3000],h:[1,3000],fs:[6,300],sw:[0,40]}[k];v=Math.max(lim[0],Math.min(lim[1],v))}
  else if(k==='font'){if(!FONTS.includes(v))return}else if(k==='shape'){if(!SHAPES[v])return}else if(!okc(v))return;
  mutate(()=>{o[k]=v})});
 function addImage(inp){const f=inp.files[0];inp.value='';if(!f)return;if(!/^image\/(png|jpe?g|gif|webp|svg\+xml)$/.test(f.type))return alert('Please choose a PNG, JPG, GIF, WebP or SVG image.');
  if(f.size>3*1048576)return alert('Image is larger than 3 MB. Please use a smaller image.');
  const r=new FileReader();r.onerror=()=>alert('Could not read the image.');r.onload=()=>{const im=new Image();im.onerror=()=>alert('This image could not be opened.');
   im.onload=()=>{const k=Math.min(1,500/im.naturalWidth,(H()-80)/im.naturalHeight),w=Math.round(im.naturalWidth*k),h=Math.round(im.naturalHeight*k);add({type:'image',x:Math.round((W-w)/2),y:Math.round((H()-h)/2),w,h,src:r.result,alt:f.name})};im.src=r.result};r.readAsDataURL(f)}
 function present(start){let i=start;const ov=document.createElement('div');ov.className='ep-present';ov.tabIndex=0;document.body.append(ov);
  const draw=()=>{const s=data.slides[i],h=H(),k=Math.min((innerWidth||W)/W,(innerHeight||h)/h);
   ov.innerHTML=`<div class="ep-pslide" style="width:${W}px;height:${h}px;transform:scale(${k});background:${okc(s.bg)?s.bg:'#fff'}">${s.objects.map(o=>objHtml(o,false)).join('')}</div><div class="ep-pcount">${i+1} / ${data.slides.length}</div>`};
  const go=d=>{const n=i+d;if(n>=0&&n<data.slides.length){i=n;draw()}};
  const end=()=>{document.removeEventListener('keydown',kd,true);document.removeEventListener('fullscreenchange',fc);removeEventListener('resize',draw);ov.remove();if(document.fullscreenElement&&document.exitFullscreen)document.exitFullscreen().catch(()=>{})};
  const kd=ev=>{if(['ArrowRight','ArrowDown',' ','PageDown','Enter'].includes(ev.key)){ev.preventDefault();ev.stopPropagation();go(1)}
   else if(['ArrowLeft','ArrowUp','PageUp','Backspace'].includes(ev.key)){ev.preventDefault();ev.stopPropagation();go(-1)}else if(ev.key==='Escape'){ev.stopPropagation();end()}};
  const fc=()=>{if(!document.fullscreenElement)end()};
  ov.addEventListener('click',()=>{if(i<data.slides.length-1)go(1);else end()});document.addEventListener('keydown',kd,true);addEventListener('resize',draw);draw();ov.focus();
  try{if(ov.requestFullscreen){ov.requestFullscreen().then(()=>document.addEventListener('fullscreenchange',fc)).catch(()=>{})}}catch{}}
 $('#th').addEventListener('click',ev=>{const t=ev.target.closest('[data-th]');if(!t)return;si=+t.dataset.th;selId=null;fullRender()});
 $('#th').addEventListener('dragstart',ev=>{const t=ev.target.closest('[data-th]');if(t&&ev.dataTransfer)ev.dataTransfer.setData('text/plain',t.dataset.th)});
 $('#th').addEventListener('dragover',ev=>ev.preventDefault());
 $('#th').addEventListener('drop',ev=>{ev.preventDefault();const t=ev.target.closest('[data-th]');if(!t||!ev.dataTransfer)return;const from=+ev.dataTransfer.getData('text/plain'),to=+t.dataset.th;if(!(from>=0)||from===to)return;
  mutate(()=>{const[s]=data.slides.splice(from,1);data.slides.splice(to,0,s);si=to})});
 root.addEventListener('click',async ev=>{const b=ev.target.closest('button');if(!b)return;const x=b.dataset.act;if(!x)return;const o=sel();
  if(x==='home'){await flush();location.hash='#/'}
  else if(x==='rename'){const n=prompt('Presentation name',file.name);if(n&&n.trim()){file.name=n.trim();$('#title').textContent=file.name;touch()}}
  else if(x==='saveas'){const n=prompt('Name for the copy',file.name+' (copy)');if(!n||!n.trim())return;await save();if(dirty)return;const c=await FM.duplicate(file.id);await FM.rename(c.id,n.trim());location.hash='#/file/'+c.id}
  else if(x==='sdup')mutate(()=>{const c=structuredClone(sl());c.objects.forEach(q=>{q.id=uid()});data.slides.splice(si+1,0,c);si++;selId=null});
  else if(x==='sdel'){if(data.slides.length<2)return alert('A presentation needs at least one slide.');if(confirm('Delete slide '+(si+1)+'? You can undo this.'))mutate(()=>{data.slides.splice(si,1);si=Math.min(si,data.slides.length-1);selId=null})}
  else if(x==='sup'){if(si>0)mutate(()=>{[data.slides[si-1],data.slides[si]]=[data.slides[si],data.slides[si-1]];si--})}
  else if(x==='sdown'){if(si<data.slides.length-1)mutate(()=>{[data.slides[si+1],data.slides[si]]=[data.slides[si],data.slides[si+1]];si++})}
  else if(x==='undo')doUndo(false);else if(x==='redo')doUndo(true);else if(x==='present')present(si);
  else if(x==='addtext')add(T(120,120,400,60,'Text',24));
  else if(x==='addrect')add({type:'shape',shape:'rect',x:200,y:180,w:240,h:140,fill:'#2b6cd9',...base});else if(x==='addellipse')add({type:'shape',shape:'ellipse',x:200,y:180,w:200,h:140,fill:'#1f9d55',...base});
  else if(x==='addround')add({type:'shape',shape:'round',x:200,y:180,w:240,h:120,fill:'#f2724b',...base});else if(x==='addline')add({type:'shape',shape:'rect',x:200,y:260,w:300,h:4,fill:'#222222',...base});
  else if(x==='addimage')$('#img').click();
  else if(!o)return;
  else if(x==='odel')delObj();else if(x==='odup')dupObj();
  else if(x==='bold')mutate(()=>{o.bold=!o.bold});else if(x==='italic')mutate(()=>{o.italic=!o.italic});else if(x.startsWith('al-'))mutate(()=>{o.al=x.slice(3)});
  else if(x==='fillnone')mutate(()=>{o.fill=''});
  else if(x==='fwd'||x==='bwd')mutate(()=>{const a=objs(),i=a.indexOf(o),j=x==='fwd'?i+1:i-1;if(j>=0&&j<a.length)[a[i],a[j]]=[a[j],a[i]]})});
 fullRender();setS('Opened');
 cur={get dirty(){return dirty},save,dispose(){clearTimeout(timer);document.removeEventListener('mousemove',onMove);document.removeEventListener('mouseup',onUp);document.removeEventListener('visibilitychange',vis);removeEventListener('resize',onResize)}};
}
