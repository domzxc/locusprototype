import test from 'node:test';
import assert from 'node:assert/strict';
import {createOsrmClient} from '../road-routing.js';
const points=[{lng:121,lat:14},{lng:121.01,lat:14.01}];
const payload={code:'Ok',routes:[{legs:[{distance:2000,duration:120,steps:[{geometry:{coordinates:[[121,14],[121.01,14.01]]}}]}]}],waypoints:[{location:[121,14],distance:0},{location:[121.01,14.01],distance:1}]};
function memoryStorage(){let value=null;return {getItem:()=>value,setItem:(_key,next)=>{value=next;}};}

test('road responses survive client recreation, expire and remain independent of caller edits',async()=>{
  const storage=memoryStorage();let calls=0,clock=1000;
  const options={storage,intervalMs:0,cacheTtlMs:100,now:()=>clock,fetchImpl:async()=>{calls++;return {ok:true,json:async()=>structuredClone(payload)};}};
  const first=await createOsrmClient(options)(points);first.legs[0].km=999;
  const second=await createOsrmClient(options)(points);
  assert.equal(calls,1);assert.equal(second.legs[0].km,2);
  clock=1101;await createOsrmClient(options)(points);assert.equal(calls,2);
});

test('invalid persisted roads and unavailable storage fall back to validated network responses',async()=>{
  const storage={getItem:()=>'{broken',setItem:()=>{throw Error('quota');}};let calls=0;
  const client=createOsrmClient({storage,intervalMs:0,fetchImpl:async()=>{calls++;return {ok:true,json:async()=>payload};}});
  assert.equal((await client(points)).legs[0].km,2);await client(points);assert.equal(calls,1);
});

test('changed coordinates never reuse a stored route for another location',async()=>{
  const storage=memoryStorage();let calls=0;
  const options={storage,intervalMs:0,fetchImpl:async()=>{calls++;return {ok:true,json:async()=>payload};}};
  await createOsrmClient(options)(points);
  await createOsrmClient(options)([{lng:121.005,lat:14},points[1]]);assert.equal(calls,2);
});

test('a stalled road request fails with an actionable timeout instead of waiting indefinitely',async()=>{
  const keepAlive=setInterval(()=>{},1000);
  try{
    const client=createOsrmClient({storage:null,intervalMs:0,timeoutMs:10,fetchImpl:(_url,{signal})=>new Promise((_resolve,reject)=>{signal.addEventListener('abort',()=>reject(signal.reason),{once:true});})});
    await assert.rejects(client(points),/timed out.*retry/i);
  }finally{clearInterval(keepAlive);}
});
