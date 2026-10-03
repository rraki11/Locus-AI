import React from 'react';
import { ArrowRight } from 'lucide-react';

interface PipelineStage {
  index: string;
  title: string;
  subtitle: string;
  accentClass: string;
}

const PIPELINE_STAGES: PipelineStage[] = [
  {
    index: '01',
    title: 'LOCATION',
    subtitle: 'Multi-scale spatial context',
    accentClass: 'bg-sky-400',
  },
  {
    index: '02',
    title: 'GROUND REALITY',
    subtitle: 'Street-level visual evidence',
    accentClass: 'bg-emerald-400',
  },
  {
    index: '03',
    title: 'INTELLIGENCE',
    subtitle: 'Reconciled market signals',
    accentClass: 'bg-amber-400',
  },
  {
    index: '04',
    title: 'DECISION',
    subtitle: 'Explainable expansion posture',
    accentClass: 'bg-purple-400',
  },
];

export const PipelineVisual: React.FC = () => {
  return (
    <div
      className="pointer-events-auto w-full max-w-4xl"
      role="region"
      aria-label="LOCUS AI Spatial Intelligence Pipeline"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
        {PIPELINE_STAGES.map((stage, idx) => (
          <div key={stage.title} className="relative flex items-center">
            <div className="liquid-glass-dark group relative flex w-full flex-col justify-between rounded-xl px-4 py-4 transition-all duration-300 hover:border-white/25 hover:bg-slate-900/80">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] font-semibold tracking-[0.16em] text-slate-400">
                  {stage.index}
                </span>
                <span
                  className={`h-2 w-2 rounded-full ${stage.accentClass} opacity-85 transition-transform duration-300 group-hover:scale-125`}
                  aria-hidden="true"
                />
              </div>

              <div className="mt-3">
                <div className="font-mono text-xs font-bold tracking-[0.14em] text-slate-100">
                  {stage.title}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-300/85">
                  {stage.subtitle}
                </p>
              </div>
            </div>

            {idx < PIPELINE_STAGES.length - 1 && (
              <div
                className="hidden lg:flex lg:-right-3 lg:z-10 lg:items-center lg:justify-center lg:px-1 text-slate-400/70"
                aria-hidden="true"
              >
                <ArrowRight className="h-3.5 w-3.5" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
