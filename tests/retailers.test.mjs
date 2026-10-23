import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { defaults, copy, generateOrders, getRetailers, importRetailerMaster, validateConfig, plan, allocate, regionalAllocation } from '../engine.js';

test('materializing the synthetic retailer master preserves the original demo',()=>{
  const c=copy(defaults), original=generateOrders(c), retailers=getRetailers(c);
  assert.equal(retailers.length,100);
  assert.ok(retailers.every(r=>r.synthetic===true&&r.distributor==='Pasig'));
  const managed=generateOrders({...c,retailers});
  for(let i=0;i<100;i++)for(const key of ['id','name','lng','lat','open','close','volume','weight','service'])assert.deepEqual(managed[i][key],original[i][key]);
});

test('edited profiles drive order identity, location and receiving windows',()=>{
  const c=copy(defaults), retailers=getRetailers(c);
  retailers[0]={...retailers[0],name:'Demo Corner Store',address:'Synthetic Block 12',lat:14.58,lng:121.08,open:600,close:720};
  const next=validateConfig({...c,retailers});
  const order=generateOrders(next)[0];
  assert.equal(order.name,'Demo Corner Store');assert.equal(order.address,'Synthetic Block 12');
  assert.equal(order.lat,14.58);assert.equal(order.lng,121.08);
  assert.equal(order.open,600);assert.equal(order.close,720);
});

test('archived and other-distributor profiles leave Pasig demand without changing remaining baskets',()=>{
  const c=copy(defaults), retailers=getRetailers(c), before=generateOrders({...c,retailers});
  retailers[0].enabled=false;retailers[1].distributor='Quezon City';
  const after=generateOrders({...c,retailers});
  assert.equal(after.length,98);
  assert.ok(!after.some(o=>['RET-001','RET-002'].includes(o.id)));
  assert.deepEqual(after.find(o=>o.id==='RET-003').quantities,before.find(o=>o.id==='RET-003').quantities);
  assert.equal(regionalAllocation({...c,retailers}).find(d=>d.name==='Pasig').daily,98);
  assert.deepEqual(regionalAllocation({...c,retailers}).filter(d=>d.name!=='Pasig'),regionalAllocation(c).filter(d=>d.name!=='Pasig'));
});

test('closed managed retailers remain in demand and visible in exceptions',()=>{
  const c=copy(defaults), retailers=getRetailers(c);retailers[0].closed=true;
  const next={...c,retailers}, orders=generateOrders(next), result=plan(orders,next,allocate(orders,next));
  assert.equal(orders.length,100);assert.ok(result.unserved.some(o=>o.id==='RET-001'&&/closed/i.test(o.reason)));
});

test('retailer import rejects duplicate identities, public references and invalid records',()=>{
  const c=copy(defaults), retailers=getRetailers(c);
  const payload={kind:'domtransport-retailer-master',version:1,synthetic:true,retailers};
  assert.equal(importRetailerMaster(payload,c).retailers.length,100);
  for(const invalid of [
    {...payload,kind:'public-reference-only'},
    {...payload,retailers:[retailers[0],retailers[0]]},
    {...payload,retailers:[{...retailers[0],synthetic:false}]},
    {...payload,retailers:[{...retailers[0],lat:null}]},
    {...payload,retailers:[{...retailers[0],open:800,close:700}]},
    {...payload,retailers:[{...retailers[0],distributor:'Unknown'}]}
  ])assert.throws(()=>importRetailerMaster(invalid,c));
});

test('master import replaces old receiving overrides atomically and empty masters are supported',()=>{
  const c={...copy(defaults),receivingHours:{'RET-001':{open:480,close:540,closed:false}}};
  const retailers=getRetailers(c);retailers[0].open=660;retailers[0].close=900;
  const next=importRetailerMaster({kind:'domtransport-retailer-master',version:1,synthetic:true,retailers},c);
  assert.deepEqual(next.receivingHours,{});assert.equal(generateOrders(next)[0].open,660);
  const empty={...next,retailers:[]};assert.equal(generateOrders(empty).length,0);
  assert.equal(plan([],empty,{A:0,B:0}).served,0);
});

test('legacy receiving overrides cannot replace managed identity or distributor assignment',()=>{
  const c=copy(defaults), retailers=getRetailers(c);
  const receivingHours={'RET-001':{open:600,close:800,closed:true,name:'Unexpected name',distributor:'Quezon City',enabled:false}};
  const profile=getRetailers({...c,retailers,receivingHours})[0];
  assert.equal(profile.name,retailers[0].name);assert.equal(profile.distributor,'Pasig');assert.equal(profile.enabled,true);
  assert.equal(profile.open,600);assert.equal(profile.closed,true);
});

test('public reference data stays source-attributed and cannot become a dispatch master',async()=>{
  const reference=JSON.parse(await readFile(new URL('../src/data/metro-manila-retailer-references.json',import.meta.url),'utf-8'));
  assert.equal(reference.referenceOnly,true);assert.match(reference.sourceUrl,/^https:\/\/www\.maya\.ph\//);
  assert.ok(reference.records.length>0);
  assert.ok(reference.records.every(r=>r.receivingWindows===null&&r.coordinates===null));
  assert.equal(new Set(reference.records.map(r=>r.id)).size,reference.records.length);
  assert.throws(()=>importRetailerMaster(reference,defaults));
});
