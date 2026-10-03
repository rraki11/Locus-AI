import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { GlassCTA } from './GlassCTA';
import { LocusSpatialCore } from './LocusSpatialCore';

interface HeroExperienceProps {
  scrollProgress: number;
  preferFallback: boolean;
  onExploreClick: () => void;
}

/**
 * Helper to compute smooth clamped linear progress between two scroll milestones.
 */
function rangeProgress(value: number, start: number, end: number): number {
  if (value <= start) return 0;
  if (value >= end) return 1;
  return (value - start) / (end - start);
}

export const HeroExperience: React.FC<HeroExperienceProps> = ({
  scrollProgress,
  preferFallback,
  onExploreClick,
}) => {
  const heroSectionRef = useRef<HTMLElement>(null);
  // Page/window-level normalized pointer [-1, +1]
  const heroPointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  // Raw client pointer coordinates for 3D node proximity hover even through foreground layers
  const heroClientPointerRef = useRef<{
    clientX: number;
    clientY: number;
    active: boolean;
  }>({
    clientX: 0,
    clientY: 0,
    active: false,
  });

  const [isCtaHovered, setIsCtaHovered] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined' || preferFallback) return;

    const resetToBasePosition = () => {
      heroPointerRef.current = { x: 0, y: 0 };
      heroClientPointerRef.current = {
        ...heroClientPointerRef.current,
        active: false,
      };
    };

    const updateFromClientCoords = (clientX: number, clientY: number) => {
      const rect = heroSectionRef.current?.getBoundingClientRect();
      const width =
        rect && rect.width > 0 ? rect.width : window.innerWidth || 1920;
      const height =
        rect && rect.height > 0 ? rect.height : window.innerHeight || 1080;
      const left = rect ? rect.left : 0;
      const top = rect ? rect.top : 0;

      // Reset smoothly if pointer genuinely leaves the hero viewport bounds
      if (
        clientX < left ||
        clientX > left + width ||
        clientY < top ||
        clientY > top + height
      ) {
        resetToBasePosition();
        return;
      }

      const pointerX = Math.max(
        -1,
        Math.min(1, ((clientX - left) / Math.max(1, width)) * 2 - 1)
      );
      const pointerY = Math.max(
        -1,
        Math.min(1, ((clientY - top) / Math.max(1, height)) * 2 - 1)
      );

      heroPointerRef.current = { x: pointerX, y: pointerY };
      heroClientPointerRef.current = {
        clientX,
        clientY,
        active: true,
      };
    };

    const handlePointerMove = (event: PointerEvent | MouseEvent) => {
      updateFromClientCoords(event.clientX, event.clientY);
    };

    const handleWindowMouseOut = (event: MouseEvent) => {
      if (!event.relatedTarget && !(event as any).toElement) {
        resetToBasePosition();
      }
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('mousemove', handlePointerMove, { passive: true });
    window.addEventListener('mouseout', handleWindowMouseOut, { passive: true });
    window.addEventListener('blur', resetToBasePosition, { passive: true });
    document.documentElement.addEventListener('mouseleave', resetToBasePosition, {
      passive: true,
    });

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseout', handleWindowMouseOut);
      window.removeEventListener('blur', resetToBasePosition);
      document.documentElement.removeEventListener(
        'mouseleave',
        resetToBasePosition
      );
    };
  }, [preferFallback]);

  // 0.00 -> 0.15: Opening holds steady; 0.15 -> 0.38: Opening text fades out
  const textFadeProgress = rangeProgress(scrollProgress, 0.12, 0.38);
  const heroTextOpacity = 1 - textFadeProgress;
  const heroTextTranslateY = textFadeProgress * -56;

  // 0.42 -> 0.64: Light environment transforms into dark workspace environment
  const scene1FadeOut = rangeProgress(scrollProgress, 0.42, 0.64);
  const scene1Opacity = 1 - scene1FadeOut;

  return (
    <section
      ref={heroSectionRef}
      aria-label="LOCUS AI Opening Experience"
      className="relative h-full w-full overflow-hidden select-none bg-[#F4F7F6]"
    >
      {/* LAYER 1: Subtle Architectural Geospatial Grid & Soft Ambient Background */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        style={{ opacity: scene1Opacity }}
        aria-hidden="true"
      >
        {/* Very faint editorial coordinate grid */}
        <div
          className="absolute inset-0 opacity-[0.32]"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(11, 18, 32, 0.028) 1px, transparent 1px), linear-gradient(to bottom, rgba(11, 18, 32, 0.028) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />

        {/* Fixed volumetric sage/silver environmental wash anchored on the right half */}
        <div
          className="absolute left-[70%] top-[50%] h-[780px] w-[860px] -translate-x-1/2 -translate-y-1/2"
          style={{
            background:
              'radial-gradient(ellipse 50% 48% at 50% 50%, rgba(111, 175, 155, 0.13) 0%, rgba(169, 184, 179, 0.07) 44%, rgba(215, 225, 221, 0.025) 70%, transparent 84%)',
          }}
        />
      </div>

      {/* LAYER 2: Right-Side Fixed Spatial Instrument "LOCUS Spatial Core" */}
      <div
        className="absolute inset-y-0 right-0 z-10 w-full md:w-[54%] lg:w-[52%] xl:w-[50%]"
        style={{
          opacity: scene1Opacity,
          transform: `translate3d(0, ${textFadeProgress * -24}px, 0)`,
        }}
      >
        <LocusSpatialCore
          heroPointerRef={heroPointerRef}
          heroClientPointerRef={heroClientPointerRef}
          isCtaHovered={isCtaHovered}
          preferFallback={preferFallback}
        />
      </div>

      {/* LAYER 3: Foreground Left-Side Editorial Typography & CTA */}
      <div
        className="pointer-events-none relative z-20 mx-auto flex h-full max-w-[1560px] flex-col justify-between px-6 py-8 sm:px-10 lg:px-16 lg:py-11"
        style={{
          opacity: heroTextOpacity,
          transform: `translate3d(0, ${heroTextTranslateY}px, 0)`,
        }}
      >
        {/* Top Minimal Brand Signature */}
        <header className="flex items-center justify-between">
          <div className="liquid-pill-light pointer-events-auto inline-flex items-center gap-2.5 rounded-full px-4 py-1.5">
            <span
              className="h-2 w-2 rounded-full bg-[#3D806D]"
              aria-hidden="true"
            />
            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-[#0B1220]">
              LOCUS AI
            </span>
          </div>
        </header>

        {/* Main Left-Side Editorial Focal Content */}
        <div className="my-auto max-w-[540px] py-6">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.26em] text-[#3D806D]">
            LOCUS AI
          </p>

          <h1 className="mt-3 font-display text-4xl font-bold leading-[1.06] tracking-[-0.03em] text-[#0B1220] sm:text-5xl lg:text-[56px]">
            Know where to grow{' '}
            <span className="text-[#2E735F]">before</span> you spend.
          </h1>

          <p className="mt-5 max-w-md text-base font-normal leading-relaxed text-[#0B1220]/75 sm:text-[17px]">
            Market entry intelligence that combines structured location data with
            ground-level visual intelligence.
          </p>

          <div className="mt-8 flex items-center gap-4">
            <GlassCTA
              label="EXPLORE A MARKET"
              onClick={onExploreClick}
              onMouseEnter={() => setIsCtaHovered(true)}
              onMouseLeave={() => setIsCtaHovered(false)}
              variant="light"
              ariaLabel="Explore a market — scroll to LOCUS intelligence experience"
            />
          </div>
        </div>

        {/* Bottom Subtle Scroll Indicator */}
        <div className="flex items-center justify-between text-[#0B1220]/75">
          <button
            type="button"
            onClick={onExploreClick}
            className="pointer-events-auto group inline-flex items-center gap-2.5 font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-[#0B1220]/75 transition-colors hover:text-[#0B1220] focus:outline-none"
          >
            <span>Scroll to structure signals</span>
            <ChevronDown
              className="h-3.5 w-3.5 text-[#3D806D] transition-transform duration-300 group-hover:translate-y-0.5"
              aria-hidden="true"
            />
          </button>
        </div>
      </div>
    </section>
  );
};
