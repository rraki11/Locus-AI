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
    activeBorder: 'border-[#72D9B0]/60 shadow-[0_0_20px_rgba(15,139,104,0.35)]',
    activeBg: 'bg-[#0F8B68]/20 text-[#E9F7F0]',
    activeBadge: 'border-[#72D9B0]/40 bg-[#0F8B68]/25 text-[#A7F3D0]',
    activeGlow: 'from-[#0F8B68]/30 via-[#092D25]/40 to-transparent',
    dotColor: 'bg-[#72D9B0] shadow-[0_0_8px_rgba(114,217,176,0.9)]',
    icon: MapPin,
  },
  {
    code: '02',
    viewKey: 'view2',
    path: '/ground-reality',
    label: 'Ground Reality',
    tagline: 'Street Scan & CV Storefront Fusion',
    shortTag: 'TEAL & JADE',
    themeColor: '#16A085',
    activeBorder: 'border-[#78E6C0]/60 shadow-[0_0_20px_rgba(22,160,133,0.35)]',
    activeBg: 'bg-[#16A085]/20 text-[#A7F3D0]',
    activeBadge: 'border-[#78E6C0]/40 bg-[#16A085]/25 text-[#78E6C0]',
    activeGlow: 'from-[#16A085]/30 via-[#0A3935]/40 to-transparent',
    dotColor: 'bg-[#78E6C0] shadow-[0_0_8px_rgba(120,230,192,0.9)]',
    icon: Video,
  },
  {
    code: '03',
    viewKey: 'view3',
    path: '/intelligence',
    label: 'Location Intelligence',
    tagline: '8-Factor Model & Scenario Engine',
    shortTag: 'MIDNIGHT BLUE & CYAN',
    themeColor: '#54D6E8',
    activeBorder: 'border-[#54D6E8]/60 shadow-[0_0_20px_rgba(84,214,232,0.35)]',
    activeBg: 'bg-[#112B46]/80 text-[#DDF6FA]',
    activeBadge: 'border-[#54D6E8]/40 bg-[#54D6E8]/20 text-[#BAE6FD]',
    activeGlow: 'from-[#54D6E8]/25 via-[#112B46]/50 to-transparent',
    dotColor: 'bg-[#54D6E8] shadow-[0_0_8px_rgba(84,214,232,0.95)]',
    icon: Cpu,
  },
  {
    code: '04',
    viewKey: 'view4',
    path: '/decision',
    label: 'Decision Report',
    tagline: 'Explainable Market Entry Verdict',
    shortTag: 'EMERALD EXECUTIVE AUDIT',
    themeColor: '#0F8B68',
    activeBorder: 'border-[#72D9B0]/60 shadow-[0_0_20px_rgba(15,139,104,0.35)]',
    activeBg: 'bg-[#0F8B68]/20 text-[#E9F7F0]',
    activeBadge: 'border-[#72D9B0]/40 bg-[#0F8B68]/25 text-[#E9F7F0]',
    activeGlow: 'from-[#0F8B68]/30 via-[#092D25]/40 to-transparent',
    dotColor: 'bg-[#72D9B0] shadow-[0_0_8px_rgba(114,217,176,0.9)]',
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
  if (clean === '/intelligence') return 'view3';
  if (clean === '/decision') return 'view4';
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
                className={`group flex items-center gap-2 rounded-xl px-2.5 py-1 text-xs transition-all ${
                  isActive
                    ? `border ${stage.activeBorder} ${stage.activeBg} font-semibold text-white shadow-sm`
                    : isPassed
                    ? 'border border-emerald-400/25 bg-emerald-500/[0.08] text-slate-200 hover:border-emerald-400/50 hover:bg-emerald-500/15 cursor-pointer'
                    : isUnlocked
                    ? 'border border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/20 hover:text-white cursor-pointer'
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
                    idx < currentIndex ? 'text-emerald-400/50' : 'text-slate-600'
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
            className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-1 font-mono text-[11px] text-slate-300 transition-all hover:border-white/25 hover:bg-white/[0.08] hover:text-white"
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
            className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1 font-mono text-[11px] font-semibold transition-all hover:brightness-110 ${nextConfig.activeBadge}`}
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
      className={`relative mb-4 overflow-hidden rounded-2xl border px-4 py-3 sm:px-6 sm:py-3.5 transition-all duration-[850ms] ${currentConfig.activeBorder} bg-gradient-to-r ${currentConfig.activeGlow} bg-[var(--stage-header-bg,#061914)] backdrop-blur-md`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Stage Visual Stamp & Scope Summary */}
        <div className="flex items-center gap-3">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border font-mono text-sm font-bold ${currentConfig.activeBadge}`}
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
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-slate-300 transition-all hover:border-white/25 hover:bg-white/[0.08] hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-slate-400" />
              <span>Back: {prevConfig.label}</span>
            </button>
          )}

          {nextConfig && unlockedViews.has(nextConfig.viewKey) && (
            <button
              type="button"
              onClick={() => onNavigate?.(nextConfig.viewKey)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold shadow-md transition-all hover:brightness-110 ${nextConfig.activeBadge}`}
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
