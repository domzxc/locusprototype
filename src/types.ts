export type VehicleType = 'A' | 'B';
export interface Point { lng: number; lat: number; }
export interface ReceivingHours { open:number; close:number; closed:boolean; }
export interface Retailer extends Point, ReceivingHours {
  id:string; name:string; address:string; city:string; distributor:string; zone:number;
  enabled:boolean; synthetic:true; notes?:string;
}
export interface CostRates {idleDaily:number;maintenanceKm:number;tollPerTour:number;overtimeHour:number;}
export interface CostAssumptions {paidHours:number;spoilageRate:number;frozenBoxValue:number;marginPerBox:number[];A:CostRates;B:CostRates;}
export interface CostBreakdown {transport:number;idle:number;maintenance:number;tolls:number;overtime:number;spoilage:number;lostMargin:number;operating:number;economicTotal:number;}
export interface RoadLeg {km:number;minutes:number;geometry:number[][];}
export interface CrewAttendance {driversScheduled:number;driversPresent:number;helpersScheduled:number;helpersPresent:number;helpersPerTruck:number;}
export type Attendance=Record<VehicleType,CrewAttendance>;
export interface CrewAvailability {fleet:{A:number;B:number};blocked:{A:number;B:number};crewBlocked:number;driversScheduled:number;driversPresent:number;helpersScheduled:number;helpersPresent:number;assumed:boolean;}
export interface Config {
  costing:CostAssumptions; dailyOrders?:number;currentFleet?:{A:number;B:number};attendance?:Attendance;
  distributor?:string; depot?:Point; network?:Record<string,Config>;
  seed: number; orders: number; peak: number; peakOrders?:number;peakExtraMinutes?:number;speed: number; detour: number; traffic: number;
  start: number; end: number; loading: number; stopBase: number; reserve: number;
  service: number[]; loadService: number[]; A: VehicleSpec; B: VehicleSpec;
  productCbm:number[]; productKg:number[];
  receivingHours: Record<string,ReceivingHours>;
  retailers?: Retailer[];
  zones: (Point & {name: string; factor: number})[];
  ban: {enabled: boolean; start: number; end: number; type: VehicleType};
}
export interface VehicleSpec { capacity: number; weight: number; km: number; fixed: number; }
export interface Order extends Point {retailerId?:string;id:string; name:string; address?:string; zone:number; area:string; quantities:number[]; volume:number; weight:number; cold:boolean; open:number; close:number; service:number; receivingClosed?:boolean; reason?:string; parentId?:string; shipment?:'frozen'|'dry';}
export interface Stop extends Order {roadPoint?:Point&{metres:number};arrival:number; finish:number; wait:number; legKm:number; banWait:number;}
export interface Route {roadLegs?:RoadLeg[];roadProvider?:string;depot?:Point;id:string;type:VehicleType;stops:Stop[];volume:number;weight:number;km:number;banWait:number;depart:number;return:number;cost:number;}
export interface Plan {staffing:CrewAvailability;travelBasis:'road'|'approximate';costs:CostBreakdown;roadMeta?:{provider:string;validatedAt:string;maximumSnapMetres:number;method:string};routes:Route[];unserved:Order[];unassignedDeliveries:Order[];served:number;partial:number;deliveryTotal:number;deliveryAssigned:number;averageDrops:number;total:number;km:number;cost:number;util:number;onTime:number;coverage:number;fleet:{A:number;B:number};}
