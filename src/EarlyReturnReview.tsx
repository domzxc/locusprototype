import {memo,useMemo} from 'react';
import {earlyReturnReview} from '../planning-diagnostics.js';
import {formatPHTime as time} from './ph-conventions.js';
import type {Config,Plan} from './types';
function EarlyReturnReview({plan,config}:{plan:Plan;config:Config}){
  const rows=useMemo(()=>earlyReturnReview(plan,config),[plan,config]);
  if(!rows.length)return null;
  return <section className="card"><div className="card-title"><div><h2>Early returns with unserved deliveries</h2><p>{rows.length} truck(s) return before shift end while compatible deliveries remain outside the plan.</p></div></div><div className="manifest-timing-help"><p>A return at 3 PM means the planned tour ended, not that every store was served. Each truck makes one loaded tour. No depot reload or second trip is planned. Road validation retries omitted jobs once on spare staffed trucks, but may still shorten tours when checks fail.</p><p>Review the reasons below, receiving hours and possible resequencing before adding trucks. Time left in the shift is not proof that another delivery fits. The counts below refer to the same shared pool of unserved frozen or dry portions; do not add them across trucks.</p></div><details><summary>Inspect return times and unused shift time (PHT)</summary><div className="table-scroll"><table><thead><tr><th>Vehicle</th><th>Depot return</th><th>Shift end</th><th>Unused shift (min)</th><th>Unserved compatible portions</th></tr></thead><tbody>{rows.map(r=><tr key={r.vehicle}><td>{r.vehicle}</td><td>{time(r.returned)}</td><td>{time(config.end)}</td><td>{Math.floor(r.unusedMinutes)}</td><td>{r.missing}</td></tr>)}</tbody></table></div></details></section>;
}
export default memo(EarlyReturnReview);
