export function trafficPercent(factor){return Math.round((factor-1)*10000)/100;}
export function trafficFactor(percent){return 1+percent/100;}
export function stopTiming(route,index,config){
  const stop=route.stops[index],previous=index?route.stops[index-1].finish:route.depart;
  return {
    driving:Math.max(0,stop.arrival-stop.wait-previous-stop.banWait),
    receivingWait:stop.wait,restrictionWait:stop.banWait,
    loading:stop.quantities.reduce((s,q,p)=>s+q*config.loadService[p],0),
    unloading:stop.quantities.reduce((s,q,p)=>s+q*config.service[p],0),
    fixedHandling:config.stopBase,handling:stop.service
  };
}
