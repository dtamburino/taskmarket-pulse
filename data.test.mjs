import assert from 'node:assert/strict';
import test from 'node:test';
import {summarize,snapshot,concentration,bountySignal,deadlineOutcomes} from './data.mjs';
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

test('market depth counts only in-range tasks and does not expose addresses',()=>{
  const a=[['2026-11-17','old'],['2026-11-23','A'],['2026-11-24','a'],['2026-11-24','b'],['2026-11-24','c'],['2026-11-24','d']].map(([createdAt,requester])=>({createdAt,requester}));
  assert.deepEqual(concentration(a,'2026-11-19'),{wallets:4,tasks:5,top:2,nextTwo:2});
});

test('bounty signal filters by chain, submission window and reward; computes median',()=>{
  const bounty=(n, entries, changes={})=>({id:'0x'+String(n).padStart(64,'0'), description:'Public title\nPrivate-independent body not included',chainId:4217,mode:'bounty',submissionWindowOpen:true,reward:'1500000',submissionCount:entries,...changes});
  const out=bountySignal([bounty(1,0),bounty(1,0),bounty(2,9),bounty(3,15),bounty(4,2,{chainId:8453}),bounty(5,4,{submissionWindowOpen:false}),bounty(6,4,{reward:'0'})],4217);
  assert.deepEqual([out.count,out.light,out.median],[3,2,9]);
  assert.equal(out.rows[0].pool,1.5);
  assert.equal(out.rows[0].title,'Public title');
  assert.ok(!('requester' in out.rows[0]));
});

test('deadline cohorts keep pending distinct from no award and omit partial day',()=>{
  const make=(n,day,props={})=>({id:'0x'+String(n).padStart(64,'0'),expiryTime:day+'T01:00:00Z',mode:'bounty',submissionCount:3,...props});
  const a=deadlineOutcomes([make(1,'2026-11-18',{awardCount:2,status:'completed'}),make(2,'2026-11-24',{status:'open',phase:'awaiting_settlement'}),make(3,'2026-11-24',{status:'expired'}),make(4,'2026-11-25',{awardCount:1}),make(5,'2026-11-17'),make(6,'2026-11-19',{taskVisibility:'unlisted'})],new Date('2026-11-25T04:00:00Z'));
  assert.deepEqual(a.totals,{awarded:1,review:1,closed:1});
  assert.equal(Object.keys(a.days).length,7);
  assert.deepEqual(a.days['2026-11-24'],{awarded:0,review:1,closed:1});
  assert.equal(a.cases.length,3);
});
