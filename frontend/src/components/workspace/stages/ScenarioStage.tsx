import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, Zap } from 'lucide-react';
import {
  EVIDENCE_META,
  EXPANSION_SCENARIOS,
  ExpansionScenario,
} from '../../../data/locusWorkspaceData';

interface ScenarioStageProps {
  selectedScenarioId: ExpansionScenario['id'];
  onSelectScenario: (id: ExpansionScenario['id']) => void;
  onNext: () => void;
}

const RISK_BADGE: Record<ExpansionScenario['riskTone'], string> = {
  emerald: 'border-emerald-400/35 bg-emerald-500/12 text-emerald-300',
  amber: 'border-amber-400/35 bg-amber-500/12 text-amber-300',
  purple: 'border-purple-400/35 bg-purple-500/12 text-purple-300',
};

export const ScenarioStage: React.FC<ScenarioStageProps> = ({
  selectedScenarioId,
  onSelectScenario,
  onNext,
}) => {
  const [footfallDeltaPct, setFootfallDeltaPct] = useState<number>(0);
  const [includeGroundTruthCompetition, setIncludeGroundTruthCompetition] =
    useState<boolean>(true);
  const [rentEscalationPct, setRentEscalationPct] = useState<number>(10);

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6">
      {/* Stage Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-end">
        <div>
          <div className="inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-300">
            <span>STAGE 05 // SCENARIO SIMULATION &amp; STRESS TESTING</span>
          </div>
          <h1 className="mt-1.5 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Expansion Scenario Simulator — Koramangala 5th Block
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-300">
            Simulate CapEx formats against ground-verified competition (19 active
            entities) and stress-test footfall, unlisted dark kitchens, and lease
            escalation.
          </p>
        </div>

        <button
          type="button"
          onClick={onNext}
          className="inline-flex items-center gap-2.5 rounded-xl border border-emerald-400/50 bg-emerald-500/20 px-5 py-3 font-mono text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200 transition-all hover:border-emerald-400/80 hover:bg-emerald-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
        >
          <span>Generate Explainable Report</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Interactive Stress-Test Controls Bar */}
      <div className="liquid-glass-dark grid gap-5 rounded-2xl p-5 lg:grid-cols-3">
        {/* Control 1: Ground Truth Competition Toggle */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-slate-300">
              1. Competitive Density Model
            </span>
            <span className="font-mono text-[10px] text-emerald-300">
              {includeGroundTruthCompetition ? '19 Entities (+5 Fused)' : '14 Entities (Naive DB)'}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setIncludeGroundTruthCompetition(false)}
              className={`rounded-lg border px-3 py-2 font-mono text-[10px] font-semibold uppercase transition-colors ${
                !includeGroundTruthCompetition
                  ? 'border-sky-400 bg-sky-500/20 text-white'
                  : 'border-white/10 bg-white/5 text-slate-400 hover:text-slate-200'
              }`}
            >
              Baseline DB (14)
            </button>
            <button
              type="button"
              onClick={() => setIncludeGroundTruthCompetition(true)}
              className={`rounded-lg border px-3 py-2 font-mono text-[10px] font-semibold uppercase transition-colors ${
                includeGroundTruthCompetition
                  ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200'
                  : 'border-white/10 bg-white/5 text-slate-400 hover:text-slate-200'
              }`}
            >
              Ground Truth (19)
            </button>
          </div>
        </div>

        {/* Control 2: Footfall Stress Variance */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-slate-300">
              2. Footfall Sensitivity Shock
            </span>
            <span className="font-mono text-[10px] text-sky-300">
              {footfallDeltaPct > 0 ? `+${footfallDeltaPct}%` : `${footfallDeltaPct}%`}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[-15, 0, 15].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setFootfallDeltaPct(val)}
                className={`rounded-lg border px-2.5 py-2 font-mono text-[10px] font-semibold transition-colors ${
                  footfallDeltaPct === val
                    ? 'border-sky-400 bg-sky-500/20 text-white'
                    : 'border-white/10 bg-white/5 text-slate-400 hover:text-slate-200'
                }`}
              >
                {val === 0 ? 'Base (0%)' : val > 0 ? `+${val}% Surge` : `${val}% Dip`}
              </button>
            ))}
          </div>
        </div>

        {/* Control 3: Lease Escalation Stress */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-slate-300">
              3. Annual Rent Escalation
            </span>
            <span className="font-mono text-[10px] text-amber-300">
              +{rentEscalationPct}% / yr
            </span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[5, 10, 15].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setRentEscalationPct(val)}
                className={`rounded-lg border px-2.5 py-2 font-mono text-[10px] font-semibold transition-colors ${
                  rentEscalationPct === val
                    ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                    : 'border-white/10 bg-white/5 text-slate-400 hover:text-slate-200'
                }`}
              >
                +{val}% / yr
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3 Expansion Scenarios Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {EXPANSION_SCENARIOS.map((sc) => {
          const isSelected = sc.id === selectedScenarioId;
          const evMeta = EVIDENCE_META[sc.evidenceBasis];

          // Compute dynamic scenario outputs from stress controls
          const competitionPenalty =
            includeGroundTruthCompetition && sc.id === 'conservative'
              ? 0.86
              : includeGroundTruthCompetition
              ? 0.95
              : 1.0;
          const footfallFactor = 1 + (footfallDeltaPct / 100) * 0.75;
          const rentPenaltyMonths =
            rentEscalationPct === 15 ? 2 : rentEscalationPct === 5 ? -1 : 0;

          const adjustedRev = +(
            sc.baseMonthlyRevLakhs *
            competitionPenalty *
            footfallFactor
          ).toFixed(1);

          const adjustedBreakEven = Math.max(
            10,
            Math.round(
              sc.baseBreakEvenMonths / (competitionPenalty * footfallFactor) +
                rentPenaltyMonths
            )
          );

          return (
            <div
              key={sc.id}
              onClick={() => onSelectScenario(sc.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectScenario(sc.id);
                }
              }}
              className={`liquid-glass-dark relative flex cursor-pointer flex-col justify-between rounded-2xl p-6 transition-all ${
                isSelected
                  ? 'border-2 border-emerald-400/75 bg-emerald-500/[0.08] shadow-[0_0_32px_rgba(16,185,129,0.16)]'
                  : 'border border-white/10 hover:border-white/25'
              }`}
            >
              <div>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    {sc.code}
                  </span>
                  <div className="flex items-center gap-2">
                    {sc.recommended && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/45 bg-emerald-500/20 px-2.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-emerald-200">
                        <Zap className="h-2.5 w-2.5" />
                        RECOMMENDED
                      </span>
                    )}
                    <span
                      className={`rounded-full border px-2.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] ${
                        RISK_BADGE[sc.riskTone]
                      }`}
                    >
                      {sc.riskLevel}
                    </span>
                  </div>
                </div>

                <h3 className="font-display text-xl font-bold text-white">
                  {sc.name}
                </h3>
                <p className="mt-0.5 font-mono text-xs text-slate-400">
                  {sc.format}
                </p>

                {/* Key Financial Projections */}
                <div className="mt-5 grid grid-cols-3 gap-2.5 rounded-xl border border-white/10 bg-slate-950/60 p-3.5">
                  <div>
                    <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-slate-400">
                      CapEx
                    </div>
                    <div className="mt-1 font-display text-lg font-bold text-white">
                      {sc.capexLabel}
                    </div>
                  </div>
                  <div className="border-l border-white/10 pl-2.5">
                    <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-slate-400">
                      Est. Revenue
                    </div>
                    <div className="mt-1 font-display text-lg font-bold text-emerald-300">
                      ₹{adjustedRev}L<span className="text-[10px] text-slate-400">/mo</span>
                    </div>
                  </div>
                  <div className="border-l border-white/10 pl-2.5">
                    <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-slate-400">
                      Break-Even
                    </div>
                    <div className="mt-1 font-display text-lg font-bold text-sky-300">
                      {adjustedBreakEven} mos
                    </div>
                  </div>
                </div>

                {/* Ground Truth Impact Callout */}
                <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-slate-400">
                      Ground-Truth Sensitivity
                    </span>
                    <span
                      className={`rounded border px-1.5 py-0.5 font-mono text-[8px] font-semibold uppercase ${evMeta.badgeClass}`}
                    >
                      {evMeta.code}
                    </span>
                  </div>
                  <p className="font-mono text-[11px] leading-relaxed text-slate-200">
                    {sc.groundTruthVerdict}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-3 font-mono text-[10px]">
                <span className="text-slate-400">
                  Floorplate: {sc.sqft} sq.ft
                </span>
                <span
                  className={`inline-flex items-center gap-1 font-semibold ${
                    isSelected ? 'text-emerald-300' : 'text-slate-400'
                  }`}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {isSelected ? 'Selected for Report' : 'Select Scenario'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
