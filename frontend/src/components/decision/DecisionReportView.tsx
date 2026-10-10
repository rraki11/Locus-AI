import React, { useCallback, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Compass,
  FileText,
  Printer,
  ShieldAlert,
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
  DecisionReportHandoffPayload,
  ShortDecisionPosture,
} from '../../types/decisionReport';
import { buildMarketEntryReport } from '../../utils/decisionReportBuilder';

export interface DecisionReportViewProps {
  handoff: DecisionReportHandoffPayload;
  preferFallback?: boolean;
  onBackToMarketDiscovery: () => void;
  onBackToGroundReality: () => void;
  onBackToIntelligence: () => void;
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

const SHORT_POSTURE_STYLE: Record<
  ShortDecisionPosture,
  { border: string; pill: string; accent: string }
> = {
  FAVORABLE: {
    border: 'border-emerald-400/40 bg-emerald-500/[0.07]',
    pill: 'border-emerald-400/50 bg-emerald-500/20 text-emerald-200',
    accent: 'text-emerald-300',
  },
  MIXED: {
    border: 'border-[#818CF8]/40 bg-[#4F46E5]/[0.09]',
    pill: 'border-[#818CF8]/50 bg-[#4F46E5]/25 text-[#C7D2FE]',
    accent: 'text-[#C7D2FE]',
  },
  CAUTION: {
    border: 'border-amber-400/40 bg-amber-500/[0.08]',
    pill: 'border-amber-400/50 bg-amber-500/20 text-amber-200',
    accent: 'text-amber-200',
  },
  WEAK: {
    border: 'border-rose-400/45 bg-rose-500/[0.09]',
    pill: 'border-rose-400/50 bg-rose-500/20 text-rose-200',
    accent: 'text-rose-200',
  },
};

const PLAIN_OUTCOME_THEME_STYLE: Record<
  'emerald' | 'amber' | 'rose' | 'slate',
  { border: string; pill: string; badge: string; text: string; bg: string }
> = {
  emerald: {
    border: 'border-emerald-400/40 bg-emerald-500/[0.07]',
    pill: 'border-emerald-400/50 bg-emerald-500/20 text-emerald-200',
    badge: 'border-emerald-400/40 bg-emerald-500/15 text-emerald-300',
    text: 'text-emerald-300',
    bg: 'bg-emerald-500/[0.04]',
  },
  amber: {
    border: 'border-amber-400/40 bg-amber-500/[0.08]',
    pill: 'border-amber-400/50 bg-amber-500/20 text-amber-200',
    badge: 'border-amber-400/40 bg-amber-500/15 text-amber-300',
    text: 'text-amber-300',
    bg: 'bg-amber-500/[0.04]',
  },
  rose: {
    border: 'border-rose-400/45 bg-rose-500/[0.09]',
    pill: 'border-rose-400/50 bg-rose-500/20 text-rose-200',
    badge: 'border-rose-400/40 bg-rose-500/15 text-rose-300',
    text: 'text-rose-300',
    bg: 'bg-rose-500/[0.04]',
  },
  slate: {
    border: 'border-slate-500/40 bg-slate-500/[0.08]',
    pill: 'border-slate-400/50 bg-slate-500/20 text-slate-200',
    badge: 'border-slate-400/40 bg-slate-500/15 text-slate-300',
    text: 'text-slate-300',
    bg: 'bg-slate-500/[0.04]',
  },
};

export const DecisionReportView: React.FC<DecisionReportViewProps> = ({
  handoff,
  preferFallback = false,
  onBackToMarketDiscovery,
  onBackToGroundReality,
  onBackToIntelligence,
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
        customCandidateLabel: handoff?.candidateName || DEMO_LOCATION_PRESETS[0].candidateName,
        marketBaseline: handoff?.marketBaseline,
      }),
    [handoff, safeCoords]
  );

  const postureStyle = SHORT_POSTURE_STYLE[report.summary.short_posture];
  const outcomeStyle =
    PLAIN_OUTCOME_THEME_STYLE[report.executiveSummary.outcome_theme] ??
    PLAIN_OUTCOME_THEME_STYLE.amber;

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

  const [isLedgerOpen, setIsLedgerOpen] = useState<boolean>(true);

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
      {/* Shared Continuous Looping Ambient Intelligence Field (Screen only) */}
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
        <div className="mx-auto flex max-w-[1680px] flex-wrap items-center justify-between gap-4 px-6 py-2.5 sm:px-10">
          <div className="flex items-center gap-3.5">
            <div className="flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full bg-gradient-to-tr from-[#092D25] via-[#0F8B68] to-[#72D9B0] shadow-[0_0_10px_rgba(114,217,176,0.9)]"
                aria-hidden="true"
              />
              <span className="font-display text-sm font-bold tracking-[0.12em] text-white">
                LOCUS AI
              </span>
            </div>
            <span className="h-3.5 w-px bg-white/15" aria-hidden="true" />
            <span className="bg-gradient-to-r from-[#72D9B0] via-[#0F8B68] to-[#E9F7F0] bg-clip-text text-xs font-semibold text-transparent">
              04 / Decision — Explainable Market Entry Report
            </span>
          </div>

          {/* 4-View Workspace Sequence Stepper */}
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

      {/* MAIN REPORT DOCUMENT CONTAINER */}
      <div className="relative z-10 mx-auto max-w-[1680px] space-y-5 px-6 py-5 sm:px-10 print:max-w-none print:p-0 print:m-0 print:space-y-2">
        {/* DEDICATED PRINT REPORT HEADER (Only renders during print / PDF export) */}
        <div className="hidden print-report-header">
          <div className="flex items-center gap-3">
            <span className="font-display text-lg font-bold tracking-wider text-[#092D25]">
              LOCUS AI
            </span>
            <span className="text-xs font-semibold text-[#0F8B68] font-mono">
              EXPLAINABLE MARKET ENTRY REPORT
            </span>
          </div>
          <div className="text-right font-mono text-[9pt] text-[#475569]">
            <div><strong>Candidate:</strong> {report.summary.candidate_location} ({report.summary.city}, {report.summary.state})</div>
            <div><strong>Profile:</strong> {report.summary.business_type} · <strong>Budget:</strong> {report.summary.budget}</div>
          </div>
        </div>

        {/* Prominent Stage Identity Strip */}
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
            EXECUTIVE SUMMARY (TOP OF VIEW 04: PLAIN-LANGUAGE EXECUTIVE BRIEF)
           ============================================================ */}
        <section
          data-testid="report-executive-summary"
          aria-label="Executive Decision Summary"
          className={`liquid-glass-dark rounded-3xl border p-5 sm:p-7 space-y-6 ${outcomeStyle.border} shadow-[0_20px_50px_rgba(0,0,0,0.6)] print:p-3 print:space-y-2 print:rounded-xl print:shadow-none print:break-inside-avoid print:break-after-page`}
        >
          {/* Header Row: Location, Business Type, Direct Plain-Language Decision */}
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start border-b border-white/[0.08] pb-5 print:flex-row print:items-start print:gap-3 print:pb-2">
            <div className="space-y-2.5 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-md border border-[#F59E0B]/50 bg-[#F59E0B]/15 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#FCD34D]">
                  <Sparkles className="h-3 w-3" />
                  PLAIN-LANGUAGE SUMMARY · EXECUTIVE BRIEF
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
                  {report.summary.candidate_location} —{' '}
                  <span className="text-[#FCD34D]">{report.summary.business_type}</span>
                </h1>
                <p className="font-mono text-xs text-slate-400 mt-1">
                  Budget: <span className="text-slate-200">{report.summary.budget}</span> · Target Customers: <span className="text-slate-200">{report.summary.target_customer}</span> · Format: <span className="text-slate-200">{report.summary.expansion_objective}</span>
                </p>
                <p className="font-mono text-[11px] text-slate-300/80 mt-1.5 flex items-center gap-1.5">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-400" />
                  <span>{report.executiveSummary.scope_explanation}</span>
                </p>
              </div>

              {/* Direct Plain-Language Decision Answer */}
              <div className="pt-1">
                <span
                  data-testid="executive-posture-badge"
                  className={`inline-block rounded-xl border px-3.5 py-1.5 font-mono text-sm sm:text-base font-extrabold tracking-wide ${outcomeStyle.pill}`}
                >
                  {report.executiveSummary.outcome}
                </span>
              </div>

              {/* Clear narrative explanation answering the 4 questions in everyday language */}
              <p className="max-w-4xl text-xs sm:text-sm leading-relaxed text-slate-200 font-medium">
                {report.executiveSummary.plain_explanation}
              </p>

              {report.executiveSummary.is_provisional && (
                <p className="text-[11.5px] leading-relaxed text-amber-300/90 font-mono flex items-center gap-1.5 pt-0.5">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                  <span>{report.executiveSummary.provisional_reason}</span>
                </p>
              )}
            </div>

            {/* Quick Analytical Context Sub-box */}
            <div className="glass-sub-card flex flex-col items-start rounded-2xl p-3.5 lg:items-end shrink-0 shadow-lg">
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-slate-400">
                ANALYTICAL POSTURE
              </span>
              <div className="mt-1 flex items-center gap-2">
                <span className={`rounded-xl border px-3 py-1 font-mono text-xs font-bold tracking-wider ${postureStyle.pill}`}>
                  {report.summary.short_posture}
                </span>
              </div>
              <span className="mt-1 font-mono text-[10px] text-slate-300">
                {report.summary.engine_posture_level}
              </span>
            </div>
          </div>

          {/* Three Compact, Readable Groups: Why it may work, What could go wrong, What to do first */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 print:grid-cols-3 print:gap-2">
            {/* 1. WHY THIS LOCATION MAY WORK */}
            <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/[0.04] p-4 flex flex-col justify-between space-y-3">
              <div className="space-y-3">
                <div className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Why This Location May Work</span>
                </div>

                <div className="space-y-2.5">
                  {report.executiveSummary.why_it_may_work.map((item, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-emerald-400/25 bg-white/[0.04] p-2.5 space-y-1 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]"
                    >
                      <div className="flex items-start gap-2">
                        <span className="font-mono text-xs font-bold text-emerald-400 shrink-0">
                          0{idx + 1}.
                        </span>
                        <p className="text-xs leading-relaxed text-slate-100 font-medium">
                          {item.point}
                        </p>
                      </div>
                      <div className="pl-5">
                        <span className="inline-block rounded border border-emerald-400/30 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[8.5px] font-semibold text-emerald-200">
                          {item.source_tag}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 2. WHAT COULD GO WRONG */}
            <div className="rounded-2xl border border-amber-400/25 bg-amber-500/[0.04] p-4 flex flex-col justify-between space-y-3">
              <div className="space-y-3">
                <div className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-wider text-amber-300">
                  <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0" />
                  <span>What Could Go Wrong</span>
                </div>

                <div className="space-y-2.5">
                  {report.executiveSummary.what_could_go_wrong.map((item, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-amber-400/25 bg-white/[0.04] p-2.5 space-y-1 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]"
                    >
                      <div className="flex items-start gap-2">
                        <span className="font-mono text-xs font-bold text-amber-400 shrink-0">
                          !
                        </span>
                        <p className="text-xs leading-relaxed text-slate-100 font-medium">
                          {item.point}
                        </p>
                      </div>
                      <div className="pl-4">
                        <span className="inline-block rounded border border-amber-400/30 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[8.5px] font-semibold text-amber-200">
                          {item.source_tag}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. WHAT TO DO BEFORE SPENDING MONEY */}
            <div className="rounded-2xl border border-[#FB923C]/35 bg-[linear-gradient(135deg,rgba(251,146,60,0.1)_0%,rgba(192,132,252,0.06)_100%)] p-4 flex flex-col justify-between space-y-3">
              <div className="space-y-3">
                <div className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-wider text-[#FDBA74]">
                  <Compass className="h-4 w-4 text-[#FB923C] shrink-0" />
                  <span>What To Do Before Spending Money</span>
                </div>

                <div className="glass-sub-card rounded-xl border border-[#FB923C]/30 p-3 space-y-2">
                  <span className="inline-block rounded border border-[#FB923C]/40 bg-[#FB923C]/15 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-[#FED7AA]">
                    Priority Next Action
                  </span>
                  <p className="text-xs leading-relaxed text-slate-100 font-medium">
                    {report.executiveSummary.what_to_do_before_spending}
                  </p>
                </div>
              </div>

              <div className="pt-2 text-[11px] text-slate-300 font-mono">
                Verification advice personalized to your target budget and format.
              </div>
            </div>
          </div>

          {/* Neutral Evidence Coverage Summary (Explicitly separates data coverage from recommendation quality) */}
          <div
            data-testid="evidence-coverage-summary-grid"
            className="glass-sub-card rounded-2xl p-4 space-y-2.5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] pb-2">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-slate-300">
                Evidence Coverage Summary
              </span>
              <span className="font-mono text-[9.5px] text-slate-400">
                Independent coverage metrics across four operational dimensions
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4 font-mono text-xs print:grid-cols-4 print:gap-1.5">
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.035] p-2.5 space-y-1 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
                <span className="block text-[9.5px] uppercase tracking-wider text-slate-400">
                  Business listings
                </span>
                <span className="block font-semibold text-slate-100">
                  {report.executiveSummary.evidence_coverage.business_listings_label}
                </span>
              </div>

              <div className="rounded-xl border border-white/[0.08] bg-white/[0.035] p-2.5 space-y-1 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
                <span className="block text-[9.5px] uppercase tracking-wider text-slate-400">
                  Geographic context
                </span>
                <span className="block font-semibold text-slate-100">
                  {report.executiveSummary.evidence_coverage.geographic_context_label}
                </span>
              </div>

              <div className="rounded-xl border border-white/[0.08] bg-white/[0.035] p-2.5 space-y-1 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
                <span className="block text-[9.5px] uppercase tracking-wider text-slate-400">
                  Street-level visual evidence
                </span>
                <span className="block font-semibold text-slate-100">
                  {report.executiveSummary.evidence_coverage.street_visual_evidence_label}
                </span>
              </div>

              <div className="rounded-xl border border-white/[0.08] bg-white/[0.035] p-2.5 space-y-1 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
                <span className="block text-[9.5px] uppercase tracking-wider text-slate-400">
                  Rent &amp; operating costs
                </span>
                <span className="block font-semibold text-slate-100">
                  {report.executiveSummary.evidence_coverage.rent_operating_costs_label}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Jump Anchor to Detailed 9-Section Audit */}
          <div className="pt-2 border-t border-white/[0.07] flex flex-wrap items-center justify-between gap-3">
            <span className="font-mono text-[10.5px] text-slate-400">
              Target: {report.summary.city}, {report.summary.state} · Envelope: {report.summary.budget} · Audience: {report.summary.target_customer}
            </span>
            <a
              href="#detailed-analytical-report"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.04] px-3 py-1 font-mono text-[10.5px] font-semibold text-slate-300 hover:border-white/30 hover:text-white transition-colors"
            >
              <span>Review detailed technical evidence below (9 sections)</span>
              <ArrowDown className="h-3 w-3 text-[#FB923C]" />
            </a>
          </div>
        </section>

        {/* Anchor for Smooth Jump */}
        <div id="detailed-analytical-report" className="pt-2" />

        {/* ============================================================
            SECTION 1: MARKET ENTRY SUMMARY (TOP HEADER)
           ============================================================ */}
        <div
          data-testid="report-section-summary"
          className={`liquid-glass-dark rounded-3xl border p-5 sm:p-6 ${postureStyle.border}`}
        >
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[#FB923C]">
                  <FileText className="h-3.5 w-3.5" />
                  1. MARKET ENTRY SUMMARY
                </span>
                <span className="rounded-md border border-white/15 bg-white/[0.06] px-2 py-0.5 font-mono text-[9.5px] text-slate-300">
                  {report.data_mode === 'LIVE'
                    ? 'LIVE PROVIDER BASELINE'
                    : 'CALIBRATED BASELINE'}
                </span>
                <span
                  className={`rounded-md border px-2 py-0.5 font-mono text-[9.5px] font-semibold ${
                    EVIDENCE_BADGE_STYLE[report.summary.posture_evidence_type]
                      .bg
                  }`}
                >
                  {report.summary.posture_evidence_type}
                </span>
              </div>

              <h1 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {report.summary.candidate_location} —{' '}
                {report.summary.business_type} Entry Assessment
              </h1>
              <p className="max-w-3xl text-xs leading-relaxed text-slate-300 sm:text-sm">
                {report.summary.posture_headline}
              </p>
            </div>

            {/* Concise Decision Posture Badge (Explicitly NOT an AI Score) */}
            <div className="glass-sub-card flex flex-col items-start rounded-2xl px-4 py-3 lg:items-end shadow-md">
              <span className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-slate-400">
                DECISION POSTURE (ENGINE-DERIVED)
              </span>
              <div className="mt-1 flex items-center gap-2">
                <span
                  data-testid="report-summary-posture"
                  className={`rounded-lg border px-3 py-1 font-mono text-sm font-bold tracking-wider ${postureStyle.pill}`}
                >
                  {report.summary.short_posture}
                </span>
              </div>
              <span className="mt-1 font-mono text-[10px] text-slate-400">
                {report.summary.engine_posture_level}
              </span>
            </div>
          </div>

          {/* Structured Metadata Row */}
          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/[0.10] pt-4 sm:grid-cols-4 lg:grid-cols-7">
            <div>
              <span className="block font-mono text-[9.5px] uppercase tracking-wider text-slate-400">
                Business Type
              </span>
              <span className="mt-0.5 block text-xs font-semibold text-white">
                {report.summary.business_type}
              </span>
            </div>
            <div>
              <span className="block font-mono text-[9.5px] uppercase tracking-wider text-slate-400">
                Target Customer
              </span>
              <span className="mt-0.5 block text-xs font-semibold text-white">
                {report.summary.target_customer}
              </span>
            </div>
            <div>
              <span className="block font-mono text-[9.5px] uppercase tracking-wider text-slate-400">
                Budget
              </span>
              <span className="mt-0.5 block font-mono text-xs font-semibold text-[#FDBA74]">
                {report.summary.budget}
              </span>
            </div>
            <div>
              <span className="block font-mono text-[9.5px] uppercase tracking-wider text-slate-400">
                Target City
              </span>
              <span className="mt-0.5 block text-xs font-semibold text-white">
                {report.summary.city}, {report.summary.state}
              </span>
            </div>
            <div>
              <span className="block font-mono text-[9.5px] uppercase tracking-wider text-slate-400">
                Local Area
              </span>
              <span className="mt-0.5 block text-xs font-semibold text-white">
                {report.summary.local_area}
              </span>
            </div>
            <div>
              <span className="block font-mono text-[9.5px] uppercase tracking-wider text-slate-400">
                Candidate Coordinates
              </span>
              <span className="mt-0.5 block font-mono text-xs text-slate-200">
                {report.summary.coordinates.lat.toFixed(4)}°N,{' '}
                {report.summary.coordinates.lng.toFixed(4)}°E
              </span>
            </div>
            <div>
              <span className="block font-mono text-[9.5px] uppercase tracking-wider text-slate-400">
                Analysis Timestamp
              </span>
              <span className="mt-0.5 block font-mono text-[11px] text-slate-300">
                {new Date(report.summary.analysis_timestamp).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* ============================================================
            MIDDLE DOCUMENT GRID: LEFT / MAIN (SECTIONS 2, 3, 4, 5) + RIGHT (MAP + SECTION 6 + COVERAGE)
           ============================================================ */}
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
          {/* LEFT / MAIN DOCUMENT COLUMN */}
          <div className="space-y-5 xl:col-span-8">
            {/* SECTION 2: MARKET OVERVIEW */}
            <section
              data-testid="report-section-market-overview"
              className="liquid-glass-dark rounded-3xl p-5 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
                <div>
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#818CF8]">
                    2. MARKET OVERVIEW
                  </span>
                  <h2 className="mt-0.5 font-display text-base font-bold text-white">
                    Structured Spatial Baseline ({report.marketOverview.source_label})
                  </h2>
                </div>
                <span
                  className={`rounded-md border px-2 py-0.5 font-mono text-[9.5px] font-semibold ${EVIDENCE_BADGE_STYLE.DATABASE.bg}`}
                >
                  DATABASE / Google Places baseline
                </span>
              </div>

              {/* 3 Spatial Bands */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-3.5">
                  <div className="flex items-center justify-between font-mono text-[10px] text-slate-400">
                    <span>0–300m BAND</span>
                    <span className="text-[#FB923C]">GROUND REALITY ZONE</span>
                  </div>
                  <p className="mt-1.5 font-mono text-2xl font-bold text-white">
                    {report.marketOverview.mapped_0_300m}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    Mapped competitors returned by provider
                  </p>
                </div>

                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-3.5">
                  <div className="flex items-center justify-between font-mono text-[10px] text-slate-400">
                    <span>300m–2km BAND</span>
                    <span className="text-[#818CF8]">LOCAL MARKET</span>
                  </div>
                  <p className="mt-1.5 font-mono text-2xl font-bold text-white">
                    {report.marketOverview.mapped_300m_2km}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    Mapped competitors returned by provider
                  </p>
                </div>

                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-3.5">
                  <div className="flex items-center justify-between font-mono text-[10px] text-slate-400">
                    <span>2–5km BAND</span>
                    <span className="text-[#E879F9]">WIDER MARKET</span>
                  </div>
                  <p className="mt-1.5 font-mono text-2xl font-bold text-white">
                    {report.marketOverview.mapped_2_5km}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    Mapped competitors returned by provider
                  </p>
                </div>
              </div>

              {/* Baseline Indicators: Commercial Activity, Accessibility, Customer Fit */}
              <div className="grid grid-cols-1 gap-3 border-t border-white/[0.07] pt-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
                      Commercial Activity
                    </span>
                    <span
                      className={`rounded border px-1.5 py-0.5 font-mono text-[9.5px] font-bold ${
                        RATING_BADGE_STYLE[
                          report.marketOverview.commercial_activity.level
                        ]
                      }`}
                    >
                      {report.marketOverview.commercial_activity.level}
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-300">
                    {report.marketOverview.commercial_activity.explanation}
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
                      Accessibility
                    </span>
                    <span
                      className={`rounded border px-1.5 py-0.5 font-mono text-[9.5px] font-bold ${
                        RATING_BADGE_STYLE[
                          report.marketOverview.accessibility.level
                        ]
                      }`}
                    >
                      {report.marketOverview.accessibility.level}
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-300">
                    {report.marketOverview.accessibility.explanation}
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
                      Customer Fit
                    </span>
                    <span
                      className={`rounded border px-1.5 py-0.5 font-mono text-[9.5px] font-bold ${
                        RATING_BADGE_STYLE[
                          report.marketOverview.customer_fit.level
                        ]
                      }`}
                    >
                      {report.marketOverview.customer_fit.level}
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-300">
                    {report.marketOverview.customer_fit.explanation}
                  </p>
                </div>
              </div>
            </section>

            {/* SECTION 3 & SECTION 4: GROUND REALITY + MAP VS REALITY */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
              {/* SECTION 3: GROUND REALITY */}
              <section
                data-testid="report-section-ground-reality"
                className="liquid-glass-dark rounded-3xl p-5 space-y-3.5 lg:col-span-7"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
                  <div>
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                      3. GROUND REALITY (0–300m CORRIDOR)
                    </span>
                    <h2 className="mt-0.5 font-display text-base font-bold text-white">
                      Street-Level Visual Verification
                    </h2>
                  </div>
                  <span
                    data-testid="report-ground-reality-status"
                    className={`rounded-md border px-2 py-0.5 font-mono text-[9.5px] font-semibold ${
                      report.groundReality.executed
                        ? EVIDENCE_BADGE_STYLE.OBSERVED.bg
                        : 'border-amber-400/45 bg-amber-500/15 text-amber-200'
                    }`}
                  >
                    {report.groundReality.status_badge}
                  </span>
                </div>

                {report.groundReality.executed ? (
                  <>
                    <div className="grid grid-cols-3 gap-2.5 font-mono">
                      <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/[0.06] p-2.5">
                        <span className="block text-[9.5px] text-emerald-200">
                          OBSERVED ENTITIES
                        </span>
                        <span className="mt-0.5 block text-lg font-bold text-white">
                          {report.groundReality.counts.observed_entities}
                        </span>
                        <span className="block text-[9px] text-emerald-300/80">
                          OBSERVED ({report.groundReality.counts.ocr_confirmed_names} OCR-confirmed)
                        </span>
                      </div>

                      <div className="rounded-xl border border-[#FB923C]/25 bg-[#F97316]/[0.06] p-2.5">
                        <span className="block text-[9.5px] text-[#FED7AA]">
                          COMMERCIAL SIGNALS
                        </span>
                        <span className="mt-0.5 block text-lg font-bold text-white">
                          {report.groundReality.counts.observed_commercial_signals}
                        </span>
                        <span className="block text-[9px] text-slate-300">
                          Peak {report.groundReality.counts.peak_pedestrians_in_frame} ped/frame
                        </span>
                      </div>

                      <div className="rounded-xl border border-[#818CF8]/25 bg-[#4F46E5]/[0.08] p-2.5">
                        <span className="block text-[9.5px] text-[#C7D2FE]">
                          COCO DETECTIONS
                        </span>
                        <span className="mt-0.5 block text-lg font-bold text-white">
                          {report.groundReality.counts.total_coco_detections}
                        </span>
                        <span className="block text-[9px] text-slate-300">
                          {report.groundReality.scan_metadata?.frames_extracted} sampled frames
                        </span>
                      </div>
                    </div>

                    {report.groundReality.observed_entities_list.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
                          OCR-Confirmed Corridor Entities (OBSERVED)
                        </span>
                        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                          {report.groundReality.observed_entities_list.map(
                            (ent) => (
                              <div
                                key={ent.id}
                                className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-1.5 text-xs"
                              >
                                <span className="font-medium text-white">
                                  {ent.name}
                                </span>
                                <span className="font-mono text-[10px] text-emerald-300">
                                  OBSERVED · {ent.confidence.toFixed(2)}
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div
                    data-testid="report-ground-reality-unavailable"
                    className="rounded-2xl border border-indigo-400/25 bg-indigo-500/[0.05] p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-mono text-xs font-bold text-indigo-200">
                        <span className="h-2 w-2 rounded-full bg-indigo-400" />
                        <span>MAP-BASED CORRIDOR BASELINE</span>
                      </div>
                      <span className="rounded border border-indigo-400/30 bg-indigo-500/10 px-2 py-0.5 font-mono text-[9px] text-indigo-200">
                        OPTIONAL STREET SCAN NOT RUN
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-slate-200">
                      {report.groundReality.unavailable_explanation} Analysis is conducted using structured geospatial records, public commercial density, and customer profiles.
                    </p>
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-indigo-400/15 font-mono text-[10.5px]">
                      <span className="text-slate-400">
                        Want street-level signage and footfall counts?
                      </span>
                      <button
                        type="button"
                        onClick={onBackToGroundReality}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-300/40 bg-indigo-500/20 px-2.5 py-1 font-mono text-[10px] font-semibold text-indigo-100 hover:bg-indigo-500/30 transition-colors"
                      >
                        <span>Enhance with Street Scan (Optional) →</span>
                      </button>
                    </div>
                  </div>
                )}

                <p className="border-t border-white/[0.07] pt-2.5 font-mono text-[10.5px] text-slate-400">
                  Scope Note: {report.groundReality.corridor_scope_statement}
                </p>
              </section>

              {/* SECTION 4: MAP VS REALITY */}
              <section
                data-testid="report-section-map-vs-reality"
                className="liquid-glass-dark rounded-3xl p-5 space-y-3.5 lg:col-span-5"
              >
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                  <div>
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#FB923C]">
                      4. MAP VS REALITY
                    </span>
                    <h2 className="mt-0.5 font-display text-base font-bold text-white">
                      0–300m Corridor Reconciliation
                    </h2>
                  </div>
                  <span
                    className={`rounded-md border px-2 py-0.5 font-mono text-[9.5px] font-semibold ${EVIDENCE_BADGE_STYLE.INFERRED.bg}`}
                  >
                    FUSION LEDGER
                  </span>
                </div>

                <div className="space-y-2 font-mono text-xs">
                  <div className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2">
                    <span className="text-slate-300">DATABASE BASELINE</span>
                    <span className="font-bold text-[#C7D2FE]">
                      {report.mapVsReality.database_baseline_mapped_300m} mapped
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2">
                    <span className="text-slate-300">
                      OBSERVED IN STREET SCAN
                    </span>
                    <span className="font-bold text-emerald-300">
                      {report.mapVsReality.available
                        ? `${report.mapVsReality.observed_in_street_scan} observed`
                        : 'Not scanned'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-2">
                      <span className="block text-[9.5px] text-slate-400">
                        MATCHED
                      </span>
                      <span className="mt-0.5 block text-base font-bold text-white">
                        {report.mapVsReality.matched}
                      </span>
                    </div>

                    <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-2">
                      <span className="block text-[9.5px] text-emerald-200">
                        ADDITIONAL SIGNALS
                      </span>
                      <span className="mt-0.5 block text-base font-bold text-emerald-300">
                        +{report.mapVsReality.additional_observed_signals}
                      </span>
                    </div>

                    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-2">
                      <span className="block text-[9.5px] text-slate-400">
                        BASELINE ONLY
                      </span>
                      <span className="mt-0.5 block text-base font-bold text-slate-200">
                        {report.mapVsReality.baseline_only}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] leading-relaxed text-slate-300">
                  {report.mapVsReality.reconciliation_note}
                </p>
              </section>
            </div>

            {/* SECTION 5: LOCATION INTELLIGENCE (8 CATEGORICAL FACTORS) */}
            <section
              data-testid="report-section-intelligence"
              className="liquid-glass-dark rounded-3xl p-5 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
                <div>
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#E879F9]">
                    5. LOCATION INTELLIGENCE (8 EVIDENCE-BACKED FACTORS)
                  </span>
                  <h2 className="mt-0.5 font-display text-base font-bold text-white">
                    Multi-Factor Evaluation for {report.summary.business_type}
                  </h2>
                </div>
                <span className="font-mono text-[10px] text-slate-400">
                  Active Mode: {report.intelligence.active_mode}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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
                      className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-3.5 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-white">
                          {factor.label}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {factor.changed_from_baseline && (
                            <span className="rounded border border-[#FB923C]/45 bg-[#F97316]/15 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-[#FDBA74]">
                              {factor.baseline_rating} → {factor.rating}
                            </span>
                          )}
                          <span
                            className={`rounded border px-2 py-0.5 font-mono text-[10px] font-bold ${badgeStyle}`}
                          >
                            {factor.rating}
                          </span>
                        </div>
                      </div>

                      <p className="text-[11.5px] leading-relaxed text-slate-300">
                        {factor.explanation}
                      </p>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <span
                          className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[8.5px] font-semibold ${evStyle.bg}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${evStyle.dot}`}
                          />
                          {evStyle.label}
                        </span>
                        <span className="font-mono text-[9.5px] text-slate-400">
                          {factor.underlying_sources.join(' · ')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN: SPATIAL CONTEXT MAP + SECTION 6 (SCENARIO IMPACT) + EVIDENCE TAXONOMY */}
          <div className="space-y-5 xl:col-span-4">
            {/* Spatial Context Map Card */}
            <div className="liquid-glass-dark rounded-3xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    CANDIDATE SPATIAL CONTEXT
                  </span>
                  <h3 className="text-sm font-bold text-white">
                    {report.summary.candidate_location}
                  </h3>
                </div>
                <span className="font-mono text-[10px] text-slate-400">
                  0–300m / 2km / 5km
                </span>
              </div>

              <div className="h-[250px] w-full overflow-hidden rounded-2xl border border-white/[0.10]">
                <MarketDiscoveryMap
                  analysis={mapAnalysis}
                  onUpdateCoordinates={() => {
                    /* Read-only map preview in View 4 report */
                  }}
                  preferFallback={preferFallback}
                />
              </div>
            </div>

            {/* SECTION 6: SCENARIO IMPACT / SENSITIVITY ANALYSIS */}
            <section
              data-testid="report-section-scenario-impact"
              className="liquid-glass-dark rounded-3xl p-5 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
                <div>
                  <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#FB923C]">
                    <Sliders className="h-3.5 w-3.5" />
                    6. {report.scenario.label}
                  </span>
                  <h2 className="mt-0.5 font-display text-base font-bold text-white">
                    Baseline vs Scenario Assumptions
                  </h2>
                </div>
                <span
                  className={`rounded-md border px-2 py-0.5 font-mono text-[9px] font-semibold ${EVIDENCE_BADGE_STYLE.PREDICTED_ANALYTICAL.bg}`}
                >
                  PREDICTED_ANALYTICAL
                </span>
              </div>

              {/* 3 Scenario Variables */}
              <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-2.5 text-center">
                  <span className="block text-[9.5px] text-slate-400">
                    RENT
                  </span>
                  <span
                    data-testid="report-scenario-rent"
                    className="mt-1 block font-bold text-white"
                  >
                    {report.scenario.formatted_deltas.rent}
                  </span>
                </div>

                <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-2.5 text-center">
                  <span className="block text-[9.5px] text-slate-400">
                    ACTIVITY
                  </span>
                  <span
                    data-testid="report-scenario-activity"
                    className="mt-1 block font-bold text-white"
                  >
                    {report.scenario.formatted_deltas.activity}
                  </span>
                </div>

                <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-2.5 text-center">
                  <span className="block text-[9.5px] text-slate-400">
                    COMPETITION
                  </span>
                  <span
                    data-testid="report-scenario-competition"
                    className="mt-1 block font-bold text-white"
                  >
                    {report.scenario.formatted_deltas.competition}
                  </span>
                </div>
              </div>

              {/* Baseline vs Scenario Posture & Shifted Factors */}
              <div className="glass-sub-card rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="text-slate-400">Decision Posture Shift</span>
                  <span className="font-bold text-white">
                    {report.scenario.baseline_posture} →{' '}
                    <span className="text-[#FDBA74]">
                      {report.scenario.scenario_posture}
                    </span>
                  </span>
                </div>

                <p className="text-xs leading-relaxed text-slate-300">
                  {report.scenario.sensitivity_summary}
                </p>

                {report.scenario.shifted_factors.length > 0 ? (
                  <div
                    data-testid="report-shifted-factors"
                    className="space-y-1.5 pt-1"
                  >
                    <span className="block font-mono text-[9.5px] uppercase tracking-wider text-[#FDBA74]">
                      Factors Changed Under Scenario:
                    </span>
                    {report.scenario.shifted_factors.map((sf) => (
                      <div
                        key={sf.key}
                        className="flex items-center justify-between rounded-xl border border-[#FB923C]/35 bg-[#F97316]/10 px-3 py-1.5 font-mono text-[11px]"
                      >
                        <span className="font-semibold text-white">
                          {sf.label}
                        </span>
                        <span className="font-bold text-[#FDBA74]">
                          {sf.from_rating} → {sf.to_rating}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="font-mono text-[10.5px] text-slate-400">
                    No categorical factor ratings shifted from baseline under
                    current slider settings.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-white/[0.07] pt-2.5">
                <span className="font-mono text-[10px] text-slate-400">
                  Sensitivity analysis — not a guaranteed forecast.
                </span>
                <button
                  type="button"
                  onClick={onBackToIntelligence}
                  className="font-mono text-[10px] font-semibold text-[#E879F9] hover:underline"
                >
                  Adjust Scenario →
                </button>
              </div>
            </section>

            {/* Evidence Coverage Summary Box */}
            <div className="liquid-glass-dark rounded-3xl p-5 space-y-3">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                EVIDENCE TAXONOMY &amp; COVERAGE
              </span>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span
                    className={`rounded border px-2 py-0.5 font-mono text-[9.5px] font-semibold ${EVIDENCE_BADGE_STYLE.DATABASE.bg}`}
                  >
                    DATABASE
                  </span>
                  <span className="text-slate-300">
                    {report.marketOverview.total_mapped} mapped provider records
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span
                    className={`rounded border px-2 py-0.5 font-mono text-[9.5px] font-semibold ${EVIDENCE_BADGE_STYLE.OBSERVED.bg}`}
                  >
                    OBSERVED
                  </span>
                  <span className="text-slate-300">
                    {report.groundReality.executed
                      ? `${report.groundReality.counts.observed_entities} entities · ${report.groundReality.counts.total_coco_detections} objects`
                      : 'Unavailable (no Street Scan)'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span
                    className={`rounded border px-2 py-0.5 font-mono text-[9.5px] font-semibold ${EVIDENCE_BADGE_STYLE.INFERRED.bg}`}
                  >
                    INFERRED
                  </span>
                  <span className="text-slate-300">
                    Cross-source entity fusion &amp; 8 factors
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span
                    className={`rounded border px-2 py-0.5 font-mono text-[9.5px] font-semibold ${EVIDENCE_BADGE_STYLE.PREDICTED_ANALYTICAL.bg}`}
                  >
                    PREDICTED_ANALYTICAL
                  </span>
                  <span className="text-slate-300">
                    {report.scenario.is_modified
                      ? `${report.scenario.shifted_factors.length} scenario factor shift(s)`
                      : 'Baseline sensitivity ready'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================
            BOTTOM SECTIONS: 7. EVIDENCE LEDGER, 8. RISKS & LIMITATIONS, 9. FINAL DECISION POSTURE
           ============================================================ */}
        {/* SECTION 7: EVIDENCE LEDGER */}
        <section
          data-testid="report-section-evidence-ledger"
          className="liquid-glass-dark rounded-3xl p-5 space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
            <div>
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#818CF8]">
                7. EVIDENCE LEDGER
              </span>
              <h2 className="mt-0.5 font-display text-base font-bold text-white">
                Traceable Multi-Source Evidence Table
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-slate-400">
                {report.evidenceLedger.length} logged evidence items
              </span>
              <button
                type="button"
                onClick={() => setIsLedgerOpen((prev) => !prev)}
                className="liquid-glass-control inline-flex items-center gap-1 rounded-lg px-2.5 py-1 font-mono text-[10px] font-semibold text-slate-200 hover:text-white"
              >
                <span>{isLedgerOpen ? 'Collapse Table' : 'Expand Table'}</span>
                {isLedgerOpen ? (
                  <ChevronUp className="h-3 w-3 text-slate-400" />
                ) : (
                  <ChevronDown className="h-3 w-3 text-slate-400" />
                )}
              </button>
            </div>
          </div>

          {isLedgerOpen ? (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-white/[0.10] font-mono text-[10px] uppercase tracking-wider text-slate-400">
                  <th className="py-2.5 pr-4">Evidence</th>
                  <th className="py-2.5 px-3">Source</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Confidence / Metric</th>
                  <th className="py-2.5 pl-3">Interpretation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {report.evidenceLedger.map((item) => {
                  const badge = EVIDENCE_BADGE_STYLE[item.type];
                  return (
                    <tr key={item.id} className="hover:bg-white/[0.02]">
                      <td className="py-2.5 pr-4 font-semibold text-white">
                        {item.evidence}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-300">
                        {item.source}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 font-mono text-[9.5px] font-semibold ${badge.bg}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${badge.dot}`}
                          />
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-200">
                        {item.confidence}
                      </td>
                      <td className="py-2.5 pl-3 text-slate-300">
                        {item.interpretation}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-center">
              <p className="font-mono text-xs text-slate-400">
                Evidence ledger table collapsed. Click &quot;Expand Table&quot; above to inspect all {report.evidenceLedger.length} verified evidence items.
              </p>
            </div>
          )}
        </section>

        {/* SECTION 8 & SECTION 9 SIDE-BY-SIDE */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 print:grid-cols-2 print:gap-3 print-page-break-before">
          {/* SECTION 8: RISKS & LIMITATIONS */}
          <section
            data-testid="report-section-risks-limitations"
            className="liquid-glass-dark rounded-3xl p-5 space-y-3.5 lg:col-span-6 print:col-span-1"
          >
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div>
                <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  8. RISKS &amp; LIMITATIONS
                </span>
                <h2 className="mt-0.5 font-display text-base font-bold text-white">
                  Epistemic Boundaries &amp; Data Limitations
                </h2>
              </div>
              <span className="font-mono text-[10px] text-slate-400">
                Explicit Uncertainty Disclosure
              </span>
            </div>

            <ul className="space-y-2.5">
              {report.risksAndLimitations.map((lim) => {
                const evBadge = EVIDENCE_BADGE_STYLE[lim.evidence_type];
                return (
                  <li
                    key={lim.id}
                    className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3 space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10.5px] font-semibold text-amber-200">
                        {lim.scope}
                      </span>
                      <span
                        className={`rounded border px-1.5 py-0.5 font-mono text-[8.5px] font-semibold ${evBadge.bg}`}
                      >
                        {evBadge.label}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-slate-300">
                      {lim.statement}
                    </p>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* SECTION 9: FINAL DECISION POSTURE */}
          <section
            data-testid="report-section-final-posture"
            className={`liquid-glass-dark rounded-3xl border p-5 space-y-4 lg:col-span-6 print:col-span-1 ${postureStyle.border}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.10] pb-3">
              <div>
                <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#FB923C]">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  9. FINAL DECISION POSTURE
                </span>
                <h2 className="mt-0.5 font-display text-base font-bold text-white">
                  Synthesized Market Entry Conclusion
                </h2>
              </div>

              <span
                data-testid="report-final-posture-badge"
                className={`rounded-lg border px-3 py-1 font-mono text-sm font-bold tracking-wider ${postureStyle.pill}`}
              >
                DECISION POSTURE: {report.finalDecisionPosture.short_posture}
              </span>
            </div>

            {/* WHY: 3-5 Evidence-Backed Reasons */}
            <div className="space-y-2">
              <span className="block font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                WHY (EVIDENCE-BACKED DRIVERS)
              </span>
              <div className="space-y-2">
                {report.finalDecisionPosture.reasons.map((reason) => {
                  const isPos = reason.polarity === 'POSITIVE';
                  const evBadge = EVIDENCE_BADGE_STYLE[reason.evidence_type];
                  return (
                    <div
                      key={reason.id}
                      className="flex items-start justify-between gap-3 rounded-2xl border border-white/[0.08] bg-[#050312]/65 p-3"
                    >
                      <div className="flex items-start gap-2.5">
                        <span
                          className={`mt-0.5 font-mono text-sm font-bold ${
                            isPos ? 'text-emerald-400' : 'text-amber-400'
                          }`}
                        >
                          {isPos ? '+' : '−'}
                        </span>
                        <div>
                          <p className="text-xs font-semibold text-white">
                            {reason.headline}
                          </p>
                          <p className="mt-0.5 text-[11px] leading-relaxed text-slate-300">
                            {reason.detail}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[8.5px] font-semibold ${evBadge.bg}`}
                      >
                        {evBadge.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Non-prescriptive Decision Guidance Statement */}
            <div className="glass-sub-card rounded-2xl p-4 space-y-1.5 shadow-md">
              <p className="text-xs font-medium leading-relaxed text-white sm:text-sm">
                {report.finalDecisionPosture.decision_guidance_statement}
              </p>
              <p className="font-mono text-[10.5px] leading-relaxed text-slate-400">
                {report.finalDecisionPosture.sensitivity_caveat}
              </p>
            </div>
          </section>
        </div>

        {/* DEDICATED PRINT REPORT FOOTER */}
        <div className="hidden print-report-footer">
          <div>LOCUS AI Multi-Modal Spatial Engine · Findings depend on available geospatial registries &amp; specified assumptions.</div>
          <div>Report Generated: {new Date(report.summary.analysis_timestamp).toLocaleDateString()}</div>
        </div>
      </div>
    </section>
  );
};
