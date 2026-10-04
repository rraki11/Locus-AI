import React, { useCallback, useMemo, useState } from 'react';
import {
  ArrowRight,
  ArrowUp,
  Building2,
  CheckCircle2,
  ChevronDown,
  Layers,
  MapPin,
} from 'lucide-react';
import {
  BUSINESS_PROFILE_OPTIONS,
  BusinessProfileConfig,
  CategoricalLevel,
  CityMarketOption,
  DEFAULT_DISCOVERY_BUSINESS_PROFILE,
  DEMO_MARKET_DISCOVERY_CITIES,
  EVIDENCE_TAXONOMY_DEFINITIONS,
  LOCUS_SPATIAL_RINGS,
} from '../../data/marketDiscoveryData';
import { MarketDiscoveryMap } from './MarketDiscoveryMap';

export interface MarketDiscoveryViewProps {
  cities?: CityMarketOption[];
  initialProfile?: BusinessProfileConfig;
  preferFallback?: boolean;
  onBackToPage2?: () => void;
  onContinueToGroundReality?: (payload: {
    profile: BusinessProfileConfig;
    cityId: string;
    localAreaId: string;
    candidateId: string;
    coordinates: { lat: number; lng: number };
  }) => void;
}

const PROGRESS_STEPS = [
  { code: '01', label: 'MARKET', active: true },
  { code: '02', label: 'GROUND REALITY', active: false },
  { code: '03', label: 'INTELLIGENCE', active: false },
  { code: '04', label: 'DECISION', active: false },
] as const;

const CATEGORICAL_BADGE_STYLE: Record<CategoricalLevel, string> = {
  STRONG:
    'border-[#6FAF9B]/55 bg-[#3D806D]/25 text-[#A7F3D0] shadow-[0_0_12px_rgba(111,175,155,0.18)]',
  HIGH: 'border-sky-400/45 bg-sky-500/15 text-sky-200',
  MEDIUM: 'border-amber-400/40 bg-amber-500/15 text-amber-200',
  LOW: 'border-slate-500/40 bg-slate-800/70 text-slate-300',
};

export const MarketDiscoveryView: React.FC<MarketDiscoveryViewProps> = ({
  cities = DEMO_MARKET_DISCOVERY_CITIES,
  initialProfile = DEFAULT_DISCOVERY_BUSINESS_PROFILE,
  preferFallback = false,
  onBackToPage2,
  onContinueToGroundReality,
}) => {
  // 1. Business Profile State (data-driven & replaceable)
  const [profile, setProfile] = useState<BusinessProfileConfig>(initialProfile);

  // 2. Local-First Target Market State: City -> Local Area -> Candidate Location
  const [selectedCityId, setSelectedCityId] = useState<string>(
    cities[0]?.id ?? 'city-pune'
  );
  const activeCity = useMemo(
    () => cities.find((c) => c.id === selectedCityId) || cities[0],
    [cities, selectedCityId]
  );

  const [selectedLocalAreaId, setSelectedLocalAreaId] = useState<string>(
    activeCity.localAreas[0]?.id ?? ''
  );
  const activeLocalArea = useMemo(
    () =>
      activeCity.localAreas.find((a) => a.id === selectedLocalAreaId) ||
      activeCity.localAreas[0],
    [activeCity, selectedLocalAreaId]
  );

  const [selectedCandidateId, setSelectedCandidateId] = useState<string>(
    activeLocalArea.candidates[0]?.id ?? ''
  );
  const activeCandidate = useMemo(
    () =>
      activeLocalArea.candidates.find((c) => c.id === selectedCandidateId) ||
      activeLocalArea.candidates[0],
    [activeLocalArea, selectedCandidateId]
  );

  // Support placing a custom candidate pin directly on the map
  const [customPinCoords, setCustomPinCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // Support toggling between Demo Connected Dataset vs "Awaiting connected market data"
  const [baselineFeedMode, setBaselineFeedMode] = useState<
    'demo_connected' | 'awaiting_connection'
  >('demo_connected');

  // State for "CONTINUE TO GROUND REALITY" handoff confirmation
  const [groundRealityHandedOff, setGroundRealityHandedOff] =
    useState<boolean>(false);

  // Handlers that maintain the CITY -> LOCAL AREA -> CANDIDATE LOCATION hierarchy
  const handleSelectCity = useCallback(
    (nextCityId: string) => {
      setSelectedCityId(nextCityId);
      const nextCity =
        cities.find((c) => c.id === nextCityId) || cities[0];
      const firstArea = nextCity.localAreas[0];
      if (firstArea) {
        setSelectedLocalAreaId(firstArea.id);
        const firstCand = firstArea.candidates[0];
        if (firstCand) {
          setSelectedCandidateId(firstCand.id);
        }
      }
      setCustomPinCoords(null);
      setGroundRealityHandedOff(false);
    },
    [cities]
  );

  const handleSelectLocalArea = useCallback(
    (nextAreaId: string) => {
      setSelectedLocalAreaId(nextAreaId);
      const nextArea =
        activeCity.localAreas.find((a) => a.id === nextAreaId) ||
        activeCity.localAreas[0];
      if (nextArea?.candidates[0]) {
        setSelectedCandidateId(nextArea.candidates[0].id);
      }
      setCustomPinCoords(null);
      setGroundRealityHandedOff(false);
    },
    [activeCity]
  );

  const handleSelectCandidate = useCallback((nextCandidateId: string) => {
    setSelectedCandidateId(nextCandidateId);
    setCustomPinCoords(null);
    setGroundRealityHandedOff(false);
  }, []);

  const handlePlaceCustomPin = useCallback(
    (coords: { lat: number; lng: number }) => {
      setCustomPinCoords(coords);
      setGroundRealityHandedOff(false);
    },
    []
  );

  const handleProceedToGroundReality = useCallback(() => {
    setGroundRealityHandedOff(true);
    onContinueToGroundReality?.({
      profile,
      cityId: activeCity.id,
      localAreaId: activeLocalArea.id,
      candidateId: customPinCoords ? 'custom-candidate-pin' : activeCandidate.id,
      coordinates: {
        lat: customPinCoords ? customPinCoords.lat : activeCandidate.lat,
        lng: customPinCoords ? customPinCoords.lng : activeCandidate.lng,
      },
    });
  }, [
    profile,
    activeCity.id,
    activeLocalArea.id,
    activeCandidate,
    customPinCoords,
    onContinueToGroundReality,
  ]);

  const snapshotRows: {
    label: string;
    value: CategoricalLevel;
  }[] = [
    {
      label: 'Commercial Activity',
      value: activeCandidate.baselineSnapshot.commercialActivity,
    },
    {
      label: 'Competition',
      value: activeCandidate.baselineSnapshot.competition,
    },
    {
      label: 'Accessibility',
      value: activeCandidate.baselineSnapshot.accessibility,
    },
    {
      label: 'Customer Fit',
      value: activeCandidate.baselineSnapshot.customerFit,
    },
    {
      label: 'Commercial Density',
      value: activeCandidate.baselineSnapshot.commercialDensity,
    },
  ];

  return (
    <section
      aria-label="View 1 — Market Discovery Workspace"
      className="relative min-h-screen w-full overflow-hidden bg-[#080C12] text-[#F1F5F9]"
      style={{
        background:
          'radial-gradient(ellipse 90% 80% at 55% 45%, #0C131A 0%, #0A1016 58%, #080C12 100%)',
      }}
    >
      {/* Subtle Spatial Coordinate Grid Background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.22]"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(215, 225, 221, 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(215, 225, 221, 0.04) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
        }}
        aria-hidden="true"
      />

      {/* TOP SHELL: Compact LOCUS Navigation & 4-Stage Progress Bar */}
      <header className="relative z-30 border-b border-white/10 bg-[#080C12]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1640px] flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
          {/* Left: LOCUS AI + 01 / MARKET DISCOVERY */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full bg-[#6FAF9B] shadow-[0_0_10px_#6FAF9B]"
                aria-hidden="true"
              />
              <span className="font-mono text-xs font-bold uppercase tracking-[0.22em] text-white">
                LOCUS AI
              </span>
            </div>
            <span className="h-3.5 w-px bg-white/15" aria-hidden="true" />
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6FAF9B]">
              01 / MARKET DISCOVERY
            </span>
          </div>

          {/* Center: 4-Stage Progress (01 MARKET -> 02 GROUND REALITY -> 03 INTELLIGENCE -> 04 DECISION) */}
          <nav
            aria-label="LOCUS Intelligence Progress"
            className="flex flex-wrap items-center gap-1.5"
          >
            {PROGRESS_STEPS.map((step, index) => (
              <React.Fragment key={step.code}>
                <div
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.15em] transition-colors ${
                    step.active
                      ? 'border-[#6FAF9B]/60 bg-[#3D806D]/25 font-bold text-white shadow-[0_0_14px_rgba(111,175,155,0.2)]'
                      : 'border-white/10 bg-white/[0.02] text-slate-400'
                  }`}
                >
                  <span
                    className={
                      step.active ? 'text-[#6FAF9B]' : 'text-slate-500'
                    }
                  >
                    {step.code}
                  </span>
                  <span>{step.label}</span>
                </div>
                {index < PROGRESS_STEPS.length - 1 && (
                  <span
                    className="font-mono text-[10px] text-slate-600"
                    aria-hidden="true"
                  >
                    →
                  </span>
                )}
              </React.Fragment>
            ))}
          </nav>

          {/* Right: Spatial Flow Breadcrumb + Optional Back to Page 2 */}
          <div className="flex items-center gap-2.5">
            <div className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-[#0C131A]/90 px-3 py-1 font-mono text-[9.5px] uppercase tracking-[0.14em] text-slate-300 2xl:flex">
              <span className="text-slate-400">BUSINESS</span>
              <span className="text-[#6FAF9B]">→</span>
              <span className="text-slate-400">CITY</span>
              <span className="text-[#6FAF9B]">→</span>
              <span className="font-semibold text-[#6FAF9B]">LOCAL AREA</span>
              <span className="text-[#6FAF9B]">→</span>
              <span className="font-semibold text-white">CANDIDATE LOCATION</span>
              <span className="text-[#6FAF9B]">→</span>
              <span className="text-sky-300">BASELINE MARKET</span>
            </div>

            {onBackToPage2 && (
              <button
                type="button"
                onClick={onBackToPage2}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-[#0C131A]/80 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-300 transition-colors hover:border-[#6FAF9B]/45 hover:text-white"
              >
                <ArrowUp className="h-3 w-3 text-[#6FAF9B]" />
                <span>Spatial System</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* MAIN WORKSPACE BODY: Left Control Panel (3 cols) + Dominant Map (6 cols) + Right Candidate & Baseline Inspector (3 cols) */}
      <div className="relative z-10 mx-auto max-w-[1640px] px-4 py-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-stretch">
          {/* LEFT CONTROL PANEL: Business Profile + Local-First Target Market */}
          <aside
            aria-label="Business Profile and Target Market Controls"
            className="flex flex-col justify-between gap-3.5 lg:col-span-3"
          >
            {/* 1. BUSINESS PROFILE CARD */}
            <div className="liquid-glass-dark rounded-2xl p-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <div className="flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5 text-[#6FAF9B]" />
                  <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-white">
                    BUSINESS PROFILE
                  </h2>
                </div>
                <span className="rounded border border-[#6FAF9B]/35 bg-[#3D806D]/20 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[#6FAF9B]">
                  CONFIGURED
                </span>
              </div>

              <div className="mt-3 space-y-2.5">
                {/* Business Type */}
                <div>
                  <label
                    htmlFor="discovery-business-type"
                    className="mb-1 block font-mono text-[9.5px] uppercase tracking-[0.14em] text-slate-400"
                  >
                    Business Type
                  </label>
                  <div className="relative">
                    <select
                      id="discovery-business-type"
                      value={profile.businessType}
                      onChange={(e) =>
                        setProfile((prev) => ({
                          ...prev,
                          businessType: e.target.value,
                        }))
                      }
                      className="w-full appearance-none rounded-xl border border-white/15 bg-[#0A1016]/90 px-3 py-1.5 pr-8 text-xs font-semibold text-white transition-colors focus:border-[#6FAF9B] focus:outline-none"
                    >
                      {BUSINESS_PROFILE_OPTIONS.businessTypes.map((type) => (
                        <option
                          key={type}
                          value={type}
                          className="bg-[#0A1016] text-white"
                        >
                          {type}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>

                {/* Target Customer */}
                <div>
                  <label
                    htmlFor="discovery-target-customer"
                    className="mb-1 block font-mono text-[9.5px] uppercase tracking-[0.14em] text-slate-400"
                  >
                    Target Customer
                  </label>
                  <div className="relative">
                    <select
                      id="discovery-target-customer"
                      value={profile.targetCustomer}
                      onChange={(e) =>
                        setProfile((prev) => ({
                          ...prev,
                          targetCustomer: e.target.value,
                        }))
                      }
                      className="w-full appearance-none rounded-xl border border-white/15 bg-[#0A1016]/90 px-3 py-1.5 pr-8 text-xs font-medium text-slate-100 transition-colors focus:border-[#6FAF9B] focus:outline-none"
                    >
                      {BUSINESS_PROFILE_OPTIONS.targetCustomers.map((cust) => (
                        <option
                          key={cust}
                          value={cust}
                          className="bg-[#0A1016] text-white"
                        >
                          {cust}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>

                {/* Expansion Objective + Budget Row */}
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  <div>
                    <label
                      htmlFor="discovery-objective"
                      className="mb-1 block font-mono text-[9.5px] uppercase tracking-[0.14em] text-slate-400"
                    >
                      Expansion Objective
                    </label>
                    <div className="relative">
                      <select
                        id="discovery-objective"
                        value={profile.expansionObjective}
                        onChange={(e) =>
                          setProfile((prev) => ({
                            ...prev,
                            expansionObjective: e.target.value,
                          }))
                        }
                        className="w-full appearance-none rounded-xl border border-white/15 bg-[#0A1016]/90 px-2.5 py-1.5 pr-7 text-xs font-medium text-slate-100 transition-colors focus:border-[#6FAF9B] focus:outline-none"
                      >
                        {BUSINESS_PROFILE_OPTIONS.expansionObjectives.map(
                          (obj) => (
                            <option
                              key={obj}
                              value={obj}
                              className="bg-[#0A1016] text-white"
                            >
                              {obj}
                            </option>
                          )
                        )}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="discovery-budget"
                      className="mb-1 block font-mono text-[9.5px] uppercase tracking-[0.14em] text-slate-400"
                    >
                      Budget
                    </label>
                    <div className="relative">
                      <select
                        id="discovery-budget"
                        value={profile.budget}
                        onChange={(e) =>
                          setProfile((prev) => ({
                            ...prev,
                            budget: e.target.value,
                          }))
                        }
                        className="w-full appearance-none rounded-xl border border-white/15 bg-[#0A1016]/90 px-2.5 py-1.5 pr-7 font-mono text-xs font-bold text-[#6FAF9B] transition-colors focus:border-[#6FAF9B] focus:outline-none"
                      >
                        {BUSINESS_PROFILE_OPTIONS.budgets.map((b) => (
                          <option
                            key={b}
                            value={b}
                            className="bg-[#0A1016] text-white"
                          >
                            {b}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. TARGET MARKET CARD (LOCAL-FIRST HIERARCHY: CITY -> LOCAL AREA -> CANDIDATE LOCATION) */}
            <div className="liquid-glass-dark flex-1 rounded-2xl p-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-[#6FAF9B]" />
                  <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-white">
                    TARGET MARKET
                  </h2>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-slate-400">
                  LOCAL-FIRST
                </span>
              </div>

              {/* Step 1: City Selection (Context Level) */}
              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between">
                  <label
                    htmlFor="discovery-city-select"
                    className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-slate-400"
                  >
                    City
                  </label>
                  <span className="font-mono text-[9px] text-slate-500">
                    {activeCity.regionLabel}
                  </span>
                </div>
                <div className="relative">
                  <select
                    id="discovery-city-select"
                    value={activeCity.id}
                    onChange={(e) => handleSelectCity(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-white/15 bg-[#0A1016]/90 px-3 py-1.5 pr-8 text-xs font-medium text-slate-200 transition-colors focus:border-[#6FAF9B] focus:outline-none"
                  >
                    {cities.map((c) => (
                      <option
                        key={c.id}
                        value={c.id}
                        className="bg-[#0A1016] text-white"
                      >
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              {/* Hierarchy Connector */}
              <div className="my-1.5 flex items-center gap-2 pl-2 font-mono text-[9px] text-[#6FAF9B]/80">
                <span>↓</span>
                <span className="uppercase tracking-[0.16em]">
                  LOCAL AREA / NEIGHBORHOOD
                </span>
              </div>

              {/* Step 2: Local Area Selection (Primary Emphasis!) */}
              <div className="rounded-xl border border-[#6FAF9B]/45 bg-[#3D806D]/10 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <div className="mb-1.5 flex items-center justify-between">
                  <label
                    htmlFor="discovery-local-area-select"
                    className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-[#6FAF9B]"
                  >
                    Local Area
                  </label>
                  <span className="rounded bg-[#6FAF9B]/20 px-1.5 py-0.5 font-mono text-[8.5px] font-semibold uppercase tracking-[0.12em] text-[#D7E1DD]">
                    PRIMARY FOCUS
                  </span>
                </div>

                <div className="relative">
                  <select
                    id="discovery-local-area-select"
                    value={activeLocalArea.id}
                    onChange={(e) => handleSelectLocalArea(e.target.value)}
                    className="w-full appearance-none rounded-lg border border-[#6FAF9B]/50 bg-[#080C12] px-3 py-2 pr-8 text-xs font-bold text-white transition-colors focus:border-[#6FAF9B] focus:outline-none"
                  >
                    {activeCity.localAreas.map((area) => (
                      <option
                        key={area.id}
                        value={area.id}
                        className="bg-[#080C12] text-white"
                      >
                        {area.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6FAF9B]" />
                </div>

                <p className="mt-2 font-mono text-[10px] font-medium text-[#A7F3D0]">
                  {activeLocalArea.characterTag}
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
                  {activeLocalArea.summary}
                </p>
              </div>

              {/* Hierarchy Connector */}
              <div className="my-1.5 flex items-center gap-2 pl-2 font-mono text-[9px] text-[#6FAF9B]/80">
                <span>↓</span>
                <span className="uppercase tracking-[0.16em]">
                  CANDIDATE LOCATION
                </span>
              </div>

              {/* Step 3: Candidate Location Selector inside Local Area */}
              <div className="space-y-1.5">
                {activeLocalArea.candidates.map((cand) => {
                  const isSelected =
                    !customPinCoords && cand.id === activeCandidate.id;
                  return (
                    <button
                      key={cand.id}
                      type="button"
                      onClick={() => handleSelectCandidate(cand.id)}
                      className={`w-full rounded-xl border p-2.5 text-left transition-all ${
                        isSelected
                          ? 'border-[#6FAF9B] bg-[#3D806D]/20 shadow-[0_0_18px_rgba(111,175,155,0.18)]'
                          : 'border-white/10 bg-[#0A1016]/75 hover:border-white/25'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[11px] font-bold text-white">
                          {cand.label}
                        </span>
                        <span
                          className={`h-2 w-2 flex-shrink-0 rounded-full ${
                            isSelected ? 'bg-[#6FAF9B]' : 'bg-slate-600'
                          }`}
                        />
                      </div>
                      <p className="mt-0.5 text-[10.5px] text-slate-300">
                        {cand.microCorridor}
                      </p>
                    </button>
                  );
                })}

                {customPinCoords && (
                  <div className="rounded-xl border border-[#6FAF9B] bg-[#3D806D]/20 p-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10.5px] font-bold text-white">
                        Custom Map Candidate Pin
                      </span>
                      <button
                        type="button"
                        onClick={() => setCustomPinCoords(null)}
                        className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#6FAF9B] underline"
                      >
                        Reset
                      </button>
                    </div>
                    <p className="mt-0.5 font-mono text-[10px] text-slate-300">
                      {customPinCoords.lat.toFixed(4)}° N,{' '}
                      {customPinCoords.lng.toFixed(4)}° E
                    </p>
                  </div>
                )}
              </div>
            </div>
          </aside>

          {/* CENTER DOMINANT VISUAL: Interactive Leaflet Spatial Map */}
          <div className="flex flex-col lg:col-span-6">
            <MarketDiscoveryMap
              city={activeCity}
              localArea={activeLocalArea}
              selectedCandidate={activeCandidate}
              customPinCoords={customPinCoords}
              onSelectCandidate={handleSelectCandidate}
              onPlaceCustomPin={handlePlaceCustomPin}
              preferFallback={preferFallback}
            />
          </div>

          {/* RIGHT CONTEXTUAL INSPECTOR: Candidate Location + Baseline Market Snapshot + Provenance */}
          <aside
            aria-label="Candidate Location and Baseline Market Snapshot"
            className="flex flex-col justify-between gap-3.5 lg:col-span-3"
          >
            {/* 1. CANDIDATE LOCATION + LOCAL CATCHMENT + PRIMARY CTA */}
            <div className="liquid-glass-dark rounded-2xl p-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <span className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[#6FAF9B]">
                  CANDIDATE LOCATION
                </span>
                <span className="font-mono text-[9.5px] text-slate-400">
                  {customPinCoords
                    ? `${customPinCoords.lat.toFixed(4)}° N, ${customPinCoords.lng.toFixed(4)}° E`
                    : activeCandidate.coordinatesText}
                </span>
              </div>

              {/* Selected Candidate Identity */}
              <div className="mt-2.5">
                <h3 className="font-display text-base font-bold text-white">
                  {customPinCoords
                    ? `Placed Candidate — ${activeLocalArea.name}`
                    : activeCandidate.label}
                </h3>
                <p className="mt-0.5 text-xs text-slate-300">
                  {customPinCoords
                    ? `Custom coordinates inside ${activeLocalArea.name}, ${activeCity.name}`
                    : activeCandidate.intersectionNote}
                </p>
              </div>

              {/* LOCAL CATCHMENT (0-300m, 300m-2km, 2-5km) */}
              <div className="mt-3 rounded-xl border border-white/10 bg-[#0A1016]/85 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.16em] text-slate-300">
                    LOCAL CATCHMENT
                  </span>
                  <span className="font-mono text-[9px] text-slate-400">
                    3 Spatial Scales
                  </span>
                </div>

                <div className="space-y-1.5">
                  {LOCUS_SPATIAL_RINGS.map((ring) => (
                    <div
                      key={ring.id}
                      className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-1.5 font-mono text-[10px]"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: ring.strokeColor }}
                        />
                        <span className="font-bold text-white">
                          {ring.rangeLabel}
                        </span>
                      </div>
                      <span className="text-slate-300">
                        {ring.cardDescription}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Primary Action: CONTINUE TO GROUND REALITY */}
              <button
                type="button"
                onClick={handleProceedToGroundReality}
                className="mt-3.5 flex w-full items-center justify-between rounded-xl border border-[#6FAF9B]/65 bg-gradient-to-r from-[#3D806D]/45 to-[#6FAF9B]/30 px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-white shadow-[0_10px_28px_-6px_rgba(61,128,109,0.55)] transition-all hover:border-[#6FAF9B] hover:from-[#3D806D]/65 hover:to-[#6FAF9B]/45 focus:outline-none"
              >
                <span>CONTINUE TO GROUND REALITY</span>
                <ArrowRight className="h-4 w-4 text-[#A7F3D0]" />
              </button>

              {groundRealityHandedOff && (
                <div
                  role="status"
                  className="mt-2.5 rounded-xl border border-[#6FAF9B]/45 bg-[#3D806D]/15 px-3 py-2 font-mono text-[10px] text-[#D7E1DD]"
                >
                  <div className="flex items-center gap-1.5 font-bold text-[#6FAF9B]">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>MARKET DISCOVERY → GROUND REALITY READY</span>
                  </div>
                  <p className="mt-0.5 text-[9.5px] text-slate-300">
                    0–300m catchment locked for{' '}
                    <span className="font-semibold text-white">
                      {customPinCoords
                        ? 'Custom Candidate Pin'
                        : activeCandidate.label}
                    </span>{' '}
                    in {activeLocalArea.name}.
                  </p>
                </div>
              )}
            </div>

            {/* 2. BASELINE MARKET SNAPSHOT (Categorical Only — No Fake Scores) */}
            <div className="liquid-glass-dark rounded-2xl p-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <div>
                  <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-white">
                    BASELINE MARKET SNAPSHOT
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setBaselineFeedMode((prev) =>
                      prev === 'demo_connected'
                        ? 'awaiting_connection'
                        : 'demo_connected'
                    )
                  }
                  title="Switch between demo baseline dataset and awaiting live connection state"
                  className="rounded border border-sky-400/35 bg-sky-500/10 px-2 py-0.5 font-mono text-[8.5px] uppercase tracking-[0.12em] text-sky-300 hover:border-sky-400/60"
                >
                  {baselineFeedMode === 'demo_connected'
                    ? 'DEMO BASELINE'
                    : 'AWAITING DATA'}
                </button>
              </div>

              {baselineFeedMode === 'awaiting_connection' ? (
                <div className="mt-3 rounded-xl border border-white/10 bg-[#0A1016]/85 p-3.5 text-center">
                  <p className="font-mono text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-200">
                    BASELINE DATA
                  </p>
                  <p className="mt-1 font-mono text-[10px] text-slate-400">
                    Awaiting connected market data
                  </p>
                </div>
              ) : (
                <div className="mt-2.5 space-y-1.5">
                  {snapshotRows.map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between rounded-lg border border-white/5 bg-[#0A1016]/75 px-3 py-1.5"
                    >
                      <span className="text-xs text-slate-300">{row.label}</span>
                      <span
                        className={`rounded-md border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] ${
                          CATEGORICAL_BADGE_STYLE[row.value]
                        }`}
                      >
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 3. BASELINE SOURCES & EVIDENCE MODEL */}
            <div className="liquid-glass-dark rounded-2xl p-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-sky-400" />
                  <h3 className="font-mono text-[10.5px] font-bold uppercase tracking-[0.16em] text-white">
                    BASELINE SOURCES
                  </h3>
                </div>
                <span className="rounded border border-sky-400/35 bg-sky-500/15 px-1.5 py-0.5 font-mono text-[8.5px] font-bold uppercase tracking-[0.12em] text-sky-300">
                  DATABASE
                </span>
              </div>

              {/* 4 Baseline Sources: POIs, Road network, Transit, Zone metadata */}
              <div className="mt-2.5 grid grid-cols-2 gap-1.5">
                {activeCandidate.baselineSources.map((src) => (
                  <div
                    key={src.id}
                    className="rounded-lg border border-white/10 bg-[#0A1016]/80 px-2.5 py-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-semibold text-white">
                        {src.label}
                      </span>
                      <span className="font-mono text-[8.5px] font-bold uppercase tracking-[0.1em] text-[#6FAF9B]">
                        {src.status}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[10px] text-slate-400">
                      {src.detail}
                    </p>
                  </div>
                ))}
              </div>

              {/* Evidence Model Vocabulary (DATABASE active, OBSERVED awaits Street Scan) */}
              <div className="mt-3 border-t border-white/10 pt-2.5">
                <div className="mb-1.5 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.14em] text-slate-400">
                  <span>EVIDENCE MODEL</span>
                  <span className="text-sky-300">VIEW 1 = DATABASE</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {EVIDENCE_TAXONOMY_DEFINITIONS.map((ev) => {
                    const isActive = ev.view1State === 'ACTIVE_IN_VIEW_1';
                    return (
                      <div
                        key={ev.key}
                        title={ev.statusText}
                        className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-[8.5px] uppercase tracking-[0.1em] ${
                          isActive
                            ? 'border-sky-400/45 bg-sky-500/15 font-bold text-sky-200'
                            : 'border-white/10 bg-white/[0.02] text-slate-500'
                        }`}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{
                            backgroundColor: ev.dotColor,
                            opacity: isActive ? 1 : 0.4,
                          }}
                        />
                        <span>{ev.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
};
