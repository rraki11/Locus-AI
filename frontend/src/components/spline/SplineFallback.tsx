import React, { useMemo } from 'react';
import { SplineSceneVariant } from './SplineLoader';

interface SplineFallbackProps {
  variant: SplineSceneVariant;
  className?: string;
}

export const SplineFallback: React.FC<SplineFallbackProps> = ({
  variant,
  className = '',
}) => {
  const particleNodes = useMemo(() => {
    return Array.from({ length: 48 }, (_, index) => {
      const seed = (index * 73 + 19) % 100;
      const x = ((index * 37) % 92) + 4;
      const y = ((index * 53 + 11) % 88) + 6;
      const size = (seed % 3) + 1.5;
      const opacity = 0.2 + (seed % 50) / 100;
      return { id: index, x, y, size, opacity };
    });
  }, []);

  if (variant === 'glassmorph') {
    return (
      <div
        className={`pointer-events-none relative h-full w-full overflow-hidden bg-[#F1F4F3] ${className}`}
        aria-hidden="true"
      >
        {/* Subtle Spatial Grid */}
        <div
          className="absolute inset-0 opacity-35"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(169,184,179,0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(169,184,179,0.18) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />

        {/* Layered Liquid-Glass Architectural Planes with Oxidized Green-Silver Sphere */}
        <div className="absolute left-[46%] top-[24%] h-[380px] w-[380px] rounded-full bg-[radial-gradient(circle_at_35%_35%,#D7E1DD_0%,#A9B8B3_48%,#6FAF9B_78%,#3D806D_100%)] opacity-70 blur-2xl" />
        <div className="absolute left-[38%] top-[18%] h-72 w-72 rounded-3xl border border-white/80 bg-[#D7E1DD]/35 backdrop-blur-xl shadow-2xl" />
        <div className="absolute left-[48%] top-[28%] h-64 w-64 rounded-3xl border border-white/90 bg-gradient-to-br from-white/55 to-[#A9B8B3]/25 backdrop-blur-2xl shadow-xl" />
      </div>
    );
  }

  // Variant: 'particles' (Dark Intelligence Field)
  return (
    <div
      className={`pointer-events-none relative h-full w-full overflow-hidden bg-[#070B14] ${className}`}
      aria-hidden="true"
    >
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 45%, rgba(56, 189, 248, 0.14), transparent 65%)',
        }}
      />
      <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {particleNodes.map((node) => (
          <circle
            key={node.id}
            cx={node.x}
            cy={node.y}
            r={node.size * 0.16}
            fill={node.id % 4 === 0 ? '#38BDF8' : node.id % 7 === 0 ? '#10B981' : '#94A3B8'}
            fillOpacity={node.opacity}
          />
        ))}
      </svg>
    </div>
  );
};
