import test from 'node:test';
import assert from 'node:assert/strict';
import { defaults, copy, generateOrders, splitOrders, allocate, plan, travel, validateConfig, DEPOT, positionAt, regionalAllocation } from '../engine.js';

test('synthetic demand is repeatable and peak quantities explain the payload', () => {
  const c = copy(defaults);
  assert.deepEqual(generateOrders(c), generateOrders(c));
  assert.equal(generateOrders(c).length, 100);
  for (const order of generateOrders(c, 'peak')) {
    assert.ok(order.quantities.every(Number.isInteger));
    const volume = order.quantities.reduce((s, q, p) => s + q * [.035,.09,.05,.22,.04][p], 0);
    assert.ok(Math.abs(order.volume - volume) < 1e-8);
  }
});

test('plans preserve cold chain, payloads, full windows, shift end and order conservation', () => {
  for (const seed of [1, 42, 250]) for (const scenario of ['normal', 'peak']) {
    const c = {...copy(defaults), seed};
    const orders = generateOrders(c, scenario);
    const result = plan(orders, c, allocate(orders, c));
    const ids = result.routes.flatMap(r => r.stops.map(o => o.id));
    const deliveries=splitOrders(orders,c);
    assert.equal(new Set([...ids, ...result.unassignedDeliveries.map(o => o.id)]).size, deliveries.length);
    assert.equal(ids.length + result.unassignedDeliveries.length, deliveries.length);
    const missedParents=new Set(result.unassignedDeliveries.map(o=>o.parentId));
    assert.equal(result.served,orders.length-missedParents.size);
    for (const route of result.routes) {
      assert.ok(route.volume <= c[route.type].capacity + 1e-8);
      assert.ok(route.weight <= c[route.type].weight + 1e-8);
      assert.ok(route.return <= c.end);
      let previous=DEPOT, clock=route.depart;
      for (const stop of route.stops) {
        assert.ok(!stop.cold || route.type === 'A');
        assert.equal(stop.shipment,route.type==='A'?'frozen':'dry');
        assert.ok(route.type==='A'?stop.quantities.every((q,i)=>i===1||q===0):stop.quantities[1]===0);
        assert.ok(stop.arrival >= stop.open && stop.finish <= stop.close);
        const leg=travel(previous,stop,clock,route.type,c);
        assert.ok(Math.abs(stop.arrival-Math.max(leg.arrival,stop.open))<1e-8);
        assert.ok(Math.abs(stop.finish-stop.arrival-stop.service)<1e-8);
        previous=stop; clock=stop.finish;
      }
      assert.ok(Math.abs(travel(previous,DEPOT,clock,route.type,c).arrival-route.return)<1e-8);
      assert.ok(Math.abs(route.cost-(c[route.type].fixed+route.km*c[route.type].km))<1e-8);
    }
  }
});

test('cold orders cannot be assigned when only dry trucks are available', () => {
  const orders=generateOrders(defaults).filter(o=>o.cold);
  const result=plan(orders,defaults,{A:0,B:20});
  assert.equal(result.served,0);
  assert.equal(result.unserved.length,orders.length);
});

test('weight capacity binds even when an order fits volume capacity', () => {
  const c=copy(defaults);
  c.A.weight=1; c.B.weight=1;
  const result=plan(generateOrders(c),c,{A:10,B:10});
  assert.equal(result.served,0);
  assert.equal(result.unserved.length,100);
  assert.ok(result.unassignedDeliveries.every(o=>o.reason==='Order exceeds compatible vehicle capacity'));
});

test('GPS waits at origin during the illustrative restriction', () => {
  const c={...copy(defaults),start:420,loading:0}, orders=generateOrders(c);
  const route=plan(orders,c,allocate(orders,c)).routes.find(r=>r.type==='B');
  assert.ok(route.stops[0].banWait>0);
  const pos=positionAt(route,480);
  assert.equal(pos.lng,DEPOT.lng); assert.equal(pos.lat,DEPOT.lat);
  assert.equal(pos.status,'Waiting / restriction');
});

test('insufficient fleet exposes every missed order and never reports fake coverage', () => {
  const orders = generateOrders(defaults);
  const result = plan(orders, defaults, {A:0, B:0});
  assert.equal(result.served, 0);
  assert.equal(result.coverage, 0);
  assert.equal(result.unserved.length, 100);
});

test('a journey crossing the illustrative ban waits before moving', () => {
  const c = copy(defaults);
  const leg = travel(DEPOT, {lng:121.09, lat:14.59, zone:0}, 419, 'B', c);
  assert.equal(leg.leave, c.ban.end);
  assert.equal(leg.wait, c.ban.end - 419);
  assert.equal(travel(DEPOT, DEPOT, 419, 'A', c).wait, 0);
});

test('oversize and impossible windows stay unserved', () => {
  const c = copy(defaults);
  const orders = generateOrders(c).slice(0, 2);
  orders[0] = {...orders[0], volume:1000};
  orders[1] = {...orders[1], open:0, close:1};
  const result = plan(orders, c, {A:2, B:2});
  assert.equal(result.unserved.length, 2);
});

test('import validation rejects malformed coordinates and labels', () => {
  const c = copy(defaults);
  c.zones[0].lng = null;
  assert.throws(() => validateConfig(c));
  assert.throws(() => validateConfig(null));
  assert.throws(() => validateConfig({...copy(defaults), end:360}));
});

test('regional proxy covers 50,000 retailers and Pasig matches daily allocation', () => {
  const rows=regionalAllocation(defaults);
  assert.equal(rows.reduce((s,r)=>s+r.retailers,0),50000);
  assert.deepEqual(rows.find(r=>r.name==='Pasig').normal,allocate(generateOrders(defaults),defaults));
  for(const r of rows) { assert.ok(r.peak.A>=r.normal.A); assert.ok(r.peak.B>=r.normal.B); }
});

test('modeled GPS remains at depot before dispatch and returns at route completion', () => {
  const c=copy(defaults), orders=generateOrders(c);
  const route=plan(orders,c,allocate(orders,c)).routes[0];
  const start=positionAt(route,c.start), end=positionAt(route,route.return+1);
  assert.equal(start.lng,DEPOT.lng); assert.equal(start.lat,DEPOT.lat);
  assert.equal(end.lng,DEPOT.lng); assert.equal(end.lat,DEPOT.lat);
  assert.equal(end.status,'Returned to depot');
});

test('retailer receiving hours override generated windows and expose infeasible handling', () => {
  const c={...copy(defaults),receivingHours:{'RET-001':{open:600,close:601,closed:false}}};
  const orders=generateOrders(c);
  assert.equal(orders[0].open,600);
  assert.equal(orders[0].close,601);
  const result=plan(orders,c,{A:20,B:20});
  assert.ok(result.unserved.some(o=>o.id==='RET-001' && /receiving window/i.test(o.reason)));
});

test('closed retailers remain unassigned even with abundant vehicles', () => {
  const c={...copy(defaults),receivingHours:{'RET-001':{open:480,close:1020,closed:true}}};
  const orders=generateOrders(c), result=plan(orders,c,{A:20,B:20});
  assert.ok(result.unserved.some(o=>o.id==='RET-001' && /closed/i.test(o.reason)));
  assert.ok(!result.routes.flatMap(r=>r.stops).some(o=>o.parentId==='RET-001'));
  assert.ok(result.coverage<1);
});

test('mixed retailer baskets become separate frozen and dry deliveries with conserved payload', () => {
  const c=copy(defaults), mixed=generateOrders(c).find(o=>o.cold&&o.quantities.some((q,i)=>i!==1&&q>0));
  const deliveries=splitOrders([mixed],c);
  assert.equal(deliveries.length,2);
  assert.ok(deliveries.every(d=>d.parentId===mixed.id));
  assert.ok(Math.abs(deliveries.reduce((s,d)=>s+d.volume,0)-mixed.volume)<1e-8);
  assert.ok(Math.abs(deliveries.reduce((s,d)=>s+d.weight,0)-mixed.weight)<1e-8);
  for(let i=0;i<5;i++)assert.equal(deliveries.reduce((s,d)=>s+d.quantities[i],0),mixed.quantities[i]);
  assert.equal(deliveries.reduce((s,d)=>s+d.service,0),mixed.service+c.stopBase);
});

test('a dry-only assignment of a mixed basket counts as partial, not full order coverage', () => {
  const c=copy(defaults), mixed=generateOrders(c).find(o=>o.cold&&o.quantities.some((q,i)=>i!==1&&q>0));
  const result=plan([mixed],c,{A:0,B:2});
  assert.equal(result.served,0);
  assert.equal(result.partial,1);
  assert.equal(result.coverage,0);
  assert.equal(result.deliveryAssigned,1);
  assert.equal(result.unserved[0].id,mixed.id);
  assert.match(result.unserved[0].reason,/partially planned/i);
});

test('receiving hour imports validate and older settings gain an empty master', () => {
  const legacy=copy(defaults); delete legacy.receivingHours;
  assert.deepEqual(validateConfig(legacy).receivingHours,{});
  for(const receivingHours of [null,[],{'RET-001':{open:600,close:500,closed:false}},{'RET-001':{open:480,close:1020,closed:'yes'}}]) {
    assert.throws(()=>validateConfig({...copy(defaults),receivingHours}));
  }
});

test('Pasig receiving overrides do not alter other distributor proxy allocations', () => {
  const baseline=regionalAllocation(defaults);
  const changed=regionalAllocation({...copy(defaults),receivingHours:{'RET-001':{open:480,close:1020,closed:true}}});
  assert.deepEqual(changed.filter(r=>r.name!=='Pasig'),baseline.filter(r=>r.name!=='Pasig'));
});
