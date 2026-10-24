import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults,copy,generateOrders,plan} from '../engine.js';
import {buildReviewRows,filterReviewRows} from '../operations-review.js';
const basket=c=>({...generateOrders(c)[0],quantities:[2,1,0,0,0],volume:.16,weight:42,open:480,close:900});

test('operations review combines both temperature deliveries into one fully served parent row without mixing vehicles',()=>{
 const c=copy(defaults),order=basket(c),result=plan([order],c,{A:1,B:1}),rows=buildReviewRows([order],result,c);
 assert.equal(rows.length,1);const row=rows[0];assert.equal(row.status,'on-time');assert.equal(row.cases,3);
 assert.deepEqual(new Set(row.assignments.map(a=>a.type)),new Set(['A','B']));
 assert.ok(Math.abs(row.unloading-(2*c.service[0]+c.service[1]))<1e-8);
 for(const a of row.assignments)assert.equal(a.roadArrival,a.serviceStart-a.storeWait);
 assert.equal(filterReviewRows(rows,'served').length,1);assert.equal(filterReviewRows(rows,'unserved').length,0);
});

test('partial baskets remain distinguishable inside the incomplete list and never count as fully served',()=>{
 const c=copy(defaults),order=basket(c),result=plan([order],c,{A:0,B:1}),rows=buildReviewRows([order],result,c);
 assert.equal(rows[0].status,'partial');assert.equal(rows[0].assignments.length,1);
 assert.equal(filterReviewRows(rows,'served').length,0);assert.equal(filterReviewRows(rows,'partial').length,1);
 assert.equal(filterReviewRows(rows,'unserved').length,1);
 assert.ok(rows[0].reason.includes('frozen'));
 const empty=buildReviewRows([order],plan([order],c,{A:0,B:0}),c);
 assert.equal(empty[0].status,'unserved');assert.deepEqual(empty[0].assignments,[]);
 assert.equal(filterReviewRows(empty,'unserved').length,1);
});

test('arrival by closing is not on time when full handling finishes outside the receiving window',()=>{
 const c=copy(defaults),order=basket(c),result=plan([order],c,{A:1,B:1});
 const stop=result.routes[0].stops[0];stop.arrival=order.close;stop.finish=order.close+stop.service;
 const rows=buildReviewRows([order],result,c);
 assert.equal(rows[0].status,'outside-window');assert.equal(filterReviewRows(rows,'outside-window').length,1);
 assert.ok(/full service|finish/i.test(rows[0].reason));
});

test('default review counts conserve orders, search covers vehicles and reasons, and review priority follows earliest closing',()=>{
 const c=copy(defaults),orders=generateOrders(c),result=plan(orders,c,{A:2,B:6}),rows=buildReviewRows(orders,result,c);
 assert.equal(rows.length,100);assert.equal(filterReviewRows(rows,'served').length,result.served);
 assert.equal(filterReviewRows(rows,'partial').length,result.partial);
 assert.equal(filterReviewRows(rows,'unserved').length,result.unserved.length);
 assert.equal(new Set(rows.map(r=>r.order.id)).size,orders.length);
 assert.ok(rows.every((r,i)=>r.priority===i+1));
 assert.ok(rows.every((r,i)=>!i||r.order.close>=rows[i-1].order.close));
 assert.ok(filterReviewRows(rows,'all','A-01').every(r=>r.assignments.some(a=>a.vehicle==='A-01')));
 assert.deepEqual(buildReviewRows([],plan([],c,{A:0,B:0}),c),[]);
});
