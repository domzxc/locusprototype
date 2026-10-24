import {crewAvailability,validateAttendance} from './staffing.js';
import {diagnosePending} from './planning-diagnostics.js';
import { costDefaults, normalizeCosting, costBreakdown } from './costing.js';
export const DEPOT = { lng: 121.0705, lat: 14.5764 };
export const PRODUCTS = ['Toothpaste', 'Ice cream', 'Soap', 'Water purifier', 'Tea'];
export const PRODUCT_VOLUME = [.035, .09, .05, .22, .04];
export const PRODUCT_WEIGHT = [12, 18, 16, 25, 8];
export const defaults = {
  seed: 42, orders: 100, peak: 1.6, peakOrders:1.5, peakExtraMinutes:120, speed: 22, detour: 1.35, traffic: 1.35,
  start: 360, end: 1080, loading: 25, stopBase: 5, reserve: 0.15,
  receivingHours: {},
  costing: structuredClone(costDefaults),
  productCbm: [...PRODUCT_VOLUME], productKg: [...PRODUCT_WEIGHT],
  service: [1, 2, 1, 5, 1],
  loadService: [.2, .5, .2, 1, .2],
  A: { capacity: 5, weight: 900, km: 24, fixed: 1700 },
  B: { capacity: 11, weight: 2500, km: 16, fixed: 1400 },
  zones: [
    { name: 'Kapitolyo', lng: 121.057, lat: 14.573, factor: 1.2 },
    { name: 'Ortigas', lng: 121.062, lat: 14.588, factor: 1.65 },
    { name: 'Rosario', lng: 121.090, lat: 14.588, factor: 1.4 },
    { name: 'Santolan', lng: 121.085, lat: 14.612, factor: 1.3 },
    { name: 'Pinagbuhatan', lng: 121.091, lat: 14.551, factor: 1.25 }
  ],
  ban: { enabled: true, start: 420, end: 540, type: 'B' }
};
export const copy = x => structuredClone(x);
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export function distance(a, b) {
  const rad = Math.PI / 180, dlat = (b.lat-a.lat)*rad, dlng = (b.lng-a.lng)*rad;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(Math.sin(dlat/2)**2 + Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dlng/2)**2)));
}
export function generateOrders(c, scenario = 'normal') {
  const cbm=c.productCbm??PRODUCT_VOLUME, kg=c.productKg??PRODUCT_WEIGHT;
  const rand = rng(c.seed), mult = scenario === 'peak' ? c.peak : 1;
  const roster=c.retailers;
  const pool=Array.from({length:roster?.length??c.orders}, (_,i) => {
    const retailer=roster?.[i];
    const zone = retailer?.zone??(i % c.zones.length), z = c.zones[zone];
    const quantities = PRODUCTS.map((_,p) => Math.ceil((p === 1 ? (rand() < .28 ? 1 + Math.floor(rand()*3) : 0) : Math.floor(rand()*4)) * mult));
    if (!quantities.some(Boolean)) quantities[0] = 1;
    const volume = quantities.reduce((s,q,p) => s + q * cbm[p],0);
    const weight = quantities.reduce((s,q,p) => s + q * kg[p],0);
    const open = [480,540,600,660][Math.floor(rand()*4)];
    const id=retailer?.id??`RET-${String(i+1).padStart(3,'0')}`;
    const receiving = c.receivingHours?.[id];
    const order={id,name:`${['Sari-sari','Family Mart','Mini Grocery','Trading Store'][i%4]} ${i+1}`,zone,area:z.name,lng:z.lng+(rand()-.5)*.014,lat:z.lat+(rand()-.5)*.014,quantities,volume,weight,cold:quantities[1]>0,open:receiving?.open??retailer?.open??open,close:receiving?.close??retailer?.close??Math.min(1020,open+240),receivingClosed:receiving?.closed??retailer?.closed??false,service:c.stopBase+quantities.reduce((s,q,p)=>s+q*(c.service[p]+c.loadService[p]),0)};
    return retailer?{...order,name:retailer.name,address:retailer.address,lng:retailer.lng,lat:retailer.lat}:order;
  }).filter((_,i)=>!roster||(roster[i].enabled&&roster[i].distributor===(c.distributor??'Pasig')));
  const normalCount=Math.min(pool.length,c.dailyOrders??pool.length);
  const count=scenario==='peak'?Math.ceil(normalCount*(c.peakOrders??1.5)-1e-9):normalCount;
  return Array.from({length:count},(_,i)=>{
    const order=pool[i%pool.length],repeat=Math.floor(i/pool.length);
    return {...order,quantities:[...order.quantities],retailerId:order.id,id:repeat?`${order.id}-P${repeat+1}`:order.id};
  });
}
export function scenarioConfig(c,scenario='normal') {
  return scenario==='peak'?{...c,end:Math.min(1440,c.end+(c.peakExtraMinutes??120))}:c;
}
export function getRetailers(c) {
  if(c.retailers) return copy(c.retailers).map(r=>{
    const hours=c.receivingHours?.[r.id];
    return {...r,open:hours?.open??r.open,close:hours?.close??r.close,closed:hours?.closed??r.closed};
  });
  return generateOrders({...c,retailers:undefined}).map(o=>({id:o.id,name:o.name,address:`Synthetic delivery point in ${o.area}`,city:c.distributor??'Pasig',distributor:c.distributor??'Pasig',zone:o.zone,lng:o.lng,lat:o.lat,enabled:true,open:o.open,close:o.close,closed:o.receivingClosed,synthetic:true,notes:'Assumed receiving window for the synthetic demo day.'}));
}
export function importRetailerMaster(value,c) {
  if(!value||value.kind!=='domtransport-retailer-master'||value.version!==1||value.synthetic!==true||!Array.isArray(value.retailers)) throw Error('Use a version 1 synthetic retailer master export. Public reference catalogs cannot be imported as dispatch data.');
  if(value.distributor&&c.distributor&&value.distributor!==c.distributor) throw Error(`Choose the ${value.distributor} workspace before importing this master.`);
  return validateConfig({...c,retailers:copy(value.retailers),receivingHours:{}});
}
export function splitOrders(orders,c) {
  const cbm=c.productCbm??PRODUCT_VOLUME, kg=c.productKg??PRODUCT_WEIGHT;
  return orders.flatMap(order=>{
    const totalVolume=order.quantities.reduce((s,q,p)=>s+q*cbm[p],0);
    const totalWeight=order.quantities.reduce((s,q,p)=>s+q*kg[p],0);
    return ['frozen','dry'].flatMap(shipment=>{
      const quantities=order.quantities.map((q,p)=>(shipment==='frozen'?p===1:p!==1)?q:0);
      if(!quantities.some(Boolean)) return [];
      const volumeShare=quantities.reduce((s,q,p)=>s+q*cbm[p],0)/totalVolume;
      const weightShare=quantities.reduce((s,q,p)=>s+q*kg[p],0)/totalWeight;
      return [{...order,id:`${order.id}-${shipment==='frozen'?'F':'D'}`,parentId:order.id,shipment,quantities,cold:shipment==='frozen',volume:order.volume*volumeShare,weight:order.weight*weightShare,service:c.stopBase+quantities.reduce((s,q,p)=>s+q*(c.service[p]+c.loadService[p]),0)}];
    });
  });
}
export function allocate(orders, c) {
  orders=splitOrders(orders,c).filter(o=>!o.receivingClosed);
  const hours = (c.end-c.start-c.loading)/60;
  const estimate = subset => subset.reduce((s,o)=>s+o.service/60 + 2.4*c.detour/c.speed*c.traffic*c.zones[o.zone].factor,0);
  const needed = (subset,t) => Math.max(subset.length?1:0,Math.ceil(Math.max(subset.reduce((s,o)=>s+o.volume,0)/c[t].capacity,subset.reduce((s,o)=>s+o.weight,0)/c[t].weight,estimate(subset)/hours)*(1+c.reserve)));
  return { A:needed(orders.filter(o=>o.cold),'A'), B:needed(orders.filter(o=>!o.cold),'B') };
}
// A conservative modeled restriction: an affected vehicle must not MOVE during the ban.
// Travel crossing the interval waits at its origin until the ban ends. This is not a legal road model.
export function travel(a,b,depart,type,c) {
  const km=distance(a,b)*c.detour;
  const factor=b.zone === undefined ? c.traffic : c.traffic*c.zones[b.zone].factor;
  const minutes=km/c.speed*60*factor;
  let leave=depart;
  if(c.ban.enabled && type===c.ban.type && depart<c.ban.end && depart+minutes>c.ban.start) leave=Math.max(depart,c.ban.end);
  return {km,arrival:leave+minutes,leave,wait:leave-depart};
}
export function plan(orders,c,fleet) {
  const deliveries=splitOrders(orders,c);
  const depot=c.depot??DEPOT;
  const pending = new Map(deliveries.map(o=>[o.id,o]));
  const routes=[],staffing=crewAvailability(c,fleet);
  for (const type of ['A','B']) {
    for(let v=0;v<staffing.fleet[type];v++) {
      const route={id:`${type}-${String(v+1).padStart(2,'0')}`,type,stops:[],volume:0,weight:0,km:0,banWait:0,depart:c.start+c.loading,depot:copy(depot)};
      let loc=depot, time=route.depart;
      while(true) {
        let best=null;
        for(const o of pending.values()) {
          if(o.receivingClosed) continue;
          if((o.cold?'A':'B')!==type) continue;
          if(route.volume+o.volume>c[type].capacity+1e-9 || route.weight+o.weight>c[type].weight+1e-9) continue;
          const leg=travel(loc,o,time,type,c), arrival=Math.max(leg.arrival,o.open), finish=arrival+o.service;
          const back=travel(o,depot,finish,type,c);
          if(finish>o.close+1e-9 || back.arrival>c.end+1e-9) continue;
          const score=leg.km*3 + Math.max(0,o.open-leg.arrival)*.12 + (o.close-c.start)*.012;
          if(!best || score<best.score) best={o,leg,arrival,finish,score};
        }
        if(!best) break;
        const {o,leg,arrival,finish}=best;
        route.stops.push({...o,arrival,finish,wait:arrival-leg.arrival,legKm:leg.km,banWait:leg.wait});
        route.volume+=o.volume;route.weight+=o.weight;route.km+=leg.km;route.banWait+=leg.wait;
        pending.delete(o.id);loc=o;time=finish;
      }
      if(route.stops.length) {
        const back=travel(loc,depot,time,type,c); route.km+=back.km; route.banWait+=back.wait; route.return=back.arrival;
        route.cost=c[type].fixed+route.km*c[type].km; routes.push(route);
      } else break; // Identical unused vehicles cannot improve this type's next tour.
    }
  }
  const unassignedDeliveries=[...pending.values()].map(o=>diagnosePending(o,c,fleet,staffing,routes,travel,depot));
  return summarizePlan(orders,c,fleet,routes,unassignedDeliveries);
}
export function summarizePlan(orders,c,fleet,routes,unassignedDeliveries) {
  const assigned=routes.flatMap(r=>r.stops);
  const assignedParents=new Set(assigned.map(o=>o.parentId));
  const missingByParent=new Map();
  for(const delivery of unassignedDeliveries) {
    if(!missingByParent.has(delivery.parentId)) missingByParent.set(delivery.parentId,[]);
    missingByParent.get(delivery.parentId).push(delivery);
  }
  const unserved=orders.filter(o=>missingByParent.has(o.id)).map(o=>({...o,reason:`${assignedParents.has(o.id)?'Partially planned: ':''}${missingByParent.get(o.id).map(d=>`${d.shipment}: ${d.reason}`).join('; ')}`}));
  const served=orders.length-unserved.length;
  const partial=unserved.filter(o=>assignedParents.has(o.id)).length;
  return {staffing:crewAvailability(c,fleet),travelBasis:'approximate',costs:costBreakdown(routes,unassignedDeliveries,c,fleet),routes,unserved,unassignedDeliveries,served,partial,deliveryTotal:splitOrders(orders,c).length,deliveryAssigned:assigned.length,averageDrops:routes.length?assigned.length/routes.length:0,total:orders.length,km:routes.reduce((s,r)=>s+r.km,0),cost:routes.reduce((s,r)=>s+r.cost,0),util:routes.length?routes.reduce((s,r)=>s+r.volume/c[r.type].capacity,0)/routes.length:0,onTime:assigned.length?assigned.filter(o=>o.finish<=o.close+1e-9).length/assigned.length:0,coverage:orders.length?served/orders.length:0,fleet};
}
function alongRoad(geometry,f) {
  const lengths=geometry.slice(1).map((p,i)=>distance({lng:geometry[i][0],lat:geometry[i][1]},{lng:p[0],lat:p[1]}));
  let remaining=Math.max(0,Math.min(1,f))*lengths.reduce((s,v)=>s+v,0);
  for(let i=0;i<lengths.length;i++)if(remaining<=lengths[i]&&lengths[i]>0){const t=remaining/lengths[i];return {lng:geometry[i][0]+(geometry[i+1][0]-geometry[i][0])*t,lat:geometry[i][1]+(geometry[i+1][1]-geometry[i][1])*t};}else remaining-=lengths[i];
  const last=geometry[geometry.length-1];return {lng:last[0],lat:last[1]};
}
export function positionAt(route, minute) {
  const depot=route.depot??DEPOT;
  if(minute<route.depart)return {...depot,status:'Depot preparation'};
  let origin=depot, departure=route.depart;
  for(const [index,stop] of route.stops.entries()) {
    const road=route.roadLegs?.[index];
    const leave=departure+stop.banWait, arrival=stop.arrival-stop.wait;
    if(minute<leave) return {...(index===0?depot:road?alongRoad(road.geometry,0):origin),status:'Waiting / restriction'};
    if(minute<arrival) {
      const f=Math.max(0,Math.min(1,(minute-leave)/(arrival-leave)));
      if(road)return {...alongRoad(road.geometry,f),status:'In transit'};
      return {lng:origin.lng+(stop.lng-origin.lng)*f,lat:origin.lat+(stop.lat-origin.lat)*f,status:'In transit'};
    }
    if(minute<stop.finish) return {...(road?alongRoad(road.geometry,1):{lng:stop.lng,lat:stop.lat}),status:minute<stop.arrival?'Waiting for window':'Handling delivery'};
    origin=stop; departure=stop.finish;
  }
  const road=route.roadLegs?.[route.stops.length];
  const returnWait=route.banWait-route.stops.reduce((s,o)=>s+o.banWait,0);
  const leave=departure+returnWait;
  if(minute<leave) return {...(road?alongRoad(road.geometry,0):origin),status:'Waiting / restriction'};
  const f=route.return>leave?Math.max(0,Math.min(1,(minute-leave)/(route.return-leave))):1;
  if(road)return {...alongRoad(road.geometry,f),status:minute>=route.return?'Returned to depot':'Returning'};
  return {lng:origin.lng+(depot.lng-origin.lng)*f,lat:origin.lat+(depot.lat-origin.lat)*f,status:minute>=route.return?'Returned to depot':'Returning'};
}
export const DISTRIBUTORS = [
  {name:'Quezon City',retailers:11000}, {name:'Manila City',retailers:10000},
  {name:'Makati',retailers:9000}, {name:'Pasig',retailers:5000},
  {name:'Bulacan',retailers:8000}, {name:'Cavite',retailers:7000}
];
export function regionalAllocation(c) {
  return DISTRIBUTORS.map(d=>{
    const config=c.network?.[d.name]??{...c,orders:Math.max(1,Math.round(c.orders*d.retailers/5000)),receivingHours:d.name==='Pasig'?c.receivingHours:{},retailers:d.name==='Pasig'?c.retailers:undefined};
    const normal=generateOrders(config), peak=generateOrders(config,'peak');
    return {...d,daily:normal.length,peakDaily:peak.length,normal:allocate(normal,config),peak:allocate(peak,scenarioConfig(config,'peak'))};
  });
}
export function validateConfig(c) {
  const finite=(x,min,max)=>Number.isFinite(x)&&x>=min&&x<=max;
  if(!c || typeof c !== 'object') throw Error('Settings must be a JSON object.');
  if(!Number.isInteger(c.seed)||!Number.isInteger(c.orders)||!finite(c.orders,1,500)) throw Error('Use 1–500 orders and an integer seed.');
  for(const [k,min,max] of [['peak',1,4],['speed',5,100],['detour',1,3],['traffic',1,4],['start',0,1439],['end',1,1440],['loading',0,180],['stopBase',0,60],['reserve',0,1]]) if(!finite(c[k],min,max)) throw Error(`Invalid ${k}.`);
  if(c.end<=c.start+c.loading) throw Error('Shift must exceed depot loading time.');
  for(const t of ['A','B']) for(const k of ['capacity','weight','km','fixed']) if(!finite(c[t][k],.01,100000)) throw Error(`Invalid Type ${t} ${k}.`);
  if(!Array.isArray(c.service)||c.service.length!==5||c.service.some(x=>!finite(x,0,60))) throw Error('Invalid product handling time.');
  if(!Array.isArray(c.loadService)||c.loadService.length!==5||c.loadService.some(x=>!finite(x,0,60))) throw Error('Invalid product loading time.');
  if(!Array.isArray(c.zones)||c.zones.length!==5||c.zones.some(z=>!z || typeof z.name!=='string' || !z.name.trim() || z.name.length>80 || !finite(z.factor,1,4) || !finite(z.lng,120.5,121.5) || !finite(z.lat,14,15.4))) throw Error('Invalid location: use five named zones with coordinates in Greater Manila and traffic factors 1–4.');
  if(!finite(c.ban.start,0,1440)||!finite(c.ban.end,0,1440)||c.ban.start>=c.ban.end||!['A','B'].includes(c.ban.type)||typeof c.ban.enabled!=='boolean') throw Error('Invalid restriction interval.');
  if(c.receivingHours!==undefined) {
    if(!c.receivingHours || typeof c.receivingHours!=='object' || Array.isArray(c.receivingHours) || Object.keys(c.receivingHours).length>500) throw Error('Receiving hours must contain up to 500 retailer entries.');
    for(const [id,h] of Object.entries(c.receivingHours)) {
      if(!/^RET-\d{3,6}$/.test(id) || !h || !Number.isInteger(h.open) || !Number.isInteger(h.close) || !finite(h.open,0,1439) || !finite(h.close,1,1439) || h.open>=h.close || typeof h.closed!=='boolean') throw Error(`Invalid receiving hours for ${id}: use an opening time before closing time on the same day.`);
    }
  }
  if(c.retailers!==undefined) {
    if(!Array.isArray(c.retailers)||c.retailers.length>500) throw Error('Use at most 500 synthetic retailer profiles.');
    const ids=new Set();
    for(const r of c.retailers) {
      if(!r||!/^RET-\d{3,6}$/.test(r.id)||ids.has(r.id)) throw Error('Retailer IDs must be unique RET- identifiers with 3 to 6 digits.');
      ids.add(r.id);
      if(r.synthetic!==true||typeof r.name!=='string'||!r.name.trim()||r.name.length>100||typeof r.address!=='string'||r.address.length>200||typeof r.city!=='string'||!r.city.trim()||r.city.length>80) throw Error(`Invalid synthetic retailer identity for ${r.id}.`);
      if(!DISTRIBUTORS.some(d=>d.name===r.distributor)||!Number.isInteger(r.zone)||!finite(r.zone,0,c.zones.length-1)||!finite(r.lng,120.5,121.5)||!finite(r.lat,14,15.4)) throw Error(`Invalid distributor, traffic zone or Greater Manila coordinates for ${r.id}.`);
      if(typeof r.enabled!=='boolean'||typeof r.closed!=='boolean'||!Number.isInteger(r.open)||!Number.isInteger(r.close)||!finite(r.open,0,1439)||!finite(r.close,1,1439)||r.open>=r.close) throw Error(`Invalid active status or same-day receiving window for ${r.id}.`);
      if(r.notes!==undefined&&(typeof r.notes!=='string'||r.notes.length>500)) throw Error(`Notes are too long for ${r.id}.`);
    }
  }
  for(const [key,fallback,max] of [['productCbm',PRODUCT_VOLUME,100],['productKg',PRODUCT_WEIGHT,100000]]) {
    const values=c[key]===undefined?fallback:c[key];
    if(!Array.isArray(values)||values.length!==5||values.some(v=>!finite(v,.000001,max))) throw Error(`Invalid ${key}: provide five positive per-box CBM/KG values.`);
  }
  validateAttendance(c.attendance);
  if(c.peakOrders!==undefined&&!finite(c.peakOrders,1,4))throw Error('Peak order multiplier must be 1-4.');
  if(c.peakExtraMinutes!==undefined&&(!Number.isInteger(c.peakExtraMinutes)||!finite(c.peakExtraMinutes,0,360)))throw Error('Peak extra working minutes must be a whole number from 0 to 360.');
  if(c.dailyOrders!==undefined&&(!Number.isInteger(c.dailyOrders)||!finite(c.dailyOrders,0,500)))throw Error('Use 0-500 whole daily orders.');
  if(c.currentFleet!==undefined&&(!c.currentFleet||['A','B'].some(t=>!Number.isInteger(c.currentFleet[t])||!finite(c.currentFleet[t],0,500))))throw Error('Use 0-500 whole current trucks of each type.');
  if(c.distributor!==undefined&&!DISTRIBUTORS.some(d=>d.name===c.distributor)) throw Error('Unknown distributor.');
  if(c.depot!==undefined&&(!c.depot||!finite(c.depot.lng,120.5,121.5)||!finite(c.depot.lat,14,15.4))) throw Error('Invalid depot coordinates.');
  if(c.distributor&&c.retailers?.some(r=>r.distributor!==c.distributor)) throw Error('Retailer master contains a different distributor.');
  let network;
  if(c.network!==undefined) {
    if(!c.network||typeof c.network!=='object'||Array.isArray(c.network)||Object.keys(c.network).length!==6) throw Error('Network must contain all six distributors.');
    network={};const ids=new Set();
    for(const d of DISTRIBUTORS) {
      const local=c.network[d.name];
      if(!local||local.network!==undefined||local.distributor!==d.name||!local.depot||!Array.isArray(local.retailers)) throw Error(`Invalid master for ${d.name}.`);
      network[d.name]=validateConfig(local);
      for(const r of local.retailers){if(ids.has(r.id))throw Error('Retailer IDs must be unique across the network.');ids.add(r.id);}
    }
  }
  return {...c,peakOrders:c.peakOrders??1.5,peakExtraMinutes:c.peakExtraMinutes??120,costing:normalizeCosting(c.costing),receivingHours:c.receivingHours??{},productCbm:copy(c.productCbm??PRODUCT_VOLUME),productKg:copy(c.productKg??PRODUCT_WEIGHT),...(network?{network}: {})};
}
