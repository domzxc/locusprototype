import { useEffect, useRef, useState } from 'react';
import { createOsrmClient, validateRoadPlan } from '../road-routing.js';
import type { Config, Order, Plan } from './types';
const router=createOsrmClient();

export function useRoadPlan(base:Plan,orders:Order[],config:Config,fleet:{A:number;B:number}) {
  const [snapshot,setSnapshot]=useState<{base:Plan;result:Plan}|null>(null),[progress,setProgress]=useState(''),[error,setError]=useState('');
  const controller=useRef<AbortController|null>(null),version=useRef(0);
  useEffect(()=>{
    version.current++;controller.current?.abort();setProgress('');setError('');setSnapshot(null);
    return ()=>{version.current++;controller.current?.abort();};
  },[base]);
  function cancel(){version.current++;controller.current?.abort();setProgress('');}
  function approximate(){cancel();setSnapshot(null);setError('');}
  async function load(){
    cancel();const request=++version.current, current=new AbortController();controller.current=current;
    setProgress('Requesting road routes...');setError('');
    try{
      const result=await validateRoadPlan(orders,config,fleet,base,router,{signal:current.signal,onProgress:value=>{if(version.current===request)setProgress(value);}});
      if(version.current===request&&!current.signal.aborted)setSnapshot({base,result});
    }catch(e){if(version.current===request&&!current.signal.aborted)setError(`Road update failed: ${(e as Error).message} The displayed plan retains its labeled travel basis.`);}
    finally{if(version.current===request)setProgress('');}
  }
  return {result:snapshot?.base===base?snapshot.result:base,progress,error,load,cancel,approximate};
}
