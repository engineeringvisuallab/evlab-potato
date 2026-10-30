import * as S from './storage.js';
const uid=()=>crypto.randomUUID();
export async function create({app,name,template=null,data={}}){
 const now=Date.now();const f={id:uid(),name,app,created:now,modified:now,template,version:1,data};
 await S.putFile(f);return f;}
export const open=S.getFile;
export async function list({q='',app='all',sort='modified'}={}){
 let a=await S.getAllFiles();q=q.toLowerCase();
 a=a.filter(f=>(app==='all'||f.app===app)&&f.name.toLowerCase().includes(q));
 return a.sort((x,y)=>sort==='name'?x.name.localeCompare(y.name):y[sort]-x[sort]);}
export async function save(f){f.modified=Date.now();await S.putFile(f);return f;}
export async function rename(id,name){const f=await S.getFile(id);f.name=name;return save(f);}
export async function duplicate(id){const f=await S.getFile(id);
 return create({app:f.app,name:f.name+' (copy)',template:f.template,data:structuredClone(f.data)});}
export const remove=S.deleteFile;
export function download(f){const b=new Blob([JSON.stringify(f,null,2)],{type:'application/json'});
 const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=f.name.replace(/[^\w\- ]+/g,'_')+'.evpotato.json';a.click();URL.revokeObjectURL(a.href);}
export async function backupAll(){const all=await S.getAllFiles();
 download({name:'EVLab-Potato-backup',backup:true,files:all});}
