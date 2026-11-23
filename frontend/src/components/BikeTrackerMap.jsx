/**
 * BikeTrackerMap.jsx
 *
 * Owner-facing live location tracker for a rented-out bike.
 *
 * Features:
 *  - Real-time GPS dot updated every ~5 s via Supabase Realtime broadcast
 *  - Green circle showing the allowed radius around the bike's home location
 *  - Red alarm banner + looping alarm sound when bike exits the radius
 *  - Demo / offline fallback: simulates movement when real GPS isn't available
 *  - Leaflet map (OpenStreetMap tiles, no API key required)
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, AlertTriangle, CheckCircle2, Wifi, WifiOff, Volume2, VolumeX } from 'lucide-react';
import { subscribeToLocation, haversineKm } from '../lib/locationBroadcast';

// ── Alarm audio (Web Audio API, no asset file required) ──────────────────────
function createAlarmNode(audioCtx) {
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  oscillator.type = 'square';
  oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
  oscillator.frequency.setValueAtTime(660, audioCtx.currentTime + 0.25);
  oscillator.frequency.setValueAtTime(880, audioCtx.currentTime + 0.5);

  gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  return { oscillator, gainNode };
}

// ── Leaflet lazy loader ───────────────────────────────────────────────────────
let leafletPromise = null;
function loadLeaflet() {
  if (leafletPromise) return leafletPromise;
  leafletPromise = import('leaflet').then((L) => {
    // Fix default icon paths broken by bundlers
    delete L.default.Icon.Default.prototype._getIconUrl;
    L.default.Icon.Default.mergeOptions({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });
    return L.default;
  });
  return leafletPromise;
}

// ── Demo simulation helpers ───────────────────────────────────────────────────
function simulateMovement(homeLat, homeLng, radiusKm, t) {
  // Slowly wander in a figure-8 pattern, occasionally crossing the boundary
  const r = radiusKm * 0.0009 * (1 + 0.6 * Math.sin(t / 18)); // degrees ≈ km * 0.009
  const angle = t * 0.4;
  return {
    lat: homeLat + r * Math.sin(angle),
    lng: homeLng + r * Math.cos(angle) * 1.4,
    ts: Date.now(),
    simulated: true,
  };
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function BikeTrackerMap({ vehicleId, homeLat, homeLng, radiusKm = 10, bikeName = 'Bike' }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);
  const homeMarkerRef = useRef(null);
  const audioCtxRef = useRef(null);
  const alarmIntervalRef = useRef(null);
  const simTickRef = useRef(0);

  const [livePos, setLivePos] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isOutsideRadius, setIsOutsideRadius] = useState(false);
  const [alarmMuted, setAlarmMuted] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const homeLatFinal = homeLat ?? 23.8750;
  const homeLngFinal = homeLng ?? 90.3833;

  // ── Alarm control ────────────────────────────────────────────────────────
  const startAlarm = useCallback(() => {
    if (alarmMuted || alarmIntervalRef.current) return;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    audioCtxRef.current = ctx;

    const beep = () => {
      if (!audioCtxRef.current || alarmMuted) return;
      const { oscillator } = createAlarmNode(audioCtxRef.current);
      oscillator.start();
      oscillator.stop(audioCtxRef.current.currentTime + 0.6);
    };

    beep();
    alarmIntervalRef.current = setInterval(beep, 1200);
  }, [alarmMuted]);

  const stopAlarm = useCallback(() => {
    if (alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  }, []);

  // ── Position handler ──────────────────────────────────────────────────────
  const handlePosition = useCallback((pos) => {
    const dist = haversineKm(homeLatFinal, homeLngFinal, pos.lat, pos.lng);
    const outside = dist > radiusKm;

    setLivePos(pos);
    setIsOutsideRadius(outside);
    setLastUpdate(new Date());

    if (outside && !alarmMuted) {
      startAlarm();
    } else {
      stopAlarm();
    }

    // Update map
    if (mapRef.current && markerRef.current) {
      markerRef.current.setLatLng([pos.lat, pos.lng]);
      markerRef.current
        .getPopup()
        ?.setContent(
          `<b>${bikeName}</b><br>` +
          `${dist.toFixed(2)} km from home${outside ? ' ⚠️ OUT OF ZONE' : ' ✅'}`
        );
    }
  }, [homeLatFinal, homeLngFinal, radiusKm, alarmMuted, startAlarm, stopAlarm, bikeName]);

  // ── Mount Leaflet map ────────────────────────────────────────────────────
  useEffect(() => {
    let destroyed = false;

    loadLeaflet().then((L) => {
      if (destroyed || !mapContainerRef.current || mapRef.current) return;

      const map = L.map(mapContainerRef.current, { zoomControl: true, attributionControl: false }).setView(
        [homeLatFinal, homeLngFinal], 14
      );

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      // Home pin (grey)
      const homeIcon = L.divIcon({
        className: '',
        html: `<div style="width:16px;height:16px;border-radius:50%;background:#6B7280;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
        iconAnchor: [8, 8],
      });
      homeMarkerRef.current = L.marker([homeLatFinal, homeLngFinal], { icon: homeIcon })
        .addTo(map)
        .bindPopup('Home / Garage');

      // Radius circle (green)
      circleRef.current = L.circle([homeLatFinal, homeLngFinal], {
        radius: radiusKm * 1000,
        color: '#00B14F',
        fillColor: '#00B14F',
        fillOpacity: 0.08,
        weight: 2,
        dashArray: '6 4',
      }).addTo(map);

      // Bike marker (green dot)
      const bikeIcon = L.divIcon({
        className: '',
        html: `<div style="width:20px;height:20px;border-radius:50%;background:#00B14F;border:3px solid white;box-shadow:0 2px 8px rgba(0,177,79,0.6)"></div>`,
        iconAnchor: [10, 10],
      });
      const initialPos = livePos || { lat: homeLatFinal, lng: homeLngFinal };
      markerRef.current = L.marker([initialPos.lat, initialPos.lng], { icon: bikeIcon })
        .addTo(map)
        .bindPopup(`<b>${bikeName}</b><br>${livePos ? 'Live signal active' : 'Waiting for GPS…'}`);

      mapRef.current = map;

      // Fix container size when inside modals
      setTimeout(() => {
        try { map.invalidateSize(); } catch (e) {}
      }, 200);
      setTimeout(() => {
        try { map.invalidateSize(); } catch (e) {}
      }, 600);
    });

    return () => {
      destroyed = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
        circleRef.current = null;
        homeMarkerRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync marker position whenever livePos changes ────────────────────────
  useEffect(() => {
    if (!livePos || !mapRef.current || !markerRef.current) return;
    const dist = haversineKm(homeLatFinal, homeLngFinal, livePos.lat, livePos.lng);
    const outside = dist > radiusKm;
    markerRef.current.setLatLng([livePos.lat, livePos.lng]);
    markerRef.current
      .getPopup()
      ?.setContent(
        `<b>${bikeName}</b><br>` +
        `${dist.toFixed(2)} km from home${outside ? ' ⚠️ OUT OF ZONE' : ' ✅'}`
      );
  }, [livePos, homeLatFinal, homeLngFinal, radiusKm, bikeName]);

  // ── Update circle when radius changes ───────────────────────────────────
  useEffect(() => {
    if (circleRef.current) {
      circleRef.current.setRadius(radiusKm * 1000);
    }
  }, [radiusKm]);

  // ── Update marker icon color when inside/outside ─────────────────────────
  useEffect(() => {
    if (!markerRef.current) return;
    const color = isOutsideRadius ? '#EF4444' : '#00B14F';
    const icon = window.L?.divIcon?.({
      className: '',
      html: `<div style="width:20px;height:20px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 8px ${color}99;animation:${isOutsideRadius ? 'pulse-red 1s infinite' : 'none'}"></div>`,
      iconAnchor: [10, 10],
    });
    // Re-use loadLeaflet to avoid re-importing
    loadLeaflet().then((L) => {
      if (!markerRef.current) return;
      const newIcon = L.divIcon({
        className: '',
        html: `<div style="width:20px;height:20px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 8px ${color}99"></div>`,
        iconAnchor: [10, 10],
      });
      markerRef.current.setIcon(newIcon);
    });
  }, [isOutsideRadius]);

  // ── Subscribe to Supabase Realtime location channel ──────────────────────
  useEffect(() => {
    if (!vehicleId) return;

    setIsConnected(false);
    const unsub = subscribeToLocation(vehicleId, (pos) => {
      setIsConnected(true);
      setIsSimulating(false);
      handlePosition(pos);
    });

    // If no real signal in 8 s, fall back to simulation
    const noSignalTimer = setTimeout(() => {
      setIsSimulating(true);
    }, 8000);

    return () => {
      clearTimeout(noSignalTimer);
      unsub();
    };
  }, [vehicleId, handlePosition]);

  // ── Demo simulation (runs when no real GPS signal) ───────────────────────
  useEffect(() => {
    if (!isSimulating) return;
    const timer = setInterval(() => {
      simTickRef.current += 1;
      const pos = simulateMovement(homeLatFinal, homeLngFinal, radiusKm, simTickRef.current);
      setIsConnected(true);
      handlePosition(pos);
    }, 2000);
    return () => clearInterval(timer);
  }, [isSimulating, homeLatFinal, homeLngFinal, radiusKm, handlePosition]);

  // ── Alarm mute toggle ────────────────────────────────────────────────────
  useEffect(() => {
    if (alarmMuted) stopAlarm();
    else if (isOutsideRadius) startAlarm();
  }, [alarmMuted, isOutsideRadius, startAlarm, stopAlarm]);

  // ── Cleanup alarm on unmount ─────────────────────────────────────────────
  useEffect(() => () => stopAlarm(), [stopAlarm]);

  const dist = livePos
    ? haversineKm(homeLatFinal, homeLngFinal, livePos.lat, livePos.lng)
    : null;

  return (
    <div style={{ borderRadius: 16, overflow: 'hidden', border: '1.5px solid var(--border-color)', background: 'white' }}>

      {/* ── Alarm banner ── */}
      {isOutsideRadius && (
        <div style={{
          background: '#FEE2E2', borderBottom: '2px solid #EF4444',
          padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
          animation: 'pulse-bg 1s infinite',
        }}>
          <AlertTriangle size={20} color="#DC2626" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, color: '#DC2626', fontSize: 14 }}>
              🚨 GEOFENCE BREACH — Vehicle is outside the allowed zone!
            </div>
            <div style={{ fontSize: 12, color: '#991B1B', marginTop: 2 }}>
              {dist ? `${dist.toFixed(2)} km from garage` : ''} · Allowed radius: {radiusKm} km
            </div>
          </div>
          <button
            onClick={() => setAlarmMuted(m => !m)}
            style={{
              background: alarmMuted ? '#FCA5A5' : '#DC2626',
              border: 'none', borderRadius: 8, padding: '6px 10px',
              color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700,
            }}
          >
            {alarmMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            {alarmMuted ? 'Unmute' : 'Mute'}
          </button>
        </div>
      )}

      {/* ── Inside radius banner ── */}
      {!isOutsideRadius && livePos && (
        <div style={{
          background: '#D1FAE5', borderBottom: '1.5px solid #6EE7B7',
          padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <CheckCircle2 size={16} color="#059669" />
          <span style={{ fontWeight: 700, color: '#065F46', fontSize: 13 }}>
            Vehicle is within the zone · {dist ? `${dist.toFixed(2)} km from garage` : ''}
          </span>
        </div>
      )}

      {/* ── Status bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 14px', background: '#F8FAFB', borderBottom: '1px solid var(--border-color)',
        fontSize: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {isConnected
            ? <Wifi size={13} color="#10B981" />
            : <WifiOff size={13} color="#9CA3AF" />}
          <span style={{ color: isConnected ? '#059669' : '#9CA3AF', fontWeight: 600 }}>
            {isConnected ? (isSimulating ? 'Simulated GPS (demo)' : 'Live GPS') : 'Waiting for signal…'}
          </span>
        </div>
        {lastUpdate && (
          <span style={{ color: 'var(--text-muted)' }}>
            Updated {lastUpdate.toLocaleTimeString()}
          </span>
        )}
        {livePos && (
          <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>
            {livePos.lat.toFixed(5)}, {livePos.lng.toFixed(5)}
          </span>
        )}
      </div>

      {/* ── Map container ── */}
      <div ref={mapContainerRef} style={{ height: 320, width: '100%' }} />

      {/* ── Legend ── */}
      <div style={{
        display: 'flex', gap: 16, padding: '10px 14px',
        background: '#F8FAFB', flexWrap: 'wrap', fontSize: 12, color: 'var(--text-muted)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#6B7280', border: '2px solid white', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
          Garage / Home
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#00B14F', border: '2px solid white', boxShadow: '0 1px 3px rgba(0,177,79,0.4)' }} />
          Vehicle (live)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 24, height: 3, background: '#00B14F', borderRadius: 2, opacity: 0.6 }} />
          Allowed radius ({radiusKm} km)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#EF4444', border: '2px solid white' }} />
          Out of zone
        </div>
      </div>

      <style>{`
        @keyframes pulse-bg {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.85; }
        }
      `}</style>
    </div>
  );
}

