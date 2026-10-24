import test from 'node:test';
import assert from 'node:assert/strict';
import {copy,defaults,generateOrders,plan,regionalAllocation,importRetailerMaster} from '../engine.js';
import {initializeNetwork,networkPlans,importNetworkSettings} from '../network.js';
import {toCsv,parseCsv,downloadCsv,settingsCsv,readSettingsCsv,retailersCsv,readRetailersCsv,networkRows,dispatchRows,allocationRows,selectNetworkRuns} from '../csv-exports.js';

test('CSV preserves Unicode, commas, quotes, newlines and guards spreadsheet formula strings',()=>{
 const rows=[{name:'Store, "Maynila"\nñ',note:'=1+1',qty:2,negative:-5},{name:"'=literal",note:'@SUM(A1)',qty:0,negative:0}];
 assert.deepEqual(parseCsv(toCsv(rows)),rows.map(r=>Object.fromEntries(Object.entries(r).map(([k,v])=>[k,String(v)]))));
 assert.match(toCsv(rows),/'=1\+1/);assert.throws(()=>parseCsv('a,b\r\n"unterminated'));
});
test('settings CSV round-trips the entire six-depot configuration and rejects unsafe or duplicate paths',()=>{
 const root=initializeNetwork(copy(defaults));root.network.Pasig.retailers[0].notes='=Edited, "note"\nnext line';
 const exported=settingsCsv(root),restored=readSettingsCsv(exported);
 assert.deepEqual(restored,root);assert.deepEqual(importNetworkSettings({kind:'domtransport-settings',version:2,config:restored}),importNetworkSettings({kind:'domtransport-settings',version:2,config:root}));
 assert.throws(()=>readSettingsCsv(exported+'domtransport-settings-v1,/__proto__,object,\r\n'),/path/i);
 assert.throws(()=>readSettingsCsv(exported+exported.split('\r\n')[2]+'\r\n'),/duplicate/i);
});
test('retailer CSV supports editable receiving windows, closed/archived profiles and empty masters',()=>{
 const c=initializeNetwork(copy(defaults)).network.Pasig;
 c.retailers[0].name='=Store, Manila';c.retailers[0].notes='Line 1\n"Line 2"';c.retailers[0].closed=true;c.retailers[1].enabled=false;
 const value=readRetailersCsv(retailersCsv(c.retailers,'Pasig'));
 assert.deepEqual(value.retailers,c.retailers);assert.equal(importRetailerMaster(value,c).retailers.length,100);
 assert.deepEqual(readRetailersCsv(retailersCsv([],'Pasig')).retailers,[]);
 const wrong=parseCsv(retailersCsv(c.retailers,'Pasig'));wrong[1].distributor='Makati';
 assert.throws(()=>readRetailersCsv(toCsv(wrong)),/distributor/i);
});
test('network scope filters totals and export rows without changing other depot masters',()=>{
 const root=initializeNetwork(copy(defaults)),before=copy(root),runs=networkPlans(root);
 assert.equal(selectNetworkRuns(runs,'All').length,6);
 for(const r of runs){const selected=selectNetworkRuns(runs,r.name);assert.equal(selected.length,1);assert.equal(networkRows(selected,'normal','current')[0].distributor,r.name);}
 assert.throws(()=>selectNetworkRuns(runs,'Unknown'),/scope/i);assert.deepEqual(root,before);
 const peak=networkPlans(root,'peak','proposed');
 for(const row of networkRows(peak,'peak','proposed',runs)){
   const baseline=runs.find(r=>r.name===row.distributor);
   assert.equal(row.saved_drivers_present,baseline.result.staffing.driversPresent);
   assert.equal(row.normal_orders,baseline.result.total);assert.equal(row.normal_operating_php,baseline.result.costs.operating);
 }
});
test('dispatch CSV retains every frozen/dry portion with assignment status and precise missing reasons',()=>{
 const c=copy(defaults),orders=generateOrders(c),p=plan(orders,c,{A:0,B:1}),rows=dispatchRows(orders,p,c,'normal','current');
 const jobs=rows.filter(r=>r.record_type==='delivery');assert.equal(jobs.length,p.deliveryTotal);
 assert.equal(jobs.filter(r=>r.status==='Unserved (planned)').length,p.unassignedDeliveries.length);
 assert.ok(jobs.filter(r=>r.shipment==='frozen').every(r=>r.vehicle===''&&r.reason));
 assert.equal(rows.filter(r=>r.record_type==='vehicle').length,p.routes.length);
 assert.equal(new Set(jobs.filter(j=>j.order_status==='Partially planned').map(j=>j.order)).size,p.partial);
 assert.ok(jobs.every(j=>Math.abs(j.handling_min-j.loading_allowance_min-j.unloading_min-j.stop_tasks_min)<1e-8));
 const allocation=allocationRows(regionalAllocation(initializeNetwork(c)));assert.equal(allocation.length,6);assert.ok(allocation.every(r=>Number.isInteger(r.normal_type_a)&&Number.isInteger(r.peak_type_b)));
});
test('download helper creates a CSV attachment with the supplied UTF-8 content',async()=>{
 const oldDocument=globalThis.document,oldCreate=URL.createObjectURL,oldRevoke=URL.revokeObjectURL,oldTimeout=globalThis.setTimeout;
 let blob,clicked=0,cleanup,revoked;const link={click(){clicked++;}};
 try{
  globalThis.document={createElement:()=>link};URL.createObjectURL=value=>{blob=value;return 'blob:csv-test';};URL.revokeObjectURL=value=>{revoked=value;};globalThis.setTimeout=fn=>{cleanup=fn;return 1;};
  downloadCsv('sample.json',toCsv([{name:'Maynila ñ'}]));
  assert.equal(link.download,'sample.csv');assert.equal(link.href,'blob:csv-test');assert.equal(clicked,1);assert.equal(blob.type,'text/csv;charset=utf-8;');
  const bytes=new Uint8Array(await blob.arrayBuffer());assert.deepEqual([...bytes.slice(0,3)],[239,187,191]);cleanup();assert.equal(revoked,'blob:csv-test');
 }finally{globalThis.document=oldDocument;URL.createObjectURL=oldCreate;URL.revokeObjectURL=oldRevoke;globalThis.setTimeout=oldTimeout;}
});
