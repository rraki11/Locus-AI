import React, { useCallback, useEffect, useRef, useState } from 'react';
import { HeroExperience } from '../components/landing/HeroExperience';
import { MarketSystemSection } from '../components/marketSystem/MarketSystemSection';
import { MarketDiscoveryView } from '../components/discovery/MarketDiscoveryView';
import { ExperienceTransition } from '../components/transitions/ExperienceTransition';
import { GroundRealityHandoffPayload } from '../types/streetScan';
import {
  WorkspaceViewKey,
  getPathForViewKey,
} from '../components/common/WorkspaceStageNav';

interface LandingPageProps {
  onEnterWorkspace?: () => void;
  onNavigateToPath?: (path: string) => void;
  onContinueToGroundReality?: (payload: GroundRealityHandoffPayload) => void;
  unlockedViews?: Set<WorkspaceViewKey>;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onEnterWorkspace,
  onNavigateToPath,
  onContinueToGroundReality,
  unlockedViews: externalUnlockedViews,
}) => {
  const heroTrackRef = useRef<HTMLDivElement>(null);
  const marketSystemAnchorRef = useRef<HTMLDivElement>(null);
  const marketDiscoveryAnchorRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [workspaceEntryProgress, setWorkspaceEntryProgress] =
    useState<number>(0);
  const [activeSection, setActiveSection] = useState<
    'page1' | 'page2' | 'view1'
  >('page1');
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);

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

  // Measure continuous transition progress:
  // 1) scrollProgress (0.00 -> 1.00): Page 1 (Hero) -> Page 2 (Market System)
  // 2) workspaceEntryProgress (0.00 -> 1.00): Page 2 (Market System) -> Page 3 / View 1 (Market Discovery Workspace)
  useEffect(() => {
    let rafId: number | null;

    const updateScroll = () => {
      const vh = Math.max(1, window.innerHeight);

      const track = heroTrackRef.current;
      if (track) {
        const rect = track.getBoundingClientRect();
        const transitionDistance = Math.max(1, vh * 0.55);
        const rawProgress = -rect.top / transitionDistance;
        const clamped = Math.min(1, Math.max(0, rawProgress));
        setScrollProgress(clamped);
      }

      const discoveryEl = marketDiscoveryAnchorRef.current;
      if (discoveryEl) {
        const discoveryRect = discoveryEl.getBoundingClientRect();
        // Progress from 0 when Page 3 top enters viewport bottom (100% vh) to 1 when Page 3 top locks in (4% vh)
        const rawEntry = (vh - discoveryRect.top) / (vh * 0.96);
        const clampedEntry = Math.min(1, Math.max(0, rawEntry));
        setWorkspaceEntryProgress(clampedEntry);

        if (discoveryRect.top <= vh * 0.45) {
          setActiveSection('view1');
          return;
        }
      }

      if (track) {
        const rect = track.getBoundingClientRect();
        const clamped = Math.min(
          1,
          Math.max(0, -rect.top / Math.max(1, vh * 0.55))
        );
        if (clamped >= 0.55) {
          setActiveSection('page2');
        } else {
          setActiveSection('page1');
        }
      }
    };

    const onScroll = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        updateScroll();
        rafId = null;
      });
    };

    rafId = null;
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

  const animateScrollToElement = useCallback(
    (targetEl: HTMLElement | null, durationMs = 780) => {
      if (!targetEl || typeof window === 'undefined') return;
      const targetTop =
        window.scrollY + targetEl.getBoundingClientRect().top;

      if (reducedMotion) {
        window.scrollTo({ top: targetTop, behavior: 'auto' });
        return;
      }

      const startTop = window.scrollY;
      const distance = targetTop - startTop;
      if (Math.abs(distance) < 4) return;

      const startTime = performance.now();
      const easeInOutCubic = (t: number) =>
        t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      const step = (now: number) => {
        const elapsed = now - startTime;
        const t = Math.min(1, Math.max(0, elapsed / durationMs));
        const eased = easeInOutCubic(t);
        window.scrollTo(0, startTop + distance * eased);
        if (t < 1) {
          window.requestAnimationFrame(step);
        }
      };

      window.requestAnimationFrame(step);
    },
    [reducedMotion]
  );

  // Smooth transition from Page 1 (Hero) into Page 2 (Understand the Market)
  const handleExploreMarket = useCallback(() => {
    animateScrollToElement(marketSystemAnchorRef.current, 740);
  }, [animateScrollToElement]);

  // Smooth transition from Page 2 into Page 3 / View 1 (01 / Market Discovery Workspace)
  const handleEnterDiscovery = useCallback(() => {
    if (onEnterWorkspace) {
      onEnterWorkspace();
    } else {
      animateScrollToElement(marketDiscoveryAnchorRef.current, 820);
    }
  }, [onEnterWorkspace, animateScrollToElement]);

  const handleScrollToTop = useCallback(() => {
    window.scrollTo({
      top: 0,
      behavior: reducedMotion ? 'auto' : 'smooth',
    });
  }, [reducedMotion]);

  const unlockedViews = externalUnlockedViews ?? new Set(['view1']);

  const scrollToWorkspaceTop = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.requestAnimationFrame(() => {
      marketDiscoveryAnchorRef.current?.scrollIntoView({
        behavior: reducedMotion ? 'auto' : 'smooth',
        block: 'start',
      });
    });
  }, [reducedMotion]);

  const handleContinueToGroundReality = useCallback(
    (payload: GroundRealityHandoffPayload) => {
      if (onContinueToGroundReality) {
        onContinueToGroundReality(payload);
      } else if (onNavigateToPath) {
        onNavigateToPath('/ground-reality');
      } else if (typeof window !== 'undefined') {
        window.history.pushState({}, '', '/ground-reality');
        window.location.pathname = '/ground-reality';
      }
    },
    [onContinueToGroundReality, onNavigateToPath]
  );

  const handleSwitchWorkspaceView = useCallback(
    (targetView: WorkspaceViewKey) => {
      if (targetView === 'view1') {
        scrollToWorkspaceTop();
      } else if (onNavigateToPath) {
        onNavigateToPath(getPathForViewKey(targetView));
      } else if (typeof window !== 'undefined') {
        const nextPath = getPathForViewKey(targetView);
        window.history.pushState({}, '', nextPath);
        window.location.pathname = nextPath;
      }
    },
    [onNavigateToPath, scrollToWorkspaceTop]
  );

  const preferFallback = reducedMotion;

  // Active across the Page 2 -> Page 3 scroll boundary (peaks mid-transition, clears to 0 once settled)
  const page2To3BridgeProgress =
    workspaceEntryProgress > 0.02 && workspaceEntryProgress < 0.96
      ? workspaceEntryProgress
      : 0;

  return (
    <div className="relative w-full bg-[#080914]">
      {/* PAGE 1: Preserved Opening Hero + Smooth Pale-Mint to Charcoal/Navy Spatial Transition */}
      <div
        ref={heroTrackRef}
        className="relative h-[155vh] w-full select-none bg-[#F4F7F6]"
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
            <ExperienceTransition
              scrollProgress={scrollProgress * 0.85}
              mode="light-to-dark"
            />
          )}
        </div>
      </div>

      {/* PAGE 2: Understand the Market — Prismatic Obsidian Spatial Intelligence Environment */}
      <div
        id="understand-the-market"
        ref={marketSystemAnchorRef}
        className="relative z-20 min-h-screen w-full bg-[#080914]"
      >
        <MarketSystemSection
          scrollProgress={scrollProgress}
          exitProgress={workspaceEntryProgress}
          preferFallback={preferFallback}
          onBackToHero={handleScrollToTop}
          onEnterDiscovery={handleEnterDiscovery}
        />
      </div>

      {/* Viewport Spatial Bridge Overlay: Smoothly reorganizes Page 2's spatial field into Page 3's Workspace */}
      {!reducedMotion && page2To3BridgeProgress > 0 && (
        <div
          className="pointer-events-none fixed inset-0 z-30 overflow-hidden"
          aria-hidden="true"
        >
          <ExperienceTransition
            scrollProgress={page2To3BridgeProgress}
            mode="spatial-to-workspace"
          />
        </div>
      )}

      {/* PAGE 3: LOCUS AI Workspace — View 1 (01 / Market Discovery) */}
      <div
        id="market-discovery-workspace"
        ref={marketDiscoveryAnchorRef}
        className="relative z-20 min-h-screen w-full bg-[#03020A]"
      >
        <MarketDiscoveryView
          entryProgress={workspaceEntryProgress}
          preferFallback={preferFallback}
          onBackToPage2={handleExploreMarket}
          onContinueToGroundReality={handleContinueToGroundReality}
          unlockedViews={unlockedViews}
          onNavigateToView={handleSwitchWorkspaceView}
        />
      </div>

      {/* Right-Edge Stage Indicator (Page 1 Vision, Page 2 Understand the Market, Page 3 / View 1 Market Discovery) */}
      <nav
        aria-label="Experience Stage Navigation"
        className="pointer-events-auto fixed right-4 top-1/2 z-50 hidden -translate-y-1/2 flex-col items-center gap-3 sm:flex"
      >
        <button
          type="button"
          onClick={handleScrollToTop}
          aria-label="Page 1 — LOCUS AI Vision"
          title="01 — Know where to grow before you spend"
          className={`h-7 w-1.5 rounded-full transition-all duration-300 ${
            activeSection === 'page1'
              ? 'bg-[#0B1220] shadow-sm'
              : 'bg-slate-500/40 hover:bg-slate-300/70'
          }`}
        />
        <button
          type="button"
          onClick={handleExploreMarket}
          aria-label="Page 2 — Understand the Market"
          title="02 — Every market is a spatial system"
          className={`h-7 w-1.5 rounded-full transition-all duration-300 ${
            activeSection === 'page2'
              ? 'bg-gradient-to-b from-[#E879F9] to-[#38BDF8] shadow-[0_0_12px_rgba(217,70,239,0.65)]'
              : activeSection === 'page1'
              ? 'bg-[#0B1220]/25 hover:bg-[#C084FC]/60'
              : 'bg-slate-500/40 hover:bg-slate-300/70'
          }`}
        />
        <button
          type="button"
          onClick={handleEnterDiscovery}
          aria-label="Page 3 — View 1: Market Discovery Workspace"
          title="03 — LOCUS AI Workspace: Market Discovery"
          className={`h-7 w-1.5 rounded-full transition-all duration-300 ${
            activeSection === 'view1'
              ? 'bg-gradient-to-b from-[#818CF8] via-[#E879F9] to-[#FB923C] shadow-[0_0_12px_rgba(249,115,22,0.75)]'
              : activeSection === 'page1'
              ? 'bg-[#0B1220]/20 hover:bg-[#C084FC]/60'
              : 'bg-slate-500/40 hover:bg-slate-300/70'
          }`}
        />
      </nav>
    </div>
  );
};
