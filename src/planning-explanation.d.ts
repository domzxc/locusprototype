import type {Config,Route} from './types';
export function trafficPercent(factor:number):number;
export function trafficFactor(percent:number):number;
export function stopTiming(route:Route,index:number,config:Config):{driving:number;receivingWait:number;restrictionWait:number;loading:number;unloading:number;fixedHandling:number;handling:number};
