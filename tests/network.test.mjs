import test from 'node:test';
import assert from 'node:assert/strict';
import { defaults, copy, generateOrders, plan, allocate, positionAt, regionalAllocation, validateConfig, getRetailers, importRetailerMaster, travel } from '../engine.js';
import { initializeNetwork, distributorConfig, updateDistributor, networkPlans, summarizeNetwork, importNetworkSettings, nextRetailerId } from '../network.js';

test('legacy Pasig settings migrate without losing edits or explicit empty master',()=>{
  const c=copy(defaults);c.orders=200;c.traffic=2;
  const expected=generateOrders(c), root=initializeNetwork(c);
  const actual=generateOrders(distributorConfig(root,'Pasig'));
  for(let i=0;i<expected.length;i++)for(const key of Object.keys(expected[i]))assert.deepEqual(actual[i][key],expected[i][key]);
  assert.equal(distributorConfig(root,'Pasig').traffic,2);
  assert.equal(Object.keys(root.network).length,6);
  assert.equal(generateOrders(distributorConfig(initializeNetwork({...c,retailers:[]}),'Pasig')).length,0);
  assert.deepEqual(initializeNetwork(root),root);
});

test('six independent masters have local zones, globally unique retailer IDs and depot-based routes',()=>{
  const root=initializeNetwork(copy(defaults)), ids=new Set(), depots=new Set();
  for(const [name,c] of Object.entries(root.network)) {
    assert.equal(c.distributor,name);assert.equal(c.retailers.length,100);
    assert.ok(c.retailers.every(r=>r.distributor===name));
    for(const r of c.retailers){assert.ok(!ids.has(r.id));ids.add(r.id);}
    depots.add(JSON.stringify(c.depot));
    for(const scenario of ['normal','peak']) {
      const orders=generateOrders(c,scenario), result=plan(orders,c,allocate(orders,c));
      assert.ok(result.routes.length>0);
      for(const route of result.routes){
      assert.ok(Math.abs(route.stops[0].legKm-travel(c.depot,route.stops[0],route.depart,route.type,c).km)<1e-8);
      const before=positionAt(route,c.start),after=positionAt(route,route.return);
      assert.equal(before.lng,c.depot.lng);assert.equal(before.lat,c.depot.lat);
      assert.equal(after.lng,c.depot.lng);assert.equal(after.lat,c.depot.lat);
      assert.ok(route.volume<=c[route.type].capacity+1e-8);
      assert.ok(route.weight<=c[route.type].weight+1e-8);
      assert.ok(route.return<=c.end+1e-8);
      for(const stop of route.stops){assert.ok(stop.arrival>=stop.open-1e-8);assert.ok(stop.finish<=stop.close+1e-8);assert.equal(stop.cold,route.type==='A');}
      }
    }
  }
  assert.equal(depots.size,6);assert.equal(ids.size,600);
});

test('editing one distributor preserves the others and network totals equal local plans',()=>{
  const root=initializeNetwork(copy(defaults)), c=copy(distributorConfig(root,'Cavite'));
  c.traffic=2;c.ban.enabled=false;c.retailers[0].closed=true;
  const next=updateDistributor(root,'Cavite',c);
  for(const name of Object.keys(root.network).filter(n=>n!=='Cavite'))assert.deepEqual(next.network[name],root.network[name]);
  const runs=networkPlans(next,'peak'), totals=summarizeNetwork(runs);
  assert.equal(totals.total,runs.reduce((s,r)=>s+r.result.total,0));
  assert.equal(totals.vehicles,runs.reduce((s,r)=>s+r.result.routes.length,0));
  assert.equal(totals.served,runs.reduce((s,r)=>s+r.result.served,0));
  assert.equal(totals.cost,runs.reduce((s,r)=>s+r.result.cost,0));
  assert.ok(runs.find(r=>r.name==='Cavite').result.unserved.some(o=>o.id===c.retailers[0].id));
  assert.equal(regionalAllocation(next).find(d=>d.name==='Cavite').daily,100);
  assert.deepEqual(validateConfig(JSON.parse(JSON.stringify(next))),next);
});

test('network validation rejects missing distributors, nested networks, wrong ownership and invalid depots',()=>{
  const root=initializeNetwork(copy(defaults));
  const missing=copy(root);delete missing.network.Cavite;assert.throws(()=>validateConfig(missing));
  const nested=copy(root);nested.network.Cavite.network={};assert.throws(()=>validateConfig(nested));
  const wrong=copy(root);wrong.network.Cavite.retailers[0].distributor='Pasig';assert.throws(()=>validateConfig(wrong));
  const bad=copy(root);bad.network.Cavite.depot.lat=null;assert.throws(()=>validateConfig(bad));
  assert.throws(()=>distributorConfig(root,'Unknown'));
});

test('migration preserves legacy profiles already mapped to another distributor',()=>{
  const c=copy(defaults);c.retailers=getRetailers(c);c.retailers[0].distributor='Makati';
  c.receivingHours={'RET-001':{open:600,close:750,closed:true}};
  const root=initializeNetwork(c);
  assert.ok(root.network.Makati.retailers.some(r=>r.id==='RET-001'));
  assert.equal(root.network.Makati.retailers.find(r=>r.id==='RET-001').open,600);
  assert.equal(root.network.Makati.retailers.find(r=>r.id==='RET-001').closed,true);
  assert.ok(!root.network.Pasig.retailers.some(r=>r.id==='RET-001'));
});

test('network settings import is atomic, backward compatible and rejects plan exports',()=>{
  const root=initializeNetwork(copy(defaults));
  assert.deepEqual(importNetworkSettings({kind:'domtransport-settings',version:2,config:root}),root);
  assert.equal(Object.keys(importNetworkSettings({version:1,config:defaults}).network).length,6);
  assert.throws(()=>importNetworkSettings({version:2,config:root}));
  const bad=copy(root);bad.network.Cavite.traffic=-1;
  assert.throws(()=>importNetworkSettings({kind:'domtransport-settings',version:2,config:bad}));
  assert.equal(root.network.Cavite.traffic,1.25);
});

test('retailer master replacement is scoped to its distributor, including empty files',()=>{
  const root=initializeNetwork(copy(defaults)), local=root.network.Cavite;
  const payload={kind:'domtransport-retailer-master',version:1,synthetic:true,distributor:'Makati',retailers:[]};
  assert.throws(()=>importRetailerMaster(payload,local));
  assert.throws(()=>importRetailerMaster({...payload,distributor:'Cavite',retailers:root.network.Makati.retailers},local));
  assert.equal(importRetailerMaster({...payload,distributor:'Cavite'},local).retailers.length,0);
});

test('new retailer IDs avoid imported IDs anywhere in the network',()=>{
  assert.equal(nextRetailerId(['RET-001','RET-60100','RET-900000']),'RET-900001');
  assert.equal(nextRetailerId([]),'RET-001');
  assert.throws(()=>nextRetailerId(['RET-999999']));
});

test('network summaries handle six empty local masters without fake coverage',()=>{
  let root=initializeNetwork(copy(defaults));
  for(const name of Object.keys(root.network))root=updateDistributor(root,name,{...root.network[name],retailers:[]});
  const totals=summarizeNetwork(networkPlans(root));
  for(const value of Object.values(totals))assert.equal(value,0);
});
