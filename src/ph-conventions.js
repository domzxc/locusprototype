export const PH_UNITS=Object.freeze({volume:'CBM',weight:'KG',distance:'KM',currency:'PHP',timeZone:'Asia/Manila',timeBasis:'minutes after midnight in Philippine time (PHT, UTC+8)'});

export function toTimeInput(value) {
  if(!Number.isFinite(value)||value<0||value>1440)return '';
  const minute=Math.floor(value)%1440;
  return `${String(Math.floor(minute/60)).padStart(2,'0')}:${String(minute%60).padStart(2,'0')}`;
}
export function parseTimeInput(value,endOfDay=false) {
  const match=/^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if(!match)return NaN;
  const minute=Number(match[1])*60+Number(match[2]);
  return endOfDay&&minute===0?1440:minute;
}
export function formatPHTime(value) {
  if(!Number.isFinite(value)||value<0)return '—';
  const minute=Math.floor(value)%1440,hour=Math.floor(minute/60);
  return `${hour%12||12}:${String(minute%60).padStart(2,'0')} ${hour<12?'AM':'PM'}${value>=1440?' (next day)':''}`;
}
