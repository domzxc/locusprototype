import { defaults, copy, DISTRIBUTORS, getRetailers, validateConfig, generateOrders, allocate, plan } from './engine.js';

// Illustrative depot/zone locations only: not surveyed warehouses or delivery addresses.
const locations = {
  'Quezon City': {depot:{lng:121.045,lat:14.65},seed:104,speed:20,traffic:1.5,zones:[['Cubao',121.053,14.62,1.7],['Diliman',121.063,14.655,1.4],['Novaliches',121.035,14.721,1.45],['Fairview',121.071,14.701,1.35],['Batasan',121.095,14.683,1.3]]},
  'Manila City': {depot:{lng:120.982,lat:14.612},seed:205,speed:18,traffic:1.6,zones:[['Tondo',120.969,14.624,1.6],['Binondo',120.975,14.601,1.75],['Sampaloc',120.998,14.612,1.5],['Ermita',120.983,14.582,1.45],['Paco',120.997,14.581,1.4]]},
  'Makati': {depot:{lng:121.021,lat:14.559},seed:306,speed:19,traffic:1.55,zones:[['Poblacion',121.03,14.565,1.6],['Bel-Air',121.026,14.562,1.55],['San Lorenzo',121.017,14.55,1.7],['Bangkal',121.009,14.539,1.35],['Guadalupe',121.044,14.565,1.5]]},
  'Bulacan': {depot:{lng:120.96,lat:14.82},seed:507,speed:28,traffic:1.2,zones:[['Meycauayan',120.96,14.736,1.4],['Marilao',120.957,14.759,1.3],['Bocaue',120.943,14.799,1.25],['Balagtas',120.908,14.819,1.2],['Malolos',120.811,14.843,1.25]]},
  'Cavite': {depot:{lng:120.945,lat:14.405},seed:608,speed:26,traffic:1.25,zones:[['Bacoor',120.952,14.458,1.5],['Imus',120.936,14.429,1.35],['Dasmarinas',120.938,14.329,1.3],['General Trias',120.881,14.386,1.25],['Kawit',120.903,14.444,1.3]]}
};

export function initializeNetwork(value) {
  const c=validateConfig(value);
  if(c.network)return copy(c);
  const profiles=c.retailers?getRetailers(c):undefined;
  const network={}, used=new Set((c.retailers??[]).map(r=>r.id));
  for(const [index,d] of DISTRIBUTORS.entries()) {
    let local;
    if(d.name==='Pasig') {
      local={...copy(c),distributor:d.name,depot:copy(c.depot??{lng:121.0705,lat:14.5764})};
      if(profiles)local.retailers=profiles.filter(r=>r.distributor===d.name);
      local.retailers=getRetailers(local);
    } else {
      const l=locations[d.name];
      local={...copy(defaults),distributor:d.name,depot:copy(l.depot),seed:l.seed,speed:l.speed,traffic:l.traffic,zones:l.zones.map(([name,lng,lat,factor])=>({name,lng,lat,factor}))};
      const existing=profiles?.filter(r=>r.distributor===d.name);
      local.retailers=existing?.length?copy(existing):getRetailers(local).map((r,i)=>{
        let number=(index+1)*10000+i+1;
        while(used.has(`RET-${number}`))number++;
        const id=`RET-${number}`;used.add(id);return {...r,id};
      });
    }
    network[d.name]=local;
  }
  return validateConfig({...network.Pasig,network});
}

export function distributorConfig(root,name) {
  const c=root.network?.[name];
  if(!c)throw Error(`Unknown distributor: ${name}`);
  return c;
}

export function importNetworkSettings(value) {
  if(!value||![1,2].includes(value.version)||(value.version===2&&value.kind!=='domtransport-settings'))throw Error('Use a DomTransport settings export, not a dispatch or allocation plan.');
  return initializeNetwork(validateConfig(value.config));
}

export function nextRetailerId(ids) {
  const next=Math.max(0,...ids.map(id=>Number(id.slice(4))))+1;
  if(next>999999)throw Error('No retailer IDs remain in the supported range.');
  return `RET-${String(next).padStart(3,'0')}`;
}

export function updateDistributor(root,name,value) {
  distributorConfig(root,name);
  const {network:ignored,...local}=value;
  const next=validateConfig({...local,distributor:name});
  const network={...root.network,[name]:next};
  return validateConfig({...network.Pasig,network});
}

export function networkPlans(root,scenario='normal') {
  return DISTRIBUTORS.map(d=>{
    const config=distributorConfig(root,d.name), orders=generateOrders(config,scenario), fleet=allocate(orders,config);
    return {...d,config,orders,fleet,result:plan(orders,config,fleet)};
  });
}

export function summarizeNetwork(runs) {
  const sum=f=>runs.reduce((s,r)=>s+f(r),0);
  const total=sum(r=>r.result.total),served=sum(r=>r.result.served),vehicles=sum(r=>r.result.routes.length),assigned=sum(r=>r.result.deliveryAssigned);
  return {operatingCost:sum(r=>r.result.costs.operating),riskExposure:sum(r=>r.result.costs.spoilage+r.result.costs.lostMargin),economicTotal:sum(r=>r.result.costs.economicTotal),total,served,vehicles,assigned,allocated:sum(r=>r.fleet.A+r.fleet.B),km:sum(r=>r.result.km),cost:sum(r=>r.result.cost),coverage:total?served/total:0,averageDrops:vehicles?assigned/vehicles:0,util:vehicles?sum(r=>r.result.util*r.result.routes.length)/vehicles:0};
}
