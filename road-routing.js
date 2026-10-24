import { copy, DEPOT, summarizePlan } from './engine.js';

export const ROAD_ENDPOINT='https://router.project-osrm.org';
const abort=signal=>{if(signal?.aborted)throw new DOMException('Road request aborted','AbortError');};
const coordinate=p=>Array.isArray(p)&&p.length>=2&&Number.isFinite(p[0])&&Number.isFinite(p[1])&&Math.abs(p[0])<=180&&Math.abs(p[1])<=90;

export function parseRoadResponse(data,count) {
  const r=data?.routes?.[0];
  if(data?.code!=='Ok'||!r||r.legs?.length!==count-1||data.waypoints?.length!==count)throw Error('Routing service returned no complete road route.');
  const legs=r.legs.map(leg=>{
    const geometry=leg.steps?.flatMap(s=>s.geometry?.coordinates??[]);
    if(!Number.isFinite(leg.distance)||leg.distance<0||!Number.isFinite(leg.duration)||leg.duration<0||!geometry?.length||!geometry.every(coordinate))throw Error('Invalid road leg distance, duration or geometry.');
    return {km:leg.distance/1000,minutes:leg.duration/60,geometry};
  });
  const snaps=data.waypoints.map(w=>{
    if(!coordinate(w.location)||!Number.isFinite(w.distance)||w.distance<0)throw Error('Invalid road snapping result.');
    if(w.distance>1000)throw Error('A synthetic point is over 1 KM from the routed road. Edit its coordinates before routing.');
    return {lng:w.location[0],lat:w.location[1],metres:w.distance};
  });
  return {provider:'OSRM driving',legs,snaps};
}

const ROAD_CACHE_KEY='domtransport-road-cache-v1';
const CACHE_LIMIT=40, CACHE_CHARACTERS=2000000;
const browserStorage=()=>{try{return globalThis.localStorage;}catch{return null;}};
// Store coordinate-only road responses, never schedules: traffic and constraints are
// revalidated on every plan. Cached road geometry expires after seven days.
export function createOsrmClient({fetchImpl=globalThis.fetch,intervalMs=1100,storage=browserStorage(),cacheTtlMs=7*24*60*60*1000,now=Date.now,timeoutMs=20000}={}) {
  const cache=new Map();let last=0;
  try{
    const raw=storage?.getItem(ROAD_CACHE_KEY);
    if(raw&&raw.length<=CACHE_CHARACTERS){
      const entries=JSON.parse(raw);
      if(Array.isArray(entries))for(const entry of entries.slice(-CACHE_LIMIT)){
        try{
          if(typeof entry.key!=='string'||!Number.isFinite(entry.expiresAt)||entry.expiresAt<=now()||entry.expiresAt>now()+cacheTtlMs)continue;
          const count=entry.key.split(';').length;
          if(count<2||count>70||!entry.key.split(';').every(p=>coordinate(p.split(',').map(Number))))continue;
          cache.set(entry.key,{expiresAt:entry.expiresAt,data:parseRoadResponse(entry.payload,count)});
        }catch{/* A corrupt cache entry must not block other routes. */}
      }
    }
  }catch{/* Browser storage is optional; routing remains usable without it. */}
  function persist(){
    if(!storage)return;
    const entries=[...cache].filter(([,value])=>value.expiresAt>now()).map(([key,value])=>({key,expiresAt:value.expiresAt,payload:{code:'Ok',routes:[{legs:value.data.legs.map(leg=>({distance:leg.km*1000,duration:leg.minutes*60,steps:[{geometry:{coordinates:leg.geometry}}]}))}],waypoints:value.data.snaps.map(p=>({location:[p.lng,p.lat],distance:p.metres}))}}));
    let raw=JSON.stringify(entries);
    while(raw.length>CACHE_CHARACTERS&&entries.length){entries.shift();raw=JSON.stringify(entries);}
    try{storage.setItem(ROAD_CACHE_KEY,raw);}catch{/* Quota or private mode: keep the memory cache. */}
  }
  return async function route(points,{signal}={}) {
    abort(signal);
    if(points.length<2||points.some(p=>!coordinate([p.lng,p.lat])))throw Error('Invalid route coordinates.');
    if(points.length>70){
      const legs=[],snaps=[];
      for(let start=0;start<points.length-1;start+=69){
        const chunk=await route(points.slice(start,start+70),{signal});
        legs.push(...chunk.legs);snaps.push(...(start?chunk.snaps.slice(1):chunk.snaps));
      }
      return {provider:'OSRM driving',legs,snaps};
    }
    const key=points.map(p=>`${p.lng.toFixed(6)},${p.lat.toFixed(6)}`).join(';');
    const cached=cache.get(key);
    if(cached?.expiresAt>now())return copy(cached.data);
    cache.delete(key);
    const wait=Math.max(0,last+intervalMs-Date.now());
    if(wait)await new Promise((resolve,reject)=>{
      const finish=()=>{signal?.removeEventListener('abort',cancel);resolve();};
      const timer=setTimeout(finish,wait);
      const cancel=()=>{clearTimeout(timer);reject(new DOMException('Road request aborted','AbortError'));};
      signal?.addEventListener('abort',cancel,{once:true});
    });
    abort(signal);last=Date.now();
    const timeout=AbortSignal.timeout(timeoutMs), combined=signal?AbortSignal.any([signal,timeout]):timeout;
    try{
      const response=await fetchImpl(`${ROAD_ENDPOINT}/route/v1/driving/${key}?steps=true&overview=false&geometries=geojson&continue_straight=false&generate_hints=false`,{signal:combined});
      if(!response.ok)throw Error(`Road service HTTP ${response.status}. Retry later or use the labeled approximate plan.`);
      const parsed=parseRoadResponse(await response.json(),points.length);
      if(cache.size>=CACHE_LIMIT)cache.delete(cache.keys().next().value);
      cache.set(key,{expiresAt:now()+cacheTtlMs,data:parsed});persist();return copy(parsed);
    }catch(error){
      abort(signal);
      if(timeout.aborted)throw Error('Road service timed out. Retry to reuse completed cached requests, or select the approximate plan.');
      throw error;
    }
  };
}

// Validate the existing heuristic sequence against roads. Do not claim road-based optimisation.
export async function validateRoadPlan(orders,c,fleet,base,router,{signal,onProgress=()=>{},maxPasses=5}={}) {
  const routes=[],missing=new Map(base.unassignedDeliveries.map(j=>[j.id,copy(j)]));
  const depot=c.depot??DEPOT;let maximumSnap=0;
  const reject=(job,reason)=>{const {arrival,finish,wait,legKm,banWait,roadPoint,...data}=job;missing.set(job.id,{...data,reason});};
  for(const [index,original] of base.routes.entries()) {
    abort(signal);let jobs=copy(original.stops),completed=false;
    for(let pass=0;pass<maxPasses&&jobs.length;pass++) {
      abort(signal);onProgress(`Road validation: vehicle ${index+1}/${base.routes.length}, pass ${pass+1}`);
      const data=await router([depot,...jobs,depot],{signal});abort(signal);
      if(data.legs.length!==jobs.length+1)throw Error('Road legs do not match vehicle stops.');
      maximumSnap=Math.max(maximumSnap,...data.snaps.map(s=>s.metres));
      const r={...copy(original),stops:[],km:0,banWait:0,volume:0,weight:0,roadLegs:data.legs,roadProvider:data.provider};
      let time=r.depart,failed=-1;
      for(let i=0;i<=jobs.length;i++) {
        const job=jobs[i], leg=data.legs[i];
        const minutes=leg.minutes*c.traffic*(job?c.zones[job.zone].factor:1);
        const leave=c.ban.enabled&&r.type===c.ban.type&&time<c.ban.end&&time+minutes>c.ban.start?Math.max(time,c.ban.end):time;
        const rawArrival=leave+minutes,banWait=leave-time;
        r.km+=leg.km;r.banWait+=banWait;
        if(!job){r.return=rawArrival;break;}
        const arrival=Math.max(rawArrival,job.open),finish=arrival+job.service;
        if(job.receivingClosed||finish>job.close+1e-9||finish>c.end+1e-9){failed=i;break;}
        r.stops.push({...job,arrival,finish,wait:arrival-rawArrival,legKm:leg.km,banWait,roadPoint:data.snaps[i+1]});
        r.volume+=job.volume;r.weight+=job.weight;time=finish;
      }
      if(failed<0&&r.return>c.end+1e-9)failed=jobs.length-1;
      if(failed>=0){reject(jobs[failed],'Road travel / receiving window / shift return is infeasible in this fixed-sequence validation.');jobs.splice(failed,1);continue;}
      if(r.volume>c[r.type].capacity+1e-9||r.weight>c[r.type].weight+1e-9)throw Error('Road route exceeds vehicle capacity.');
      r.cost=c[r.type].fixed+r.km*c[r.type].km;routes.push(r);completed=true;break;
    }
    if(!completed)for(const job of jobs)reject(job,'Road validation pass limit reached; route remains unassigned.');
  }
  abort(signal);
  return {...summarizePlan(orders,c,fleet,routes,[...missing.values()]),travelBasis:'road',roadMeta:{provider:'OSRM driving',validatedAt:new Date().toISOString(),maximumSnapMetres:maximumSnap,method:'Existing sequence; reroute after removing infeasible stops. No truck-specific or live-traffic validation.'}};
}
