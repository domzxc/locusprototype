import test from 'node:test';
import assert from 'node:assert/strict';
import { PH_UNITS, toTimeInput, parseTimeInput, formatPHTime } from '../src/ph-conventions.js';
import { defaults, copy, generateOrders, splitOrders, validateConfig, PRODUCT_VOLUME, PRODUCT_WEIGHT } from '../engine.js';

test('PHT clock inputs preserve minute-based schedules without timezone conversion',()=>{
  assert.equal(toTimeInput(360),'06:00');assert.equal(toTimeInput(420),'07:00');
  assert.equal(toTimeInput(1080),'18:00');assert.equal(parseTimeInput('09:00'),540);
  assert.equal(parseTimeInput('00:00'),0);assert.equal(parseTimeInput('00:00',true),1440);
  assert.equal(toTimeInput(1440),'00:00');
  assert.equal(formatPHTime(420),'7:00 AM');assert.equal(formatPHTime(1080),'6:00 PM');
  assert.match(formatPHTime(1440),/next day/i);
  for(const invalid of ['','25:00','12:60','7:00','abc'])assert.ok(Number.isNaN(parseTimeInput(invalid)));
  assert.equal(PH_UNITS.timeZone,'Asia/Manila');assert.equal(PH_UNITS.volume,'CBM');assert.equal(PH_UNITS.weight,'KG');
});

test('editable CBM and KG per box drive order payload and segregated delivery totals',()=>{
  const c={...copy(defaults),productCbm:[.07,.18,.1,.44,.08],productKg:[24,36,32,50,16]};
  const old=generateOrders(defaults), next=generateOrders(c);
  for(let i=0;i<next.length;i++) {
    assert.ok(Math.abs(next[i].volume-2*old[i].volume)<1e-8);
    assert.ok(Math.abs(next[i].weight-2*old[i].weight)<1e-8);
    const jobs=splitOrders([next[i]],c);
    assert.ok(Math.abs(jobs.reduce((s,o)=>s+o.volume,0)-next[i].volume)<1e-8);
    assert.ok(Math.abs(jobs.reduce((s,o)=>s+o.weight,0)-next[i].weight)<1e-8);
  }
});

test('legacy settings gain CBM/KG defaults and invalid box dimensions are rejected',()=>{
  const old=copy(defaults);delete old.productCbm;delete old.productKg;
  const migrated=validateConfig(old);
  assert.deepEqual(migrated.productCbm,PRODUCT_VOLUME);assert.deepEqual(migrated.productKg,PRODUCT_WEIGHT);
  assert.throws(()=>validateConfig({...copy(defaults),productCbm:[0,.09,.05,.22,.04]}));
  assert.throws(()=>validateConfig({...copy(defaults),productKg:[12,18]}));
});
