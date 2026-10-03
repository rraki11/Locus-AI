import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, Layers, MapPin, Zap } from 'lucide-react';
import {
  EVIDENCE_META,
  EvidenceCategory,
  KORAMANGALA_ENTITIES,
  SpatialEntity,
} from '../../../data/locusWorkspaceData';

interface GroundTruthStageProps {
  onNext: () => void;
}

type FilterMode = 'ALL' | 'NEW_ONLY' | EvidenceCategory;

export const GroundTruthStage: React.FC<GroundTruthStageProps> = ({ onNext }) => {
  const baselineEntities = KORAMANGALA_ENTITIES.filter(
    (e) => e.inBaselineDatabase
  );
  const groundEntities = KORAMANGALA_ENTITIES;
  const additionalSignals = KORAMANGALA_ENTITIES.filter(
    (e) => !e.inBaselineDatabase
  );

  const [filterMode, setFilterMode] = useState<FilterMode>('ALL');
  const [activeEntity, setActiveEntity] = useState<SpatialEntity>(
    additionalSignals[0] || groundEntities[0]
  );

  const filteredGroundEntities = groundEntities.filter((entity) => {
    if (filterMode === 'ALL') return true;
    if (filterMode === 'NEW_ONLY') return !entity.inBaselineDatabase;
    if (filterMode === 'DATABASE') return entity.inBaselineDatabase;
    return entity.groundEvidence === filterMode;
  });

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6">
      {/* Stage Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-end">
        <div>
          <div className="inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-300">
            <Zap className="h-3.5 w-3.5 text-emerald-400" />
            <span>STAGE 03 // FLAGSHIP: MAP VS REALITY (STREET SCAN + GROUND TRUTH FUSION)</span>
          </div>
          <h1 className="mt-1.5 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Map vs Reality — Reconciling Listed Databases with Ground Truth
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-300">
            Street Scan fuses computer-vision storefront detection, courier dwell
            telemetry, and municipal permit signals to expose hidden competition inside
            the 800m Koramangala 5th Block catchment.
          </p>
        </div>

        <button
          type="button"
          onClick={onNext}
          className="inline-flex items-center gap-2.5 rounded-xl border border-sky-400/50 bg-sky-500/20 px-5 py-3 font-mono text-xs font-semibold uppercase tracking-[0.16em] text-sky-200 transition-all hover:border-sky-400/80 hover:bg-sky-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
        >
          <span>Synthesize Location Intelligence</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* FLAGSHIP HERO RECONCILIATION BAR: BASELINE DATA (14) -> STREET SCAN -> GROUND REALITY (19) -> +5 SIGNALS */}
      <div className="liquid-glass-dark rounded-2xl border border-emerald-400/25 p-5">
        <div className="grid items-center gap-4 lg:grid-cols-11">
          {/* 1. BASELINE DATA */}
          <div className="rounded-xl border border-sky-400/30 bg-sky-500/[0.08] p-4 lg:col-span-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-sky-300">
                BASELINE DATA
              </span>
              <span
                className={`rounded-full border px-2 py-0.5 font-mono text-[9px] font-semibold ${EVIDENCE_META.DATABASE.badgeClass}`}
              >
                DATABASE
              </span>
            </div>
            <div className="mt-2 font-display text-3xl font-bold text-white">
              {baselineEntities.length} listed entities
            </div>
            <div className="mt-1 font-mono text-[11px] text-slate-300">
              Structured maps, FSSAI &amp; aggregator listings
            </div>
          </div>

          {/* Arrow: STREET SCAN */}
          <div className="flex flex-col items-center justify-center py-1 lg:col-span-2">
            <div className="rounded-full border border-emerald-400/40 bg-emerald-500/15 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">
              ↓ STREET SCAN ↓
            </div>
            <span className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-slate-400">
              Ground Truth Fusion
            </span>
          </div>

          {/* 2. GROUND REALITY */}
          <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/[0.11] p-4 lg:col-span-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300">
                GROUND REALITY
              </span>
              <span
                className={`rounded-full border px-2 py-0.5 font-mono text-[9px] font-semibold ${EVIDENCE_META.OBSERVED.badgeClass}`}
              >
                OBSERVED + FUSED
              </span>
            </div>
            <div className="mt-2 font-display text-3xl font-bold text-white">
              {groundEntities.length} observed entities
            </div>
            <div className="mt-1 font-mono text-[11px] text-emerald-200">
              14 registry matches verified + {additionalSignals.length} unlisted
            </div>
          </div>

          {/* 3. +5 ADDITIONAL OBSERVED SIGNALS */}
          <div className="rounded-xl border border-amber-400/40 bg-amber-500/[0.10] p-4 lg:col-span-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300">
                 REALITY DELTA
              </span>
              <span className="rounded-full border border-emerald-400/40 bg-emerald-500/20 px-2 py-0.5 font-mono text-[9px] font-bold text-emerald-200">
                +35.7% DENSITY
              </span>
            </div>
            <div className="mt-2 font-display text-2xl font-bold text-emerald-300 sm:text-3xl">
              +{additionalSignals.length} additional observed signals
            </div>
            <div className="mt-1 font-mono text-[11px] text-slate-200">
              2 street kiosks • 2 ghost kitchens • 1 QSR fit-out
            </div>
          </div>
        </div>

        {/* 4-Tier Evidence Model Filter & Legend Bar */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400">
              Evidence Filter:
            </span>
            <button
              type="button"
              onClick={() => setFilterMode('ALL')}
              className={`rounded-full border px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.13em] transition-colors ${
                filterMode === 'ALL'
                  ? 'border-white/50 bg-white/15 text-white'
                  : 'border-white/10 bg-white/5 text-slate-400 hover:text-slate-200'
              }`}
            >
              ALL ({groundEntities.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('NEW_ONLY')}
              className={`rounded-full border px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.13em] transition-colors ${
                filterMode === 'NEW_ONLY'
                  ? 'border-emerald-400 bg-emerald-500/25 text-emerald-200'
                  : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
              }`}
            >
              +{additionalSignals.length} ADDITIONAL SIGNALS
            </button>

            {(Object.keys(EVIDENCE_META) as EvidenceCategory[]).map((cat) => {
              const meta = EVIDENCE_META[cat];
              const active = filterMode === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFilterMode(cat)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] transition-all ${
                    active
                      ? `${meta.badgeClass} ring-1 ring-white/40`
                      : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/25'
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${meta.dotClass}`} />
                  <span>{meta.code}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main 12-Col Comparison: Left 4 Cols = Baseline Data (14), Center 4 Cols = Ground Reality (19), Right 4 Cols = Spatial Map & Signal Inspector */}
      <div className="grid gap-5 lg:grid-cols-12">
        {/* COLUMN 1: BASELINE DATA (14 LISTED ENTITIES) */}
        <div className="liquid-glass-dark flex flex-col rounded-2xl p-5 lg:col-span-4">
          <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <div className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-sky-300">
                BASELINE DATA
              </div>
              <div className="mt-0.5 font-display text-xl font-bold text-white">
                {baselineEntities.length} listed entities
              </div>
            </div>
            <span
              className={`rounded-full border px-2.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] ${EVIDENCE_META.DATABASE.badgeClass}`}
            >
              DATABASE
            </span>
          </div>

          <div className="max-h-[380px] flex-1 space-y-1.5 overflow-y-auto pr-1">
            {baselineEntities.map((entity) => {
              const isSelected = activeEntity.id === entity.id;
              return (
                <button
                  key={entity.id}
                  type="button"
                  onClick={() => setActiveEntity(entity)}
                  className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left font-mono text-[11px] transition-colors ${
                    isSelected
                      ? 'border-sky-400/60 bg-sky-500/15 text-white'
                      : 'border-white/5 bg-white/[0.02] text-slate-300 hover:border-white/15'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span className="w-5 text-[10px] text-slate-500">
                      {String(entity.id).padStart(2, '0')}
                    </span>
                    <span className="h-2 w-2 flex-shrink-0 rounded-full bg-sky-400" />
                    <span className="truncate">{entity.name}</span>
                  </div>
                  <span className="ml-2 flex-shrink-0 rounded border border-sky-400/30 bg-sky-500/10 px-1.5 py-0.5 text-[8px] text-sky-300">
                    DATABASE
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* COLUMN 2: GROUND REALITY (19 OBSERVED ENTITIES, +5 ADDITIONAL SIGNALS) */}
        <div className="liquid-glass-dark flex flex-col rounded-2xl border border-emerald-400/25 p-5 lg:col-span-4">
          <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <div className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">
                GROUND REALITY (STREET SCAN)
              </div>
              <div className="mt-0.5 flex items-baseline gap-2">
                <span className="font-display text-xl font-bold text-white">
                  {groundEntities.length} observed entities
                </span>
                <span className="rounded-full border border-emerald-400/40 bg-emerald-500/20 px-2 py-0.5 font-mono text-[9px] font-bold text-emerald-300">
                  +{additionalSignals.length} NEW
                </span>
              </div>
            </div>
            <Layers className="h-4 w-4 text-emerald-400" />
          </div>

          <div className="max-h-[380px] flex-1 space-y-1.5 overflow-y-auto pr-1">
            {filteredGroundEntities.map((entity) => {
              const meta = EVIDENCE_META[entity.groundEvidence];
              const isNewSignal = !entity.inBaselineDatabase;
              const isSelected = activeEntity.id === entity.id;
              return (
                <button
                  key={entity.id}
                  type="button"
                  onClick={() => setActiveEntity(entity)}
                  className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left font-mono text-[11px] transition-colors ${
                    isSelected
                      ? 'border-emerald-400/70 bg-emerald-500/20 text-white'
                      : isNewSignal
                      ? 'border-emerald-400/25 bg-emerald-500/[0.07] text-slate-100 hover:border-emerald-400/45'
                      : 'border-white/5 bg-white/[0.02] text-slate-300 hover:border-white/15'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span className="w-5 text-[10px] text-slate-400">
                      {String(entity.id).padStart(2, '0')}
                    </span>
                    <span
                      className={`h-2 w-2 flex-shrink-0 rounded-full ${meta.dotClass}`}
                    />
                    <span className="truncate font-medium">{entity.name}</span>
                  </div>
                  <span
                    className={`ml-2 flex-shrink-0 rounded border px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.08em] ${meta.badgeClass}`}
                  >
                    {meta.code}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* COLUMN 3: SPATIAL FUSION MAP + SIGNAL EVIDENCE INSPECTOR */}
        <div className="flex flex-col justify-between gap-4 lg:col-span-4">
          {/* Interactive Map vs Reality Spatial View */}
          <div className="liquid-glass-dark rounded-2xl p-4">
            <div className="mb-2.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-white">
                <MapPin className="h-3.5 w-3.5 text-emerald-400" />
                <span>Spatial Fusion Map (14 DB vs +5 Ground Signals)</span>
              </div>
              <span className="font-mono text-[9px] text-emerald-300">
                800m Catchment
              </span>
            </div>

            <div className="relative h-[220px] w-full overflow-hidden rounded-xl border border-white/10 bg-[#060A11]">
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="pointer-events-none absolute inset-0 h-full w-full"
              >
                <g stroke="rgba(148, 163, 184, 0.09)" strokeWidth="0.4">
                  <line x1="0" y1="25" x2="100" y2="25" />
                  <line x1="0" y1="50" x2="100" y2="50" />
                  <line x1="0" y1="75" x2="100" y2="75" />
                  <line x1="25" y1="0" x2="25" y2="100" />
                  <line x1="50" y1="0" x2="50" y2="100" />
                  <line x1="75" y1="0" x2="75" y2="100" />
                </g>
                <path
                  d="M 0 48 L 100 44"
                  stroke="rgba(56, 189, 248, 0.2)"
                  strokeWidth="1.2"
                  fill="none"
                />
                <path
                  d="M 48 0 L 52 100"
                  stroke="rgba(16, 185, 129, 0.22)"
                  strokeWidth="1.2"
                  fill="none"
                />
                <circle
                  cx="50"
                  cy="48"
                  r="34"
                  fill="none"
                  stroke="rgba(16, 185, 129, 0.22)"
                  strokeWidth="0.4"
                  strokeDasharray="2 2"
                />
              </svg>

              {groundEntities.map((ent) => {
                const isSelected = activeEntity.id === ent.id;
                const isNew = !ent.inBaselineDatabase;
                const meta = EVIDENCE_META[ent.groundEvidence];
                return (
                  <button
                    key={ent.id}
                    type="button"
                    onClick={() => setActiveEntity(ent)}
                    style={{ left: `${ent.mapX}%`, top: `${ent.mapY}%` }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-transform focus:outline-none ${
                      isSelected ? 'z-30 scale-125' : isNew ? 'z-20' : 'z-10 opacity-80'
                    }`}
                    title={`${String(ent.id).padStart(2, '0')} ${ent.name} (${meta.code})`}
                  >
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full border font-mono text-[8px] font-bold ${
                        isSelected
                          ? 'border-white bg-white text-slate-950 shadow-[0_0_14px_rgba(255,255,255,0.9)]'
                          : isNew
                          ? `${meta.badgeClass} border-current shadow-[0_0_10px_rgba(16,185,129,0.4)]`
                          : 'border-sky-400/50 bg-slate-900/90 text-sky-300'
                      }`}
                    >
                      {String(ent.id).padStart(2, '0')}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Entity Ground-Truth Evidence Card */}
          <div className="liquid-glass-dark flex-1 rounded-2xl p-5">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400">
                Signal Provenance #{String(activeEntity.id).padStart(2, '0')}
              </span>
              <span
                className={`rounded-full border px-2.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em] ${
                  EVIDENCE_META[activeEntity.groundEvidence].badgeClass
                }`}
              >
                {EVIDENCE_META[activeEntity.groundEvidence].code}
              </span>
            </div>

            <h3 className="font-display text-lg font-bold text-white">
              {activeEntity.name}
            </h3>
            <p className="mt-0.5 font-mono text-xs text-slate-400">
              {activeEntity.subCategory} • {activeEntity.distanceM}m from target site
            </p>

            <div className="mt-3 space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Baseline Registry:</span>
                <span
                  className={
                    activeEntity.inBaselineDatabase
                      ? 'text-sky-300'
                      : 'font-semibold text-amber-300'
                  }
                >
                  {activeEntity.inBaselineDatabase
                    ? 'Listed in DATABASE'
                    : 'UNLISTED (+5 Street Scan Signal)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Detection Source:</span>
                <span className="text-slate-200">{activeEntity.sourceLabel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Confidence:</span>
                <span className="text-emerald-300">{activeEntity.confidencePct}%</span>
              </div>
            </div>

            <div className="mt-3 flex items-start gap-2 font-mono text-[11px] text-slate-200">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-400" />
              <span>{activeEntity.streetScanNote}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
