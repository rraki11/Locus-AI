import React, { useCallback, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Layers,
  RotateCcw,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { WorkspaceSplineAmbient } from '../discovery/WorkspaceSplineAmbient';
import { MarketDiscoveryMap } from '../discovery/MarketDiscoveryMap';
import {
  WorkspaceStageHero,
  WorkspaceStageNav,
  WorkspaceViewKey,
} from '../common/WorkspaceStageNav';
import {
  CategoricalLevel,
  DEMO_LOCATION_PRESETS,
  parseAndValidateCoordinates,
  resolveLocationAnalysis,
} from '../../data/marketDiscoveryData';
import { EvidenceType } from '../../types/streetScan';
import {
  DecisionPostureLevel,
  IntelligenceFactorKey,
  LocationIntelligenceComparisonResponse,
  LocationIntelligenceHandoffPayload,
  ScenarioAssumptions,
} from '../../types/locationIntelligence';
import {
  BASELINE_SCENARIO_ASSUMPTIONS,
  compareBaselineAndScenarioIntelligence,
} from '../../utils/locationIntelligenceEngine';

export interface LocationIntelligenceViewProps {
  handoff: LocationIntelligenceHandoffPayload;
  preferFallback?: boolean;
  onBackToMarketDiscovery: () => void;
  onBackToGroundReality: () => void;
  onContinueToDecision?: (payload: {
    scenarioAssumptions: ScenarioAssumptions;
    comparison: LocationIntelligenceComparisonResponse;
  }) => void;
  unlockedViews?: Set<WorkspaceViewKey>;
  onNavigateToView?: (targetView: WorkspaceViewKey) => void;
}

const RATING_BADGE_STYLE: Record<CategoricalLevel, string> = {
  STRONG: 'border-[#FB923C]/45 bg-[#F97316]/18 text-[#FDBA74]',
  HIGH: 'border-[#818CF8]/45 bg-[#4F46E5]/20 text-[#C7D2FE]',
  MEDIUM: 'border-[#E879F9]/40 bg-[#A855F7]/18 text-[#F5D0FE]',
  LOW: 'border-white/15 bg-white/[0.05] text-slate-300',
};

const RISK_RATING_BADGE_STYLE: Record<CategoricalLevel, string> = {
  HIGH: 'border-rose-400/50 bg-rose-500/20 text-rose-200',
  STRONG: 'border-amber-400/50 bg-amber-500/20 text-amber-200',
  MEDIUM: 'border-[#E879F9]/40 bg-[#A855F7]/18 text-[#F5D0FE]',
  LOW: 'border-emerald-400/45 bg-emerald-500/18 text-emerald-200',
};

const EVIDENCE_BADGE_STYLE: Record<
  EvidenceType,
  { bg: string; dot: string; label: string }
> = {
  OBSERVED: {
    bg: 'border-emerald-400/45 bg-emerald-500/15 text-emerald-200',
    dot: 'bg-emerald-400',
    label: 'OBSERVED',
  },
  DATABASE: {
    bg: 'border-[#818CF8]/45 bg-[#4F46E5]/20 text-[#C7D2FE]',
    dot: 'bg-[#818CF8]',
    label: 'DATABASE',
  },
  INFERRED: {
    bg: 'border-[#FB923C]/50 bg-[#F97316]/20 text-[#FED7AA]',
    dot: 'bg-[#FB923C]',
    label: 'INFERRED',
  },
  PREDICTED_ANALYTICAL: {
    bg: 'border-[#E879F9]/45 bg-[#A855F7]/20 text-[#F5D0FE]',
    dot: 'bg-[#E879F9]',
    label: 'PREDICTED_ANALYTICAL',
  },
};

const POSTURE_CARD_STYLE: Record<
  DecisionPostureLevel,
  { border: string; badge: string }
> = {
  'FAVORABLE ENTRY POSTURE': {
    border: 'border-emerald-400/40 bg-emerald-500/[0.08]',
    badge: 'border-emerald-400/50 bg-emerald-500/20 text-emerald-200',
  },
  'VIABLE WITH DIFFERENTIATION': {
    border: 'border-[#818CF8]/40 bg-[#4F46E5]/[0.10]',
    badge: 'border-[#818CF8]/50 bg-[#4F46E5]/25 text-[#C7D2FE]',
  },
  'ELEVATED SENSITIVITY — PROCEED WITH CAUTION': {
    border: 'border-amber-400/40 bg-amber-500/[0.08]',
    badge: 'border-amber-400/50 bg-amber-500/20 text-amber-200',
  },
  'HIGH STRUCTURAL PRESSURE': {
    border: 'border-rose-400/45 bg-rose-500/[0.10]',
    badge: 'border-rose-400/50 bg-rose-500/20 text-rose-200',
  },
};

const SCENARIO_PRESETS: {
  id: string;
  label: string;
  assumptions: ScenarioAssumptions;
}[] = [
  {
    id: 'baseline',
    label: 'Baseline (Current)',
    assumptions: { rentDeltaPct: 0, activityDeltaPct: 0, competitionDeltaCount: 0 },
  },
  {
    id: 'rent-spike',
    label: 'Rent +20%',
    assumptions: { rentDeltaPct: 20, activityDeltaPct: 0, competitionDeltaCount: 0 },
  },
  {
    id: 'activity-dip',
    label: 'Activity -20%',
    assumptions: { rentDeltaPct: 0, activityDeltaPct: -20, competitionDeltaCount: 0 },
  },
  {
    id: 'competition-plus-2',
    label: 'Competition +2',
    assumptions: { rentDeltaPct: 0, activityDeltaPct: 0, competitionDeltaCount: 2 },
  },
  {
    id: 'stress-combined',
    label: 'Rent +20% · Activity -20% · Comp +2',
    assumptions: { rentDeltaPct: 20, activityDeltaPct: -20, competitionDeltaCount: 2 },
  },
];

export const LocationIntelligenceView: React.FC<
  LocationIntelligenceViewProps
> = ({
  handoff,
  preferFallback = false,
  onBackToMarketDiscovery,
  onBackToGroundReality,
  onContinueToDecision,
  unlockedViews,
  onNavigateToView,
}) => {
  const [assumptions, setAssumptions] = useState<ScenarioAssumptions>(
    BASELINE_SCENARIO_ASSUMPTIONS
  );
  const [selectedFactorKey, setSelectedFactorKey] =
    useState<IntelligenceFactorKey>('competition');

  const safeCoords = useMemo(() => {
    return parseAndValidateCoordinates(handoff?.coordinates) ?? null;
  }, [handoff?.coordinates]);

  const candidateMeta = useMemo(() => {
    const coords = safeCoords ?? {
      lat: DEMO_LOCATION_PRESETS[0].lat,
      lng: DEMO_LOCATION_PRESETS[0].lng,
    };
    return {
      latitude: coords.lat,
      longitude: coords.lng,
      state: handoff?.state || DEMO_LOCATION_PRESETS[0].state,
      city: handoff?.city || DEMO_LOCATION_PRESETS[0].city,
      local_area: handoff?.localArea || DEMO_LOCATION_PRESETS[0].localArea,
      label: handoff?.candidateName || DEMO_LOCATION_PRESETS[0].candidateName,
    };
  }, [handoff, safeCoords]);

  // Run the unified Location Intelligence Engine for both Baseline (0,0,0) and Scenario assumptions
  const comparison = useMemo(
    () =>
      compareBaselineAndScenarioIntelligence({
        profile: handoff?.profile || {
          businessType: 'Café',
          targetCustomer: 'Youth',
          budget: 'Moderate',
        },
        candidate: candidateMeta,
        marketBaseline: handoff?.marketBaseline,
        streetScanFusion: handoff?.streetScanFusion,
        assumptions,
      }),
    [handoff?.profile, candidateMeta, handoff?.marketBaseline, handoff?.streetScanFusion, assumptions]
  );

  const handleStageNav = useCallback(
    (target: WorkspaceViewKey) => {
      if (target === 'view1') {
        onBackToMarketDiscovery();
      } else if (target === 'view2') {
        onBackToGroundReality();
      } else if (target === 'view4') {
        onContinueToDecision?.({
          scenarioAssumptions: assumptions,
          comparison,
        });
      } else if (onNavigateToView) {
        onNavigateToView(target);
      }
    },
    [
      onBackToMarketDiscovery,
      onBackToGroundReality,
      onContinueToDecision,
      assumptions,
      comparison,
      onNavigateToView,
    ]
  );

  const activeEvaluation = comparison.scenario_evaluation;
  const baselineEvaluation = comparison.baseline_evaluation;

  const isScenarioActive =
    assumptions.rentDeltaPct !== 0 ||
    assumptions.activityDeltaPct !== 0 ||
    assumptions.competitionDeltaCount !== 0;

  // Build map analysis object for the Center Spatial Map reuse
  const mapAnalysis = useMemo(
    () =>
      resolveLocationAnalysis({
        state: candidateMeta.state,
        city: candidateMeta.city,
        localArea: candidateMeta.local_area,
        coordinates: {
          lat: candidateMeta.latitude,
          lng: candidateMeta.longitude,
        },
        hasUserSelectedLocation: true,
        cameraLevel: 'candidate',
        customCandidateLabel: candidateMeta.label,
        marketBaseline: handoff?.marketBaseline,
      }),
    [candidateMeta, handoff?.marketBaseline]
  );

  const selectedFactor = useMemo(
    () =>
      activeEvaluation.factors.find((f) => f.key === selectedFactorKey) ||
      activeEvaluation.factors[0],
    [activeEvaluation.factors, selectedFactorKey]
  );

  const postureStyle =
    POSTURE_CARD_STYLE[activeEvaluation.decision_posture.posture];

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      const raf = requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      });
      return () => cancelAnimationFrame(raf);
    }
  }, []);

  // Graceful recoverable screen if coordinates are invalid or missing
  if (!safeCoords && (!handoff?.coordinates || !parseAndValidateCoordinates(handoff.coordinates))) {
    return (
      <section
        aria-label="Location Intelligence — Missing Candidate"
        className="relative flex min-h-screen w-full items-center justify-center overflow-x-clip bg-[#03020A] px-6 text-[#F8FAFC]"
      >
        <WorkspaceSplineAmbient entryProgress={1} preferFallback={preferFallback} />
        <div className="relative z-10 max-w-lg rounded-3xl border border-amber-400/40 bg-[#0A071A]/90 p-8 shadow-2xl backdrop-blur-2xl">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-400/40 bg-amber-500/20 text-amber-300">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div>
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-400">
                03 / Location Intelligence
              </span>
              <h2 className="font-display text-lg font-bold text-white">
                Candidate Coordinates Required
              </h2>
            </div>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-slate-300">
            No valid candidate location coordinates were received. Return to Market Discovery to select a candidate corridor on the map.
          </p>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onBackToMarketDiscovery}
              className="inline-flex items-center gap-2 rounded-xl border border-sky-400/50 bg-sky-500/20 px-4 py-2 text-xs font-semibold text-sky-200 transition-all hover:bg-sky-500/30 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to 01 / Market Discovery</span>
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Page 3 — View 3: Location Intelligence and Scenario Simulator"
      className="relative min-h-screen w-full overflow-x-clip bg-[var(--stage-bg-base,#060E1C)] text-[#F8FAFC] transition-colors duration-[850ms] ease-in-out"
    >
      {/* Shared Ambient Looping Intelligence Field */}
      <WorkspaceSplineAmbient entryProgress={1} preferFallback={preferFallback} themeKey="midnight" />

      {/* TOP BAR */}
      <header className="relative z-30 border-b border-white/[0.10] bg-[var(--stage-header-bg,rgba(9,20,39,0.82))] backdrop-blur-xl transition-colors duration-[850ms]">
        <div className="mx-auto flex max-w-[1680px] flex-wrap items-center justify-between gap-4 px-6 py-2.5 sm:px-10">
          <div className="flex items-center gap-3.5">
            <div className="flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full bg-gradient-to-tr from-[#112B46] via-[#245A78] to-[#54D6E8] shadow-[0_0_10px_rgba(84,214,232,0.9)]"
                aria-hidden="true"
              />
              <span className="font-display text-sm font-bold tracking-[0.12em] text-white">
                LOCUS AI
              </span>
            </div>
            <span className="h-3.5 w-px bg-white/15" aria-hidden="true" />
            <span className="bg-gradient-to-r from-[#54D6E8] via-[#BAE6FD] to-[#DDF6FA] bg-clip-text text-xs font-semibold text-transparent">
              03 / Location Intelligence &amp; Scenario Simulator
            </span>
          </div>

          {/* 4-View Workspace Sequence Stepper */}
          <WorkspaceStageNav
            currentStage="03"
            onNavigate={handleStageNav}
            unlockedViews={unlockedViews}
          />

          <div className="flex items-center gap-2">
            <span
              data-testid="intelligence-evidence-status-pill"
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold ${
                handoff.streetScanFusion
                  ? 'border-emerald-400/45 bg-emerald-500/15 text-emerald-200'
                  : 'border-sky-400/35 bg-sky-500/15 text-sky-200'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  handoff.streetScanFusion ? 'bg-emerald-400' : 'bg-sky-400'
                }`}
              />
              <span>
                {handoff.streetScanFusion
                  ? handoff.streetScanFusion.scan_mode === 'LIVE_UPLOAD'
                    ? 'MAP + LIVE STREET EVIDENCE'
                    : 'MAP + DEMO STREET EVIDENCE'
                  : 'MAP-BASED ASSESSMENT (VIDEO OPTIONAL)'}
              </span>
            </span>

            <button
              type="button"
              onClick={onBackToGroundReality}
              data-testid="back-to-ground-reality"
              className="liquid-glass-control inline-flex items-center gap-1.5 rounded-xl px-3 py-1 text-xs font-medium text-slate-200 transition-colors hover:border-[#C084FC]/50 hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-[#E879F9]" />
              <span>02 / Ground Reality</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN WORKSPACE */}
      <div className="relative z-10 mx-auto max-w-[1680px] space-y-4 px-6 py-4 sm:px-10 xl:py-5">
        {/* Prominent Stage Identity Strip */}
        <WorkspaceStageHero
          currentStage="03"
          candidateName={candidateMeta.label}
          city={candidateMeta.city}
          state={candidateMeta.state}
          businessType={handoff?.profile?.businessType}
          onNavigate={handleStageNav}
          unlockedViews={unlockedViews}
        />

        {/* TOP PIPELINE SYNTHESIS BAR: BASELINE -> EVIDENCE -> ANALYSIS -> SCENARIO IMPACT */}
        <div className="liquid-glass-dark rounded-2xl px-4 py-2.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-lg border border-[#818CF8]/40 bg-[#4F46E5]/20 px-2.5 py-1 font-mono text-[10px] font-semibold text-[#C7D2FE]">
                1. BASELINE ({handoff.marketBaseline?.total_mapped ?? 0} mapped · DATABASE)
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
              <span
                className={`rounded-lg border px-2.5 py-1 font-mono text-[10px] font-semibold ${
                  handoff.streetScanFusion
                    ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200'
                    : 'border-sky-400/30 bg-sky-500/10 text-sky-200'
                }`}
              >
                2. GROUND REALITY (
                {handoff.streetScanFusion
                  ? `${handoff.streetScanFusion.counts.observed_entities} observed, +${handoff.streetScanFusion.counts.additional_signals} signals · OBSERVED`
                  : 'MAP-BASED BASELINE · VIDEO OPTIONAL'}
                )
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
              <span className="rounded-lg border border-[#FB923C]/45 bg-[#F97316]/15 px-2.5 py-1 font-mono text-[10px] font-semibold text-[#FED7AA]">
                3. LOCATION INTELLIGENCE (8 factors · INFERRED)
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
              <span
                className={`rounded-lg border px-2.5 py-1 font-mono text-[10px] font-semibold ${
                  isScenarioActive
                    ? 'border-[#E879F9]/55 bg-[#A855F7]/25 text-[#F5D0FE]'
                    : 'border-white/10 bg-white/[0.04] text-slate-400'
                }`}
              >
                4. SCENARIO IMPACT (
                {isScenarioActive
                  ? `${comparison.shifted_factors.length} factor shift${
                      comparison.shifted_factors.length === 1 ? '' : 's'
                    } · PREDICTED_ANALYTICAL`
                  : 'Baseline assumptions'}
                )
              </span>
            </div>

            <div className="font-mono text-[11px] text-slate-300">
              <span className="text-slate-400">Profile:</span>{' '}
              <span className="font-semibold text-white">
                {handoff.profile.businessType}
              </span>{' '}
              · {handoff.profile.budget} · {handoff.profile.targetCustomer}
            </div>
          </div>
        </div>

        {/* 3-COLUMN WORKSPACE: LEFT = FACTORS, CENTER = SPATIAL MAP & POSTURE, RIGHT = SCENARIO SIMULATOR */}
        <div className="grid grid-cols-1 gap-5 xl:gap-6 lg:grid-cols-[minmax(310px,29%)_minmax(0,41%)_minmax(320px,30%)] lg:items-stretch">
          {/* LEFT PANEL: LOCATION INTELLIGENCE FACTORS (8 EVIDENCE-BACKED FACTORS) */}
          <aside
            aria-label="Location Intelligence Factors"
            className="liquid-glass-dark flex flex-col justify-between rounded-3xl p-4 xl:p-5"
          >
            <div className="space-y-3.5">
              <div className="flex items-start justify-between gap-2 border-b border-white/[0.08] pb-3">
                <div>
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#FB923C]">
                    LOCATION INTELLIGENCE
                  </span>
                  <h2 className="mt-0.5 font-display text-base font-semibold text-white xl:text-lg">
                    8 Evidence-Backed Factors
                  </h2>
                  <p className="text-xs text-slate-300/80">
                    Categorical ratings derived from{' '}
                    {handoff.streetScanFusion
                      ? 'Market Baseline + Street Scan.'
                      : 'Market Baseline (Street Scan not yet run).'}
                  </p>
                </div>
                <Layers className="h-4 w-4 text-[#E879F9]" />
              </div>

              {!handoff.streetScanFusion && (
                <div className="flex items-start gap-2 rounded-2xl border border-amber-400/35 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
                  <div>
                    <span className="font-semibold">
                      STREET SCAN NOT AVAILABLE:
                    </span>{' '}
                    Evaluating on structured{' '}
                    <span className="font-mono">DATABASE</span> baseline only.
                    No observed street evidence is manufactured.
                  </div>
                </div>
              )}

              {/* 8 Factors List */}
              <div
                data-testid="location-intelligence-factors-list"
                className="space-y-2 max-h-[460px] overflow-y-auto pr-1"
              >
                {activeEvaluation.factors.map((factor) => {
                  const isSelected = factor.key === selectedFactor.key;
                  const evStyle = EVIDENCE_BADGE_STYLE[factor.evidence_type];
                  const ratingStyle =
                    factor.key === 'risk'
                      ? RISK_RATING_BADGE_STYLE[factor.rating]
                      : RATING_BADGE_STYLE[factor.rating];

                  return (
                    <button
                      key={factor.key}
                      type="button"
                      data-testid={`intelligence-factor-${factor.key}`}
                      onClick={() => setSelectedFactorKey(factor.key)}
                      className={`w-full rounded-2xl border p-3 text-left transition-all ${
                        isSelected
                          ? 'border-cyan-400/70 border-t-white/30 bg-gradient-to-r from-cyan-500/20 via-sky-500/10 to-transparent shadow-[0_0_24px_rgba(56,189,248,0.25),inset_0_1px_0_0_rgba(255,255,255,0.22)]'
                          : factor.changed_from_baseline
                          ? 'border-[#FB923C]/50 border-t-white/20 bg-gradient-to-r from-[#F97316]/15 via-amber-500/10 to-transparent hover:border-[#FB923C]/75 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)]'
                          : 'border-white/[0.09] border-t-white/18 bg-white/[0.035] hover:border-cyan-400/40 hover:bg-white/[0.06] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-display text-xs font-semibold text-white">
                          {factor.label}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <span
                            className={`rounded border px-1.5 py-0.5 font-mono text-[8.5px] font-semibold ${evStyle.bg}`}
                          >
                            {evStyle.label}
                          </span>

                          {factor.changed_from_baseline ? (
                            <span className="inline-flex items-center gap-1 rounded border border-[#FB923C]/60 bg-[#F97316]/25 px-1.5 py-0.5 font-mono text-[9.5px] font-bold text-[#FDBA74]">
                              <span className="text-slate-300 line-through">
                                {factor.baseline_rating}
                              </span>
                              <span>→</span>
                              <span>{factor.rating}</span>
                            </span>
                          ) : (
                            <span
                              className={`rounded border px-1.5 py-0.5 font-mono text-[9.5px] font-semibold ${ratingStyle}`}
                            >
                              {factor.rating}
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="mt-1 text-[11px] leading-snug text-slate-300/90">
                        {factor.explanation}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Selected Factor Supporting Evidence Provenance Drawer */}
              <div className="glass-sub-card rounded-2xl border-cyan-400/25 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-cyan-300">
                    Evidence Provenance · {selectedFactor.label}
                  </span>
                  <span className="font-mono text-[9.5px] text-slate-400">
                    {selectedFactor.underlying_sources.join(' + ')}
                  </span>
                </div>
                <ul className="mt-1.5 space-y-1 font-mono text-[10.5px] text-slate-300">
                  {selectedFactor.supporting_evidence.map((line, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-cyan-400">·</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </aside>

          {/* CENTER PANEL: CANDIDATE SPATIAL VISUALIZATION + EXPLAINABLE DECISION POSTURE */}
          <div className="flex flex-col justify-between gap-4">
            {/* Reused Working Map Infrastructure */}
            <div className="flex-1">
              <MarketDiscoveryMap
                analysis={mapAnalysis}
                onUpdateCoordinates={() => {
                  // Candidate coordinates are locked during View 3 analysis; return to View 1 to move pin
                }}
                preferFallback={preferFallback}
              />
            </div>

            {/* Explainable Decision Posture Card */}
            <div
              data-testid="decision-posture-card"
              className={`liquid-glass-dark rounded-3xl border p-4 xl:p-5 ${postureStyle.border}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                    {isScenarioActive
                      ? 'SCENARIO DECISION POSTURE'
                      : 'BASELINE DECISION POSTURE'}
                  </span>
                  {baselineEvaluation.decision_posture.posture !==
                    activeEvaluation.decision_posture.posture && (
                    <span className="rounded-full border border-[#FB923C]/50 bg-[#F97316]/20 px-2 py-0.5 font-mono text-[9.5px] font-semibold text-[#FDBA74]">
                      SHIFTED FROM {baselineEvaluation.decision_posture.posture}
                    </span>
                  )}
                </div>

                <span
                  className={`rounded-lg border px-2 py-0.5 font-mono text-[9.5px] font-semibold ${
                    EVIDENCE_BADGE_STYLE[
                      activeEvaluation.decision_posture.evidence_type
                    ].bg
                  }`}
                >
                  {
                    EVIDENCE_BADGE_STYLE[
                      activeEvaluation.decision_posture.evidence_type
                    ].label
                  }
                </span>
              </div>

              <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-2">
                <h3
                  data-testid="decision-posture-title"
                  className="font-display text-lg font-bold text-white"
                >
                  {activeEvaluation.decision_posture.posture}
                </h3>
                <span className="font-mono text-xs text-slate-300">
                  {handoff.localArea || handoff.candidateName}, {handoff.city}
                </span>
              </div>

              <p className="mt-1 text-xs font-medium text-slate-200">
                {activeEvaluation.decision_posture.headline}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-300/85">
                {activeEvaluation.decision_posture.rationale}
              </p>
            </div>
          </div>

          {/* RIGHT PANEL: SCENARIO SIMULATOR & SENSITIVITY ANALYSIS */}
          <aside
            aria-label="Scenario Simulator"
            className="liquid-glass-dark flex flex-col justify-between rounded-3xl p-4 xl:p-5"
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2 border-b border-white/[0.08] pb-3">
                <div>
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#E879F9]">
                    SCENARIO SIMULATOR · SENSITIVITY ANALYSIS
                  </span>
                  <h2 className="mt-0.5 font-display text-base font-semibold text-white xl:text-lg">
                    Test Market Assumptions
                  </h2>
                  <p className="text-xs text-slate-300/80">
                    Adjust Rent, Activity, or Competition to recalculate Location
                    Intelligence via the unified engine.
                  </p>
                </div>

                {isScenarioActive && (
                  <button
                    type="button"
                    onClick={() =>
                      setAssumptions(BASELINE_SCENARIO_ASSUMPTIONS)
                    }
                    data-testid="reset-scenario-button"
                    className="liquid-glass-control inline-flex shrink-0 items-center gap-1 rounded-xl px-2.5 py-1 font-mono text-[10px] font-semibold text-[#FDBA74] hover:border-[#FB923C]"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Reset</span>
                  </button>
                )}
              </div>

              {/* Quick Scenario Presets */}
              <div>
                <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-400">
                  Sensitivity Presets
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {SCENARIO_PRESETS.map((preset) => {
                    const isSelected =
                      preset.assumptions.rentDeltaPct ===
                        assumptions.rentDeltaPct &&
                      preset.assumptions.activityDeltaPct ===
                        assumptions.activityDeltaPct &&
                      preset.assumptions.competitionDeltaCount ===
                        assumptions.competitionDeltaCount;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        data-testid={`scenario-preset-${preset.id}`}
                        onClick={() => setAssumptions(preset.assumptions)}
                        className={`rounded-xl border px-2.5 py-1 font-mono text-[10px] transition-all ${
                          isSelected
                            ? 'border-[#FB923C] bg-[#F97316]/25 font-semibold text-white'
                            : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-[#E879F9]/45 hover:text-white'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Three Scenario Variable Sliders */}
              <div className="glass-sub-card space-y-4 rounded-2xl p-4">
                {/* 1. RENT ASSUMPTION */}
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <label
                      htmlFor="scenario-rent-slider"
                      className="font-medium text-slate-200"
                    >
                      1. Rent Assumption
                    </label>
                    <span
                      data-testid="scenario-rent-value"
                      className={`font-mono text-xs font-bold ${
                        assumptions.rentDeltaPct > 0
                          ? 'text-amber-300'
                          : assumptions.rentDeltaPct < 0
                          ? 'text-emerald-300'
                          : 'text-slate-300'
                      }`}
                    >
                      {assumptions.rentDeltaPct === 0
                        ? 'Current (0%)'
                        : `${assumptions.rentDeltaPct > 0 ? '+' : ''}${
                            assumptions.rentDeltaPct
                          }%`}
                    </span>
                  </div>
                  <input
                    id="scenario-rent-slider"
                    data-testid="scenario-rent-slider"
                    type="range"
                    min={-20}
                    max={40}
                    step={5}
                    value={assumptions.rentDeltaPct}
                    onChange={(e) =>
                      setAssumptions((prev) => ({
                        ...prev,
                        rentDeltaPct: Number(e.target.value),
                      }))
                    }
                    className="mt-1.5 h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-white/15 accent-[#FB923C]"
                  />
                  <div className="mt-0.5 flex justify-between font-mono text-[9.5px] text-slate-500">
                    <span>-20%</span>
                    <span>Baseline (0%)</span>
                    <span>+40%</span>
                  </div>
                </div>

                {/* 2. FOOTFALL / ACTIVITY ASSUMPTION */}
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <label
                      htmlFor="scenario-activity-slider"
                      className="font-medium text-slate-200"
                    >
                      2. Footfall / Activity
                    </label>
                    <span
                      data-testid="scenario-activity-value"
                      className={`font-mono text-xs font-bold ${
                        assumptions.activityDeltaPct > 0
                          ? 'text-emerald-300'
                          : assumptions.activityDeltaPct < 0
                          ? 'text-amber-300'
                          : 'text-slate-300'
                      }`}
                    >
                      {assumptions.activityDeltaPct === 0
                        ? 'Current (0%)'
                        : `${assumptions.activityDeltaPct > 0 ? '+' : ''}${
                            assumptions.activityDeltaPct
                          }%`}
                    </span>
                  </div>
                  <input
                    id="scenario-activity-slider"
                    data-testid="scenario-activity-slider"
                    type="range"
                    min={-30}
                    max={30}
                    step={5}
                    value={assumptions.activityDeltaPct}
                    onChange={(e) =>
                      setAssumptions((prev) => ({
                        ...prev,
                        activityDeltaPct: Number(e.target.value),
                      }))
                    }
                    className="mt-1.5 h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-white/15 accent-[#E879F9]"
                  />
                  <div className="mt-0.5 flex justify-between font-mono text-[9.5px] text-slate-500">
                    <span>-30%</span>
                    <span>Baseline (0%)</span>
                    <span>+30%</span>
                  </div>
                </div>

                {/* 3. COMPETITION ASSUMPTION */}
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <label
                      htmlFor="scenario-competition-slider"
                      className="font-medium text-slate-200"
                    >
                      3. Competition (0–300m)
                    </label>
                    <span
                      data-testid="scenario-competition-value"
                      className={`font-mono text-xs font-bold ${
                        assumptions.competitionDeltaCount > 0
                          ? 'text-amber-300'
                          : assumptions.competitionDeltaCount < 0
                          ? 'text-emerald-300'
                          : 'text-slate-300'
                      }`}
                    >
                      {assumptions.competitionDeltaCount === 0
                        ? `Current (${baselineEvaluation.metrics.effective_300m_competitors})`
                        : `${
                            assumptions.competitionDeltaCount > 0 ? '+' : ''
                          }${assumptions.competitionDeltaCount} (${
                            activeEvaluation.metrics.effective_300m_competitors
                          } effective)`}
                    </span>
                  </div>
                  <input
                    id="scenario-competition-slider"
                    data-testid="scenario-competition-slider"
                    type="range"
                    min={-2}
                    max={5}
                    step={1}
                    value={assumptions.competitionDeltaCount}
                    onChange={(e) =>
                      setAssumptions((prev) => ({
                        ...prev,
                        competitionDeltaCount: Number(e.target.value),
                      }))
                    }
                    className="mt-1.5 h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-white/15 accent-[#818CF8]"
                  />
                  <div className="mt-0.5 flex justify-between font-mono text-[9.5px] text-slate-500">
                    <span>-2 exits</span>
                    <span>Baseline (+0)</span>
                    <span>+5 entrants</span>
                  </div>
                </div>
              </div>

              {/* Baseline vs Scenario Analytical Metrics Comparison */}
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-300">
                    Baseline vs Scenario Metrics
                  </span>
                  <span className="rounded border border-[#E879F9]/40 bg-[#A855F7]/20 px-1.5 py-0.5 font-mono text-[8.5px] font-semibold text-[#F5D0FE]">
                    PREDICTED_ANALYTICAL
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center font-mono text-[10.5px]">
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2">
                    <span className="block text-[9.5px] text-slate-400">
                      0–300m Comp
                    </span>
                    <span className="mt-0.5 block font-bold text-white">
                      {baselineEvaluation.metrics.effective_300m_competitors} →{' '}
                      <span className="text-[#FB923C]">
                        {activeEvaluation.metrics.effective_300m_competitors}
                      </span>
                    </span>
                  </div>

                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2">
                    <span className="block text-[9.5px] text-slate-400">
                      Activity Index
                    </span>
                    <span className="mt-0.5 block font-bold text-white">
                      {baselineEvaluation.metrics.effective_activity_index} →{' '}
                      <span className="text-[#E879F9]">
                        {activeEvaluation.metrics.effective_activity_index}
                      </span>
                    </span>
                  </div>

                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2">
                    <span className="block text-[9.5px] text-slate-400">
                      Rent Pressure
                    </span>
                    <span className="mt-0.5 block font-bold text-white">
                      {baselineEvaluation.metrics.effective_rent_pressure_index}{' '}
                      →{' '}
                      <span className="text-[#818CF8]">
                        {activeEvaluation.metrics.effective_rent_pressure_index}
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Scenario Impact / Sensitivity Summary */}
              <div
                data-testid="scenario-sensitivity-summary"
                className="rounded-2xl border border-white/[0.09] bg-[#080618]/85 p-3.5 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#FDBA74]">
                    <Sliders className="h-3.5 w-3.5 text-[#FB923C]" />
                    <span>Scenario Impact &amp; Sensitivity</span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-400">
                    {comparison.shifted_factors.length} factor shift
                    {comparison.shifted_factors.length === 1 ? '' : 's'}
                  </span>
                </div>

                <p className="text-xs leading-relaxed text-slate-200">
                  {comparison.sensitivity_summary}
                </p>

                {comparison.shifted_factors.length > 0 && (
                  <div
                    data-testid="shifted-factors-list"
                    className="space-y-1.5 pt-1"
                  >
                    {comparison.shifted_factors.map((sf) => (
                      <div
                        key={sf.key}
                        className="flex items-center justify-between rounded-xl border border-[#FB923C]/35 bg-[#F97316]/10 px-2.5 py-1.5 font-mono text-[10.5px]"
                      >
                        <div>
                          <span className="font-semibold text-white">
                            {sf.label}
                          </span>
                          <span className="ml-2 text-slate-400">
                            ({sf.driver})
                          </span>
                        </div>
                        <span className="font-bold text-[#FDBA74]">
                          {sf.from_rating} → {sf.to_rating}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-3 space-y-2.5 border-t border-white/[0.08] pt-3">
              {onContinueToDecision && (
                <button
                  type="button"
                  data-testid="continue-to-decision-report"
                  onClick={() =>
                    onContinueToDecision({
                      scenarioAssumptions: assumptions,
                      comparison,
                    })
                  }
                  className="liquid-glass-cta flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-2.5 font-mono text-xs font-bold tracking-wider text-white transition-all"
                >
                  <span>CONTINUE TO DECISION REPORT</span>
                  <ArrowRight className="h-3.5 w-3.5 text-[#FDBA74]" />
                </button>
              )}

              <div className="flex items-center justify-between font-mono text-[10px] text-slate-400">
                <span>
                  Analytical estimate only — not a guarantee of future revenue.
                </span>
                <Sparkles className="h-3.5 w-3.5 text-[#E879F9]" />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
};
