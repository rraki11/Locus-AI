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
  // Active between 0.25 (distortion prominence) and 0.85 (particles dominant)
  if (scrollProgress <= 0.22 || scrollProgress >= 0.88) {
    return null;
  }

  // 0.42 -> 0.62: Light environment transforms into dark environment
  const lightToDark = rangeProgress(scrollProgress, 0.42, 0.62);

  // Bell curve for refractive spatial datum rings peaking around 0.50
  const phaseT = rangeProgress(scrollProgress, 0.25, 0.78);
  const ringOpacity = Math.sin(phaseT * Math.PI);
  const ringScale = 0.78 + phaseT * 0.85;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-15 overflow-hidden"
      aria-hidden="true"
    >
      {/* Controlled Light -> Dark Spatial Transformation Veil */}
      <div
        className="absolute inset-0"
        style={{
          opacity: lightToDark * 0.88 * (1 - rangeProgress(scrollProgress, 0.68, 0.84)),
          background:
            'radial-gradient(circle at 55% 50%, rgba(15, 23, 42, 0.92) 0%, rgba(7, 11, 20, 0.98) 60%, rgba(7, 11, 20, 1) 100%)',
        }}
      />

      {/* Subtle Spatial Calibration Rings Bridging Glassmorph -> Particle Field */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          opacity: ringOpacity * 0.55,
          transform: `scale(${ringScale})`,
        }}
      >
        <div className="relative flex h-[440px] w-[440px] items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-dashed border-[#6FAF9B]/25" />
          <div className="absolute inset-14 rounded-full border border-[#D7E1DD]/15" />
          <div className="absolute inset-28 rounded-full border border-[#3D806D]/20" />
        </div>
      </div>
    </div>
  );
};
