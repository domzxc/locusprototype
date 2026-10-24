import type {Config,Order} from './src/types';
export type ResourceMode='current'|'proposed';
export interface ScenarioInputs {config:Config;orders:Order[];recommended:{A:number;B:number};fleet:{A:number;B:number};resourceMode:ResourceMode;additionalFleet:{A:number;B:number};temporaryDrivers:number;temporaryHelpers:number;}
export function planningScenario(master:Config,scenario?:string,resourceMode?:ResourceMode):ScenarioInputs;
