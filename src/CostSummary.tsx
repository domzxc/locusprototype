import type { Plan } from './types';
const money=(n:number)=>new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP',maximumFractionDigits:0}).format(n);
export default function CostSummary({plan}:{plan:Plan}) {
  const c=plan.costs;
  const items:[string,number,string][]=[
    ['Base transport',c.transport,'Used-vehicle daily fixed charges + distance running rates'],
    ['Idle fleet ownership / lease',c.idle,'Allocated but unused vehicles only'],
    ['Maintenance allowance',c.maintenance,'Route KM x additional maintenance PHP/KM'],
    ['Toll allowance',c.tolls,'Assumed amount per used tour; not detected toll plazas'],
    ['Crew overtime estimate',c.overtime,'Modeled duty above paid hours, including depot preparation'],
    ['Estimated frozen damage/spoilage risk',c.spoilage,'Assigned frozen boxes x inventory cost per box x assumed damage percentage'],
    ['Estimated profit at risk on undelivered boxes',c.lostMargin,'Undelivered boxes x assumed contribution profit per box; only the missing portion of partial orders']
  ];
  return <section className="card cost-summary"><div className="card-title"><div><h2>Estimated cost breakdown <span className="tag">PHP</span></h2><p>Editable scenario assumptions in Data studio. Travel basis: {plan.travelBasis==='road'?'OSRM road distances':'approximate detoured distances'}.</p></div></div><div className="table-scroll"><table><thead><tr><th>Component</th><th>Estimate</th><th>Basis</th></tr></thead><tbody>{items.map(([name,value,note])=><tr key={name}><td>{name}</td><td>{money(value)}</td><td>{note}</td></tr>)}</tbody></table></div><div className="cost-totals"><span>Operating estimate <strong>{money(c.operating)}</strong></span><span>Estimated damage + profit at risk <strong>{money(c.spoilage+c.lostMargin)}</strong></span><span>Combined scenario estimate <strong>{money(c.economicTotal)}</strong></span></div><p className="planning-disclaimer">Possible product damage and missed profit are estimates, not confirmed expenses or lost sales. Toll, maintenance and overtime rates are assumptions, not invoices or statutory rates. Base fixed costs cover used vehicles; idle rates cover unused vehicles. Set extra allowances to zero if already included in base rates. Attendance limits available trucks; wages, paid absences and replacement labor are not separately costed. Overtime remains a configured per-vehicle crew allowance.</p></section>;
}
