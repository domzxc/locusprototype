export const costDefaults={
  paidHours:8,spoilageRate:.01,frozenBoxValue:1200,marginPerBox:[80,150,70,400,60],
  A:{idleDaily:1000,maintenanceKm:3,tollPerTour:80,overtimeHour:120},
  B:{idleDaily:800,maintenanceKm:2,tollPerTour:120,overtimeHour:100}
};
export function normalizeCosting(value) {
  if(value===undefined)return structuredClone(costDefaults);
  const valid=(v,max=100000)=>Number.isFinite(v)&&v>=0&&v<=max;
  if(!value||!valid(value.paidHours,24)||value.paidHours<1||!valid(value.spoilageRate,1)||!valid(value.frozenBoxValue))throw Error('Invalid cost hours, spoilage fraction or frozen box value.');
  if(!Array.isArray(value.marginPerBox)||value.marginPerBox.length!==5||value.marginPerBox.some(v=>!valid(v)))throw Error('Provide five nonnegative contribution margins per box.');
  for(const t of ['A','B'])for(const key of ['idleDaily','maintenanceKm','tollPerTour','overtimeHour'])if(!valid(value[t]?.[key]))throw Error(`Invalid Type ${t} ${key} cost.`);
  return structuredClone(value);
}
export function costBreakdown(routes,unassigned,c,fleet) {
  const a=c.costing??costDefaults;
  const b={transport:0,idle:0,maintenance:0,tolls:0,overtime:0,spoilage:0,lostMargin:0,operating:0,economicTotal:0};
  for(const type of ['A','B'])b.idle+=Math.max(0,fleet[type]-routes.filter(r=>r.type===type).length)*a[type].idleDaily;
  for(const r of routes){
    b.transport+=r.cost;
    b.maintenance+=r.km*a[r.type].maintenanceKm;
    b.tolls+=a[r.type].tollPerTour;
    b.overtime+=Math.max(0,(r.return-c.start)/60-a.paidHours)*a[r.type].overtimeHour;
    b.spoilage+=r.stops.reduce((s,o)=>s+o.quantities[1],0)*a.frozenBoxValue*a.spoilageRate;
  }
  b.lostMargin=unassigned.reduce((sum,j)=>sum+j.quantities.reduce((s,q,p)=>s+q*a.marginPerBox[p],0),0);
  b.operating=b.transport+b.idle+b.maintenance+b.tolls+b.overtime;
  b.economicTotal=b.operating+b.spoilage+b.lostMargin;
  return b;
}
