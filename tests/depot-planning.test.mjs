import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults,copy,generateOrders,validateConfig} from '../engine.js';
import {initializeNetwork,setDepotWorkload,networkPlans,importNetworkSettings} from '../network.js';

test('depot order controls change day demand without deleting existing retailer profiles',()=>{
  const root=initializeNetwork(copy(defaults)),original=copy(root.network.Pasig.retailers);
  const down=setDepotWorkload(root,'Pasig',25,{A:1,B:3});
  assert.equal(generateOrders(down.network.Pasig).length,25);
  assert.deepEqual(down.network.Pasig.retailers,original);
  const zero=setDepotWorkload(down,'Pasig',0,{A:0,B:0});
  assert.equal(generateOrders(zero.network.Pasig).length,0);
  const up=setDepotWorkload(zero,'Pasig',120,{A:2,B:8});
  assert.equal(generateOrders(up.network.Pasig).length,120);
  assert.deepEqual(up.network.Pasig.retailers.slice(0,100),original);
  assert.equal(new Set(Object.values(up.network).flatMap(c=>c.retailers.map(r=>r.id))).size,620);
  for(const name of Object.keys(root.network).filter(n=>n!=='Pasig'))assert.deepEqual(up.network[name],root.network[name]);
});

test('current fleet stays fixed across peak scenarios and plans expose the resulting shortage',()=>{
  const root=setDepotWorkload(initializeNetwork(copy(defaults)),'Pasig',100,{A:0,B:0});
  for(const scenario of ['normal','peak']){
    const run=networkPlans(root,scenario).find(r=>r.name==='Pasig');
    assert.deepEqual(run.fleet,{A:0,B:0});assert.ok(run.recommended.A>0&&run.recommended.B>0);
    assert.equal(run.result.served,0);assert.equal(run.result.unserved.length,100);
  }
  const imported=importNetworkSettings({kind:'domtransport-settings',version:2,config:root});
  assert.deepEqual(imported.network.Pasig.currentFleet,{A:0,B:0});
});

test('legacy networks gain assumed normal fleets once and reject invalid demand/fleet edits atomically',()=>{
  const root=initializeNetwork(copy(defaults)),old=copy(root);
  for(const c of Object.values(old.network))delete c.currentFleet;
  delete old.currentFleet;
  const migrated=initializeNetwork(old);
  for(const c of Object.values(migrated.network))assert.ok(Number.isInteger(c.currentFleet.A)&&Number.isInteger(c.currentFleet.B));
  const before=copy(root);
  for(const n of [-1,501,1.5])assert.throws(()=>setDepotWorkload(root,'Pasig',n,{A:1,B:1}));
  assert.throws(()=>setDepotWorkload(root,'Pasig',10,{A:-1,B:1}));
  assert.throws(()=>setDepotWorkload(root,'Pasig',10,undefined));
  assert.throws(()=>validateConfig({...copy(defaults),dailyOrders:1.5}));
  assert.deepEqual(root,before);
});

test('idle current trucks remain visible and incur idle cost when day demand is zero',()=>{
  const root=setDepotWorkload(initializeNetwork(copy(defaults)),'Pasig',0,{A:2,B:3});
  const run=networkPlans(root).find(r=>r.name==='Pasig');
  assert.equal(run.result.routes.length,0);assert.deepEqual(run.recommended,{A:0,B:0});
  assert.equal(run.result.costs.idle,2*run.config.costing.A.idleDaily+3*run.config.costing.B.idleDaily);
});

test('order selection retains closed exceptions and respects archived-profile capacity without data loss',()=>{
  let root=initializeNetwork(copy(defaults));
  root.network.Pasig.retailers[0].closed=true;
  const small=setDepotWorkload(root,'Pasig',1,{A:1,B:1});
  assert.equal(networkPlans(small).find(r=>r.name==='Pasig').result.unserved.length,1);
  root=setDepotWorkload(root,'Pasig',500,{A:2,B:6});
  root.network.Pasig.retailers[0].enabled=false;
  const before=copy(root);
  assert.throws(()=>setDepotWorkload(root,'Pasig',500,{A:2,B:6}),/500 profiles/);
  assert.deepEqual(root,before);
});
