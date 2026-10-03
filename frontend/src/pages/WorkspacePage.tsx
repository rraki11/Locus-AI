import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ChevronRight, Zap } from 'lucide-react';
import { WorkspaceArc } from '../components/workspace/WorkspaceArc';
import { MarketSetupStage } from '../components/workspace/stages/MarketSetupStage';
import { DiscoveryStage } from '../components/workspace/stages/DiscoveryStage';
import { GroundTruthStage } from '../components/workspace/stages/GroundTruthStage';
import { IntelligenceStage } from '../components/workspace/stages/IntelligenceStage';
import { ScenarioStage } from '../components/workspace/stages/ScenarioStage';
import { ReportStage } from '../components/workspace/stages/ReportStage';
import {
  BusinessProfileState,
  CANDIDATE_LOCATIONS,
  DEFAULT_BUSINESS_PROFILE,
  EXPANSION_SCENARIOS,
  ExpansionScenario,
  PIPELINE_MACRO_STAGES,
  WORKSPACE_STAGES,
} from '../data/locusWorkspaceData';

interface WorkspacePageProps {
  onBack?: () => void;
  embeddedInLanding?: boolean;
  externalReducedMotion?: boolean;
}

export const WorkspacePage: React.FC<WorkspacePageProps> = ({
  onBack,
  embeddedInLanding = false,
  externalReducedMotion = false,
}) => {
  const [activeStage, setActiveStage] = useState<number>(0);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [staticMode, setStaticMode] = useState<boolean>(false);

  // Shared application state across all 6 workspace views
  const [profile, setProfile] = useState<BusinessProfileState>(
    DEFAULT_BUSINESS_PROFILE
  );
  const [selectedLocationId, setSelectedLocationId] =
    useState<string>('koramangala-5');
  const [selectedScenarioId, setSelectedScenarioId] =
    useState<ExpansionScenario['id']>('balanced');

  const workspaceRootRef = useRef<HTMLDivElement>(null);
  // Window/workspace-level normalized pointer ref [-1, +1] — never resets when hovering buttons/cards
  const pointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updatePointer = (clientX: number, clientY: number) => {
      const width = window.innerWidth || 1920;
      const height = window.innerHeight || 1080;
      const nx = Math.max(-1, Math.min(1, (clientX / Math.max(1, width)) * 2 - 1));
      const ny = Math.max(-1, Math.min(1, (clientY / Math.max(1, height)) * 2 - 1));
      pointerRef.current = { x: nx, y: ny };
    };

    const handlePointerMove = (e: PointerEvent | MouseEvent) => {
      updatePointer(e.clientX, e.clientY);
    };

    const handleMouseOut = (e: MouseEvent) => {
      if (!e.relatedTarget && !(e as any).toElement) {
        pointerRef.current = { x: 0, y: 0 };
      }
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('mousemove', handlePointerMove, { passive: true });
    window.addEventListener('mouseout', handleMouseOut, { passive: true });

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseout', handleMouseOut);
    };
  }, []);

  const navigateToStage = useCallback(
    (nextStage: number) => {
      if (nextStage === activeStage || isTransitioning) return;
      setIsTransitioning(true);
      window.setTimeout(() => {
        setActiveStage(nextStage);
        setIsTransitioning(false);
      }, 90);
    },
    [activeStage, isTransitioning]
  );

  const currentStageMeta =
    WORKSPACE_STAGES[activeStage] || WORKSPACE_STAGES[0];
  const activeMacroStage = currentStageMeta.macroStage;
  const activeMacroIndex = PIPELINE_MACRO_STAGES.findIndex(
    (m) => m.id === activeMacroStage
  );

  const activeLocation =
    CANDIDATE_LOCATIONS.find((l) => l.id === selectedLocationId) ||
    CANDIDATE_LOCATIONS[0];
  const activeScenario =
    EXPANSION_SCENARIOS.find((s) => s.id === selectedScenarioId) ||
    EXPANSION_SCENARIOS[1];

  const firstStageForMacro = (macroId: string): number => {
    const found = WORKSPACE_STAGES.find((s) => s.macroStage === macroId);
    return found ? found.id : 0;
  };

  return (
    <section
      ref={workspaceRootRef}
      aria-label="LOCUS AI Market Entry Intelligence Workspace"
      className="relative flex min-h-screen w-full flex-col bg-[#06090E] text-slate-100"
    >
      {/* LAYER 0: Eternal-Arc Spatial Light-Field Backdrop (Always Behind UI, pointer-events: none) */}
      <WorkspaceArc
        pointerRef={pointerRef}
        activeStage={activeStage}
        reducedMotion={externalReducedMotion || staticMode}
      />

      {/* LAYER 1: Global Top Navigation */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#06090E]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1560px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-8">
          {/* Brand & System Identity */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#6FAF9B] shadow-[0_0_10px_rgba(111,175,155,0.8)]" />
              <span className="font-mono text-xs font-bold uppercase tracking-[0.22em] text-white">
                LOCUS AI
              </span>
            </div>
            <span className="hidden h-4 w-px bg-white/15 sm:inline-block" />
            <span className="hidden font-mono text-[11px] uppercase tracking-[0.16em] text-[#6FAF9B] md:inline-block">
              Market-Entry Intelligence System
            </span>
          </div>

          {/* Active Context Pill (Profile -> Location -> Scenario) */}
          <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1 font-mono text-[10px] text-slate-300 xl:flex">
            <span className="text-slate-400">Profile:</span>
            <span className="font-semibold text-white">{profile.category}</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400">Candidate:</span>
            <span className="font-semibold text-sky-300">{activeLocation.name}</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400">Posture:</span>
            <span className="font-semibold text-emerald-300">{activeScenario.code}</span>
          </div>

          {/* Right Controls: Flagship Shortcut, Animation Toggle, Return to Hero */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => navigateToStage(2)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] transition-all focus:outline-none ${
                activeStage === 2
                  ? 'border-emerald-400 bg-emerald-500/25 text-emerald-200'
                  : 'border-emerald-400/35 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
              }`}
            >
              <Zap className="h-3 w-3" />
              <span>Map vs Reality (14→19)</span>
            </button>

            <button
              type="button"
              onClick={() => setStaticMode((prev) => !prev)}
              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-300 transition-colors hover:border-white/25 hover:text-white focus:outline-none"
              title="Toggle background light-field animation"
            >
              {externalReducedMotion || staticMode
                ? 'Light-Field: Static'
                : 'Light-Field: Live'}
            </button>

            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-300 transition-colors hover:border-white/30 hover:text-white focus:outline-none"
              >
                <ArrowLeft className="h-3 w-3" />
                <span>{embeddedInLanding ? 'Top Hero' : 'Hero'}</span>
              </button>
            )}
          </div>
        </div>

        {/* LAYER 2: Pipeline Indicator (MARKET -> GROUND -> INTELLIGENCE -> SCENARIO -> DECISION) */}
        <div className="border-t border-white/5 bg-slate-950/65">
          <div className="mx-auto flex max-w-[1560px] flex-wrap items-center justify-between gap-2 px-4 py-2 sm:px-8">
            {/* 5-Stage Macro Pipeline */}
            <div
              className="flex flex-wrap items-center gap-1"
              role="navigation"
              aria-label="LOCUS Macro Intelligence Pipeline"
            >
              {PIPELINE_MACRO_STAGES.map((macro, idx) => {
                const isActiveMacro = macro.id === activeMacroStage;
                const isCompletedMacro = idx < activeMacroIndex;
                return (
                  <React.Fragment key={macro.id}>
                    <button
                      type="button"
                      onClick={() => navigateToStage(firstStageForMacro(macro.id))}
                      title={`${macro.label} — ${macro.description}`}
                      className={`group flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.15em] transition-all focus:outline-none ${
                        isActiveMacro
                          ? 'border-[#6FAF9B]/60 bg-[#3D806D]/25 font-bold text-white shadow-[0_0_16px_rgba(111,175,155,0.2)]'
                          : isCompletedMacro
                          ? 'border-emerald-400/25 bg-emerald-500/[0.07] text-emerald-300 hover:border-emerald-400/45'
                          : 'border-white/5 bg-white/[0.02] text-slate-400 hover:border-white/15 hover:text-slate-200'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          isActiveMacro
                            ? 'bg-[#6FAF9B]'
                            : isCompletedMacro
                            ? 'bg-emerald-400'
                            : 'bg-slate-600'
                        }`}
                      />
                      <span>{macro.label}</span>
                    </button>
                    {idx < PIPELINE_MACRO_STAGES.length - 1 && (
                      <ChevronRight
                        className="h-3 w-3 flex-shrink-0 text-slate-600"
                        aria-hidden="true"
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* 6 Connected Workspace State Views Selector */}
            <div
              className="flex flex-wrap items-center gap-1"
              role="tablist"
              aria-label="Workspace State Views"
            >
              {WORKSPACE_STAGES.map((stage) => {
                const active = stage.id === activeStage;
                return (
                  <button
                    key={stage.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => navigateToStage(stage.id)}
                    className={`rounded-md px-2 py-1 font-mono text-[10px] transition-all focus:outline-none ${
                      active
                        ? 'bg-sky-500/20 font-semibold text-sky-300 ring-1 ring-sky-400/40'
                        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                    }`}
                  >
                    <span className="mr-1 text-[9px] opacity-60">
                      {stage.shortCode}
                    </span>
                    <span>{stage.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      {/* LAYER 3: Current Intelligence State Banner + Contextual Workspace Content */}
      <main className="relative z-10 flex-1 px-4 py-6 sm:px-8 lg:py-8">
        <div
          className="transition-all duration-150 ease-out"
          style={{
            opacity: isTransitioning ? 0 : 1,
            transform: isTransitioning ? 'translateY(6px)' : 'translateY(0)',
          }}
        >
          {activeStage === 0 && (
            <MarketSetupStage
              profile={profile}
              onUpdateProfile={setProfile}
              selectedLocationId={selectedLocationId}
              onSelectLocation={setSelectedLocationId}
              onNext={() => navigateToStage(1)}
              onJumpToGroundTruth={() => navigateToStage(2)}
            />
          )}

          {activeStage === 1 && (
            <DiscoveryStage
              selectedLocationId={selectedLocationId}
              onNext={() => navigateToStage(2)}
            />
          )}

          {activeStage === 2 && (
            <GroundTruthStage onNext={() => navigateToStage(3)} />
          )}

          {activeStage === 3 && (
            <IntelligenceStage onNext={() => navigateToStage(4)} />
          )}

          {activeStage === 4 && (
            <ScenarioStage
              selectedScenarioId={selectedScenarioId}
              onSelectScenario={setSelectedScenarioId}
              onNext={() => navigateToStage(5)}
            />
          )}

          {activeStage === 5 && (
            <ReportStage
              profile={profile}
              selectedLocationId={selectedLocationId}
              selectedScenarioId={selectedScenarioId}
              onReset={() => navigateToStage(0)}
              onReviewGroundTruth={() => navigateToStage(2)}
            />
          )}
        </div>
      </main>

      {/* LAYER 4: Bottom Connected Workflow Status & Quick Step Footer */}
      <footer className="relative z-20 border-t border-white/10 bg-[#06090E]/90 px-4 py-3 backdrop-blur-md sm:px-8">
        <div className="mx-auto flex max-w-[1560px] flex-wrap items-center justify-between gap-3 font-mono text-[10px]">
          <div className="flex items-center gap-3 text-slate-400">
            <span className="font-semibold text-[#6FAF9B]">
              STATE {currentStageMeta.shortCode} / 06:
            </span>
            <span className="text-slate-200">{currentStageMeta.summary}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={activeStage === 0}
              onClick={() => navigateToStage(Math.max(0, activeStage - 1))}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-slate-300 transition-colors hover:border-white/25 disabled:opacity-35"
            >
              ← Prev State
            </button>
            <button
              type="button"
              disabled={activeStage === WORKSPACE_STAGES.length - 1}
              onClick={() =>
                navigateToStage(
                  Math.min(WORKSPACE_STAGES.length - 1, activeStage + 1)
                )
              }
              className="inline-flex items-center gap-1 rounded-lg border border-sky-400/40 bg-sky-500/15 px-3 py-1 font-semibold text-sky-300 transition-colors hover:bg-sky-500/25 disabled:opacity-35"
            >
              <span>Next State</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </footer>
    </section>
  );
};

export default WorkspacePage;
