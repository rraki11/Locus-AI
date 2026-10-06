import React from 'react';

interface ExperienceTransitionProps {
  scrollProgress: number;
  /**
   * 'light-to-dark' (default): Page 1 (Pale-Mint Hero) -> Page 2 (Dark Spatial System)
   * 'spatial-to-workspace': Page 2 (Spatial System) -> Page 3 (LOCUS Workspace / View 1)
   */
  mode?: 'light-to-dark' | 'spatial-to-workspace';
}

function rangeProgress(value: number, start: number, end: number): number {
  if (value <= start) return 0;
  if (value >= end) return 1;
  return (value - start) / (end - start);
}

export const ExperienceTransition: React.FC<ExperienceTransitionProps> = ({
  scrollProgress,
  mode = 'light-to-dark',
}) => {
  // Active across the scroll bridge
  if (scrollProgress <= 0.04) {
    return null;
  }

  // Stage A (0.06 -> 0.52): Spatial glow & rings emerge first
  const mintGlowPhase = rangeProgress(scrollProgress, 0.06, 0.52);
  const mintGlowBell = Math.sin(mintGlowPhase * Math.PI);

  // Stage B (0.14 -> 0.78): Gradual darkening into deep charcoal/navy
  const depthDarkening = rangeProgress(scrollProgress, 0.14, 0.78);

  // Stage C (0.10 -> 0.88): LOCUS sage/mint spatial calibration rings reorganize across the depth shift
  const ringPhase = rangeProgress(scrollProgress, 0.1, 0.88);
  const ringBell = Math.sin(ringPhase * Math.PI);
  const ringScale =
    mode === 'spatial-to-workspace'
      ? 1.18 - ringPhase * 0.24 // Field reorganizes inward toward the candidate map anchor
      : 0.84 + ringPhase * 0.68;

  if (mode === 'spatial-to-workspace') {
    const bridgeBell = Math.sin(
      rangeProgress(scrollProgress, 0.04, 0.96) * Math.PI
    );
    const lateralShiftPct = (1 - ringPhase) * 14;
    const ringRotateDeg = (1 - ringPhase) * -18;

    return (
      <div
        className="pointer-events-none absolute inset-0 z-30 overflow-hidden"
        aria-hidden="true"
      >
        {/* 1. Prismatic Spatial Signal Wash (bridges Page 2 into Page 3 indigo/violet/warm-amber looping field) */}
        <div
          className="absolute inset-0"
          style={{
            opacity: bridgeBell * 0.68,
            background:
              'radial-gradient(ellipse 68% 60% at 54% 48%, rgba(217, 70, 239, 0.22) 0%, rgba(79, 70, 229, 0.18) 38%, rgba(249, 115, 22, 0.12) 62%, rgba(3, 2, 10, 0) 84%)',
          }}
        />

        {/* 2. Smooth Obsidian Depth Veil dissolving the boundary between Page 2 (#080914) and Page 3 (#03020A) */}
        <div
          className="absolute inset-0"
          style={{
            opacity: bridgeBell * 0.48,
            background:
              'linear-gradient(180deg, rgba(8, 9, 20, 0.0) 0%, rgba(5, 3, 18, 0.74) 48%, rgba(3, 2, 10, 0.0) 100%)',
          }}
        />

        {/* 3. Reorganizing Spatial Catchment Rings (gliding from Page 2 right stage into Page 3 center map) */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            opacity: ringBell * 0.76,
            transform: `translate3d(${lateralShiftPct.toFixed(
              2
            )}%, 0, 0) scale(${ringScale.toFixed(4)}) rotate(${ringRotateDeg.toFixed(
              1
            )}deg)`,
          }}
        >
          <div className="relative flex h-[540px] w-[540px] items-center justify-center">
            <div className="absolute inset-0 rounded-full border border-dashed border-[#E879F9]/40 shadow-[0_0_48px_rgba(232,121,249,0.18)]" />
            <div className="absolute inset-16 rounded-full border border-[#818CF8]/35 shadow-[0_0_32px_rgba(129,140,248,0.14)]" />
            <div className="absolute inset-32 rounded-full border border-[#FB923C]/45 shadow-[0_0_28px_rgba(251,146,60,0.18)]" />
            <div className="h-2.5 w-2.5 rounded-full bg-gradient-to-tr from-[#4F46E5] via-[#E879F9] to-[#FB923C] shadow-[0_0_16px_rgba(249,115,22,0.9)]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="pointer-events-none absolute inset-0 z-20 overflow-hidden"
      aria-hidden="true"
    >
      {/* 1. Initial Pale-Mint / Sage Spatial Wash (bridges Hero surface into depth) */}
      <div
        className="absolute inset-0"
        style={{
          opacity: mintGlowBell * 0.65,
          background:
            'radial-gradient(circle at 64% 50%, rgba(111, 175, 155, 0.28) 0%, rgba(215, 225, 221, 0.45) 48%, rgba(244, 247, 246, 0.0) 85%)',
        }}
      />

      {/* 2. Gradual Deep Charcoal/Navy Spatial Environment (#080C12 -> #0A1016 -> #0C131A) */}
      <div
        className="absolute inset-0"
        style={{
          opacity: depthDarkening,
          background:
            'radial-gradient(ellipse 80% 75% at 62% 50%, #0C131A 0%, #0A1016 52%, #080C12 100%)',
        }}
      />

      {/* 3. Persistent LOCUS Mint/Sage Spatial Calibration Rings visible during darkening */}
      <div
        className="absolute inset-0 flex items-center justify-center md:translate-x-[12%]"
        style={{
          opacity: ringBell * 0.78,
          transform: `scale(${ringScale})`,
        }}
      >
        <div className="relative flex h-[500px] w-[500px] items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-dashed border-[#6FAF9B]/40 shadow-[0_0_40px_rgba(111,175,155,0.14)]" />
          <div className="absolute inset-16 rounded-full border border-[#3D806D]/30" />
          <div className="absolute inset-32 rounded-full border border-[#D7E1DD]/20" />
        </div>
      </div>
    </div>
  );
};
