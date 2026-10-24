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
    assert.ok(!scope.includes('disabled'));
    assert.match(scope,/<option[^>]*selected=""[^>]*>All<\/option>/);
    for(const name of ['Quezon City','Manila City','Makati','Pasig','Bulacan','Cavite'])assert.ok(scope.includes(name));
    assert.ok(html.includes('DRIVER &amp; HELPER ATTENDANCE'));
    assert.ok(html.includes('Manage attendance'));
  }finally{await server.close();}
});

test('network scope renders only the chosen depot with matching totals and baseline attendance',async()=>{
 const {initializeNetwork,networkPlans,summarizeNetwork}=await import('../network.js');
 const {copy,defaults}=await import('../engine.js');
 const root=initializeNetwork(copy(defaults)),runs=networkPlans(root,'peak','proposed'),normal=networkPlans(root);
 const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
 try{
  const {default:Overview}=await server.ssrLoadModule('/src/NetworkOverview.tsx');
  for(const run of runs){
   const html=renderToString(createElement(Overview,{root,scope:run.name,scenario:'peak',resourceMode:'proposed',onScenario:()=>{},onOpen:()=>{},onOpenAttendance:()=>{}})).replace(/<!--[\s\S]*?-->/g,'');
   const body=html.match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1]??'';
   assert.equal((body.match(/<tr>/g)??[]).length,1);assert.ok(body.includes(`<strong>${run.name}</strong>`));
   assert.ok(html.includes(`${run.name} delivery performance`));
   assert.ok(html.includes(`${run.result.total} peak orders versus ${normal.find(n=>n.name===run.name).result.total} normal orders`));
   const t=summarizeNetwork([run]);assert.ok(html.includes(`${t.served}/${t.total} complete orders`));
   assert.ok(html.includes('Export network plan CSV'));
  }
 }finally{await server.close();}
});

test('fleet readiness explains crew-blocked versus ready idle trucks beside allocation experiments',async()=>{
 const {initializeNetwork}=await import('../network.js');const {copy,defaults,generateOrders,plan}=await import('../engine.js');
 const c=initializeNetwork(copy(defaults)).network.Bulacan,p=plan(generateOrders(c),c,{A:2,B:10});
 const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
 try{
  const {default:Readiness}=await server.ssrLoadModule('/src/FleetReadiness.tsx');
  const html=renderToString(createElement(Readiness,{plan:p})).replace(/<!--[\s\S]*?-->/g,'');
  for(const label of ['Allocated trucks versus active routes','Crew-ready','Active routes','Ready without a route','Blocked by crew','Adding trucks does not add drivers/helpers'])assert.ok(html.includes(label),label);
  assert.match(html,/<td>Type B<\/td><td>10<\/td><td>6<\/td><td>6<\/td><td>0<\/td><td>4<\/td>/);
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
  for(const label of ['Operations review','Served (planned)','Unserved / incomplete','Arrival (PHT)','Service start (PHT)','Finish (PHT)','CBM / KG','Partially planned','Unserved (planned)'])assert.ok(html.includes(label),label);
  assert.ok(html.includes('On time (planned)'));assert.ok(html.includes('Showing 100 of 100 orders'));
  const {default:EarlyReturn}=await server.ssrLoadModule('/src/EarlyReturnReview.tsx');
  const early=renderToString(createElement(EarlyReturn,{plan:result,config:c}));
  for(const label of ['Early returns with unserved deliveries','No depot reload, second trip','Unused shift (min)','Unserved compatible portions'])assert.ok(early.includes(label),label);
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
   for(const label of ['Scheduled','In progress','Served (simulated)','Partially planned','Unserved (planned)','not a confirmed delivery'])assert.ok(html.includes(label),label);
   assert.ok(html.includes(minute===c.start?'Served (simulated) <strong>0</strong>':`Served (simulated) <strong>${p.served}</strong>`));
  }
 }finally{await server.close();}
});
