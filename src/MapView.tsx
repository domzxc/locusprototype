import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import type { Feature, FeatureCollection } from 'geojson';
import 'maplibre-gl/dist/maplibre-gl.css';
import { positionAt } from '../engine.js';
import type { Order, Point, Route } from './types';
import { COLORS } from './palette';

export default function MapView({routes,unserved,selected,minute,depot,distributor,travelBasis,showConnections}:{routes:Route[];unserved:Order[];selected:string;minute:number;depot:Point;distributor:string;travelBasis:'road'|'approximate';showConnections:boolean}) {
  const container=useRef<HTMLDivElement>(null), map=useRef<maplibregl.Map|null>(null);
  const vehicleMarkers=useRef<{route:Route;marker:maplibregl.Marker}[]>([]);
  const [ready,setReady]=useState(false), [error,setError]=useState('');
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
      r.stops.forEach(s=>features.push({type:'Feature',properties:{kind:'stop',color,opacity:active?1:.3},geometry:{type:'Point',coordinates:[(s.roadPoint??s).lng,(s.roadPoint??s).lat]}}));
    });
    unserved.forEach(s=>features.push({type:'Feature',properties:{kind:'stop',color:'#d03434',opacity:1},geometry:{type:'Point',coordinates:[s.lng,s.lat]}}));
    const data:FeatureCollection={type:'FeatureCollection',features};
    const source=m.getSource('plan') as maplibregl.GeoJSONSource|undefined;
    if(source) source.setData(data);
    else {
      m.addSource('plan',{type:'geojson',data});
      m.addLayer({id:'routes',type:'line',source:'plan',filter:['==','kind','route'],paint:{'line-color':['get','color'],'line-width':2.5,'line-opacity':['get','opacity'],'line-dasharray':[2,1]}});
      m.addLayer({id:'stops',type:'circle',source:'plan',filter:['==','kind','stop'],paint:{'circle-radius':5,'circle-color':['get','color'],'circle-opacity':['get','opacity'],'circle-stroke-color':'#fff','circle-stroke-width':1.5}});
    }
    m.setPaintProperty('routes','line-dasharray',travelBasis==='road'?[1,0]:[2,1]);
  },[routes,unserved,selected,ready,depot,travelBasis,showConnections]);
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
      const marker=new maplibregl.Marker({element:el}).setLngLat([depot.lng,depot.lat]).addTo(m);markers.push(marker);vehicleMarkers.current.push({route:r,marker});
    });
    return ()=>{markers.forEach(marker=>marker.remove());vehicleMarkers.current=[];};
  },[routes,selected,ready,depot,distributor]);
  useEffect(()=>{
    for(const {route,marker} of vehicleMarkers.current){const pos=positionAt(route,minute);marker.setLngLat([pos.lng,pos.lat]);marker.getElement().title=`${route.id}: ${pos.status}`;}
  },[minute,routes,selected,ready]);
  return <div className="map-wrap"><div ref={container} className="map" aria-label={`${distributor} delivery routes map`}/><div className="map-label"><span className="live-dot"/>{distributor.toUpperCase()} DISTRIBUTION CENTER</div><div className="map-note">{travelBasis==='road'?<>Road geometry: <a href="https://project-osrm.org/" target="_blank" rel="noreferrer">OSRM</a> / <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> - driving profile</>:showConnections?'Approximate connections - not road routing':'Loading roads or awaiting retry - no straight-line playback'}</div>{error&&<div className="map-error" role="status">{error}</div>}</div>;
}
