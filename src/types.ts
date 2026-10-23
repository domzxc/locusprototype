export type VehicleType = 'A' | 'B';
export interface Point { lng: number; lat: number; }
export interface ReceivingHours { open:number; close:number; closed:boolean; }
export interface Retailer extends Point, ReceivingHours {
  id:string; name:string; address:string; city:string; distributor:string; zone:number;
  enabled:boolean; synthetic:true; notes?:string;
}
export interface Config {
  distributor?:string; depot?:Point; network?:Record<string,Config>;
  seed: number; orders: number; peak: number; speed: number; detour: number; traffic: number;
  start: number; end: number; loading: number; stopBase: number; reserve: number;
  service: number[]; loadService: number[]; A: VehicleSpec; B: VehicleSpec;
  productCbm:number[]; productKg:number[];
  receivingHours: Record<string,ReceivingHours>;
  retailers?: Retailer[];
  zones: (Point & {name: string; factor: number})[];
  ban: {enabled: boolean; start: number; end: number; type: VehicleType};
}
export interface VehicleSpec { capacity: number; weight: number; km: number; fixed: number; }
export interface Order extends Point {id:string; name:string; address?:string; zone:number; area:string; quantities:number[]; volume:number; weight:number; cold:boolean; open:number; close:number; service:number; receivingClosed?:boolean; reason?:string; parentId?:string; shipment?:'frozen'|'dry';}
export interface Stop extends Order {arrival:number; finish:number; wait:number; legKm:number; banWait:number;}
export interface Route {depot?:Point;id:string;type:VehicleType;stops:Stop[];volume:number;weight:number;km:number;banWait:number;depart:number;return:number;cost:number;}
export interface Plan {routes:Route[];unserved:Order[];unassignedDeliveries:Order[];served:number;partial:number;deliveryTotal:number;deliveryAssigned:number;averageDrops:number;total:number;km:number;cost:number;util:number;onTime:number;coverage:number;fleet:{A:number;B:number};}
