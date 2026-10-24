import type { Config, Order, Plan, Point, RoadLeg } from './src/types';
export const ROAD_ENDPOINT:string;
export interface RoadResponse {provider:string;legs:RoadLeg[];snaps:(Point&{metres:number})[];}
export type RoadRouter=(points:Point[],options?:{signal?:AbortSignal})=>Promise<RoadResponse>;
export function parseRoadResponse(value:unknown,count:number):RoadResponse;
export function createOsrmClient(options?:{fetchImpl?:typeof fetch;intervalMs?:number;storage?:Pick<Storage,'getItem'|'setItem'>|null;cacheTtlMs?:number;now?:()=>number;timeoutMs?:number}):RoadRouter;
export function validateRoadPlan(orders:Order[],config:Config,fleet:{A:number;B:number},base:Plan,router:RoadRouter,options?:{signal?:AbortSignal;onProgress?:(message:string)=>void;maxPasses?:number}):Promise<Plan>;
