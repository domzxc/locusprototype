import type {Plan,Config,VehicleType,Order,Route,CrewAvailability,Point} from './src/types';
export function clock(value:number):string;
export function diagnosePending(job:Order,c:Config,fleet:{A:number;B:number},staffing:CrewAvailability,routes:Route[],travel:(from:Point,to:Point,time:number,type:VehicleType,c:Config)=>{arrival:number},depot:Point):Order;
export function earlyReturnReview(plan:Plan,c:Config):{vehicle:string;type:VehicleType;returned:number;unusedMinutes:number;missing:number}[];
