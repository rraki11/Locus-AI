import React, { useCallback, useEffect, useRef, useState } from 'react';
import { HeroExperience } from '../components/landing/HeroExperience';
import { ExperienceTransition } from '../components/transitions/ExperienceTransition';
import { WorkspacePage } from './WorkspacePage';

interface LandingPageProps {
  onEnterWorkspace?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = () => {
  const heroTrackRef = useRef<HTMLDivElement>(null);
  const workspaceAnchorRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);
  const [manualFallback, setManualFallback] = useState<boolean>(false);

  // Detect OS prefers-reduced-motion preference
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setReducedMotion(event.matches);
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Measure continuous transition progress (0.00 -> 1.00) from Hero into Workspace
  useEffect(() => {
    let rafId: number | null = null;

    const updateScroll = () => {
      const track = heroTrackRef.current;
      if (!track) return;

      const rect = track.getBoundingClientRect();
      const transitionDistance = Math.max(1, window.innerHeight * 0.85);
      const rawProgress = -rect.top / transitionDistance;
      const clamped = Math.min(1, Math.max(0, rawProgress));
      setScrollProgress(clamped);
    };

    const onScroll = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        updateScroll();
        rafId = null;
      });
    };

    updateScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, []);

  // Fast, smooth transition from Hero into the LOCUS Intelligence Workspace
  const handleExploreMarket = useCallback(() => {
    const anchor = workspaceAnchorRef.current;
    if (!anchor) return;
    anchor.scrollIntoView({
      behavior: reducedMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  }, [reducedMotion]);

  const handleScrollToTop = useCallback(() => {
    window.scrollTo({
      top: 0,
      behavior: reducedMotion ? 'auto' : 'smooth',
    });
  }, [reducedMotion]);

  const preferFallback = reducedMotion || manualFallback;
  const isWorkspaceActive = scrollProgress >= 0.55;

  return (
    <div className="relative w-full bg-[#06090E]">
      {/* SECTION 1: Preserved Opening Hero + Smooth Light-to-Dark Spatial Transition */}
      <div
        ref={heroTrackRef}
        className="relative h-[135vh] w-full select-none"
      >
        <div className="sticky top-0 h-screen w-full overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              zIndex: 10,
              pointerEvents: scrollProgress < 0.7 ? 'auto' : 'none',
            }}
          >
            <HeroExperience
              scrollProgress={scrollProgress * 0.65}
              preferFallback={preferFallback}
              onExploreClick={handleExploreMarket}
            />
          </div>

          {!reducedMotion && (
            <ExperienceTransition scrollProgress={scrollProgress * 0.7} />
          )}
        </div>
      </div>

      {/* SECTION 2: Continuous LOCUS Intelligence Workspace (Directly After Hero) */}
      <div
        id="locus-workspace"
        ref={workspaceAnchorRef}
        className="relative z-20 min-h-screen w-full bg-[#06090E]"
      >
        <WorkspacePage
          onBack={handleScrollToTop}
          embeddedInLanding={true}
          externalReducedMotion={preferFallback}
        />
      </div>

      {/* Right-Edge Stage Indicator (Hero vs Workspace) */}
      <nav
        aria-label="Experience Stage Navigation"
        className="pointer-events-auto fixed right-5 top-1/2 z-50 hidden -translate-y-1/2 flex-col items-center gap-3 sm:flex"
      >
        <button
          type="button"
          onClick={handleScrollToTop}
          aria-label="Opening Hero Experience"
          title="01 — LOCUS AI Opening Hero"
          className={`h-8 w-1.5 rounded-full transition-all duration-300 ${
            !isWorkspaceActive
              ? 'bg-[#0B1220] shadow-sm'
              : 'bg-slate-600/50 hover:bg-slate-400'
          }`}
        />
        <button
          type="button"
          onClick={handleExploreMarket}
          aria-label="LOCUS Intelligence Workspace"
          title="02 — LOCUS Intelligence Workspace"
          className={`h-8 w-1.5 rounded-full transition-all duration-300 ${
            isWorkspaceActive
              ? 'bg-[#6FAF9B] shadow-[0_0_12px_rgba(111,175,155,0.5)]'
              : 'bg-slate-400/50 hover:bg-slate-600'
          }`}
        />
      </nav>

      {/* Discreet Render Mode Toggle */}
      <div className="pointer-events-auto fixed bottom-4 right-5 z-50">
        <button
          type="button"
          onClick={() => setManualFallback((prev) => !prev)}
          className={`rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors ${
            isWorkspaceActive
              ? 'border border-white/10 bg-slate-900/75 text-slate-400 hover:border-white/25 hover:text-slate-200'
              : 'border border-[#0B1220]/10 bg-[#F1F4F3]/75 text-[#0B1220]/70 hover:border-[#0B1220]/25 hover:text-[#0B1220]'
          } backdrop-blur-md`}
          title="Toggle between 3D Spatial WebGL / Live Light-Field and Static Fallback"
        >
          {preferFallback ? 'Mode: Lightweight Fallback' : 'Mode: 3D Spatial WebGL'}
        </button>
      </div>
    </div>
  );
};
