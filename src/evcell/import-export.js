import {colName} from './formulas.js';
export function parseCsv(text){text=text.replace(/^\uFEFF/,'');const rows=[];let row=[],f='',q=false;
 for(let i=0;i<text.length;i++){const ch=text[i];
  if(q){if(ch==='"'){if(text[i+1]==='"'){f+='"';i++}else q=false}else f+=ch}
  else if(ch==='"'&&f==='')q=true;else if(ch===','){row.push(f);f=''}
  else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(f);rows.push(row);row=[];f=''}
  else f+=ch}
 if(f!==''||row.length){row.push(f);rows.push(row)}return rows}
export const toCsv=rows=>rows.map(r=>r.map(v=>{v=v==null?'':String(v);return /[",\r\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v}).join(',')).join('\r\n');
export function rowsToCells(rows){const cells={};rows.forEach((r,i)=>r.forEach((v,j)=>{if(v==='')return;cells[colName(j)+(i+1)]=/^-?(\d+\.?\d*|\.\d+)$/.test(v.trim())?Number(v):v}));return cells}
export async function importCsvFile(f,FM){
 if(!/\.csv$/i.test(f.name))throw new Error('Only .csv files can be opened here (XLSX comes in a later step).');
 if(f.size>5*1048576)throw new Error('File is larger than 5 MB.');
 const rows=parseCsv(await f.text());
 if(rows.length>100000||Math.max(0,...rows.map(r=>r.length))>702)throw new Error('The CSV is larger than the supported 100,000 rows x 702 columns.');
 return FM.create({app:'evcell',name:f.name.replace(/\.csv$/i,''),data:{sheets:[{name:'Sheet1',cells:rowsToCells(rows),fmt:{},colW:{}}]}})}
