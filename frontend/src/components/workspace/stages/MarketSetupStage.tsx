import React from 'react';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronDown,
  Layers,
  MapPin,
  Zap,
} from 'lucide-react';
import {
  BusinessProfileState,
  CANDIDATE_LOCATIONS,
  CandidateLocation,
  EVIDENCE_META,
} from '../../../data/locusWorkspaceData';

interface MarketSetupStageProps {
  profile: BusinessProfileState;
  onUpdateProfile: (next: BusinessProfileState) => void;
  selectedLocationId: string;
  onSelectLocation: (locationId: string) => void;
  onNext: () => void;
  onJumpToGroundTruth: () => void;
}

const SIGNAL_BADGE: Record<CandidateLocation['signalTone'], string> = {
  emerald: 'border-emerald-400/35 bg-emerald-500/12 text-emerald-300',
  amber: 'border-amber-400/35 bg-amber-500/12 text-amber-300',
  slate: 'border-white/15 bg-white/5 text-slate-300',
};

export const MarketSetupStage: React.FC<MarketSetupStageProps> = ({
  profile,
  onUpdateProfile,
  selectedLocationId,
  onSelectLocation,
  onNext,
  onJumpToGroundTruth,
}) => {
  const activeLocation =
    CANDIDATE_LOCATIONS.find((l) => l.id === selectedLocationId) ||
    CANDIDATE_LOCATIONS[0];

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6">
      {/* Stage Header Banner */}
      <div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-end">
        <div>
          <div className="inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-[#6FAF9B]">
            <span>STAGE 01 // MARKET SETUP + MARKET DISCOVERY</span>
          </div>
          <h1 className="mt-1.5 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Business Profile → Candidate Location → Baseline Market Data
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-300">
            Configure expansion parameters to screen 847 urban micro-markets and
            establish baseline structured registry counts before running ground-level
            Street Scan.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onJumpToGroundTruth}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-4 py-2.5 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-emerald-300 transition-all hover:border-emerald-400/70 hover:bg-emerald-500/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            <Zap className="h-3.5 w-3.5" />
            <span>Flagship: Map vs Reality</span>
          </button>

          <button
            type="button"
            onClick={onNext}
            className="inline-flex items-center gap-2.5 rounded-xl border border-sky-400/45 bg-sky-500/20 px-5 py-2.5 font-mono text-xs font-semibold uppercase tracking-[0.16em] text-sky-200 transition-all hover:border-sky-400/75 hover:bg-sky-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            <span>Inspect Map &amp; Baseline ({activeLocation.baselineListedCount} Entities)</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Main 12-Col Grid: Left = Business Profile (4 cols), Right = Candidate Discovery + Baseline Data (8 cols) */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* LEFT COLUMN: 1. Business Profile Configuration */}
        <div className="liquid-glass-dark flex flex-col justify-between rounded-2xl p-6 lg:col-span-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-[#6FAF9B]" />
                <span className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-white">
                  1. Business Profile
                </span>
              </div>
              <span className="rounded-full border border-[#6FAF9B]/35 bg-[#3D806D]/20 px-2.5 py-0.5 font-mono text-[10px] text-[#6FAF9B]">
                ACTIVE TARGET
              </span>
            </div>

            {/* Category */}
            <div>
              <label
                htmlFor="locus-business-category"
                className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.15em] text-slate-400"
              >
                Business Format
              </label>
              <div className="relative">
                <select
                  id="locus-business-category"
                  value={profile.category}
                  onChange={(e) =>
                    onUpdateProfile({ ...profile, category: e.target.value })
                  }
                  className="w-full appearance-none rounded-xl border border-white/15 bg-slate-900/85 px-3.5 py-2.5 pr-8 font-mono text-xs text-slate-100 focus:border-sky-400 focus:outline-none"
                >
                  <option value="Quick Service Restaurant (QSR)">
                    Quick Service Restaurant (QSR)
                  </option>
                  <option value="Specialty Coffee & All-Day Café">
                    Specialty Coffee &amp; All-Day Café
                  </option>
                  <option value="Fast-Casual Cloud + Dine-In Hybrid">
                    Fast-Casual Cloud + Dine-In Hybrid
                  </option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            {/* Target City */}
            <div>
              <label
                htmlFor="locus-target-city"
                className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.15em] text-slate-400"
              >
                Target Metro Market
              </label>
              <div className="relative">
                <select
                  id="locus-target-city"
                  value={profile.city}
                  onChange={(e) =>
                    onUpdateProfile({ ...profile, city: e.target.value })
                  }
                  className="w-full appearance-none rounded-xl border border-white/15 bg-slate-900/85 px-3.5 py-2.5 pr-8 font-mono text-xs text-slate-100 focus:border-sky-400 focus:outline-none"
                >
                  <option value="Bengaluru, IN">Bengaluru, IN (847 Micro-Markets)</option>
                  <option value="Mumbai, IN">Mumbai, IN (1,120 Micro-Markets)</option>
                  <option value="Hyderabad, IN">Hyderabad, IN (640 Micro-Markets)</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            {/* CapEx Budget Band */}
            <div>
              <label
                htmlFor="locus-budget-band"
                className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.15em] text-slate-400"
              >
                CapEx Allocation Band
              </label>
              <div className="relative">
                <select
                  id="locus-budget-band"
                  value={profile.budgetBand}
                  onChange={(e) =>
                    onUpdateProfile({ ...profile, budgetBand: e.target.value })
                  }
                  className="w-full appearance-none rounded-xl border border-white/15 bg-slate-900/85 px-3.5 py-2.5 pr-8 font-mono text-xs text-slate-100 focus:border-sky-400 focus:outline-none"
                >
                  <option value="₹50L – ₹80L (Compact / Cloud)">
                    ₹50L – ₹80L (Compact / Cloud)
                  </option>
                  <option value="₹80L – ₹1.5Cr">
                    ₹80L – ₹1.5Cr (Inline High-Street QSR)
                  </option>
                  <option value="₹1.5Cr – ₹2.5Cr (Flagship Corner)">
                    ₹1.5Cr – ₹2.5Cr (Flagship Corner)
                  </option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            {/* Catchment & Floorplate Summary */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="font-mono text-[9px] uppercase tracking-[0.15em] text-slate-400">
                  Catchment Radius
                </div>
                <div className="mt-1 font-mono text-sm font-bold text-white">
                  {profile.targetCatchmentRadiusM}m Walkshed
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="font-mono text-[9px] uppercase tracking-[0.15em] text-slate-400">
                  Target Floorplate
                </div>
                <div className="mt-1 font-mono text-sm font-bold text-white">
                  {profile.floorPlateSqft}
                </div>
              </div>
            </div>
          </div>

          {/* Evidence Model Key inside Setup */}
          <div className="mt-6 border-t border-white/10 pt-4">
            <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-400">
              LOCUS 4-Tier Evidence Taxonomy
            </div>
            <div className="grid grid-cols-2 gap-2">
              {Object.values(EVIDENCE_META).map((ev) => (
                <div
                  key={ev.code}
                  className="flex items-center gap-1.5 rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-1.5"
                >
                  <span className={`h-2 w-2 flex-shrink-0 rounded-full ${ev.dotClass}`} />
                  <span className="truncate font-mono text-[9px] font-medium tracking-[0.1em] text-slate-300">
                    {ev.code}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: 2. Candidate Locations + 3. Baseline Market Data */}
        <div className="flex flex-col gap-6 lg:col-span-8">
          {/* Candidate Micro-Markets Grid */}
          <div className="liquid-glass-dark rounded-2xl p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-sky-400" />
                <span className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-white">
                  2. Candidate Locations Discovered (Top 3 of 847 Micro-Markets)
                </span>
              </div>
              <span className="font-mono text-[10px] text-slate-400">
                Click any candidate market to inspect baseline data
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {CANDIDATE_LOCATIONS.map((loc) => {
                const isSelected = loc.id === activeLocation.id;
                return (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => onSelectLocation(loc.id)}
                    className={`group relative flex flex-col justify-between rounded-xl p-4 text-left transition-all focus:outline-none ${
                      isSelected
                        ? 'border-2 border-sky-400/70 bg-sky-500/[0.11] shadow-[0_0_28px_rgba(56,189,248,0.14)]'
                        : 'border border-white/10 bg-slate-900/55 hover:border-white/25 hover:bg-slate-900/80'
                    }`}
                  >
                    <div>
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span
                          className={`rounded-full border px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] ${
                            SIGNAL_BADGE[loc.signalTone]
                          }`}
                        >
                          {loc.signalPosture}
                        </span>
                        {loc.recommended && (
                          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-sky-300">
                            ★ TOP MATCH
                          </span>
                        )}
                      </div>

                      <div className="font-display text-base font-bold text-white">
                        {loc.name}
                      </div>
                      <div className="mt-0.5 font-mono text-[10px] text-slate-400">
                        {loc.corridor}
                      </div>

                      <div className="mt-3 flex items-baseline gap-1.5">
                        <span className="font-display text-3xl font-bold text-white">
                          {loc.matchScore}
                        </span>
                        <span className="font-mono text-xs text-slate-400">/ 10 fit</span>
                      </div>
                    </div>

                    <div className="mt-4 space-y-1.5 border-t border-white/10 pt-3 font-mono text-[10px]">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Baseline DB Entities</span>
                        <span className="font-semibold text-sky-300">
                          {loc.baselineListedCount} listed
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Street Scan Preview</span>
                        <span className="font-semibold text-emerald-300">
                          {loc.groundObservedCount} observed (+{loc.additionalSignalsCount})
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Median Rent</span>
                        <span className="text-slate-200">₹{loc.medianRentSqft}/sqft</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Transit Index</span>
                        <span className="text-slate-200">{loc.transitScore}/100</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Baseline Market Data Summary for Selected Candidate */}
          <div className="liquid-glass-dark rounded-2xl p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-emerald-400" />
                <span className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-white">
                  3. Baseline Market Data — {activeLocation.name}
                </span>
              </div>
              <span className="rounded-full border border-sky-400/35 bg-sky-500/12 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-sky-300">
                EVIDENCE: DATABASE ({activeLocation.baselineListedCount} LISTED ENTITIES)
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-4">
              <div className="rounded-xl border border-sky-400/25 bg-sky-500/[0.07] p-4">
                <div className="font-mono text-[9px] uppercase tracking-[0.15em] text-sky-300">
                  Baseline Listed Entities
                </div>
                <div className="mt-1 font-display text-2xl font-bold text-white">
                  {activeLocation.baselineListedCount} Entities
                </div>
                <div className="mt-1 font-mono text-[10px] text-slate-300">
                  Maps + FSSAI + Aggregators
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="font-mono text-[9px] uppercase tracking-[0.15em] text-slate-400">
                  Footfall &amp; Peak Window
                </div>
                <div className="mt-1 font-display text-lg font-bold text-white">
                  {activeLocation.footfallIndex}
                </div>
                <div className="mt-1 font-mono text-[10px] text-slate-400">
                  {activeLocation.peakWindow}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="font-mono text-[9px] uppercase tracking-[0.15em] text-slate-400">
                  Commercial Rent Band
                </div>
                <div className="mt-1 font-display text-lg font-bold text-white">
                  ₹{activeLocation.medianRentSqft} / sq.ft
                </div>
                <div className="mt-1 font-mono text-[10px] text-emerald-300">
                  18% below Indiranagar peak
                </div>
              </div>

              <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/[0.08] p-4">
                <div className="font-mono text-[9px] uppercase tracking-[0.15em] text-emerald-300">
                  Ground Truth Alert
                </div>
                <div className="mt-1 font-display text-lg font-bold text-white">
                  +{activeLocation.additionalSignalsCount} Unlisted Signals
                </div>
                <div className="mt-1 flex items-center gap-1 font-mono text-[10px] text-emerald-300">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>Street Scan ready to fuse</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
