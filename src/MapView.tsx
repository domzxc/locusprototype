import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import type { Feature, FeatureCollection } from 'geojson';
import 'maplibre-gl/dist/maplibre-gl.css';
import { positionAt } from '../engine.js';
import type { Order, Point, Route } from './types';
import { COLORS } from './palette';
import {createPlaybackOrders,playbackOrderStates,ORDER_STATUS,truckState} from '../playback-status.js';
import type {PlaybackOrder,PlaybackOrderState,PlaybackStatus} from '../playback-status.js';
import MapStatusLegend from './MapStatusLegend';
import {formatPHTime} from './ph-conventions.js';

function statusIcon(status:PlaybackStatus){
  const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('Order status icons require canvas.');
  ctx.fillStyle=status==='pending'?'#fff':ORDER_STATUS[status].color;
  ctx.strokeStyle=status==='pending'?ORDER_STATUS[status].color:'#fff';ctx.lineWidth=5;
  ctx.beginPath();
  if(status==='partial'){ctx.moveTo(32,5);ctx.lineTo(59,32);ctx.lineTo(32,59);ctx.lineTo(5,32);ctx.closePath();}
  else ctx.arc(32,32,24,0,Math.PI*2);
  ctx.fill();ctx.stroke();ctx.strokeStyle='#fff';ctx.lineWidth=6;ctx.lineCap='round';
  ctx.beginPath();
  if(status==='served'){ctx.moveTo(19,32);ctx.lineTo(28,41);ctx.lineTo(45,23);}
  if(status==='unserved'){ctx.moveTo(23,23);ctx.lineTo(41,41);ctx.moveTo(41,23);ctx.lineTo(23,41);}
  if(status==='partial'){ctx.moveTo(32,19);ctx.lineTo(32,33);ctx.moveTo(32,43);ctx.lineTo(32,44);}
  if(status==='in-progress'){ctx.arc(32,32,12,-Math.PI/2,Math.PI/2);}
  ctx.stroke();return ctx.getImageData(0,0,64,64);
}
function popupContent(rows:PlaybackOrderState[]){
  const root=document.createElement('div');root.className='order-map-popup';
  const heading=document.createElement('strong');heading.textContent=rows.length>1?`${rows.length} overlapping orders`:'Order playback status';root.append(heading);
  for(const row of rows){
    const section=document.createElement('section');
    const title=document.createElement('strong');title.textContent=`${row.order.id} - ${row.order.name}`;section.append(title);
    const text=(value:string)=>{const p=document.createElement('p');p.textContent=value;section.append(p);};
    text(`${ORDER_STATUS[row.status].label}: ${row.completed}/${row.required} delivery portions finished (simulated).`);
    text(`Retailer: ${row.order.retailerId??row.order.id}. Receiving: ${row.order.receivingClosed?'Closed':`${formatPHTime(row.order.open)} to ${formatPHTime(row.order.close)} PHT`}.`);
    for(const a of row.assignments)text(`${a.vehicle} (${a.shipment}): arrival ${formatPHTime(a.arrival)}, service ${formatPHTime(a.start)}, finish ${formatPHTime(a.finish)} PHT.`);
    if(row.reason)text(`Missing: ${row.reason}`);
    root.append(section);
  }
  const note=document.createElement('p');note.textContent='Modeled playback only; no actual delivery confirmation.';root.append(note);return root;
}

export default function MapView({orders,routes,unserved,selected,minute,depot,distributor,travelBasis,showConnections}:{orders:Order[];routes:Route[];unserved:Order[];selected:string;minute:number;depot:Point;distributor:string;travelBasis:'road'|'approximate';showConnections:boolean}) {
  const container=useRef<HTMLDivElement>(null), map=useRef<maplibregl.Map|null>(null);
  const vehicleMarkers=useRef<{route:Route;marker:maplibregl.Marker}[]>([]);
  const [ready,setReady]=useState(false), [error,setError]=useState('');
  const timeline=useMemo(()=>createPlaybackOrders(orders,routes,unserved),[orders,routes,unserved]);
  const states=useMemo(()=>playbackOrderStates(timeline,showConnections?minute:-Infinity),[timeline,minute,showConnections]);
  const latest=useRef(states);latest.current=states;
  const drawn=useRef<{timeline:PlaybackOrder[];selected:string;signature:string}|null>(null);
  const popup=useRef<maplibregl.Popup|null>(null),popupIds=useRef<string[]>([]);
  useEffect(()=>{
    if(!container.current) return;
    let instance:maplibregl.Map;
    try {
      instance=new maplibregl.Map({container:container.current,center:[121.077,14.581],zoom:12.4,
        style:{version:8,sources:{osm:{type:'raster',tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256,attribution:'© OpenStreetMap contributors'}},layers:[{id:'base',type:'raster',source:'osm',paint:{'raster-saturation':-.7,'raster-opacity':.78}}]}});
      map.current=instance;
      instance.addControl(new maplibregl.NavigationControl({showCompass:false}),'top-right');
      instance.on('load',()=>setReady(true));
      instance.on('error',()=>setError('Some map resources could not load. Manifests and planning remain available.'));
    } catch {setError('Map unavailable: this browser needs WebGL. Use the vehicle manifests below.');}
    return ()=>{setReady(false);instance?.remove();map.current=null;};
  },[]);
  useEffect(()=>{
    const m=map.current;
    if(!m||!ready) return;
    const features:Feature[]=[];
    routes.forEach((r,i)=>{
      const color=COLORS[i%COLORS.length], active=!selected||r.id===selected;
      if(showConnections)features.push({type:'Feature',properties:{kind:'route',color,opacity:active?.85:.14},geometry:{type:'LineString',coordinates:r.roadLegs?r.roadLegs.flatMap(l=>l.geometry):[[depot.lng,depot.lat],...r.stops.map(s=>[s.lng,s.lat]),[depot.lng,depot.lat]]}});
    });
    const data:FeatureCollection={type:'FeatureCollection',features};
    const source=m.getSource('plan') as maplibregl.GeoJSONSource|undefined;
    if(source) source.setData(data);
    else {
      m.addSource('plan',{type:'geojson',data});
      m.addLayer({id:'routes',type:'line',source:'plan',filter:['==','kind','route'],paint:{'line-color':['get','color'],'line-width':2.5,'line-opacity':['get','opacity'],'line-dasharray':[2,1]}});
    }
    m.setPaintProperty('routes','line-dasharray',travelBasis==='road'?[1,0]:[2,1]);
  },[routes,unserved,selected,ready,depot,travelBasis,showConnections]);
  useEffect(()=>{
    const m=map.current;if(!m||!ready)return;
    const signature=states.map(s=>`${s.status}:${s.completed}`).join('|');
    if(drawn.current?.timeline===timeline&&drawn.current.selected===selected&&drawn.current.signature===signature)return;
    drawn.current={timeline,selected,signature};
    const data:FeatureCollection={type:'FeatureCollection',features:states.map(s=>({type:'Feature',properties:{orderId:s.order.id,status:s.status,rank:ORDER_STATUS[s.status].rank,opacity:!selected||s.status==='partial'||s.status==='unserved'||s.assignments.some(a=>a.vehicle===selected)?1:.35},geometry:{type:'Point',coordinates:[s.point.lng,s.point.lat]}}))};
    const source=m.getSource('order-status') as maplibregl.GeoJSONSource|undefined;
    if(source)source.setData(data);
    else{
      for(const status of Object.keys(ORDER_STATUS) as PlaybackStatus[])m.addImage(`order-${status}`,statusIcon(status),{pixelRatio:2});
      m.addSource('order-status',{type:'geojson',data});
      m.addLayer({id:'order-status-points',type:'symbol',source:'order-status',layout:{'icon-image':['concat','order-',['get','status']],'icon-size':.8,'icon-allow-overlap':true,'icon-ignore-placement':true,'symbol-sort-key':['get','rank']},paint:{'icon-opacity':['get','opacity']}});
    }
    if(popup.current){const rows=states.filter(s=>popupIds.current.includes(s.order.id));if(rows.length)popup.current.setDOMContent(popupContent(rows));else popup.current.remove();}
  },[states,timeline,selected,ready]);
  useEffect(()=>{
    const m=map.current;if(!m||!ready)return;
    const click=(event:maplibregl.MapLayerMouseEvent)=>{
      const ids=new Set((event.features??[]).map(f=>String(f.properties.orderId)));
      const rows=latest.current.filter(s=>ids.has(s.order.id)).sort((a,b)=>ORDER_STATUS[b.status].rank-ORDER_STATUS[a.status].rank);
      if(!rows.length)return;popup.current?.remove();popupIds.current=rows.map(s=>s.order.id);
      const opened=new maplibregl.Popup({maxWidth:'340px'}).setLngLat([rows[0].point.lng,rows[0].point.lat]).setDOMContent(popupContent(rows)).addTo(m);
      popup.current=opened;opened.on('close',()=>{if(popup.current===opened){popup.current=null;popupIds.current=[];}});
    };
    const enter=()=>{m.getCanvas().style.cursor='pointer';},leave=()=>{m.getCanvas().style.cursor='';};
    m.on('click','order-status-points',click);m.on('mouseenter','order-status-points',enter);m.on('mouseleave','order-status-points',leave);
    return ()=>{m.off('click','order-status-points',click);m.off('mouseenter','order-status-points',enter);m.off('mouseleave','order-status-points',leave);popup.current?.remove();};
  },[ready]);
  useEffect(()=>{
    const m=map.current;
    if(!m||!ready)return;
    const points=[...routes.flatMap(r=>r.stops),...unserved,...routes.flatMap(r=>r.roadLegs?.flatMap(l=>l.geometry.map(([lng,lat])=>({lng,lat})))??[])];
    if(!points.length){m.jumpTo({center:[depot.lng,depot.lat],zoom:12});return;}
    const bounds=new maplibregl.LngLatBounds([depot.lng,depot.lat],[depot.lng,depot.lat]);
    points.forEach(p=>bounds.extend([p.lng,p.lat]));
    m.fitBounds(bounds,{padding:45,maxZoom:13,duration:0});
  },[routes,unserved,ready,depot]);
  useEffect(()=>{
    const m=map.current;
    if(!m||!ready) return;
    const markers:maplibregl.Marker[]=[];
    const pin=document.createElement('div'); pin.className='depot-pin';pin.textContent='D';pin.title=`${distributor} distribution center`;
    markers.push(new maplibregl.Marker({element:pin}).setLngLat([depot.lng,depot.lat]).addTo(m));
    vehicleMarkers.current=[];
    routes.filter(r=>!selected||r.id===selected).forEach(r=>{
      const el=document.createElement('div');
      el.className='truck-pin';el.textContent=r.id;el.title=r.id;
      const marker=new maplibregl.Marker({element:el,anchor:'bottom',offset:[0,-12]}).setLngLat([depot.lng,depot.lat]).addTo(m);markers.push(marker);vehicleMarkers.current.push({route:r,marker});
    });
    return ()=>{markers.forEach(marker=>marker.remove());vehicleMarkers.current=[];};
  },[routes,selected,ready,depot,distributor]);
  useEffect(()=>{
    for(const {route,marker} of vehicleMarkers.current){const pos=positionAt(route,minute),state=truckState(pos.status),el=marker.getElement();marker.setLngLat([pos.lng,pos.lat]);el.title=`${route.id}: ${pos.status} (simulated)`;if(el.dataset.motion!==state.kind||el.dataset.label!==state.label){el.dataset.motion=state.kind;el.dataset.label=state.label;el.replaceChildren(document.createTextNode(route.id));const label=document.createElement('small');label.textContent=state.label;el.append(label);}}
  },[minute,routes,selected,ready]);
  return <><MapStatusLegend states={states} enabled={showConnections}/><div className="map-wrap"><div ref={container} className="map" aria-label={`${distributor} delivery routes map`}/><div className="map-label"><span className="live-dot"/>{distributor.toUpperCase()} DISTRIBUTION CENTER</div><div className="map-note">{travelBasis==='road'?<>Road geometry: <a href="https://project-osrm.org/" target="_blank" rel="noreferrer">OSRM</a> / <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> - driving profile</>:showConnections?'Approximate connections - not road routing':'Loading roads or awaiting retry - no straight-line playback'}</div>{error&&<div className="map-error" role="status">{error}</div>}</div></>;
}
