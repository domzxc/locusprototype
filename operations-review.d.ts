import type {Config,Order,Plan,VehicleType} from './src/types';
export type ReviewStatus='on-time'|'outside-window'|'partial'|'unserved';
export type ReviewFilter='all'|'served'|'outside-window'|'partial'|'unserved';
export interface ReviewAssignment {jobId:string;vehicle:string;type:VehicleType;sequence:number;shipment:string;roadArrival:number;serviceStart:number;finish:number;storeWait:number;onTime:boolean;}
export interface ReviewRow {priority:number;order:Order;retailerType:string;cases:number;unloading:number;assignments:ReviewAssignment[];fullyAssigned:boolean;hasWindowIssue:boolean;status:ReviewStatus;reason:string;}
export function buildReviewRows(orders:Order[],plan:Plan,config:Config):ReviewRow[];
export function filterReviewRows(rows:ReviewRow[],filter?:ReviewFilter,search?:string):ReviewRow[];
