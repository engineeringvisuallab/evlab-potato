// EVWrite core editor (Milestone 2a). Uses the browser's native contenteditable: no external library.
import * as FM from '../shared/file-manager.js';
import {lib,exportDocx,importFile} from './import-export.js';
const PAPERS={A4:[210,297],Letter:[215.9,279.4]};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let cur=null;
export const flush=async()=>{if(cur&&cur.dirty)await cur.save()};
export const unmount=()=>{if(cur){cur.dispose();cur=null}};
addEventListener('beforeunload',e=>{if(cur&&cur.dirty){e.preventDefault();e.returnValue=''}});
const btn=(c,l,t)=>`<button class="btn" data-cmd="${c}" title="${t}" aria-label="${t}">${l}</button>`;
export function mount(view,file){
 unmount();
 let paper=PAPERS[file.data.paper]?file.data.paper:'A4',dirty=false,rev=0,timer;
 view.innerHTML=`<div class="ew-root"><div class="ew-bar"><button class="btn" data-act="home">← Home</button><b id="title"></b>
 <button class="btn" data-act="rename">Rename</button><button class="btn" data-act="saveas">Save as copy</button><button class="btn" data-act="importdocx">Import .docx</button><input type="file" id="docxin" accept=".docx" hidden><button class="btn" data-act="find">Find &amp; replace</button><button class="btn" data-act="outline">Outline</button><button class="btn" data-act="setup">Header / footer</button>
 <select id="export" aria-label="Export"><option value="">Export…</option><option value="txt">TXT</option><option value="html">HTML</option><option value="docx">Word (.docx)</option><option value="pdf">Print / PDF</option></select>
 <select id="paper" aria-label="Paper size">${Object.keys(PAPERS).map(p=>`<option>${p}</option>`).join('')}</select></div>
 <div class="ew-bar"><select id="block" aria-label="Paragraph style"><option value="p">Paragraph</option><option value="h1">Heading 1</option><option value="h2">Heading 2</option><option value="h3">Heading 3</option></select>
 <select id="font" aria-label="Font"><option>Arial</option><option>Times New Roman</option><option>Georgia</option><option>Courier New</option><option>Noto Sans Bengali</option></select>
 <select id="size" aria-label="Font size">${[10,12,14,16,18,24,32].map(s=>`<option ${s===12?'selected':''}>${s}</option>`).join('')}</select>
 ${btn('bold','<b>B</b>','Bold')}${btn('italic','<i>I</i>','Italic')}${btn('underline','<u>U</u>','Underline')}
 <input type="color" id="color" value="#000000" aria-label="Text color"><input type="color" id="hl" value="#ffff00" aria-label="Highlight color">
 ${btn('justifyLeft','L','Align left')}${btn('justifyCenter','C','Align center')}${btn('justifyRight','R','Align right')}${btn('justifyFull','J','Justify')}
 ${btn('insertUnorderedList','• List','Bulleted list')}${btn('insertOrderedList','1. List','Numbered list')}${btn('outdent','⇤','Outdent')}${btn('indent','⇥','Indent')}
 <select id="lh" aria-label="Line spacing"><option value="">Spacing</option><option>1</option><option>1.15</option><option>1.5</option><option>2</option></select>
 <button class="btn" data-act="pb">Page break</button><button class="btn" data-act="table">Table</button><button class="btn" data-act="link">Link</button><button class="btn" data-act="image">Image</button>
 ${btn('undo','↶','Undo')}${btn('redo','↷','Redo')}<input type="file" id="img" accept="image/*" hidden></div>
 <div class="ew-bar" id="fbar" hidden><input id="fq" placeholder="Find" aria-label="Find"><input id="fr" placeholder="Replace with" aria-label="Replace with"><button class="btn" data-act="fprev" aria-label="Previous match">↑</button><button class="btn" data-act="fnext" aria-label="Next match">↓</button><button class="btn" data-act="rep">Replace</button><button class="btn" data-act="repall">Replace all</button><span id="fcount" class="tag" role="status"></span></div>
 <div class="ew-main"><aside id="outline" hidden aria-label="Outline"></aside><div class="ew-wrap"><div class="ew-hf" id="hh" hidden></div><div id="page" class="ew-page" contenteditable="true" spellcheck="true" lang="en"></div><div class="ew-hf" id="hf" hidden></div></div></div>
 <div class="ew-status"><span id="count"></span><span id="status" role="status"></span></div></div>`;
 const root=view.firstElementChild,$=s=>root.querySelector(s),page=$('#page'),status=$('#status');
 const style=document.createElement('style');document.head.append(style);
 $('#title').textContent=file.name;page.innerHTML=file.data.html||'<p></p>';
 const cssStr=t=>'"'+String(t).replace(/[\\"]/g,'\\$&').replace(/\n/g,' ')+'"';
 const applyPrint=()=>{const d=file.data;style.textContent=`@page{size:${paper};margin:20mm;${d.header?`@top-center{content:${cssStr(d.header)}}`:''}${d.footer?`@bottom-center{content:${cssStr(d.footer)}}`:''}${d.pageNumbers?'@bottom-right{content:"Page " counter(page)}':''}}`;
  $('#hh').textContent=d.header||'';$('#hh').hidden=!d.header;$('#hf').textContent=(d.footer||'')+(d.pageNumbers?(d.footer?' · ':'')+'page numbers on when printing':'');$('#hf').hidden=!(d.footer||d.pageNumbers)};
 const setPaper=p=>{paper=p;const[w,h]=PAPERS[p];$('#paper').value=p;page.style.width=w+'mm';page.style.minHeight=h+'mm';$('#hh').style.width=$('#hf').style.width=w+'mm';applyPrint()};setPaper(paper);
 const setS=t=>status.textContent=t;
 const count=()=>{const t=page.innerText.trim();$('#count').textContent=(t?t.split(/\s+/).length:0)+' words'};count();
 async function save(){clearTimeout(timer);const r=rev;setS('Saving…');
  try{file.data.html=page.innerHTML;file.data.paper=paper;await FM.save(file);if(r===rev){dirty=false;setS('Saved '+new Date().toLocaleTimeString())}else setS('Unsaved changes')}
  catch(e){console.error(e);setS('SAVE FAILED: use Export to keep a copy')}}
 const touch=()=>{rev++;dirty=true;setS('Unsaved changes');clearTimeout(timer);timer=setTimeout(save,1500);count();if(!$('#outline').hidden)outline()};
 const vis=()=>{if(document.hidden&&dirty)save()};document.addEventListener('visibilitychange',vis);
 const exec=(c,v)=>{page.focus();document.execCommand(c,false,v);touch()};
 page.addEventListener('input',touch);
 page.addEventListener('paste',e=>{e.preventDefault();document.execCommand('insertText',false,e.clipboardData.getData('text/plain'))});
 root.addEventListener('mousedown',e=>{if(e.target.closest('button'))e.preventDefault()});
 const dl=(name,type,text)=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();URL.revokeObjectURL(a.href)};
 const base=()=>file.name.replace(/[^\w\- ]+/g,'_');
 $('#block').onchange=e=>{exec('formatBlock',e.target.value)};
 $('#font').onchange=e=>exec('fontName',e.target.value);
 $('#size').onchange=e=>{exec('fontSize','7');page.querySelectorAll('font[size="7"]').forEach(f=>{f.removeAttribute('size');f.style.fontSize=e.target.value+'pt'})};
 $('#color').onchange=e=>exec('foreColor',e.target.value);$('#hl').onchange=e=>exec('hiliteColor',e.target.value);
 $('#lh').onchange=e=>{const s=getSelection();if(!e.target.value||!s.rangeCount)return;page.focus();
  [...page.children].forEach(c=>{if(s.containsNode(c,true))c.style.lineHeight=e.target.value});touch()};
 $('#paper').onchange=e=>{setPaper(e.target.value);touch()};
 $('#export').onchange=async e=>{const v=e.target.value;e.target.value='';
  if(v==='txt')dl(base()+'.txt','text/plain',page.innerText);
  if(v==='html')dl(base()+'.html','text/html',`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(file.name)}</title></head><body>${page.innerHTML}</body></html>`);
  if(v==='docx'){try{setS('Exporting .docx…');const D=await lib('docx');const r=await exportDocx(page,file.data,D);
   dl(base()+'.docx','application/vnd.openxmlformats-officedocument.wordprocessingml.document',r.blob);
   setS('Exported .docx (basic formatting only)'+(r.warnings.length?': '+r.warnings.join(' '):''))}catch(err){console.error(err);setS('DOCX export failed: '+err.message)}}
  if(v==='pdf')window.print()};
 $('#docxin').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;
  try{const r=await importFile(f,FM);if(r.warnings.length)alert('Imported as a new document. Notes:\n'+r.warnings.join('\n'));location.hash='#/file/'+r.file.id}
  catch(err){console.error(err);alert('Import failed: '+err.message)}};
 $('#img').onchange=e=>{const f=e.target.files[0];e.target.value='';if(!f)return;
  if(f.size>2*1048576){alert('Image is larger than 2 MB. Please use a smaller image.');return}
  const r=new FileReader();r.onload=()=>exec('insertImage',r.result);r.readAsDataURL(f)};
 root.addEventListener('click',async e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.cmd)return exec(b.dataset.cmd);
  if(b.dataset.h!==undefined){page.querySelectorAll('h1,h2,h3')[+b.dataset.h].scrollIntoView({block:'start'});return}
  const a=b.dataset.act;
  if(a==='home'){await flush();location.hash='#/'}
  else if(a==='rename'){const n=prompt('Document name',file.name);if(n&&n.trim()){file.name=n.trim();$('#title').textContent=file.name;touch()}}
  else if(a==='saveas'){const n=prompt('Name for the copy',file.name+' (copy)');if(!n||!n.trim())return;await save();
   if(dirty)return;const c=await FM.duplicate(file.id);await FM.rename(c.id,n.trim());location.hash='#/file/'+c.id}
  else if(a==='table'){const r=+prompt('Rows (1-20)','3'),c=+prompt('Columns (1-10)','3');
   if(!(r>=1&&r<=20&&c>=1&&c<=10))return alert('Please enter rows 1-20 and columns 1-10.');
   exec('insertHTML','<table>'+('<tr>'+'<td><br></td>'.repeat(c)+'</tr>').repeat(r)+'</table><p><br></p>')}
  else if(a==='link'){const u=prompt('Link address (https://…)');if(!u)return;
   if(!/^(https?:|mailto:)/i.test(u))return alert('Only http, https and mailto links are allowed.');exec('createLink',u)}
  else if(a==='image')$('#img').click()
  else if(a==='importdocx')$('#docxin').click();
  else if(a==='find')toggleFind();
  else if(a==='fnext')go(1);else if(a==='fprev')go(-1);
  else if(a==='rep'){finds();if(fi<0||!ranges[fi])return go(1);selR(ranges[fi]);document.execCommand('insertText',false,$('#fr').value);touch();fi--;go(1)}
  else if(a==='repall'){finds();const n=ranges.length;for(let i=n-1;i>=0;i--){selR(ranges[i]);document.execCommand('insertText',false,$('#fr').value)}
   if(n)touch();if(hasHL)CSS.highlights.clear();ranges=[];$('#fcount').textContent='Replaced '+n}
  else if(a==='outline'){const o=$('#outline');o.hidden=!o.hidden;if(!o.hidden)outline()}
  else if(a==='pb')exec('insertHTML','<div class="pb" contenteditable="false"></div><p><br></p>')
  else if(a==='setup'){const h=prompt('Header text (empty = none)',file.data.header||'');if(h===null)return;
   const f=prompt('Footer text (empty = none)',file.data.footer||'');if(f===null)return;
   file.data.header=h.trim();file.data.footer=f.trim();file.data.pageNumbers=confirm('Show page numbers when printing? (OK = yes)');applyPrint();touch()}});

 const outline=()=>{$('#outline').innerHTML=[...page.querySelectorAll('h1,h2,h3')].map((h,i)=>`<button class="btn ol${h.tagName[1]}" data-h="${i}">${esc(h.textContent.trim()||'(empty heading)')}</button>`).join('')||'<p class="tag">No headings yet. Use Heading 1-3.</p>'};
 let ranges=[],fi=-1;const hasHL=window.CSS&&CSS.highlights&&typeof Highlight!=='undefined';
 const finds=()=>{const q=$('#fq').value.toLowerCase();ranges=[];if(!q)return;const w=document.createTreeWalker(page,NodeFilter.SHOW_TEXT);let n;
  while(n=w.nextNode()){const t=n.nodeValue.toLowerCase();let i=t.indexOf(q);while(i>=0){const r=document.createRange();r.setStart(n,i);r.setEnd(n,i+q.length);ranges.push(r);i=t.indexOf(q,i+q.length)}}};
 const show=()=>{$('#fcount').textContent=ranges.length?(fi+1)+' of '+ranges.length:'No matches';
  if(hasHL){CSS.highlights.set('ew-find',new Highlight(...ranges));const h=new Highlight(...(ranges[fi]?[ranges[fi]]:[]));h.priority=1;CSS.highlights.set('ew-cur',h)}
  else if(ranges[fi]){const s=getSelection();s.removeAllRanges();s.addRange(ranges[fi])}
  if(ranges[fi])ranges[fi].startContainer.parentElement.scrollIntoView({block:'center'})};
 const go=d=>{finds();if(!ranges.length){fi=-1;return show()}fi=(fi+d+ranges.length)%ranges.length;show()};
 const selR=r=>{const s=getSelection();s.removeAllRanges();s.addRange(r);page.focus()};
 const toggleFind=()=>{const b=$('#fbar');b.hidden=!b.hidden;if(b.hidden){if(hasHL)CSS.highlights.clear()}else{$('#fq').focus();$('#fq').select()}};
 $('#fq').oninput=()=>{fi=-1;go(1)};
 root.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&(e.key==='f'||e.key==='h')){e.preventDefault();toggleFind()}
  else if(e.target.id==='fq'&&e.key==='Enter'){e.preventDefault();go(e.shiftKey?-1:1)}});
 cur={get dirty(){return dirty},save,dispose(){if(hasHL)CSS.highlights.clear();clearTimeout(timer);document.removeEventListener('visibilitychange',vis);style.remove()}};
}
