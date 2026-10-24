import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults,copy,generateOrders,validateConfig,scenarioConfig} from '../engine.js';
import {initializeNetwork,networkPlans,summarizeNetwork} from '../network.js';
import {planningScenario} from '../scenarios.js';

test('peak increases parent orders deterministically without creating or editing retailer masters',()=>{
 const c=initializeNetwork(copy(defaults)).network.Pasig,before=copy(c);
 const normal=generateOrders(c),peak=generateOrders(c,'peak');
 assert.equal(normal.length,100);assert.equal(peak.length,150);assert.deepEqual(peak,generateOrders(c,'peak'));
 assert.equal(new Set(peak.map(o=>o.id)).size,150);
 assert.ok(peak.every(o=>c.retailers.some(r=>r.id===o.retailerId)));
 assert.deepEqual(c,before);
 for(let i=0;i<normal.length;i++)assert.ok(peak[i].quantities.every((q,p)=>q>=normal[i].quantities[p]));
 c.dailyOrders=0;assert.equal(generateOrders(c,'peak').length,0);
 c.dailyOrders=100;c.peakOrders=1.1;assert.equal(generateOrders(c,'peak').length,110);
});

test('peak shift extends only vehicle working hours and preserves receiving windows and saved settings',()=>{
 const c=initializeNetwork(copy(defaults)).network.Pasig,before=copy(c),peak=scenarioConfig(c,'peak');
 assert.equal(peak.end,1200);assert.equal(c.end,1080);assert.deepEqual(peak.retailers,c.retailers);
 assert.equal(scenarioConfig({...c,end:1380},'peak').end,1440);
 assert.deepEqual(c,before);
});

test('proposed peak resources add declared seasonal capacity and replacement crews without mutating actual inventory or attendance',()=>{
 const c=initializeNetwork(copy(defaults)).network.Pasig;c.attendance.B.helpersPresent=0;const before=copy(c);
 const current=planningScenario(c,'peak','current'),proposed=planningScenario(c,'peak','proposed');
 assert.deepEqual(current.fleet,c.currentFleet);assert.ok(proposed.fleet.B>current.fleet.B);
 assert.ok(proposed.temporaryHelpers>0);assert.ok(proposed.temporaryDrivers>0);
 assert.equal(proposed.config.attendance.B.helpersPresent,proposed.fleet.B*proposed.config.attendance.B.helpersPerTruck);
 assert.deepEqual(c,before);
});

test('default funded seasonal network shows more orders, resources and operating spend with unmet demand still visible',()=>{
 const root=initializeNetwork(copy(defaults));
 const normal=summarizeNetwork(networkPlans(root)),peak=summarizeNetwork(networkPlans(root,'peak','proposed'));
 assert.equal(normal.total,600);assert.equal(peak.total,900);
 assert.ok(peak.allocated>normal.allocated);assert.ok(peak.operatingCost>normal.operatingCost);
 const current=networkPlans(root,'peak','current');
 for(const run of current)assert.deepEqual(run.fleet,root.network[run.name].currentFleet);
 assert.ok(current.some(r=>r.result.unserved.length>0));
});

test('legacy settings gain peak assumptions and reject invalid uplift or overtime inputs',()=>{
 const c=copy(defaults);delete c.peakOrders;delete c.peakExtraMinutes;
 assert.equal(validateConfig(c).peakOrders,1.5);assert.equal(validateConfig(c).peakExtraMinutes,120);
 assert.throws(()=>validateConfig({...c,peakOrders:0}));assert.throws(()=>validateConfig({...c,peakExtraMinutes:-1}));
});

test('extra peak transactions use only enabled assigned retailers and retain managed receiving restrictions',()=>{
 const c=initializeNetwork(copy(defaults)).network.Pasig;
 c.retailers=c.retailers.slice(0,3);c.retailers[0].enabled=false;c.retailers[1].closed=true;
 c.dailyOrders=2;c.peakOrders=2;
 const orders=generateOrders(c,'peak');assert.equal(orders.length,4);
 assert.equal(new Set(orders.map(o=>o.id)).size,4);
 assert.ok(orders.every(o=>o.retailerId!==c.retailers[0].id));
 for(const o of orders){const master=c.retailers.find(r=>r.id===o.retailerId);assert.equal(o.open,master.open);assert.equal(o.close,master.close);assert.equal(o.receivingClosed,master.closed);}
 assert.equal(generateOrders({...c,retailers:[]},'peak').length,0);
});
