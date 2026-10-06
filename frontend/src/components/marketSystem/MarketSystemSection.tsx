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
  /** Scroll transition progress from Page 2 into Page 3 (0 = fully inside Page 2, 1 = fully inside Page 3) */
  exitProgress?: number;
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
  exitProgress = 0,
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

  // Smooth emergence curve as the user scrolls from Page 1 into Page 2,
  // paired with smooth depth recession as the user enters Page 3
  const entryProgress = Math.min(
    1,
    Math.max(0, (scrollProgress - 0.18) / 0.52)
  );
  const exitPhase = Math.min(1, Math.max(0, exitProgress));
  const exitEase = 1 - Math.pow(1 - exitPhase, 2);

  const contentTranslateY = preferFallback
    ? 0
    : (1 - entryProgress) * 26 - exitEase * 24;
  const contentOpacity = preferFallback ? 1 : 1 - exitEase * 0.52;
  const stageScale = preferFallback
    ? 1
    : (0.96 + entryProgress * 0.04) * (1 - exitEase * 0.038);
  const stageOpacity = preferFallback
    ? 1
    : (0.4 + entryProgress * 0.6) * (1 - exitEase * 0.55);

  return (
    <section
      ref={sectionRef}
      aria-label="Understand the Market — Spatial Intelligence Layer"
      className="relative min-h-screen w-full overflow-hidden bg-[#080914] text-[#F8FAFC] select-none"
      style={{
        background:
          'radial-gradient(ellipse 88% 78% at 64% 50%, #111328 0%, #090B18 54%, #060710 100%)',
      }}
    >
      {/* LAYER 1: Prismatic Obsidian Spatial Grid & Multi-Spectrum Volumetric Field */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div
          className="absolute inset-0 opacity-[0.28]"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(192, 132, 252, 0.045) 1px, transparent 1px), linear-gradient(to bottom, rgba(56, 189, 248, 0.04) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />

        {/* Upper-left violet/magenta dispersion bloom echoing the upper 3D star */}
        <div
          className="absolute left-[56%] top-[36%] h-[680px] w-[720px] -translate-x-1/2 -translate-y-1/2"
          style={{
            background:
              'radial-gradient(ellipse 52% 48% at 50% 50%, rgba(192, 132, 252, 0.16) 0%, rgba(217, 70, 239, 0.07) 44%, rgba(9, 11, 24, 0.0) 76%)',
          }}
        />

        {/* Lower-right electric cyan & rose-coral dispersion bloom echoing the lower 3D star */}
        <div
          className="absolute left-[74%] top-[64%] h-[640px] w-[700px] -translate-x-1/2 -translate-y-1/2"
          style={{
            background:
              'radial-gradient(ellipse 50% 48% at 50% 50%, rgba(56, 189, 248, 0.14) 0%, rgba(244, 114, 182, 0.06) 46%, rgba(9, 11, 24, 0.0) 78%)',
          }}
        />

        {/* Subtle left editorial ambient wash so the left typography sits inside the same luminous atmosphere */}
        <div
          className="absolute left-[18%] top-[48%] h-[520px] w-[560px] -translate-x-1/2 -translate-y-1/2"
          style={{
            background:
              'radial-gradient(circle at 50% 50%, rgba(168, 85, 247, 0.08) 0%, rgba(56, 189, 248, 0.04) 48%, rgba(8, 9, 20, 0.0) 76%)',
          }}
        />

        {/* Bottom-edge obsidian feather into Page 3 (#030208) so there is zero horizontal seam */}
        <div
          className="absolute inset-x-0 bottom-0 h-36"
          style={{
            background:
              'linear-gradient(to bottom, rgba(6, 7, 16, 0) 0%, rgba(4, 3, 12, 0.68) 58%, #030208 100%)',
          }}
        />
      </div>

      {/* LAYER 2: Main Page 2 Editorial + 3D Spatial Composition */}
      <div
        className="relative z-10 mx-auto flex min-h-screen max-w-[1560px] flex-col justify-between px-6 py-8 sm:px-10 lg:px-16 lg:py-11"
        style={{
          opacity: contentOpacity,
          transform: `translate3d(0, ${contentTranslateY.toFixed(1)}px, 0)`,
        }}
      >
        {/* Top Minimal Prismatic Obsidian Glass Section Header */}
        <header className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2.5 rounded-full border border-[#C084FC]/30 bg-[#0B0E1D]/85 px-4 py-1.5 shadow-[0_8px_28px_-6px_rgba(12,8,28,0.8),inset_0_1px_0_0_rgba(255,255,255,0.12)] backdrop-blur-md">
            <span
              className="h-2 w-2 rounded-full bg-gradient-to-tr from-[#C084FC] via-[#E879F9] to-[#38BDF8] shadow-[0_0_10px_rgba(217,70,239,0.85)]"
              aria-hidden="true"
            />
            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-[#F8FAFC]">
              LOCUS AI
            </span>
            <span className="text-white/20" aria-hidden="true">
              /
            </span>
            <span className="bg-gradient-to-r from-[#C084FC] via-[#E879F9] to-[#38BDF8] bg-clip-text font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-transparent">
              02 — SPATIAL SYSTEM
            </span>
          </div>

          {onBackToHero && (
            <button
              type="button"
              onClick={onBackToHero}
              className="inline-flex items-center gap-2 rounded-full border border-[#C084FC]/25 bg-[#0B0E1D]/80 px-3.5 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#E2E8F0]/85 shadow-sm backdrop-blur-md transition-colors hover:border-[#38BDF8]/55 hover:text-white"
            >
              <ArrowUp className="h-3 w-3 text-[#C084FC]" aria-hidden="true" />
              <span>Vision</span>
            </button>
          )}
        </header>

        {/* Center Split Layout: Editorial Left, Interactive 3D Spline System Right */}
        <div className="my-auto grid grid-cols-1 items-center gap-10 py-6 lg:grid-cols-12 lg:gap-8">
          {/* LEFT COLUMN: Editorial Narrative */}
          <div className="lg:col-span-5">
            <div className="inline-flex items-center gap-2">
              <span
                className="h-1.5 w-1.5 rotate-45 bg-gradient-to-tr from-[#D946EF] to-[#38BDF8] shadow-[0_0_8px_rgba(217,70,239,0.8)]"
                aria-hidden="true"
              />
              <p className="bg-gradient-to-r from-[#C084FC] via-[#F472B6] to-[#38BDF8] bg-clip-text font-mono text-xs font-semibold uppercase tracking-[0.26em] text-transparent">
                UNDERSTAND THE MARKET
              </p>
            </div>

            <h2 className="mt-3 font-display text-4xl font-bold leading-[1.08] tracking-[-0.03em] text-[#F8FAFC] sm:text-5xl lg:text-[52px]">
              Every market is a{' '}
              <span className="bg-gradient-to-r from-[#C084FC] via-[#E879F9] to-[#38BDF8] bg-clip-text text-transparent drop-shadow-[0_0_26px_rgba(192,132,252,0.28)]">
                spatial system.
              </span>
            </h2>

            <p className="mt-5 max-w-md text-base font-normal leading-relaxed text-[#CBD5E1]/90 sm:text-[17px]">
              LOCUS connects geography, competition, accessibility and
              commercial activity to understand what is happening around a
              candidate location before you commit capital.
            </p>

            {/* Small Conceptual Sequence: LOCATION -> MARKET -> SIGNALS -> INTELLIGENCE */}
            <div className="mt-8 inline-flex flex-wrap items-center gap-2 rounded-2xl border border-[#C084FC]/30 bg-[linear-gradient(135deg,rgba(15,18,38,0.92)_0%,rgba(10,13,26,0.94)_100%)] px-4 py-3 shadow-[0_18px_40px_-12px_rgba(10,8,26,0.85),0_0_28px_-10px_rgba(192,132,252,0.22),inset_0_1px_0_0_rgba(255,255,255,0.12)] backdrop-blur-md">
              {CONCEPTUAL_SEQUENCE.map((step, index) => {
                const stepColorClass =
                  step === 'INTELLIGENCE'
                    ? 'bg-gradient-to-r from-[#E879F9] to-[#38BDF8] bg-clip-text text-transparent font-bold'
                    : step === 'SIGNALS'
                    ? 'text-[#F472B6]'
                    : step === 'MARKET'
                    ? 'text-[#D8B4FE]'
                    : 'text-[#F1F5F9]';

                return (
                  <React.Fragment key={step}>
                    <span
                      className={`font-mono text-[11px] font-semibold uppercase tracking-[0.18em] ${stepColorClass}`}
                    >
                      {step}
                    </span>
                    {index < CONCEPTUAL_SEQUENCE.length - 1 && (
                      <span
                        className="font-mono text-xs text-[#C084FC]/80"
                        aria-hidden="true"
                      >
                        →
                      </span>
                    )}
                  </React.Fragment>
                );
              })}
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
        <footer className="flex items-center justify-between border-t border-[#C084FC]/15 pt-4 font-mono text-[10.5px] uppercase tracking-[0.18em] text-[#94A3B8]">
          <span className="text-[#CBD5E1]/75">
            LOCUS SPATIAL INTELLIGENCE LAYER
          </span>
          <div className="flex items-center gap-4">
            <span className="hidden text-[#CBD5E1]/70 md:inline">
              CITY → LOCAL AREA → CANDIDATE LOCATION → GROUND REALITY
            </span>
            {onEnterDiscovery && (
              <button
                type="button"
                onClick={onEnterDiscovery}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#C084FC]/40 bg-[linear-gradient(135deg,rgba(192,132,252,0.14)_0%,rgba(56,189,248,0.14)_100%)] px-3.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#E9D5FF] shadow-[0_0_20px_-6px_rgba(192,132,252,0.4)] transition-all hover:border-[#38BDF8]/70 hover:text-white"
              >
                <span>01 / Market Discovery</span>
                <ArrowDown className="h-3 w-3 text-[#38BDF8]" aria-hidden="true" />
              </button>
            )}
          </div>
        </footer>
      </div>
    </section>
  );
};
