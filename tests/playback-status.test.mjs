import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults,copy,generateOrders,plan} from '../engine.js';
import {createPlaybackOrders,playbackOrderStates} from '../playback-status.js';

const mixed=c=>({...generateOrders(c)[0],quantities:[2,1,0,0,0],volume:.16,weight:42,open:480,close:1000});
test('a mixed parent turns served only after both frozen and dry handling finish',()=>{
 const c=copy(defaults),o=mixed(c),p=plan([o],c,{A:1,B:1}),timeline=createPlaybackOrders([o],p.routes,p.unserved);
 const stops=p.routes.flatMap(r=>r.stops),first=Math.min(...stops.map(s=>s.finish)),last=Math.max(...stops.map(s=>s.finish));
 assert.equal(playbackOrderStates(timeline,c.start)[0].status,'pending');
 assert.equal(playbackOrderStates(timeline,first)[0].status,'in-progress');
 assert.equal(playbackOrderStates(timeline,last)[0].status,'served');
 assert.equal(playbackOrderStates(timeline,last-.001)[0].status,'in-progress');
 assert.equal(playbackOrderStates(timeline,c.start)[0].completed,0);
});

test('partial parents never become fully served and unassigned parents stay red without invented timings',()=>{
 const c=copy(defaults),o=mixed(c),p=plan([o],c,{A:0,B:1});
 let row=playbackOrderStates(createPlaybackOrders([o],p.routes,p.unserved),c.end)[0];
 assert.equal(row.status,'partial');assert.equal(row.completed,1);assert.equal(row.required,2);assert.ok(row.reason);
 const empty=plan([o],c,{A:0,B:0});row=playbackOrderStates(createPlaybackOrders([o],empty.routes,empty.unserved),c.end)[0];
 assert.equal(row.status,'unserved');assert.equal(row.completed,0);assert.deepEqual(row.assignments,[]);
});

test('map status counts conserve every parent, match final coverage and rewind deterministically',()=>{
 const c=copy(defaults),orders=generateOrders(c),p=plan(orders,c,{A:2,B:6}),timeline=createPlaybackOrders(orders,p.routes,p.unserved);
 const start=playbackOrderStates(timeline,c.start),end=playbackOrderStates(timeline,c.end);
 assert.equal(end.length,orders.length);assert.equal(new Set(end.map(o=>o.order.id)).size,orders.length);
 assert.equal(end.filter(o=>o.status==='served').length,p.served);
 assert.equal(end.filter(o=>o.status==='partial').length,p.partial);
 assert.equal(end.filter(o=>o.status==='unserved').length,p.unserved.length-p.partial);
 assert.deepEqual(playbackOrderStates(timeline,c.start),start);
 assert.deepEqual(playbackOrderStates([],c.end),[]);
});

test('repeat peak orders at one store retain independent completion and map identities',()=>{
 const c={...copy(defaults),orders:1,peakOrders:2},orders=generateOrders(c,'peak'),p=plan(orders,c,{A:2,B:2});
 const timeline=createPlaybackOrders(orders,p.routes,p.unserved);assert.equal(timeline.length,2);
 assert.equal(timeline[0].order.retailerId,timeline[1].order.retailerId);
 const firstFinish=Math.max(...timeline[0].assignments.map(a=>a.finish));
 const rows=playbackOrderStates(timeline,firstFinish);
 assert.equal(rows[0].status,'served');assert.notEqual(rows[1].status,'served');
 assert.notEqual(rows[0].order.id,rows[1].order.id);
});
