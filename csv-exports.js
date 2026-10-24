import {splitOrders,PRODUCTS} from './engine.js';
import {formatPHTime,toTimeInput,parseTimeInput} from './src/ph-conventions.js';

const formula=/^(?:\s*[=+\-@]|[\t\r\n'])/;
const protect=value=>typeof value==='string'&&formula.test(value)?`'${value}`:String(value??'');
const unprotect=value=>value.startsWith("'")&&formula.test(value.slice(1))?value.slice(1):value;
export function toCsv(rows,columns=[...new Set(rows.flatMap(Object.keys))]){
  const cell=value=>`"${protect(value).replaceAll('"','""')}"`;
  return '\uFEFF'+[columns,...rows.map(row=>columns.map(key=>row[key]??''))].map(row=>row.map(cell).join(',')).join('\r\n')+'\r\n';
}
export function parseCsv(text){
  if(text.length>10000000)throw Error('CSV exceeds the 10 MB limit.');
  text=text.replace(/^\uFEFF/,'');const records=[];let row=[],field='',quoted=false,closed=false;
  const push=()=>{row.push(unprotect(field));field='';closed=false;};
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(quoted){if(ch==='"'){if(text[i+1]==='"'){field+='"';i++;}else{quoted=false;closed=true;}}else field+=ch;continue;}
    if(ch==='"'){if(field||closed)throw Error('Invalid CSV quote.');quoted=true;}
    else if(ch===',')push();
    else if(ch==='\r'||ch==='\n'){if(ch==='\r'&&text[i+1]==='\n')i++;push();records.push(row);row=[];if(records.length>150000)throw Error('Too many CSV rows.');}
    else{if(closed)throw Error('Unexpected text after CSV quote.');field+=ch;}
  }
  if(quoted)throw Error('Unterminated CSV quote.');
  if(field||row.length||closed){push();records.push(row);}
  const headers=records.shift();
  if(!headers?.length||headers.some(h=>!h)||new Set(headers).size!==headers.length)throw Error('Missing or duplicate CSV headers.');
  return records.map(values=>{if(values.length!==headers.length)throw Error('CSV row has the wrong number of columns.');return Object.fromEntries(headers.map((h,i)=>[h,values[i]]));});
}
export function downloadCsv(name,content){
  const url=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8;'})),link=document.createElement('a');
  link.href=url;link.download=name.replace(/\.[^.]+$/,'')+'.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

const pointer=key=>key.replaceAll('~','~0').replaceAll('/','~1');
export function settingsCsv(config){
  const rows=[];
  function visit(value,path){
    const type=value===null?'null':Array.isArray(value)?'array':typeof value;
    rows.push({format:'domtransport-settings-v1',path,type,value:type==='object'||type==='array'||type==='null'?'':value});
    if(type==='object'||type==='array')for(const [key,child] of Object.entries(value))if(child!==undefined)visit(child,`${path}/${pointer(key)}`);
  }
  visit(config,'');return toCsv(rows);
}
export function readSettingsCsv(text){
  const rows=parseCsv(text),nodes=new Map();let root;
  for(const row of rows){
    if(row.format!=='domtransport-settings-v1')throw Error('Not a DomTransport settings CSV.');
    if(nodes.has(row.path))throw Error('Duplicate settings path.');
    const parts=row.path===''?[]:row.path.split('/').slice(1).map(k=>k.replaceAll('~1','/').replaceAll('~0','~'));
    if((row.path!==''&&!row.path.startsWith('/'))||/~(?![01])/.test(row.path)||parts.length>32||parts.some(k=>['__proto__','constructor','prototype'].includes(k)))throw Error('Unsafe settings path.');
    let value;
    if(row.type==='object')value={};else if(row.type==='array')value=[];else if(row.type==='null')value=null;
    else if(row.type==='string')value=row.value;
    else if(row.type==='number'&&row.value.trim()!==''&&Number.isFinite(Number(row.value)))value=Number(row.value);
    else if(row.type==='boolean'&&['true','false'].includes(row.value))value=row.value==='true';else throw Error('Invalid settings value/type.');
    if(!parts.length){if(row.type!=='object')throw Error('Settings root must be an object.');root=value;}
    else{
      const slash=row.path.lastIndexOf('/'),parent=nodes.get(row.path.slice(0,slash)),key=parts.at(-1);
      if(parent===null||typeof parent!=='object')throw Error('Invalid settings parent path.');
      if(Array.isArray(parent)&&(!/^(0|[1-9]\d*)$/.test(key)||Number(key)!==parent.length))throw Error('Invalid settings array path.');
      parent[key]=value;
    }
    nodes.set(row.path,value);
  }
  if(!root)throw Error('Empty settings CSV.');return root;
}

export function retailersCsv(retailers,distributor){
  return toCsv([{record_type:'master',distributor},...retailers.map(r=>({record_type:'retailer',distributor,...r,open:toTimeInput(r.open),close:r.close===1440?'00:00':toTimeInput(r.close),notes_present:Object.hasOwn(r,'notes')}))],['record_type','distributor','id','name','address','city','zone','lng','lat','open','close','closed','enabled','synthetic','notes','notes_present']);
}
export function readRetailersCsv(text){
  const rows=parseCsv(text),meta=rows.shift();
  if(meta?.record_type!=='master'||!meta.distributor)throw Error('Not a DomTransport retailer master CSV.');
  const boolean=value=>{if(!['true','false'].includes(value))throw Error('Use true or false for retailer flags.');return value==='true';};
  const numeric=value=>{if(value.trim()===''||!Number.isFinite(Number(value)))throw Error('Invalid retailer number.');return Number(value);};
  const receivingTime=(value,end)=>{const match=/^(\d{1,2}):([0-5]\d)(?::00)?$/.exec(value);return match?parseTimeInput(`${match[1].padStart(2,'0')}:${match[2]}`,end):NaN;};
  const retailers=rows.map(r=>{
    if(r.record_type!=='retailer'||r.distributor!==meta.distributor)throw Error('Retailer CSV contains a wrong distributor or record type.');
    const value={id:r.id,name:r.name,address:r.address,city:r.city,distributor:r.distributor,zone:numeric(r.zone),lng:numeric(r.lng),lat:numeric(r.lat),open:receivingTime(r.open,false),close:receivingTime(r.close,true),closed:boolean(r.closed),enabled:boolean(r.enabled),synthetic:boolean(r.synthetic)};
    if(boolean(r.notes_present))value.notes=r.notes;return value;
  });
  return {kind:'domtransport-retailer-master',version:1,distributor:meta.distributor,synthetic:true,retailers};
}

export function selectNetworkRuns(runs,scope='All'){
  if(scope==='All')return runs;
  const selected=runs.filter(r=>r.name===scope);if(!selected.length)throw Error('Unknown network scope.');return selected;
}
export function networkRows(runs,scenario,resourceMode,baselineRuns=[]){
  return runs.map(r=>({distributor:r.name,scenario,resource_mode:scenario==='peak'?resourceMode:'current',synthetic:true,travel_basis:'approximate',normal_orders:baselineRuns.find(n=>n.name===r.name)?.result.total??'',normal_operating_php:baselineRuns.find(n=>n.name===r.name)?.result.costs.operating??'',orders:r.result.total,complete_orders:r.result.served,incomplete_orders:r.result.unserved.length,partial_orders:r.result.partial,planned_portions:r.result.deliveryAssigned,required_portions:r.result.deliveryTotal,current_type_a:r.fleet.A-r.additionalFleet.A,current_type_b:r.fleet.B-r.additionalFleet.B,scenario_type_a:r.fleet.A,scenario_type_b:r.fleet.B,recommended_type_a:r.recommended.A,recommended_type_b:r.recommended.B,used_vehicles:r.result.routes.length,crew_ready_type_a:r.result.staffing.fleet.A,crew_ready_type_b:r.result.staffing.fleet.B,saved_drivers_present:r.result.staffing.driversPresent-r.temporaryDrivers,saved_helpers_present:r.result.staffing.helpersPresent-r.temporaryHelpers,drivers_present_in_plan:r.result.staffing.driversPresent,helpers_present_in_plan:r.result.staffing.helpersPresent,cbm_utilisation_pct:r.result.util*100,coverage_pct:r.result.coverage*100,average_drops:r.result.averageDrops,distance_km:r.result.km,shift_end_pht:formatPHTime(r.config.end),additional_type_a:r.additionalFleet.A,additional_type_b:r.additionalFleet.B,temporary_drivers:r.temporaryDrivers,temporary_helpers:r.temporaryHelpers,...Object.fromEntries(Object.entries(r.result.costs).map(([key,value])=>[`${key}_php`,value]))}));
}
export function allocationRows(regional){
  return regional.map(r=>({distributor:r.name,mapped_retailers:r.retailers,normal_orders:r.daily,peak_orders:r.peakDaily,normal_type_a:r.normal.A,normal_type_b:r.normal.B,peak_type_a:r.peak.A,peak_type_b:r.peak.B,synthetic:true,method:'Volume, weight and workload heuristic; not a calibrated full-network recommendation'}));
}
export function dispatchRows(orders,plan,c,scenario,resourceMode){
  const common={distributor:c.distributor??'Pasig',scenario,resource_mode:scenario==='peak'?resourceMode:'current',synthetic:true,travel_basis:plan.travelBasis,time_zone:'Asia/Manila'},assigned=new Map(),missing=new Map(plan.unassignedDeliveries.map(j=>[j.id,j]));
  for(const r of plan.routes)r.stops.forEach((s,i)=>assigned.set(s.id,{route:r,stop:s,sequence:i+1}));
  const incomplete=new Set(plan.unserved.map(o=>o.id)),assignedParents=new Set([...assigned.values()].map(a=>a.stop.parentId)),partial=new Set([...incomplete].filter(id=>assignedParents.has(id)));
  const rows=[{...common,record_type:'summary',orders:plan.total,complete_orders:plan.served,incomplete_orders:plan.unserved.length,partial_orders:plan.partial,planned_portions:plan.deliveryAssigned,required_portions:plan.deliveryTotal,available_type_a:plan.fleet.A,available_type_b:plan.fleet.B,crew_ready_type_a:plan.staffing.fleet.A,crew_ready_type_b:plan.staffing.fleet.B,distance_km:plan.km,coverage_pct:plan.coverage*100,scheduled_window_compliance_pct:plan.onTime*100,...Object.fromEntries(Object.entries(plan.costs).map(([key,value])=>[`${key}_php`,value]))}];
  for(const r of plan.routes)rows.push({...common,record_type:'vehicle',vehicle:r.id,vehicle_type:r.type,drops:r.stops.length,cbm:r.volume,kg:r.weight,distance_km:r.km,transport_php:r.cost,departure_pht:formatPHTime(r.depart+(r.stops[0]?.banWait??0)),depot_return_pht:formatPHTime(r.return)});
  for(const j of splitOrders(orders,c)){
    const a=assigned.get(j.id),s=a?.stop;
    const previous=a?(a.sequence===1?a.route.depart:a.route.stops[a.sequence-2].finish):0;
    rows.push({...common,record_type:'delivery',order:j.parentId,order_status:partial.has(j.parentId)?'Partially planned':incomplete.has(j.parentId)?'Unserved (planned)':'Served (planned)',retailer:j.retailerId??j.parentId,retailer_name:j.name,delivery:j.id,shipment:j.shipment,area:j.area,latitude:j.lat,longitude:j.lng,...Object.fromEntries(PRODUCTS.map((p,i)=>[`${p.toLowerCase().replaceAll(' ','_')}_cases`,j.quantities[i]])),cbm:j.volume,kg:j.weight,receiving_open_pht:formatPHTime(j.open),receiving_close_pht:formatPHTime(j.close),receiving_closed:!!j.receivingClosed,handling_min:j.service,loading_allowance_min:j.quantities.reduce((sum,q,p)=>sum+q*c.loadService[p],0),unloading_min:j.quantities.reduce((sum,q,p)=>sum+q*c.service[p],0),stop_tasks_min:c.stopBase,vehicle:a?.route.id??'',vehicle_type:a?.route.type??'',stop_sequence:a?.sequence??'',arrival_pht:s?formatPHTime(s.arrival-s.wait):'',service_start_pht:s?formatPHTime(s.arrival):'',finish_pht:s?formatPHTime(s.finish):'',driving_min:s?s.arrival-s.wait-previous-s.banWait:'',store_wait_min:s?.wait??'',truck_ban_wait_min:s?.banWait??'',status:s?'Scheduled (planned)':'Unserved (planned)',reason_code:missing.get(j.id)?.reasonCode??'',reason:missing.get(j.id)?.reason??''});
  }
  return rows;
}
