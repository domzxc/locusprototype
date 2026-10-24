import { useEffect, useRef, useState } from 'react';
import { createOsrmClient, validateRoadPlan } from '../road-routing.js';
import type { Config, Order, Plan } from './types';
const router=createOsrmClient();

export function useRoadPlan(base:Plan,orders:Order[],config:Config,fleet:{A:number;B:number},enabled:boolean) {
  const [snapshot,setSnapshot]=useState<{base:Plan;result:Plan}|null>(null),[progress,setProgress]=useState(''),[error,setError]=useState(''),[approximateChosen,setApproximateChosen]=useState(false);
  const controller=useRef<AbortController|null>(null),version=useRef(0),preferRoad=useRef(true);
  useEffect(()=>{
    version.current++;controller.current?.abort();setProgress('');setError('');setSnapshot(null);
    if(enabled&&preferRoad.current&&base.routes.length)void load();
    return ()=>{version.current++;controller.current?.abort();};
  },[base,enabled]);
  function cancel(){version.current++;controller.current?.abort();setProgress('');}
  function approximate(){preferRoad.current=false;setApproximateChosen(true);cancel();setSnapshot(null);setError('');}
  async function load(){
    preferRoad.current=true;setApproximateChosen(false);
    cancel();const request=++version.current, current=new AbortController();controller.current=current;
    setProgress('Requesting road routes...');setError('');
    try{
      const result=await validateRoadPlan(orders,config,fleet,base,router,{signal:current.signal,onProgress:value=>{if(version.current===request)setProgress(value);}});
      if(version.current===request&&!current.signal.aborted)setSnapshot({base,result});
    }catch(e){if(version.current===request&&!current.signal.aborted)setError(`Road update failed: ${(e as Error).message} The displayed plan retains its labeled travel basis.`);}
    finally{if(version.current===request)setProgress('');}
  }
  return {result:snapshot?.base===base?snapshot.result:base,approximateChosen,progress,error,load,cancel,approximate};
}
