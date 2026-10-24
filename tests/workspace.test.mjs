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
