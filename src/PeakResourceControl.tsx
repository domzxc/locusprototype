import type {ResourceMode} from '../scenarios.js';
export default function PeakResourceControl({mode,onChange}:{mode:ResourceMode;onChange:(mode:ResourceMode)=>void}){
  return <div className="planning-toolbar"><strong>Peak resource plan</strong><div className="scenario-control" aria-label="Peak resource plan"><button aria-pressed={mode==='proposed'} className={mode==='proposed'?'selected':''} onClick={()=>onChange('proposed')}>Proposed seasonal resources</button><button aria-pressed={mode==='current'} className={mode==='current'?'selected':''} onClick={()=>onChange('current')}>Current resources only</button></div></div>;
}
