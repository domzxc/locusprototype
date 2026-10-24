import test from 'node:test';
import assert from 'node:assert/strict';
import {copy,defaults,generateOrders,plan,validateConfig,positionAt,travel,DEPOT} from '../engine.js';
import {initializeNetwork,setDepotWorkload,networkPlans,summarizeNetwork,importNetworkSettings} from '../network.js';
import {crewAvailability,assumedAttendance} from '../staffing.js';

test('missing drivers or required helpers limits compatible trucks without removing inventory or idle costs',()=>{
 const c=copy(defaults),fleet={A:2,B:3};c.attendance=assumedAttendance(fleet);
 c.attendance.A.driversPresent=0;c.attendance.B.helpersPresent=1;
 const ready=crewAvailability(c,fleet);assert.deepEqual(ready.fleet,{A:0,B:1});
 const result=plan(generateOrders(c),c,fleet);
 assert.ok(result.routes.every(r=>r.type==='B'));assert.ok(result.routes.length<=1);
 assert.deepEqual(result.fleet,fleet);assert.ok(result.unassignedDeliveries.some(j=>j.cold&&/crew/i.test(j.reason)));
 assert.equal(result.costs.idle,2*c.costing.A.idleDaily+(3-result.routes.length)*c.costing.B.idleDaily);
});

test('helpers per truck, driver limits and zero-helper policy determine staffed vehicle availability',()=>{
 const c=copy(defaults),fleet={A:2,B:3};c.attendance=assumedAttendance(fleet);
 c.attendance.B.helpersPerTruck=2;
 assert.equal(crewAvailability(c,fleet).fleet.B,1);
 c.attendance.B.helpersPerTruck=0;c.attendance.B.helpersPresent=0;
 assert.equal(crewAvailability(c,fleet).fleet.B,3);
 c.attendance.B.driversPresent=1;assert.equal(crewAvailability(c,fleet).fleet.B,1);
});

test('attendance migrates once, stays depot-local and survives settings export/import including zero presence',()=>{
 const root=initializeNetwork(copy(defaults));assert.ok(root.network.Pasig.attendance);
 const attendance=copy(root.network.Pasig.attendance);attendance.A.driversPresent=0;attendance.B.helpersPresent=0;
 const next=setDepotWorkload(root,'Pasig',100,root.network.Pasig.currentFleet,attendance);
 const imported=importNetworkSettings({kind:'domtransport-settings',version:2,config:next});
 assert.deepEqual(imported.network.Pasig.attendance,attendance);
 assert.deepEqual(next.network.Cavite,root.network.Cavite);
 const runs=networkPlans(imported),total=summarizeNetwork(runs);
 assert.equal(runs.find(r=>r.name==='Pasig').result.routes.length,0);
 assert.ok(total.crewBlocked>=root.network.Pasig.currentFleet.A+root.network.Pasig.currentFleet.B);
 assert.ok(total.driversPresent<total.driversScheduled);assert.ok(total.helpersPresent<total.helpersScheduled);
});

test('invalid attendance is rejected atomically and spare crews cannot create trucks',()=>{
 const root=initializeNetwork(copy(defaults)),before=copy(root),attendance=copy(root.network.Pasig.attendance);
 attendance.A.driversPresent=attendance.A.driversScheduled+1;
 assert.throws(()=>setDepotWorkload(root,'Pasig',100,{A:2,B:6},attendance),/attendance|present|scheduled/i);
 assert.deepEqual(root,before);
 for(const value of [-1,1.5,4]){
  const c=copy(defaults);c.attendance=assumedAttendance({A:2,B:3});c.attendance.B.helpersPerTruck=value;
  assert.throws(()=>validateConfig(c));
 }
 const c=copy(defaults);c.attendance=assumedAttendance({A:10,B:10});
 assert.deepEqual(crewAvailability(c,{A:0,B:1}).fleet,{A:0,B:1});
});

test('GPS labels depot preparation separately and holds an overlapping first leg until ban end',()=>{
 const c={...copy(defaults),ban:{enabled:true,start:360,end:540,type:'B'}};
 const orders=generateOrders(c),route=plan(orders,c,{A:0,B:4}).routes[0];
 assert.ok(route);assert.equal(positionAt(route,c.start).status,'Depot preparation');
 for(const minute of [385,420,500,539]){
  const p=positionAt(route,minute);assert.equal(p.lng,DEPOT.lng);assert.equal(p.lat,DEPOT.lat);
  assert.equal(p.status,'Waiting / restriction');
 }
 assert.equal(route.depart+route.stops[0].banWait,540);
 assert.equal(positionAt(route,541).status,'In transit');
});

test('a pre-ban leg is allowed only when it finishes before the configured ban, and other types are unaffected',()=>{
 const c=copy(defaults),near={lng:DEPOT.lng+.001,lat:DEPOT.lat+.001,zone:0};
 assert.equal(travel(DEPOT,near,385,'B',c).leave,385);
 assert.equal(travel(DEPOT,near,419.99,'B',c).leave,540);
 assert.equal(travel(DEPOT,near,450,'A',c).leave,450);
});

test('staff attendance remains recorded on an empty-fleet day and road validation cannot bypass absence limits',async()=>{
 const {validateRoadPlan}=await import('../road-routing.js');
 const c=copy(defaults),fleet={A:2,B:3};c.attendance=assumedAttendance(fleet);
 const orders=generateOrders(c),base=plan(orders,c,fleet);
 c.attendance.A.driversPresent=0;c.attendance.B.helpersPresent=0;
 let calls=0;
 const road=await validateRoadPlan(orders,c,fleet,base,async()=>{calls++;throw Error('must not route an uncrewed truck');});
 assert.equal(calls,0);assert.equal(road.served,0);assert.equal(road.routes.length,0);
 assert.equal(road.deliveryAssigned+road.unassignedDeliveries.length,road.deliveryTotal);
 const root=initializeNetwork(copy(defaults));
 const empty=setDepotWorkload(root,'Pasig',0,{A:0,B:0});
 const run=networkPlans(empty).find(r=>r.name==='Pasig');
 assert.ok(run.result.staffing.driversPresent>0);assert.equal(run.result.staffing.crewBlocked,0);
 assert.equal(run.result.routes.length,0);
});

test('road-snapped depot coordinates do not make the truck jump off the depot during restriction waiting',()=>{
 const c={...copy(defaults),ban:{enabled:true,start:360,end:540,type:'B'}};
 const route=plan(generateOrders(c),c,{A:0,B:4}).routes[0];
 route.roadLegs=[{km:1,minutes:1,geometry:[[DEPOT.lng+.001,DEPOT.lat+.001],[route.stops[0].lng,route.stops[0].lat]]}];
 const position=positionAt(route,450);
 assert.equal(position.lng,DEPOT.lng);assert.equal(position.lat,DEPOT.lat);
 assert.equal(position.status,'Waiting / restriction');
});
