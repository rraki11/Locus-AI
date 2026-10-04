import React from 'react';

interface ExperienceTransitionProps {
  scrollProgress: number;
}

function rangeProgress(value: number, start: number, end: number): number {
  if (value <= start) return 0;
  if (value >= end) return 1;
  return (value - start) / (end - start);
}

export const ExperienceTransition: React.FC<ExperienceTransitionProps> = ({
  scrollProgress,
}) => {
  // Active across the scroll bridge from Page 1 into Page 2
  if (scrollProgress <= 0.04) {
    return null;
  }

  // Stage A (0.06 -> 0.52): Pale-mint / LOCUS sage spatial glow & rings emerge first
  const mintGlowPhase = rangeProgress(scrollProgress, 0.06, 0.52);
  const mintGlowBell = Math.sin(mintGlowPhase * Math.PI);

  // Stage B (0.14 -> 0.78): Gradual darkening into deep charcoal/navy (#090E14 / #0A1016)
  const depthDarkening = rangeProgress(scrollProgress, 0.14, 0.78);

  // Stage C (0.12 -> 0.88): LOCUS sage/mint spatial rings remain subtly visible across the depth shift
  const ringPhase = rangeProgress(scrollProgress, 0.1, 0.88);
  const ringBell = Math.sin(ringPhase * Math.PI);
  const ringScale = 0.84 + ringPhase * 0.68;

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
