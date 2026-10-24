import test from 'node:test';
import assert from 'node:assert/strict';
import {copy,defaults,generateOrders,plan} from '../engine.js';
import {initializeNetwork} from '../network.js';
import {experimentCrew,fleetUsage} from '../fleet-experiment.js';

test('extra Bulacan trucks stay crew-blocked until temporary experiment crews are included',()=>{
 const c=initializeNetwork(copy(defaults)).network.Bulacan,before=copy(c),fleet={A:2,B:10},orders=generateOrders(c);
 const current=plan(orders,c,fleet),trial=experimentCrew(c,fleet,true),expanded=plan(orders,trial.config,fleet);
 assert.equal(current.staffing.fleet.B,6);assert.equal(expanded.staffing.fleet.B,10);
 assert.equal(trial.drivers,4);assert.equal(trial.helpers,4);
 assert.ok(expanded.routes.filter(r=>r.type==='B').length>current.routes.filter(r=>r.type==='B').length);
 assert.deepEqual(c,before);assert.equal(experimentCrew(c,fleet,false).config,c);
 const usage=fleetUsage(current);assert.equal(usage.B.blocked,4);assert.equal(usage.B.allocated,10);
 for(const type of ['A','B'])assert.equal(usage[type].used+usage[type].idle+usage[type].blocked,usage[type].allocated);
});
test('temporary crew respects zero-helper policy, staffing caps and idle fully covered fleets',()=>{
 const c=initializeNetwork(copy(defaults)).network.Pasig;c.attendance.B.helpersPerTruck=0;
 const trial=experimentCrew(c,{A:2,B:10},true);assert.equal(trial.helpers,0);assert.equal(trial.drivers,4);
 const p=plan([],trial.config,{A:2,B:10}),u=fleetUsage(p);assert.equal(u.B.idle,10);assert.equal(u.B.used,0);
 c.attendance.B.driversScheduled=1500;c.attendance.B.driversPresent=0;
 assert.equal(experimentCrew(c,{A:2,B:10},true).config.attendance.B.driversPresent,0);
});
