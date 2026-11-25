import assert from 'node:assert/strict';
import test from 'node:test';
import {summarize,snapshot} from './data.mjs';
test('deduplicates requester addresses per UTC week, converts rewards',()=>{
  const got=summarize([
    {createdAt:'2026-11-22T23:59:59Z',requester:'0xA',reward:'1000001'},
    {createdAt:'2026-11-23T00:00:00Z',requester:'0xA',reward:'500000'},
    {createdAt:'2026-11-23T00:10:00Z',requester:'0xa',reward:'900000'},
    {createdAt:'2026-11-23T00:11:00Z',requester:'0xB',reward:'100000'}
  ]);
  assert.deepEqual(got.weeks,{'2026-11-16':1,'2026-11-23':2});
  assert.equal(got.days['2026-11-23'].rewardVolume,1.5);
  assert.equal(got.days['2026-11-23'].tasksCreated,3);
});
test('deduplicates pages, rejects wrong chains, and strips actors from events',async()=>{
  const task={id:'a',createdAt:'2026-11-24T00:00:00Z',requester:'0xabc',reward:'1500000'};
  const fetcher=async raw=>{
    const u=new URL(raw);const id=Number(u.searchParams.get('chainId'));
    if(u.pathname.endsWith('/tasks'))return Response.json({tasks:[{...task,chainId:id},{...task,id:'wrong',chainId:123}],hasMore:!u.searchParams.has('cursor'),nextCursor:'pg2'});
    if(u.pathname.endsWith('/platform-time-series'))return Response.json([{rewardVolume:'3500000',paidVolume:'1500000'}]);
    if(u.pathname.endsWith('/activity-feed'))return Response.json({items:[{chainId:8453,amount:'1000000',actor:'0xabc'}]});
    if(u.pathname.endsWith('/activity-heatmap'))return Response.json({rowKeys:[],colKeys:[],cells:[],maxCount:0});
    return Response.json({});
  };
  const out=await snapshot(fetcher,new Date('2026-11-25T01:00:00Z'));
  assert.equal(out.chains[8453].days['2026-11-24'].tasksCreated,1);
  assert.equal(out.chains[8453].complete,true);
  assert.equal(out.series[0].rewardVolume,3.5);
  assert.equal(out.feed[0].amount,1);
  assert.ok(!('actor' in out.feed[0]));
});
