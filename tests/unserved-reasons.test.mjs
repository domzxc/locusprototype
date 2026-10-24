import test from 'node:test';
import assert from 'node:assert/strict';
import {copy,defaults,generateOrders,plan,allocate} from '../engine.js';
import {validateRoadPlan} from '../road-routing.js';
import {earlyReturnReview,diagnosePending} from '../planning-diagnostics.js';

const router=minutes=>async points=>({provider:'OSRM driving',legs:points.slice(1).map((p,i)=>({km:1,minutes,geometry:[[points[i].lng,points[i].lat],[p.lng,p.lat]]})),snaps:points.map(p=>({...p,metres:0}))});
test('road rejection identifies receiving deadline and attempted finish with a distinct code',async()=>{
  const c=copy(defaults),orders=generateOrders(c).slice(0,1),fleet=allocate(orders,c);
  const result=await validateRoadPlan(orders,c,fleet,plan(orders,c,fleet),router(1000));
  for(const j of result.unassignedDeliveries){assert.equal(j.reasonCode,'receiving-window');assert.match(j.reason,/finish .* receiving closes .* late/);assert.match(j.reason,/PHT/);assert.match(j.reason,/sequence/);}
});
test('road search limit is not reported as a proven time-window failure',async()=>{
  const c=copy(defaults),orders=generateOrders(c).slice(0,2),fleet=allocate(orders,c);
  const result=await validateRoadPlan(orders,c,fleet,plan(orders,c,fleet),router(1),{maxPasses:0});
  assert.ok(result.unassignedDeliveries.length);
  assert.ok(result.unassignedDeliveries.every(j=>j.reasonCode==='search-limit'&&/not tested/.test(j.reason)));
});
test('pending jobs distinguish absent trucks from unavailable crew',()=>{
  const c=copy(defaults),orders=generateOrders(c).slice(0,2);
  assert.ok(plan(orders,c,{A:0,B:0}).unassignedDeliveries.every(j=>j.reasonCode==='no-truck'));
  c.attendance={A:{driversScheduled:1,driversPresent:0,helpersScheduled:1,helpersPresent:1,helpersPerTruck:1},B:{driversScheduled:1,driversPresent:0,helpersScheduled:1,helpersPresent:1,helpersPerTruck:1}};
  assert.ok(plan(orders,c,{A:1,B:1}).unassignedDeliveries.every(j=>j.reasonCode==='no-crew'&&/0 crew-ready/.test(j.reason)));
});
test('late road return gives a return deadline rather than a receiving-window reason',async()=>{
  const c=copy(defaults),orders=generateOrders(c).slice(0,1),fleet=allocate(orders,c),base=plan(orders,c,fleet);
  const lateReturn=async points=>{const data=await router(1)(points);data.legs.at(-1).minutes=2000;return data;};
  const result=await validateRoadPlan(orders,c,fleet,base,lateReturn);
  assert.ok(result.unassignedDeliveries.length);
  for(const j of result.unassignedDeliveries){assert.equal(j.reasonCode,'shift-return');assert.match(j.reason,/tour returns .* shift ends .* late/);}
});
test('final-tour capacity screening explains load totals without modifying the plan',()=>{
  const c=copy(defaults);c.B.capacity=.04;c.ban.enabled=false;
  const orders=generateOrders(c).slice(0,2).map(o=>({...o,quantities:[1,0,0,0,0],volume:.035,weight:12,open:360,close:1080})),fleet={A:0,B:1},p=plan(orders,c,fleet);
  const capacity=p.unassignedDeliveries.filter(j=>j.reasonCode==='tour-capacity');
  assert.ok(capacity.length);assert.ok(capacity.every(j=>/CBM and .* KG/.test(j.reason)));
  assert.equal(p.deliveryAssigned+p.unassignedDeliveries.length,p.deliveryTotal);
});
test('early return review only counts missing portions compatible with each truck',()=>{
  const c=copy(defaults),p={routes:[{id:'A-01',type:'A',return:900},{id:'B-01',type:'B',return:1090}],unassignedDeliveries:[{cold:true},{cold:false},{cold:false}]};
  const rows=earlyReturnReview(p,c);
  assert.deepEqual(rows,[{vehicle:'A-01',type:'A',returned:900,unusedMinutes:180,missing:1}]);
});
test('a possible final append is disclosed as search not retried, not claimed infeasible',()=>{
  const c=copy(defaults),job={cold:false,shipment:'dry',volume:1,weight:10,service:10,open:360,close:1080};
  const route={id:'B-01',type:'B',stops:[],depart:385,volume:0,weight:0},before=copy(route);
  const result=diagnosePending(job,c,{A:0,B:1},{fleet:{A:0,B:1},blocked:{A:0,B:0}},[route],(_from,_to,time)=>({arrival:time+5}),{});
  assert.equal(result.reasonCode,'search-not-retried');assert.match(result.reason,/1 possible append/);assert.match(result.reason,/Road feasibility is not verified/);assert.deepEqual(route,before);
});
