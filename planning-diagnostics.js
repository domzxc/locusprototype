import {formatPHTime} from './src/ph-conventions.js';

export const clock=value=>`${formatPHTime(value)} PHT`;
const minutes=value=>Math.ceil(Math.max(0,value)-1e-9);
export function diagnosePending(job,c,fleet,staffing,routes,travel,depot){
  const type=job.cold?'A':'B',spec=c[type];
  const result=(reasonCode,reason)=>({...job,reasonCode,reason});
  if(job.receivingClosed)return result('receiving-closed','Retailer closed for receiving on this demo day');
  if(job.service>job.close-job.open)return result('handling-window',`Full handling needs ${job.service.toFixed(1)} min; receiving window ${clock(job.open)} to ${clock(job.close)} provides only ${job.close-job.open} min.`);
  if(job.volume>spec.capacity||job.weight>spec.weight)return result('oversized',`Order exceeds compatible vehicle capacity: Type ${type} requires ${job.volume.toFixed(2)}/${spec.capacity} CBM and ${job.weight.toFixed(1)}/${spec.weight} KG (required / limit).`);
  if(!fleet[type])return result('no-truck',`No Type ${type} truck allocated; this ${job.shipment} delivery requires Type ${type}.`);
  if(!staffing.fleet[type])return result('no-crew',`No driver/helper crew available for this vehicle type: ${fleet[type]} Type ${type} trucks, 0 crew-ready.`);
  const used=routes.filter(r=>r.type===type),candidates=[...used];
  if(used.length<staffing.fleet[type])candidates.push({id:`Unused Type ${type}`,stops:[],volume:0,weight:0,depart:c.start+c.loading});
  const counts={capacity:0,window:0,shift:0,feasible:0},attempts=[];
  for(const route of candidates){
    const last=route.stops.at(-1),time=last?.finish??route.depart;
    if(route.volume+job.volume>spec.capacity+1e-9||route.weight+job.weight>spec.weight+1e-9){
      counts.capacity++;attempts.push({code:'tour-capacity',score:Infinity,text:`${route.id}: tour load would be ${(route.volume+job.volume).toFixed(2)}/${spec.capacity} CBM and ${(route.weight+job.weight).toFixed(1)}/${spec.weight} KG.`});continue;
    }
    const leg=travel(last??depot,job,time,type,c),start=Math.max(leg.arrival,job.open),finish=start+job.service,back=travel(job,depot,finish,type,c);
    if(finish>job.close+1e-9){counts.window++;attempts.push({code:'receiving-window',score:finish-job.close,text:`${route.id}: append service ${clock(start)} to ${clock(finish)}; receiving closes ${clock(job.close)} (${minutes(finish-job.close)} min late).`});}
    else if(back.arrival>c.end+1e-9){counts.shift++;attempts.push({code:'shift-return',score:back.arrival-c.end,text:`${route.id}: append depot return ${clock(back.arrival)} exceeds shift end ${clock(c.end)} by ${minutes(back.arrival-c.end)} min.`});}
    else {counts.feasible++;attempts.push({code:'search-not-retried',score:-1,text:`${route.id}: an approximate append check fits (${clock(start)} service, ${clock(back.arrival)} return), but the greedy search did not retry this job. Road feasibility is not verified.`});}
  }
  const best=attempts.sort((a,b)=>a.score-b.score)[0];
  return result(best?.code??'heuristic-limit',`Approximate final-tour screening: ${counts.capacity} capacity-blocked, ${counts.window} receiving-window-blocked, ${counts.shift} shift-return-blocked, ${counts.feasible} possible append(s). ${best?.text??'No candidate tour tested.'} Single tour per truck; alternative sequences and reloads were not searched. ${staffing.blocked[type]} Type ${type} truck(s) unavailable due to crew.`);
}

export function earlyReturnReview(plan,c){
  return plan.routes.filter(r=>r.return<c.end-1e-9).map(r=>({vehicle:r.id,type:r.type,returned:r.return,unusedMinutes:c.end-r.return,missing:plan.unassignedDeliveries.filter(j=>(j.cold?'A':'B')===r.type).length})).filter(r=>r.missing>0);
}
