import React, { useCallback, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Compass,
  FileText,
  Info,
  Navigation,
  Printer,
  ShieldAlert,
  Sliders,
  Sparkles,
  Store,
  Users,
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
  DecisionReportHandoffPayload,
  PlainLanguageOutcome,
  ShortDecisionPosture,
} from '../../types/decisionReport';
import { buildMarketEntryReport } from '../../utils/decisionReportBuilder';

export interface DecisionReportViewProps {
  handoff: DecisionReportHandoffPayload;
  preferFallback?: boolean;
  onBackToMarketDiscovery: () => void;
  onBackToGroundReality: () => void;
  onBackToIntelligence: () => void;
  onBackToHome?: () => void;
  unlockedViews?: Set<WorkspaceViewKey>;
  onNavigateToView?: (targetView: WorkspaceViewKey) => void;
}

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

const RATING_BADGE_STYLE: Record<CategoricalLevel, string> = {
  STRONG: 'border-[#FB923C]/45 bg-[#F97316]/18 text-[#FDBA74]',
  HIGH: 'border-[#818CF8]/45 bg-[#4F46E5]/20 text-[#C7D2FE]',
  MEDIUM: 'border-[#E879F9]/40 bg-[#A855F7]/18 text-[#F5D0FE]',
  LOW: 'border-white/15 bg-white/[0.05] text-slate-300',
};

const RISK_RATING_BADGE_STYLE: Record<CategoricalLevel, string> = {
  LOW: 'border-emerald-400/45 bg-emerald-500/15 text-emerald-200',
  MEDIUM: 'border-amber-400/45 bg-amber-500/15 text-amber-200',
  HIGH: 'border-rose-400/45 bg-rose-500/15 text-rose-200',
  STRONG: 'border-rose-500/60 bg-rose-500/25 text-rose-100',
};

/**
 * Maps decision outcome and posture to user-friendly business owner terminology:
 * Promising | Needs validation | Insufficient evidence
 */
function getBusinessOwnerVerdict(
  shortPosture: ShortDecisionPosture,
  isProvisional: boolean,
  outcome: PlainLanguageOutcome
): {
  title: 'Promising' | 'Needs validation' | 'Insufficient evidence';
  theme: 'emerald' | 'amber' | 'rose' | 'slate';
  cardBorder: string;
  badgeClass: string;
  pillClass: string;
  accentText: string;
  icon: 'check' | 'alert' | 'info';
} {
  if (isProvisional || outcome === 'NOT ENOUGH INFORMATION YET') {
    return {
      title: 'Insufficient evidence',
      theme: 'slate',
      cardBorder: 'border-slate-500/40 shadow-[0_12px_40px_rgba(100,116,139,0.15)]',
      badgeClass: 'border-slate-500/50 bg-slate-500/20 text-slate-200',
      pillClass: 'border-slate-500/40 bg-slate-500/10 text-slate-300',
      accentText: 'text-slate-300',
      icon: 'info',
    };
  }
  if (shortPosture === 'FAVORABLE' || outcome === 'LOOKS PROMISING') {
    return {
      title: 'Promising',
      theme: 'emerald',
      cardBorder: 'border-emerald-400/45 shadow-[0_16px_50px_rgba(16,185,129,0.18)]',
      badgeClass: 'border-emerald-400/50 bg-emerald-500/20 text-emerald-200',
      pillClass: 'border-emerald-400/35 bg-emerald-500/10 text-emerald-300',
      accentText: 'text-emerald-300',
      icon: 'check',
    };
  }
  if (shortPosture === 'WEAK' || outcome === 'CONSIDER ANOTHER LOCATION') {
    return {
      title: 'Needs validation',
      theme: 'rose',
      cardBorder: 'border-rose-400/45 shadow-[0_16px_50px_rgba(244,63,94,0.18)]',
      badgeClass: 'border-rose-400/50 bg-rose-500/20 text-rose-200',
      pillClass: 'border-rose-400/35 bg-rose-500/10 text-rose-300',
      accentText: 'text-rose-300',
      icon: 'alert',
    };
  }
  return {
    title: 'Needs validation',
    theme: 'amber',
    cardBorder: 'border-amber-400/45 shadow-[0_16px_50px_rgba(245,158,11,0.18)]',
    badgeClass: 'border-amber-400/50 bg-amber-500/20 text-amber-200',
    pillClass: 'border-amber-400/35 bg-amber-500/10 text-amber-300',
    accentText: 'text-amber-300',
    icon: 'alert',
  };
}

export const DecisionReportView: React.FC<DecisionReportViewProps> = ({
  handoff,
  preferFallback = false,
  onBackToMarketDiscovery,
  onBackToGroundReality,
  onBackToIntelligence,
  onBackToHome,
  unlockedViews,
  onNavigateToView,
}) => {
  const report = useMemo(() => buildMarketEntryReport(handoff), [handoff]);

  const safeCoords = useMemo(() => {
    return (
      parseAndValidateCoordinates(handoff?.coordinates) ?? {
        lat: DEMO_LOCATION_PRESETS[0].lat,
        lng: DEMO_LOCATION_PRESETS[0].lng,
      }
    );
  }, [handoff?.coordinates]);

  const mapAnalysis = useMemo(
    () =>
      resolveLocationAnalysis({
        state: handoff?.state || DEMO_LOCATION_PRESETS[0].state,
        city: handoff?.city || DEMO_LOCATION_PRESETS[0].city,
        localArea: handoff?.localArea || DEMO_LOCATION_PRESETS[0].localArea,
        coordinates: safeCoords,
        hasUserSelectedLocation: true,
        cameraLevel: 'candidate',
        customCandidateLabel:
          handoff?.candidateName || DEMO_LOCATION_PRESETS[0].candidateName,
        marketBaseline: handoff?.marketBaseline,
      }),
    [handoff, safeCoords]
  );

  const verdict = useMemo(
    () =>
      getBusinessOwnerVerdict(
        report.summary.short_posture,
        report.executiveSummary.is_provisional,
        report.executiveSummary.outcome
      ),
    [
      report.summary.short_posture,
      report.executiveSummary.is_provisional,
      report.executiveSummary.outcome,
    ]
  );

  // Default collapsed state for the technical diagnostic accordion
  const [isTechOpen, setIsTechOpen] = useState<boolean>(false);
  const [isLedgerExpanded, setIsLedgerExpanded] = useState<boolean>(true);

  const handleStageNav = useCallback(
    (target: WorkspaceViewKey) => {
      if (target === 'view1') {
        onBackToMarketDiscovery();
      } else if (target === 'view2') {
        onBackToGroundReality();
      } else if (target === 'view3') {
        onBackToIntelligence();
      } else if (onNavigateToView) {
        onNavigateToView(target);
      }
    },
    [
      onBackToMarketDiscovery,
      onBackToGroundReality,
      onBackToIntelligence,
      onNavigateToView,
    ]
  );

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      const raf = requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      });
      return () => cancelAnimationFrame(raf);
    }
  }, []);

  const handlePrintReport = () => {
    if (typeof window !== 'undefined' && typeof window.print === 'function') {
      window.print();
    }
  };

  return (
    <section
      aria-label="Page 3 — View 4: Explainable Market Entry Decision Report"
      data-testid="decision-report-view"
      className="relative min-h-screen w-full overflow-x-clip bg-[var(--stage-bg-base,#081713)] text-[#F8FAFC] transition-colors duration-[850ms] ease-in-out print:min-h-0 print:!bg-[#F8FBF9] print:!text-[#14231E] print:overflow-visible"
    >
      {/* Shared Ambient Field (Screen only) */}
      <div className="print:hidden">
        <WorkspaceSplineAmbient
          entryProgress={1}
          preferFallback={preferFallback}
          fixedViewport={true}
          themeKey="report"
        />
      </div>

      {/* TOP BAR */}
      <header className="relative z-30 border-b border-white/[0.10] bg-[var(--stage-header-bg,rgba(6,25,20,0.85))] backdrop-blur-xl transition-colors duration-[850ms] print:hidden">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 px-6 py-2.5 sm:px-10">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={() => {
                if (onBackToHome) {
                  onBackToHome();
                } else if (onBackToMarketDiscovery) {
                  onBackToMarketDiscovery();
                } else if (typeof window !== 'undefined') {
                  window.location.href = '/';
                }
              }}
              title="Return to LOCUS AI Home"
              className="group -ml-1 flex items-center gap-2 rounded-lg px-1.5 py-1 transition-all hover:bg-white/[0.08]"
            >
              <span
                className="h-2 w-2 rounded-full bg-gradient-to-tr from-[#092D25] via-[#0F8B68] to-[#72D9B0] shadow-[0_0_10px_rgba(114,217,176,0.9)] transition-transform group-hover:scale-125"
                aria-hidden="true"
              />
              <span className="font-display text-sm font-bold tracking-[0.12em] text-white transition-colors group-hover:text-emerald-300">
                LOCUS AI
              </span>
            </button>
            <span className="h-3.5 w-px bg-white/15" aria-hidden="true" />
            <span className="bg-gradient-to-r from-[#72D9B0] via-[#0F8B68] to-[#E9F7F0] bg-clip-text text-xs font-semibold text-transparent">
              04 / Decision — Market Entry Report
            </span>
          </div>

          {/* Stepper Navigation */}
          <WorkspaceStageNav
            currentStage="04"
            onNavigate={handleStageNav}
            unlockedViews={unlockedViews}
          />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrintReport}
              data-testid="export-report-button"
              className="liquid-glass-control inline-flex items-center gap-1.5 rounded-xl px-3 py-1 text-xs font-medium text-slate-200 transition-colors hover:border-[#FB923C]/50 hover:text-white"
            >
              <Printer className="h-3.5 w-3.5 text-[#FB923C]" />
              <span>Export Report</span>
            </button>

            <button
              type="button"
              onClick={onBackToIntelligence}
              data-testid="back-to-intelligence-button"
              className="liquid-glass-control inline-flex items-center gap-1.5 rounded-xl px-3 py-1 text-xs font-medium text-slate-200 transition-colors hover:border-[#C084FC]/50 hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-[#E879F9]" />
              <span>03 / Intelligence</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN DOCUMENT CONTAINER */}
      <div className="relative z-10 mx-auto max-w-[1600px] space-y-6 px-6 py-6 sm:px-10 print:max-w-none print:p-0 print:m-0 print:space-y-4">
        {/* PRINT ONLY HEADER */}
        <div className="hidden print:flex items-center justify-between border-b pb-3 mb-3 border-slate-300 font-mono text-xs">
          <div>
            <div className="text-base font-bold text-slate-900 tracking-wider">
              LOCUS AI · EXECUTIVE DECISION BRIEF
            </div>
            <div className="text-slate-600">
              Candidate: {report.summary.candidate_location} ({report.summary.city}, {report.summary.state})
            </div>
          </div>
          <div className="text-right text-slate-600">
            <div>Profile: {report.summary.business_type} · Budget: {report.summary.budget}</div>
            <div>Generated: {new Date(report.summary.analysis_timestamp).toLocaleDateString()}</div>
          </div>
        </div>

        {/* Hero Context Banner */}
        <div className="print:hidden">
          <WorkspaceStageHero
            currentStage="04"
            candidateName={report.summary.candidate_location}
            city={report.summary.city}
            state={report.summary.state}
            businessType={report.summary.business_type}
            onNavigate={handleStageNav}
            unlockedViews={unlockedViews}
          />
        </div>

        {/* ============================================================
            SECTION A: EXECUTIVE VERDICT (HERO DECISION BRIEF)
           ============================================================ */}
        <section
          data-testid="report-executive-summary"
          aria-label="Executive Decision Verdict"
          className={`liquid-glass-dark rounded-3xl border p-6 sm:p-8 space-y-6 ${verdict.cardBorder} print:p-4 print:space-y-3 print:rounded-xl print:shadow-none print:break-inside-avoid`}
        >
          {/* Header Row: Candidate Metadata & Status */}
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start border-b border-white/[0.08] pb-5 print:pb-2">
            <div className="space-y-3 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-md border border-[#F59E0B]/50 bg-[#F59E0B]/15 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#FCD34D]">
                  <Sparkles className="h-3 w-3" />
                  EXECUTIVE VERDICT · BUSINESS BRIEF
                </span>
                <span
                  data-testid="executive-confidence-pill"
                  className={`rounded-md border px-2.5 py-0.5 font-mono text-[9.5px] font-semibold ${
                    report.executiveSummary.is_provisional
                      ? 'border-amber-400/40 bg-amber-500/20 text-amber-200'
                      : 'border-emerald-400/40 bg-emerald-500/20 text-emerald-200'
                  }`}
                >
                  {report.executiveSummary.confidence_label}
                </span>
                <span
                  data-testid="executive-mode-pill"
                  className={`rounded-md border px-2.5 py-0.5 font-mono text-[9.5px] font-semibold ${
                    report.executiveSummary.analysis_mode === 'MAP_AND_STREET'
                      ? 'border-emerald-400/40 bg-emerald-500/20 text-emerald-200'
                      : 'border-indigo-400/40 bg-indigo-500/20 text-indigo-200'
                  }`}
                >
                  {report.executiveSummary.mode_label}
                </span>
              </div>

              <div>
                <h1 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  {report.summary.candidate_location}
                </h1>
                <p className="mt-1 font-mono text-xs text-slate-300">
                  <span className="text-[#FCD34D] font-semibold">
                    {report.summary.business_type}
                  </span>{' '}
                  · Target Customers:{' '}
                  <span className="text-white font-medium">
                    {report.summary.target_customer}
                  </span>{' '}
                  · Budget:{' '}
                  <span className="text-[#FDBA74] font-semibold">
                    {report.summary.budget}
                  </span>{' '}
                  · Area: {report.summary.local_area}, {report.summary.city}
                </p>
              </div>

              {/* One Clear Decision Posture */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <span
                  data-testid="executive-posture-badge"
                  className={`inline-flex items-center gap-2 rounded-xl border px-4 py-1.5 font-mono text-base font-extrabold tracking-wide ${verdict.badgeClass}`}
                >
                  {verdict.icon === 'check' && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  )}
                  {verdict.icon === 'alert' && (
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                  )}
                  {verdict.icon === 'info' && (
                    <Info className="h-4 w-4 text-slate-400" />
                  )}
                  <span>{verdict.title}</span>
                </span>

                <span className="font-mono text-[11px] text-slate-400">
                  Analytical Engine Posture:{' '}
                  <span className="font-semibold text-slate-200">
                    {report.summary.short_posture}
                  </span>
                </span>
              </div>

              {/* Short, plain-language explanation of verdict */}
              <p className="max-w-4xl text-xs sm:text-sm leading-relaxed text-slate-200 font-medium">
                {report.executiveSummary.plain_explanation}
              </p>

              <div className="flex items-center gap-2 text-[10.5px] text-slate-400 font-mono">
                <Info className="h-3 w-3 text-emerald-400 shrink-0" />
                <span>
                  Evidence-derived assessment to prioritize due diligence. Does not guarantee financial return.
                </span>
              </div>

              {report.executiveSummary.is_provisional && (
                <p className="text-[11.5px] leading-relaxed text-amber-300 font-mono flex items-center gap-1.5 pt-0.5">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                  <span>{report.executiveSummary.provisional_reason}</span>
                </p>
              )}
            </div>

            {/* Quick Location Badge Card */}
            <div className="glass-sub-card flex flex-col items-start lg:items-end rounded-2xl p-4 shrink-0 shadow-lg min-w-[220px]">
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-slate-400">
                CANDIDATE COORDINATES
              </span>
              <span className="mt-1 font-mono text-xs font-semibold text-slate-200">
                {report.summary.coordinates.lat.toFixed(4)}°N,{' '}
                {report.summary.coordinates.lng.toFixed(4)}°E
              </span>
              <span className="mt-1 font-mono text-[10px] text-slate-400">
                Corridor: {report.summary.local_area}
              </span>
              <span className="mt-2 inline-block rounded border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono text-[9px] text-slate-300">
                {report.data_mode === 'LIVE' ? 'Live Provider Places' : 'Calibrated Baseline'}
              </span>
            </div>
          </div>

          {/* ============================================================
              COMPACT EVIDENCE SUMMARY (4 ESSENTIAL METRICS ONLY)
             ============================================================ */}
          <div
            data-testid="evidence-coverage-summary-grid"
            className="space-y-2 pt-1"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-slate-300">
                Evidence Coverage &amp; Data Grounding
              </span>
              <span className="font-mono text-[9.5px] text-slate-400">
                Verified against available directory listings &amp; physical corridor imagery
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 font-mono text-xs print:grid-cols-4 print:gap-2">
              {/* 1. Relevant mapped businesses found */}
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-3 space-y-1">
                <span className="block text-[9.5px] uppercase tracking-wider text-slate-400">
                  Relevant Mapped Businesses
                </span>
                <span className="block text-lg font-bold text-white">
                  {report.nearbyCompetitors.provider_listed.length > 0
                    ? `${report.nearbyCompetitors.provider_listed.length} in area`
                    : '0 returned'}
                </span>
                <span className="block text-[9.5px] text-slate-400 truncate">
                  {report.nearbyCompetitors.empty_provider_note
                    ? 'Provider listings unverified'
                    : 'Google Places / Registry'}
                </span>
              </div>

              {/* 2. Storefronts observed */}
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-3 space-y-1">
                <span className="block text-[9.5px] uppercase tracking-wider text-slate-400">
                  Storefronts Observed
                </span>
                <span className="block text-lg font-bold text-white">
                  {report.groundReality.executed
                    ? `${report.groundReality.counts.observed_entities} storefronts`
                    : 'Unavailable'}
                </span>
                <span className="block text-[9.5px] text-slate-400 truncate">
                  {report.groundReality.executed
                    ? '0–300m walking corridor'
                    : 'Street scan not run'}
                </span>
              </div>

              {/* 3. Business names reliably identified */}
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-3 space-y-1">
                <span className="block text-[9.5px] uppercase tracking-wider text-slate-400">
                  Reliably Identified Names
                </span>
                <span className="block text-lg font-bold text-white">
                  {report.groundReality.executed
                    ? `${report.nearbyCompetitors.reliable_observed_names_count} identified`
                    : 'Not verified'}
                </span>
                <span className="block text-[9.5px] text-slate-400 truncate">
                  {report.groundReality.executed
                    ? `${report.nearbyCompetitors.unidentified_storefronts_count} unidentified storefronts`
                    : 'Requires ground footage'}
                </span>
              </div>

              {/* 4. Evidence coverage or confidence */}
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-3 space-y-1">
                <span className="block text-[9.5px] uppercase tracking-wider text-slate-400">
                  Evidence Coverage Scope
                </span>
                <span className="block text-sm font-bold text-emerald-300 truncate">
                  {report.executiveSummary.confidence_label}
                </span>
                <span className="block text-[9.5px] text-slate-400 truncate">
                  {report.executiveSummary.mode_label}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================
            SECTION B: RELEVANT NEARBY BUSINESSES (PRIORITY FEATURE)
           ============================================================ */}
        <section
          data-testid="report-section-nearby-businesses"
          aria-label="Relevant Nearby Businesses and Competitors"
          className="liquid-glass-dark rounded-3xl border border-emerald-400/30 p-6 sm:p-7 space-y-5 shadow-[0_16px_50px_rgba(0,0,0,0.45)] print:p-4 print:space-y-3 print:rounded-xl print:break-inside-avoid"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">
                  <Store className="h-3.5 w-3.5" />
                  RELEVANT NEARBY BUSINESSES &amp; COMPETITORS
                </span>
                <span className="rounded-md border border-emerald-400/40 bg-emerald-500/15 px-2 py-0.5 font-mono text-[9px] font-semibold text-emerald-200">
                  PRIORITY AUDIT
                </span>
              </div>
              <h2 className="mt-1 font-display text-lg sm:text-xl font-bold text-white">
                Commercial Density &amp; Observed Storefronts for {report.summary.business_type}
              </h2>
              <p className="mt-0.5 text-xs text-slate-300">
                Separating verified directory listings from visually observed street storefronts. Unreliable OCR reads are marked as unidentified storefronts.
              </p>
            </div>

            <div className="font-mono text-xs text-slate-300 bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2 shrink-0">
              <span className="text-emerald-300 font-bold">
                {report.nearbyCompetitors.total_identified_competitors}
              </span>{' '}
              relevant competitors found
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* SUB-SECTION 1: DIRECTORY-LISTED BUSINESSES (GOOGLE PLACES) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#818CF8]">
                  <Building2 className="h-4 w-4" />
                  <span>Verified Directory Listings (Google Places Baseline)</span>
                </div>
                <span className="font-mono text-[10px] text-slate-400">
                  {report.nearbyCompetitors.provider_listed.length} listings
                </span>
              </div>

              {report.nearbyCompetitors.provider_listed.length > 0 ? (
                <div className="space-y-2.5">
                  {report.nearbyCompetitors.provider_listed.map((biz) => (
                    <div
                      key={biz.id}
                      className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-3.5 space-y-1.5 transition-all hover:border-white/20 hover:bg-white/[0.04]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-white">
                              {biz.name}
                            </h4>
                            {biz.is_relevant_competitor && (
                              <span className="rounded-md border border-[#F59E0B]/50 bg-[#F59E0B]/15 px-2 py-0.5 font-mono text-[9px] font-bold text-[#FCD34D]">
                                Category Match
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-300">
                            {biz.category}
                          </p>
                        </div>

                        <span className="rounded border border-[#818CF8]/40 bg-[#4F46E5]/15 px-2 py-0.5 font-mono text-[9.5px] font-semibold text-[#C7D2FE] shrink-0">
                          {biz.distance_label}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/[0.05] font-mono text-[10px]">
                        <span className="text-slate-400">
                          Source: {biz.source}
                        </span>
                        <span className="text-[#818CF8]">
                          {biz.confidence_label}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-4 space-y-2 text-xs">
                  <div className="flex items-center gap-2 font-mono text-[11px] font-bold text-amber-300">
                    <Info className="h-3.5 w-3.5 shrink-0" />
                    <span>No provider listings returned</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    {report.nearbyCompetitors.empty_provider_note ||
                      'No mapped business listings were returned by the directory provider within the 0–300m catchment. This indicates directory coverage limits or an informal/unindexed commercial strip, not proof of zero competition.'}
                  </p>
                </div>
              )}
            </div>

            {/* SUB-SECTION 2: VISUALLY OBSERVED CORRIDOR STOREFRONTS (0–300m) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-emerald-300">
                  <Store className="h-4 w-4" />
                  <span>Visually Observed Storefronts (0–300m Corridor)</span>
                </div>
                <span className="font-mono text-[10px] text-slate-400">
                  {report.groundReality.executed
                    ? `${report.nearbyCompetitors.visually_observed.length} storefronts`
                    : 'Street scan unexecuted'}
                </span>
              </div>

              {report.groundReality.executed ? (
                report.nearbyCompetitors.visually_observed.length > 0 ? (
                  <div className="space-y-2.5">
                    {report.nearbyCompetitors.visually_observed.map((obs) => {
                      const isUnidentified =
                        obs.verification_status === 'UNIDENTIFIED_STOREFRONT';

                      return (
                        <div
                          key={obs.id}
                          className={`rounded-2xl border p-3.5 space-y-1.5 transition-all ${
                            isUnidentified
                              ? 'border-white/[0.07] bg-white/[0.015]'
                              : 'border-emerald-400/25 bg-emerald-500/[0.035] hover:border-emerald-400/40'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4
                                  className={`text-sm font-semibold ${
                                    isUnidentified
                                      ? 'text-slate-300 italic'
                                      : 'text-white'
                                  }`}
                                >
                                  {obs.name}
                                </h4>
                                {!isUnidentified && obs.is_relevant_competitor && (
                                  <span className="rounded-md border border-emerald-400/40 bg-emerald-500/15 px-2 py-0.5 font-mono text-[9px] font-bold text-emerald-300">
                                    Observed Competitor
                                  </span>
                                )}
                                {isUnidentified && (
                                  <span className="rounded-md border border-white/10 bg-white/[0.05] px-2 py-0.5 font-mono text-[9px] text-slate-400">
                                    Unverified Name
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-300">
                                {obs.category}
                              </p>
                            </div>

                            <span
                              className={`rounded border px-2 py-0.5 font-mono text-[9.5px] font-semibold shrink-0 ${
                                isUnidentified
                                  ? 'border-white/15 bg-white/[0.05] text-slate-300'
                                  : 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200'
                              }`}
                            >
                              {obs.distance_label}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/[0.05] font-mono text-[10px]">
                            <span className="text-slate-400">
                              Source: {obs.source}
                            </span>
                            <span
                              className={
                                isUnidentified
                                  ? 'text-slate-400'
                                  : 'text-emerald-300'
                              }
                            >
                              {obs.confidence_label}
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    {report.nearbyCompetitors.unidentified_storefronts_count >
                      0 && (
                      <p className="font-mono text-[10.5px] text-slate-400 leading-relaxed bg-white/[0.02] border border-white/[0.06] rounded-xl p-2.5">
                        <span className="text-amber-300 font-semibold">Note on unverified signboards:</span>{' '}
                        {report.nearbyCompetitors.unidentified_storefronts_count}{' '}
                        observed storefronts had low-contrast or partially obscured signage. They are labeled as &quot;Unidentified storefront&quot; and not counted as category competitors without manual confirmation.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-4 space-y-2 text-xs">
                    <div className="flex items-center gap-2 font-mono text-[11px] font-bold text-slate-300">
                      <Info className="h-3.5 w-3.5 shrink-0" />
                      <span>No signboards reliably identified</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      {report.nearbyCompetitors.empty_observed_note ||
                        'Nearby competitors could not be identified reliably from the captured corridor imagery. Signage was obscured, low contrast, or absent.'}
                    </p>
                  </div>
                )
              ) : (
                <div className="rounded-2xl border border-indigo-400/25 bg-indigo-500/[0.04] p-4 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-mono text-xs font-bold text-indigo-200">
                      <span className="h-2 w-2 rounded-full bg-indigo-400" />
                      <span>Street Scan Not Executed</span>
                    </div>
                    <span className="rounded border border-indigo-400/30 bg-indigo-500/10 px-2 py-0.5 font-mono text-[9px] text-indigo-200">
                      OPTIONAL ENHANCEMENT
                    </span>
                  </div>
                  <p className="text-slate-200 leading-relaxed">
                    Physical storefronts, informal stalls, and signboards along the 0–300m corridor remain unverified on the ground. Analysis operates using structured geospatial database records.
                  </p>
                  <div className="pt-1 border-t border-indigo-400/15">
                    <button
                      type="button"
                      onClick={onBackToGroundReality}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-300/40 bg-indigo-500/20 px-3 py-1 font-mono text-[10px] font-semibold text-indigo-100 hover:bg-indigo-500/30 transition-colors"
                    >
                      <span>Run Street Scan in Stage 02 →</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ============================================================
            SECTIONS C & D: WHY THIS LOCATION MAY WORK & MAIN RISKS
           ============================================================ */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* SECTION C: WHY THIS LOCATION MAY WORK (MAX 3 EVIDENCE-BACKED REASONS) */}
          <section
            data-testid="report-section-why-it-works"
            aria-label="Why This Location May Work"
            className="liquid-glass-dark rounded-3xl border border-emerald-400/25 bg-emerald-500/[0.03] p-6 space-y-4 shadow-[0_16px_40px_rgba(0,0,0,0.4)] print:p-4 print:space-y-3 print:rounded-xl print:break-inside-avoid"
          >
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <h3 className="font-display text-base font-bold text-white uppercase tracking-wider">
                  Why This Location May Work
                </h3>
              </div>
              <span className="font-mono text-[10px] text-emerald-300">
                Top 3 Drivers
              </span>
            </div>

            <div className="space-y-3">
              {/* Card 1: Customer Fit */}
              <div className="rounded-2xl border border-emerald-400/20 bg-white/[0.025] p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-mono text-xs font-semibold text-white">
                    <Users className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Customer Fit &amp; Target Demographic</span>
                  </div>
                  <span
                    className={`rounded border px-2 py-0.5 font-mono text-[9.5px] font-bold ${
                      RATING_BADGE_STYLE[
                        report.marketOverview.customer_fit.level
                      ]
                    }`}
                  >
                    {report.marketOverview.customer_fit.level}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-slate-200">
                  {report.marketOverview.customer_fit.explanation} Aligns with configured target audience ({report.summary.target_customer}) and format envelope ({report.summary.budget}).
                </p>
              </div>

              {/* Card 2: Commercial Activity & Competition */}
              <div className="rounded-2xl border border-emerald-400/20 bg-white/[0.025] p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-mono text-xs font-semibold text-white">
                    <Store className="h-3.5 w-3.5 text-[#FB923C]" />
                    <span>Commercial Activity &amp; Cluster Synergy</span>
                  </div>
                  <span
                    className={`rounded border px-2 py-0.5 font-mono text-[9.5px] font-bold ${
                      RATING_BADGE_STYLE[
                        report.marketOverview.commercial_activity.level
                      ]
                    }`}
                  >
                    {report.marketOverview.commercial_activity.level}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-slate-200">
                  {report.marketOverview.commercial_activity.explanation} Nearby retail cluster supports footfall generation without total customer monopolization.
                </p>
              </div>

              {/* Card 3: Accessibility & Market Context */}
              <div className="rounded-2xl border border-emerald-400/20 bg-white/[0.025] p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-mono text-xs font-semibold text-white">
                    <Navigation className="h-3.5 w-3.5 text-[#818CF8]" />
                    <span>Accessibility &amp; Transit Reach</span>
                  </div>
                  <span
                    className={`rounded border px-2 py-0.5 font-mono text-[9.5px] font-bold ${
                      RATING_BADGE_STYLE[
                        report.marketOverview.accessibility.level
                      ]
                    }`}
                  >
                    {report.marketOverview.accessibility.level}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-slate-200">
                  {report.marketOverview.accessibility.explanation} Ensures seamless pedestrian arrival and road connectivity across the immediate micro-market.
                </p>
              </div>
            </div>
          </section>

          {/* SECTION D: MAIN RISKS AND CHECKS (MAX 3 PRIORITIZED RISKS) */}
          <section
            data-testid="report-section-main-risks"
            aria-label="Main Risks and Due Diligence Checks"
            className="liquid-glass-dark rounded-3xl border border-amber-400/25 bg-amber-500/[0.03] p-6 space-y-4 shadow-[0_16px_40px_rgba(0,0,0,0.4)] print:p-4 print:space-y-3 print:rounded-xl print:break-inside-avoid"
          >
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-400" />
                <h3 className="font-display text-base font-bold text-white uppercase tracking-wider">
                  Main Risks &amp; Checks
                </h3>
              </div>
              <span className="font-mono text-[10px] text-amber-300">
                Top 3 Decision Risks
              </span>
            </div>

            <div className="space-y-3">
              {/* Risk 1: Rent Commitment & Budget Uncertainty */}
              <div className="rounded-2xl border border-amber-400/20 bg-white/[0.025] p-4 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-amber-200">
                    01. Rent Commitment &amp; Budget Fit
                  </span>
                  <span className="rounded border border-amber-400/40 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[9px] font-bold text-amber-200">
                    FINANCIAL UNCERTAINTY
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-slate-200">
                  Commercial lease quotes and landlord deposit demands are unverified by online listings. Confirm total monthly rent and advance lock-in terms to guarantee costs stay strictly inside your {report.summary.budget} envelope.
                </p>
              </div>

              {/* Risk 2: Local Competition & Differentiation */}
              <div className="rounded-2xl border border-amber-400/20 bg-white/[0.025] p-4 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-amber-200">
                    02. Competition &amp; Saturation Risk
                  </span>
                  <span className="rounded border border-amber-400/40 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[9px] font-bold text-amber-200">
                    MARKET PRESSURE
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-slate-200">
                  {report.nearbyCompetitors.provider_listed.length > 0
                    ? `With ${report.nearbyCompetitors.total_identified_competitors} competitors or related businesses identified within the 0–300m corridor, viability depends on clear menu differentiation, distinctive ambiance, and pricing discipline.`
                    : 'Registry listings returned 0 mapped competitors, which may reflect unindexed local stalls or informal vendors rather than zero competition. On-site verification is critical.'}
                </p>
              </div>

              {/* Risk 3: Evidence Scope & Quality */}
              <div className="rounded-2xl border border-amber-400/20 bg-white/[0.025] p-4 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-amber-200">
                    03. Evidence Scope &amp; Corridor Boundaries
                  </span>
                  <span className="rounded border border-amber-400/40 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[9px] font-bold text-amber-200">
                    DATA BOUNDARY
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-slate-200">
                  {report.groundReality.executed
                    ? 'Visual evidence reflects the 0–300m camera line-of-sight corridor at the time of recording. Wider neighborhood dynamics (300m–2km) and evening trade shifts rely on provider baselines.'
                    : 'Ground reality has not been visually verified with street footage. Physical storefront signboards, informal stalls, and peak pedestrian flow remain unconfirmed.'}
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* ============================================================
            SECTION E: RECOMMENDED NEXT ACTION & SCENARIO SIMULATOR
           ============================================================ */}
        <section
          data-testid="report-section-next-actions"
          aria-label="Recommended Next Action and Scenario Simulator"
          className="liquid-glass-dark rounded-3xl border border-[#FB923C]/35 bg-[linear-gradient(135deg,rgba(251,146,60,0.08)_0%,rgba(192,132,252,0.05)_100%)] p-6 sm:p-7 space-y-6 shadow-[0_16px_50px_rgba(0,0,0,0.5)] print:p-4 print:space-y-3 print:rounded-xl print:break-inside-avoid"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Clear Personalized Priority Next Action */}
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-2">
                <Compass className="h-4 w-4 text-[#FB923C]" />
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#FDBA74]">
                  RECOMMENDED NEXT ACTION BEFORE SPENDING CAPITAL
                </span>
              </div>

              <div className="glass-sub-card rounded-2xl border border-[#FB923C]/30 p-4 space-y-2">
                <h4 className="text-sm sm:text-base font-semibold text-white leading-relaxed">
                  {report.executiveSummary.what_to_do_before_spending}
                </h4>
                <p className="font-mono text-xs text-slate-300">
                  Verification advice tailored to your format ({report.summary.business_type}) and budget envelope ({report.summary.budget}).
                </p>
              </div>
            </div>

            {/* Compact Scenario Simulator Summary (Does not dominate report) */}
            <div
              data-testid="report-section-scenario-impact"
              className="glass-sub-card rounded-2xl border border-white/10 p-4 space-y-3 shrink-0 lg:max-w-md w-full"
            >
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
                <div className="flex items-center gap-2">
                  <Sliders className="h-3.5 w-3.5 text-[#E879F9]" />
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-300">
                    Scenario Sensitivity Check
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onBackToIntelligence}
                  className="font-mono text-[10px] font-semibold text-[#E879F9] hover:underline"
                >
                  Adjust in 03 →
                </button>
              </div>

              {/* 3 Compact Variable Deltas */}
              <div className="grid grid-cols-3 gap-2 font-mono text-xs text-center">
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-2">
                  <span className="block text-[9px] text-slate-400">RENT</span>
                  <span
                    data-testid="report-scenario-rent"
                    className="font-bold text-white text-[11px]"
                  >
                    {report.scenario.formatted_deltas.rent}
                  </span>
                </div>

                <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-2">
                  <span className="block text-[9px] text-slate-400">ACTIVITY</span>
                  <span
                    data-testid="report-scenario-activity"
                    className="font-bold text-white text-[11px]"
                  >
                    {report.scenario.formatted_deltas.activity}
                  </span>
                </div>

                <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-2">
                  <span className="block text-[9px] text-slate-400">COMPETITION</span>
                  <span
                    data-testid="report-scenario-competition"
                    className="font-bold text-white text-[11px]"
                  >
                    {report.scenario.formatted_deltas.competition}
                  </span>
                </div>
              </div>

              <div className="space-y-1 font-mono text-[10.5px]">
                <div className="flex items-center justify-between text-slate-300">
                  <span>Posture Shift:</span>
                  <span className="font-semibold text-[#FDBA74]">
                    {report.scenario.baseline_posture} → {report.scenario.scenario_posture}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 leading-normal font-sans">
                  {report.scenario.sensitivity_summary}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================
            COLLAPSED AUDIT SECTION: TECHNICAL EVIDENCE & LIMITATIONS
           ============================================================ */}
        <section
          data-testid="report-section-technical-accordion"
          className="liquid-glass-dark rounded-3xl border border-white/[0.12] overflow-hidden transition-all duration-300"
        >
          {/* Collapsible Accordion Header */}
          <button
            type="button"
            data-testid="report-technical-accordion-toggle"
            onClick={() => setIsTechOpen((prev) => !prev)}
            className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 sm:p-6 text-left hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-start sm:items-center gap-3">
              <div className="rounded-xl border border-white/15 bg-white/[0.05] p-2 shrink-0">
                <Sliders className="h-4 w-4 text-slate-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display text-sm sm:text-base font-bold text-white tracking-wide">
                    Technical evidence &amp; limitations
                  </span>
                  <span className="rounded-md border border-white/15 bg-white/[0.06] px-2 py-0.5 font-mono text-[9px] text-slate-300">
                    FOR JUDGES &amp; AUDITORS
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-400 font-mono">
                  Full multi-source evidence ledger ({report.evidenceLedger.length} items), 8-factor evaluation matrix, detector telemetry &amp; spatial map preview.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 font-mono text-xs font-semibold text-slate-300 shrink-0">
              <span>{isTechOpen ? 'Collapse audit details' : 'Expand audit details'}</span>
              {isTechOpen ? (
                <ChevronUp className="h-4 w-4 text-slate-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-400" />
              )}
            </div>
          </button>

          {/* Accordion Content (Revealed when open) */}
          {isTechOpen && (
            <div className="border-t border-white/[0.10] p-5 sm:p-6 space-y-6 bg-black/[0.25]">
              {/* 1. TRACEABLE EVIDENCE LEDGER TABLE */}
              <div
                data-testid="report-section-evidence-ledger"
                className="space-y-3"
              >
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-[#818CF8]" />
                    <h4 className="font-display text-sm font-bold text-white">
                      Multi-Source Traceable Evidence Ledger
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-slate-400">
                      {report.evidenceLedger.length} logged items
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsLedgerExpanded((prev) => !prev)}
                      className="text-xs font-mono text-slate-300 hover:text-white underline"
                    >
                      {isLedgerExpanded ? 'Minimize' : 'Show all'}
                    </button>
                  </div>
                </div>

                {isLedgerExpanded ? (
                  <div className="overflow-x-auto custom-scrollbar rounded-2xl border border-white/[0.08]">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="border-b border-white/[0.10] font-mono text-[10px] uppercase tracking-wider text-slate-400 bg-white/[0.03]">
                          <th className="py-2.5 px-3">Evidence</th>
                          <th className="py-2.5 px-3">Source</th>
                          <th className="py-2.5 px-3">Type</th>
                          <th className="py-2.5 px-3">Confidence / Metric</th>
                          <th className="py-2.5 px-3">Interpretation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.06]">
                        {report.evidenceLedger.map((item) => {
                          const badge = EVIDENCE_BADGE_STYLE[item.type];
                          return (
                            <tr
                              key={item.id}
                              className="hover:bg-white/[0.02]"
                            >
                              <td className="py-2 px-3 font-semibold text-white">
                                {item.evidence}
                              </td>
                              <td className="py-2 px-3 font-mono text-[11px] text-slate-300">
                                {item.source}
                              </td>
                              <td className="py-2 px-3">
                                <span
                                  className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 font-mono text-[9px] font-semibold ${badge.bg}`}
                                >
                                  <span
                                    className={`h-1.5 w-1.5 rounded-full ${badge.dot}`}
                                  />
                                  {badge.label}
                                </span>
                              </td>
                              <td className="py-2 px-3 font-mono text-[11px] text-slate-200">
                                {item.confidence}
                              </td>
                              <td className="py-2 px-3 text-slate-300">
                                {item.interpretation}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="font-mono text-xs text-slate-400">
                    Table collapsed. Click &quot;Show all&quot; to inspect all {report.evidenceLedger.length} evidence rows.
                  </p>
                )}
              </div>

              {/* 2. LOCATION INTELLIGENCE 8-FACTOR MATRIX */}
              <div
                data-testid="report-section-intelligence"
                className="space-y-3"
              >
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
                  <h4 className="font-display text-sm font-bold text-white">
                    8-Factor Location Intelligence Matrix
                  </h4>
                  <span className="font-mono text-[10px] text-slate-400">
                    Mode: {report.intelligence.active_mode}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {report.intelligence.factors.map((factor) => {
                    const isRisk = factor.key === 'risk';
                    const badgeStyle = isRisk
                      ? RISK_RATING_BADGE_STYLE[factor.rating]
                      : RATING_BADGE_STYLE[factor.rating];
                    const evStyle = EVIDENCE_BADGE_STYLE[factor.evidence_type];

                    return (
                      <div
                        key={factor.key}
                        data-testid={`report-factor-${factor.key}`}
                        className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-3 space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-semibold text-white truncate">
                            {factor.label}
                          </span>
                          <span
                            className={`rounded border px-1.5 py-0.5 font-mono text-[9px] font-bold shrink-0 ${badgeStyle}`}
                          >
                            {factor.rating}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-normal">
                          {factor.explanation}
                        </p>
                        <div className="pt-1 border-t border-white/[0.05] flex items-center justify-between font-mono text-[8.5px]">
                          <span className={evStyle.bg}>{evStyle.label}</span>
                          <span className="text-slate-400 truncate">
                            {factor.underlying_sources[0]}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3. GROUND REALITY DETECTOR & SENSOR TELEMETRY */}
              <div
                data-testid="report-section-ground-reality"
                className="space-y-3"
              >
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
                  <h4 className="font-display text-sm font-bold text-white">
                    Ground Reality Computer Vision &amp; Detector Telemetry
                  </h4>
                  <span className="font-mono text-[10px] text-slate-400">
                    {report.groundReality.status_badge}
                  </span>
                </div>

                {report.groundReality.executed && report.groundReality.scan_metadata ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 font-mono text-xs">
                    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-2.5">
                      <span className="block text-[9px] text-slate-400">OBJECT DETECTOR</span>
                      <span className="font-bold text-white">
                        {report.groundReality.scan_metadata.detector_engine}
                      </span>
                    </div>
                    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-2.5">
                      <span className="block text-[9px] text-slate-400">OCR ENGINE</span>
                      <span className="font-bold text-white">
                        {report.groundReality.scan_metadata.ocr_engine}
                      </span>
                    </div>
                    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-2.5">
                      <span className="block text-[9px] text-slate-400">SAMPLED FRAMES</span>
                      <span className="font-bold text-white">
                        {report.groundReality.scan_metadata.frames_extracted} frames
                      </span>
                    </div>
                    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-2.5">
                      <span className="block text-[9px] text-slate-400">TOTAL COCO DETECTIONS</span>
                      <span className="font-bold text-emerald-300">
                        {report.groundReality.counts.total_coco_detections} objects
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 font-mono">
                    Street scan sensor telemetry not captured. Running in database-baseline mode.
                  </p>
                )}
              </div>

              {/* 4. MAP VS REALITY CORRIDOR RECONCILIATION */}
              <div
                data-testid="report-section-map-vs-reality"
                className="space-y-3"
              >
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
                  <h4 className="font-display text-sm font-bold text-white">
                    0–300m Corridor Reconciliation (Fusion Ledger)
                  </h4>
                  <span className="font-mono text-[10px] text-slate-400">
                    Matched: {report.mapVsReality.matched} · Additional signals: +{report.mapVsReality.additional_observed_signals}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-mono">
                  {report.mapVsReality.reconciliation_note}
                </p>
              </div>

              {/* 5. EPISTEMIC BOUNDARIES & DATA LIMITATIONS */}
              <div
                data-testid="report-section-risks-limitations"
                className="space-y-3"
              >
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
                  <h4 className="font-display text-sm font-bold text-white">
                    Epistemic Boundaries &amp; Data Limitations
                  </h4>
                  <span className="font-mono text-[10px] text-slate-400">
                    Uncertainty Disclosures
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {report.risksAndLimitations.map((lim) => (
                    <div
                      key={lim.id}
                      className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3 space-y-1"
                    >
                      <span className="block font-mono text-[10px] font-bold text-amber-300">
                        {lim.scope}
                      </span>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        {lim.statement}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 6. SPATIAL MAP PREVIEW */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
                  <h4 className="font-display text-sm font-bold text-white">
                    Candidate Spatial Context Map
                  </h4>
                  <span className="font-mono text-[10px] text-slate-400">
                    0–300m / 2km / 5km Radius
                  </span>
                </div>

                <div className="h-[260px] w-full overflow-hidden rounded-2xl border border-white/[0.10]">
                  <MarketDiscoveryMap
                    analysis={mapAnalysis}
                    onUpdateCoordinates={() => {}}
                    preferFallback={preferFallback}
                  />
                </div>
              </div>
            </div>
          )}
        </section>

        {/* PRINT FOOTER */}
        <div className="hidden print:block text-center font-mono text-[9pt] text-slate-500 border-t pt-3 mt-4">
          LOCUS AI Multi-Modal Spatial Engine · Findings depend on available geospatial registries &amp; specified assumptions.
        </div>
      </div>
    </section>
  );
};
