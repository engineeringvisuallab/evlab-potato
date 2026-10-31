// XLSX import/export for EVCell. Library: ExcelJS (MIT), bundled in src/vendor/ and loaded on demand.
import {createEngine,colName,colIdx,parseRef} from './formulas.js';
import {importCsvFile} from './import-export.js';
export async function lib(){if(window.ExcelJS)return window.ExcelJS;
 await new Promise((res,rej)=>{const s=document.createElement('script');s.src='src/vendor/exceljs.min.js';s.onload=res;s.onerror=()=>rej(new Error('Could not load src/vendor/exceljs.min.js'));document.head.append(s)});return window.ExcelJS}
const okc=c=>/^#[0-9a-f]{6}$/i.test(c||''),argb=c=>'FF'+c.slice(1).toUpperCase(),fromArgb=a=>typeof a==='string'&&/^[0-9a-f]{8}$/i.test(a)?'#'+a.slice(2).toLowerCase():undefined;
const NF={n0:'#,##0',n2:'#,##0.00',cur:'"BDT" #,##0.00',pct:'0.00%',date:'yyyy-mm-dd'},ERRS=['#N/A','#REF!','#NAME?','#DIV/0!','#VALUE!'];
const nfBack=f=>{if(!f||f==='General')return;if(f.includes('%'))return'pct';if(/[$€£৳]|BDT/i.test(f))return'cur';
 if(/[ymd]/i.test(f.replace(/"[^"]*"|\[[^\]]*\]|\\./g,'')))return'date';if(/^#,##0\.0+$|^0\.0+$/.test(f))return'n2';if(/^#,##0$|^0$/.test(f))return'n0'};
const rtxt=m=>colName(m.c1)+(m.r1+1)+':'+colName(m.c2)+(m.r2+1);
const parseRange=s=>{const[p,q]=String(s).split(':').map(parseRef);return p&&(q||!String(s).includes(':'))?{c1:p.c,r1:p.r,c2:(q||p).c,r2:(q||p).r}:null};
export async function exportXlsx(data,X){const wb=new X.Workbook(),warn=new Set(),used=new Set();wb.creator='EVLab Potato';
 for(const sh of data.sheets){let nm=(sh.name||'Sheet').replace(/[\[\]:*?\/\\]/g,'_').slice(0,31)||'Sheet';const b=nm;let k=2;while(used.has(nm.toLowerCase()))nm=b.slice(0,28)+' '+k++;used.add(nm.toLowerCase());
  const ws=wb.addWorksheet(nm),eng=createEngine((c,r)=>sh.cells[colName(c)+(r+1)]),G=(c,r)=>ws.getCell(r+1,c+1);
  for(const key in sh.cells){const m=/^([A-Z]+)(\d+)$/.exec(key);if(!m)continue;const c=colIdx(m[1]),r=+m[2]-1,raw=sh.cells[key];
   if(typeof raw==='string'&&raw[0]==='='){const v=eng.value(c,r);
    if(v&&v.err==='#ERROR'){G(c,r).value=raw;warn.add('Formulas with syntax errors were exported as plain text.')}
    else G(c,r).value={formula:raw.slice(1),result:v&&v.err?{error:ERRS.includes(v.err)?v.err:'#VALUE!'}:v==null?'':v}}
   else G(c,r).value=raw}
  for(const key in sh.fmt||{}){const m=/^([A-Z]+)(\d+)$/.exec(key);if(!m)continue;const f=sh.fmt[key],cell=G(colIdx(m[1]),+m[2]-1);
   if(f.b||f.i||okc(f.fg))cell.font={bold:!!f.b,italic:!!f.i,...(okc(f.fg)?{color:{argb:argb(f.fg)}}:{})};
   if(okc(f.bg))cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:argb(f.bg)}};
   if(['left','center','right'].includes(f.al))cell.alignment={horizontal:f.al};
   if(f.bd)cell.border={top:{style:'thin'},left:{style:'thin'},bottom:{style:'thin'},right:{style:'thin'}};
   if(f.nf&&NF[f.nf])cell.numFmt=NF[f.nf]}
  for(const c in sh.colW||{})ws.getColumn(+c+1).width=Math.max(2,sh.colW[c]/7);
  for(const r in sh.rowH||{})ws.getRow(+r+1).height=sh.rowH[r]*.75;
  for(const m of sh.merges||[])ws.mergeCells(m.r1+1,m.c1+1,m.r2+1,m.c2+1);
  if(sh.freeze&&(sh.freeze.r||sh.freeze.c))ws.views=[{state:'frozen',xSplit:sh.freeze.c?1:0,ySplit:sh.freeze.r?1:0}];
  if(sh.filter){let C=0,R=0;for(const key in sh.cells){const m=/^([A-Z]+)(\d+)$/.exec(key);if(m){C=Math.max(C,colIdx(m[1]));R=Math.max(R,+m[2]-1)}}
   ws.autoFilter={from:{row:sh.filter.r+1,column:1},to:{row:Math.max(R,sh.filter.r+1)+1,column:C+1}};warn.add('Filter buttons were exported, but the rows hidden by value filters are not.')}
  for(const m of sh.dv||[]){const items=(m.list||'').split(',').map(t=>t.trim()).filter(Boolean);let rule;
   if(m.type==='list'){const s='"'+items.join(',')+'"';if(s.length>255){warn.add('A dropdown list longer than 255 characters was not exported.');continue}rule={type:'list',formulae:[s]}}
   else{const hasMin=m.min!==''&&m.min!=null,hasMax=m.max!==''&&m.max!=null;rule={type:m.type==='length'?'textLength':m.type,operator:hasMin&&hasMax?'between':hasMin?'greaterThanOrEqual':'lessThanOrEqual',formulae:hasMin&&hasMax?[+m.min,+m.max]:[hasMin?+m.min:+m.max]}}
   Object.assign(rule,{allowBlank:true,showErrorMessage:true,errorStyle:m.mode==='warn'?'warning':'stop',error:m.msg||undefined});
   if((m.c2-m.c1+1)*(m.r2-m.r1+1)>10000){warn.add('A validation rule covering more than 10,000 cells was not exported.');continue}
   for(let r=m.r1;r<=m.r2;r++)for(let c=m.c1;c<=m.c2;c++)G(c,r).dataValidation={...rule}}
  for(const m of sh.cf||[]){const st={};if(okc(m.fg))st.font={color:{argb:argb(m.fg)}};if(okc(m.bg))st.fill={type:'pattern',pattern:'solid',bgColor:{argb:argb(m.bg)}};
   const OP={gt:'greaterThan',lt:'lessThan',eq:'equal',ne:'notEqual',between:'between'},num=m.v1!==''&&isFinite(m.v1);let rule;
   if(OP[m.op]&&(m.op==='eq'||m.op==='ne'||num))rule={type:'cellIs',operator:OP[m.op],formulae:m.op==='between'?[+m.v1,+m.v2]:[num?+m.v1:'"'+String(m.v1).replace(/"/g,'""')+'"'],style:st};
   else if(m.op==='contains')rule={type:'containsText',operator:'containsText',text:m.v1,formulae:[`NOT(ISERROR(SEARCH("${String(m.v1).replace(/"/g,'""')}",${colName(m.c1)}${m.r1+1})))`],style:st};
   else{warn.add('Blank / non-blank conditional formatting rules were not exported.');continue}
   ws.addConditionalFormatting({ref:rtxt(m),rules:[rule]})}
  if((sh.charts||[]).length)warn.add('Charts are not exported to XLSX (they stay in the EVLab file).')}
 return{buffer:await wb.xlsx.writeBuffer(),warnings:[...warn]}}
export async function importXlsx(buf,X){const wb=new X.Workbook();await wb.xlsx.load(buf);const warn=new Set(['Charts, images, pivot tables, macros and comments in Excel files are not imported.']),sheets=[];let shared=0;
 wb.eachSheet(ws=>{if(sheets.length>=50){warn.add('Only the first 50 sheets were imported.');return}
  const sh={name:ws.name.slice(0,31),cells:{},fmt:{},colW:{},rowH:{},merges:[],freeze:{},cf:[],dv:[],charts:[]},dvs=new Map();
  ws.eachRow({includeEmpty:false},(row,r)=>{if(r>100000){warn.add('Rows beyond 100,000 were skipped.');return}
   if(row.height&&Math.abs(row.height/.75-24)>1)sh.rowH[r-1]=Math.round(row.height/.75);
   row.eachCell({includeEmpty:true},(cell,c)=>{if(c>702){warn.add('Columns beyond 702 (ZZ) were skipped.');return}const key=colName(c-1)+r;let v=cell.value,isNum=false;
    if(v&&typeof v==='object'){
     if(v instanceof Date){v=(v-Date.UTC(1899,11,30))/864e5;isNum='date'}
     else if('formula' in v&&v.formula!==undefined){v='='+v.formula;isNum=true}
     else if('sharedFormula' in v){shared++;v=['number','string','boolean'].includes(typeof v.result)?v.result:null}
     else if(v.richText)v=v.richText.map(t=>t.text).join('');
     else if(v.hyperlink!==undefined)v=String(v.text&&v.text.richText?v.text.richText.map(t=>t.text).join(''):v.text!=null?v.text:v.hyperlink);
     else if(v.error){warn.add('Error values were imported as text.');v=String(v.error)}else v=String(v)}
    if(typeof v==='number')isNum=isNum||true;
    if(v!==null&&v!==undefined&&v!=='')sh.cells[key]=v;
    const f={},fo=cell.font,fi=cell.fill,al=cell.alignment&&cell.alignment.horizontal,bd=cell.border;
    if(fo){if(fo.bold)f.b=true;if(fo.italic)f.i=true;const fg=fromArgb(fo.color&&fo.color.argb);if(fg&&fg!=='#000000')f.fg=fg}
    if(fi&&fi.type==='pattern'&&fi.pattern==='solid'){const bg=fromArgb(fi.fgColor&&fi.fgColor.argb);if(bg)f.bg=bg}
    if(['left','center','right'].includes(al))f.al=al;if(bd&&(bd.top||bd.left||bd.bottom||bd.right))f.bd=true;
    const nf=isNum==='date'?'date':isNum?nfBack(cell.numFmt):undefined;if(nf)f.nf=nf;
    if(Object.keys(f).length)sh.fmt[key]=f;
    const dv=cell.dataValidation;if(dv&&dv.type){const j=JSON.stringify([dv.type,dv.operator,dv.formulae,dv.errorStyle,dv.error]);if(!dvs.has(j))dvs.set(j,{dv,cells:[]});dvs.get(j).cells.push({c:c-1,r:r-1})}})});
  (ws.columns||[]).forEach((col,i)=>{if(col&&col.width&&Math.abs(col.width*7-96)>6)sh.colW[i]=Math.round(col.width*7)});
  for(const s of (ws.model&&ws.model.merges)||[]){const m=parseRange(s);if(m&&(m.c2-m.c1+1)*(m.r2-m.r1+1)<=10000)sh.merges.push(m)}
  const vw=(ws.views||[])[0];if(vw&&vw.state==='frozen'){if(vw.ySplit>=1)sh.freeze.r=1;if(vw.xSplit>=1)sh.freeze.c=1;if(vw.ySplit>1||vw.xSplit>1)warn.add('Freeze panes were limited to the first row/column.')}
  let skippedDv=0;for(const{dv,cells}of dvs.values()){const f=dv.formulae||[];let rule=null;
   if(dv.type==='list'&&typeof f[0]==='string'&&/^".*"$/.test(f[0]))rule={type:'list',list:f[0].slice(1,-1),min:'',max:''};
   else if(['whole','decimal','textLength'].includes(dv.type)&&['between','greaterThanOrEqual','lessThanOrEqual'].includes(dv.operator)&&f.every(x=>isFinite(x))){
    rule={type:dv.type==='textLength'?'length':dv.type,list:'',min:dv.operator==='lessThanOrEqual'?'':String(f[0]),max:dv.operator==='between'?String(f[1]):dv.operator==='lessThanOrEqual'?String(f[0]):''}}
   if(!rule){skippedDv++;continue}Object.assign(rule,{mode:dv.errorStyle==='warning'||dv.errorStyle==='information'?'warn':'stop',msg:dv.error||''});
   const c1=Math.min(...cells.map(x=>x.c)),c2=Math.max(...cells.map(x=>x.c)),r1=Math.min(...cells.map(x=>x.r)),r2=Math.max(...cells.map(x=>x.r));
   if(cells.length===(c2-c1+1)*(r2-r1+1))sh.dv.push({...rule,c1,c2,r1,r2});else if(cells.length<=500)cells.forEach(x=>sh.dv.push({...rule,c1:x.c,c2:x.c,r1:x.r,r2:x.r}));else skippedDv++}
  if(skippedDv)warn.add(skippedDv+' data validation rule(s) (formulas, ranges or unsupported operators) were not imported.');
  let skippedCf=0;for(const cfo of ws.conditionalFormattings||[])for(const rl of cfo.rules||[]){const st=rl.style||{},bg=fromArgb(st.fill&&(st.fill.bgColor&&st.fill.bgColor.argb||st.fill.fgColor&&st.fill.fgColor.argb)),fg=fromArgb(st.font&&st.font.color&&st.font.color.argb),f=rl.formulae||[];let op=null,v1='',v2='';
   const MAP={greaterThan:'gt',lessThan:'lt',equal:'eq',notEqual:'ne',between:'between'};
   const nz=x=>typeof x==='number'||(typeof x==='string'&&x.trim()!==''&&isFinite(x)),qs=x=>typeof x==='string'&&/^"[^"]*"$/.test(x);
   if(rl.type==='cellIs'&&MAP[rl.operator]&&f.length&&f.every(x=>nz(x)||qs(x))&&(rl.operator==='equal'||rl.operator==='notEqual'||(f.every(nz)&&(rl.operator!=='between'||f.length===2)))){
    op=MAP[rl.operator];v1=qs(f[0])?f[0].slice(1,-1):String(f[0]);v2=f[1]!==undefined?String(f[1]):''}
   else if(rl.type==='containsText'){const mm=rl.text||(/SEARCH\("((?:[^"]|"")*)",/.exec(String(f[0]||''))||[])[1];if(mm){op='contains';v1=String(mm).replace(/""/g,'"')}}
   if(!op){skippedCf++;continue}
   for(const ref of String(cfo.ref).split(' ')){const m=parseRange(ref);if(m)sh.cf.push({...m,op,v1,v2,bg:bg||'',fg:fg||''})}}
  if(skippedCf)warn.add(skippedCf+' conditional formatting rule(s) (colour scales, icon sets, formulas) were not imported.');
  sheets.push(sh)});
 if(shared)warn.add(shared+' shared-formula cells were imported as plain values.');
 if(!sheets.length)sheets.push({name:'Sheet1',cells:{},fmt:{},colW:{},rowH:{},merges:[],freeze:{},cf:[],dv:[],charts:[]});
 return{sheets,warnings:[...warn]}}
export async function importSpreadsheet(f,FM){
 if(/\.csv$/i.test(f.name)){const file=await importCsvFile(f,FM);return{file,warnings:[]}}
 if(/\.xls$/i.test(f.name))throw new Error('Old .xls files are not supported. Save the file as .xlsx or .csv in Excel first.');
 if(!/\.xlsx$/i.test(f.name))throw new Error('Only .csv and .xlsx files are supported.');
 if(f.size>10*1048576)throw new Error('File is larger than 10 MB.');
 const r=await importXlsx(await f.arrayBuffer(),await lib());
 const file=await FM.create({app:'evcell',name:f.name.replace(/\.xlsx$/i,''),data:{sheets:r.sheets}});return{file,warnings:r.warnings}}
