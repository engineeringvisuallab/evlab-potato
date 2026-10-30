// DOCX import/export for EVWrite. Libraries (loaded on demand from src/vendor/): mammoth 1.13.0 (BSD-2), docx 9.15.0 (MIT).
const LIBS={mammoth:['src/vendor/mammoth.browser.min.js','mammoth'],docx:['src/vendor/docx.iife.js','docx']};
export async function lib(name){const[src,g]=LIBS[name];if(window[g])return window[g];
 await new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=()=>rej(new Error('Could not load '+src));document.head.append(s)});return window[g]}
export function sanitize(html){const d=new DOMParser().parseFromString(html,'text/html');
 d.querySelectorAll('script,style,iframe,object,embed,link,meta,form,input,button').forEach(e=>e.remove());
 d.body.querySelectorAll('*').forEach(e=>{for(const a of [...e.attributes]){const n=a.name.toLowerCase(),v=a.value.trim();
  if(n.startsWith('on'))e.removeAttribute(a.name);
  else if(n==='href'&&!/^(https?:|mailto:|#)/i.test(v))e.removeAttribute(a.name);
  else if(n==='src'&&!/^data:image\//i.test(v))e.removeAttribute(a.name)}});
 d.body.querySelectorAll('img:not([src])').forEach(e=>e.remove());return d.body.innerHTML}
export async function importDocx(arrayBuffer,M){const r=await M.convertToHtml({arrayBuffer});
 return{html:sanitize(r.value)||'<p></p>',warnings:[...new Set(r.messages.map(m=>m.message))]}}
export async function importFile(f,FM){
 if(!/\.docx$/i.test(f.name))throw new Error('Only .docx files are supported.');
 if(f.size>20*1048576)throw new Error('File is larger than 20 MB.');
 const r=await importDocx(await f.arrayBuffer(),await lib('mammoth'));
 const file=await FM.create({app:'evwrite',name:f.name.replace(/\.docx$/i,''),data:{html:r.html,paper:'A4',imported:'docx'}});
 return{file,warnings:r.warnings}}
const hex=c=>{if(!c)return;c=c.trim();if(c[0]==='#')return c.length===4?c.slice(1).split('').map(x=>x+x).join(''):c.slice(1,7);
 const m=c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);return m?[m[1],m[2],m[3]].map(x=>(+x).toString(16).padStart(2,'0')).join(''):undefined};
export function buildDocx(root,data,D){
 const warn=[];let listN=0;
 const style=(el,s)=>{s={...s};const t=el.tagName,st=el.style||{};
  if(t==='B'||t==='STRONG')s.bold=true;if(t==='I'||t==='EM')s.italics=true;if(t==='U')s.underline={};
  const col=hex(el.getAttribute('color')||st.color);if(col)s.color=col;
  const bg=hex(st.backgroundColor);if(bg)s.shading={type:D.ShadingType.CLEAR,fill:bg,color:'auto'};
  const f=(el.getAttribute('face')||st.fontFamily||'').split(',')[0].replace(/["']/g,'').trim();if(f)s.font=f;
  const fs=/([\d.]+)pt/.exec(st.fontSize||'');if(fs)s.size=Math.round(fs[1]*2);
  if(st.fontWeight==='bold'||+st.fontWeight>=600)s.bold=true;if(st.fontStyle==='italic')s.italics=true;
  if((st.textDecoration||'').includes('underline'))s.underline={};return s};
 const img=n=>{const m=/^data:image\/(png|jpeg|jpg|gif|bmp);base64,(.+)$/i.exec(n.getAttribute('src')||'');
  if(!m){warn.push('An image of an unsupported type was skipped.');return[]}
  const data=Uint8Array.from(atob(m[2]),c=>c.charCodeAt(0));let W=n.naturalWidth||n.width||300,H=n.naturalHeight||n.height||200;
  if(W>600){H=H*600/W;W=600}
  return[new D.ImageRun({type:m[1].toLowerCase().replace('jpeg','jpg'),data,transformation:{width:Math.round(W),height:Math.round(H)}})]};
 const runs=(node,s)=>{const out=[];for(const n of node.childNodes){
  if(n.nodeType===3){if(n.nodeValue)out.push(new D.TextRun({text:n.nodeValue.replace(/\n/g,' '),...s}))}
  else if(n.nodeType===1){const t=n.tagName;
   if(t==='BR')out.push(new D.TextRun({break:1}));
   else if(t==='IMG')out.push(...img(n));
   else if(t==='A'&&/^(https?:|mailto:)/i.test(n.getAttribute('href')||''))out.push(new D.ExternalHyperlink({link:n.getAttribute('href'),children:runs(n,{...style(n,s),color:'0563C1',underline:{}})}));
   else if(!/^(UL|OL|TABLE|DIV|P|H[1-6])$/.test(t))out.push(...runs(n,style(n,s)))}}return out};
 const para=(el,extra={})=>{const st=el.style||{};const only=el.childNodes.length===1&&el.firstChild.tagName==='BR';
  const o={children:only?[]:runs(el,{}),...extra};
  const al={center:'CENTER',right:'RIGHT',justify:'JUSTIFIED',left:'LEFT'}[st.textAlign];if(al)o.alignment=D.AlignmentType[al];
  const lh=parseFloat(st.lineHeight);if(lh)o.spacing={line:Math.round(lh*240),lineRule:D.LineRuleType.AUTO};
  const ml=parseFloat(st.marginLeft);if(ml)o.indent={left:Math.round(ml*15)};return new D.Paragraph(o)};
 const table=t=>new D.Table({width:{size:100,type:D.WidthType.PERCENTAGE},rows:[...t.rows].filter(r=>r.cells.length).map(r=>new D.TableRow({children:[...r.cells].map(c=>{const b=blocks(c);
  return new D.TableCell({children:b.length?b:[new D.Paragraph('')],columnSpan:c.colSpan>1?c.colSpan:undefined})})}))});
 const blocks=el=>{const out=[];let loose=[];
  const flush=()=>{if(loose.some(n=>n.nodeType===1||n.nodeValue.trim())){const d=el.ownerDocument.createElement('div');loose.forEach(n=>d.append(n.cloneNode(true)));out.push(para(d))}loose=[]};
  for(const n of el.childNodes){if(n.nodeType!==1){loose.push(n);continue}const t=n.tagName;
   if(/^(P|H[1-6]|UL|OL|TABLE|DIV|BLOCKQUOTE)$/.test(t)){flush();
    if(t==='P')out.push(para(n));
    else if(/^H[1-6]$/.test(t))out.push(para(n,{heading:D.HeadingLevel['HEADING_'+t[1]]}));
    else if(t==='UL'||t==='OL'){const inst=++listN;for(const li of n.children)if(li.tagName==='LI')out.push(para(li,t==='UL'?{bullet:{level:0}}:{numbering:{reference:'ol',level:0,instance:inst}}))}
    else if(t==='TABLE')out.push(table(n));
    else if(n.classList.contains('pb'))out.push(new D.Paragraph({children:[new D.PageBreak()]}));
    else out.push(...blocks(n))}
   else loose.push(n)}
  flush();return out};
 const kids=blocks(root);if(!kids.length||kids[kids.length-1]instanceof D.Table)kids.push(new D.Paragraph(''));
 const sec={properties:{page:{size:data.paper==='Letter'?{width:12240,height:15840}:{width:11906,height:16838},margin:{top:1134,bottom:1134,left:1134,right:1134}}},children:kids};
 if(data.header)sec.headers={default:new D.Header({children:[new D.Paragraph({alignment:D.AlignmentType.CENTER,children:[new D.TextRun(data.header)]})]})};
 if(data.footer||data.pageNumbers){const ch=[];if(data.footer)ch.push(new D.TextRun(data.footer+(data.pageNumbers?'   ':'')));
  if(data.pageNumbers)ch.push(new D.TextRun({children:['Page ',D.PageNumber.CURRENT]}));
  sec.footers={default:new D.Footer({children:[new D.Paragraph({alignment:D.AlignmentType.CENTER,children:ch})]})}}
 return{doc:new D.Document({creator:'EVLab Potato',styles:{default:{document:{run:{font:'Arial',size:24}}}},
  numbering:{config:[{reference:'ol',levels:[{level:0,format:D.LevelFormat.DECIMAL,text:'%1.',alignment:D.AlignmentType.START}]}]},sections:[sec]}),warnings:[...new Set(warn)]}}
export async function exportDocx(root,data,D){const r=buildDocx(root,data,D);return{blob:await D.Packer.toBlob(r.doc),warnings:r.warnings}}
