const $=id=>document.getElementById(id);
const num=new Intl.NumberFormat('en-US');
const usd=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2});
const short=new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',timeZone:'UTC'});
const dt=new Intl.DateTimeFormat('en-US',{dateStyle:'medium',timeStyle:'short',timeZone:'UTC'});
const iso=s=>new Date(s.length===10?s+'T00:00:00Z':s);
const fmt=(x,kind)=>kind==='usd'?usd.format(x):num.format(x);
const pretty=s=>String(s??'').replaceAll('_',' ').replace(/^./,x=>x.toUpperCase());
const label=id=>Number(id)===8453?'Base':'Tempo';
const node=(tag,content,cls)=>{const a=document.createElement(tag);if(content!=null)a.textContent=content;if(cls)a.className=cls;return a};
const svgNode=(tag,attrs={},content)=>{const a=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v] of Object.entries(attrs))a.setAttribute(k,v);if(content!=null)a.textContent=content;return a};
function table(headers,rows){
  const t=node('table'),h=node('thead'),r=node('tr'),b=node('tbody');
  headers.forEach(x=>{const th=node('th',x);th.scope='col';r.append(th)});h.append(r);t.append(h,b);
  for(const row of rows){const tr=node('tr');for(const x of row)tr.append(node('td',x));b.append(tr)}return t;
}
const card=(name,value)=>{const el=node('div',null,'card');el.append(node('span',name,'label'),node('strong',value,'big'));return el};
let state,range=Number(new URLSearchParams(location.search).get('range'))||30,metric='tasksCreated';
if(![7,30,90].includes(range))range=30;
const fields={tasksCreated:['Tasks posted'],activeAgents:['Active agents'],rewardVolume:['Rewards posted','Rewards paid']};
const sum=(a,key)=>a.reduce((s,r)=>s+(r[key]??0),0);
function overview(){
  const now=Date.parse(state.asOf),today=new Date(now).toISOString().slice(0,10);
  const from=new Date(today+'T00:00:00Z');from.setUTCDate(from.getUTCDate()-range+1);
  const data=state.series.filter(r=>r.bucket>=from.toISOString().slice(0,10));
  $('cards').replaceChildren(card('Tasks posted',num.format(sum(data,'tasksCreated'))),card('Average daily active agents',num.format(Math.round(sum(data,'activeAgents')/Math.max(1,data.length)))),card('Rewards posted',usd.format(sum(data,'rewardVolume'))),card('Rewards paid',usd.format(sum(data,'paidVolume'))));
  const keys=metric==='rewardVolume'?['rewardVolume','paidVolume']:[metric],money=keys.length===2;
  const max=Math.max(1,...data.flatMap(r=>keys.map(k=>r[k]??0)));
  const step=Math.pow(10,Math.floor(Math.log10(max/3))),top=Math.ceil(max/step)*step;
  const narrow=matchMedia('(max-width: 680px)').matches,W=narrow?400:760,H=narrow?225:235,x0=narrow?66:70,y0=17,x1=W-10,y1=H-28;
  const x=i=>x0+(x1-x0)*i/Math.max(1,data.length-1),y=v=>y1-(y1-y0)*v/top;
  const svg=svgNode('svg',{viewBox:`0 0 ${W} ${H}`,role:'img','aria-label':fields[metric].join(' and ')+' by UTC day'});
  for(let i=0;i<=3;i++){const n=top*i/3,z=y(n);svg.append(svgNode('line',{x1:x0,y1:z,x2:x1,y2:z,stroke:'#453E37'}),svgNode('text',{x:x0-7,y:z+4,'text-anchor':'end',fill:'#B0A79D','font-size':narrow?12:12},fmt(Math.round(n),money?'usd':null)));}
  const indexes=new Set([0,Math.floor((data.length-1)/2),data.length-1]);
  for(const i of indexes)if(data[i])svg.append(svgNode('text',{x:x(i),y:H-7,'text-anchor':i===0?'start':i===data.length-1?'end':'middle',fill:'#B0A79D','font-size':narrow?12:13},short.format(iso(data[i].bucket))));
  keys.forEach((k,j)=>{
    const color=j?'#D9A097':'#FFF6E8';
    svg.append(svgNode('polyline',{points:data.map((r,i)=>x(i)+','+y(r[k]??0)).join(' '),fill:'none',stroke:color,'stroke-width':2,'stroke-linejoin':'round'}));
    data.forEach((r,i)=>{if(data.length>30&&i!==data.length-1)return;const dot=svgNode('circle',{cx:x(i),cy:y(r[k]??0),r:data.length>10?2:3,fill:color});dot.append(svgNode('title',{},short.format(iso(r.bucket))+' · '+fmt(r[k]??0,money?'usd':null)));svg.append(dot)});
  });
  const legend=node('div',null,'legend');fields[metric].forEach(s=>legend.append(node('span',s)));
  $('trend').replaceChildren(svg,legend);
  $('trendTable').replaceChildren(table(['UTC date',...fields[metric]],data.slice().reverse().map(r=>[r.bucket,...keys.map(k=>fmt(r[k]??0,money?'usd':null))])));
  document.querySelectorAll('[data-range]').forEach(b=>b.setAttribute('aria-pressed',Number(b.dataset.range)===range));
  document.querySelectorAll('[data-metric]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.metric===metric));
}
function chainView(){
  const ids=[8453,4217],today=new Date(state.asOf).toISOString().slice(0,10);
  const d0=new Date(today+'T00:00:00Z');d0.setUTCDate(d0.getUTCDate()-6);const begin=d0.toISOString().slice(0,10);
  $('chainCards').replaceChildren(...ids.map(id=>{
    const c=state.chains[id],last7=Object.values(c.days).filter(x=>x.bucket>=begin);
    const el=card(label(id),num.format(sum(last7,'tasksCreated'))+' tasks');
    el.append(node('p','Last 7 UTC calendar days','label'),node('p',num.format(c.stats.paidWorkers)+' paid workers · '+num.format(c.stats.activeWallets)+' active wallets (API totals)','label'));return el;
  }));
  const dates=[...new Set(ids.flatMap(id=>Object.keys(state.chains[id].weeks)))].sort().reverse();
  $('posters').replaceChildren(table(['Week of (UTC)','Base','Tempo'],dates.map(d=>[short.format(iso(d)),...ids.map(id=>state.chains[id].complete?num.format(state.chains[id].weeks[d]??0):'≥'+num.format(state.chains[id].weeks[d]??0))])));
}
function mix(){
  $('mix').replaceChildren();
  for(const [key,title] of [['mode','Task mode'],['status','Task status']]){
    const a=[...state.breakdowns[key]].sort((a,b)=>b.count-a.count);
    $('mix').append(node('p',title,'label'));
    const b=node('div',null,'bars');
    for(const row of a){const line=node('div',null,'bar'),m=node('meter');m.max=a[0].count;m.value=row.count;m.setAttribute('aria-label',pretty(row[key]));line.append(node('span',pretty(row[key])),m,node('span',num.format(row.count)));b.append(line)}
    $('mix').append(b);
  }
}
function feed(){
  const id=$('feedChain').value, rows=state.feed.filter(r=>!id||String(r.chainId)===id).slice(0,9);
  $('feed').replaceChildren();
  if(!rows.length)$('feed').append(node('li','No events for this chain in the latest feed.','muted'));
  for(const item of rows){
    const line=node('li',null,'event'),title=item.taskTitle||'Untitled task';
    if(/^0x[\da-f]{64}$/i.test(item.taskId)){const a=node('a',title);a.href='https://taskmarket.dev/tasks/'+item.taskId;line.append(a)}else line.append(node('span',title));
    line.append(node('small',[label(item.chainId),pretty(item.type),dt.format(iso(item.timestamp))+' UTC',item.amount==null?'':usd.format(item.amount)].filter(Boolean).join(' · ')));$('feed').append(line);
  }
}
function heat(){
  const h=state.heat,cells=new Map(h.cells.map(x=>[x.row+'|'+x.col,x.count])),t=node('table',null,'heat'),hd=node('thead'),row=node('tr');row.append(node('th','Mode'));
  h.days.forEach((d,i)=>{const th=node('th',i%5===0?short.format(iso(d)):'');th.title=d;row.append(th)});hd.append(row);t.append(hd);
  const b=node('tbody');
  for(const r of h.rows){const tr=node('tr'),th=node('th',pretty(r));th.scope='row';tr.append(th);for(const d of h.days){
    const td=node('td'),v=cells.get(r+'|'+d)??0,c=node('button',String(v)),msg=pretty(r)+' · '+short.format(iso(d))+' UTC · '+num.format(v)+' events';c.style.setProperty('--pct',v?Math.round(18+82*Math.sqrt(v/Math.max(1,h.max)))+'%':'0%');c.type='button';c.title=msg;c.setAttribute('aria-label',msg);c.onclick=()=>$('heatDetail').textContent=msg;td.append(c);tr.append(td);
  }b.append(tr)}t.append(b);$('heat').replaceChildren(t);
}
async function load(){
  try{
    const res=await fetch('./api/snapshot.json');if(!res.ok)throw Error();
    state=await res.json();$('stamp').textContent=(state.stale?'Last available snapshot · ':'Data as of ')+dt.format(iso(state.asOf))+' UTC';
    overview();chainView();mix();feed();heat();$('surface').hidden=false;
  }catch{$('stamp').textContent='Live data is temporarily unavailable. Reload to try again.'}
}
$('ranges').onclick=e=>{if(!e.target.dataset.range||!state)return;range=Number(e.target.dataset.range);const u=new URL(location.href);u.searchParams.set('range',range);history.replaceState(null,'',u);overview()};
$('metrics').onclick=e=>{if(e.target.dataset.metric&&state){metric=e.target.dataset.metric;overview()}};
$('feedChain').onchange=()=>state&&feed();
matchMedia('(max-width: 680px)').addEventListener('change',()=>state&&overview());
load();setInterval(load,300_000);
