import React, { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import {
  DEFAULT_MARKET_SIGNAL_NODES,
  MarketSpatialSignalNode,
  SplineMarketVisual,
} from './SplineMarketVisual';

export interface MarketSystemSectionProps {
  /** Scroll transition progress (0 = top of Page 1, 1 = fully inside Page 2) */
  scrollProgress?: number;
  preferFallback?: boolean;
  onBackToHero?: () => void;
  onEnterDiscovery?: () => void;
}

const CONCEPTUAL_SEQUENCE = [
  'LOCATION',
  'MARKET',
  'SIGNALS',
  'INTELLIGENCE',
] as const;

export const MarketSystemSection: React.FC<MarketSystemSectionProps> = ({
  scrollProgress = 1,
  preferFallback = false,
  onBackToHero,
  onEnterDiscovery,
}) => {
  const sectionRef = useRef<HTMLElement>(null);
  const pointerRef = useRef<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false,
  });

  const [activeNodeId, setActiveNodeId] = useState<
    MarketSpatialSignalNode['id'] | null
  >(null);

  // Track pointer across the entire Page 2 viewport so hovering text or whitespace
  // still drives smooth spatial depth in the 3D Spline stage.
  useEffect(() => {
    if (typeof window === 'undefined' || preferFallback) return;

    const resetPointer = () => {
      pointerRef.current = { x: 0, y: 0, active: false };
    };

    const handlePointerMove = (event: PointerEvent | MouseEvent) => {
      const rect = sectionRef.current?.getBoundingClientRect();
      const width =
        rect && rect.width > 0 ? rect.width : window.innerWidth || 1920;
      const height =
        rect && rect.height > 0 ? rect.height : window.innerHeight || 1080;
      const left = rect ? rect.left : 0;
      const top = rect ? rect.top : 0;

      if (
        event.clientX < left ||
        event.clientX > left + width ||
        event.clientY < top ||
        event.clientY > top + height
      ) {
        resetPointer();
        return;
      }

      const normX = Math.max(
        0,
        Math.min(1, (event.clientX - left) / Math.max(1, width))
      );
      const normY = Math.max(
        0,
        Math.min(1, (event.clientY - top) / Math.max(1, height))
      );

      pointerRef.current = {
        x: normX * 2 - 1,
        y: normY * 2 - 1,
        active: true,
      };
    };

    const handleWindowMouseOut = (event: MouseEvent) => {
      if (!event.relatedTarget && !(event as any).toElement) {
        resetPointer();
      }
    };

    window.addEventListener('pointermove', handlePointerMove, {
      passive: true,
    });
    window.addEventListener('mousemove', handlePointerMove, { passive: true });
    window.addEventListener('mouseout', handleWindowMouseOut, {
      passive: true,
    });
    window.addEventListener('blur', resetPointer, { passive: true });

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseout', handleWindowMouseOut);
      window.removeEventListener('blur', resetPointer);
    };
  }, [preferFallback]);

  // Smooth emergence curve as the user scrolls from Page 1 into Page 2
  const entryProgress = Math.min(
    1,
    Math.max(0, (scrollProgress - 0.18) / 0.52)
  );
  const contentTranslateY = preferFallback ? 0 : (1 - entryProgress) * 26;
  const stageScale = preferFallback ? 1 : 0.96 + entryProgress * 0.04;
  const stageOpacity = preferFallback ? 1 : 0.4 + entryProgress * 0.6;

  return (
    <section
      ref={sectionRef}
      aria-label="Understand the Market — Spatial Intelligence Layer"
      className="relative min-h-screen w-full overflow-hidden bg-[#0A1016] text-[#F1F5F9] select-none"
      style={{
        background:
          'radial-gradient(ellipse 85% 75% at 62% 50%, #0C131A 0%, #0A1016 54%, #080C12 100%)',
      }}
    >
      {/* LAYER 1: Subtle Dark Spatial Coordinate Grid & Tonal LOCUS Sage Ambient Field */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div
          className="absolute inset-0 opacity-[0.26]"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(215, 225, 221, 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(215, 225, 221, 0.04) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />

        {/* Soft volumetric sage/mint spatial depth wash anchored behind the right-side 3D stage */}
        <div
          className="absolute left-[68%] top-[50%] h-[820px] w-[900px] -translate-x-1/2 -translate-y-1/2"
          style={{
            background:
              'radial-gradient(ellipse 52% 48% at 50% 50%, rgba(61, 128, 109, 0.14) 0%, rgba(111, 175, 155, 0.06) 46%, rgba(12, 19, 26, 0.0) 78%)',
          }}
        />
      </div>

      {/* LAYER 2: Main Page 2 Editorial + 3D Spatial Composition */}
      <div
        className="relative z-10 mx-auto flex min-h-screen max-w-[1560px] flex-col justify-between px-6 py-8 sm:px-10 lg:px-16 lg:py-11"
        style={{
          transform: `translate3d(0, ${contentTranslateY}px, 0)`,
        }}
      >
        {/* Top Minimal Dark Glass Section Header */}
        <header className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-[#0C131A]/80 px-4 py-1.5 shadow-[0_8px_24px_-6px_rgba(0,0,0,0.65)] backdrop-blur-md">
            <span
              className="h-2 w-2 rounded-full bg-[#6FAF9B]"
              aria-hidden="true"
            />
            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-[#F1F5F9]">
              LOCUS AI
            </span>
            <span className="text-white/20" aria-hidden="true">
              /
            </span>
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6FAF9B]">
              02 — SPATIAL SYSTEM
            </span>
          </div>

          {onBackToHero && (
            <button
              type="button"
              onClick={onBackToHero}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-[#0C131A]/80 px-3.5 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#D7E1DD]/80 shadow-sm backdrop-blur-md transition-colors hover:border-[#6FAF9B]/40 hover:text-white"
            >
              <ArrowUp className="h-3 w-3 text-[#6FAF9B]" aria-hidden="true" />
              <span>Vision</span>
            </button>
          )}
        </header>

        {/* Center Split Layout: Editorial Left, Interactive 3D Spline System Right */}
        <div className="my-auto grid grid-cols-1 items-center gap-10 py-6 lg:grid-cols-12 lg:gap-8">
          {/* LEFT COLUMN: Editorial Narrative */}
          <div className="lg:col-span-5">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.26em] text-[#6FAF9B]">
              UNDERSTAND THE MARKET
            </p>

            <h2 className="mt-3 font-display text-4xl font-bold leading-[1.08] tracking-[-0.03em] text-[#F8FAFC] sm:text-5xl lg:text-[52px]">
              Every market is a{' '}
              <span className="text-[#6FAF9B]">spatial system.</span>
            </h2>

            <p className="mt-5 max-w-md text-base font-normal leading-relaxed text-[#CBD5E1]/90 sm:text-[17px]">
              LOCUS connects geography, competition, accessibility and
              commercial activity to understand what is happening around a
              candidate location before you commit capital.
            </p>

            {/* Small Conceptual Sequence: LOCATION -> MARKET -> SIGNALS -> INTELLIGENCE */}
            <div className="mt-8 inline-flex flex-wrap items-center gap-2 rounded-2xl border border-[#6FAF9B]/25 bg-[#0C131A]/90 px-4 py-3 shadow-[0_16px_36px_-12px_rgba(0,0,0,0.7)] backdrop-blur-md">
              {CONCEPTUAL_SEQUENCE.map((step, index) => (
                <React.Fragment key={step}>
                  <span
                    className={`font-mono text-[11px] font-semibold uppercase tracking-[0.18em] ${
                      step === 'INTELLIGENCE'
                        ? 'text-[#6FAF9B]'
                        : 'text-[#E2E8F0]'
                    }`}
                  >
                    {step}
                  </span>
                  {index < CONCEPTUAL_SEQUENCE.length - 1 && (
                    <span
                      className="font-mono text-xs text-[#6FAF9B]/75"
                      aria-hidden="true"
                    >
                      →
                    </span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* RIGHT / CENTER COLUMN: Large Spline Spatial Visualization */}
          <div
            className="lg:col-span-7"
            style={{
              opacity: stageOpacity,
              transform: `scale(${stageScale})`,
              transformOrigin: 'center center',
            }}
          >
            <SplineMarketVisual
              pointerRef={pointerRef}
              nodes={DEFAULT_MARKET_SIGNAL_NODES}
              activeNodeId={activeNodeId}
              onNodeHover={setActiveNodeId}
              preferFallback={preferFallback}
              shouldLoad={true}
            />
          </div>
        </div>

        {/* Bottom Subtle Spatial Hierarchy Footer */}
        <footer className="flex items-center justify-between border-t border-white/[0.07] pt-4 font-mono text-[10.5px] uppercase tracking-[0.18em] text-[#94A3B8]">
          <span>LOCUS SPATIAL INTELLIGENCE LAYER</span>
          <div className="flex items-center gap-4">
            <span className="hidden md:inline">
              CITY → LOCAL AREA → CANDIDATE LOCATION → GROUND REALITY
            </span>
            {onEnterDiscovery && (
              <button
                type="button"
                onClick={onEnterDiscovery}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#6FAF9B]/35 bg-[#0C131A]/90 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6FAF9B] transition-colors hover:border-[#6FAF9B]/70 hover:text-white"
              >
                <span>01 / Market Discovery</span>
                <ArrowDown className="h-3 w-3" aria-hidden="true" />
              </button>
            )}
          </div>
        </footer>
      </div>
    </section>
  );
};
