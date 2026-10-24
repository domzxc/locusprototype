import {allocate,generateOrders,scenarioConfig,copy} from './engine.js';
import {assumedAttendance} from './staffing.js';

// A proposed seasonal package is an explicit what-if, never a saved asset or HR edit.
export function planningScenario(master,scenario='normal',resourceMode='current') {
  const orders=generateOrders(master,scenario),operating=scenarioConfig(master,scenario);
  const recommended=allocate(orders,operating),current=master.currentFleet??(scenario==='peak'?allocate(generateOrders(master),master):recommended);
  const proposed=scenario==='peak'&&resourceMode==='proposed';
  const fleet=proposed?{A:Math.min(500,Math.max(current.A,recommended.A)),B:Math.min(500,Math.max(current.B,recommended.B))}:{...current};
  const config=proposed?copy(operating):operating;
  let temporaryDrivers=0,temporaryHelpers=0;
  if(proposed){
    config.attendance=copy(master.attendance??assumedAttendance(current));
    for(const type of ['A','B']){
      const a=config.attendance[type];
      const drivers=Math.min(1500-a.driversScheduled,Math.max(0,fleet[type]-a.driversPresent));
      const helpers=Math.min(1500-a.helpersScheduled,Math.max(0,fleet[type]*a.helpersPerTruck-a.helpersPresent));
      a.driversScheduled+=drivers;a.driversPresent+=drivers;
      a.helpersScheduled+=helpers;a.helpersPresent+=helpers;
      temporaryDrivers+=drivers;temporaryHelpers+=helpers;
    }
  }
  return {config,orders,recommended,fleet,resourceMode:proposed?'proposed':'current',additionalFleet:{A:fleet.A-current.A,B:fleet.B-current.B},temporaryDrivers,temporaryHelpers};
}
