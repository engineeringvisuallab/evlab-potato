// EVCell charts: pure functions that turn sheet values into an SVG string (no library). Charts redraw whenever source cells change.
const PAL=['#2b6cd9','#1f9d55','#f2724b','#e8b931','#8e44ad','#16a085','#c0392b','#7f8c8d'];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tv=v=>v==null?'':v&&v.err?v.err:String(v),f2=n=>+Number(n).toFixed(2);
export function extractData(ch,val){const c0=ch.c1+(ch.hdrCol?1:0),r0=ch.r1+(ch.hdrRow?1:0),labels=[],series=[];
 for(let r=r0;r<=ch.r2;r++)labels.push(ch.hdrCol?tv(val(ch.c1,r)):String(r-r0+1));
 for(let c=c0;c<=ch.c2;c++){const nm=ch.hdrRow?tv(val(c,ch.r1)):'',values=[];
  for(let r=r0;r<=ch.r2;r++){const v=val(c,r);values.push(typeof v==='number'&&isFinite(v)?v:0)}series.push({name:nm||'Series '+(c-c0+1),values})}
 return{labels,series}}
function nice(lo,hi){if(hi===lo)hi=lo+1;const raw=(hi-lo)/5,p=Math.pow(10,Math.floor(Math.log10(raw))),f=raw/p,st=(f<=1?1:f<=2?2:f<=5?5:10)*p;
 const a=Math.floor(lo/st)*st,b=Math.ceil(hi/st)*st,t=[];for(let v=a;v<=b+st/2;v+=st)t.push(+v.toPrecision(12));return t}
const fmt=n=>Math.abs(n)>=1e6?+(n/1e6).toPrecision(3)+'M':Math.abs(n)>=1e3?+(n/1e3).toPrecision(3)+'k':String(+n.toPrecision(4));
export function chartSvg(ch,d,W,H){
 const open=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(ch.title||'Chart')}" font-family="sans-serif" font-size="11"><rect width="${W}" height="${H}" fill="#fff"/>`;
 const msg=t=>open+`<text x="10" y="24" fill="#555">${t}</text></svg>`;
 if(!d.series.length||!d.labels.length)return msg('Select at least one row and one column of data.');
 if(d.labels.length>500||d.series.length>20)return msg('Too much data for a chart (max 500 categories, 20 series).');
 const n=d.labels.length;let g='';
 if(ch.type==='pie'){const vals=d.series[0].values.map(v=>Math.max(0,v)),sum=vals.reduce((a,b)=>a+b,0);if(!sum)return msg('No positive values to show.');
  const cx=W*.34,cy=H/2,r=Math.max(20,Math.min(W*.3,H/2-10));let ang=-Math.PI/2;
  vals.forEach((v,i)=>{const sh=v/sum,a2=ang+sh*2*Math.PI,col=PAL[i%PAL.length];if(sh>0){
   g+=sh>.9999?`<circle cx="${f2(cx)}" cy="${f2(cy)}" r="${f2(r)}" fill="${col}"/>`:`<path d="M${f2(cx)},${f2(cy)} L${f2(cx+r*Math.cos(ang))},${f2(cy+r*Math.sin(ang))} A${f2(r)},${f2(r)} 0 ${sh>.5?1:0} 1 ${f2(cx+r*Math.cos(a2))},${f2(cy+r*Math.sin(a2))} Z" fill="${col}" stroke="#fff"/>`}
   if(i<14)g+=`<rect x="${f2(W*.68)}" y="${14+i*16}" width="10" height="10" fill="${col}"/><text x="${f2(W*.68+14)}" y="${23+i*16}" fill="#333">${esc(d.labels[i].slice(0,14))} ${(sh*100).toFixed(1)}%</text>`;ang=a2});
  return open+g+'</svg>'}
 const multi=d.series.length>1,bar=ch.type==='bar',L=bar?Math.min(100,14+7*Math.max(...d.labels.map(l=>Math.min(l.length,12)))):46,R=14,T=10,B=(multi?22:4)+22,pw=W-L-R,ph=H-T-B;
 const all=d.series.flatMap(s=>s.values),ticks=nice(Math.min(0,...all),Math.max(0,...all)),lo=ticks[0],hi=ticks[ticks.length-1],step=Math.ceil(n/12);
 if(bar){const X=v=>L+(v-lo)/(hi-lo)*pw,band=ph/n,bw=band*.8/d.series.length;
  ticks.forEach(t=>{g+=`<line x1="${f2(X(t))}" y1="${T}" x2="${f2(X(t))}" y2="${T+ph}" stroke="#ddd"/><text x="${f2(X(t))}" y="${T+ph+13}" text-anchor="middle" fill="#444">${fmt(t)}</text>`});
  d.labels.forEach((lb,i)=>{if(i%step===0)g+=`<text x="${L-4}" y="${f2(T+band*i+band/2+4)}" text-anchor="end" fill="#444">${esc(lb.slice(0,12))}</text>`;
   d.series.forEach((s,k)=>{const v=s.values[i],x0=X(Math.min(0,v)),x1=X(Math.max(0,v));g+=`<rect x="${f2(x0)}" y="${f2(T+band*i+band*.1+bw*k)}" width="${f2(x1-x0)}" height="${f2(bw)}" fill="${PAL[k%8]}"/>`})})}
 else{const Y=v=>T+ph-(v-lo)/(hi-lo)*ph,band=pw/n,X=i=>L+band*i+band/2;
  ticks.forEach(t=>{g+=`<line x1="${L}" y1="${f2(Y(t))}" x2="${L+pw}" y2="${f2(Y(t))}" stroke="${t===0?'#666':'#ddd'}"/><text x="${L-5}" y="${f2(Y(t)+4)}" text-anchor="end" fill="#444">${fmt(t)}</text>`});
  d.labels.forEach((lb,i)=>{if(i%step===0)g+=`<text x="${f2(X(i))}" y="${T+ph+14}" text-anchor="middle" fill="#444">${esc(lb.slice(0,10))}</text>`});
  d.series.forEach((s,k)=>{const col=PAL[k%8];
   if(ch.type==='column'){const bw=band*.8/d.series.length;s.values.forEach((v,i)=>{const y0=Y(Math.max(0,v)),y1=Y(Math.min(0,v));g+=`<rect x="${f2(L+band*i+band*.1+bw*k)}" y="${f2(y0)}" width="${f2(bw)}" height="${f2(y1-y0)}" fill="${col}"/>`})}
   else{const pts=s.values.map((v,i)=>f2(X(i))+','+f2(Y(v))).join(' ');
    if(ch.type==='area')g+=`<polygon points="${f2(X(0))},${f2(Y(0))} ${pts} ${f2(X(n-1))},${f2(Y(0))}" fill="${col}" fill-opacity=".3"/>`;
    g+=`<polyline points="${pts}" fill="none" stroke="${col}" stroke-width="2"/>`;if(n<=40)s.values.forEach((v,i)=>{g+=`<circle cx="${f2(X(i))}" cy="${f2(Y(v))}" r="3" fill="${col}"/>`})}})}
 if(multi){let x=L;d.series.forEach((s,k)=>{g+=`<rect x="${x}" y="${H-16}" width="10" height="10" fill="${PAL[k%8]}"/><text x="${x+14}" y="${H-7}" fill="#333">${esc(s.name.slice(0,14))}</text>`;x+=24+Math.min(s.name.length,14)*6.5})}
 return open+g+'</svg>'}
