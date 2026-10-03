export type EvidenceCategory =
  | 'OBSERVED'
  | 'DATABASE'
  | 'INFERRED'
  | 'PREDICTED_ANALYTICAL';

export type PipelineMacroStage =
  | 'MARKET'
  | 'GROUND'
  | 'INTELLIGENCE'
  | 'SCENARIO'
  | 'DECISION';

export interface WorkspaceStageMeta {
  id: number;
  shortCode: string;
  title: string;
  macroStage: PipelineMacroStage;
  summary: string;
}

export const WORKSPACE_STAGES: WorkspaceStageMeta[] = [
  {
    id: 0,
    shortCode: '01',
    title: 'Market Setup & Discovery',
    macroStage: 'MARKET',
    summary: 'Business profile → candidate micro-markets → baseline market signals',
  },
  {
    id: 1,
    shortCode: '02',
    title: 'Map & Location Analysis',
    macroStage: 'MARKET',
    summary: 'Spatial distribution of 14 baseline database entities within 800m catchment',
  },
  {
    id: 2,
    shortCode: '03',
    title: 'Street Scan & Ground Truth',
    macroStage: 'GROUND',
    summary: 'Flagship Map vs Reality fusion: 14 listed entities → 19 observed (+5 signals)',
  },
  {
    id: 3,
    shortCode: '04',
    title: 'Location Intelligence',
    macroStage: 'INTELLIGENCE',
    summary: 'Reconciled spatial scoring across demand, saturation, rent & transit',
  },
  {
    id: 4,
    shortCode: '05',
    title: 'Scenario Simulation',
    macroStage: 'SCENARIO',
    summary: 'CapEx, revenue & break-even sensitivity under real competitive density',
  },
  {
    id: 5,
    shortCode: '06',
    title: 'Explainable Report',
    macroStage: 'DECISION',
    summary: 'Auditable expansion posture with full evidence provenance',
  },
];

export const PIPELINE_MACRO_STAGES: {
  id: PipelineMacroStage;
  label: string;
  description: string;
}[] = [
  { id: 'MARKET', label: 'MARKET', description: 'Profile & Discovery' },
  { id: 'GROUND', label: 'GROUND', description: 'Street Scan Fusion' },
  { id: 'INTELLIGENCE', label: 'INTELLIGENCE', description: 'Spatial Synthesis' },
  { id: 'SCENARIO', label: 'SCENARIO', description: 'Stress Simulation' },
  { id: 'DECISION', label: 'DECISION', description: 'Explainable Report' },
];

export interface BusinessProfileState {
  category: string;
  city: string;
  budgetBand: string;
  targetCatchmentRadiusM: number;
  floorPlateSqft: string;
}

export const DEFAULT_BUSINESS_PROFILE: BusinessProfileState = {
  category: 'Quick Service Restaurant (QSR)',
  city: 'Bengaluru, IN',
  budgetBand: '₹80L – ₹1.5Cr',
  targetCatchmentRadiusM: 800,
  floorPlateSqft: '600 – 900 sq.ft',
};

export interface CandidateLocation {
  id: string;
  name: string;
  corridor: string;
  matchScore: number;
  recommended?: boolean;
  baselineListedCount: number;
  groundObservedCount: number;
  additionalSignalsCount: number;
  footfallIndex: string;
  peakWindow: string;
  medianRentSqft: number;
  transitScore: number;
  demographicFit: string;
  signalPosture: 'STRONG SIGNAL' | 'MODERATE SIGNAL' | 'ELEVATED RISK';
  signalTone: 'emerald' | 'amber' | 'slate';
  coordinatesLabel: string;
}

export const CANDIDATE_LOCATIONS: CandidateLocation[] = [
  {
    id: 'koramangala-5',
    name: 'Koramangala 5th Block',
    corridor: '80 Feet Rd / Jyoti Nivas Corridor',
    matchScore: 8.7,
    recommended: true,
    baselineListedCount: 14,
    groundObservedCount: 19,
    additionalSignalsCount: 5,
    footfallIndex: '8.4 / 10 (High)',
    peakWindow: '12:30–14:30 & 18:00–21:30',
    medianRentSqft: 180,
    transitScore: 92,
    demographicFit: '91% Gen-Z / Office & Student',
    signalPosture: 'STRONG SIGNAL',
    signalTone: 'emerald',
    coordinatesLabel: '12.9345° N, 77.6192° E',
  },
  {
    id: 'indiranagar-12',
    name: 'Indiranagar 12th Main',
    corridor: '100 Feet Rd / 12th Main Junction',
    matchScore: 7.4,
    baselineListedCount: 18,
    groundObservedCount: 24,
    additionalSignalsCount: 6,
    footfallIndex: '8.1 / 10 (High)',
    peakWindow: '19:00–23:00',
    medianRentSqft: 225,
    transitScore: 88,
    demographicFit: '84% High-Disposable Dining',
    signalPosture: 'MODERATE SIGNAL',
    signalTone: 'amber',
    coordinatesLabel: '12.9719° N, 77.6412° E',
  },
  {
    id: 'hsr-sector-2',
    name: 'HSR Layout Sector 2',
    corridor: '27th Main Commercial Spine',
    matchScore: 6.9,
    baselineListedCount: 11,
    groundObservedCount: 15,
    additionalSignalsCount: 4,
    footfallIndex: '6.8 / 10 (Moderate)',
    peakWindow: '18:30–21:00',
    medianRentSqft: 140,
    transitScore: 74,
    demographicFit: '79% Residential & Startup',
    signalPosture: 'MODERATE SIGNAL',
    signalTone: 'slate',
    coordinatesLabel: '12.9116° N, 77.6389° E',
  },
];

export interface SpatialEntity {
  id: number;
  name: string;
  subCategory: string;
  distanceM: number;
  /** Normalized map position (0–100) within the 800m catchment canvas */
  mapX: number;
  mapY: number;
  inBaselineDatabase: boolean;
  baselineEvidence: EvidenceCategory;
  groundEvidence: EvidenceCategory;
  sourceLabel: string;
  confidencePct: number;
  streetScanNote: string;
}

/**
 * Canonical 19 entities in Koramangala 5th Block (800m catchment):
 * - Entities 01–14: Present in structured baseline databases (DATABASE) AND verified on street scan (OBSERVED)
 * - Entities 15–19: +5 additional signals uncovered only after Street Scan & Ground Truth Fusion
 */
export const KORAMANGALA_ENTITIES: SpatialEntity[] = [
  {
    id: 1,
    name: 'Burger King',
    subCategory: 'Global QSR Chain',
    distanceM: 120,
    mapX: 44,
    mapY: 38,
    inBaselineDatabase: true,
    baselineEvidence: 'DATABASE',
    groundEvidence: 'OBSERVED',
    sourceLabel: 'Maps + Aggregator Registry',
    confidencePct: 99,
    streetScanNote: 'Active corner frontage, 62 seats verified',
  },
  {
    id: 2,
    name: "McDonald's",
    subCategory: 'Global QSR Chain',
    distanceM: 165,
    mapX: 56,
    mapY: 34,
    inBaselineDatabase: true,
    baselineEvidence: 'DATABASE',
    groundEvidence: 'OBSERVED',
    sourceLabel: 'Maps + Municipal License',
    confidencePct: 99,
    streetScanNote: 'High evening queue spillover observed',
  },
  {
    id: 3,
    name: 'KFC',
    subCategory: 'Global QSR Chain',
    distanceM: 210,
    mapX: 63,
    mapY: 46,
    inBaselineDatabase: true,
    baselineEvidence: 'DATABASE',
    groundEvidence: 'OBSERVED',
    sourceLabel: 'Maps + Aggregator Registry',
    confidencePct: 98,
    streetScanNote: 'Dedicated delivery pickup bay active',
  },
  {
    id: 4,
    name: 'Pizza Hut',
    subCategory: 'Fast Casual Pizza',
    distanceM: 240,
    mapX: 35,
    mapY: 52,
    inBaselineDatabase: true,
    baselineEvidence: 'DATABASE',
    groundEvidence: 'OBSERVED',
    sourceLabel: 'Maps + FSSAI Directory',
    confidencePct: 97,
    streetScanNote: '2nd floor dine-in + ground takeaway',
  },
  {
    id: 5,
    name: "Domino's Pizza",
    subCategory: 'Delivery-First QSR',
    distanceM: 290,
    mapX: 29,
    mapY: 41,
    inBaselineDatabase: true,
    baselineEvidence: 'DATABASE',
    groundEvidence: 'OBSERVED',
    sourceLabel: 'Maps + Aggregator Registry',
    confidencePct: 98,
    streetScanNote: '14 dispatch bikes parked outside',
  },
  {
    id: 6,
    name: 'Subway',
    subCategory: 'Sandwich QSR',
    distanceM: 195,
    mapX: 49,
    mapY: 60,
    inBaselineDatabase: true,
    baselineEvidence: 'DATABASE',
    groundEvidence: 'OBSERVED',
    sourceLabel: 'Maps + Commercial Registry',
    confidencePct: 96,
    streetScanNote: 'Compact 350 sqft inline storefront',
  },
  {
    id: 7,
    name: 'Chai Point',
    subCategory: 'Beverage & Snack QSR',
    distanceM: 140,
    mapX: 53,
    mapY: 49,
    inBaselineDatabase: true,
    baselineEvidence: 'DATABASE',
    groundEvidence: 'OBSERVED',
    sourceLabel: 'Maps + Aggregator Registry',
    confidencePct: 98,
    streetScanNote: 'Strong morning & 4pm office rush',
  },
  {
    id: 8,
    name: 'Third Wave Coffee',
    subCategory: 'Specialty Café',
    distanceM: 175,
    mapX: 39,
    mapY: 31,
    inBaselineDatabase: true,
    baselineEvidence: 'DATABASE',
    groundEvidence: 'OBSERVED',
    sourceLabel: 'Maps + FSSAI Directory',
    confidencePct: 99,
    streetScanNote: 'High dwell-time remote-work crowd',
  },
  {
    id: 9,
    name: 'Starbucks',
    subCategory: 'Specialty Café',
    distanceM: 260,
    mapX: 68,
    mapY: 37,
    inBaselineDatabase: true,
    baselineEvidence: 'DATABASE',
    groundEvidence: 'OBSERVED',
    sourceLabel: 'Maps + Municipal License',
    confidencePct: 99,
    streetScanNote: 'Anchor corner plot, high visibility',
  },
  {
    id: 10,
    name: 'Koramangala Social',
    subCategory: 'All-Day Café & Bar',
    distanceM: 340,
    mapX: 73,
    mapY: 58,
    inBaselineDatabase: true,
    baselineEvidence: 'DATABASE',
    groundEvidence: 'OBSERVED',
    sourceLabel: 'Maps + Excise Registry',
    confidencePct: 97,
    streetScanNote: 'Evening destination anchor driver',
  },
  {
    id: 11,
    name: 'Toit Brewpub',
    subCategory: 'Destination Dining',
    distanceM: 480,
    mapX: 79,
    mapY: 28,
    inBaselineDatabase: true,
    baselineEvidence: 'DATABASE',
    groundEvidence: 'OBSERVED',
    sourceLabel: 'Maps + Commercial Registry',
    confidencePct: 98,
    streetScanNote: 'Primary weekend footfall magnet',
  },
  {
    id: 12,
    name: 'Truffles Koramangala',
    subCategory: 'Fast Casual Burger & Café',
    distanceM: 150,
    mapX: 42,
    mapY: 46,
    inBaselineDatabase: true,
    baselineEvidence: 'DATABASE',
    groundEvidence: 'OBSERVED',
    sourceLabel: 'Maps + Aggregator Registry',
    confidencePct: 99,
    streetScanNote: 'Consistent 25-min wait during lunch',
  },
  {
    id: 13,
    name: '91springboard Café',
    subCategory: 'Coworking Pantry QSR',
    distanceM: 310,
    mapX: 25,
    mapY: 63,
    inBaselineDatabase: true,
    baselineEvidence: 'DATABASE',
    groundEvidence: 'OBSERVED',
    sourceLabel: 'Maps + Workspace Directory',
    confidencePct: 94,
    streetScanNote: 'Captive daytime tech workforce',
  },
  {
    id: 14,
    name: 'Smoke House Deli',
    subCategory: 'Casual Dining',
    distanceM: 390,
    mapX: 61,
    mapY: 68,
    inBaselineDatabase: true,
    baselineEvidence: 'DATABASE',
    groundEvidence: 'OBSERVED',
    sourceLabel: 'Maps + FSSAI Directory',
    confidencePct: 96,
    streetScanNote: 'Premium check-size benchmark',
  },
  // +5 ADDITIONAL SIGNALS DISCOVERED VIA STREET SCAN & GROUND TRUTH FUSION
  {
    id: 15,
    name: 'Unregistered Momo & Shawarma Kiosk A',
    subCategory: 'Street-Level Kiosk',
    distanceM: 85,
    mapX: 48,
    mapY: 42,
    inBaselineDatabase: false,
    baselineEvidence: 'OBSERVED',
    groundEvidence: 'OBSERVED',
    sourceLabel: 'Street Scan Computer Vision',
    confidencePct: 96,
    streetScanNote: 'Unlisted sidewalk kiosk capturing ~180 evening orders/day',
  },
  {
    id: 16,
    name: 'Late-Night Dosa & Roll Cart Cluster B',
    subCategory: 'Unpermitted Street Vendor',
    distanceM: 110,
    mapX: 52,
    mapY: 54,
    inBaselineDatabase: false,
    baselineEvidence: 'OBSERVED',
    groundEvidence: 'OBSERVED',
    sourceLabel: 'Street Scan Computer Vision',
    confidencePct: 94,
    streetScanNote: 'Operates 18:30–01:00 directly beside JNC pedestrian crossing',
  },
  {
    id: 17,
    name: 'Rebel / Multi-Brand Ghost Kitchen Unit',
    subCategory: 'Dark Kitchen (6 Virtual Brands)',
    distanceM: 190,
    mapX: 34,
    mapY: 39,
    inBaselineDatabase: false,
    baselineEvidence: 'INFERRED',
    groundEvidence: 'INFERRED',
    sourceLabel: 'Exhaust Duct + Courier Telemetry Fusion',
    confidencePct: 89,
    streetScanNote: 'No street signage; inferred via commercial flue + 22 courier pickups/hr',
  },
  {
    id: 18,
    name: 'Cloud Kitchen Aggregator Dispatch Hub',
    subCategory: 'Dark Kitchen Cluster',
    distanceM: 230,
    mapX: 60,
    mapY: 53,
    inBaselineDatabase: false,
    baselineEvidence: 'INFERRED',
    groundEvidence: 'INFERRED',
    sourceLabel: 'Rider Dwell Cluster + Utility Load',
    confidencePct: 86,
    streetScanNote: 'Basement dark-store serving 8 delivery-only burger/bowl brands',
  },
  {
    id: 19,
    name: 'New QSR Fit-Out Under Construction',
    subCategory: 'Incoming Direct Competitor',
    distanceM: 130,
    mapX: 46,
    mapY: 33,
    inBaselineDatabase: false,
    baselineEvidence: 'PREDICTED_ANALYTICAL',
    groundEvidence: 'PREDICTED_ANALYTICAL',
    sourceLabel: 'Signage Permit + HVAC Hoarding Scan',
    confidencePct: 82,
    streetScanNote: '750 sqft ground unit in fit-out; predicted QSR launch within 45 days',
  },
];

export const EVIDENCE_META: Record<
  EvidenceCategory,
  {
    code: EvidenceCategory;
    shortLabel: string;
    description: string;
    dotClass: string;
    badgeClass: string;
    textClass: string;
    hex: string;
  }
> = {
  OBSERVED: {
    code: 'OBSERVED',
    shortLabel: 'OBSERVED',
    description: 'Verified directly via street-level visual imagery & storefront scan',
    dotClass: 'bg-emerald-400',
    badgeClass: 'border-emerald-400/35 bg-emerald-500/12 text-emerald-300',
    textClass: 'text-emerald-300',
    hex: '#10B981',
  },
  DATABASE: {
    code: 'DATABASE',
    shortLabel: 'DATABASE',
    description: 'Structured registry record (Google Maps, FSSAI, Zomato, Municipal)',
    dotClass: 'bg-sky-400',
    badgeClass: 'border-sky-400/35 bg-sky-500/12 text-sky-300',
    textClass: 'text-sky-300',
    hex: '#38BDF8',
  },
  INFERRED: {
    code: 'INFERRED',
    shortLabel: 'INFERRED',
    description: 'Deduced from courier dwell clusters, commercial exhaust & utility signals',
    dotClass: 'bg-amber-400',
    badgeClass: 'border-amber-400/35 bg-amber-500/12 text-amber-300',
    textClass: 'text-amber-300',
    hex: '#F59E0B',
  },
  PREDICTED_ANALYTICAL: {
    code: 'PREDICTED_ANALYTICAL',
    shortLabel: 'PREDICTED_ANALYTICAL',
    description: 'Analytical forecast from fit-out permits, hoarding scans & lease velocity',
    dotClass: 'bg-purple-400',
    badgeClass: 'border-purple-400/35 bg-purple-500/12 text-purple-300',
    textClass: 'text-purple-300',
    hex: '#A855F7',
  },
};

export interface IntelligenceDimension {
  id: string;
  label: string;
  baselineValue: string;
  groundTruthValue: string;
  deltaLabel: string;
  scoreOutOf10: number;
  evidenceType: EvidenceCategory;
  statusLabel: string;
  statusTone: 'emerald' | 'amber' | 'sky' | 'purple';
  interpretation: string;
}

export const INTELLIGENCE_DIMENSIONS: IntelligenceDimension[] = [
  {
    id: 'competitive-density',
    label: 'Competitive Density (800m)',
    baselineValue: '14 listed entities',
    groundTruthValue: '19 active entities',
    deltaLabel: '+35.7% (+5 unlisted signals)',
    scoreOutOf10: 7.4,
    evidenceType: 'OBSERVED',
    statusLabel: 'CONTESTED',
    statusTone: 'amber',
    interpretation:
      '2 street kiosks and 2 dark-kitchen hubs absorb price-sensitive delivery volume.',
  },
  {
    id: 'pedestrian-footfall',
    label: 'Verified Pedestrian Footfall',
    baselineValue: '7.6 / 10 (Estimated)',
    groundTruthValue: '8.7 / 10 ( ~4,200 / hr peak)',
    deltaLabel: '+1.1 pts street-verified',
    scoreOutOf10: 8.7,
    evidenceType: 'OBSERVED',
    statusLabel: 'HIGH DEMAND',
    statusTone: 'emerald',
    interpretation:
      'Dual-peak college + tech office footfall sustains 14-hour daily utilization.',
  },
  {
    id: 'delivery-saturation',
    label: 'Aggregator Dark-Kitchen Pressure',
    baselineValue: '0 listed dark kitchens',
    groundTruthValue: '14 virtual brands (2 hubs)',
    deltaLabel: '+2 ghost kitchen nodes',
    scoreOutOf10: 7.8,
    evidenceType: 'INFERRED',
    statusLabel: 'ELEVATED',
    statusTone: 'amber',
    interpretation:
      'Pure delivery formats face 28% higher CAC due to hidden aggregator saturation.',
  },
  {
    id: 'rental-efficiency',
    label: 'Rent-to-Footfall Efficiency',
    baselineValue: '₹180 / sq.ft / mo',
    groundTruthValue: '₹180 / sq.ft (18% below Indiranagar)',
    deltaLabel: 'Optimal value band',
    scoreOutOf10: 8.5,
    evidenceType: 'DATABASE',
    statusLabel: 'FAVORABLE',
    statusTone: 'emerald',
    interpretation:
      'Delivers 94% of Indiranagar footfall at 20% lower fixed occupancy cost.',
  },
  {
    id: 'forward-supply',
    label: '90-Day Pipeline Supply Risk',
    baselineValue: 'No permit alerts',
    groundTruthValue: '1 QSR fit-out at 130m',
    deltaLabel: '+1 incoming competitor',
    scoreOutOf10: 6.8,
    evidenceType: 'PREDICTED_ANALYTICAL',
    statusLabel: 'MONITOR',
    statusTone: 'purple',
    interpretation:
      'Differentiated dine-in + takeaway experience required to defend share.',
  },
  {
    id: 'composite-posture',
    label: 'Composite Market Entry Score',
    baselineValue: '9.1 / 10 (Naive DB)',
    groundTruthValue: '8.4 / 10 (Ground-Adjusted)',
    deltaLabel: '-0.7 pts realism adjustment',
    scoreOutOf10: 8.4,
    evidenceType: 'PREDICTED_ANALYTICAL',
    statusLabel: 'PROCEED — HYBRID QSR',
    statusTone: 'sky',
    interpretation:
      'Ground truth prevents a costly dark-kitchen mistake and validates hybrid QSR entry.',
  },
];

export interface ExpansionScenario {
  id: 'conservative' | 'balanced' | 'aggressive';
  code: string;
  name: string;
  format: string;
  capexLakhs: number;
  capexLabel: string;
  sqft: number;
  baseMonthlyRevLakhs: number;
  baseBreakEvenMonths: number;
  riskLevel: 'MODERATE' | 'OPTIMAL BALANCED' | 'HIGH';
  riskTone: 'amber' | 'emerald' | 'purple';
  recommended?: boolean;
  groundTruthVerdict: string;
  evidenceBasis: EvidenceCategory;
}

export const EXPANSION_SCENARIOS: ExpansionScenario[] = [
  {
    id: 'conservative',
    code: 'SCENARIO A',
    name: 'Cloud Kitchen (Delivery-Only)',
    format: '400 sq.ft back-lane dark kitchen',
    capexLakhs: 58,
    capexLabel: '₹58L',
    sqft: 400,
    baseMonthlyRevLakhs: 9.4,
    baseBreakEvenMonths: 19,
    riskLevel: 'MODERATE',
    riskTone: 'amber',
    groundTruthVerdict:
      'Penalized by +2 inferred ghost kitchen hubs (14 virtual brands) competing on aggregators.',
    evidenceBasis: 'INFERRED',
  },
  {
    id: 'balanced',
    code: 'SCENARIO B',
    name: 'Hybrid High-Street QSR',
    format: '780 sq.ft inline dine-in + express pickup',
    capexLakhs: 118,
    capexLabel: '₹1.18Cr',
    sqft: 780,
    baseMonthlyRevLakhs: 17.6,
    baseBreakEvenMonths: 15,
    riskLevel: 'OPTIMAL BALANCED',
    riskTone: 'emerald',
    recommended: true,
    groundTruthVerdict:
      'Captures verified 4,200/hr street footfall while bypassing aggregator ad-spend inflation.',
    evidenceBasis: 'OBSERVED',
  },
  {
    id: 'aggressive',
    code: 'SCENARIO C',
    name: 'Flagship Corner Lounge QSR',
    format: '1,450 sq.ft corner plot full-service',
    capexLakhs: 215,
    capexLabel: '₹2.15Cr',
    sqft: 1450,
    baseMonthlyRevLakhs: 26.2,
    baseBreakEvenMonths: 24,
    riskLevel: 'HIGH',
    riskTone: 'purple',
    groundTruthVerdict:
      'High fixed rent exposure if incoming construction (Entity #19) launches aggressive discounting.',
    evidenceBasis: 'PREDICTED_ANALYTICAL',
  },
];
