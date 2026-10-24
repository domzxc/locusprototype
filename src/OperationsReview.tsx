import {memo,useMemo,useState} from 'react';
import {PRODUCTS} from '../engine.js';
import {buildReviewRows,filterReviewRows} from '../operations-review.js';
import type {ReviewFilter,ReviewStatus} from '../operations-review.js';
import {formatPHTime as time} from './ph-conventions.js';
import type {Config,Order,Plan} from './types';

const labels:Record<ReviewStatus,string>={'on-time':'On time (planned)','outside-window':'Outside window (planned)',partial:'Partially planned',unserved:'Unserved (planned)'};
function OperationsReview({orders,plan,config,onVehicle}:{orders:Order[];plan:Plan;config:Config;onVehicle?:(id:string)=>void}){
  const [filter,setFilter]=useState<ReviewFilter>('all'),[search,setSearch]=useState('');
  const rows=useMemo(()=>buildReviewRows(orders,plan,config),[orders,plan,config]);
  const visible=useMemo(()=>filterReviewRows(rows,filter,search),[rows,filter,search]);
  const tabs:[ReviewFilter,string][]=[['all','All orders'],['served','Served (planned)'],['partial','Partial'],['unserved','Unserved / incomplete'],['outside-window','Outside window']];
  return <section className="card operations-review">
    <div className="card-title"><div><h2>Operations review</h2><p>One row per parent order. Mixed frozen/dry baskets show separate vehicles and timings.</p></div><label className="field"><span>Find an order, store, area or vehicle</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search operations review"/></label></div>
    <div className="review-filters" role="group" aria-label="Operations review status filters">{tabs.map(([value,label])=><button type="button" key={value} aria-pressed={filter===value} className={filter===value?'selected':''} onClick={()=>setFilter(value)}>{label} <span>{filterReviewRows(rows,value).length}</span></button>)}</div>
    <p className="review-help">Planned outcomes, not actual delivery confirmations. On time requires every delivery portion to finish handling within receiving hours. Unserved / incomplete includes partial orders. Unserved means left outside this plan; it does not confirm an actual failed delivery. Reasons describe the failed attempt or search limit, not proof that every possible route fails. Priority sorts earlier closing windows first; it is not vehicle visit sequence. Retailer types are inferred from demo names; unloading is the required allowance for all ordered cases.</p>
    <div className="table-scroll review-table"><table><thead><tr><th>Priority</th><th>Order / retailer</th><th>Area</th><th>Retailer type</th><th>Ordered (cases)</th><th>Cases</th><th>CBM / KG</th><th>Unloading (min)</th><th>Delivery window (PHT)</th><th>Vehicle / stop</th><th>Arrival (PHT)</th><th>Service start (PHT)</th><th>Finish (PHT)</th><th>Status</th><th>Review reason</th></tr></thead><tbody>{visible.map(row=><tr key={row.order.id}>
      <td>{row.priority}</td><td><strong>{row.order.id}</strong><small>{row.order.retailerId??row.order.id}<br/>{row.order.name}</small></td><td>{row.order.area}</td><td>{row.retailerType}</td><td>{row.order.quantities.map((q,p)=>q?`${PRODUCTS[p]} ${q}`:'').filter(Boolean).join(', ')}</td><td>{row.cases}</td><td>{row.order.volume.toFixed(2)} CBM<br/>{Number(row.order.weight.toFixed(2))} KG</td><td>{row.unloading.toFixed(1)}</td><td>{row.order.receivingClosed?'Closed':`${time(row.order.open)} to ${time(row.order.close)}`}</td>
      <td>{row.assignments.length?row.assignments.map(a=><div className="review-assignment" key={a.jobId}><button className="text-button" onClick={()=>onVehicle?.(a.vehicle)}>{a.vehicle} / stop {a.sequence}</button><small>{a.shipment}</small></div>):'No vehicle planned'}</td>
      <td>{row.assignments.length?row.assignments.map(a=><div className="review-assignment" key={a.jobId}>{time(a.roadArrival)}<small>{a.vehicle} - {a.shipment}</small></div>):'Not scheduled'}</td>
      <td>{row.assignments.length?row.assignments.map(a=><div className="review-assignment" key={a.jobId}>{time(a.serviceStart)}<small>{a.vehicle} - {a.shipment}</small></div>):'Not scheduled'}</td>
      <td>{row.assignments.length?row.assignments.map(a=><div className="review-assignment" key={a.jobId}>{time(a.finish)}<small>{a.vehicle} - {a.shipment}</small></div>):'Not scheduled'}</td>
      <td><span className={`review-status ${row.status}`}>{labels[row.status]}</span></td><td>{row.reason}</td>
    </tr>)}{!visible.length&&<tr><td colSpan={15}>No orders match this status and search.</td></tr>}</tbody></table></div>
    <p className="review-help">Showing {visible.length} of {rows.length} orders. Travel basis: {plan.travelBasis==='road'?'OSRM roads with assumed traffic':'approximate travel with assumed traffic'}. Arrival is arrival before waiting for the store; service start is after that wait. The planner rejects infeasible assignments, so Outside window will normally be zero. Full handling also includes loading allowance and stop tasks, shown in the vehicle manifest.</p>
  </section>;
}

export default memo(OperationsReview);
