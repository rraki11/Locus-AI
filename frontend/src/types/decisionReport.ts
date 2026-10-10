import {
  BusinessProfileConfig,
  CategoricalLevel,
  MarketBaselineResponse,
} from '../data/marketDiscoveryData';
import { EvidenceType, StreetScanFusionResponse } from './streetScan';
import {
  DecisionPostureLevel,
  FactorShiftSummary,
  LocationIntelligenceComparisonResponse,
  LocationIntelligenceFactor,
  ScenarioAssumptions,
} from './locationIntelligence';

export type ShortDecisionPosture = 'FAVORABLE' | 'MIXED' | 'CAUTION' | 'WEAK';

export interface DecisionReportHandoffPayload {
  profile: BusinessProfileConfig;
  state: string;
  city: string;
  localArea: string;
  candidateName: string;
  coordinates: { lat: number; lng: number };
  marketBaseline: MarketBaselineResponse | null;
  streetScanFusion: StreetScanFusionResponse | null;
  scenarioAssumptions: ScenarioAssumptions;
  intelligenceComparison?: LocationIntelligenceComparisonResponse;
}

export interface EvidenceLedgerRow {
  id: string;
  evidence: string;
  source: string;
  type: EvidenceType;
  confidence: string;
  interpretation: string;
}

export interface ReportLimitationItem {
  id: string;
  scope: string;
  statement: string;
  evidence_type: EvidenceType;
}

export interface FinalPostureReason {
  id: string;
  polarity: 'POSITIVE' | 'NEGATIVE';
  headline: string;
  detail: string;
  evidence_type: EvidenceType;
}

export type PlainLanguageOutcome =
  | 'LOOKS PROMISING'
  | 'POSSIBLE, WITH SOME RISKS'
  | 'CONSIDER ANOTHER LOCATION'
  | 'NOT ENOUGH INFORMATION YET';

export type AnalysisMode = 'MAP_BASED' | 'MAP_AND_STREET';

export interface EvidenceCoverageSummary {
  business_listings: 'AVAILABLE' | 'DEMO_BASELINE' | 'UNAVAILABLE';
  business_listings_label: string;
  geographic_context: 'AVAILABLE' | 'UNAVAILABLE';
  geographic_context_label: string;
  street_visual_evidence: 'AVAILABLE' | 'NOT_PROVIDED';
  street_visual_evidence_label: string;
  rent_operating_costs: 'VERIFIED' | 'USER_PROVIDED' | 'UNKNOWN';
  rent_operating_costs_label: string;
}

export interface PlainLanguageReasonItem {
  point: string;
  source_tag: string;
}

export interface MarketEntryReportData {
  generated_at: string;
  data_mode: 'LIVE' | 'DEMO';
  street_scan_executed: boolean;

  /** 1. MARKET ENTRY SUMMARY */
  summary: {
    business_type: string;
    target_customer: string;
    budget: string;
    expansion_objective: string;
    state: string;
    city: string;
    local_area: string;
    candidate_location: string;
    coordinates: { lat: number; lng: number };
    analysis_timestamp: string;
    short_posture: ShortDecisionPosture;
    engine_posture_level: DecisionPostureLevel;
    posture_headline: string;
    posture_evidence_type: EvidenceType;
  };

  /** 0. PLAIN-LANGUAGE EXECUTIVE SUMMARY (TOP OF VIEW 04 FOR ORDINARY USERS & JUDGES) */
  executiveSummary: {
    outcome: PlainLanguageOutcome;
    outcome_theme: 'emerald' | 'amber' | 'rose' | 'slate';
    analysis_mode: AnalysisMode;
    mode_label: 'MAP-BASED ASSESSMENT' | 'MAP + STREET EVIDENCE';
    scope_explanation: string;
    evidence_coverage: EvidenceCoverageSummary;
    plain_explanation: string;
    why_it_may_work: PlainLanguageReasonItem[];
    what_could_go_wrong: PlainLanguageReasonItem[];
    what_to_do_before_spending: string;
    is_provisional: boolean;
    confidence_label: string;
    provisional_reason: string;
    key_supporting_signals: {
      label: string;
      detail: string;
      evidence_type: EvidenceType;
    }[];
    key_risks_or_gaps: {
      label: string;
      detail: string;
      evidence_type: EvidenceType;
    }[];
    next_validation_step: string;
  };

  /** 2. MARKET OVERVIEW */
  marketOverview: {
    source_label: string;
    provider_status_note: string;
    evidence_type: 'DATABASE';
    mapped_0_300m: number;
    mapped_300m_2km: number;
    mapped_2_5km: number;
    total_mapped: number;
    commercial_activity: {
      level: CategoricalLevel;
      explanation: string;
    };
    accessibility: {
      level: CategoricalLevel;
      explanation: string;
    };
    customer_fit: {
      level: CategoricalLevel;
      explanation: string;
    };
    commercial_density: {
      level: CategoricalLevel;
      explanation: string;
    };
  };

  /** 3. GROUND REALITY */
  groundReality: {
    executed: boolean;
    status_badge:
      | 'LIVE STREET SCAN EXECUTED'
      | 'PHOTO BATCH SCAN EXECUTED'
      | 'CALIBRATED DEMO SCAN EXECUTED'
      | 'DATABASE BASELINE ONLY'
      | 'MAP-BASED BASELINE';
    corridor_scope_statement: string;
    unavailable_explanation?: string;
    scan_metadata?: {
      filename: string;
      duration_sec: number;
      frames_extracted: number;
      ocr_keyframes_count: number;
      detector_engine: string;
      ocr_engine: string;
    };
    counts: {
      observed_entities: number;
      ocr_confirmed_names: number;
      observed_commercial_signals: number;
      matched_entities: number;
      additional_observed_signals: number;
      baseline_only_entities: number;
      peak_pedestrians_in_frame: number;
      total_coco_detections: number;
    };
    observed_entities_list: {
      id: string;
      name: string;
      confidence: number;
      context: string;
      evidence_type: 'OBSERVED';
    }[];
  };

  /** 4. MAP VS REALITY */
  mapVsReality: {
    available: boolean;
    database_baseline_mapped_300m: number;
    observed_in_street_scan: number;
    matched: number;
    additional_observed_signals: number;
    baseline_only: number;
    reconciliation_note: string;
  };

  /** 5. LOCATION INTELLIGENCE */
  intelligence: {
    factors: LocationIntelligenceFactor[];
    active_mode: 'BASELINE' | 'SCENARIO';
  };

  /** 6. SCENARIO IMPACT */
  scenario: {
    is_modified: boolean;
    label: 'SCENARIO IMPACT / SENSITIVITY ANALYSIS';
    assumptions: ScenarioAssumptions;
    formatted_deltas: {
      rent: string;
      activity: string;
      competition: string;
    };
    baseline_posture: ShortDecisionPosture;
    scenario_posture: ShortDecisionPosture;
    shifted_factors: FactorShiftSummary[];
    sensitivity_summary: string;
    metrics_comparison: {
      competitors_300m_baseline: number;
      competitors_300m_scenario: number;
      activity_index_baseline: number;
      activity_index_scenario: number;
      rent_pressure_baseline: number;
      rent_pressure_scenario: number;
    };
  };

  /** 7. EVIDENCE LEDGER */
  evidenceLedger: EvidenceLedgerRow[];

  /** 8. RISKS & LIMITATIONS */
  risksAndLimitations: ReportLimitationItem[];

  /** 9. FINAL DECISION POSTURE */
  finalDecisionPosture: {
    short_posture: ShortDecisionPosture;
    engine_posture_level: DecisionPostureLevel;
    reasons: FinalPostureReason[];
    decision_guidance_statement: string;
    sensitivity_caveat: string;
  };
}
