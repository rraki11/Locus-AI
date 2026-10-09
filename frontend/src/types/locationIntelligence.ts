import {
  BusinessProfileConfig,
  CategoricalLevel,
  MarketBaselineResponse,
} from '../data/marketDiscoveryData';
import { EvidenceType, StreetScanFusionResponse } from './streetScan';

export type IntelligenceFactorKey =
  | 'commercial_activity'
  | 'competition'
  | 'customer_fit'
  | 'accessibility'
  | 'commercial_density'
  | 'ground_level_evidence'
  | 'data_coverage'
  | 'risk';

export interface ScenarioAssumptions {
  /** Percentage change in rent assumption, e.g. -20 to +40 (0 = baseline) */
  rentDeltaPct: number;
  /** Percentage change in footfall / commercial activity, e.g. -30 to +30 (0 = baseline) */
  activityDeltaPct: number;
  /** Change in immediate competitor count within 0–300m / local corridor, e.g. -2 to +5 (0 = baseline) */
  competitionDeltaCount: number;
}

export interface LocationIntelligenceFactor {
  key: IntelligenceFactorKey;
  label: string;
  rating: CategoricalLevel;
  baseline_rating: CategoricalLevel;
  changed_from_baseline: boolean;
  explanation: string;
  supporting_evidence: string[];
  evidence_type: EvidenceType;
  underlying_sources: string[];
}

export type DecisionPostureLevel =
  | 'FAVORABLE ENTRY POSTURE'
  | 'VIABLE WITH DIFFERENTIATION'
  | 'ELEVATED SENSITIVITY — PROCEED WITH CAUTION'
  | 'HIGH STRUCTURAL PRESSURE';

export interface DecisionPostureSummary {
  posture: DecisionPostureLevel;
  tone: 'emerald' | 'indigo' | 'amber' | 'rose';
  headline: string;
  rationale: string;
  evidence_type: EvidenceType;
}

export interface ComputedSpatialMetrics {
  baseline_300m_count: number;
  baseline_300m_2km_count: number;
  baseline_2_5km_count: number;
  observed_additional_300m_count: number;
  matched_300m_count: number;
  effective_300m_competitors: number;
  effective_total_competitors: number;
  effective_activity_index: number;
  effective_rent_pressure_index: number;
  street_scan_available: boolean;
}

export interface LocationIntelligenceEvaluation {
  mode: 'BASELINE' | 'SCENARIO';
  data_mode: 'LIVE' | 'DEMO';
  street_scan_status:
    | 'LIVE_STREET_SCAN_FUSED'
    | 'CALIBRATED_DEMO_SCAN_FUSED'
    | 'STREET_SCAN_NOT_AVAILABLE';
  assumptions: ScenarioAssumptions;
  metrics: ComputedSpatialMetrics;
  factors: LocationIntelligenceFactor[];
  decision_posture: DecisionPostureSummary;
}

export interface FactorShiftSummary {
  key: IntelligenceFactorKey;
  label: string;
  from_rating: CategoricalLevel;
  to_rating: CategoricalLevel;
  driver: string;
}

export interface LocationIntelligenceComparisonResponse {
  candidate: {
    latitude: number;
    longitude: number;
    state: string;
    city: string;
    local_area: string;
    label: string;
  };
  profile: BusinessProfileConfig;
  baseline_evaluation: LocationIntelligenceEvaluation;
  scenario_evaluation: LocationIntelligenceEvaluation;
  shifted_factors: FactorShiftSummary[];
  sensitivity_summary: string;
  evaluated_at: string;
}

export interface LocationIntelligenceHandoffPayload {
  profile: BusinessProfileConfig;
  state: string;
  city: string;
  localArea: string;
  candidateName: string;
  coordinates: { lat: number; lng: number };
  marketBaseline: MarketBaselineResponse | null;
  streetScanFusion: StreetScanFusionResponse | null;
}
