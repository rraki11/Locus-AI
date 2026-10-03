import React from 'react';
import { ArrowRight, TrendingUp } from 'lucide-react';
import {
  EVIDENCE_META,
  INTELLIGENCE_DIMENSIONS,
  IntelligenceDimension,
} from '../../../data/locusWorkspaceData';

interface IntelligenceStageProps {
  onNext: () => void;
}

const STATUS_BADGE: Record<IntelligenceDimension['statusTone'], string> = {
  emerald: 'border-emerald-400/35 bg-emerald-500/12 text-emerald-300',
  amber: 'border-amber-400/35 bg-amber-500/12 text-amber-300',
  sky: 'border-sky-400/35 bg-sky-500/12 text-sky-300',
  purple: 'border-purple-400/35 bg-purple-500/12 text-purple-300',
};

export const IntelligenceStage: React.FC<IntelligenceStageProps> = ({
  onNext,
}) => {
  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6">
      {/* Stage Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-end">
        <div>
          <div className="inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-300">
            <span>STAGE 04 // LOCATION INTELLIGENCE SYNTHESIS</span>
          </div>
          <h1 className="mt-1.5 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Reconciled Spatial Intelligence — Baseline vs Ground Reality
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-300">
            Fusing the 14 listed entities with +5 street-scanned signals recalibrates
            competitive saturation, aggregator CAC pressure, and site viability before
            capital commitment.
          </p>
        </div>

        <button
          type="button"
          onClick={onNext}
          className="inline-flex items-center gap-2.5 rounded-xl border border-sky-400/50 bg-sky-500/20 px-5 py-3 font-mono text-xs font-semibold uppercase tracking-[0.16em] text-sky-200 transition-all hover:border-sky-400/80 hover:bg-sky-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
        >
          <span>Run Scenario Simulation</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* 6-Card Spatial Intelligence Matrix */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {INTELLIGENCE_DIMENSIONS.map((dim) => {
          const evMeta = EVIDENCE_META[dim.evidenceType];
          return (
            <div
              key={dim.id}
              className="liquid-glass-dark flex flex-col justify-between rounded-2xl p-5"
            >
              <div>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] ${evMeta.badgeClass}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${evMeta.dotClass}`} />
                    {evMeta.code}
                  </span>

                  <span
                    className={`rounded-full border px-2.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] ${
                      STATUS_BADGE[dim.statusTone]
                    }`}
                  >
                    {dim.statusLabel}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-slate-200">
                    {dim.label}
                  </h3>
                  <TrendingUp className="h-4 w-4 flex-shrink-0 text-slate-400" />
                </div>

                {/* Before vs After Fusion Comparison Box */}
                <div className="mt-3 grid grid-cols-2 gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <div>
                    <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-slate-400">
                      Naive Baseline
                    </div>
                    <div className="mt-1 font-mono text-xs text-slate-300">
                      {dim.baselineValue}
                    </div>
                  </div>
                  <div className="border-l border-white/10 pl-2.5">
                    <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-emerald-300">
                      Ground-Fused
                    </div>
                    <div className="mt-1 font-mono text-xs font-bold text-white">
                      {dim.groundTruthValue}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 border-t border-white/10 pt-3">
                <div className="flex items-center justify-between font-mono text-[10px]">
                  <span className="text-amber-300">{dim.deltaLabel}</span>
                  <span className="font-bold text-white">
                    Score: {dim.scoreOutOf10} / 10
                  </span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
                  {dim.interpretation}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Evidence Provenance Summary Bar */}
      <div className="liquid-glass-dark rounded-2xl p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-white">
            Multi-Layer Evidence Provenance Model
          </span>
          <span className="font-mono text-[10px] text-slate-400">
            Every intelligence metric is tagged by its underlying verification tier
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Object.values(EVIDENCE_META).map((ev) => (
            <div
              key={ev.code}
              className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5"
            >
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${ev.dotClass}`} />
                <span className={`font-mono text-[10px] font-bold uppercase tracking-[0.14em] ${ev.textClass}`}>
                  {ev.code}
                </span>
              </div>
              <p className="mt-1.5 font-mono text-[10px] leading-relaxed text-slate-300">
                {ev.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
