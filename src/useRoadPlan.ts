import { useEffect, useMemo, useRef, useState } from 'react';
import { createOsrmClient, validateRoadPlan } from '../road-routing.js';
import type { Config, Order, Plan } from './types';
const router=createOsrmClient();
const completed=new Map<string,Plan>();

export function useRoadPlan(base:Plan,orders:Order[],config:Config,fleet:{A:number;B:number},enabled:boolean) {
  const key=useMemo(()=>JSON.stringify({orders,config,fleet}),[orders,config,fleet]);
  const [snapshot,setSnapshot]=useState<{key:string;result:Plan}|null>(null),[progress,setProgress]=useState(''),[elapsed,setElapsed]=useState(0),[error,setError]=useState(''),[approximateChosen,setApproximateChosen]=useState(false);
  const controller=useRef<AbortController|null>(null),version=useRef(0),preferRoad=useRef(true),started=useRef(0);
  useEffect(()=>{
    version.current++;controller.current?.abort();setProgress('');setError('');
    if(enabled&&preferRoad.current&&base.routes.length){
      const cached=completed.get(key);
      if(cached)setSnapshot({key,result:cached});else void load();
    }
    return ()=>{version.current++;controller.current?.abort();};
  },[key,enabled]);
  const loading=!!progress;
  useEffect(()=>{if(!loading)return;const timer=setInterval(()=>setElapsed(Math.floor((Date.now()-started.current)/1000)),1000);return()=>clearInterval(timer);},[loading]);
  function cancel(){version.current++;controller.current?.abort();setProgress('');}
  function approximate(){preferRoad.current=false;setApproximateChosen(true);cancel();setSnapshot(null);setError('');}
  async function load(){
    preferRoad.current=true;setApproximateChosen(false);
    cancel();const request=++version.current, current=new AbortController();controller.current=current;
    const deadline=setTimeout(()=>current.abort(new Error('Road validation reached the 2-minute limit. Retry to reuse cached requests, or select the approximate plan.')),120000);
    started.current=Date.now();setElapsed(0);setProgress('Requesting road routes...');setError('');
    try{
      const result=await validateRoadPlan(orders,config,fleet,base,router,{signal:current.signal,onProgress:value=>{if(version.current===request)setProgress(value);}});
      if(version.current===request&&!current.signal.aborted){
        if(completed.size>=8)completed.delete(completed.keys().next().value!);
        completed.set(key,result);setSnapshot({key,result});
      }
    }catch(e){if(version.current===request){const reason=current.signal.aborted?current.signal.reason:e;setError(`Road update failed: ${reason instanceof Error?reason.message:String(reason)} The displayed plan retains its labeled travel basis.`);}}
    finally{clearTimeout(deadline);if(version.current===request)setProgress('');}
  }
  return {result:approximateChosen?base:snapshot?.key===key?snapshot.result:completed.get(key)??base,approximateChosen,progress:progress?`${progress} - ${elapsed}s elapsed (completed requests are cached)`:progress,error,load,cancel,approximate};
}
