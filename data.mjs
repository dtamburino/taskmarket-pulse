const origin = 'https://api.taskmarket.dev/api/';
export const chains = [8453,4217];
export const ttl = 300_000;
const toDollars = v => Number(v ?? 0)/1e6;
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
export async function snapshot(fetcher=fetch, now=new Date()) {
  const get=async (path,params={})=>{
    const res=await fetcher(origin+path+'?'+new URLSearchParams(params),{signal:AbortSignal.timeout(9_000),headers:{accept:'application/json'}});
    if (!res.ok) throw new Error(path+' returned '+res.status);
    return res.json();
  };
  const from=new Date(now);
  from.setUTCHours(0,0,0,0);
  from.setUTCDate(from.getUTCDate()-(from.getUTCDay()+6)%7-7*4);
  const scan=async chainId=>{
    const tasks=new Map();
    let cursor, complete=false;
    for(let page=0;page<17;page++){
      const res=await get('tasks',{chainId,sort:'newest',limit:100,...(cursor?{cursor}:{})});
      let beyond=false;
      for(const t of res.tasks){
        if (Date.parse(t.createdAt)<+from){beyond=true;continue}
        if (t.chainId===chainId) tasks.set(t.id,t);
      }
      if (beyond || !res.hasMore){complete=true;break}
      if (!res.nextCursor || res.nextCursor===cursor) break;
      cursor=res.nextCursor;
    }
    return {...summarize(tasks.values()),complete,from:from.toISOString().slice(0,10)};
  };
  const [stats,series,breakdowns,heat,feed,coverage]=await Promise.all([
    Promise.all(chains.map(chainId=>get('market/stats',{chainId}))),
    get('stats/platform-time-series',{chainId:4217,range:'90d',bucket:'day'}),
    get('stats/breakdowns',{chainId:4217}),
    get('stats/activity-heatmap',{chainId:4217}),
    get('stats/activity-feed',{chainId:4217,limit:25}),
    Promise.all(chains.map(scan))
  ]);
  return {asOf:new Date().toISOString(),series:series.map(x=>({...x,rewardVolume:toDollars(x.rewardVolume),paidVolume:toDollars(x.paidVolume)})),
    breakdowns,heat:{rows:heat.rowKeys,days:heat.colKeys,cells:heat.cells.map(({row,col,count})=>({row,col,count})),max:heat.maxCount},
    feed:feed.items.filter(x=>chains.includes(x.chainId)).map(({type,timestamp,taskId,taskTitle,chainId,amount})=>({type,timestamp,taskId,taskTitle,chainId,amount:amount==null?null:toDollars(amount)})),
    chains:Object.fromEntries(chains.map((id,i)=>[id,{stats:stats[i],...coverage[i]}]))};
}
