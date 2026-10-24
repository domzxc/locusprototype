import {splitOrders} from './engine.js';

function retailerType(name){
  if(/sari[ -]?sari/i.test(name))return 'Sari-sari store';
  if(/supermarket/i.test(name))return 'Supermarket';
  if(/grocery|mini\s*mart|family\s*mart/i.test(name))return 'Grocery / minimart';
  if(/trading/i.test(name))return 'Trading store';
  return 'Not recorded';
}
export function buildReviewRows(orders,plan,c){
  const expected=new Map(),assigned=new Map(),missing=new Map(plan.unassignedDeliveries.map(j=>[j.id,j.reason]));
  for(const job of splitOrders(orders,c)){
    if(!expected.has(job.parentId))expected.set(job.parentId,[]);
    expected.get(job.parentId).push(job);
  }
  for(const route of plan.routes)for(const [index,stop] of route.stops.entries()){
    assigned.set(stop.id,{jobId:stop.id,vehicle:route.id,type:route.type,sequence:index+1,shipment:stop.shipment??(stop.cold?'frozen':'dry'),roadArrival:stop.arrival-stop.wait,serviceStart:stop.arrival,finish:stop.finish,storeWait:stop.wait,onTime:Number.isFinite(stop.arrival)&&Number.isFinite(stop.finish)&&stop.arrival>=stop.open-1e-9&&stop.finish>=stop.arrival&&stop.finish<=stop.close+1e-9&&!stop.receivingClosed});
  }
  return [...orders].sort((a,b)=>a.close-b.close||a.open-b.open||a.id.localeCompare(b.id,'en',{numeric:true})).map((order,index)=>{
    const jobs=expected.get(order.id)??[],assignments=jobs.flatMap(j=>assigned.has(j.id)?[assigned.get(j.id)]:[]);
    const fullyAssigned=jobs.length>0&&assignments.length===jobs.length,hasWindowIssue=assignments.some(a=>!a.onTime);
    const status=!assignments.length?'unserved':!fullyAssigned?'partial':hasWindowIssue?'outside-window':'on-time';
    const reasons=jobs.filter(j=>!assigned.has(j.id)).map(j=>`${j.shipment}: ${missing.get(j.id)??'Not assigned by the planner'}`);
    if(hasWindowIssue)reasons.push('Full service must start after receiving opens and finish by closing.');
    return {priority:index+1,order,retailerType:retailerType(order.name),cases:order.quantities.reduce((s,q)=>s+q,0),unloading:order.quantities.reduce((s,q,p)=>s+q*c.service[p],0),assignments,fullyAssigned,hasWindowIssue,status,reason:reasons.join('; ')||(fullyAssigned?'All delivery portions fit their receiving windows':'No delivery quantities to assign')};
  });
}
export function filterReviewRows(rows,filter='all',search=''){
  const query=search.trim().toLowerCase();
  return rows.filter(r=>(filter==='all'||filter==='served'&&r.fullyAssigned||filter==='outside-window'&&r.hasWindowIssue||filter==='partial'&&r.status==='partial'||filter==='unserved'&&!r.fullyAssigned)&&(!query||`${r.order.id} ${r.order.retailerId??''} ${r.order.name} ${r.order.area} ${r.retailerType} ${r.reason} ${r.assignments.map(a=>a.vehicle).join(' ')}`.toLowerCase().includes(query)));
}
