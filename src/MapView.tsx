import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import type { Feature, FeatureCollection } from 'geojson';
import 'maplibre-gl/dist/maplibre-gl.css';
import { DEPOT, positionAt } from '../engine.js';
import type { Order, Route } from './types';
import { COLORS } from './palette';

export default function MapView({routes,unserved,selected,minute}:{routes:Route[];unserved:Order[];selected:string;minute:number}) {
  const container=useRef<HTMLDivElement>(null), map=useRef<maplibregl.Map|null>(null);
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
      features.push({type:'Feature',properties:{kind:'route',color,opacity:active?.85:.14},geometry:{type:'LineString',coordinates:[[DEPOT.lng,DEPOT.lat],...r.stops.map(s=>[s.lng,s.lat]),[DEPOT.lng,DEPOT.lat]]}});
      r.stops.forEach(s=>features.push({type:'Feature',properties:{kind:'stop',color,opacity:active?1:.3},geometry:{type:'Point',coordinates:[s.lng,s.lat]}}));
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
  },[routes,unserved,selected,ready]);
  useEffect(()=>{
    const m=map.current;
    if(!m||!ready)return;
    const points=[...routes.flatMap(r=>r.stops),...unserved];
    if(!points.length)return;
    const bounds=new maplibregl.LngLatBounds([DEPOT.lng,DEPOT.lat],[DEPOT.lng,DEPOT.lat]);
    points.forEach(p=>bounds.extend([p.lng,p.lat]));
    m.fitBounds(bounds,{padding:45,maxZoom:13,duration:0});
  },[routes,unserved,ready]);
  useEffect(()=>{
    const m=map.current;
    if(!m||!ready) return;
    const markers:maplibregl.Marker[]=[];
    const depot=document.createElement('div'); depot.className='depot-pin';depot.textContent='D';depot.title='Pasig distribution center';
    markers.push(new maplibregl.Marker({element:depot}).setLngLat([DEPOT.lng,DEPOT.lat]).addTo(m));
    routes.filter(r=>!selected||r.id===selected).forEach(r=>{
      const pos=positionAt(r,minute), el=document.createElement('div');
      el.className='truck-pin';el.textContent=r.id;el.title=`${r.id}: ${pos.status}`;
      markers.push(new maplibregl.Marker({element:el}).setLngLat([pos.lng,pos.lat]).addTo(m));
    });
    return ()=>markers.forEach(marker=>marker.remove());
  },[routes,minute,selected,ready]);
  return <div className="map-wrap"><div ref={container} className="map" aria-label="Pasig delivery routes map"/><div className="map-label"><span className="live-dot"/>PASIG DISTRIBUTION CENTER</div><div className="map-note">Estimated connections · not road routing</div>{error&&<div className="map-error" role="status">{error}</div>}</div>;
}
