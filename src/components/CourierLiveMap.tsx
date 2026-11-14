import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Truck,
  Pause,
  Play,
  LocateFixed,
  Navigation,
  Clock,
  MapPin,
  CheckCircle2,
  Radio,
} from 'lucide-react';
import { UserAddress, UserOrder } from '../types/index.js';
import {
  buildCourierRouteTelemetry,
  getActiveCourierOrders,
} from '../utils/courierLiveMap.js';

interface CourierLiveMapProps {
  orders: UserOrder[];
  addresses: UserAddress[];
  onOpenOrderTracker?: (order: UserOrder) => void;
}

function createHubDivIcon(label: string, variant: 'origin' | 'hub' | 'destination'): L.DivIcon {
  if (variant === 'hub') {
    return L.divIcon({
      className: 'nexora-leaflet-hub-dot',
      html: `<div title="${label}" style="width:12px;height:12px;border-radius:9999px;background:#0f172a;border:2px solid #38bdf8;box-shadow:0 2px 6px rgba(0,0,0,0.45);transform:translate(-50%,-50%);cursor:pointer;"></div>`,
      iconSize: [12, 12],
      iconAnchor: [0, 0],
    });
  }

  const bg = variant === 'origin' ? '#0f172a' : '#10b981';
  const border = variant === 'origin' ? '#06b6d4' : '#34d399';
  const glyph = variant === 'origin' ? 'HUB' : 'DEST';
  const shortLabel = label.replace(/^Customer Doorstep ·\s*/i, '').replace(/^NEXORA\s+/i, '');

  return L.divIcon({
    className: 'nexora-leaflet-hub-icon',
    html: `<div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-50%);">
      <div style="background:${bg};color:#fff;border:2px solid ${border};border-radius:7px;padding:2px 6px;font:700 9px/1.2 ui-monospace,monospace;box-shadow:0 4px 10px rgba(0,0,0,0.35);white-space:nowrap;">${glyph}</div>
      <span style="margin-top:2px;font:600 9px/1.1 system-ui,sans-serif;color:#0f172a;background:rgba(255,255,255,0.92);padding:1px 5px;border-radius:4px;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,0.2);">${shortLabel}</span>
    </div>`,
    iconSize: [24, 24],
    iconAnchor: [0, 0],
  });
}

function createCourierDivIcon(courierLabel: string): L.DivIcon {
  return L.divIcon({
    className: 'nexora-leaflet-courier-icon',
    html: `<div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-50%);pointer-events:auto;">
      <div style="position:relative;display:flex;align-items:center;gap:4px;background:linear-gradient(135deg,#06b6d4,#2563eb);color:#fff;border:2px solid #fff;border-radius:9999px;padding:4px 9px;font:700 10px/1.1 system-ui,sans-serif;box-shadow:0 0 0 6px rgba(6,182,212,0.25),0 6px 14px rgba(2,132,199,0.45);white-space:nowrap;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>
        <span>${courierLabel}</span>
      </div>
    </div>`,
    iconSize: [140, 32],
    iconAnchor: [0, 0],
  });
}

function createCityCorridorGridLayer(isDark: boolean): L.GridLayer {
  const CorridorLayer = L.GridLayer.extend({
    createTile(coords: L.Coords) {
      const tile = document.createElement('canvas');
      const size = this.getTileSize();
      tile.width = size.x;
      tile.height = size.y;
      const ctx = tile.getContext('2d');
      if (!ctx) return tile;

      // Surface background
      ctx.fillStyle = isDark ? '#0b1220' : '#f1f5f9';
      ctx.fillRect(0, 0, size.x, size.y);

      // Subtle urban block pattern
      ctx.fillStyle = isDark ? '#111c30' : '#e2e8f0';
      for (let gx = 16; gx < size.x; gx += 64) {
        for (let gy = 16; gy < size.y; gy += 64) {
          ctx.fillRect(gx, gy, 44, 44);
        }
      }

      // Secondary street grid
      ctx.strokeStyle = isDark ? 'rgba(51, 65, 85, 0.45)' : 'rgba(148, 163, 184, 0.35)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= size.x; i += 32) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, size.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(size.x, i);
        ctx.stroke();
      }

      // Major arterial expressways per tile parity
      ctx.strokeStyle = isDark ? 'rgba(14, 165, 233, 0.22)' : 'rgba(14, 116, 144, 0.2)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, (Math.abs(coords.x + coords.y) % 2) * 128 + 64);
      ctx.lineTo(size.x, 192);
      ctx.stroke();

      // Tile coordinate micro-grid stamp
      ctx.fillStyle = isDark ? 'rgba(148, 163, 184, 0.22)' : 'rgba(100, 116, 139, 0.28)';
      ctx.font = '10px ui-monospace, monospace';
      ctx.fillText(`NCR-SEC ${coords.z}:${coords.x},${coords.y}`, 8, 16);

      return tile;
    },
  });

  return new (CorridorLayer as unknown as new (opts?: L.GridLayerOptions) => L.GridLayer)({
    attribution: 'NEXORA Live Logistics Telemetry · Leaflet',
  });
}

export const CourierLiveMap: React.FC<CourierLiveMapProps> = ({
  orders,
  addresses,
  onOpenOrderTracker,
}) => {
  const activeOrders = useMemo(() => getActiveCourierOrders(orders), [orders]);
  const [selectedOrderId, setSelectedOrderId] = useState<string>(
    activeOrders[0]?.id || ''
  );
  const [isLiveAnimating, setIsLiveAnimating] = useState<boolean>(true);
  const [liveTick, setLiveTick] = useState<number>(0.42);
  const [isDarkTheme, setIsDarkTheme] = useState<boolean>(() =>
    typeof document !== 'undefined'
      ? document.documentElement.classList.contains('dark')
      : true
  );

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const gridLayerRef = useRef<L.GridLayer | null>(null);
  const completedLineRef = useRef<L.Polyline | null>(null);
  const remainingLineRef = useRef<L.Polyline | null>(null);
  const courierMarkerRef = useRef<L.Marker | null>(null);
  const staticMarkersRef = useRef<L.LayerGroup | null>(null);

  // Sync active order selection if order list changes
  useEffect(() => {
    if (activeOrders.length > 0 && !activeOrders.some((o) => o.id === selectedOrderId)) {
      setSelectedOrderId(activeOrders[0].id);
    }
  }, [activeOrders, selectedOrderId]);

  // Observe light/dark root class switches
  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      setIsDarkTheme(root.classList.contains('dark'));
    });
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Advance live courier position smoothly when active
  useEffect(() => {
    if (!isLiveAnimating || activeOrders.length === 0) return;
    const timer = window.setInterval(() => {
      setLiveTick((prev) => (prev >= 0.96 ? 0.15 : Number((prev + 0.08).toFixed(2))));
    }, 1500);
    return () => window.clearInterval(timer);
  }, [isLiveAnimating, activeOrders.length]);

  const selectedOrder =
    activeOrders.find((o) => o.id === selectedOrderId) || activeOrders[0] || null;

  const telemetry = useMemo(() => {
    if (!selectedOrder) return null;
    return buildCourierRouteTelemetry(selectedOrder, addresses, liveTick);
  }, [selectedOrder, addresses, liveTick]);

  // Initialize Leaflet map once container mounts
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container || !telemetry) return;

    // Ensure clean mount if strict mode or re-open occurs
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const initialBounds = L.latLngBounds(
      telemetry.waypoints.map((w) => [w.lat, w.lng] as [number, number])
    );

    const map = L.map(container, {
      center: [telemetry.currentPosition.lat, telemetry.currentPosition.lng],
      zoom: 11,
      zoomControl: true,
      scrollWheelZoom: false,
      attributionControl: true,
    });
    mapInstanceRef.current = map;

    map.fitBounds(initialBounds, { padding: [48, 56], maxZoom: 13 });

    const baseLayer = createCityCorridorGridLayer(isDarkTheme);
    baseLayer.addTo(map);
    gridLayerRef.current = baseLayer;

    const staticGroup = L.layerGroup().addTo(map);
    staticMarkersRef.current = staticGroup;

    const completedLine = L.polyline(telemetry.completedPath, {
      color: '#06b6d4',
      weight: 4,
      opacity: 0.95,
    }).addTo(map);
    completedLineRef.current = completedLine;

    const remainingLine = L.polyline(telemetry.remainingPath, {
      color: '#38bdf8',
      weight: 3,
      dashArray: '6, 8',
      opacity: 0.7,
    }).addTo(map);
    remainingLineRef.current = remainingLine;

    telemetry.waypoints.forEach((wp) => {
      const marker = L.marker([wp.lat, wp.lng], {
        icon: createHubDivIcon(wp.label, wp.role),
      }).bindPopup(
        `<strong>${wp.label}</strong><br/><span style="font-size:11px">Order ${telemetry.orderId}</span>`
      );
      marker.addTo(staticGroup);

      if (wp.role === 'destination') {
        L.circle([wp.lat, wp.lng], {
          radius: 750,
          color: '#10b981',
          fillColor: '#10b981',
          fillOpacity: 0.12,
          weight: 1.5,
        }).addTo(staticGroup);
      }
    });

    const courierMarker = L.marker(
      [telemetry.currentPosition.lat, telemetry.currentPosition.lng],
      {
        icon: createCourierDivIcon('BlueDart Express'),
        zIndexOffset: 1000,
      }
    )
      .bindPopup(
        `<div style="font-size:12px;"><strong>BlueDart Express</strong><br/>AWB: ${telemetry.trackingNumber}<br/>Stage: ${telemetry.stage} · ${telemetry.speedKmh} km/h</div>`
      )
      .addTo(map);
    courierMarkerRef.current = courierMarker;

    const rafId = window.requestAnimationFrame(() => {
      if (mapInstanceRef.current === map) {
        map.invalidateSize();
        map.fitBounds(initialBounds, { padding: [48, 56], maxZoom: 13 });
      }
    });

    return () => {
      window.cancelAnimationFrame(rafId);
      map.remove();
      mapInstanceRef.current = null;
      gridLayerRef.current = null;
      completedLineRef.current = null;
      remainingLineRef.current = null;
      courierMarkerRef.current = null;
      staticMarkersRef.current = null;
    };
  }, [selectedOrder?.id]);

  // Swap grid theme cleanly without destroying map state
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (gridLayerRef.current) {
      map.removeLayer(gridLayerRef.current);
    }
    const nextLayer = createCityCorridorGridLayer(isDarkTheme);
    nextLayer.addTo(map);
    nextLayer.bringToBack();
    gridLayerRef.current = nextLayer;
  }, [isDarkTheme]);

  // Update live courier coordinates & polyline on tick or stage change
  useEffect(() => {
    if (!telemetry || !mapInstanceRef.current) return;
    completedLineRef.current?.setLatLngs(telemetry.completedPath);
    remainingLineRef.current?.setLatLngs(telemetry.remainingPath);
    courierMarkerRef.current?.setLatLng([
      telemetry.currentPosition.lat,
      telemetry.currentPosition.lng,
    ]);
    courierMarkerRef.current?.setPopupContent(
      `<div style="font-size:12px;"><strong>BlueDart Express</strong><br/>AWB: ${telemetry.trackingNumber}<br/>Stage: ${telemetry.stage} · ${telemetry.speedKmh} km/h · ETA ${telemetry.etaLabel}</div>`
    );
  }, [telemetry]);

  const handleRecenter = () => {
    const map = mapInstanceRef.current;
    if (!map || !telemetry) return;
    const bounds = L.latLngBounds(
      telemetry.waypoints.map((w) => [w.lat, w.lng] as [number, number])
    );
    map.fitBounds(bounds, { padding: [48, 56], maxZoom: 13 });
  };

  if (activeOrders.length === 0 || !telemetry || !selectedOrder) {
    return (
      <div
        data-testid="courier-live-map-empty"
        className="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 flex items-center justify-between gap-3 text-xs"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white">
              BlueDart Express Live Map
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              All active shipments have been delivered. Place a new order to track live courier GPS telemetry.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="courier-live-map"
      className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b1322] overflow-hidden shadow-xs"
    >
      {/* Header Toolbar */}
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/60 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 flex items-center justify-center shrink-0">
            <Truck className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                BlueDart Express Live GPS Tracker
              </h4>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                <Radio className="w-3 h-3 animate-pulse" />
                <span>LIVE</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {telemetry.courierDisplayName} · AWB:{' '}
              <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                {telemetry.trackingNumber}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {activeOrders.length > 1 && (
            <select
              aria-label="Select active order for live map"
              value={selectedOrder.id}
              onChange={(e) => setSelectedOrderId(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px] font-mono font-semibold text-slate-800 dark:text-slate-200 cursor-pointer focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              {activeOrders.map((ord) => (
                <option key={ord.id} value={ord.id}>
                  {ord.id} ({ord.trackingStage || ord.status})
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={() => setIsLiveAnimating((prev) => !prev)}
            className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-cyan-500 text-[11px] font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1 cursor-pointer transition-colors"
            aria-label={isLiveAnimating ? 'Pause live courier GPS' : 'Resume live courier GPS'}
          >
            {isLiveAnimating ? (
              <>
                <Pause className="w-3 h-3 text-amber-500" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 text-emerald-500" />
                <span>Resume</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleRecenter}
            className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-cyan-500 text-[11px] font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1 cursor-pointer transition-colors"
            aria-label="Recenter route on map"
          >
            <LocateFixed className="w-3 h-3 text-cyan-500" />
            <span>Recenter</span>
          </button>
        </div>
      </div>

      {/* Interactive Leaflet Map Surface (isolated z-index so overlays never bleed) */}
      <div className="relative isolate z-0">
        <div
          ref={mapContainerRef}
          data-testid="leaflet-courier-canvas"
          className="w-full h-56 sm:h-64 z-0"
          aria-label={`Interactive Leaflet courier tracking map for ${telemetry.orderId}`}
        />
      </div>

      {/* Live Telemetry Footer Strip */}
      <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/50 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
        <div className="flex items-center gap-1.5 min-w-0">
          <Navigation className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
          <div className="min-w-0">
            <span className="text-[9px] uppercase font-mono text-slate-400 block">
              Speed &amp; Heading
            </span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate block">
              {telemetry.speedKmh} km/h · {telemetry.headingDegrees}°
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 min-w-0">
          <Clock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <div className="min-w-0">
            <span className="text-[9px] uppercase font-mono text-slate-400 block">
              Remaining / ETA
            </span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate block">
              {telemetry.distanceRemainingKm} km · {telemetry.etaLabel}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 min-w-0">
          <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
          <div className="min-w-0">
            <span className="text-[9px] uppercase font-mono text-slate-400 block">
              GPS Coordinates
            </span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate block">
              {telemetry.currentPosition.lat.toFixed(4)}, {telemetry.currentPosition.lng.toFixed(4)}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end">
          {onOpenOrderTracker ? (
            <button
              type="button"
              onClick={() => onOpenOrderTracker(selectedOrder)}
              className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-[11px] transition-colors cursor-pointer whitespace-nowrap"
            >
              Inspect Checkpoints
            </button>
          ) : (
            <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 font-semibold truncate">
              Next: {telemetry.nextCheckpointLabel}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
