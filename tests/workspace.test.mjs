import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {createElement} from 'react';
import {renderToString} from 'react-dom/server';

test('Network overview declares All as its scope instead of showing the active Pasig depot',async()=>{
  const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
  try{
    const {default:App}=await server.ssrLoadModule('/src/App.tsx');
    const html=renderToString(createElement(App));
    const scope=html.match(/<select aria-label="Network scope"[^>]*>.*?<\/select>/)?.[0];
    assert.ok(scope,'network scope selector is rendered');
    assert.match(scope,/disabled/);
    assert.match(scope,/<option[^>]*selected=""[^>]*>All<\/option>/);
    assert.ok(!scope.includes('Pasig'));
    assert.ok(html.includes('DRIVER &amp; HELPER ATTENDANCE'));
    assert.ok(html.includes('Manage attendance'));
  }finally{await server.close();}
});


test('depot attendance fields render per type and applied staff shortages remain visible',async()=>{
  const {initializeNetwork}=await import('../network.js');
  const {defaults,copy}=await import('../engine.js');
  const root=initializeNetwork(copy(defaults));root.network.Pasig.attendance.A.driversPresent=0;
  const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
  try{
    const {default:DepotPlanning}=await server.ssrLoadModule('/src/DepotPlanning.tsx');
    const html=renderToString(createElement(DepotPlanning,{root,onSave:()=>{},onOpen:()=>{}})).replace(/<!--[\s\S]*?-->/g,'');
    for(const name of Object.keys(root.network))for(const type of ['A','B']){
      assert.ok(html.includes(`aria-label="${name} Type ${type}: Drivers present"`));
      assert.ok(html.includes(`aria-label="${name} Type ${type}: Helpers present"`));
      assert.ok(html.includes(`aria-label="${name} Type ${type}: Helpers required per truck"`));
    }
    assert.ok(html.includes('Applied crew-ready fleet: 0 A +'));
  }finally{await server.close();}
});

test('peak overview distinguishes proposed resources from saved assets and explains constrained low spending',async()=>{
 const {initializeNetwork}=await import('../network.js');
 const {defaults,copy}=await import('../engine.js');
 const root=initializeNetwork(copy(defaults));
 const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
 try{
  const {default:Overview}=await server.ssrLoadModule('/src/NetworkOverview.tsx');
  for(const mode of ['proposed','current']){
   const html=renderToString(createElement(Overview,{root,scenario:'peak',resourceMode:mode,onScenario:()=>{},onOpen:()=>{},onOpenAttendance:()=>{},onResourceMode:()=>{}})).replace(/<!--[\s\S]*?-->/g,'');
   for(const text of ['900 peak orders versus 600 normal orders','Normal baseline:','Scenario A + B','Saved A + B','8:00 PM'])assert.ok(html.includes(text),text);
   assert.ok(html.includes(mode==='proposed'?'Proposed additions: 64 trucks':'Lower route spending may reflect unassigned deliveries'));
  }
 }finally{await server.close();}
});

test('depot tabs expose one active panel and operations review renders parent status and split timing fields',async()=>{
 const {initializeNetwork}=await import('../network.js');
 const {defaults,copy,generateOrders,plan}=await import('../engine.js');
 const root=initializeNetwork(copy(defaults)),server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
 try{
  const {default:DepotPlanning}=await server.ssrLoadModule('/src/DepotPlanning.tsx');
  for(const name of Object.keys(root.network)){
   const html=renderToString(createElement(DepotPlanning,{root,selectedDepot:name,onSelect:()=>{},onSave:()=>{},onOpen:()=>{}}));
   assert.equal((html.match(/role="tab"/g)??[]).length,6);
   assert.equal((html.match(/aria-selected="true"/g)??[]).length,1);
   assert.equal((html.match(/role="tabpanel"/g)??[]).length,6);
   assert.equal((html.match(/hidden=""/g)??[]).length,5);
   assert.ok(html.includes('Depot planning workspaces'));
  }
  const {default:Review}=await server.ssrLoadModule('/src/OperationsReview.tsx');
  const c=root.network.Pasig,orders=generateOrders(c),result=plan(orders,c,c.currentFleet);
  const html=renderToString(createElement(Review,{orders,plan:result,config:c})).replace(/<!--[\s\S]*?-->/g,'');
  for(const label of ['Operations review','Served (planned)','Unserved / incomplete','Arrival (PHT)','Service start (PHT)','Finish (PHT)','CBM / KG','Partially planned','Unserved / unassigned'])assert.ok(html.includes(label),label);
  assert.ok(html.includes('On time (planned)'));assert.ok(html.includes('Showing 100 of 100 orders'));
 }finally{await server.close();}
});

test('GPS legend distinguishes scheduled, in-progress, simulated served and planning exceptions at each playback boundary',async()=>{
 const {defaults,copy,generateOrders,plan}=await import('../engine.js');
 const {createPlaybackOrders,playbackOrderStates}=await import('../playback-status.js');
 const c=copy(defaults),orders=generateOrders(c),p=plan(orders,c,{A:2,B:6}),timeline=createPlaybackOrders(orders,p.routes,p.unserved);
 const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
 try{
  const {default:Legend}=await server.ssrLoadModule('/src/MapStatusLegend.tsx');
  for(const minute of [c.start,c.end]){
   const html=renderToString(createElement(Legend,{states:playbackOrderStates(timeline,minute),enabled:true})).replace(/<!--[\s\S]*?-->/g,'');
   for(const label of ['Scheduled','In progress','Served (simulated)','Partially planned','Unassigned','not a confirmed delivery'])assert.ok(html.includes(label),label);
   assert.ok(html.includes(minute===c.start?'Served (simulated) <strong>0</strong>':`Served (simulated) <strong>${p.served}</strong>`));
  }
 }finally{await server.close();}
});
