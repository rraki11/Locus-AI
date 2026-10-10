import React from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Cpu,
  FileCheck2,
  MapPin,
  Video,
} from 'lucide-react';

export type WorkspaceStageCode = '01' | '02' | '03' | '04';
export type WorkspaceViewKey = 'view1' | 'view2' | 'view3' | 'view4';

export interface WorkspaceStageConfig {
  code: WorkspaceStageCode;
  viewKey: WorkspaceViewKey;
  path: string;
  label: string;
  tagline: string;
  shortTag: string;
  themeColor: string;
  activeBorder: string;
  activeBg: string;
  activeBadge: string;
  activeGlow: string;
  dotColor: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const STAGE_CONFIGS: WorkspaceStageConfig[] = [
  {
    code: '01',
    viewKey: 'view1',
    path: '/market-discovery',
    label: 'Market Discovery',
    tagline: 'Candidate Census & Spatial Map',
    shortTag: 'EMERALD SPATIAL',
    themeColor: '#0F8B68',
    activeBorder: 'border-emerald-500/25',
    activeBg: 'bg-emerald-500/[0.12] text-[#E9F7F0]',
    activeBadge: 'border-emerald-500/30 bg-emerald-500/15 text-[#A7F3D0]',
    activeGlow: 'from-emerald-500/[0.08] via-transparent to-transparent',
    dotColor: 'bg-[#72D9B0] shadow-[0_0_6px_rgba(114,217,176,0.6)]',
    icon: MapPin,
  },
  {
    code: '02',
    viewKey: 'view2',
    path: '/ground-reality',
    label: 'Ground Reality',
    tagline: 'Street Scan & CV Storefront Fusion',
    shortTag: 'CYBER AURORA',
    themeColor: '#14B8A6',
    activeBorder: 'border-teal-500/25',
    activeBg: 'bg-teal-500/[0.12] text-[#A7F3D0]',
    activeBadge: 'border-teal-500/30 bg-teal-500/15 text-[#5EEAD4]',
    activeGlow: 'from-teal-500/[0.08] via-transparent to-transparent',
    dotColor: 'bg-[#5EEAD4] shadow-[0_0_6px_rgba(94,234,212,0.6)]',
    icon: Video,
  },
  {
    code: '03',
    viewKey: 'view3',
    path: '/intelligence',
    label: 'Location Intelligence',
    tagline: '8-Factor Model & Scenario Engine',
    shortTag: 'MIDNIGHT BLUE & CYAN',
    themeColor: '#38BDF8',
    activeBorder: 'border-cyan-500/25',
    activeBg: 'bg-sky-500/[0.12] text-[#DDF6FA]',
    activeBadge: 'border-sky-500/30 bg-sky-500/15 text-[#BAE6FD]',
    activeGlow: 'from-sky-500/[0.08] via-transparent to-transparent',
    dotColor: 'bg-[#38BDF8] shadow-[0_0_6px_rgba(56,189,248,0.6)]',
    icon: Cpu,
  },
  {
    code: '04',
    viewKey: 'view4',
    path: '/decision',
    label: 'Decision Report',
    tagline: 'Explainable Market Entry Verdict',
    shortTag: 'EMERALD EXECUTIVE AUDIT',
    themeColor: '#10B981',
    activeBorder: 'border-emerald-500/25',
    activeBg: 'bg-emerald-500/[0.12] text-[#E9F7F0]',
    activeBadge: 'border-emerald-500/30 bg-emerald-500/15 text-[#E9F7F0]',
    activeGlow: 'from-emerald-500/[0.08] via-transparent to-transparent',
    dotColor: 'bg-[#72D9B0] shadow-[0_0_6px_rgba(114,217,176,0.6)]',
    icon: FileCheck2,
  },
];

export function getPathForViewKey(viewKey: WorkspaceViewKey): string {
  const match = STAGE_CONFIGS.find((s) => s.viewKey === viewKey);
  return match?.path ?? '/market-discovery';
}

export function getViewKeyForPath(pathname: string): WorkspaceViewKey | null {
  const clean = pathname.replace(/\/$/, '') || '/';
  if (clean === '/market-discovery' || clean === '/workspace') return 'view1';
  if (clean === '/ground-reality') return 'view2';
  if (clean === '/intelligence' || clean === '/location-intelligence') return 'view3';
  if (clean === '/decision' || clean === '/report') return 'view4';
  return null;
}

interface WorkspaceStageNavProps {
  currentStage: WorkspaceStageCode;
  onNavigate?: (targetView: WorkspaceViewKey) => void;
  unlockedViews?: Set<WorkspaceViewKey>;
}

export const WorkspaceStageNav: React.FC<WorkspaceStageNavProps> = ({
  currentStage,
  onNavigate,
  unlockedViews = new Set(['view1', 'view2', 'view3', 'view4']),
}) => {
  const currentIndex = STAGE_CONFIGS.findIndex((s) => s.code === currentStage);
  const prevConfig = currentIndex > 0 ? STAGE_CONFIGS[currentIndex - 1] : null;
  const nextConfig =
    currentIndex < STAGE_CONFIGS.length - 1
      ? STAGE_CONFIGS[currentIndex + 1]
      : null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      {/* 4-Stage Stepper Track with Distinct Color Badges */}
      <nav
        aria-label="LOCUS 4-Stage Workspace Flow"
        className="flex flex-wrap items-center gap-1.5 sm:gap-2.5"
      >
        {STAGE_CONFIGS.map((stage, idx) => {
          const isActive = stage.code === currentStage;
          const isPassed = idx < currentIndex;
          const isUnlocked =
            isPassed || isActive || unlockedViews.has(stage.viewKey);
          const Icon = stage.icon;

          return (
            <React.Fragment key={stage.code}>
              <button
                type="button"
                disabled={!isUnlocked}
                onClick={() => isUnlocked && onNavigate?.(stage.viewKey)}
                title={`${stage.code} ${stage.label} — ${stage.tagline}`}
                className={`group flex items-center gap-2 rounded-lg px-2.5 py-1 text-xs transition-all ${
                  isActive
                    ? `border ${stage.activeBorder} ${stage.activeBg} font-semibold text-white shadow-sm`
                    : isPassed
                    ? 'border border-emerald-500/20 bg-emerald-500/[0.06] text-slate-200 hover:border-emerald-500/40 hover:bg-emerald-500/10 cursor-pointer'
                    : isUnlocked
                    ? 'border border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20 hover:text-white cursor-pointer'
                    : 'border border-white/[0.05] bg-white/[0.015] text-slate-500 opacity-60 cursor-not-allowed'
                }`}
              >
                {/* Status Dot / Icon */}
                <div className="flex items-center gap-1.5">
                  {isPassed ? (
                    <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500/30 text-emerald-300">
                      <Check className="h-2.5 w-2.5" />
                    </span>
                  ) : isActive ? (
                    <span
                      className={`h-2 w-2 rounded-full animate-pulse ${stage.dotColor}`}
                    />
                  ) : (
                    <Icon className="h-3 w-3 text-slate-400" />
                  )}

                  <span
                    className={`font-mono text-[11px] font-bold ${
                      isActive ? 'text-white' : isPassed ? 'text-emerald-300' : 'text-slate-400'
                    }`}
                  >
                    {stage.code}
                  </span>
                </div>

                <span className="hidden md:inline font-medium tracking-tight">
                  {stage.label}
                </span>

                {isActive && (
                  <span
                    className={`hidden xl:inline-block rounded px-1.5 py-0.2 font-mono text-[9px] uppercase tracking-wider font-semibold border ${stage.activeBadge}`}
                  >
                    {stage.shortTag}
                  </span>
                )}
              </button>

              {idx < STAGE_CONFIGS.length - 1 && (
                <span
                  className={`text-[11px] select-none ${
                    idx < currentIndex ? 'text-emerald-400/40' : 'text-slate-600'
                  }`}
                  aria-hidden="true"
                >
                  →
                </span>
              )}
            </React.Fragment>
          );
        })}
      </nav>

      {/* Quick Forward & Backward Action Controls */}
      <div className="flex items-center gap-1.5">
        {prevConfig && (
          <button
            type="button"
            onClick={() => onNavigate?.(prevConfig.viewKey)}
            className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 font-mono text-[11px] text-slate-300 transition-all hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
            title={`Go back to ${prevConfig.code} ${prevConfig.label}`}
          >
            <ArrowLeft className="h-3 w-3 text-slate-400" />
            <span>Back</span>
            <span className="hidden sm:inline text-slate-400">to {prevConfig.code}</span>
          </button>
        )}

        {nextConfig && unlockedViews.has(nextConfig.viewKey) && (
          <button
            type="button"
            onClick={() => onNavigate?.(nextConfig.viewKey)}
            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 font-mono text-[11px] font-medium transition-all hover:brightness-110 ${nextConfig.activeBadge}`}
            title={`Advance forward to ${nextConfig.code} ${nextConfig.label}`}
          >
            <span>Next</span>
            <span className="hidden sm:inline">to {nextConfig.code}</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
};

export interface WorkspaceStageHeroProps {
  currentStage: WorkspaceStageCode;
  candidateName?: string;
  city?: string;
  state?: string;
  businessType?: string;
  onNavigate?: (targetView: WorkspaceViewKey) => void;
  unlockedViews?: Set<WorkspaceViewKey>;
}

/**
 * High-visibility Stage Identity Strip:
 * Sits just below the workspace header, giving each page an unmistakable visual identity and easy forward/backward jump pills.
 */
export const WorkspaceStageHero: React.FC<WorkspaceStageHeroProps> = ({
  currentStage,
  candidateName,
  city,
  state,
  businessType,
  onNavigate,
  unlockedViews = new Set(['view1', 'view2', 'view3', 'view4']),
}) => {
  const currentIndex = STAGE_CONFIGS.findIndex((s) => s.code === currentStage);
  const currentConfig = STAGE_CONFIGS[currentIndex] || STAGE_CONFIGS[0];

  const prevConfig = currentIndex > 0 ? STAGE_CONFIGS[currentIndex - 1] : null;
  const nextConfig =
    currentIndex < STAGE_CONFIGS.length - 1
      ? STAGE_CONFIGS[currentIndex + 1]
      : null;

  return (
    <div
      className="relative mb-4 overflow-hidden rounded-2xl border border-[var(--stage-header-border,rgba(255,255,255,0.12))] bg-[var(--stage-header-bg,rgba(6,20,16,0.85))] px-4 py-3 sm:px-6 sm:py-3.5 backdrop-blur-xl transition-all duration-[850ms] shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Stage Visual Stamp & Scope Summary */}
        <div className="flex items-center gap-3">
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border font-mono text-xs font-bold ${currentConfig.activeBadge}`}
          >
            {currentConfig.code}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="font-mono text-[10px] font-bold tracking-[0.16em] uppercase"
                style={{ color: currentConfig.themeColor }}
              >
                {currentConfig.shortTag}
              </span>
              <span className="text-white/20">·</span>
              <span className="font-display text-sm font-bold text-white">
                {currentConfig.label}
              </span>
              {businessType && (
                <>
                  <span className="text-white/20">·</span>
                  <span className="rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.2 font-mono text-[10px] text-slate-300">
                    {businessType}
                  </span>
                </>
              )}
            </div>

            <p className="mt-0.5 text-xs text-slate-300">
              {currentConfig.tagline}
              {(candidateName || city) && (
                <span className="font-mono text-slate-400">
                  {' '}
                  — {[candidateName, city, state].filter(Boolean).join(', ')}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Right: Quick Jump Buttons */}
        <div className="flex items-center gap-2">
          {prevConfig && (
            <button
              type="button"
              onClick={() => onNavigate?.(prevConfig.viewKey)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-slate-300 transition-all hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-slate-400" />
              <span>Back: {prevConfig.label}</span>
            </button>
          )}

          {nextConfig && unlockedViews.has(nextConfig.viewKey) && (
            <button
              type="button"
              onClick={() => onNavigate?.(nextConfig.viewKey)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1 text-xs font-medium transition-all hover:brightness-110 ${nextConfig.activeBadge}`}
            >
              <span>Next: {nextConfig.label}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
