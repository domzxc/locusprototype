import test from 'node:test';
import assert from 'node:assert/strict';
import {copy,defaults,generateOrders,plan,positionAt} from '../engine.js';
import {validateRoadPlan} from '../road-routing.js';

// Proxy travel packs both jobs on B-01; road time forces its second job off.
const router=async points=>({provider:'OSRM driving',legs:points.slice(1).map((p,i)=>({km:1,minutes:i===1&&points.length>3?200:1,geometry:[[points[i].lng,points[i].lat],[p.lng,p.lat]]})),snaps:points.map(p=>({...p,metres:0}))});
function fixture(){const c=copy(defaults);c.traffic=1;c.ban.enabled=false;
 const orders=generateOrders(c).slice(0,2).map(o=>({...o,lng:121.071,lat:14.577,quantities:[1,0,0,0,0],cold:false,volume:.035,weight:12,open:480,close:540}));return {c,orders};}
test('an added staffed truck automatically receives a road-rejected job and road GPS geometry',async()=>{
 const {c,orders}=fixture(),one={A:0,B:1},two={A:0,B:2};
 const constrained=await validateRoadPlan(orders,c,one,plan(orders,c,one),router);
 assert.equal(constrained.served,1);
 const expanded=await validateRoadPlan(orders,c,two,plan(orders,c,two),router);
 assert.equal(expanded.served,2);assert.equal(expanded.routes.length,2);
 assert.equal(new Set(expanded.routes.map(r=>r.id)).size,2);assert.ok(expanded.routes.some(r=>r.id==='B-02'));
 for(const r of expanded.routes){assert.equal(r.roadLegs.length,r.stops.length+1);assert.ok(r.return<=c.end);assert.ok(r.stops.every(s=>s.finish<=s.close));assert.equal(positionAt(r,r.depart+.5).status,'In transit');}
 assert.equal(expanded.deliveryAssigned+expanded.unassignedDeliveries.length,expanded.deliveryTotal);
});
test('road recovery cannot use trucks blocked by attendance or duplicate served portions',async()=>{
 const {c,orders}=fixture();c.attendance={A:{driversScheduled:0,driversPresent:0,helpersScheduled:0,helpersPresent:0,helpersPerTruck:1},B:{driversScheduled:1,driversPresent:1,helpersScheduled:1,helpersPresent:1,helpersPerTruck:1}};
 const fleet={A:0,B:4},r=await validateRoadPlan(orders,c,fleet,plan(orders,c,fleet),router);
 assert.equal(r.routes.length,1);assert.equal(r.served,1);assert.equal(r.staffing.blocked.B,3);
 const ids=r.routes.flatMap(v=>v.stops.map(s=>s.id));assert.equal(ids.length,new Set(ids).size);
});
test('recovery conserves mixed-temperature jobs and does not reload already used vehicles',async()=>{
 const {c,orders}=fixture();orders[1]={...orders[1],quantities:[1,1,0,0,0],cold:true,volume:.125,weight:30};
 const fleet={A:1,B:2},r=await validateRoadPlan(orders,c,fleet,plan(orders,c,fleet),router);
 assert.equal(r.served,2);assert.equal(r.deliveryAssigned,3);assert.equal(r.unassignedDeliveries.length,0);
 assert.equal(r.routes.length,3);
 for(const route of r.routes){assert.ok(route.stops.every(j=>j.cold===(route.type==='A')));assert.ok(route.volume<=c[route.type].capacity);assert.ok(route.weight<=c[route.type].weight);}
 const ids=r.routes.flatMap(v=>v.stops.map(j=>j.id));assert.equal(new Set(ids).size,3);
});
test('failure during spare-truck validation never publishes a partial recovery or mutates the base plan',async()=>{
 const {c,orders}=fixture(),fleet={A:0,B:2},base=plan(orders,c,fleet),before=copy(base);let recovery=false;
 await assert.rejects(validateRoadPlan(orders,c,fleet,base,async points=>{if(recovery)throw Error('recovery offline');return router(points);},{onProgress:message=>{if(message.startsWith('Spare-truck recovery:'))recovery=true;}}),/recovery offline/);
 assert.deepEqual(base,before);
});
