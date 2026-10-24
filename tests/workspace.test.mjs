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
  }finally{await server.close();}
});
