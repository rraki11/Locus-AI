import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  BaselinePoiNode,
  CandidateLocationOption,
  CityMarketOption,
  LOCUS_SPATIAL_RINGS,
  LocalAreaOption,
} from '../../data/marketDiscoveryData';

export interface MarketDiscoveryMapProps {
  city: CityMarketOption;
  localArea: LocalAreaOption;
  selectedCandidate: CandidateLocationOption;
  customPinCoords: { lat: number; lng: number } | null;
  onSelectCandidate: (candidateId: string) => void;
  onPlaceCustomPin: (coords: { lat: number; lng: number }) => void;
  preferFallback?: boolean;
}

type RingViewScope = 'ground' | 'local' | 'wider';

const POI_CATEGORY_STYLE: Record<
  BaselinePoiNode['category'],
  { color: string; shortTag: string }
> = {
  COMPETITOR: {
    color: '#38BDF8',
    shortTag: 'POI // F&B',
  },
  COMMERCIAL_POI: {
    color: '#60A5FA',
    shortTag: 'POI // RETAIL',
  },
  TRANSIT_NODE: {
    color: '#A78BFA',
    shortTag: 'TRANSIT',
  },
  ANCHOR_HUB: {
    color: '#34D399',
    shortTag: 'ANCHOR',
  },
};

/**
 * Compute a destination [lat, lng] offset by bearing & meters
 * for placing clean spatial ring labels on the map without overlapping pins.
 */
function offsetByMeters(
  lat: number,
  lng: number,
  northMeters: number,
  eastMeters = 0
): [number, number] {
  const deltaLat = northMeters / 111320;
  const deltaLng =
    eastMeters / (111320 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)));
  return [lat + deltaLat, lng + deltaLng];
}

export const MarketDiscoveryMap: React.FC<MarketDiscoveryMapProps> = ({
  city,
  localArea,
  selectedCandidate,
  customPinCoords,
  onSelectCandidate,
  onPlaceCustomPin,
  preferFallback = false,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const overlaysGroupRef = useRef<L.LayerGroup | null>(null);

  const [activeScope, setActiveScope] = useState<RingViewScope>('local');
  const [hoveredPoi, setHoveredPoi] = useState<BaselinePoiNode | null>(null);
  const [tilesReady, setTilesReady] = useState<boolean>(false);

  const activeLat = customPinCoords ? customPinCoords.lat : selectedCandidate.lat;
  const activeLng = customPinCoords ? customPinCoords.lng : selectedCandidate.lng;

  // Initialize Leaflet map once with standard OpenStreetMap tiles (dark-filtered via CSS)
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container || mapInstanceRef.current) return;

    const map = L.map(container, {
      center: [activeLat, activeLng],
      zoom: 16,
      zoomControl: false,
      attributionControl: true,
      preferCanvas: true,
    });

    L.control
      .zoom({
        position: 'bottomleft',
      })
      .addTo(map);

    const tileLayer = L.tileLayer(
      'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }
    );

    tileLayer.on('load', () => {
      setTilesReady(true);
    });

    tileLayer.addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    overlaysGroupRef.current = layerGroup;
    mapInstanceRef.current = map;

    const resizeTimer = window.setTimeout(() => {
      map.invalidateSize();
    }, 120);

    return () => {
      window.clearTimeout(resizeTimer);
      map.remove();
      mapInstanceRef.current = null;
      overlaysGroupRef.current = null;
    };
  }, []);

  // Bind map click to allow placing/updating candidate location within the neighborhood
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      onPlaceCustomPin({
        lat: Number(e.latlng.lat.toFixed(5)),
        lng: Number(e.latlng.lng.toFixed(5)),
      });
    };

    map.on('click', handleMapClick);
    return () => {
      map.off('click', handleMapClick);
    };
  }, [onPlaceCustomPin]);

  // Smooth camera movement when city, localArea, candidate, or scope changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const targetZoom =
      activeScope === 'ground' ? 17 : activeScope === 'local' ? 16 : 13;

    if (preferFallback) {
      map.setView([activeLat, activeLng], targetZoom, { animate: false });
    } else {
      map.flyTo([activeLat, activeLng], targetZoom, {
        duration: 0.7,
        easeLinearity: 0.25,
      });
    }
  }, [
    city.id,
    localArea.id,
    activeLat,
    activeLng,
    activeScope,
    preferFallback,
  ]);

  // Render Local Area boundary polygon, arterial roads, 3 LOCUS spatial rings, DATABASE POIs, and Candidate Markers
  useEffect(() => {
    const group = overlaysGroupRef.current;
    if (!group) return;

    group.clearLayers();

    // 1. Local Area / Neighborhood Boundary Polygon
    const boundaryPolygon = L.polygon(localArea.boundaryPolygon, {
      color: '#6FAF9B',
      weight: 1.8,
      opacity: 0.8,
      dashArray: '6 6',
      fillColor: '#3D806D',
      fillOpacity: 0.06,
    });
    boundaryPolygon.addTo(group);

    // 2. Arterial Corridors (Road network baseline context)
    localArea.arterialCorridors.forEach((corridor) => {
      L.polyline(corridor.path, {
        color: '#38BDF8',
        weight: 2.2,
        opacity: 0.42,
        dashArray: '5 8',
      }).addTo(group);
    });

    // 3. Three LOCUS Spatial Catchment Rings around the active candidate location
    [...LOCUS_SPATIAL_RINGS].reverse().forEach((ring) => {
      L.circle([activeLat, activeLng], {
        radius: ring.radiusMeters,
        color: ring.strokeColor,
        weight: ring.id === 'ground-reality' ? 2.2 : 1.4,
        opacity: ring.id === 'ground-reality' ? 0.92 : 0.65,
        fillColor: ring.strokeColor,
        fillOpacity:
          ring.id === 'ground-reality'
            ? 0.12
            : ring.id === 'local-market'
            ? 0.04
            : 0.015,
        dashArray: ring.dashArray,
        interactive: false,
      }).addTo(group);

      // Ring scale callout pill positioned cleanly along the northern perimeter of each ring
      const labelPos = offsetByMeters(
        activeLat,
        activeLng,
        ring.radiusMeters,
        0
      );
      const ringLabelIcon = L.divIcon({
        className: 'locus-map-clean-icon',
        html: `<div style="
          display:inline-flex;
          align-items:center;
          gap:5px;
          padding:2px 8px;
          border-radius:6px;
          background:rgba(8,12,18,0.92);
          border:1px solid ${ring.strokeColor}77;
          color:#E2E8F0;
          font-family:'JetBrains Mono',monospace;
          font-size:9px;
          letter-spacing:0.12em;
          white-space:nowrap;
          transform:translate(-50%, -50%);
          box-shadow:0 4px 12px rgba(0,0,0,0.65);
        ">
          <span style="color:${ring.strokeColor};font-weight:700;">${ring.rangeLabel}</span>
          <span style="opacity:0.45;">·</span>
          <span>${ring.stageTitle}</span>
        </div>`,
        iconSize: [140, 20],
        iconAnchor: [0, 0],
      });
      L.marker(labelPos, { icon: ringLabelIcon, interactive: false }).addTo(
        group
      );
    });

    // 4. Surrounding Baseline DATABASE POI & Transit Nodes (Quadrant-staggered so labels never collide with center pin)
    selectedCandidate.surroundingNodes.forEach((poi) => {
      const style = POI_CATEGORY_STYLE[poi.category];
      const isNorth = poi.lat >= activeLat;
      const isEast = poi.lng >= activeLng;
      const translateX = isEast ? '8px' : 'calc(-100% - 8px)';
      const translateY = isNorth ? 'calc(-100% - 6px)' : '6px';

      const poiIcon = L.divIcon({
        className: 'locus-map-clean-icon',
        html: `<div style="position:relative;width:10px;height:10px;">
          <span style="
            position:absolute;
            left:-5px;
            top:-5px;
            width:10px;
            height:10px;
            border-radius:999px;
            background:${style.color};
            border:2px solid #080C12;
            box-shadow:0 0 10px ${style.color};
          "></span>
          <div style="
            position:absolute;
            left:0;
            top:0;
            transform:translate(${translateX}, ${translateY});
            display:inline-flex;
            align-items:center;
            gap:5px;
            padding:2.5px 7px;
            border-radius:6px;
            background:rgba(10,16,22,0.92);
            border:1px solid ${style.color}66;
            color:#E2E8F0;
            font-family:'JetBrains Mono',monospace;
            font-size:8.5px;
            white-space:nowrap;
            box-shadow:0 4px 12px rgba(0,0,0,0.65);
          ">
            <span style="color:${style.color};font-weight:700;">${style.shortTag}</span>
            <span>${poi.name}</span>
          </div>
        </div>`,
        iconSize: [10, 10],
        iconAnchor: [0, 0],
      });

      const marker = L.marker([poi.lat, poi.lng], { icon: poiIcon });
      marker.on('mouseover', () => setHoveredPoi(poi));
      marker.on('mouseout', () =>
        setHoveredPoi((prev) => (prev?.id === poi.id ? null : prev))
      );
      marker.addTo(group);
    });

    // 5. Secondary Candidate Locations in this Local Area
    localArea.candidates.forEach((cand) => {
      const isSelected =
        !customPinCoords && cand.id === selectedCandidate.id;

      if (isSelected) return;

      const secondaryCandidateIcon = L.divIcon({
        className: 'locus-map-clean-icon',
        html: `<div style="
          display:inline-flex;
          align-items:center;
          gap:6px;
          padding:3.5px 9px;
          border-radius:999px;
          background:rgba(12,19,26,0.94);
          border:1px solid rgba(111,175,155,0.45);
          color:#CBD5E1;
          font-family:'JetBrains Mono',monospace;
          font-size:9px;
          white-space:nowrap;
          cursor:pointer;
          transform:translate(-50%, 10px);
          box-shadow:0 6px 16px rgba(0,0,0,0.7);
        ">
          <span style="width:7px;height:7px;border-radius:999px;border:1.5px solid #6FAF9B;background:#0A1016;"></span>
          <span>CANDIDATE // ${cand.label}</span>
        </div>`,
        iconSize: [160, 24],
        iconAnchor: [0, 0],
      });

      const candMarker = L.marker([cand.lat, cand.lng], {
        icon: secondaryCandidateIcon,
      });
      candMarker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectCandidate(cand.id);
      });
      candMarker.addTo(group);
    });

    // 6. Active Candidate Location Marker (Primary Spatial Core Beacon)
    const activeTitle = customPinCoords
      ? 'Placed Candidate Pin'
      : selectedCandidate.label;

    const primaryCandidateIcon = L.divIcon({
      className: 'locus-map-clean-icon',
      html: `<div style="
        position:relative;
        display:flex;
        flex-direction:column;
        align-items:center;
        transform:translate(-50%, -50%);
        pointer-events:auto;
      ">
        <div style="
          width:18px;
          height:18px;
          border-radius:999px;
          background:rgba(111,175,155,0.32);
          border:2.5px solid #6FAF9B;
          box-shadow:0 0 22px rgba(111,175,155,0.95);
        "></div>
        <div style="
          margin-top:6px;
          padding:4px 10px;
          border-radius:999px;
          background:rgba(8,12,18,0.96);
          border:1.5px solid #6FAF9B;
          color:#F8FAFC;
          font-family:'JetBrains Mono',monospace;
          font-size:9.5px;
          font-weight:700;
          letter-spacing:0.08em;
          white-space:nowrap;
          box-shadow:0 10px 28px rgba(0,0,0,0.85), 0 0 16px rgba(111,175,155,0.3);
          display:flex;
          align-items:center;
          gap:6px;
        ">
          <span style="width:6px;height:6px;border-radius:999px;background:#6FAF9B;box-shadow:0 0 8px #6FAF9B;"></span>
          <span>CANDIDATE // ${activeTitle}</span>
        </div>
      </div>`,
      iconSize: [220, 56],
      iconAnchor: [0, 0],
    });

    L.marker([activeLat, activeLng], {
      icon: primaryCandidateIcon,
      zIndexOffset: 1000,
    }).addTo(group);
  }, [
    localArea,
    selectedCandidate,
    customPinCoords,
    activeLat,
    activeLng,
    onSelectCandidate,
  ]);

  return (
    <div className="relative h-full min-h-[560px] w-full overflow-hidden rounded-2xl border border-white/15 bg-[#080C12] shadow-[0_24px_60px_-15px_rgba(0,0,0,0.85)]">
      {/* Subtle Spatial Coordinate Grid Behind Leaflet Tiles */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(111, 175, 155, 0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(111, 175, 155, 0.06) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
          opacity: tilesReady ? 0.35 : 0.75,
        }}
        aria-hidden="true"
      />

      {/* Leaflet Interactive Map Canvas */}
      <div
        ref={mapContainerRef}
        aria-label="LOCUS Local Area & Candidate Location Spatial Map"
        className="relative z-10 h-full min-h-[560px] w-full"
      />

      {/* UNIFIED TOP MAP HUD BAR: Never overlaps across 1920x1080, 1440x900, or 1366x768 */}
      <div className="pointer-events-none absolute inset-x-3 top-3 z-20 flex flex-wrap items-center justify-between gap-2">
        {/* Top-Left: Local-First Geographic Hierarchy Pill */}
        <div className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-[#0A1016]/90 px-3 py-1.5 shadow-lg backdrop-blur-md">
          <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-slate-400">
            {city.name}
          </span>
          <span className="font-mono text-[9.5px] text-[#6FAF9B]">→</span>
          <span className="rounded bg-[#3D806D]/30 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#6FAF9B]">
            {localArea.name}
          </span>
        </div>

        {/* Top-Right: Spatial Ring Camera Scope Selector */}
        <div className="pointer-events-auto inline-flex items-center gap-1 rounded-xl border border-white/15 bg-[#0A1016]/90 p-1 shadow-lg backdrop-blur-md">
          {(
            [
              { id: 'ground', label: '0–300m', sub: 'Ground' },
              { id: 'local', label: '300m–2km', sub: 'Local' },
              { id: 'wider', label: '2–5km', sub: 'Wider' },
            ] as const
          ).map((scope) => {
            const isCurrent = activeScope === scope.id;
            return (
              <button
                key={scope.id}
                type="button"
                onClick={() => setActiveScope(scope.id)}
                className={`rounded-lg px-2 py-1 font-mono text-[9.5px] uppercase tracking-[0.11em] transition-all ${
                  isCurrent
                    ? 'border border-[#6FAF9B]/55 bg-[#3D806D]/35 font-bold text-white'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                <span>{scope.label}</span>
                <span className="ml-1 hidden text-[8.5px] text-[#6FAF9B] xl:inline">
                  {scope.sub}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Hovered Baseline POI Tooltip Banner */}
      {hoveredPoi && (
        <div className="pointer-events-none absolute bottom-14 left-1/2 z-20 -translate-x-1/2 rounded-xl border border-sky-400/40 bg-[#0A1016]/95 px-3.5 py-2 shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-2 font-mono text-[10px]">
            <span className="rounded border border-sky-400/40 bg-sky-500/15 px-1.5 py-0.5 text-[9px] font-bold text-sky-300">
              {hoveredPoi.evidenceType}
            </span>
            <span className="font-semibold text-white">{hoveredPoi.name}</span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-300">{hoveredPoi.subLabel}</span>
            <span className="text-slate-400">·</span>
            <span className="text-[#6FAF9B]">{hoveredPoi.distanceBand}</span>
          </div>
        </div>
      )}

      {/* BOTTOM MAP LEGEND: 3 LOCUS Spatial Scales + Evidence Context */}
      <div className="pointer-events-none absolute bottom-3.5 right-3.5 z-20 flex flex-wrap items-center gap-2.5 rounded-xl border border-white/15 bg-[#0A1016]/90 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-slate-300 shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#6FAF9B]" />
          <span className="font-semibold text-white">0–300m</span>
          <span className="text-slate-400">Ground Reality</span>
        </div>
        <span className="text-white/15">|</span>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-sky-400" />
          <span className="font-semibold text-white">300m–2km</span>
          <span className="text-slate-400">Local Market</span>
        </div>
        <span className="text-white/15">|</span>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-slate-400" />
          <span className="font-semibold text-white">2–5km</span>
          <span className="text-slate-400">Wider Market</span>
        </div>
      </div>
    </div>
  );
};
