import React, { useState } from 'react';
import { ArrowRight, Layers, MapPin, Zap } from 'lucide-react';
import {
  CANDIDATE_LOCATIONS,
  EVIDENCE_META,
  KORAMANGALA_ENTITIES,
  SpatialEntity,
} from '../../../data/locusWorkspaceData';

interface DiscoveryStageProps {
  selectedLocationId: string;
  onNext: () => void;
}

export const DiscoveryStage: React.FC<DiscoveryStageProps> = ({
  selectedLocationId,
  onNext,
}) => {
  const baselineEntities = KORAMANGALA_ENTITIES.filter(
    (e) => e.inBaselineDatabase
  );
  const [selectedEntity, setSelectedEntity] = useState<SpatialEntity>(
    baselineEntities[0]
  );

  const location =
    CANDIDATE_LOCATIONS.find((l) => l.id === selectedLocationId) ||
    CANDIDATE_LOCATIONS[0];

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6">
      {/* Stage Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-end">
        <div>
          <div className="inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-300">
            <span>STAGE 02 // MAP + LOCATION ANALYSIS (BASELINE REGISTRY VIEW)</span>
          </div>
          <h1 className="mt-1.5 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {location.name} — Baseline Spatial Map ({baselineEntities.length} Listed Entities)
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-300">
            Conventional location analysis relies only on structured database registries
            ({baselineEntities.length} listed entities). Inspect the 800m catchment below,
            then trigger Street Scan to uncover ground reality.
          </p>
        </div>

        <button
          type="button"
          onClick={onNext}
          className="inline-flex items-center gap-2.5 rounded-xl border border-emerald-400/50 bg-emerald-500/20 px-5 py-3 font-mono text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200 shadow-[0_0_24px_rgba(16,185,129,0.2)] transition-all hover:border-emerald-400/80 hover:bg-emerald-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
        >
          <Zap className="h-4 w-4 text-emerald-300" />
          <span>Run Street Scan → Map vs Reality</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Main 12-Col Layout: Left 7 Cols = Interactive Catchment Vector Map, Right 5 Cols = Location Analysis + Entity Inspector */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* LEFT: Interactive 800m Catchment Map */}
        <div className="liquid-glass-dark relative overflow-hidden rounded-2xl p-5 lg:col-span-7">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-sky-400" />
              <span className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-white">
                800m Spatial Catchment — {location.coordinatesLabel}
              </span>
            </div>
            <span className="rounded-full border border-sky-400/35 bg-sky-500/12 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-sky-300">
              BASELINE LAYER: {baselineEntities.length} DATABASE ENTITIES
            </span>
          </div>

          {/* Interactive Vector Map Viewport */}
          <div className="relative h-[420px] w-full overflow-hidden rounded-xl border border-white/10 bg-[#060A11]">
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="pointer-events-none absolute inset-0 h-full w-full"
            >
              {/* Subtle Street Grid & Urban Blocks */}
              <g stroke="rgba(148, 163, 184, 0.10)" strokeWidth="0.35">
                <line x1="0" y1="22" x2="100" y2="22" />
                <line x1="0" y1="38" x2="100" y2="38" />
                <line x1="0" y1="52" x2="100" y2="52" />
                <line x1="0" y1="68" x2="100" y2="68" />
                <line x1="0" y1="84" x2="100" y2="84" />
                <line x1="20" y1="0" x2="20" y2="100" />
                <line x1="36" y1="0" x2="36" y2="100" />
                <line x1="50" y1="0" x2="50" y2="100" />
                <line x1="65" y1="0" x2="65" y2="100" />
                <line x1="82" y1="0" x2="82" y2="100" />
              </g>

              {/* Major Arterial Corridors (80 Feet Rd & Jyoti Nivas Corridor) */}
              <path
                d="M 0 48 L 100 44"
                stroke="rgba(56, 189, 248, 0.22)"
                strokeWidth="1.4"
                fill="none"
              />
              <path
                d="M 48 0 L 52 100"
                stroke="rgba(111, 175, 155, 0.22)"
                strokeWidth="1.2"
                fill="none"
              />

              {/* 400m & 800m Catchment Rings */}
              <circle
                cx="50"
                cy="48"
                r="20"
                fill="rgba(56, 189, 248, 0.03)"
                stroke="rgba(56, 189, 248, 0.24)"
                strokeWidth="0.35"
                strokeDasharray="1.5 1.5"
              />
              <circle
                cx="50"
                cy="48"
                r="38"
                fill="none"
                stroke="rgba(148, 163, 184, 0.18)"
                strokeWidth="0.35"
                strokeDasharray="2 2"
              />
            </svg>

            {/* Corridor Labels */}
            <div className="pointer-events-none absolute left-3 top-[43%] font-mono text-[9px] uppercase tracking-[0.16em] text-sky-300/70">
              80 Feet Arterial Spine →
            </div>
            <div className="pointer-events-none absolute left-[51%] top-3 font-mono text-[9px] uppercase tracking-[0.16em] text-[#6FAF9B]/80">
              JNC High-Footfall Axis
            </div>

            {/* Candidate Target Site Center Marker */}
            <div
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: '50%', top: '48%' }}
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full border border-white/60 bg-white/15">
                <div className="h-2 w-2 rounded-full bg-white" />
              </div>
            </div>

            {/* 14 Baseline DATABASE Entity Markers */}
            {baselineEntities.map((entity) => {
              const isSelected = selectedEntity.id === entity.id;
              return (
                <button
                  key={entity.id}
                  type="button"
                  onClick={() => setSelectedEntity(entity)}
                  onMouseEnter={() => setSelectedEntity(entity)}
                  style={{ left: `${entity.mapX}%`, top: `${entity.mapY}%` }}
                  className={`group absolute -translate-x-1/2 -translate-y-1/2 rounded-full p-1 transition-transform focus:outline-none ${
                    isSelected ? 'z-20 scale-125' : 'z-10 hover:scale-110'
                  }`}
                  title={`${String(entity.id).padStart(2, '0')} — ${entity.name}`}
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full border font-mono text-[9px] font-bold shadow-md transition-colors ${
                      isSelected
                        ? 'border-white bg-sky-400 text-slate-950'
                        : 'border-sky-300/60 bg-slate-900/90 text-sky-300 group-hover:bg-sky-400 group-hover:text-slate-950'
                    }`}
                  >
                    {String(entity.id).padStart(2, '0')}
                  </span>
                </button>
              );
            })}

            {/* Bottom Map Overlay Legend */}
            <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-slate-950/85 px-3 py-2 backdrop-blur-md">
              <div className="flex items-center gap-4 font-mono text-[10px]">
                <span className="flex items-center gap-1.5 text-white">
                  <span className="h-2 w-2 rounded-full border border-white bg-white" />
                  Candidate Site
                </span>
                <span className="flex items-center gap-1.5 text-sky-300">
                  <span className="h-2 w-2 rounded-full bg-sky-400" />
                  DATABASE ({baselineEntities.length} Listed)
                </span>
                <span className="flex items-center gap-1.5 text-slate-500">
                  <span className="h-2 w-2 rounded-full bg-emerald-400/40" />
                  Unregistered Street Signals (Hidden until Street Scan)
                </span>
              </div>
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-amber-300">
                ⚠ 5 Unregistered Signals Missing in Baseline DB
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT: Location Analysis & Active Pin Inspector */}
        <div className="flex flex-col justify-between gap-5 lg:col-span-5">
          {/* Selected Entity Card */}
          <div className="liquid-glass-dark rounded-2xl p-5">
            <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
                Selected Baseline Entity #{String(selectedEntity.id).padStart(2, '0')}
              </span>
              <span
                className={`rounded-full border px-2.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] ${EVIDENCE_META.DATABASE.badgeClass}`}
              >
                {EVIDENCE_META.DATABASE.code}
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <div>
                <h3 className="font-display text-xl font-bold text-white">
                  {selectedEntity.name}
                </h3>
                <p className="font-mono text-xs text-slate-400">
                  {selectedEntity.subCategory} • {selectedEntity.distanceM}m from target plot
                </p>
              </div>
              <div className="text-right font-mono text-xs text-sky-300">
                {selectedEntity.confidencePct}% registry match
              </div>
            </div>

            <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 font-mono text-xs text-slate-300">
              <span className="text-slate-400">Registry Source: </span>
              {selectedEntity.sourceLabel}
            </div>
          </div>

          {/* All 14 Baseline Entities Compact Directory */}
          <div className="liquid-glass-dark flex-1 rounded-2xl p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-sky-400" />
                <span className="font-mono text-xs font-bold uppercase tracking-[0.15em] text-white">
                  Baseline Registry ({baselineEntities.length} Listed Entities)
                </span>
              </div>
              <span className="font-mono text-[10px] text-slate-400">
                Click any row to locate
              </span>
            </div>

            <div className="grid max-h-[215px] grid-cols-2 gap-1.5 overflow-y-auto pr-1">
              {baselineEntities.map((ent) => {
                const active = ent.id === selectedEntity.id;
                return (
                  <button
                    key={ent.id}
                    type="button"
                    onClick={() => setSelectedEntity(ent)}
                    className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left font-mono text-[10px] transition-colors ${
                      active
                        ? 'border-sky-400/60 bg-sky-500/15 text-white'
                        : 'border-white/5 bg-white/[0.02] text-slate-300 hover:border-white/20'
                    }`}
                  >
                    <span className="text-sky-400">
                      {String(ent.id).padStart(2, '0')}
                    </span>
                    <span className="truncate">{ent.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Why Street Scan is needed callout */}
            <div className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3.5">
              <div className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-300">
                Next Step: Street Scan &amp; Ground Truth Fusion
              </div>
              <p className="mt-1 font-mono text-[11px] leading-relaxed text-slate-200">
                Database records miss unpermitted street kiosks, dark kitchens, and
                new fit-outs. Run Street Scan to reconcile{' '}
                <strong className="text-white">14 listed</strong> vs{' '}
                <strong className="text-emerald-300">19 observed</strong> entities.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
