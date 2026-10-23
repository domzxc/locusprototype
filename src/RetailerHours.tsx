import { useMemo, useState } from 'react';
import { copy, generateOrders, validateConfig } from '../engine.js';
import type { Config, ReceivingHours } from './types';

function clock(minutes:number){return Number.isFinite(minutes)?`${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`:'';}
function minutes(value:string){if(!value)return NaN;const [h,m]=value.split(':').map(Number);return h*60+m;}

export default function RetailerHours({config,onSave}:{config:Config;onSave:(c:Config)=>void}){
  const [draft,setDraft]=useState(()=>copy(config.receivingHours)),[search,setSearch]=useState(''),[message,setMessage]=useState('');
  const retailers=useMemo(()=>generateOrders({...config,receivingHours:{}}),[config]);
  const visible=retailers.filter(o=>`${o.id} ${o.name} ${o.area}`.toLowerCase().includes(search.toLowerCase()));
  function update(id:string,baseline:ReceivingHours,patch:Partial<ReceivingHours>){setDraft(previous=>({...previous,[id]:{...(previous[id]??baseline),...patch}}));}
  function apply(){try{onSave(validateConfig({...config,receivingHours:draft}));}catch(e){setMessage((e as Error).message);}}
  function stressExample(){
    const example:Record<string,ReceivingHours>={};
    retailers.slice(0,15).forEach((o,i)=>{example[o.id]={open:o.open,close:i<5?o.close:o.open+15,closed:i<5};});
    setDraft(example);setMessage('Example loaded: first 5 retailers closed; next 10 have 15-minute windows. Apply receiving hours to test the plan.');
  }
  return <section className="card retailer-hours" aria-label="Retailer receiving hours management">
    <div className="card-title"><div><h2>Pasig retailer receiving hours</h2><p>One same-day receiving window per retailer. Full handling must finish before closing.</p></div><button className="primary" onClick={apply}>Apply receiving hours</button></div>
    <div className="hours-toolbar"><input aria-label="Search receiving hours" placeholder="Search retailer or zone…" value={search} onChange={e=>setSearch(e.target.value)}/><button onClick={stressExample}>Load receiving-hours stress example</button><button onClick={()=>{setDraft({});setMessage('Generated receiving windows restored in the editor. Apply receiving hours to save.');}}>Restore generated windows</button></div>
    <p className="hours-description">Synthetic schedules for the demo day. Closed retailers remain in the order book and count as unassigned. Edits are saved in this browser and included in settings exports. The stress example demonstrates constraints; it is not a forecast of failed deliveries.</p>
    {message&&<p className="hours-message" role="status">{message}</p>}
    <div className="table-scroll hours-table"><table><thead><tr><th>Retailer</th><th>Zone</th><th>Receiving opens</th><th>Receiving closes</th><th>Closed on demo day</th><th>Schedule</th></tr></thead><tbody>{visible.map(o=>{
      const baseline={open:o.open,close:o.close,closed:false}, h=draft[o.id]??baseline;
      return <tr key={o.id}><td><strong>{o.id}</strong><small>{o.name}</small></td><td>{o.area}</td><td><input aria-label={`${o.id} receiving opens`} type="time" step="60" value={clock(h.open)} disabled={h.closed} onChange={e=>update(o.id,baseline,{open:minutes(e.target.value)})}/></td><td><input aria-label={`${o.id} receiving closes`} type="time" step="60" value={clock(h.close)} disabled={h.closed} onChange={e=>update(o.id,baseline,{close:minutes(e.target.value)})}/></td><td><label className="hours-closed"><input aria-label={`${o.id} closed on demo day`} type="checkbox" checked={h.closed} onChange={e=>update(o.id,baseline,{closed:e.target.checked})}/>{h.closed?'Closed':'Receiving'}</label></td><td><span className="tag">{draft[o.id]?'Edited':'Generated'}</span></td></tr>;
    })}</tbody></table>{!visible.length&&<p className="empty">No matching retailers.</p>}</div>
    <div className="hours-footer"><span>{Object.keys(draft).length} saved / edited schedules · {retailers.length} retailers in this demo</span><button className="primary" onClick={apply}>Apply receiving hours</button></div>
  </section>;
}
