import test from 'node:test';
import assert from 'node:assert/strict';
import {trafficPercent,trafficFactor,stopTiming} from '../src/planning-explanation.js';
import {defaults,generateOrders,allocate,plan} from '../engine.js';
test('plain-language traffic percentage preserves existing planning factors',()=>{
  for(const factor of [1,1.2,1.65,1.4,1.3,1.25,4])assert.ok(Math.abs(trafficFactor(trafficPercent(factor))-factor)<1e-8);
  assert.equal(trafficPercent(1.65),65);assert.equal(trafficFactor(35),1.35);
});
test('store timeline accounts for driving, traffic-ban wait, receiving wait and full handling',()=>{
  const orders=generateOrders(defaults),p=plan(orders,defaults,allocate(orders,defaults));
  for(const route of p.routes)for(let i=0;i<route.stops.length;i++){
    const t=stopTiming(route,i,defaults),s=route.stops[i],previous=i?route.stops[i-1].finish:route.depart;
    assert.ok(Math.abs(previous+t.driving+t.restrictionWait+t.receivingWait-s.arrival)<1e-8);
    assert.ok(Math.abs(t.loading+t.unloading+t.fixedHandling-t.handling)<1e-8);
    assert.ok(Math.abs(s.arrival+t.handling-s.finish)<1e-8);
  }
});
