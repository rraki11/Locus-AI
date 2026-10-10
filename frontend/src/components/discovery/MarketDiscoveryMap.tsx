import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  BaselinePoiNode,
  CandidateLocationAnalysis,
  LOCUS_SPATIAL_RINGS,
  NormalizedBaselinePlace,
  SpatialBandKey,
  parseAndValidateCoordinates,
} from '../../data/marketDiscoveryData';

export interface MarketDiscoveryMapProps {
  analysis: CandidateLocationAnalysis;
  onUpdateCoordinates: (coords: { lat: number; lng: number }) => void;
  preferFallback?: boolean;
}

type RingViewScope = 'ground' | 'local' | 'wider';

const SPATIAL_BAND_MARKER_STYLE: Record<
  SpatialBandKey,
  { color: string; glow: string; badgeLabel: string }
> = {
  '0-300m': {
    color: '#FB923C',
    glow: 'rgba(251, 146, 60, 0.85)',
    badgeLabel: '0–300m · Ground Reality',
  },
  '300m-2km': {
    color: '#818CF8',
    glow: 'rgba(129, 140, 248, 0.80)',
    badgeLabel: '300m–2km · Local Market',
  },
  '2-5km': {
    color: '#E879F9',
    glow: 'rgba(232, 121, 249, 0.68)',
    badgeLabel: '2–5km · Wider Market',
  },
};

const POI_CATEGORY_COLOR: Record<BaselinePoiNode['category'], string> = {
  COMPETITOR: '#818CF8',
  COMMERCIAL_POI: '#60A5FA',
  TRANSIT_NODE: '#E879F9',
  ANCHOR_HUB: '#FB923C',
};

interface HoveredMapEntity {
  id: string;
  name: string;
  subLabel: string;
  bandLabel: string;
  distanceLabel?: string;
  sourceLabel?: string;
}

export const MarketDiscoveryMap: React.FC<MarketDiscoveryMapProps> = ({
  analysis,
  onUpdateCoordinates,
  preferFallback = false,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const overlaysGroupRef = useRef<L.LayerGroup | null>(null);

  const [activeScope, setActiveScope] = useState<RingViewScope>('local');
  const [hoveredEntity, setHoveredEntity] = useState<HoveredMapEntity | null>(
    null
  );
  const [tilesReady, setTilesReady] = useState<boolean>(false);
  const [currentZoom, setCurrentZoom] = useState<number>(15);

  const validCoords = parseAndValidateCoordinates(analysis.coordinates) ?? {
    lat: 17.4319,
    lng: 78.4071,
  };
  const activeLat = validCoords.lat;
  const activeLng = validCoords.lng;
  const isResolved = analysis.locationStatus === 'RESOLVED';
  const baselinePlaces: NormalizedBaselinePlace[] =
    analysis.marketBaseline?.places ?? [];

  // Initialize Leaflet map once
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container || mapInstanceRef.current) return;
    if (!Number.isFinite(activeLat) || !Number.isFinite(activeLng)) return;

    const initialZoom = isResolved ? 15 : 5;
    setCurrentZoom(initialZoom);

    const map = L.map(container, {
      center: [activeLat, activeLng],
      zoom: initialZoom,
      zoomControl: false,
      attributionControl: true,
      preferCanvas: true,
    });

    map.on('zoomend', () => {
      setCurrentZoom(map.getZoom());
    });

    L.control
      .zoom({
        position: 'bottomleft',
      })
      .addTo(map);

    const tileLayer = L.tileLayer(
      'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution: '&copy; OpenStreetMap',
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

  // Clicking anywhere on the map places/moves the candidate location
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      onUpdateCoordinates({
        lat: Number(e.latlng.lat.toFixed(5)),
        lng: Number(e.latlng.lng.toFixed(5)),
      });
    };

    map.on('click', handleMapClick);
    return () => {
      map.off('click', handleMapClick);
    };
  }, [onUpdateCoordinates]);

  // Smooth camera response when coordinates, hierarchy level, or spatial scope change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    let targetZoom = 15;
    if (!isResolved || analysis.cameraLevel === 'country') {
      targetZoom = 5;
    } else if (analysis.cameraLevel === 'state') {
      targetZoom = 7;
    } else if (analysis.cameraLevel === 'city') {
      targetZoom =
        activeScope === 'ground' ? 16 : activeScope === 'local' ? 14 : 12;
    } else {
      targetZoom =
        activeScope === 'ground' ? 17 : activeScope === 'local' ? 15 : 13;
    }

    if (!Number.isFinite(activeLat) || !Number.isFinite(activeLng)) return;

    if (preferFallback) {
      map.setView([activeLat, activeLng], targetZoom, { animate: false });
    } else {
      map.flyTo([activeLat, activeLng], targetZoom, {
        duration: 0.65,
        easeLinearity: 0.25,
      });
    }
  }, [
    activeLat,
    activeLng,
    activeScope,
    analysis.cameraLevel,
    isResolved,
    preferFallback,
  ]);

  // Render Local Area boundary, 3 Spatial Catchment Rings, Normalized Competitor Places, and Draggable Candidate Pin
  useEffect(() => {
    const group = overlaysGroupRef.current;
    if (!group) return;
    if (!Number.isFinite(activeLat) || !Number.isFinite(activeLng)) return;

    group.clearLayers();

    // 1. Local Area Boundary Polygon (when resolved to locality/candidate)
    if (isResolved && analysis.boundaryPolygon.length > 0) {
      const validPolygon = analysis.boundaryPolygon.filter(
        (pt) =>
          Array.isArray(pt) &&
          pt.length >= 2 &&
          Number.isFinite(pt[0]) &&
          Number.isFinite(pt[1])
      );
      if (validPolygon.length >= 3) {
        L.polygon(validPolygon, {
          color: '#C084FC',
          weight: 1.2,
          opacity: 0.48,
          dashArray: '6 6',
          fillColor: '#4F46E5',
          fillOpacity: 0.03,
          interactive: false,
        }).addTo(group);
      }
    }

    // 2. Arterial Corridors (when available in baseline context)
    if (isResolved) {
      analysis.arterialCorridors.forEach((corridor) => {
        const validPath = corridor.path.filter(
          (pt) =>
            Array.isArray(pt) &&
            pt.length >= 2 &&
            Number.isFinite(pt[0]) &&
            Number.isFinite(pt[1])
        );
        if (validPath.length >= 2) {
          L.polyline(validPath, {
            color: '#818CF8',
            weight: 1.8,
            opacity: 0.34,
            dashArray: '5 8',
            interactive: false,
          }).addTo(group);
        }
      });
    }

    // 3. Three Spatial Catchment Rings Centered on Candidate Coordinates
    // (0-300m Ground Reality, 300m-2km Local Market, 2-5km Wider Market)
    if (isResolved) {
      [...LOCUS_SPATIAL_RINGS].reverse().forEach((ring) => {
        const isScopeActive =
          (activeScope === 'ground' && ring.bandKey === '0-300m') ||
          (activeScope === 'local' && ring.bandKey === '300m-2km') ||
          (activeScope === 'wider' && ring.bandKey === '2-5km');

        L.circle([activeLat, activeLng], {
          radius: ring.radiusMeters,
          color: ring.strokeColor,
          weight: isScopeActive ? 2.6 : 1.2,
          opacity: isScopeActive ? 0.95 : 0.40,
          fillColor: ring.strokeColor,
          fillOpacity: isScopeActive
            ? ring.id === 'ground-reality'
              ? 0.12
              : ring.id === 'local-market'
              ? 0.06
              : 0.03
            : 0.015,
          dashArray: isScopeActive ? undefined : ring.dashArray,
          interactive: false,
        }).addTo(group);
      });
    }

    // 4A. Normalized Competitor Places from Market Baseline Engine
    if (isResolved && baselinePlaces.length > 0) {
      baselinePlaces.forEach((place, idx) => {
        if (!Number.isFinite(place.latitude) || !Number.isFinite(place.longitude)) {
          return;
        }
        const bandStyle = SPATIAL_BAND_MARKER_STYLE[place.spatial_band];
        // Prevent label collision: only show inline chips when zoomed in (>= 15) and for top 3 nearest places
        const showInlineChip =
          currentZoom >= 15 &&
          place.spatial_band === '0-300m' &&
          idx < 3;
        const isNorth = place.latitude >= activeLat;
        const isEast = place.longitude >= activeLng;
        const translateX = isEast ? '10px' : 'calc(-100% - 10px)';
        const translateY = isNorth ? 'calc(-100% - 5px)' : '5px';

        const dotSize = place.spatial_band === '0-300m' ? 11 : 9;
        const halfDot = dotSize / 2;

        const competitorIcon = L.divIcon({
          className: 'locus-map-clean-icon',
          html: `<div data-testid="competitor-map-marker" data-band="${place.spatial_band}" style="position:relative;width:${dotSize}px;height:${dotSize}px;">
            <span style="
              position:absolute;
              left:-${halfDot}px;
              top:-${halfDot}px;
              width:${dotSize}px;
              height:${dotSize}px;
              border-radius:999px;
              background:${bandStyle.color};
              border:2px solid #05040E;
              box-shadow:0 0 10px ${bandStyle.glow};
            "></span>
            ${
              showInlineChip
                ? `<div style="
              position:absolute;
              left:0;
              top:0;
              transform:translate(${translateX}, ${translateY});
              padding:2px 7px;
              border-radius:6px;
              background:rgba(10,8,24,0.92);
              border:1px solid rgba(192,132,252,0.28);
              color:#F1F5F9;
              font-family:'Inter',sans-serif;
              font-size:10.5px;
              font-weight:500;
              white-space:nowrap;
              box-shadow:0 4px 12px rgba(0,0,0,0.72);
            ">
              ${place.business_name}
            </div>`
                : ''
            }
          </div>`,
          iconSize: [dotSize, dotSize],
          iconAnchor: [0, 0],
        });

        const marker = L.marker([place.latitude, place.longitude], {
          icon: competitorIcon,
          zIndexOffset: place.spatial_band === '0-300m' ? 400 : 200,
        });

        const entitySummary: HoveredMapEntity = {
          id: place.place_id,
          name: place.business_name,
          subLabel: place.vicinity || 'Mapped Competitor',
          bandLabel: bandStyle.badgeLabel,
          distanceLabel: `${place.distance_m}m`,
          sourceLabel: `${place.source} · DATABASE`,
        };

        marker.on('mouseover', () => setHoveredEntity(entitySummary));
        marker.on('click', () => setHoveredEntity(entitySummary));
        marker.on('mouseout', () =>
          setHoveredEntity((prev) =>
            prev?.id === place.place_id ? null : prev
          )
        );
        marker.addTo(group);
      });
    } else if (isResolved && analysis.surroundingNodes.length > 0) {
      // 4B. Fallback to static anchor nodes if baseline request hasn't completed yet
      analysis.surroundingNodes.forEach((poi) => {
        if (!Number.isFinite(poi.lat) || !Number.isFinite(poi.lng)) return;
        const color = POI_CATEGORY_COLOR[poi.category];
        const poiIcon = L.divIcon({
          className: 'locus-map-clean-icon',
          html: `<div style="position:relative;width:9px;height:9px;">
            <span style="
              position:absolute;
              left:-4.5px;
              top:-4.5px;
              width:9px;
              height:9px;
              border-radius:999px;
              background:${color};
              border:2px solid #05040E;
              box-shadow:0 0 8px ${color};
            "></span>
          </div>`,
          iconSize: [9, 9],
          iconAnchor: [0, 0],
        });

        const marker = L.marker([poi.lat, poi.lng], { icon: poiIcon });
        marker.on('mouseover', () =>
          setHoveredEntity({
            id: poi.id,
            name: poi.name,
            subLabel: poi.subLabel,
            bandLabel: poi.distanceBand,
          })
        );
        marker.on('mouseout', () =>
          setHoveredEntity((prev) => (prev?.id === poi.id ? null : prev))
        );
        marker.addTo(group);
      });
    }

    // 5. Primary Draggable Candidate Location Marker (Luminous Indigo/Violet + Warm Orange Core)
    const pinLabel = isResolved
      ? analysis.candidateName
      : 'Click map or drag pin to select location';

    const primaryCandidateIcon = L.divIcon({
      className: 'locus-map-clean-icon',
      html: `<div data-testid="candidate-map-pin" style="
        position:relative;
        display:flex;
        flex-direction:column;
        align-items:center;
        transform:translate(-50%, -50%);
        cursor:grab;
      ">
        <div style="
          width:24px;
          height:24px;
          border-radius:999px;
          background:linear-gradient(135deg, rgba(124,58,237,0.55) 0%, rgba(249,115,22,0.55) 100%);
          border:2.5px solid #FB923C;
          box-shadow:0 0 24px rgba(249,115,22,0.88), 0 0 40px rgba(139,92,246,0.65), inset 0 1px 1px rgba(255,255,255,0.55);
          display:flex;
          align-items:center;
          justify-content:center;
        ">
          <span style="width:7px;height:7px;border-radius:999px;background:#FFFFFF;"></span>
        </div>
        <div style="
          margin-top:8px;
          padding:5px 13px;
          border-radius:999px;
          background:linear-gradient(145deg, rgba(16,12,34,0.92) 0%, rgba(8,6,20,0.88) 100%);
          backdrop-filter:blur(16px);
          border-top:1px solid rgba(216,180,254,0.45);
          border-left:1px solid rgba(129,140,248,0.42);
          border-right:1px solid rgba(251,146,60,0.35);
          border-bottom:1px solid rgba(251,146,60,0.28);
          color:#F8FAFC;
          font-family:'Plus Jakarta Sans','Inter',sans-serif;
          font-size:12px;
          font-weight:600;
          white-space:nowrap;
          box-shadow:0 14px 28px rgba(0,0,0,0.82), inset 0 1px 0 rgba(255,255,255,0.20);
          display:flex;
          align-items:center;
          gap:7px;
        ">
          <span style="width:6px;height:6px;border-radius:999px;background:linear-gradient(135deg,#E879F9,#FB923C);"></span>
          <span>${pinLabel}</span>
        </div>
      </div>`,
      iconSize: [260, 64],
      iconAnchor: [0, 0],
    });

    const candidateMarker = L.marker([activeLat, activeLng], {
      icon: primaryCandidateIcon,
      draggable: true,
      zIndexOffset: 1000,
    });

    candidateMarker.on('dragend', () => {
      const pos = candidateMarker.getLatLng();
      onUpdateCoordinates({
        lat: Number(pos.lat.toFixed(5)),
        lng: Number(pos.lng.toFixed(5)),
      });
    });

    candidateMarker.addTo(group);
  }, [
    analysis,
    activeLat,
    activeLng,
    activeScope,
    currentZoom,
    baselinePlaces,
    isResolved,
    onUpdateCoordinates,
  ]);

  const topTitle = isResolved
    ? [analysis.localArea, analysis.city, analysis.state]
        .filter(Boolean)
        .join(', ') || analysis.candidateName
    : 'Choose where you want to investigate';

  return (
    <div className="relative h-full min-h-[540px] w-full overflow-hidden rounded-3xl border border-white/[0.08] bg-[#05040E]/90 shadow-[0_32px_72px_-18px_rgba(2,1,8,0.92)] xl:min-h-[640px]">
      {/* Subtle Spatial Grid Behind Map Tiles */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(16, 185, 129, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(52, 211, 153, 0.04) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          opacity: tilesReady ? 0.25 : 0.65,
        }}
        aria-hidden="true"
      />

      {/* Leaflet Map Surface (Physical Spatial Surface — Never Blurred) */}
      <div
        ref={mapContainerRef}
        data-testid="locus-discovery-map"
        aria-label="LOCUS Candidate Location Spatial Map"
        className="relative z-10 h-full min-h-[540px] w-full cursor-crosshair xl:min-h-[640px]"
      />

      {/* Minimal Top Overlay: Active Place Title on Left, Spatial Scope Zoom on Right */}
      <div className="pointer-events-none absolute inset-x-4 top-3.5 z-20 flex flex-wrap items-center justify-between gap-2">
        <div className="liquid-glass-control inline-flex items-center gap-2.5 rounded-2xl px-3.5 py-1.5">
          <span
            className={`h-2 w-2 rounded-full ${
              isResolved
                ? 'bg-gradient-to-tr from-[#10B981] to-[#FB923C] shadow-[0_0_8px_rgba(16,185,129,0.85)]'
                : 'bg-slate-400'
            }`}
          />
          <span className="text-xs font-medium text-slate-100 sm:text-sm">
            {topTitle}
          </span>
          {isResolved && analysis.marketBaseline && (
            <span className="rounded-md bg-white/[0.08] px-1.5 py-0.5 font-mono text-[10px] text-[#FDBA74]">
              {analysis.marketBaseline.total_mapped} mapped
            </span>
          )}
        </div>

        {/* Spatial Catchment Scope Control (Distance Band Selector) */}
        <div className="liquid-glass-control pointer-events-auto inline-flex items-center gap-1 rounded-2xl p-1">
          {(
            [
              { id: 'ground', label: '0–300m', title: 'Ground Reality' },
              { id: 'local', label: '300m–2km', title: 'Local Market' },
              { id: 'wider', label: '2–5km', title: 'Wider Market' },
            ] as const
          ).map((scope) => {
            const isCurrent = activeScope === scope.id;
            return (
              <button
                key={scope.id}
                type="button"
                onClick={() => setActiveScope(scope.id)}
                title={scope.title}
                className={`rounded-xl px-2.5 py-1 text-xs transition-all ${
                  isCurrent
                    ? 'border border-emerald-500/50 bg-emerald-500/25 font-semibold text-white shadow-[0_0_12px_rgba(16,185,129,0.35)]'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                <span className="font-mono text-[11px]">{scope.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom-Right Map Legend: Visually distinguishes Candidate Pin vs Competitor Spatial Bands */}
      {isResolved && (
        <div
          data-testid="map-spatial-legend"
          className="liquid-glass-control pointer-events-none absolute bottom-3.5 right-3.5 z-20 hidden items-center gap-3 rounded-2xl px-3 py-1.5 text-[11px] text-slate-300 sm:flex"
        >
          <span className="inline-flex items-center gap-1.5 font-medium text-white">
            <span className="h-2.5 w-2.5 rounded-full border border-[#FB923C] bg-gradient-to-tr from-[#7C3AED] to-[#F97316]" />
            <span>Candidate</span>
          </span>
          <span className="h-3 w-px bg-white/10" />
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#FB923C]" />
            <span className="font-mono text-[10px]">0–300m</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#818CF8]" />
            <span className="font-mono text-[10px]">300m–2km</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#E879F9]" />
            <span className="font-mono text-[10px]">2–5km</span>
          </span>
        </div>
      )}

      {/* Hovered Competitor / Entity Inspection Pill */}
      {hoveredEntity && (
        <div
          data-testid="hovered-map-entity"
          className="liquid-glass-control pointer-events-none absolute bottom-12 left-1/2 z-20 -translate-x-1/2 rounded-2xl px-3.5 py-2 text-xs text-slate-200"
        >
          <span className="font-semibold text-white">{hoveredEntity.name}</span>
          {hoveredEntity.distanceLabel && (
            <>
              <span className="mx-1.5 text-slate-500">·</span>
              <span className="font-mono text-[11px] text-[#FB923C]">
                {hoveredEntity.distanceLabel}
              </span>
            </>
          )}
          <span className="mx-1.5 text-slate-500">·</span>
          <span className="font-mono text-[11px] text-[#C084FC]">
            {hoveredEntity.bandLabel}
          </span>
          {hoveredEntity.sourceLabel && (
            <>
              <span className="mx-1.5 text-slate-500">·</span>
              <span className="font-mono text-[10px] text-[#818CF8]">
                {hoveredEntity.sourceLabel}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
};
