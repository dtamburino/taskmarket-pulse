import {snapshot, ttl} from './data.mjs';
let last, pending;
const reply=(v,status=200,cache='no-store')=>new Response(JSON.stringify(v),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':cache,'x-content-type-options':'nosniff'}});
export async function api(req,ctx,fetcher=fetch,edge=null){
  const url=new URL(req.url);
  if(!['/api/snapshot','/api/snapshot.json'].includes(url.pathname))return reply({error:'Not found'},404);
  if(!['GET','HEAD'].includes(req.method))return reply({error:'Method not allowed'},405);
  const key=new Request(url.origin+'/api/snapshot');
  const hit=await edge?.match(key);
  if(hit)return req.method==='HEAD'?new Response(null,{headers:hit.headers}):hit;
  if(!last||Date.now()-Date.parse(last.asOf)>=ttl){
    pending??=snapshot(fetcher).then(v=>(last=v)).finally(()=>{pending=null});
    try{await pending}catch{
      if(last)return reply({...last,stale:true});
      return reply({error:'Taskmarket data is temporarily unavailable. Try again shortly.'},503);
    }
  }
  const res=reply(last,200,'public, max-age=60, s-maxage=300');
  if(edge)ctx.waitUntil(edge.put(key,res.clone()).catch(()=>{}));
  return req.method==='HEAD'?new Response(null,{headers:res.headers}):res;
}
export default {fetch(req,env,ctx){
  return new URL(req.url).pathname.startsWith('/api/') ? api(req,ctx,fetch,globalThis.caches?.default) : env.ASSETS.fetch(req);
}};
