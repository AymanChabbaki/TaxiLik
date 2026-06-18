import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { Radius, Spacing, Type } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';
import type { LiveMapProps } from './LiveMap.types';

// Native real map: render Leaflet inside a WebView. react-native-webview ships in
// Expo Go, so this works on a phone WITHOUT a dev build — same interactive map the
// web build gets. Markers: driver = car, passenger/client = person.
const HTML = `<!doctype html>
<html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#map{height:100%;margin:0;padding:0;background:transparent}
@keyframes p{0%{transform:scale(.6);opacity:.7}100%{transform:scale(2.2);opacity:0}}</style>
</head><body><div id="map"></div>
<script>
var BRAND='#E8412A';
var map=L.map('map',{zoomControl:false,attributionControl:false}).setView([33.5731,-7.6038],14);
var tile=null;
function setTiles(dark){ if(tile)map.removeLayer(tile);
  var u=dark?'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png':'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
  tile=L.tileLayer(u,{maxZoom:20,subdomains:'abcd'}).addTo(map); }
setTiles(false);
function icon(html,size){return L.divIcon({html:html,className:'',iconSize:[size,size],iconAnchor:[size/2,size/2]});}
function car(c,s){return '<div style="filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))"><svg width="'+s+'" height="'+s+'" viewBox="0 0 24 24" fill="none"><path d="M5 11l1.5-4.5A2 2 0 018.4 5h7.2a2 2 0 011.9 1.5L19 11m-14 0h14m-14 0a2 2 0 00-2 2v3h2m14-5a2 2 0 012 2v3h-2m-12 0h10" stroke="'+c+'" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="'+c+'22"/><circle cx="7.5" cy="16" r="1.4" fill="'+c+'"/><circle cx="16.5" cy="16" r="1.4" fill="'+c+'"/></svg></div>';}
function person(c,s){return '<div style="width:'+s+'px;height:'+s+'px;border-radius:50%;background:#fff;border:2px solid '+c+';box-shadow:0 2px 4px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center"><svg width="'+(s*0.6)+'" height="'+(s*0.6)+'" viewBox="0 0 24 24" fill="'+c+'"><path d="M12 12a5 5 0 100-10 5 5 0 000 10zm0 2c-5 0-9 2.5-9 6v2h18v-2c0-3.5-4-6-9-6z"/></svg></div>';}
function dot(c){return '<div style="position:relative;width:22px;height:22px"><div style="position:absolute;inset:0;border-radius:50%;background:'+c+'33;animation:p 1.8s ease-out infinite"></div><div style="position:absolute;top:5px;left:5px;width:12px;height:12px;border-radius:50%;background:'+c+';border:2px solid #fff"></div></div>';}
function pin(c){return '<div style="transform:translateY(-6px)"><svg width="26" height="26" viewBox="0 0 24 24" fill="'+c+'"><path d="M12 2C7.6 2 4 5.6 4 10c0 5.4 7 11.6 7.3 11.8a1 1 0 001.4 0C13 21.6 20 15.4 20 10c0-4.4-3.6-8-8-8zm0 11a3 3 0 110-6 3 3 0 010 6z"/></svg></div>';}
var M={user:null,pickup:null,dest:null,assigned:null,drivers:{}};
function place(key,pos,html,size){ if(!pos){ if(M[key]){map.removeLayer(M[key]);M[key]=null;} return;} if(M[key])M[key].setLatLng([pos.lat,pos.lng]); else M[key]=L.marker([pos.lat,pos.lng],{icon:icon(html,size)}).addTo(map);}
var routePoly=null,driverPoly=null,lastRouteLen=-1;
var first=true;
window.TLK={update:function(s){
  setTilesIf(s.dark);
  var uHtml=s.viewerRole==='driver'?car(BRAND,40):person(BRAND,30);
  place('user',s.user,uHtml,s.viewerRole==='driver'?40:30);
  var pHtml=s.viewerRole==='driver'?person(BRAND,30):dot(BRAND);
  place('pickup',s.pickup,pHtml,s.viewerRole==='driver'?30:22);
  place('dest',s.destination,pin(s.dark?'#fff':'#1F2430'),26);
  place('assigned',s.assignedDriver,car(BRAND,40),40);
  var seen={};(s.drivers||[]).forEach(function(d){seen[d.id]=1; if(M.drivers[d.id])M.drivers[d.id].setLatLng([d.lat,d.lng]); else M.drivers[d.id]=L.marker([d.lat,d.lng],{icon:icon(car(s.dark?'#fff':'#1F2430',30),30)}).addTo(map);});
  Object.keys(M.drivers).forEach(function(id){if(!seen[id]){map.removeLayer(M.drivers[id]);delete M.drivers[id];}});
  var r=s.route||[];
  if(r.length>1){var rl=r.map(function(p){return[p.lat,p.lng]});if(routePoly)routePoly.setLatLngs(rl);else{routePoly=L.polyline(rl,{color:BRAND,weight:4,opacity:.85,lineCap:'round',lineJoin:'round'}).addTo(map);}if(r.length!==lastRouteLen&&!s.assignedDriver){try{map.fitBounds(routePoly.getBounds(),{padding:[50,50]});}catch(e){}}}else if(routePoly){map.removeLayer(routePoly);routePoly=null;}
  lastRouteLen=r.length;
  var dr=s.driverRoute||[];
  if(dr.length>1){var dl=dr.map(function(p){return[p.lat,p.lng]});if(driverPoly)driverPoly.setLatLngs(dl);else{driverPoly=L.polyline(dl,{color:BRAND,weight:2.5,opacity:.6,dashArray:'8 6'}).addTo(map);}}else if(driverPoly){map.removeLayer(driverPoly);driverPoly=null;}
  var c=s.followAssigned&&s.assignedDriver?s.assignedDriver:(first?s.center:null);
  if(c){map.panTo([c.lat,c.lng],{animate:!first});}
  first=false;
}};
var curDark=false; function setTilesIf(d){if(d!==curDark){curDark=d;setTiles(d);}}
function rdy(){ if(window.ReactNativeWebView) window.ReactNativeWebView.postMessage('ready'); }
if(document.readyState==='complete')rdy(); else window.addEventListener('load',rdy);
</script></body></html>`;

export function LiveMap(props: LiveMapProps) {
  const { colors } = useTheme();
  const ref = useRef<WebView>(null);
  const [ready, setReady] = useState(false);

  const state = useMemo(
    () => ({
      user: props.user ?? null,
      pickup: props.pickup ?? null,
      destination: props.destination ?? null,
      assignedDriver: props.assignedDriver ?? null,
      drivers: props.drivers ?? [],
      viewerRole: props.viewerRole ?? 'passenger',
      dark: !!props.dark,
      followAssigned: !!props.followAssigned,
      center: props.center ?? props.user ?? props.pickup ?? null,
      route: props.route ?? null,
      driverRoute: props.driverRoute ?? null,
    }),
    [props.user, props.pickup, props.destination, props.assignedDriver, props.drivers, props.viewerRole, props.dark, props.followAssigned, props.center, props.route, props.driverRoute]
  );

  useEffect(() => {
    if (ready && ref.current) {
      ref.current.injectJavaScript(`window.TLK&&window.TLK.update(${JSON.stringify(state)});true;`);
    }
  }, [ready, state]);

  return (
    <View style={[{ flex: 1, backgroundColor: colors.mapBottom }, props.style]}>
      <WebView
        ref={ref}
        originWhitelist={['*']}
        source={{ html: HTML }}
        style={styles.web}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        onMessage={(e) => {
          if (e.nativeEvent.data === 'ready') setReady(true);
        }}
      />
      {props.label ? (
        <View style={[styles.chip, { backgroundColor: colors.surface }]}>
          <View style={[styles.chipDot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.chipText, { color: colors.text }]}>{props.label}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  web: { flex: 1, backgroundColor: 'transparent' },
  chip: {
    position: 'absolute',
    top: Spacing.md,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
  },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  chipText: { ...Type.labelMd },
});
