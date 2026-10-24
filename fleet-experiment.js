import {copy} from './engine.js';
import {assumedAttendance} from './staffing.js';

// A what-if crew package never overwrites saved daily attendance.
export function experimentCrew(config,fleet,enabled=false){
  if(!enabled)return {config,drivers:0,helpers:0};
  const next=copy(config);next.attendance=copy(config.attendance??assumedAttendance(config.currentFleet??fleet));
  let drivers=0,helpers=0;
  for(const type of ['A','B']){
    const a=next.attendance[type];
    const d=Math.min(1500-a.driversScheduled,Math.max(0,fleet[type]-a.driversPresent));
    const h=Math.min(1500-a.helpersScheduled,Math.max(0,fleet[type]*a.helpersPerTruck-a.helpersPresent));
    a.driversScheduled+=d;a.driversPresent+=d;a.helpersScheduled+=h;a.helpersPresent+=h;
    drivers+=d;helpers+=h;
  }
  return {config:next,drivers,helpers};
}
export function fleetUsage(plan){
  return Object.fromEntries(['A','B'].map(type=>{
    const used=plan.routes.filter(r=>r.type===type).length,ready=plan.staffing.fleet[type];
    return [type,{allocated:plan.fleet[type],ready,used,idle:Math.max(0,ready-used),blocked:plan.staffing.blocked[type]}];
  }));
}
