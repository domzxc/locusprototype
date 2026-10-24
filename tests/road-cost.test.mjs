import test from 'node:test';
import assert from 'node:assert/strict';
import { defaults, copy, generateOrders, allocate, plan, positionAt, validateConfig, distance } from '../engine.js';
import { validateRoadPlan, parseRoadResponse, createOsrmClient } from '../road-routing.js';
import { costBreakdown } from '../costing.js';

const ordersFor=c=>generateOrders(c).slice(0,5);
function fakeRouter(multiplier=1){return async points=>({provider:'OSRM driving',legs:points.slice(1).map((p,i)=>({km:multiplier,minutes:multiplier,geometry:[[points[i].lng,points[i].lat],[points[i].lng+.001,points[i].lat+.002],[p.lng,p.lat]]})),snaps:points.map(p=>({...p,metres:0}))});}

test('road schedules, distance and cost use returned legs, preserve capacities and interpolate the road',async()=>{
  const c={...copy(defaults),traffic:1,ban:{...defaults.ban,enabled:false}},orders=ordersFor(c),fleet=allocate(orders,c),base=plan(orders,c,fleet);
  const result=await validateRoadPlan(orders,c,fleet,base,fakeRouter());
  assert.equal(result.travelBasis,'road');assert.equal(result.served,orders.length);
  for(const r of result.routes){
    assert.equal(r.km,r.stops.length+1);assert.equal(r.cost,c[r.type].fixed+r.km*c[r.type].km);
    assert.equal(r.roadLegs.length,r.stops.length+1);assert.ok(r.return<=c.end);
    assert.ok(r.volume<=c[r.type].capacity);assert.ok(r.weight<=c[r.type].weight);
    for(const s of r.stops){assert.ok(s.arrival>=s.open);assert.ok(s.finish<=s.close);assert.equal(s.cold,r.type==='A');}
    const pos=positionAt(r,r.depart+.5*c.zones[r.stops[0].zone].factor);
    assert.ok(Number.isFinite(pos.lat));assert.equal(pos.status,'In transit');
    const [a,b,d]=r.roadLegs[0].geometry.map(([lng,lat])=>({lng,lat}));
    const fraction=distance(a,b)/(distance(a,b)+distance(b,d));
    const duration=r.stops[0].arrival-r.stops[0].wait-r.depart;
    const bend=positionAt(r,r.depart+fraction*duration);
    assert.ok(Math.abs(bend.lng-b.lng)<1e-8&&Math.abs(bend.lat-b.lat)<1e-8,'GPS must pass through the road bend, not the straight chord');
  }
});

test('road-infeasible stops are removed and rerouted, not silently retained or counted complete',async()=>{
  const c={...copy(defaults),traffic:1,ban:{...defaults.ban,enabled:false}},orders=ordersFor(c),fleet=allocate(orders,c),base=plan(orders,c,fleet);
  const result=await validateRoadPlan(orders,c,fleet,base,fakeRouter(1000));
  assert.equal(result.served,0);assert.equal(result.routes.length,0);
  assert.equal(result.deliveryAssigned,0);assert.equal(result.unserved.length,orders.length);
  assert.ok(result.unassignedDeliveries.every(j=>/road/i.test(j.reason)));
  assert.equal(result.deliveryAssigned+result.unassignedDeliveries.length,result.deliveryTotal);
});

test('road restriction waiting and return legs remain consistent with shift and simulated GPS',async()=>{
  const c={...copy(defaults),start:420,traffic:1},orders=ordersFor(c),fleet=allocate(orders,c),base=plan(orders,c,fleet);
  const result=await validateRoadPlan(orders,c,fleet,base,fakeRouter(10));
  for(const r of result.routes){
    if(r.type==='B'){
      assert.ok(r.stops[0].banWait>0);assert.equal(positionAt(r,450).status,'Waiting / restriction');
      assert.ok(r.stops[0].arrival-r.stops[0].wait>=540);
    }
    assert.equal(positionAt(r,r.return).status,'Returned to depot');
    assert.ok(r.return<=c.end+1e-8);
  }
});

test('road trimming reroutes remaining stops and bounded validation conserves every job',async()=>{
  const c={...copy(defaults),traffic:1,ban:{...defaults.ban,enabled:false}},orders=ordersFor(c),fleet=allocate(orders,c),base=plan(orders,c,fleet);
  let calls=0;
  const router=async points=>{const r=await fakeRouter()(points);if(calls++===0)r.legs[0].minutes=1000;return r;};
  const result=await validateRoadPlan(orders,c,fleet,base,router,{recoverSpare:false}); // Isolate the trimming phase; recovery is tested separately.
  assert.ok(calls>1);assert.ok(result.routes.length>0);assert.ok(result.unassignedDeliveries.length>0);
  assert.equal(result.deliveryAssigned+result.unassignedDeliveries.length,result.deliveryTotal);
  for(const r of result.routes)assert.equal(r.roadLegs.length,r.stops.length+1);
});

test('road rejection of a dry portion leaves a partial parent and charges only its missing margin',async()=>{
  const c={...copy(defaults),traffic:1,ban:{...defaults.ban,enabled:false}};
  const order={...generateOrders(c)[0],quantities:[2,1,0,0,0],volume:.16,weight:42,cold:true};
  const fleet={A:1,B:1},base=plan([order],c,fleet);
  const router=points=>fakeRouter(points.some(p=>p.id?.endsWith('-D'))?1000:1)(points);
  const result=await validateRoadPlan([order],c,fleet,base,router);
  assert.equal(result.partial,1);assert.equal(result.served,0);assert.equal(result.deliveryAssigned,1);
  assert.equal(result.costs.lostMargin,2*c.costing.marginPerBox[0]);
});

test('provider failure rejects the whole road update and cancellation does not publish a partial plan',async()=>{
  const c=copy(defaults),orders=ordersFor(c),fleet=allocate(orders,c),base=plan(orders,c,fleet),before=copy(base);
  await assert.rejects(validateRoadPlan(orders,c,fleet,base,async()=>{throw Error('offline');}),/offline/);
  assert.deepEqual(base,before);
  const controller=new AbortController();controller.abort();
  await assert.rejects(validateRoadPlan(orders,c,fleet,base,fakeRouter(),{signal:controller.signal}),/abort/i);
  const mid=new AbortController();let calls=0;
  await assert.rejects(validateRoadPlan(orders,c,fleet,base,async points=>{if(++calls===2)mid.abort();return fakeRouter()(points);},{signal:mid.signal}),/abort/i);
  assert.deepEqual(base,before);
});

test('OSRM response parser rejects invalid geometry, missing legs and missing routes',()=>{
  assert.throws(()=>parseRoadResponse({code:'NoRoute'},2));
  assert.throws(()=>parseRoadResponse({code:'Ok',routes:[{legs:[]}]},2));
  assert.throws(()=>parseRoadResponse({code:'Ok',routes:[{legs:[{distance:1,duration:1,steps:[{geometry:{coordinates:[[NaN,14],[121,14]]}}]}]}],waypoints:[]},2));
});

test('OSRM snapping over one kilometre fails explicitly',()=>{
  const payload={code:'Ok',routes:[{legs:[{distance:2000,duration:120,steps:[{geometry:{coordinates:[[121,14],[121.01,14.01]]}}]}]}],waypoints:[{location:[121,14],distance:1000},{location:[121.01,14.01],distance:1}]};
  assert.equal(parseRoadResponse(payload,2).snaps[0].metres,1000);
  payload.waypoints[0].distance=1000.1;assert.throws(()=>parseRoadResponse(payload,2),/over 1 KM/);
});

test('OSRM client encodes coordinate-only requests, caches successes and rejects HTTP errors',async()=>{
  let calls=0;
  const payload={code:'Ok',routes:[{legs:[{distance:2000,duration:120,steps:[{geometry:{coordinates:[[121,14],[121.01,14.01]]}}]}]}],waypoints:[{location:[121,14],distance:0},{location:[121.01,14.01],distance:1}]};
  const client=createOsrmClient({intervalMs:0,fetchImpl:async url=>{calls++;assert.match(String(url),/route\/v1\/driving/);assert.ok(!String(url).includes('RET-'));return{ok:true,json:async()=>payload};}});
  const points=[{lng:121,lat:14},{lng:121.01,lat:14.01}];
  assert.equal((await client(points)).legs[0].km,2);await client(points);assert.equal(calls,1);
  const bad=createOsrmClient({intervalMs:0,fetchImpl:async()=>({ok:false,status:429})});
  await assert.rejects(bad(points),/429/);
});

test('extended cost separates operating charges and expected risk without charging idle trucks twice',()=>{
  const c=copy(defaults),orders=ordersFor(c),fleet={A:4,B:5},r=plan(orders,c,fleet),b=costBreakdown(r.routes,r.unassignedDeliveries,c,fleet);
  const usedA=r.routes.filter(x=>x.type==='A').length,usedB=r.routes.filter(x=>x.type==='B').length;
  assert.equal(b.idle,(4-usedA)*c.costing.A.idleDaily+(5-usedB)*c.costing.B.idleDaily);
  assert.ok(Math.abs(b.operating-(b.transport+b.idle+b.maintenance+b.tolls+b.overtime))<1e-8);
  assert.ok(Math.abs(b.economicTotal-(b.operating+b.spoilage+b.lostMargin))<1e-8);
  const empty=costBreakdown([],[],c,{A:0,B:0});for(const v of Object.values(empty))assert.equal(v,0);
});

test('cost overtime and opportunity exposure use duty time and only unassigned SKU portions',()=>{
  const c=copy(defaults),route={type:'B',cost:100,km:10,return:c.start+9*60,stops:[{quantities:[0,2,0,0,0]}]};
  const unassigned=[{quantities:[2,0,0,0,0]}];
  const b=costBreakdown([route],unassigned,c,{A:0,B:1});
  assert.equal(b.idle,0);assert.equal(b.overtime,c.costing.B.overtimeHour);
  assert.equal(b.maintenance,10*c.costing.B.maintenanceKm);assert.equal(b.tolls,c.costing.B.tollPerTour);
  assert.equal(b.spoilage,2*c.costing.frozenBoxValue*c.costing.spoilageRate);
  assert.equal(b.lostMargin,2*c.costing.marginPerBox[0]);
});

test('legacy settings receive editable costing defaults; invalid risks and rates fail validation',()=>{
  const c=copy(defaults);delete c.costing;
  assert.equal(validateConfig(c).costing.paidHours,8);
  assert.throws(()=>validateConfig({...copy(defaults),costing:{...defaults.costing,spoilageRate:1.1}}));
  assert.throws(()=>validateConfig({...copy(defaults),costing:{...defaults.costing,marginPerBox:[1]}}));
});
