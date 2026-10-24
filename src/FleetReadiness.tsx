import {memo} from 'react';
import {fleetUsage} from '../fleet-experiment.js';
import type {Plan} from './types';
function FleetReadiness({plan}:{plan:Plan}){
  const usage=fleetUsage(plan);
  return <div className="fleet-readiness" role="status"><strong>Allocated trucks versus active routes</strong><div className="table-scroll"><table><thead><tr><th>Type</th><th>Allocated</th><th>Crew-ready</th><th>Active routes</th><th>Ready without a route</th><th>Blocked by crew</th></tr></thead><tbody>{(['A','B'] as const).map(type=><tr key={type}><td>Type {type}</td><td>{usage[type].allocated}</td><td>{usage[type].ready}</td><td>{usage[type].used}</td><td>{usage[type].idle}</td><td>{usage[type].blocked}</td></tr>)}</tbody></table></div><p>Vehicle routes lists trucks with planned deliveries only. Adding trucks does not add drivers/helpers. Crew-ready trucks can still have no route when remaining jobs fail time, load or road checks, or the heuristic does not retry them.</p></div>;
}
export default memo(FleetReadiness);
