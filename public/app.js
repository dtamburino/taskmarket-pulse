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
  const max=Math.max(1,...ids.flatMap(id=>Object.values(state.chains[id].weeks)));
  const blocks=dates.slice().reverse().map(d=>{
    const group=node('div',null,'week'), bars=node('div',null,'weekBars');
    for(const id of ids){
      const count=state.chains[id].weeks[d]??0,c=node('div',null,'weekBar');
      c.style.setProperty('--bar',Math.max(1,100*count/max)+'%');c.dataset.chain=label(id);
      c.title=label(id)+' · '+short.format(iso(d))+' · '+num.format(count)+' posters';
      c.append(node('span',num.format(count)));
      bars.append(c);
    }
    group.append(bars,node('span',short.format(iso(d)),'label'));return group;
  });
  const line=node('div',null,'weekPlot');line.append(...blocks);
  const legend=node('div',null,'legend');legend.append(node('span','Base'),node('span','Tempo'));
  $('postersChart').replaceChildren(line,legend);
  $('posters').replaceChildren(table(['Week of (UTC)','Base','Tempo'],dates.map(d=>[short.format(iso(d)),...ids.map(id=>state.chains[id].complete?num.format(state.chains[id].weeks[d]??0):'≥'+num.format(state.chains[id].weeks[d]??0))])));
}
function depth(){
  const ids=[8453,4217], host=$('depth');
  host.replaceChildren(...ids.map(id=>{
    const c=state.chains[id].concentration;
    if(!c)return node('p','Concentration will appear on the next refresh.','muted');
    const wrap=node('article',null,'depthRow'),header=node('div',null,'depthHead');
    const pct=n=>Math.round(n*100/Math.max(c.tasks,1));
    const rest=c.tasks-c.top-c.nextTwo;
    const shares=[c.top,c.nextTwo,rest], labels=['Top wallet','Next two','All others'];
    header.append(node('strong',label(id)),node('span',num.format(c.wallets)+' wallets · '+num.format(c.tasks)+' tasks','label'));wrap.append(header);
    const band=node('div',null,'depthBand');band.setAttribute('aria-hidden','true');
    const key=node('div',null,'depthKey');
    shares.forEach((amount,i)=>{
      const block=node('div');block.style.flexGrow=amount;block.dataset.rank=i;band.append(block);
      const badge=node('span',labels[i]+' · '+pct(amount)+'%');badge.dataset.rank=i;key.append(badge);
    });
    if(c.tasks)wrap.append(band,key,node('p',`${pct(c.top)}% of new ${label(id)} tasks came from its busiest posting wallet.`,'muted'));
    else wrap.append(node('p','No tasks with a requester were published in this period.','muted'));
    return wrap;
  }));
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
let signalChain=new URLSearchParams(location.search).get('chain')==='base'?8453:4217;
const bountyUrl=id=>'https://taskmarket.dev/tasks/'+id;
function signal(){
  const s=state.signals?.[signalChain], cards=$('signalCards'), plot=$('signalPlot'), detail=$('signalDetail'), shortlist=$('signalShortlist');
  document.querySelectorAll('#signalControls button[data-chain]').forEach(b=>b.setAttribute('aria-pressed',Number(b.dataset.chain)===signalChain));
  cards.replaceChildren();plot.replaceChildren();shortlist.replaceChildren();
  detail.textContent='Select a dot to inspect a bounty.';
  if(!s){detail.textContent='Bounty comparison will appear with the next snapshot.';return;}
  cards.append(card('Open bounties',num.format(s.count)),card('Under 10 submissions',num.format(s.light)),card('Median submissions',s.median===null?'—':num.format(s.median)));
  if(!s.count){detail.textContent='No bounties accepting submissions in this snapshot.';return;}
  const narrow=matchMedia('(max-width: 680px)').matches,W=narrow?370:740,H=narrow?230:260,x0=53,x1=W-18,y0=19,y1=H-34;
  const maxX=Math.max(10,...s.rows.map(v=>v.entries)),maxY=Math.max(1,...s.rows.map(v=>v.pool));
  const x=v=>x0+Math.log1p(v)/Math.log1p(maxX)*(x1-x0);
  const y=v=>y1-Math.log1p(v)/Math.log1p(maxY)*(y1-y0);
  const xTicks=[0,1,3,10,30,100,300,1000].filter(n=>n<=maxX);
  const yTicks=[.1,.5,1,5,10,50,100,500,1000].filter(n=>n<=maxY);
  const svg=svgNode('svg',{viewBox:`0 0 ${W} ${H}`,role:'group','aria-label':label(signalChain)+' bounties: published submission count and reward pool'});
  xTicks.forEach(t=>{svg.append(svgNode('line',{x1:x(t),x2:x(t),y1:y0,y2:y1,stroke:'#453E37'}),svgNode('text',{x:x(t),y:y1+15,'text-anchor':'middle',fill:'#B0A79D','font-size':11},String(t)));});
  yTicks.filter((t,i)=>yTicks.length<7||i%2===0).forEach(t=>{svg.append(svgNode('line',{x1:x0,x2:x1,y1:y(t),y2:y(t),stroke:'#453E37'}),svgNode('text',{x:x0-5,y:y(t)+4,'text-anchor':'end',fill:'#B0A79D','font-size':11},'$'+t));});
  svg.append(svgNode('text',{x:x0,y:12,fill:'#B0A79D','font-size':11},'Reward pool'),svgNode('text',{x:x1,y:H-3,'text-anchor':'end',fill:'#B0A79D','font-size':11},'Submissions'));
  let selected;
  s.rows.slice().reverse().forEach(t=>{
    const info=t.title+' · '+usd.format(t.pool)+' pool · '+num.format(t.entries)+' submissions';
    const p=svgNode('circle',{cx:x(t.entries),cy:y(t.pool),r:narrow?4.5:5.5,fill:t.entries<10?'#FFF6E8':'#D9A097',opacity:.88,tabindex:0,role:'button','aria-label':info,'aria-pressed':'false',class:'signalPoint'});
    function activate(){
      selected?.setAttribute('aria-pressed','false');selected=p;p.setAttribute('aria-pressed','true');
      const a=node('a',t.title);a.href=bountyUrl(t.id);
      detail.replaceChildren(a,document.createTextNode(' · '+usd.format(t.pool)+' pool · '+num.format(t.entries)+' submissions'+(t.expires?' · closes '+dt.format(iso(t.expires))+' UTC':'')));
    }
    p.onclick=activate;p.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();activate();}};p.append(svgNode('title',{},info));svg.append(p);
  });
  plot.append(svg);
  const few=s.rows.filter(t=>t.entries<10).sort((a,b)=>b.pool-a.pool||a.entries-b.entries).slice(0,3);
  if(few.length){
    const ul=node('ul',null,'signalShort');
    for(const t of few){const li=node('li'),a=node('a',t.title);a.href=bountyUrl(t.id);li.append(a,node('small',usd.format(t.pool)+' pool · '+num.format(t.entries)+' entries'));ul.append(li)}
    shortlist.append(node('strong','Largest pools with fewer than 10 submissions'),ul);
  }
}

const view=document.documentElement.dataset.view;
let outcomeChain=new URLSearchParams(location.search).get('chain')==='base'?8453:4217;
let outcomeDay;
const outcomeLabels={awarded:'Award recorded',review:'Pending',closed:'Closed without an award'};
function outcomes(){
  const id=outcomeChain,data=state.chains[id]?.outcomes;
  const host=$('outcomePlot'),cards=$('outcomeCards'),details=$('outcomeCases'),key=$('outcomeDetail');
  host.replaceChildren();cards.replaceChildren();details.replaceChildren();
  document.querySelectorAll('#outcomeControls button[data-chain]').forEach(b=>b.setAttribute('aria-pressed',Number(b.dataset.chain)===id));
  if(!data){key.textContent='Outcomes will appear with the next snapshot.';return;}
  const keys=Object.keys(outcomeLabels), total=Object.values(data.totals).reduce((a,b)=>a+b,0), days=Object.entries(data.days);
  cards.append(card('Bounties with a deadline',num.format(total)),...keys.map(k=>card(outcomeLabels[k],num.format(data.totals[k]))));
  const max=Math.max(1,...days.map(([,c])=>Object.values(c).reduce((a,b)=>a+b,0)));
  const chart=node('div',null,'outcomePlot');
  const buttons=[];
  function select(day,counts){
    outcomeDay=day;
    for(const b of buttons)b.setAttribute('aria-pressed',b.dataset.day===day);
    key.textContent=short.format(iso(day))+' UTC · '+keys.map(k=>outcomeLabels[k]+': '+num.format(counts[k])).join(' · ');
    const list=data.cases.filter(x=>x.day===day), ul=node('ul');
    if(!list.length){details.replaceChildren(node('p','No bounty deadlines in this cohort.','muted'));return;}
    const values=list.slice().sort((a,b)=>b.entries-a.entries||a.id.localeCompare(b.id)).slice(0,6);
    for(const x of values){
      if(!/^0x[0-9a-f]{64}$/i.test(x.id))continue;
      const li=node('li'),a=node('a',x.title||'View bounty');a.href=bountyUrl(x.id);
      li.append(a,node('span',outcomeLabels[x.state]+' · '+num.format(x.entries)+' submissions','label'));ul.append(li);
    }
    details.replaceChildren(node('p',list.length>6?'Six most-submitted bounties that day':'Bounties in this cohort','muted'),ul);
  }
  for(const [day,counts] of days){
    const b=node('button',null,'outcomeDay'),stack=node('span',null,'outcomeStack');
    b.type='button';b.dataset.day=day;b.setAttribute('aria-label',short.format(iso(day))+', '+keys.map(k=>outcomeLabels[k]+' '+counts[k]).join(', '));b.setAttribute('aria-pressed','false');stack.setAttribute('aria-hidden','true');
    for(const k of keys){const span=node('span');span.dataset.outcome=k;span.style.height=(counts[k]*100/max)+'%';stack.append(span);}
    b.append(stack,node('span',short.format(iso(day)),'label'));b.onclick=()=>select(day,counts);chart.append(b);buttons.push(b);
  }
  const legend=node('div',null,'outcomeKey');
  for(const k of keys){const l=node('span',outcomeLabels[k]);l.dataset.outcome=k;legend.append(l);}
  host.append(chart,legend);
  const active=days.find(([d])=>d===outcomeDay)??days.slice().reverse().find(([,c])=>Object.values(c).some(Boolean));
  if(active)select(...active);else key.textContent='No bounty deadlines in this date range.';
}
function sourceLog(){
  $('sources').replaceChildren(table(['Public endpoint','Chain filter','Requests','Last response · UTC'],(state.sources??[]).map(x=>[x.endpoint,x.chainId?label(x.chainId):'None',num.format(x.requests),dt.format(iso(x.fetchedAt))])));
}
let initial=true;
function stamp(){
  if(!state?.asOf)return;
  const old=Date.now()-Date.parse(state.asOf)>60*60*1000;
  const stale=state.stale||old;
  $('stamp').dataset.state=stale?'stale':'fresh';
  $('stamp').textContent=(old?'Snapshot older than one hour · ':state.stale?'Refresh unavailable · Last snapshot ': 'Data as of ')+dt.format(iso(state.asOf))+' UTC';
}
async function load(){
  try{
    const res=await fetch('./api/snapshot.json');if(!res.ok)throw Error();
    state=await res.json();stamp();
    overview();chainView();depth();signal();outcomes();mix();feed();heat();sourceLog();$('surface').hidden=false;
    if(initial&&view==='signal')$('bounty-signal').scrollIntoView();
    if(initial&&view==='outcomes')$('bounty-outcomes').scrollIntoView();
    const o=document.querySelector('#bounty-outcomes .signalLink');o.href='./outcomes/?chain='+(outcomeChain===8453?'base':'tempo');
    if(initial&&signalChain===8453)document.querySelector('.signalLink').href='./signal/?chain=base';
    initial=false;
  }catch{if(state){state.stale=true;stamp()}else $('stamp').textContent='Live data is temporarily unavailable. Reload to try again.'}
}
$('ranges').onclick=e=>{if(!e.target.dataset.range||!state)return;range=Number(e.target.dataset.range);const u=new URL(location.href);u.searchParams.set('range',range);history.replaceState(null,'',u);overview()};
$('metrics').onclick=e=>{if(e.target.dataset.metric&&state){metric=e.target.dataset.metric;overview()}};
$('feedChain').onchange=()=>state&&feed();
$('signalControls').onclick=e=>{
  if(!e.target.dataset.chain||!state)return;
  signalChain=Number(e.target.dataset.chain);
  const u=new URL(location.href);u.searchParams.set('chain',signalChain===8453?'base':'tempo');history.replaceState(null,'',u);signal();
  const a=document.querySelector('.signalLink');a.href='./signal/?chain='+(signalChain===8453?'base':'tempo');
};
$('outcomeControls').onclick=e=>{
  if(!e.target.dataset.chain||!state)return;
  outcomeChain=Number(e.target.dataset.chain);outcomeDay=undefined;
  const u=new URL(location.href);u.searchParams.set('chain',outcomeChain===8453?'base':'tempo');history.replaceState(null,'',u);outcomes();
  document.querySelector('#bounty-outcomes .signalLink').href='./outcomes/?chain='+(outcomeChain===8453?'base':'tempo');
};
matchMedia('(max-width: 680px)').addEventListener('change',()=>{if(state){overview();signal();}});
load();setInterval(load,300_000);setInterval(stamp,60_000);
