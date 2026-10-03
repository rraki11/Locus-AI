import React from 'react';

export type SplineSceneVariant = 'glassmorph' | 'particles';

interface SplineLoaderProps {
  variant: SplineSceneVariant;
  label?: string;
}

export const SplineLoader: React.FC<SplineLoaderProps> = ({ variant, label }) => {
  const isLight = variant === 'glassmorph';

  return (
    <div
      className={`pointer-events-none absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-500 ${
        isLight
          ? 'bg-[#F1F4F3] text-[#0B1220]/70'
          : 'bg-[#070B14] text-slate-400'
      }`}
      role="status"
      aria-live="polite"
    >
      {/* Subtle Concentric Spatial Rings */}
      <div className="relative flex items-center justify-center">
        <div
          className={`h-36 w-36 rounded-full border ${
            isLight ? 'border-[#A9B8B3]/40' : 'border-sky-400/15'
          } animate-ping`}
          style={{ animationDuration: '3.2s' }}
        />
        <div
          className={`absolute h-20 w-20 rounded-full border ${
            isLight
              ? 'border-[#6FAF9B]/40 bg-[#D7E1DD]/40'
              : 'border-sky-400/30 bg-slate-900/60'
          } backdrop-blur-md`}
        />
        <div
          className={`absolute h-2.5 w-2.5 rounded-full ${
            isLight ? 'bg-[#3D806D]' : 'bg-sky-400'
          }`}
        />
      </div>

      {label && (
        <span className="mt-5 font-mono text-[11px] uppercase tracking-[0.18em] opacity-75">
          {label}
        </span>
      )}
    </div>
  );
};
