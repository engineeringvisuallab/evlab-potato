// EVCell formula engine (own implementation, no external library). Unsupported functions/syntax produce a visible error, never a made-up value.
export const colName=i=>{let s='';for(i++;i>0;i=Math.floor((i-1)/26))s=String.fromCharCode(65+(i-1)%26)+s;return s};
export const colIdx=s=>{let n=0;for(const ch of s)n=n*26+ch.charCodeAt(0)-64;return n-1};
export const parseRef=s=>{const m=/^\$?([A-Z]{1,3})\$?(\d+)$/.exec(String(s).trim().toUpperCase());return m?{c:colIdx(m[1]),r:+m[2]-1}:null};
export const MAXC=702,MAXR=100000;
class FErr extends Error{constructor(code,msg){super(msg||code);this.code=code}}
const E=(code,msg)=>new FErr(code,msg);
function tokenize(src){const t=[];let i=0;
 while(i<src.length){const ch=src[i],rest=src.slice(i);let m;
  if(/\s/.test(ch)){i++;continue}
  if(rest.startsWith('#REF!'))throw E('#REF!','A referenced row or column was deleted');
  if(m=/^(\d*\.?\d+)(?:[eE][+-]?\d+)?/.exec(rest)){t.push({k:'num',v:parseFloat(m[0])});i+=m[0].length;continue}
  if(ch==='"'){let j=i+1,s='';while(j<src.length){if(src[j]==='"'){if(src[j+1]==='"'){s+='"';j+=2;continue}break}s+=src[j++]}
   if(j>=src.length)throw E('#ERROR','Text in quotes is not closed');t.push({k:'str',v:s});i=j+1;continue}
  if(m=/^\$?[A-Za-z]{1,3}\$?\d+(?::\$?[A-Za-z]{1,3}\$?\d+)?(?![A-Za-z0-9_(!])/.exec(rest)){t.push({k:'ref',v:m[0]});i+=m[0].length;continue}
  if(m=/^[A-Za-z_][A-Za-z0-9_.]*/.exec(rest)){const nx=src[i+m[0].length],u=m[0].toUpperCase();
   if(nx==='(')t.push({k:'fn',v:u});else if(u==='TRUE'||u==='FALSE')t.push({k:'bool',v:u==='TRUE'});
   else if(nx==='!')throw E('#NAME?','References to other sheets are not supported yet');else throw E('#NAME?','Unknown name "'+m[0]+'"');
   i+=m[0].length;continue}
  m=/^(<=|>=|<>|[-+*\/^&=<>%(),])/.exec(rest);if(!m)throw E('#ERROR','Unexpected character "'+ch+'"');
  t.push({k:'op',v:m[0]});i+=m[0].length}
 return t}
function parse(tk){let p=0;const peek=()=>tk[p],next=()=>tk[p++],isOp=v=>peek()&&peek().k==='op'&&peek().v===v;
 const cmp=()=>{let a=cat();while(peek()&&peek().k==='op'&&['=','<>','<','>','<=','>='].includes(peek().v)){const o=next().v;a={t:'bin',o,a,b:cat()}}return a};
 const cat=()=>{let a=add();while(isOp('&')){next();a={t:'bin',o:'&',a,b:add()}}return a};
 const add=()=>{let a=mul();while(isOp('+')||isOp('-')){const o=next().v;a={t:'bin',o,a,b:mul()}}return a};
 const mul=()=>{let a=pow();while(isOp('*')||isOp('/')){const o=next().v;a={t:'bin',o,a,b:pow()}}return a};
 const pow=()=>{let a=un();while(isOp('^')){next();a={t:'bin',o:'^',a,b:un()}}return a};
 const un=()=>{if(isOp('-')){next();return{t:'neg',a:un()}}if(isOp('+')){next();return un()}return pct()};
 const pct=()=>{let a=prim();while(isOp('%')){next();a={t:'pct',a}}return a};
 const prim=()=>{const k=next();if(!k)throw E('#ERROR','The formula ends too early');
  if(k.k==='num'||k.k==='str'||k.k==='bool')return{t:'lit',v:k.v};if(k.k==='ref')return{t:'ref',v:k.v};
  if(k.k==='fn'){next();const args=[];if(!isOp(')')){for(;;){args.push(cmp());if(isOp(',')){next();continue}break}}
   if(!isOp(')'))throw E('#ERROR','Missing ")"');next();return{t:'fn',n:k.v,args}}
  if(k.k==='op'&&k.v==='('){const x=cmp();if(!isOp(')'))throw E('#ERROR','Missing ")"');next();return x}
  throw E('#ERROR','Unexpected "'+k.v+'"')};
 const x=cmp();if(p<tk.length)throw E('#ERROR','Unexpected "'+tk[p].v+'"');return x}
const isRng=v=>v&&typeof v==='object'&&v.rng;
const eq=(a,b)=>typeof a==='string'&&typeof b==='string'?a.toLowerCase()===b.toLowerCase():(a==null?0:a)===(b==null?0:b)||(a==null&&b==='')||(b==null&&a==='');
const lt=(a,b)=>typeof a==='string'&&typeof b==='string'?a.toLowerCase()<b.toLowerCase():(a==null?0:+a)<(b==null?0:+b);
function matcher(cr){if(typeof cr==='number')return v=>typeof v==='number'&&v===cr;cr=String(cr);
 const m=/^(<=|>=|<>|=|<|>)?(.*)$/s.exec(cr),op=m[1]||'=',x=m[2],n=x.trim()!==''&&isFinite(x)?+x:null;
 const wild=/[*?]/.test(x)?new RegExp('^'+x.replace(/[.+^${}()|[\]\\]/g,'\\$&').replace(/\*/g,'.*').replace(/\?/g,'.')+'$','i'):null;
 return v=>{if(n!==null){if(typeof v!=='number')return op==='<>';return op==='='?v===n:op==='<>'?v!==n:op==='<'?v<n:op==='>'?v>n:op==='<='?v<=n:v>=n}
  const s=v==null?'':String(v);if(op==='=')return wild?wild.test(s):s.toLowerCase()===x.toLowerCase();if(op==='<>')return wild?!wild.test(s):s.toLowerCase()!==x.toLowerCase();
  return typeof v==='string'&&(op==='<'?s<x:op==='>'?s>x:op==='<='?s<=x:s>=x)}}
export function createEngine(getRaw){
 const cache=new Map(),stack=new Set();
 const num=v=>{if(v==null)return 0;if(typeof v==='number')return v;if(typeof v==='boolean')return +v;
  if(typeof v==='string'&&v.trim()!==''&&isFinite(v))return +v;throw E('#VALUE!','"'+v+'" is not a number')};
 const truth=v=>{if(typeof v==='boolean')return v;if(typeof v==='number')return v!==0;if(v==null)return false;
  if(/^true$/i.test(v))return true;if(/^false$/i.test(v))return false;throw E('#VALUE!','"'+v+'" is not TRUE or FALSE')};
 const cellVal=(c,r)=>{if(c<0||r<0||c>=MAXC||r>=MAXR)throw E('#REF!','Reference is outside the sheet');const k=c+','+r;
  if(cache.has(k)){const v=cache.get(k);if(v&&v.err)throw E(v.err,v.msg);return v}
  if(stack.has(k))throw E('#CIRC!','Circular reference');stack.add(k);let v;
  try{v=compute(getRaw(c,r))}catch(x){if(!(x instanceof FErr))throw x;v={err:x.code,msg:x.message}}finally{stack.delete(k)}
  cache.set(k,v);if(v&&v.err)throw E(v.err,v.msg);return v};
 const soft=(c,r)=>{try{return cellVal(c,r)}catch(x){if(x instanceof FErr)return{err:x.code,msg:x.message};throw x}};
 const range=s=>{const[p,q]=s.split(':').map(parseRef);if(!p||!q)throw E('#REF!','Invalid reference '+s);
  const c1=Math.min(p.c,q.c),c2=Math.max(p.c,q.c),r1=Math.min(p.r,q.r),r2=Math.max(p.r,q.r);
  if((c2-c1+1)*(r2-r1+1)>1e6)throw E('#VALUE!','Range is too large');const rows=[];
  for(let r=r1;r<=r2;r++){const row=[];for(let c=c1;c<=c2;c++)row.push(soft(c,r));rows.push(row)}return{rng:rows}};
 const flat=a=>a.flatMap(x=>isRng(x)?x.rng.flat():[x]);
 const nums=a=>{const o=[];for(const x of a){if(isRng(x)){for(const v of x.rng.flat()){if(v&&v.err)throw E(v.err,v.msg);if(typeof v==='number')o.push(v)}}else o.push(num(x))}return o};
 const one=v=>{if(isRng(v))throw E('#VALUE!','A range was used where a single value is needed');return v};
 const tbl=v=>{if(!isRng(v))throw E('#VALUE!','A range is required');return v.rng};
 const F={SUM:[1,255,a=>nums(a).reduce((s,x)=>s+x,0)],
  AVERAGE:[1,255,a=>{const n=nums(a);if(!n.length)throw E('#DIV/0!','No numbers to average');return n.reduce((s,x)=>s+x,0)/n.length}],
  MIN:[1,255,a=>{const n=nums(a);return n.length?Math.min(...n):0}],MAX:[1,255,a=>{const n=nums(a);return n.length?Math.max(...n):0}],
  COUNT:[1,255,a=>{let n=0;for(const x of a){if(isRng(x))n+=x.rng.flat().filter(v=>typeof v==='number').length;else if(typeof x==='number'||(typeof x==='string'&&x.trim()!==''&&isFinite(x)))n++}return n}],
  COUNTA:[1,255,a=>flat(a).filter(v=>v!=null&&v!=='').length],
  ROUND:[1,2,a=>{const x=num(one(a[0])),d=a[1]===undefined?0:Math.trunc(num(one(a[1]))),f=Math.pow(10,d);return Math.sign(x)*Math.round(+(Math.abs(x)*f).toPrecision(15))/f}],
  ABS:[1,1,a=>Math.abs(num(one(a[0])))],NOT:[1,1,a=>!truth(one(a[0]))],
  AND:[1,255,a=>flat(a).filter(v=>v!=null&&v!=='').every(truth)],OR:[1,255,a=>flat(a).filter(v=>v!=null&&v!=='').some(truth)],
  SUMIF:[2,3,a=>{const r=tbl(a[0]).flat(),m=matcher(one(a[1])),s=a[2]?tbl(a[2]).flat():r;let t=0;r.forEach((v,i)=>{if(m(v)){const x=s[i];if(x&&x.err)throw E(x.err,x.msg);if(typeof x==='number')t+=x}});return t}],
  COUNTIF:[2,2,a=>{const m=matcher(one(a[1]));return tbl(a[0]).flat().filter(m).length}],
  VLOOKUP:[3,4,a=>{const k=one(a[0]),t=tbl(a[1]),ci=Math.trunc(num(one(a[2])));if(ci<1||ci>t[0].length)throw E('#REF!','Column index is outside the table');
   const ap=a[3]===undefined?true:truth(one(a[3]));let hit=-1;
   if(!ap){hit=t.findIndex(r=>eq(r[0],k))}else{t.forEach((r,i)=>{if(r[0]!=null&&!lt(k,r[0]))hit=i})}
   if(hit<0)throw E('#N/A','Value not found');const v=t[hit][ci-1];if(v&&v.err)throw E(v.err,v.msg);return v}],
  INDEX:[2,3,a=>{const t=tbl(a[0]),r=Math.trunc(num(one(a[1]))),c=a[2]===undefined?1:Math.trunc(num(one(a[2])));
   if(r<1||c<1||r>t.length||c>t[0].length)throw E('#REF!','INDEX position is outside the range');const v=t[r-1][c-1];if(v&&v.err)throw E(v.err,v.msg);return v}],
  MATCH:[2,3,a=>{const k=one(a[0]),l=tbl(a[1]).flat(),ty=a[2]===undefined?1:num(one(a[2]));let hit=-1;
   if(ty===0)hit=l.findIndex(v=>eq(v,k));else if(ty>0)l.forEach((v,i)=>{if(v!=null&&!lt(k,v))hit=i});else l.forEach((v,i)=>{if(v!=null&&!lt(v,k)&&hit<0)hit=i});
   if(hit<0)throw E('#N/A','Value not found');return hit+1}]};
 function ev(n){switch(n.t){
  case'lit':return n.v;
  case'ref':return n.v.includes(':')?range(n.v):(()=>{const p=parseRef(n.v);if(!p)throw E('#REF!','Invalid reference '+n.v);return cellVal(p.c,p.r)})();
  case'neg':return-num(one(ev(n.a)));case'pct':return num(one(ev(n.a)))/100;
  case'bin':{const a=one(ev(n.a)),b=one(ev(n.b));
   switch(n.o){case'+':return num(a)+num(b);case'-':return num(a)-num(b);case'*':return num(a)*num(b);
    case'/':{const d=num(b);if(d===0)throw E('#DIV/0!','Division by zero');return num(a)/d}
    case'^':{const x=Math.pow(num(a),num(b));if(!isFinite(x))throw E('#VALUE!','Result is not a valid number');return x}
    case'&':return(a==null?'':String(a))+(b==null?'':String(b));
    case'=':return eq(a,b);case'<>':return!eq(a,b);case'<':return lt(a,b);case'>':return lt(b,a);
    case'<=':return lt(a,b)||eq(a,b);case'>=':return lt(b,a)||eq(a,b)}}
  case'fn':{
   if(n.n==='IF'){if(n.args.length<2||n.args.length>3)throw E('#ERROR','IF needs 2 or 3 arguments');
    return truth(one(ev(n.args[0])))?one(ev(n.args[1])):n.args[2]?one(ev(n.args[2])):false}
   if(n.n==='IFERROR'){if(n.args.length!==2)throw E('#ERROR','IFERROR needs 2 arguments');try{return one(ev(n.args[0]))}catch(x){if(x instanceof FErr)return one(ev(n.args[1]));throw x}}
   const f=F[n.n];if(!f)throw E('#NAME?','Unsupported function '+n.n);
   if(n.args.length<f[0]||n.args.length>f[1])throw E('#ERROR',n.n+' needs '+(f[0]===f[1]?f[0]:f[0]+' to '+f[1])+' argument(s)');
   return f[2](n.args.map(ev))}}}
 function compute(raw){if(raw==null||raw==='')return null;if(typeof raw!=='string')return raw;if(raw[0]!=='=')return raw;
  const v=ev(parse(tokenize(raw.slice(1))));if(isRng(v))throw E('#VALUE!','A range cannot be shown in one cell');return v===undefined?null:v}
 return{value:soft,invalidate:()=>cache.clear()}}
export function shiftRefs(f,axis,at,delta){if(typeof f!=='string'||f[0]!=='=')return f;
 return f.split(/("[^"]*")/).map((part,i)=>i%2?part:part.replace(/(?<![A-Za-z0-9_$.!])(\$?)([A-Za-z]{1,3})(\$?)(\d+)(?![A-Za-z0-9_(])/g,(m,d1,col,d2,row)=>{
  let c=colIdx(col.toUpperCase()),r=+row-1,v=axis==='r'?r:c;
  if(delta>0){if(v>=at)v+=delta}else{if(v===at)return'#REF!';if(v>at)v+=delta}
  if(axis==='r')r=v;else c=v;return d1+colName(c)+d2+(r+1)})).join('')}
export function remapSameRow(f,from,to){if(typeof f!=='string'||f[0]!=='='||from===to)return f;
 return f.split(/("[^"]*")/).map((p,i)=>i%2?p:p.replace(/(?<![:A-Za-z0-9_$.!])(\$?)([A-Za-z]{1,3})(\$?)(\d+)(?![:A-Za-z0-9_(])/g,(m,d1,col,d2,row)=>d2==='$'||+row-1!==from?m:d1+col+d2+(to+1))).join('')}
