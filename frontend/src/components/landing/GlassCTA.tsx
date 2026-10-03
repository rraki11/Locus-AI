import React from 'react';
import { ArrowRight } from 'lucide-react';

interface GlassCTAProps {
  label: string;
  onClick: () => void;
  variant?: 'light' | 'dark';
  ariaLabel?: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export const GlassCTA: React.FC<GlassCTAProps> = ({
  label,
  onClick,
  variant = 'light',
  ariaLabel,
  onMouseEnter,
  onMouseLeave,
}) => {
  const isLight = variant === 'light';

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      aria-label={ariaLabel || label}
      className={`group pointer-events-auto relative inline-flex items-center gap-3.5 rounded-full px-7 py-3.5 font-mono text-xs font-semibold uppercase tracking-[0.2em] transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
        isLight
          ? 'bg-[#0B1220]/95 text-[#F1F4F3] shadow-[0_16px_36px_-10px_rgba(11,18,32,0.32)] ring-1 ring-[#D7E1DD]/70 backdrop-blur-xl hover:bg-[#0B1220] hover:shadow-[0_20px_42px_-10px_rgba(11,18,32,0.45)] focus-visible:ring-[#3D806D] focus-visible:ring-offset-[#F1F4F3]'
          : 'bg-white/10 text-slate-50 shadow-[0_18px_40px_-12px_rgba(2,6,23,0.85)] ring-1 ring-white/25 backdrop-blur-xl hover:bg-white/15 hover:ring-[#6FAF9B]/50 focus-visible:ring-[#6FAF9B] focus-visible:ring-offset-slate-950'
      }`}
    >
      {/* Subtle Top Specular Edge */}
      <span
        className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-[#D7E1DD]/50 to-transparent"
        aria-hidden="true"
      />

      {/* Status Dot */}
      <span
        className="h-2 w-2 rounded-full bg-[#6FAF9B] transition-transform duration-300 group-hover:scale-125"
        aria-hidden="true"
      />

      <span>{label}</span>

      <ArrowRight
        className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1"
        aria-hidden="true"
      />
    </button>
  );
};
