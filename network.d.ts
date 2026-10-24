import type { Attendance, Config, Order, Plan } from './src/types';
export interface DistributorRun {name:string;retailers:number;config:Config;orders:Order[];fleet:{A:number;B:number};recommended:{A:number;B:number};result:Plan;}
export function initializeNetwork(value:Config):Config;
export function importNetworkSettings(value:unknown):Config;
export function nextRetailerId(ids:string[]):string;
export function distributorConfig(root:Config,name:string):Config;
export function updateDistributor(root:Config,name:string,value:Config):Config;
export function networkPlans(root:Config,scenario?:string):DistributorRun[];
export function summarizeNetwork(runs:DistributorRun[]):{driversScheduled:number;driversPresent:number;helpersScheduled:number;helpersPresent:number;crewBlocked:number;crewReady:number;operatingCost:number;riskExposure:number;economicTotal:number;total:number;served:number;vehicles:number;assigned:number;allocated:number;km:number;cost:number;coverage:number;averageDrops:number;util:number};

export function setDepotWorkload(root:Config,name:string,count:number,currentFleet:{A:number;B:number},attendance?:Attendance):Config;
