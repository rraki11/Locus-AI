import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Layers,
  MapPin,
  Zap,
} from 'lucide-react';
import {
  BusinessProfileState,
  CANDIDATE_LOCATIONS,
  EVIDENCE_META,
  EvidenceCategory,
  EXPANSION_SCENARIOS,
  ExpansionScenario,
  KORAMANGALA_ENTITIES,
} from '../../../data/locusWorkspaceData';

interface ReportStageProps {
  profile: BusinessProfileState;
  selectedLocationId: string;
  selectedScenarioId: ExpansionScenario['id'];
  onReset: () => void;
  onReviewGroundTruth: () => void;
}

export const ReportStage: React.FC<ReportStageProps> = ({
  profile,
  selectedLocationId,
  selectedScenarioId,
  onReset,
  onReviewGroundTruth,
}) => {
  const [exportedNotice, setExportedNotice] = useState<boolean>(false);

  const location =
    CANDIDATE_LOCATIONS.find((l) => l.id === selectedLocationId) ||
    CANDIDATE_LOCATIONS[0];
  const scenario =
    EXPANSION_SCENARIOS.find((s) => s.id === selectedScenarioId) ||
    EXPANSION_SCENARIOS[1];

  const baselineCount = KORAMANGALA_ENTITIES.filter(
    (e) => e.inBaselineDatabase
  ).length;
  const groundCount = KORAMANGALA_ENTITIES.length;
  const additionalCount = groundCount - baselineCount;

  const provenanceRows: {
    source: string;
    evidenceType: EvidenceCategory;
    entitiesCovered: string;
    confidence: string;
    keyFinding: string;
  }[] = [
    {
      source: 'Google Maps + FSSAI + Aggregators',
      evidenceType: 'DATABASE',
      entitiesCovered: `${baselineCount} listed entities`,
      confidence: '98% Registry Match',
      keyFinding: 'Establishes baseline chain QSR & specialty café footprint',
    },
    {
      source: 'LOCUS Street Scan (Computer Vision)',
      evidenceType: 'OBSERVED',
      entitiesCovered: `${baselineCount} verified + 2 unlisted kiosks`,
      confidence: '95% Visual Confidence',
      keyFinding: 'Detects 2 high-volume sidewalk kiosks missed by all databases',
    },
    {
      source: 'Courier Dwell + Exhaust Telemetry',
      evidenceType: 'INFERRED',
      entitiesCovered: '2 dark-kitchen hubs (14 virtual brands)',
      confidence: '88% Signal Fusion',
      keyFinding: 'Reveals hidden delivery saturation that penalizes pure cloud kitchens',
    },
    {
      source: 'Municipal Permit + Hoarding Scan',
      evidenceType: 'PREDICTED_ANALYTICAL',
      entitiesCovered: '1 incoming QSR fit-out (130m away)',
      confidence: '82% Analytical Forecast',
      keyFinding: 'Forecasts new 750 sqft competitor opening within 45 days',
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6">
      {/* Stage Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-end">
        <div>
          <div className="inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-300">
            <span>STAGE 06 // EXPLAINABLE MARKET-ENTRY REPORT</span>
          </div>
          <h1 className="mt-1.5 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Executive Decision Dossier — {location.name}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-300">
            Auditable expansion recommendation backed by reconciled{' '}
            <span className="font-mono text-sky-300">DATABASE ({baselineCount})</span> and{' '}
            <span className="font-mono text-emerald-300">
              GROUND REALITY ({groundCount}, +{additionalCount})
            </span>{' '}
            evidence.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onReviewGroundTruth}
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-slate-200 transition-all hover:border-white/30 hover:bg-white/10 focus:outline-none"
          >
            ← Review Map vs Reality
          </button>

          <button
            type="button"
            onClick={() => {
              setExportedNotice(true);
              window.setTimeout(() => setExportedNotice(false), 3000);
            }}
            className="rounded-xl border border-emerald-400/45 bg-emerald-500/20 px-5 py-2.5 font-mono text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200 transition-all hover:border-emerald-400/80 hover:bg-emerald-500/30 focus:outline-none"
          >
            {exportedNotice ? '✓ Dossier Snapshot Ready' : 'Export Decision Brief'}
          </button>

          <button
            type="button"
            onClick={onReset}
            className="rounded-xl border border-sky-400/45 bg-sky-500/20 px-5 py-2.5 font-mono text-xs font-semibold uppercase tracking-[0.16em] text-sky-200 transition-all hover:border-sky-400/80 hover:bg-sky-500/30 focus:outline-none"
          >
            Evaluate Another Market →
          </button>
        </div>
      </div>

      {/* Top Executive Verdict Row */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left 7 Cols: Executive Verdict & Why Ground Truth Changed the Decision */}
        <div className="liquid-glass-dark flex flex-col justify-between rounded-2xl border border-emerald-400/30 p-6 lg:col-span-7">
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">
                <Zap className="h-3 w-3" />
                FINAL VERDICT: PROCEED WITH {scenario.code} ({scenario.name})
              </span>
              <span className="font-mono text-xs font-bold text-sky-300">
                Composite Confidence: 88%
              </span>
            </div>

            <h2 className="font-display text-xl font-bold text-white sm:text-2xl">
              Ground truth prevented a dark-kitchen trap and validated a high-visibility
              hybrid QSR entry.
            </h2>

            <p className="mt-3 text-sm leading-relaxed text-slate-200">
              A naive database screen showed only{' '}
              <strong className="text-sky-300">{baselineCount} listed competitors</strong> and
              zero dark kitchens, which would have falsely favored a pure delivery cloud
              kitchen. LOCUS Street Scan uncovered{' '}
              <strong className="text-emerald-300">
                {groundCount} total entities (+{additionalCount} unregistered signals)
              </strong>
              , including 2 hidden dark-kitchen hubs operating 14 virtual delivery brands.
              Pivoting to <strong className="text-white">{scenario.name}</strong> ({scenario.capexLabel},{' '}
              {scenario.sqft} sq.ft) captures verified street footfall (4,200/hr peak) at
              ₹{location.medianRentSqft}/sqft with an estimated{' '}
              <strong className="text-emerald-300">
                {scenario.baseBreakEvenMonths}-month break-even
              </strong>
              .
            </p>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/10 pt-4 sm:grid-cols-4">
            <div>
              <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-slate-400">
                Target Profile
              </div>
              <div className="mt-0.5 font-mono text-xs font-semibold text-white">
                {profile.category}
              </div>
            </div>
            <div>
              <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-slate-400">
                Micro-Market
              </div>
              <div className="mt-0.5 font-mono text-xs font-semibold text-white">
                {location.name}
              </div>
            </div>
            <div>
              <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-slate-400">
                Selected CapEx
              </div>
              <div className="mt-0.5 font-mono text-xs font-semibold text-emerald-300">
                {scenario.capexLabel} ({scenario.sqft} sqft)
              </div>
            </div>
            <div>
              <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-slate-400">
                Target Revenue
              </div>
              <div className="mt-0.5 font-mono text-xs font-semibold text-sky-300">
                ₹{scenario.baseMonthlyRevLakhs}L / month
              </div>
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Risk & Opportunity Signal Ledger */}
        <div className="liquid-glass-dark flex flex-col justify-between rounded-2xl p-6 lg:col-span-5">
          <div>
            <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-amber-400" />
                <span className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-white">
                  Key Risk &amp; Opportunity Signals
                </span>
              </div>
              <span className="font-mono text-[10px] text-slate-400">
                800m Catchment
              </span>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-300" />
                <div className="font-mono text-[11px] text-slate-200">
                  <strong className="text-amber-300">INFERRED RISK:</strong> 2 unlisted
                  dark-kitchen hubs (Entities #17, #18) inflate aggregator ad-spend CPCs by
                  ~28%.
                </div>
              </div>

              <div className="flex items-start gap-2.5 rounded-xl border border-purple-400/30 bg-purple-500/10 p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-purple-300" />
                <div className="font-mono text-[11px] text-slate-200">
                  <strong className="text-purple-300">PREDICTED_ANALYTICAL:</strong> New
                  750 sqft QSR fit-out under construction at 130m (Entity #19).
                </div>
              </div>

              <div className="flex items-start gap-2.5 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-300" />
                <div className="font-mono text-[11px] text-slate-200">
                  <strong className="text-emerald-300">OBSERVED ADVANTAGE:</strong>{' '}
                  Verified 4,200/hr peak pedestrian flow &amp; 18% lower rent than
                  Indiranagar.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full Evidence Provenance Audit Table */}
      <div className="liquid-glass-dark overflow-hidden rounded-2xl">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-sky-400" />
            <span className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-white">
              Explainable Evidence Provenance Ledger
            </span>
          </div>
          <span className="font-mono text-[10px] text-slate-400">
            Distinguishing OBSERVED • DATABASE • INFERRED • PREDICTED_ANALYTICAL
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] font-mono text-[10px] uppercase tracking-[0.15em] text-slate-400">
                <th className="px-6 py-3">Signal Layer / Source</th>
                <th className="px-6 py-3">Evidence Category</th>
                <th className="px-6 py-3">Entities Reconciled</th>
                <th className="px-6 py-3">Confidence</th>
                <th className="px-6 py-3">Decision Impact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono text-xs">
              {provenanceRows.map((row) => {
                const meta = EVIDENCE_META[row.evidenceType];
                return (
                  <tr key={row.source} className="hover:bg-white/[0.02]">
                    <td className="px-6 py-3.5 font-semibold text-white">
                      {row.source}
                    </td>
                    <td className="px-6 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] ${meta.badgeClass}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`} />
                        {meta.code}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-slate-200">
                      {row.entitiesCovered}
                    </td>
                    <td className="px-6 py-3.5 text-emerald-300">
                      {row.confidence}
                    </td>
                    <td className="px-6 py-3.5 text-slate-300">{row.keyFinding}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
