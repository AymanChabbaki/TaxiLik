import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import { View } from 'react-native';

import type { LatLng, LiveMapProps } from './LiveMap.types';

// Type-only import (erased at build time) so Leaflet's window access never runs
// during the server-side render. The real module is imported lazily below.
import type * as Leaflet from 'leaflet';

let L: typeof Leaflet | null = null;

const BRAND = '#E8412A';
const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';

function ensureLeafletCss() {
  if (typeof document === 'undefined') return;
  if (document.querySelector(`link[href="${LEAFLET_CSS}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = LEAFLET_CSS;
  document.head.appendChild(link);
}

const carSvg = (color: string, size: number) =>
  `<div style="filter:drop-shadow(0 2px 3px rgba(0,0,0,.35));transition:transform .6s linear">
    <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 11l1.5-4.5A2 2 0 018.4 5h7.2a2 2 0 011.9 1.5L19 11m-14 0h14m-14 0a2 2 0 00-2 2v3h2m14-5a2 2 0 012 2v3h-2m-12 0h10m-10 0v1a1.5 1.5 0 01-3 0v-1m13 0v1a1.5 1.5 0 003 0v-1"
        stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="${color}22"/>
      <circle cx="7.5" cy="16" r="1.4" fill="${color}"/><circle cx="16.5" cy="16" r="1.4" fill="${color}"/>
    </svg>
  </div>`;

const dotHtml = (color: string) =>
  `<div style="position:relative;width:22px;height:22px">
    <div style="position:absolute;inset:0;border-radius:50%;background:${color}33;animation:tlk-pulse 1.8s ease-out infinite"></div>
    <div style="position:absolute;top:5px;left:5px;width:12px;height:12px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.4)"></div>
  </div>`;

const pinHtml = (color: string) =>
  `<div style="transform:translateY(-6px)"><svg width="26" height="26" viewBox="0 0 24 24" fill="${color}" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C7.6 2 4 5.6 4 10c0 5.4 7 11.6 7.3 11.8a1 1 0 001.4 0C13 21.6 20 15.4 20 10c0-4.4-3.6-8-8-8zm0 11a3 3 0 110-6 3 3 0 010 6z"/></svg></div>`;

// Person marker (the passenger/client).
const personHtml = (color: string, size: number) =>
  `<div style="width:${size}px;height:${size}px;border-radius:50%;background:#fff;border:2px solid ${color};box-shadow:0 2px 4px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center">
    <svg width="${size * 0.6}" height="${size * 0.6}" viewBox="0 0 24 24" fill="${color}" xmlns="http://www.w3.org/2000/svg"><path d="M12 12a5 5 0 100-10 5 5 0 000 10zm0 2c-5 0-9 2.5-9 6v2h18v-2c0-3.5-4-6-9-6z"/></svg>
  </div>`;

function makeIcon(html: string, size: number) {
  return L!.divIcon({ html, className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
}

export function LiveMap(props: LiveMapProps) {
  const { drivers = [], assignedDriver, user, pickup, destination, center, followAssigned, dark, viewerRole = 'passenger' } = props;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const tileRef = useRef<Leaflet.TileLayer | null>(null);
  const userMarker = useRef<Leaflet.Marker | null>(null);
  const assignedMarker = useRef<Leaflet.Marker | null>(null);
  const pickupMarker = useRef<Leaflet.Marker | null>(null);
  const destMarker = useRef<Leaflet.Marker | null>(null);
  const driverMarkers = useRef<Map<string, Leaflet.Marker>>(new Map());
  const [ready, setReady] = useState(false);

  // Lazy-load Leaflet (browser only) and init the map once.
  useEffect(() => {
    let mounted = true;
    (async () => {
      ensureLeafletCss();
      if (!L) {
        const mod = await import('leaflet');
        L = (mod as any).default ?? mod;
      }
      if (typeof document !== 'undefined' && !document.getElementById('tlk-pulse-style')) {
        const st = document.createElement('style');
        st.id = 'tlk-pulse-style';
        st.textContent = '@keyframes tlk-pulse{0%{transform:scale(.6);opacity:.7}100%{transform:scale(2.2);opacity:0}}';
        document.head.appendChild(st);
      }
      if (!mounted || !containerRef.current || mapRef.current) return;
      const start = center || user || pickup || { lat: 33.5731, lng: -7.6038 };
      const map = L!.map(containerRef.current, { zoomControl: false, attributionControl: false }).setView(
        [start.lat, start.lng],
        14
      );
      mapRef.current = map;
      setTimeout(() => map.invalidateSize(), 100);
      setReady(true);
    })();
    return () => {
      mounted = false;
      mapRef.current?.remove();
      mapRef.current = null;
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tile layer reacts to theme.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !L) return;
    if (tileRef.current) map.removeLayer(tileRef.current);
    const url = dark
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
    tileRef.current = L.tileLayer(url, { maxZoom: 20, subdomains: 'abcd' }).addTo(map);
  }, [ready, dark]);

  const setMarker = (
    ref: MutableRefObject<Leaflet.Marker | null>,
    pos: LatLng | null | undefined,
    iconHtml: string,
    size: number
  ) => {
    const map = mapRef.current;
    if (!map || !L) return;
    if (!pos) {
      if (ref.current) {
        map.removeLayer(ref.current);
        ref.current = null;
      }
      return;
    }
    if (ref.current) ref.current.setLatLng([pos.lat, pos.lng]);
    else ref.current = L.marker([pos.lat, pos.lng], { icon: makeIcon(iconHtml, size) }).addTo(map);
  };

  // User / pickup / destination / assigned driver markers.
  useEffect(() => {
    if (!ready) return;
    // The viewer's own dot: a driver is a car, a passenger is a person.
    const userIcon = viewerRole === 'driver' ? carSvg(BRAND, 40) : personHtml(BRAND, 30);
    setMarker(userMarker, user, userIcon, viewerRole === 'driver' ? 40 : 30);
    // Pickup: for a driver it's the client (person); for a passenger it's their own dot.
    const pickupIcon = viewerRole === 'driver' ? personHtml(BRAND, 30) : dotHtml(BRAND);
    setMarker(pickupMarker, pickup, pickupIcon, viewerRole === 'driver' ? 30 : 22);
    setMarker(destMarker, destination, pinHtml(dark ? '#FFFFFF' : '#1F2430'), 26);
    // Assigned driver (shown to the passenger) is always a car.
    setMarker(assignedMarker, assignedDriver, carSvg(BRAND, 40), 40);
    if (followAssigned && assignedDriver && mapRef.current) {
      mapRef.current.panTo([assignedDriver.lat, assignedDriver.lng], { animate: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, user, pickup, destination, assignedDriver, followAssigned, dark, viewerRole]);

  // Nearby drivers (reconcile by id).
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !L) return;
    const seen = new Set<string>();
    for (const d of drivers) {
      seen.add(d.id);
      const existing = driverMarkers.current.get(d.id);
      if (existing) existing.setLatLng([d.lat, d.lng]);
      else {
        const m = L.marker([d.lat, d.lng], { icon: makeIcon(carSvg(dark ? '#FFFFFF' : '#1F2430', 30), 30) }).addTo(map);
        driverMarkers.current.set(d.id, m);
      }
    }
    for (const [id, m] of driverMarkers.current) {
      if (!seen.has(id)) {
        map.removeLayer(m);
        driverMarkers.current.delete(id);
      }
    }
  }, [ready, drivers, dark]);

  // Recenter when an explicit center is provided.
  useEffect(() => {
    if (ready && center && mapRef.current && !followAssigned) {
      mapRef.current.panTo([center.lat, center.lng], { animate: true });
    }
  }, [ready, center, followAssigned]);

  return (
    <View style={[{ flex: 1, overflow: 'hidden' }, props.style]}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </View>
  );
}
