import { useMemo } from 'react';
import { networkPlans, summarizeNetwork } from '../network.js';
import { PH_UNITS } from './ph-conventions.js';
import type { Config } from './types';

const money=(n:number)=>new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP',maximumFractionDigits:0}).format(n);
export default function NetworkOverview({root,scenario,onScenario,onOpen}:{root:Config;scenario:string;onScenario:(value:string)=>void;onOpen:(name:string)=>void}) {
  const runs=useMemo(()=>networkPlans(root,scenario),[root,scenario]);
  const total=useMemo(()=>summarizeNetwork(runs),[runs]);
  function exportNetwork(){
    const value={kind:'domtransport-network-plan',version:1,synthetic:true,units:PH_UNITS,scenario,totals:total,distributors:runs,limitations:'Independent synthetic sample days; no cross-depot pooling, live traffic or proven optimisation. Not a full-network fleet recommendation.'};
    const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'})),link=document.createElement('a');
    link.href=url;link.download='domtransport-network-plan.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return <>
    <div className="planning-toolbar"><div><h2>Overall delivery performance</h2><p>Combined results from six independently planned distributor sample days using their saved current trucks.</p></div><div className="scenario-control"><button className={scenario==='normal'?'selected':''} onClick={()=>onScenario('normal')}>Normal day</button><button className={scenario==='peak'?'selected':''} onClick={()=>onScenario('peak')}>Peak season</button></div><button onClick={exportNetwork}>Export network plan</button></div>
    <div className="notice">The business footprint is approximately 50,000 mapped retailers. This demo starts with 100 synthetic retailer profiles per distributor (600 total), or preserves your existing Pasig sample. These are sample-day plans, not 50,000 daily orders or a validated full-scale fleet. All depot locations, traffic and receiving schedules are illustrative.</div>
    <div className="kpi-grid dispatch-kpis">
      <section className="card metric"><div className="metric-label">VEHICLES USED / CURRENT</div><div className="metric-value">{total.vehicles}<span> / {total.allocated}</span></div><p>Six separate depot fleets</p></section>
      <section className="card metric"><div className="metric-label">PLANNED ORDER COVERAGE</div><div className="metric-value">{Math.round(total.coverage*100)}%</div><p>{total.served}/{total.total} complete orders</p></section>
      <section className="card metric"><div className="metric-label">AVG. DROPS / USED TRUCK</div><div className="metric-value">{total.averageDrops.toFixed(1)}</div><p>All assigned frozen/dry visits / used vehicles</p></section>
      <section className="card metric"><div className="metric-label">ESTIMATED DISTANCE</div><div className="metric-value">{total.km.toFixed(1)}<span> KM</span></div><p>Includes each depot return</p></section>
      <section className="card metric"><div className="metric-label">OPERATING COST ESTIMATE</div><div className="metric-value">{money(total.operatingCost)}</div><p>Includes additional operating allowances</p></section>
    </div>
    <section className="card"><div className="card-title"><div><h2>Distributor comparison</h2><p>Open a distributor to inspect routes, exceptions and its master data.</p></div></div><div className="table-scroll"><table><thead><tr><th>Distributor</th><th>Sample orders</th><th>Complete / incomplete</th><th>Current A + B</th><th>Recommended A + B</th><th>Used vehicles</th><th>CBM utilisation</th><th>KM</th><th>Operating estimate (PHP)</th><th>Workspace</th></tr></thead><tbody>{runs.map(r=><tr key={r.name}><td><strong>{r.name}</strong><small>{r.config.zones.length} local traffic zones</small></td><td>{r.result.total}</td><td>{r.result.served} / {r.result.unserved.length}</td><td>{r.fleet.A} + {r.fleet.B}</td><td>{r.recommended.A} + {r.recommended.B}</td><td>{r.result.routes.length}</td><td>{Math.round(r.result.util*100)}%</td><td>{r.result.km.toFixed(1)}</td><td>{money(r.result.costs.operating)}</td><td><button onClick={()=>onOpen(r.name)}>Open dispatch</button></td></tr>)}</tbody></table></div></section>
    <div className="notice">Network risk / opportunity exposure: {money(total.riskExposure)}. Combined operating + exposure estimate: {money(total.economicTotal)}. Exposure includes assumed spoilage and unassigned contribution margin, not confirmed losses.</div>
    <p className="planning-disclaimer">Network totals use saved current depot fleets and approximate travel; local OSRM-validated dispatch plans are not included in this baseline. Temporary fleet overrides in a distributor dispatch view are local what-if experiments. No vehicles are pooled between depots. Coverage counts fully planned parent orders; these are modeled outcomes, not delivery confirmations.</p>
  </>;
}
