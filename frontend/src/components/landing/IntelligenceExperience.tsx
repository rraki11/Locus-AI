import React from 'react';
import { SplineScene } from '../spline/SplineScene';
import { PipelineVisual } from './PipelineVisual';
import { GlassCTA } from './GlassCTA';

export const SCENE_3_PARTICLES_URL =
  'https://prod.spline.design/wZ-nDo44BMQCq1fu/scene.splinecode';

interface IntelligenceExperienceProps {
  scrollProgress: number;
  preferFallback: boolean;
  onEnterLocus: () => void;
}

function rangeProgress(value: number, start: number, end: number): number {
  if (value <= start) return 0;
  if (value >= end) return 1;
  return (value - start) / (end - start);
}

export const IntelligenceExperience: React.FC<IntelligenceExperienceProps> = ({
  scrollProgress,
  preferFallback,
  onEnterLocus,
}) => {
  // Defer Scene 3 loading until the user scrolls toward the transition (>= 0.28)
  const shouldLoadScene3 = scrollProgress >= 0.28;

  // 0.55 -> 0.75: Particle field becomes dominant
  const particleOpacity = rangeProgress(scrollProgress, 0.52, 0.75);

  // 0.70 -> 0.90: Intelligence section foreground reaches full visibility
  const foregroundProgress = rangeProgress(scrollProgress, 0.70, 0.89);
  const foregroundTranslateY = (1 - foregroundProgress) * 32;

  return (
    <section
      aria-label="LOCUS AI Structured Intelligence Experience"
      className="relative h-full w-full overflow-hidden bg-[#070B14] text-slate-50"
    >
      {/* LAYER 1: Dark Particle Intelligence Field (SCENE 3) */}
      <div
        className="absolute inset-0"
        style={{ opacity: particleOpacity * 0.9 }}
      >
        <SplineScene
          sceneUrl={SCENE_3_PARTICLES_URL}
          localBackupUrl="/spline/particles.splinecode"
          variant="particles"
          shouldLoad={shouldLoadScene3}
          preferFallback={preferFallback}
          transparentBackground={false}
          loaderLabel="Calibrating Spatial Signal Field"
        />
      </div>

      {/* Subtle Radial Contrast Vignette */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(7,11,20,0.35)_0%,rgba(7,11,20,0.76)_100%)]"
        aria-hidden="true"
      />

      {/* LAYER 2: Restrained Liquid-Glass Foreground Interface */}
      <div
        className="pointer-events-none relative z-10 mx-auto flex h-full max-w-[1560px] flex-col justify-between px-6 py-8 sm:px-10 lg:px-16 lg:py-11"
        style={{
          opacity: foregroundProgress,
          transform: `translate3d(0, ${foregroundTranslateY}px, 0)`,
        }}
      >
        {/* Top Minimal Dark Glass Brand Pill */}
        <div className="flex items-center justify-between">
          <div className="liquid-pill-dark inline-flex items-center gap-2.5 rounded-full px-4 py-1.5">
            <span
              className="h-2 w-2 rounded-full bg-emerald-400"
              aria-hidden="true"
            />
            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-slate-100">
              LOCUS AI
            </span>
          </div>
        </div>

        {/* Center Intelligence Narrative & Pipeline */}
        <div className="my-auto flex flex-col items-start py-6">
          <div className="liquid-glass-dark max-w-2xl rounded-2xl p-6 sm:p-8">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.26em] text-sky-300">
              LOCUS AI
            </p>

            <h2 className="mt-2.5 font-display text-3xl font-bold leading-[1.12] tracking-[-0.025em] text-white sm:text-4xl lg:text-[44px]">
              FROM SIGNALS TO DECISIONS
            </h2>

            <div className="mt-5 flex flex-col gap-1.5 border-l-2 border-sky-400/40 pl-4 text-sm font-medium text-slate-200 sm:flex-row sm:items-center sm:gap-5 sm:text-base">
              <span>Structured market data.</span>
              <span className="hidden text-slate-500 sm:inline" aria-hidden="true">
                •
              </span>
              <span>Ground-level evidence.</span>
              <span className="hidden text-slate-500 sm:inline" aria-hidden="true">
                •
              </span>
              <span>Spatial intelligence.</span>
            </div>
          </div>

          <div className="mt-6 w-full">
            <PipelineVisual />
          </div>

          <div className="mt-8">
            <GlassCTA
              label="ENTER LOCUS"
              onClick={onEnterLocus}
              variant="dark"
              ariaLabel="Enter LOCUS Market Discovery Workspace"
            />
          </div>
        </div>

        {/* Bottom Subtle Status Bar */}
        <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">
          <span>Spatial Intelligence Layer</span>
          <span className="hidden sm:inline">
            LOCATION → GROUND REALITY → INTELLIGENCE → DECISION
          </span>
        </div>
      </div>
    </section>
  );
};
