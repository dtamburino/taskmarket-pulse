const origin = 'https://api.taskmarket.dev/api/';
export const chains = [8453,4217];
export const ttl = 300_000;
const toDollars = v => Number(v ?? 0)/1e6;
const publicTask=t=>(t.taskVisibility??'public')==='public';
const titleOf=t=>String(t.description??'').split('\n')[0].slice(0,150).trim()||'Untitled bounty';
const week = ts => {
  const d = new Date(ts.slice(0,10)+'T00:00:00Z');
  d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);
  return d.toISOString().slice(0,10);
};
export function summarize(tasks) {
  const weeks = new Map();
  const days = new Map();
  for (const t of tasks) {
    const w = week(t.createdAt);
    if (!weeks.has(w)) weeks.set(w,new Set());
    if (t.requester) weeks.get(w).add(t.requester.toLowerCase());
    const d=t.createdAt.slice(0,10);
    const row=days.get(d) ?? {bucket:d,tasksCreated:0,rewardVolume:0};
    row.tasksCreated++; row.rewardVolume+=toDollars(t.reward);
    days.set(d,row);
  }
  return {weeks:Object.fromEntries([...weeks].sort().map(([w,s])=>[w,s.size])),days:Object.fromEntries([...days].sort())};
}
export function concentration(tasks, since) {
  const counts=new Map();
  for(const t of tasks) {
    if(t.createdAt.slice(0,10)<since||!t.requester) continue;
    const wallet=t.requester.toLowerCase();
    counts.set(wallet,1+(counts.get(wallet)??0));
  }
  const ranks=[...counts.values()].sort((a,b)=>b-a);
  return {wallets:ranks.length,tasks:ranks.reduce((a,b)=>a+b,0),top:ranks[0]??0,
    nextTwo:(ranks[1]??0)+(ranks[2]??0)};
}
export function bountySignal(tasks, chainId) {
  const clean=[...new Map(tasks.filter(t=>t.chainId===chainId && publicTask(t) && t.mode==='bounty' &&
    t.submissionWindowOpen===true && /^[a-f0-9]{64}$/i.test(t.id?.slice(2)??'') &&
    /^0x/i.test(t.id??'') && Number.isSafeInteger(t.submissionCount) && t.submissionCount>=0 &&
    Number.isFinite(Number(t.reward)) && toDollars(t.reward)>0).map(t=>[t.id,t])).values()]
    .map(t=>({id:t.id, title:titleOf(t),
      entries:t.submissionCount, pool:toDollars(t.reward),
      expires:Number.isFinite(Date.parse(t.expiryTime))?t.expiryTime:null}));
  clean.sort((a,b)=>a.entries-b.entries||b.pool-a.pool||a.id.localeCompare(b.id));
  const mid=Math.floor(clean.length/2);
  const median=clean.length?(clean[mid].entries+(clean.length%2?clean[mid].entries:clean[mid-1].entries))/2:null;
  return {count:clean.length,light:clean.filter(t=>t.entries<10).length,median,rows:clean};
}
export function deadlineOutcomes(tasks, now) {
  const midnight=new Date(now);midnight.setUTCHours(0,0,0,0);
  const start=new Date(+midnight-7*86400000), totals={awarded:0,review:0,closed:0};
  const days={};
  for(let d=new Date(start);d<midnight;d.setUTCDate(d.getUTCDate()+1))
    days[d.toISOString().slice(0,10)]={awarded:0,review:0,closed:0};
  const cases=[];
  for(const t of tasks){
    const deadline=Date.parse(t.expiryTime);
    if(!publicTask(t)||t.mode!=='bounty'||!/^0x[0-9a-f]{64}$/i.test(t.id??'')||!Number.isFinite(deadline)||deadline<+start||deadline>=+midnight)continue;
    const awards=Number(t.awardCount??0);
    const status=awards>0?'awarded':(t.phase==='resolved'||['cancelled','completed','expired'].includes(t.status))?'closed':'review';
    const day=new Date(deadline).toISOString().slice(0,10);
    totals[status]++;days[day][status]++;
    cases.push({id:t.id,title:titleOf(t),day,state:status,awards,entries:Number(t.submissionCount??0)});
  }
  cases.sort((a,b)=>a.day.localeCompare(b.day)||a.id.localeCompare(b.id));
  return {from:start.toISOString().slice(0,10),to:midnight.toISOString().slice(0,10),totals,days,cases};
}
export async function snapshot(fetcher=fetch, now=new Date()) {
  const requested=new Map();
  const get=async (path,params={})=>{
    const endpoint='/api/'+path, key=endpoint+(params.chainId?' · '+params.chainId:'');
    const res=await fetcher(origin+path+'?'+new URLSearchParams(params),{signal:AbortSignal.timeout(9_000),headers:{accept:'application/json'}});
    if (!res.ok) throw new Error(path+' returned '+res.status);
    const data=await res.json();
    const receipt=requested.get(key)??{endpoint,chainId:params.chainId??null,requests:0};
    receipt.requests++;receipt.fetchedAt=new Date().toISOString();requested.set(key,receipt);
    return data;
  };
  const from=new Date(now);
  from.setUTCHours(0,0,0,0);
  from.setUTCDate(from.getUTCDate()-(from.getUTCDay()+6)%7-7*4);
  const pastWeek=new Date(now);pastWeek.setUTCDate(pastWeek.getUTCDate()-6);
  const since=pastWeek.toISOString().slice(0,10);
  const scan=async chainId=>{
    const tasks=new Map();
    let cursor, complete=false;
    for(let page=0;page<17;page++){
      const res=await get('tasks',{chainId,sort:'newest',limit:100,...(cursor?{cursor}:{})});
      let beyond=false;
      for(const t of res.tasks){
        if (Date.parse(t.createdAt)<+from){beyond=true;continue}
        if (t.chainId===chainId&&publicTask(t)) tasks.set(t.id,t);
      }
      if (beyond || !res.hasMore){complete=true;break}
      if (!res.nextCursor || res.nextCursor===cursor) break;
      cursor=res.nextCursor;
    }
    return {...summarize(tasks.values()),concentration:concentration(tasks.values(),since),outcomes:deadlineOutcomes(tasks.values(),now),complete,from:from.toISOString().slice(0,10)};
  };
  const open=async chainId=>{
    const all=[];let cursor;
    for(let i=0;i<8;i++){
      const page=await get('tasks',{chainId,sort:'newest',status:'open',limit:100,...(cursor?{cursor}:{})});
      all.push(...page.tasks);
      if(!page.hasMore)return bountySignal(all,chainId);
      if(!page.nextCursor || page.nextCursor===cursor)break;
      cursor=page.nextCursor;
    }
    throw Error('Open-task pagination incomplete for '+chainId);
  };
  const [stats,series,breakdowns,heat,feed,coverage,signals]=await Promise.all([
    Promise.all(chains.map(chainId=>get('market/stats',{chainId}))),
    get('stats/platform-time-series',{chainId:4217,range:'90d',bucket:'day'}),
    get('stats/breakdowns',{chainId:4217}),
    get('stats/activity-heatmap',{chainId:4217}),
    get('stats/activity-feed',{chainId:4217,limit:25}),
    Promise.all(chains.map(scan)),
    Promise.all(chains.map(open))
  ]);
  return {asOf:new Date().toISOString(),sources:[...requested.values()].sort((a,b)=>a.endpoint.localeCompare(b.endpoint)||(a.chainId??0)-(b.chainId??0)),signals:Object.fromEntries(chains.map((id,i)=>[id,signals[i]])),series:series.map(x=>({...x,rewardVolume:toDollars(x.rewardVolume),paidVolume:toDollars(x.paidVolume)})),
    breakdowns,heat:{rows:heat.rowKeys,days:heat.colKeys,cells:heat.cells.map(({row,col,count})=>({row,col,count})),max:heat.maxCount},
    feed:feed.items.filter(x=>chains.includes(x.chainId)).map(({type,timestamp,taskId,taskTitle,chainId,amount})=>({type,timestamp,taskId,taskTitle,chainId,amount:amount==null?null:toDollars(amount)})),
    chains:Object.fromEntries(chains.map((id,i)=>[id,{stats:stats[i],...coverage[i]}]))};
}
