export const ORDER_STATUS={
  pending:{label:'Scheduled',color:'#2563eb',symbol:'○',rank:1},
  'in-progress':{label:'In progress',color:'#7c3aed',symbol:'◐',rank:2},
  served:{label:'Served (simulated)',color:'#15803d',symbol:'✓',rank:0},
  partial:{label:'Partially planned',color:'#b45309',symbol:'!',rank:3},
  unserved:{label:'Unassigned',color:'#b91c1c',symbol:'×',rank:4}
};
export function createPlaybackOrders(orders,routes,unserved){
  const assignments=new Map(),reasons=new Map(unserved.map(o=>[o.id,o.reason??'Not fully assigned']));
  for(const route of routes)for(const stop of route.stops){
    const id=stop.parentId??stop.id;
    if(!assignments.has(id))assignments.set(id,[]);
    assignments.get(id).push({vehicle:route.id,jobId:stop.id,shipment:stop.shipment??(stop.cold?'frozen':'dry'),arrival:stop.arrival-stop.wait,start:stop.arrival,finish:stop.finish,point:stop.roadPoint??stop});
  }
  return orders.map(order=>{
    const jobs=assignments.get(order.id)??[],required=Number(order.quantities[1]>0)+Number(order.quantities.some((q,p)=>p!==1&&q>0));
    return {order,assignments:jobs,required,reason:reasons.get(order.id)??'',point:jobs[0]?.point??order};
  });
}
export function playbackOrderStates(timeline,minute){
  return timeline.map(row=>{
    const completed=row.assignments.filter(a=>minute>=a.finish).length;
    const full=row.required>0&&row.assignments.length===row.required&&!row.reason;
    const status=!row.assignments.length?'unserved':!full?'partial':completed===row.required?'served':completed||row.assignments.some(a=>minute>=a.arrival&&minute<a.finish)?'in-progress':'pending';
    return {...row,completed,status};
  });
}
export function truckState(status){
  if(status==='Returned to depot')return {label:'Returned',kind:'returned'};
  if(status==='Handling delivery')return {label:'Handling',kind:'handling'};
  if(status==='Waiting / restriction')return {label:'Ban wait',kind:'waiting'};
  if(status==='Waiting for window')return {label:'Store wait',kind:'waiting'};
  if(status==='Depot preparation')return {label:'Preparing',kind:'preparing'};
  return {label:status==='Returning'?'Returning':'Travelling',kind:'travelling'};
}
