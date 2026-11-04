import {icon} from './shared/shell.js';
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
// App mode: index.html?app=evwrite|evcell|evpresent shows ONLY that app (used by the desktop shortcuts).
// No ?app= means the full hub with all three apps (same as the browser version).
const MODE=(()=>{const a=new URLSearchParams(location.search).get('app');return APPS[a]?a:null})();
if(MODE){document.title=APPS[MODE].name;const b=$('.brand');if(b)b.innerHTML=`<span class="logo">EV</span><span><b>${APPS[MODE].name}</b><small>EVLab Potato · ${APPS[MODE].desc}</small></span>`}
const WHERE=window.evNative?'on this computer (inside this app)':'in this browser';
const st={sec:'home',tq:'',tapp:MODE||'all',fq:'',fsort:'modified'};
const BLANK={evwrite:'w-blank',evcell:'c-blank',evpresent:'p-blank'};
const setTheme=t=>{document.documentElement.dataset.theme=t;try{localStorage.setItem('evp-theme',t)}catch{}};
try{setTheme(localStorage.getItem('evp-theme')||'light')}catch{}
$('#theme').onclick=()=>setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');
const fmt=t=>new Date(t).toLocaleString();
const NAV_ICON={evwrite:'doc',evcell:'table',evpresent:'slides'};
const uname=()=>{try{return localStorage.getItem('evp-name')||''}catch{return''}};
const greet=()=>{const h=new Date().getHours();return h<12?'Good morning':h<18?'Good afternoon':'Good evening'};
function modal(title,body,foot=''){document.querySelector('.hub-modal')?.remove();const m=document.createElement('div');m.className='hub-modal';
 m.innerHTML=`<div class="mbox" role="dialog" aria-modal="true" aria-label="${esc(title)}"><h2>${esc(title)}</h2>${body}<div class="row mfoot">${foot}<button class="btn" data-close>Close</button></div></div>`;
 m.addEventListener('click',e=>{if(e.target===m||e.target.closest('[data-close]'))m.remove()});document.body.append(m);
 addEventListener('keydown',function k(e){if(e.key==='Escape'){m.remove();removeEventListener('keydown',k)}});return m}
const fileRow=f=>`<button class="rf" data-open="${f.id}"><span class="rfi" style="color:${APPS[f.app].color}">${icon(NAV_ICON[f.app],22)}</span><span class="rft"><b>${esc(f.name)}</b><small>${APPS[f.app].name} · ${fmt(f.modified)}</small></span></button>`;
const tplCard=t=>`<div class="card" style="--c:${APPS[t.app].color}"><h3>${esc(t.title)}</h3><p>${esc(t.desc)}</p><p class="tag">${APPS[t.app].name} · ${esc(t.cat)} · ${esc(t.format)}</p><button class="btn primary" data-tpl="${t.id}">Use template</button></div>`;
const imp=k=>(k==='evwrite'?'<button class="btn" data-act="importdocx">Open .docx</button>':'')+(k==='evcell'?'<button class="btn" data-act="importcsv">Open .csv / .xlsx</button>':'');
function nav(){
 const it=(k,l,i)=>`<button class="hn${st.sec===k?' on':''}" data-sec="${k}">${icon(i,18)}<span>${l}</span></button>`;
 const soon=(l,i)=>`<button class="hn" data-act="soon" data-what="${l}">${icon(i,18)}<span>${l}</span><em>Soon</em></button>`;
 return `<nav class="hub-nav" aria-label="Main">${it('home','Home','home')}${Object.entries(APPS).filter(([k])=>!MODE||k===MODE).map(([k,a])=>it(k,a.name,NAV_ICON[k])).join('')}<hr>${it('files','Recent Files','clock')}${it('templates','Templates','grid')}<hr>${soon('Tools','tool')}${soon('Plugins','puzzle')}<div class="hn-sp"></div><button class="hn" data-act="settings">${icon('gear',18)}<span>Settings</span></button><button class="hn" data-act="about">${icon('help',18)}<span>Help &amp; About</span></button></nav>`}
async function home(){
 const files=await FM.list({q:st.fq,sort:st.fsort,app:MODE||'all'}),all=await FM.list({app:MODE||'all'}),u=await usage();
 const appSec=APPS[st.sec]?st.sec:null,tf=appSec||st.tapp;
 const tpls=TEMPLATES.filter(t=>(tf==='all'||t.app===tf)&&(t.title+t.cat+t.desc).toLowerCase().includes(st.tq.toLowerCase()));
 const apps=Object.entries(APPS).filter(([k])=>!MODE||k===MODE);let body;
 if(st.sec==='files')body=`<h1>Recent Files</h1><div class="row"><input id="fq" placeholder="Search files" aria-label="Search files" value="${esc(st.fq)}">
  <select id="fsort" aria-label="Sort files"><option value="modified" ${st.fsort==='modified'?'selected':''}>Last modified</option><option value="created" ${st.fsort==='created'?'selected':''}>Created</option><option value="name" ${st.fsort==='name'?'selected':''}>Name</option></select>
  <button class="btn" data-act="backup">Backup all (JSON)</button></div>
  ${files.length?files.map(f=>`<div class="file"><div><span class="dot" style="background:${APPS[f.app].color}"></span><b>${esc(f.name)}</b><div class="tag">${APPS[f.app].name} · modified ${fmt(f.modified)}</div></div>
  <div class="row"><button class="btn" data-open="${f.id}">Open</button><button class="btn" data-act="rename" data-id="${f.id}">Rename</button><button class="btn" data-act="dup" data-id="${f.id}">Duplicate</button><button class="btn" data-act="dl" data-id="${f.id}">Download</button><button class="btn" data-act="del" data-id="${f.id}">Delete</button></div></div>`).join('')
  :'<div class="empty">No files yet. Pick an app on Home or use a template to get started.</div>'}
  <p class="tag">${u?`Storage used: ${(u.usage/1048576).toFixed(2)} MB of about ${(u.quota/1048576).toFixed(0)} MB.`:'Storage usage not available.'} Cloud accounts and sync: coming later.</p>`;
 else if(st.sec==='templates'||appSec)body=`${appSec?`<h1>${APPS[appSec].name}</h1><p class="tag">${APPS[appSec].desc}</p><div class="row"><button class="btn primary" data-new="${appSec}">New blank ${APPS[appSec].kind}</button>${imp(appSec)}</div><h2>Templates</h2>`:'<h1>Templates</h1>'}
  <div class="row"><input id="tq" placeholder="Search templates" aria-label="Search templates" value="${esc(st.tq)}">${MODE||appSec?'':`<select id="tapp" aria-label="Filter by app"><option value="all">All apps</option>${Object.entries(APPS).map(([k,a])=>`<option value="${k}" ${st.tapp===k?'selected':''}>${a.name}</option>`).join('')}</select>`}</div><br>
  <div class="grid">${tpls.map(tplCard).join('')||'<div class="empty">No templates match.</div>'}</div>`;
 else body=`<h1>${MODE?'Welcome to '+APPS[MODE].name:greet()+(uname()?', '+esc(uname()):'')+'!'}</h1><p class="tag">Create. Calculate. Present. Files are saved only ${WHERE}, so download backups regularly.</p>
  <div class="hub-cols"><div class="grid">${apps.map(([k,a])=>`<div class="card app" style="--c:${a.color}"><span class="ai" style="color:${a.color}">${icon(NAV_ICON[k],40)}</span><h3>${a.name}</h3><p>${a.kind[0].toUpperCase()+a.kind.slice(1)}</p><button class="btn primary" data-new="${k}">Create new ${icon('plus',14)}</button></div>`).join('')}</div>
  <aside><div class="panel"><h2>Recent Files</h2>${all.slice(0,6).map(fileRow).join('')||'<div class="empty">No files yet.</div>'}${all.length>6?'<button class="btn" data-sec="files">View all</button>':''}</div>
  <div class="panel"><h2>Template Gallery</h2><p class="tag">${TEMPLATES.filter(t=>!MODE||t.app===MODE).length} templates ready to use.</p><button class="btn" data-sec="templates">Browse templates</button></div>
  <div class="panel"><h2>Quick Actions</h2><div class="row">${MODE?imp(MODE):imp('evwrite')+imp('evcell')}<button class="btn" data-act="backup">Backup all</button></div></div></aside></div>`;
 view.innerHTML=`<input type="file" id="docxin" accept=".docx" hidden><input type="file" id="csvin" accept=".csv,.xlsx" hidden><div class="hub">${nav()}<section class="hub-main">${body}</section></div>`;
 const bind=(id,k,ev)=>{const e=$(id);if(!e)return;e.addEventListener(ev,()=>{st[k]=e.value;const p=e.selectionStart;home().then(()=>{const n=$(id);if(n){n.focus();try{n.setSelectionRange(p,p)}catch{}}})})};
 $('#docxin').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;
  try{const r=await importFile(f,FM);if(r.warnings.length)alert('Imported as a new document. Notes:\n'+r.warnings.join('\n'));location.hash='#/file/'+r.file.id}catch(err){console.error(err);alert('Import failed: '+err.message)}};
 $('#csvin').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;
  try{const r=await importSpreadsheet(f,FM);if(r.warnings.length)alert('Imported as a new spreadsheet. Notes:\n'+r.warnings.join('\n'));location.hash='#/file/'+r.file.id}catch(err){console.error(err);alert('Import failed: '+err.message)}};
 bind('#tq','tq','input');bind('#tapp','tapp','change');bind('#fq','fq','input');bind('#fsort','fsort','change');
}
function settings(){const th=document.documentElement.dataset.theme;
 const m=modal('Settings',`<label class="fld">Your name (shown in the greeting)<input id="sname" value="${esc(uname())}"></label><label class="fld">Theme<select id="sth"><option value="light" ${th==='light'?'selected':''}>Light</option><option value="dark" ${th==='dark'?'selected':''}>Dark</option></select></label><button class="btn" data-bk>Backup all files (JSON)</button>`,'<button class="btn primary" data-save>Save</button>');
 m.querySelector('[data-bk]').onclick=()=>FM.backupAll();
 m.querySelector('[data-save]').onclick=()=>{try{localStorage.setItem('evp-name',m.querySelector('#sname').value.trim())}catch{}setTheme(m.querySelector('#sth').value);m.remove();home()}}
const about=()=>modal('Help & About',`<p><b>EVLab Potato</b> v0.5.0 by Engineering Visual Lab.</p><p>Files are saved only ${WHERE}. Changes inside an editor are saved automatically (Ctrl+S shows a reminder). Use Backup all regularly.</p>`);
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
 // BUGFIX (desktop build): the editors' buttons share data-act names (rename, importdocx, importcsv) with this home-screen
 // handler, and their clicks bubble up to #view. Inside an editor this handler must do nothing.
 if(/^#\/file\//.test(location.hash))return;
 const b=e.target.closest('button');if(!b)return;const d=b.dataset;
 try{
 if(d.sec){st.sec=d.sec;if(APPS[d.sec])st.tapp=d.sec;await home();return}
 else if(d.act==='settings')settings();
 else if(d.act==='about')about();
 else if(d.act==='soon')modal(d.what,`<p>${esc(d.what)} is coming soon.</p>`);
 else if(d.new){const t=TEMPLATES.find(x=>x.id===BLANK[d.new]);const f=await FM.create({app:d.new,name:'Untitled '+APPS[d.new].kind,data:structuredClone(t.data)});location.hash='#/file/'+f.id}
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
