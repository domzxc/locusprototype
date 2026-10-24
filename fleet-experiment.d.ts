import type {Config,Plan} from './src/types';
export function experimentCrew(config:Config,fleet:{A:number;B:number},enabled?:boolean):{config:Config;drivers:number;helpers:number};
export interface FleetUsage {allocated:number;ready:number;used:number;idle:number;blocked:number;}
export function fleetUsage(plan:Plan):{A:FleetUsage;B:FleetUsage};
