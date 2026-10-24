// Synthetic day-level counts, ring-fenced by vehicle type. No named HR records.
export function assumedAttendance(fleet) {
  return Object.fromEntries(['A','B'].map(type=>[type,{driversScheduled:fleet[type],driversPresent:fleet[type],helpersScheduled:fleet[type],helpersPresent:fleet[type],helpersPerTruck:1}]));
}
export function validateAttendance(value) {
  if(value===undefined)return;
  for(const type of ['A','B']){
    const a=value?.[type];
    for(const key of ['driversScheduled','driversPresent','helpersScheduled','helpersPresent'])if(!Number.isInteger(a?.[key])||a[key]<0||a[key]>1500)throw Error('Attendance counts must be whole numbers from 0 to 1500.');
    if(a.driversPresent>a.driversScheduled||a.helpersPresent>a.helpersScheduled)throw Error('Present attendance cannot exceed scheduled staff.');
    if(!Number.isInteger(a.helpersPerTruck)||a.helpersPerTruck<0||a.helpersPerTruck>3)throw Error('Use 0-3 required helpers per truck.');
  }
}
export function crewAvailability(c,fleet) {
  const attendance=c.attendance??assumedAttendance(fleet);
  validateAttendance(attendance);
  const ready={},blocked={};let driversScheduled=0,driversPresent=0,helpersScheduled=0,helpersPresent=0;
  for(const type of ['A','B']){
    const a=attendance[type];
    ready[type]=Math.min(fleet[type],a.driversPresent,a.helpersPerTruck?Math.floor(a.helpersPresent/a.helpersPerTruck):fleet[type]);
    blocked[type]=fleet[type]-ready[type];
    driversScheduled+=a.driversScheduled;driversPresent+=a.driversPresent;
    helpersScheduled+=a.helpersScheduled;helpersPresent+=a.helpersPresent;
  }
  return {fleet:ready,blocked,crewBlocked:blocked.A+blocked.B,driversScheduled,driversPresent,helpersScheduled,helpersPresent,assumed:c.attendance===undefined};
}
