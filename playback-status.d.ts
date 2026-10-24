import type {Order,Point,Route} from './src/types';
export type PlaybackStatus='pending'|'in-progress'|'served'|'partial'|'unserved';
export const ORDER_STATUS:Record<PlaybackStatus,{label:string;color:string;symbol:string;rank:number}>;
export interface PlaybackAssignment {vehicle:string;jobId:string;shipment:string;arrival:number;start:number;finish:number;point:Point;}
export interface PlaybackOrder {order:Order;assignments:PlaybackAssignment[];required:number;reason:string;point:Point;}
export interface PlaybackOrderState extends PlaybackOrder {completed:number;status:PlaybackStatus;}
export function createPlaybackOrders(orders:Order[],routes:Route[],unserved:Order[]):PlaybackOrder[];
export function playbackOrderStates(timeline:PlaybackOrder[],minute:number):PlaybackOrderState[];
export function truckState(status:string):{label:string;kind:string};
