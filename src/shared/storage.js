// IndexedDB wrapper. A future cloud backend can replace this module with the same functions.
const DB='evlab-potato',STORE='files';
function open(){return new Promise((res,rej)=>{const r=indexedDB.open(DB,1);
 r.onupgradeneeded=()=>r.result.createObjectStore(STORE,{keyPath:'id'});
 r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});}
async function tx(mode,fn){const db=await open();return new Promise((res,rej)=>{
 const t=db.transaction(STORE,mode);const req=fn(t.objectStore(STORE));
 t.oncomplete=()=>res(req&&req.result);t.onerror=()=>rej(t.error);t.onabort=()=>rej(t.error);});}
export const putFile=f=>tx('readwrite',s=>s.put(f));
export const getFile=id=>tx('readonly',s=>s.get(id));
export const getAllFiles=()=>tx('readonly',s=>s.getAll());
export const deleteFile=id=>tx('readwrite',s=>s.delete(id));
export async function usage(){return navigator.storage&&navigator.storage.estimate?await navigator.storage.estimate():null;}
