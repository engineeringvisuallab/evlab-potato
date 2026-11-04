// EVLab shell layer: unified title bar, File menu, icons, grouped toolbar. Does NOT touch editor logic:
// it only restyles/moves existing buttons and forwards clicks to them (data-act / data-cmd stay intact).
const P={undo:'M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3',redo:'m15 14 5-5-5-5M20 9H10a6 6 0 0 0 0 12h3',
bold:'M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z',italic:'M19 4h-9M14 20H5M15 4 9 20',underline:'M6 4v7a6 6 0 0 0 12 0V4M4 21h16',
left:'M3 6h18M3 12h12M3 18h16',center:'M3 6h18M6 12h12M4 18h16',right:'M3 6h18M9 12h12M5 18h16',justifyFull:'M3 6h18M3 12h18M3 18h18',
insertUnorderedList:'M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01',insertOrderedList:'M10 6h11M10 12h11M10 18h11M4 6h1v4M4 10h2M4 16h2l-2 3h2',
indent:'M3 6h18M11 12h10M3 18h18M3 9l4 3-4 3z',outdent:'M3 6h18M11 12h10M3 18h18M7 9l-4 3 4 3z',
present:'M6 4l14 8-14 8z',sdup:'M8 8h12v12H8zM4 16V4h12',sdel:'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',sup:'m6 15 6-6 6 6',sdown:'m6 9 6 6 6-6',
addtext:'M5 5h14M12 5v14M9 19h6',addrect:'M4 6h16v12H4z',addellipse:'M12 5a8 6 0 1 0 .01 0z',addround:'M7 5h10a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3z',addline:'M4 12h16',addimage:'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M9 9h.01'};
P.find='M11 4a7 7 0 1 0 .01 0zM16.5 16.5 21 21';P.chart='M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-3';P.cf='M4 6h16M4 12h10M4 18h6';P.dv='M5 12l4 4 10-10';P.filter='M3 5h18l-7 8v6l-4-2v-4z';P.table='M3 5h18v14H3zM3 10h18M3 15h18M9 5v14M15 5v14';P.image=P.addimage;P.link='M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1';
P.b=P.bold;P.i=P.italic;P.justifyLeft=P.left;P.justifyCenter=P.center;P.justifyRight=P.right;
const ico=d=>`<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
const H={home:'M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z',doc:'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h6',table:'M3 5h18v14H3zM3 10h18M3 15h18M9 5v14M15 5v14',slides:'M3 4h18v12H3zM12 16v4M8 20h8M10 8l5 3-5 3z',clock:'M12 3a9 9 0 1 0 .01 0zM12 7v5l3 2',grid:'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',tool:'M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.4 2.4-2.6-.6-.6-2.6z',puzzle:'M10 4a2 2 0 1 1 4 0v2h4v4h-2a2 2 0 1 0 0 4h2v4h-4v-2a2 2 0 1 0-4 0v2H6v-4h2a2 2 0 1 0 0-4H6V6h4z',gear:'M12 8a4 4 0 1 0 .01 0zM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2',help:'M12 3a9 9 0 1 0 .01 0zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5M12 17h.01',plus:'M12 5v14M5 12h14',search:P.find,list:P.insertUnorderedList,header:'M4 5h16M4 19h16M7 9h10v6H7z',panel:'M3 5h18v14H3zM15 5v14',comment:'M4 5h16v11H9l-5 4z',rule:P.cf,check:P.dv,chart:P.chart,filter:P.filter,text:P.addtext,shape:P.addrect,image:P.addimage,play:P.present};
export const icon=(k,s=16)=>`<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${H[k]}"/></svg>`;

const q=(r,k)=>r.querySelector(`button[data-act="${k}"],button[data-cmd="${k}"]`);
const B=(l,k)=>({l,k}),SEP={sep:1},SOON=l=>({l,soon:1}),G=(sel,pre)=>({g:sel,pre});
const UR=[B('Undo','undo'),B('Redo','redo')];
const MENU={
EVWrite:[['Edit',[...UR,SEP,B('Find & replace','find')]],['Insert',[B('Table','table'),B('Image','image'),B('Link','link'),B('Page break','pb')]],
 ['Format',[B('Bold','bold'),B('Italic','italic'),B('Underline','underline'),SEP,B('Align left','justifyLeft'),B('Align center','justifyCenter'),B('Align right','justifyRight'),B('Justify','justifyFull'),SEP,B('Bulleted list','insertUnorderedList'),B('Numbered list','insertOrderedList'),B('Indent','indent'),B('Outdent','outdent'),SEP,B('Header / footer','setup')]],
 ['View',[B('Outline','outline'),{l:'Properties panel',panel:1}]],['Review',[SOON('Comments'),SOON('Track changes'),SOON('Version history')]]],
EVCell:[['Edit',[...UR,SEP,B('Find & replace','find'),SEP,B('Insert row','addrow'),B('Delete row','delrow'),B('Insert column','addcol'),B('Delete column','delcol')]],['Insert',[B('Chart','chart')]],
 ['Format',[B('Bold','b'),B('Italic','i'),B('Align left','left'),B('Align center','center'),B('Align right','right'),B('Border','bd'),SEP,B('Merge cells','merge'),B('Unmerge cell','unmerge'),SEP,B('Conditional formatting','cf'),B('Data validation','dv')]],
 ['Data',[B('Sort A→Z','sortasc'),B('Sort Z→A','sortdesc'),SEP,B('Filter on/off','filter'),B('Filter column…','filtercol')]],['View',[B('Freeze top row','freezer'),B('Freeze first column','freezec'),{l:'Properties panel',panel:1}]]],
EVPresent:[['Edit',[...UR,SEP,B('Duplicate object','odup'),B('Delete object','odel')]],['Insert',[B('Text box','addtext'),B('Rectangle','addrect'),B('Ellipse','addellipse'),B('Rounded rectangle','addround'),B('Line','addline'),B('Image','addimage')]],
 ['Slide',[G('#lay','New slide: '),SEP,B('Duplicate slide','sdup'),B('Delete slide','sdel'),B('Move up','sup'),B('Move down','sdown')]],['Format',[B('Bold','bold'),B('Italic','italic'),SEP,B('Bring forward','fwd'),B('Send backward','bwd'),B('No fill','fillnone')]],
 ['View',[B('Present','present'),SEP,G('#zoom','Zoom: '),G('#ratio','Slide size: ')]]]};
const RAIL={EVWrite:[['search','Find & replace','find'],['list','Outline','outline'],['header','Header / footer','setup'],['panel','Properties panel',1],['comment','Comments',0]],
EVCell:[['search','Find & replace','find'],['chart','Insert chart','chart'],['rule','Conditional formatting','cf'],['check','Data validation','dv'],['filter','Filter on/off','filter'],['panel','Properties panel',1]],
EVPresent:[['text','Text box','addtext'],['shape','Rectangle','addrect'],['image','Image','addimage'],['play','Present','present']]};
const setSel=(s,v)=>{s.value=v;s.dispatchEvent(new Event('change',{bubbles:true}))};
function toast(m){const e=document.createElement('div');e.className='sh-toast';e.textContent=m;document.body.append(e);setTimeout(()=>e.remove(),1800)}
let menu;const close=()=>{menu&&menu.remove();menu=null};
function openMenu(btn,items){
 if(menu&&menu._f===btn){close();return}close();menu=document.createElement('div');menu._f=btn;menu.className='sh-menu';menu.setAttribute('role','menu');
 const r=btn.getBoundingClientRect();menu.style.left=r.left+'px';menu.style.top=r.bottom+2+'px';
 items.forEach(e=>{if(e.sep){menu.append(document.createElement('hr'));return}const b=document.createElement('button');b.setAttribute('role','menuitem');
  const sp=document.createElement('span');sp.textContent=e.l;b.append(sp);if(e.soon){b.disabled=true;b.insertAdjacentHTML('beforeend','<em>Soon</em>')}else b.onclick=()=>{close();e.f()};menu.append(b)});
 menu.addEventListener('keydown',e=>{if(e.key!=='ArrowDown'&&e.key!=='ArrowUp')return;e.preventDefault();const bs=[...menu.querySelectorAll('button:not([disabled])')],i=bs.indexOf(document.activeElement);bs[(i+(e.key==='ArrowDown'?1:-1)+bs.length)%bs.length].focus()});
 document.body.append(menu);menu.querySelector('button:not([disabled])')?.focus()}
function resolve(root,list,togglePanel){
 const out=[];list.forEach(e=>{
  if(e.k){if(q(root,e.k))out.push({l:e.l,f:()=>q(root,e.k).click()})}
  else if(e.g){const s=root.querySelector(e.g);if(s)[...s.options].filter(o=>o.value&&!o.disabled).forEach(o=>out.push({l:e.pre+o.text,f:()=>setSel(s,o.value)}))}
  else if(e.panel){if(togglePanel)out.push({l:e.l,f:togglePanel})}
  else out.push(e)});
 return out.filter((e,i,a)=>!(e.sep&&(i===0||i===a.length-1||a[i-1].sep)))}
function enhance(root){
 if(root.dataset.sh)return;root.dataset.sh='1';
 const app=root.querySelector('.ec-fbar')?'EVCell':root.querySelector('.ep-main')?'EVPresent':'EVWrite',$=s=>root.querySelector(s),bars=[...root.querySelectorAll(':scope>.ew-bar')],t=bars[0];if(!t)return;t.classList.add('sh-title');
 root.querySelectorAll('button[data-act],button[data-cmd]').forEach(b=>{const k=b.dataset.act||b.dataset.cmd,d=P[k];if(!d)return;
  const l=b.getAttribute('aria-label')||b.title||b.textContent.replace('▶','').trim();b.title=l;b.setAttribute('aria-label',l);
  b.innerHTML=ico(d)+(k==='present'?'<span>Present</span>':'');b.classList.add('sh-ico')});
 // title bar: brand + file name + undo/redo/present only; everything else is in menus, the rail or a toolbar row
 const hide=e=>e&&e.classList.add('sh-hide'),ACT=['home','rename','saveas','importdocx','importcsv','exportcsv','exportxlsx'];
 if(app==='EVWrite')ACT.push('find','outline','setup');
 ACT.forEach(a=>t.querySelectorAll(`[data-act="${a}"]`).forEach(hide));if(app==='EVWrite'){hide($('#export'));hide($('#paper'))}
 const title=$('#title'),keep=new Set([title,...t.querySelectorAll('[data-cmd="undo"],[data-cmd="redo"],[data-act="undo"],[data-act="redo"],[data-act="present"]')]);
 const extra=[...t.children].filter(e=>!keep.has(e)&&!e.classList.contains('sh-hide')&&!e.hidden);
 const br=document.createElement('span');br.className='sh-brand';br.innerHTML='<i class="logo">EV</i>'+app;t.prepend(br);
 title.title='Click to rename';title.onclick=()=>q(root,'rename')?.click();
 // menu bar
 const mb=document.createElement('div');mb.className='sh-menubar';mb.setAttribute('role','menubar');t.after(mb);
 let panel,togglePanel;
 const FILE=[B('Home','home'),B('Rename','rename'),B('Save as copy','saveas'),SEP,B('Import .docx','importdocx'),B('Import .csv / .xlsx','importcsv'),SEP,B('Export .csv','exportcsv'),B('Export .xlsx','exportxlsx'),
  {g:'#export',pre:'Export as '}];
 const menus=[['File',FILE],...MENU[app]];
 menus.forEach(([n,l])=>{const b=document.createElement('button');b.className='sh-mb';b.textContent=n;b.setAttribute('aria-haspopup','menu');
  b.onclick=()=>openMenu(b,resolve(root,l,togglePanel));b.onmouseenter=()=>{if(menu&&menu._f!==b)openMenu(b,resolve(root,l,togglePanel))};mb.append(b)});
 if(extra.length){const bar=document.createElement('div');bar.className='ew-bar';bar.append(...extra);mb.after(bar)}
 // properties panel (Writer, Cell; EVPresent already has its own object panel)
 if(app!=='EVPresent'){
  panel=document.createElement('aside');panel.className='sh-props';panel.setAttribute('aria-label','Properties');panel.hidden=innerWidth<1100;
  const sec=(h,b)=>`<h3>${h}</h3>${b}`,row=(l,f)=>`<div class="pr"><span>${l}</span><b data-f="${f}"></b></div>`,soon=l=>`<div class="pr soon"><span>${l}</span><em>Soon</em></div>`;
  panel.innerHTML=sec('Document',row('Name','name')+(app==='EVWrite'?row('Length','stat'):'')+row('Status','save'))+
   (app==='EVWrite'?sec('Page','<label class="pr"><span>Paper size</span><select data-px="#paper"></select></label><button class="btn" data-px-act="setup">Header / footer…</button>')+sec('Coming soon',soon('Sections')+soon('Comments')+soon('Version history'))
   :sec('Selection',row('Cell','sel')+'<label class="pr"><span>Format</span><select data-px="#nf"></select></label>')+sec('Coming soon',soon('Pivot tables')+soon('Named ranges')));
  const prox=[];panel.querySelectorAll('select[data-px]').forEach(c=>{const o=$(c.dataset.px);if(!o)return;[...o.options].forEach(x=>c.add(new Option(x.text,x.value)));c.value=o.value;c.onchange=()=>setSel(o,c.value);prox.push([o,c])});
  panel.querySelectorAll('[data-px-act]').forEach(b=>b.onclick=()=>q(root,b.dataset.pxAct)?.click());
  const txt=(f,v)=>{const e=panel.querySelector(`[data-f="${f}"]`);if(e&&e.textContent!==v)e.textContent=v};
  const upd=()=>{if(!root.isConnected){clearInterval(iv);return}txt('name',title.textContent);txt('stat',($('#count')||$('#stat'))?.textContent||'—');txt('save',($('#status')||$('#save'))?.textContent||'—');txt('sel',$('#nb')?.value||'—');prox.forEach(([o,c])=>{if(c.value!==o.value)c.value=o.value})};
  const iv=setInterval(upd,600);upd();
  togglePanel=()=>{panel.hidden=!panel.hidden;root.querySelectorAll('.sh-rb[data-panel]').forEach(b=>b.setAttribute('aria-pressed',String(!panel.hidden)))};
 }
 // left rail + layout wrap (moves nodes, keeps every element and listener)
 const rail=document.createElement('nav');rail.className='sh-rail';rail.setAttribute('aria-label','Tools');
 RAIL[app].forEach(([i,l,a])=>{if(a===1&&!togglePanel)return;const b=document.createElement('button');b.className='sh-rb';b.title=l;b.setAttribute('aria-label',l);b.innerHTML=icon(i,18);
  if(a===1){b.dataset.panel='1';b.setAttribute('aria-pressed',String(!panel.hidden));b.onclick=togglePanel}else if(a===0)b.onclick=()=>toast(l+' — coming soon');else b.onclick=()=>q(root,a)?.click();rail.append(b)});
 const body=document.createElement('div'),col=document.createElement('div');body.className='sh-body';col.className='sh-col';
 col.append(...[...root.children].filter(e=>e!==t&&e!==mb));body.append(rail,col);if(panel)body.append(panel);root.append(body);
}
const view=document.getElementById('view');
const sync=()=>{const r=view.querySelector('.ew-root');document.body.classList.toggle('in-editor',!!r);if(r)enhance(r)};
new MutationObserver(sync).observe(view,{childList:true});sync();
addEventListener('mousedown',e=>{if(menu&&!menu.contains(e.target)&&!e.target.closest('.sh-mb'))close()});
addEventListener('keydown',e=>{if(e.key==='Escape')close();
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'&&document.body.classList.contains('in-editor')){e.preventDefault();toast('Changes are saved automatically')}});
