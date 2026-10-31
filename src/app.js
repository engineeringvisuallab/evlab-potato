import * as FM from './shared/file-manager.js';
import {usage} from './shared/storage.js';
import {TEMPLATES,APPS} from './shared/templates.js';
import * as Writer from './evwrite/editor.js';
import {importFile} from './evwrite/import-export.js';
import * as Cell from './evcell/grid.js';
import * as Present from './evpresent/editor.js';
import {importSpreadsheet} from './evcell/xlsx.js';
const $=s=>document.querySelector(s),view=$('#view');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const st={tq:'',tapp:'all',fq:'',fsort:'modified'};
const BLANK={evwrite:'w-blank',evcell:'c-blank',evpresent:'p-blank'};
const setTheme=t=>{document.documentElement.dataset.theme=t;try{localStorage.setItem('evp-theme',t)}catch{}};
try{setTheme(localStorage.getItem('evp-theme')||'light')}catch{}
$('#theme').onclick=()=>setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');
const fmt=t=>new Date(t).toLocaleString();
async function home(){
 const files=await FM.list({q:st.fq,sort:st.fsort});
 const tpls=TEMPLATES.filter(t=>(st.tapp==='all'||t.app===st.tapp)&&(t.title+t.cat+t.desc).toLowerCase().includes(st.tq.toLowerCase()));
 const u=await usage();
 view.innerHTML=`<input type="file" id="docxin" accept=".docx" hidden><input type="file" id="csvin" accept=".csv,.xlsx" hidden><h1>Welcome to EVLab Potato</h1><p class="tag">Create. Calculate. Present. Files are saved only in this browser, so download backups regularly.</p>
 <div class="grid">${Object.entries(APPS).map(([k,a])=>`<div class="card" style="--c:${a.color}"><h3>${a.name}</h3><p>${a.desc}</p>
  <div class="row"><button class="btn primary" data-new="${k}">New blank ${a.kind}</button><button class="btn" data-go="tpl" data-app="${k}">Templates</button>${k==='evwrite'?'<button class="btn" data-act="importdocx">Open .docx</button>':''}${k==='evcell'?'<button class="btn" data-act="importcsv">Open .csv / .xlsx</button>':''}</div></div>`).join('')}</div>
 <h2 id="tpl">Templates</h2><div class="row"><input id="tq" placeholder="Search templates" aria-label="Search templates" value="${esc(st.tq)}">
 <select id="tapp" aria-label="Filter by app"><option value="all">All apps</option>${Object.entries(APPS).map(([k,a])=>`<option value="${k}" ${st.tapp===k?'selected':''}>${a.name}</option>`).join('')}</select></div><br>
 <div class="grid">${tpls.map(t=>`<div class="card" style="--c:${APPS[t.app].color}"><h3>${esc(t.title)}</h3><p>${esc(t.desc)}</p><p class="tag">${APPS[t.app].name} · ${esc(t.cat)} · ${esc(t.format)}</p>
  <button class="btn primary" data-tpl="${t.id}">Use template</button></div>`).join('')||'<div class="empty">No templates match.</div>'}</div>
 <h2>Recent files</h2><div class="row"><input id="fq" placeholder="Search files" aria-label="Search files" value="${esc(st.fq)}">
 <select id="fsort" aria-label="Sort files"><option value="modified" ${st.fsort==='modified'?'selected':''}>Last modified</option><option value="created" ${st.fsort==='created'?'selected':''}>Created</option><option value="name" ${st.fsort==='name'?'selected':''}>Name</option></select>
 <button class="btn" data-act="backup">Backup all (JSON)</button></div>
 ${files.length?files.map(f=>`<div class="file"><div><span class="dot" style="background:${APPS[f.app].color}"></span><b>${esc(f.name)}</b><div class="tag">${APPS[f.app].name} · modified ${fmt(f.modified)}</div></div>
  <div class="row"><button class="btn" data-open="${f.id}">Open</button><button class="btn" data-act="rename" data-id="${f.id}">Rename</button><button class="btn" data-act="dup" data-id="${f.id}">Duplicate</button><button class="btn" data-act="dl" data-id="${f.id}">Download</button><button class="btn" data-act="del" data-id="${f.id}">Delete</button></div></div>`).join('')
 :'<div class="empty">No files yet. Pick an app above or use a template to get started.</div>'}
 <p class="tag">${u?`Browser storage used: ${(u.usage/1048576).toFixed(2)} MB of about ${(u.quota/1048576).toFixed(0)} MB.`:'Storage usage not available in this browser.'} Cloud accounts and sync: coming later.</p>`;
 const bind=(id,k,ev)=>{const e=$(id);e.addEventListener(ev,()=>{st[k]=e.value;const p=e.selectionStart;home().then(()=>{const n=$(id);n.focus();try{n.setSelectionRange(p,p)}catch{}})})};
 $('#docxin').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;
  try{const r=await importFile(f,FM);if(r.warnings.length)alert('Imported as a new document. Notes:\n'+r.warnings.join('\n'));location.hash='#/file/'+r.file.id}catch(err){console.error(err);alert('Import failed: '+err.message)}};
 $('#csvin').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;
  try{const r=await importSpreadsheet(f,FM);if(r.warnings.length)alert('Imported as a new spreadsheet. Notes:\n'+r.warnings.join('\n'));location.hash='#/file/'+r.file.id}catch(err){console.error(err);alert('Import failed: '+err.message)}};
 bind('#tq','tq','input');bind('#tapp','tapp','change');bind('#fq','fq','input');bind('#fsort','fsort','change');
}
async function viewer(id){
 const f=await FM.open(id);if(!f){location.hash='#/';return}
 if(f.app==='evwrite'){Writer.mount(view,f);return}
 if(f.app==='evcell'){Cell.mount(view,f);return}
 if(f.app==='evpresent'){Present.mount(view,f);return}
 view.innerHTML=`<a href="#/" class="btn">← Home</a><h1>${esc(f.name)}</h1><p class="tag">${APPS[f.app].name} · saved ${fmt(f.modified)}${f.template?' · from template '+esc(f.template):''}</p>
 <div class="empty">The ${APPS[f.app].name} editor is not built yet (it arrives in its own milestone). Your file is already saved and its data is shown below.</div><h2>Stored data</h2><pre>${esc(JSON.stringify(f.data,null,2))}</pre>`;
}
async function route(){await Writer.flush();Writer.unmount();await Cell.flush();Cell.unmount();await Present.flush();Present.unmount();const m=location.hash.match(/^#\/file\/(.+)$/);if(m)await viewer(m[1]);else await home();}
view.addEventListener('click',async e=>{
 const b=e.target.closest('button');if(!b)return;const d=b.dataset;
 try{
 if(d.new){const t=TEMPLATES.find(x=>x.id===BLANK[d.new]);const f=await FM.create({app:d.new,name:'Untitled '+APPS[d.new].kind,data:structuredClone(t.data)});location.hash='#/file/'+f.id}
 else if(d.go){st.tapp=d.app;await home();document.getElementById('tpl').scrollIntoView()}
 else if(d.tpl){const t=TEMPLATES.find(x=>x.id===d.tpl);const f=await FM.create({app:t.app,name:t.title,template:t.id,data:structuredClone(t.data)});location.hash='#/file/'+f.id}
 else if(d.open)location.hash='#/file/'+d.open;
 else if(d.act==='rename'){const f=await FM.open(d.id);const n=prompt('New name',f.name);if(n&&n.trim()){await FM.rename(d.id,n.trim());home()}}
 else if(d.act==='dup'){await FM.duplicate(d.id);home()}
 else if(d.act==='dl')FM.download(await FM.open(d.id));
 else if(d.act==='del'){if(confirm('Delete this file permanently? This cannot be undone.')){await FM.remove(d.id);home()}}
 else if(d.act==='backup')FM.backupAll();
 else if(d.act==='importdocx')$('#docxin').click();
 else if(d.act==='importcsv')$('#csvin').click();
 }catch(err){console.error(err);alert('Something went wrong: '+err.message)}
});
addEventListener('hashchange',route);route();
