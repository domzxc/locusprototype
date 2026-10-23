export const PH_UNITS: Readonly<{volume:'CBM';weight:'KG';distance:'KM';currency:'PHP';timeZone:'Asia/Manila';timeBasis:string}>;
export function toTimeInput(value:number):string;
export function parseTimeInput(value:string,endOfDay?:boolean):number;
export function formatPHTime(value:number):string;
