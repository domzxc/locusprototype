import type { Config, CostAssumptions, CostBreakdown, Order, Route } from './src/types';
export const costDefaults:CostAssumptions;
export function normalizeCosting(value:unknown):CostAssumptions;
export function costBreakdown(routes:Route[],unassigned:Order[],config:Config,fleet:{A:number;B:number}):CostBreakdown;
