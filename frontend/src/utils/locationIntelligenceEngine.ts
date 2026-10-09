import {
  BusinessProfileConfig,
  CategoricalLevel,
  MarketBaselineResponse,
} from '../data/marketDiscoveryData';
import { EvidenceType, StreetScanFusionResponse } from '../types/streetScan';
import {
  ComputedSpatialMetrics,
  DecisionPostureSummary,
  FactorShiftSummary,
  LocationIntelligenceComparisonResponse,
  LocationIntelligenceEvaluation,
  LocationIntelligenceFactor,
  ScenarioAssumptions,
} from '../types/locationIntelligence';

export const BASELINE_SCENARIO_ASSUMPTIONS: ScenarioAssumptions = {
  rentDeltaPct: 0,
  activityDeltaPct: 0,
  competitionDeltaCount: 0,
};

function parseBudgetBufferScore(budget?: string): number {
  const clean = (budget || '').trim();
  if (clean.includes('50L')) return 85;
  if (clean.includes('30L')) return 70;
  if (clean.includes('15L')) return 52;
  if (clean.includes('8L')) return 35;
  return 55;
}

/**
 * Core deterministic Location Intelligence Engine.
 * Used identically for both Baseline (deltas = 0) and Scenario evaluations.
 */
export function evaluateLocationIntelligence(params: {
  profile: BusinessProfileConfig;
  candidate: {
    latitude: number;
    longitude: number;
    state: string;
    city: string;
    local_area: string;
    label: string;
  };
  marketBaseline: MarketBaselineResponse | null;
  streetScanFusion: StreetScanFusionResponse | null;
  assumptions: ScenarioAssumptions;
  baselineReference?: LocationIntelligenceEvaluation;
}): LocationIntelligenceEvaluation {
  const {
    profile,
    candidate,
    marketBaseline,
    streetScanFusion,
    assumptions,
    baselineReference,
  } = params;

  const isScenario =
    assumptions.rentDeltaPct !== 0 ||
    assumptions.activityDeltaPct !== 0 ||
    assumptions.competitionDeltaCount !== 0;

  const streetScanAvailable = Boolean(streetScanFusion);
  const baselineSourceLabel =
    marketBaseline?.source || 'LOCUS Baseline Registry';
  const dataMode: 'LIVE' | 'DEMO' =
    marketBaseline?.data_mode === 'LIVE' ? 'LIVE' : 'DEMO';

  const streetScanStatus = !streetScanFusion
    ? 'STREET_SCAN_NOT_AVAILABLE'
    : streetScanFusion.scan_mode === 'LIVE_UPLOAD'
    ? 'LIVE_STREET_SCAN_FUSED'
    : 'CALIBRATED_DEMO_SCAN_FUSED';

  // 1. Raw counts from View 1 (Market Baseline) and View 2 (Street Scan Fusion)
  const base300m = marketBaseline?.bands['0-300m'].count ?? 0;
  const baseLocal = marketBaseline?.bands['300m-2km'].count ?? 0;
  const baseWider = marketBaseline?.bands['2-5km'].count ?? 0;
  const baseTotal = marketBaseline?.total_mapped ?? base300m + baseLocal + baseWider;

  const observedAdditional300m =
    streetScanFusion?.counts.additional_signals ?? 0;
  const matched300m = streetScanFusion?.counts.matched_entities ?? 0;
  const observedEntitiesTotal =
    streetScanFusion?.counts.observed_entities ?? 0;
  const peakPedestrians =
    streetScanFusion?.activity_summary.peak_pedestrians_in_frame ?? 0;
  const totalCocoDetections =
    streetScanFusion?.activity_summary.total_object_detections ?? 0;

  // 2. Apply Scenario Assumptions (identical formula when deltas = 0)
  const rawFused300m = base300m + observedAdditional300m;
  const effective300mCompetitors = Math.max(
    0,
    rawFused300m + assumptions.competitionDeltaCount
  );
  const effectiveTotalCompetitors = Math.max(
    0,
    baseTotal + observedAdditional300m + assumptions.competitionDeltaCount
  );

  // Base activity index (0..100 scale) driven by actual mapped + observed signals
  const rawActivityIndex = Math.min(
    96,
    24 +
      base300m * 6 +
      baseLocal * 3.5 +
      baseWider * 1.5 +
      observedAdditional300m * 5.5 +
      peakPedestrians * 3
  );
  const activityMultiplier = Math.max(
    0.2,
    1 + assumptions.activityDeltaPct / 100
  );
  const effectiveActivityIndex = Math.round(
    Math.min(100, Math.max(5, rawActivityIndex * activityMultiplier))
  );

  // Rent pressure index (0..100 scale): higher corridor density increases baseline rent pressure; higher budget lowers strain
  const budgetBuffer = parseBudgetBufferScore(profile.budget);
  const rawRentPressure = Math.min(
    92,
    Math.max(
      18,
      46 +
        (base300m + observedAdditional300m) * 4.5 +
        baseLocal * 1.6 -
        (budgetBuffer - 50) * 0.45
    )
  );
  const rentMultiplier = Math.max(0.2, 1 + assumptions.rentDeltaPct / 100);
  const effectiveRentPressureIndex = Math.round(
    Math.min(100, Math.max(5, rawRentPressure * rentMultiplier))
  );

  const metrics: ComputedSpatialMetrics = {
    baseline_300m_count: base300m,
    baseline_300m_2km_count: baseLocal,
    baseline_2_5km_count: baseWider,
    observed_additional_300m_count: observedAdditional300m,
    matched_300m_count: matched300m,
    effective_300m_competitors: effective300mCompetitors,
    effective_total_competitors: effectiveTotalCompetitors,
    effective_activity_index: effectiveActivityIndex,
    effective_rent_pressure_index: effectiveRentPressureIndex,
    street_scan_available: streetScanAvailable,
  };

  const baseSources = streetScanAvailable
    ? [`${baselineSourceLabel} (DATABASE)`, 'Street Scan (OBSERVED)']
    : [`${baselineSourceLabel} (DATABASE)`];

  // --- FACTOR 1: COMMERCIAL ACTIVITY ---
  let commercialActivityRating: CategoricalLevel = 'LOW';
  if (effectiveActivityIndex >= 76) commercialActivityRating = 'STRONG';
  else if (effectiveActivityIndex >= 56) commercialActivityRating = 'HIGH';
  else if (effectiveActivityIndex >= 36) commercialActivityRating = 'MEDIUM';

  const activityEvidenceType: EvidenceType =
    assumptions.activityDeltaPct !== 0
      ? 'PREDICTED_ANALYTICAL'
      : streetScanAvailable
      ? 'INFERRED'
      : 'DATABASE';

  const commercialActivityExplanation =
    assumptions.activityDeltaPct !== 0
      ? `Sensitivity analysis assumes ${
          assumptions.activityDeltaPct > 0 ? '+' : ''
        }${assumptions.activityDeltaPct}% commercial activity shift, adjusting corridor activity index from ${Math.round(
          rawActivityIndex
        )} to ${effectiveActivityIndex}.`
      : streetScanAvailable
      ? `${baseTotal} mapped baseline businesses across 5km plus ${observedEntitiesTotal} Street Scan storefront observations and visual activity signals (${peakPedestrians} peak pedestrians/frame observed activity indicator) indicate ${commercialActivityRating.toLowerCase()} commercial throughput.`
      : `${baseTotal} mapped businesses returned by provider across 5km (${base300m} within 0–300m, ${baseLocal} within 300m–2km) indicate ${commercialActivityRating.toLowerCase()} baseline commercial activity.`;

  // --- FACTOR 2: COMPETITION ---
  let competitionRating: CategoricalLevel = 'LOW';
  if (effective300mCompetitors >= 6 || effectiveTotalCompetitors >= 18) {
    competitionRating = 'HIGH';
  } else if (effective300mCompetitors >= 4 || effectiveTotalCompetitors >= 13) {
    competitionRating = 'STRONG';
  } else if (effective300mCompetitors >= 2 || effectiveTotalCompetitors >= 6) {
    competitionRating = 'MEDIUM';
  }

  const competitionEvidenceType: EvidenceType =
    assumptions.competitionDeltaCount !== 0
      ? 'PREDICTED_ANALYTICAL'
      : streetScanAvailable
      ? 'INFERRED'
      : 'DATABASE';

  const competitionExplanation =
    assumptions.competitionDeltaCount !== 0
      ? `Sensitivity analysis tests ${
          assumptions.competitionDeltaCount > 0 ? '+' : ''
        }${assumptions.competitionDeltaCount} immediate 0–300m competitive delta, shifting local corridor pressure from ${rawFused300m} to ${effective300mCompetitors} (${base300m} mapped competitors, ${matched300m} confirmed observed, +${observedAdditional300m} additional observed commercial signals).`
      : streetScanAvailable
      ? `${base300m} mapped 0–300m competitors (${matched300m} confirmed observed in Street Scan) plus +${observedAdditional300m} additional observed commercial signals in 0–300m; ${baseLocal} mapped in 300m–2km and ${baseWider} in 2–5km.`
      : `${base300m} mapped competitors returned by provider within 0–300m, ${baseLocal} in 300m–2km, and ${baseWider} in 2–5km (${baseTotal} mapped across ${baselineSourceLabel}).`;

  // --- FACTOR 3: CUSTOMER FIT ---
  // Combines audience demand (effectiveActivityIndex) vs rent strain (effectiveRentPressureIndex) vs excessive crowding
  const fitScore =
    effectiveActivityIndex * 0.55 +
    (100 - effectiveRentPressureIndex) * 0.3 +
    (effective300mCompetitors >= 1 && effective300mCompetitors <= 5 ? 15 : 4);

  let customerFitRating: CategoricalLevel = 'LOW';
  if (fitScore >= 66) customerFitRating = 'STRONG';
  else if (fitScore >= 52) customerFitRating = 'HIGH';
  else if (fitScore >= 38) customerFitRating = 'MEDIUM';

  const customerFitEvidenceType: EvidenceType = isScenario
    ? 'PREDICTED_ANALYTICAL'
    : 'INFERRED';

  const customerFitExplanation = isScenario
    ? `Analytical estimate for ${profile.businessType} targeting "${
        profile.targetCustomer
      }" under ${
        assumptions.rentDeltaPct >= 0 ? '+' : ''
      }${assumptions.rentDeltaPct}% rent and ${
        assumptions.activityDeltaPct >= 0 ? '+' : ''
      }${assumptions.activityDeltaPct}% activity assumptions (budget: ${
        profile.budget
      }).`
    : `Evaluates alignment between "${profile.targetCustomer}", ${profile.businessType} category validation (${effective300mCompetitors} in 0–300m), and ${profile.budget} capital envelope.`;

  // --- FACTOR 4: ACCESSIBILITY ---
  const accessibilityRating: CategoricalLevel =
    marketBaseline?.factors.accessibility.level ??
    (base300m + baseLocal >= 6 ? 'STRONG' : baseTotal >= 3 ? 'MEDIUM' : 'LOW');

  const accessibilityExplanation =
    marketBaseline?.factors.accessibility.explanation ??
    `Derived from mapped commercial frontage along ${
      candidate.local_area || candidate.city
    } street network (${base300m} nodes within 300m walkable ring).`;

  // --- FACTOR 5: COMMERCIAL DENSITY ---
  let densityRating: CategoricalLevel = 'LOW';
  if (effective300mCompetitors >= 5) densityRating = 'HIGH';
  else if (effective300mCompetitors >= 3 || baseLocal >= 6)
    densityRating = 'STRONG';
  else if (effective300mCompetitors >= 1 || baseLocal >= 3)
    densityRating = 'MEDIUM';

  const densityEvidenceType: EvidenceType =
    assumptions.competitionDeltaCount !== 0
      ? 'PREDICTED_ANALYTICAL'
      : streetScanAvailable
      ? 'INFERRED'
      : 'DATABASE';

  const densityExplanation =
    assumptions.competitionDeltaCount !== 0
      ? `Immediate 0–300m cluster shifts to ${effective300mCompetitors} storefronts under scenario competition delta (${
          assumptions.competitionDeltaCount > 0 ? '+' : ''
        }${assumptions.competitionDeltaCount}).`
      : streetScanAvailable
      ? `Reconciled 0–300m Ground Reality zone contains ${effective300mCompetitors} commercial signals (${base300m} baseline + ${observedAdditional300m} additional observed).`
      : `${base300m} mapped storefronts in the 0–300m Ground Reality ring and ${baseLocal} in the 300m–2km Local Market ring.`;

  // --- FACTOR 6: GROUND-LEVEL EVIDENCE ---
  let groundEvidenceRating: CategoricalLevel = 'LOW';
  let groundEvidenceExplanation =
    'STREET SCAN NOT AVAILABLE: No street-level video has been processed in View 2 yet. Ground-truth verification is pending; current intelligence relies on DATABASE baseline only.';
  let groundEvidenceType: EvidenceType = 'DATABASE';
  const groundSupporting: string[] = [];

  if (streetScanFusion) {
    groundEvidenceType = 'OBSERVED';
    if (
      streetScanFusion.scan_mode === 'LIVE_UPLOAD' &&
      observedEntitiesTotal >= 2
    ) {
      groundEvidenceRating = 'STRONG';
    } else if (observedEntitiesTotal >= 2) {
      groundEvidenceRating = 'HIGH';
    } else {
      groundEvidenceRating = 'MEDIUM';
    }
    groundEvidenceExplanation = `${
      streetScanFusion.scan_mode === 'LIVE_UPLOAD'
        ? 'Live video Street Scan'
        : 'Calibrated Demo Street Scan'
    } analyzed ${
      streetScanFusion.video_summary.frames_extracted
    } frames (${
      streetScanFusion.video_summary.ocr_keyframes_count
    } OCR keyframes): confirmed ${observedEntitiesTotal} deduplicated entities (${matched300m} matched to baseline, +${observedAdditional300m} additional observed signals).`;
    groundSupporting.push(
      `Detector: ${streetScanFusion.detector_engine} (${totalCocoDetections} COCO object detections)`
    );
    groundSupporting.push(
      `OCR: ${streetScanFusion.ocr_engine} (${streetScanFusion.counts.ocr_confirmed_names} confirmed names)`
    );
  } else {
    groundSupporting.push(
      'Status: STREET SCAN NOT AVAILABLE (0 frames analyzed)'
    );
    groundSupporting.push(
      'Return to 02 / Ground Reality to upload a street clip or run the calibrated demo scan.'
    );
  }

  // --- FACTOR 7: DATA COVERAGE ---
  let coverageRating: CategoricalLevel =
    marketBaseline?.data_coverage.level ?? 'MEDIUM';
  if (streetScanAvailable && dataMode === 'LIVE') {
    coverageRating = 'STRONG';
  } else if (streetScanAvailable && coverageRating === 'MEDIUM') {
    coverageRating = 'HIGH';
  }

  const coverageEvidenceType: EvidenceType = streetScanAvailable
    ? 'INFERRED'
    : 'DATABASE';

  const coverageExplanation = streetScanAvailable
    ? `Combines multi-ring ${baselineSourceLabel} (${baseTotal} places across 300m/2km/5km) with 0–300m Street Scan visual evidence (${streetScanFusion?.video_summary.frames_extracted} frames).`
    : `${
        marketBaseline?.data_coverage.summary ||
        `${baseTotal} places indexed across 300m, 2km, and 5km rings.`
      } Ground-level video layer not yet fused.`;

  // --- FACTOR 8: RISK ---
  // Risk increases with high rent pressure, high immediate competition, low activity, or missing ground-truth scan
  const competitionRiskComponent = Math.min(38, effective300mCompetitors * 5.2);
  const rentRiskComponent = effectiveRentPressureIndex * 0.38;
  const lowActivityPenalty = Math.max(0, (60 - effectiveActivityIndex) * 0.45);
  const unverifiedGroundPenalty = streetScanAvailable ? 0 : 8;
  const compositeRiskScore = Math.round(
    competitionRiskComponent +
      rentRiskComponent +
      lowActivityPenalty +
      unverifiedGroundPenalty
  );

  let riskRating: CategoricalLevel = 'LOW';
  if (compositeRiskScore >= 64) riskRating = 'HIGH';
  else if (compositeRiskScore >= 50) riskRating = 'STRONG';
  else if (compositeRiskScore >= 34) riskRating = 'MEDIUM';

  const riskEvidenceType: EvidenceType = isScenario
    ? 'PREDICTED_ANALYTICAL'
    : 'INFERRED';

  const riskExplanation = isScenario
    ? `Sensitivity analysis under ${
        assumptions.rentDeltaPct >= 0 ? '+' : ''
      }${assumptions.rentDeltaPct}% rent, ${
        assumptions.activityDeltaPct >= 0 ? '+' : ''
      }${assumptions.activityDeltaPct}% activity, and ${
        assumptions.competitionDeltaCount >= 0 ? '+' : ''
      }${assumptions.competitionDeltaCount} competitors yields ${riskRating} exposure (rent pressure index ${effectiveRentPressureIndex}/100, ${effective300mCompetitors} immediate competitors).`
    : `Reflects ${effective300mCompetitors} immediate 0–300m competitors, baseline rent pressure (${effectiveRentPressureIndex}/100 against ${profile.budget} budget), and ${
        streetScanAvailable
          ? `+${observedAdditional300m} additional street signals`
          : 'unverified ground-level frontage'
      }.`;

  const rawFactors: Omit<
    LocationIntelligenceFactor,
    'baseline_rating' | 'changed_from_baseline'
  >[] = [
    {
      key: 'commercial_activity',
      label: 'Commercial Activity',
      rating: commercialActivityRating,
      explanation: commercialActivityExplanation,
      supporting_evidence: [
        `0–300m mapped: ${base300m} · 300m–2km mapped: ${baseLocal} · 2–5km mapped: ${baseWider}`,
        streetScanAvailable
          ? `Ground-level visual activity signal: ${peakPedestrians} peak pedestrians/frame (${totalCocoDetections} COCO object detections)`
          : 'Ground-level visual activity signal: Not available (DATABASE baseline only)',
        `Effective Activity Index: ${effectiveActivityIndex}/100 (${
          assumptions.activityDeltaPct >= 0 ? '+' : ''
        }${assumptions.activityDeltaPct}% sensitivity assumption)`,
      ],
      evidence_type: activityEvidenceType,
      underlying_sources: baseSources,
    },
    {
      key: 'competition',
      label: 'Competition',
      rating: competitionRating,
      explanation: competitionExplanation,
      supporting_evidence: [
        `Mapped 0–300m competitors (DATABASE): ${base300m}`,
        streetScanAvailable
          ? `Confirmed observed competitors (matched): ${matched300m} · Additional observed commercial signals (OBSERVED): +${observedAdditional300m}`
          : 'Observed corridor signals: Street Scan not available',
        `Scenario competitive pressure index: ${effective300mCompetitors} (${
          assumptions.competitionDeltaCount >= 0 ? '+' : ''
        }${assumptions.competitionDeltaCount} scenario delta)`,
      ],
      evidence_type: competitionEvidenceType,
      underlying_sources: baseSources,
    },
    {
      key: 'customer_fit',
      label: 'Customer Fit',
      rating: customerFitRating,
      explanation: customerFitExplanation,
      supporting_evidence: [
        `Target audience: ${profile.targetCustomer} · Format: ${profile.businessType}`,
        `Budget envelope: ${profile.budget} (Rent Pressure Index: ${effectiveRentPressureIndex}/100)`,
        `Corridor demand vs cost balance: ${Math.round(fitScore)}/100`,
      ],
      evidence_type: customerFitEvidenceType,
      underlying_sources: [...baseSources, 'Business Profile'],
    },
    {
      key: 'accessibility',
      label: 'Accessibility',
      rating: accessibilityRating,
      explanation: accessibilityExplanation,
      supporting_evidence: [
        `Candidate coordinate: ${candidate.latitude.toFixed(4)}° N, ${candidate.longitude.toFixed(4)}° E`,
        `Walkable 0–300m frontage + OpenStreetMap road network indexed`,
      ],
      evidence_type: 'DATABASE',
      underlying_sources: [`${baselineSourceLabel} (DATABASE)`, 'OpenStreetMap'],
    },
    {
      key: 'commercial_density',
      label: 'Commercial Density',
      rating: densityRating,
      explanation: densityExplanation,
      supporting_evidence: [
        `0–300m Ground Reality density: ${effective300mCompetitors} entities`,
        `300m–2km Local Market density: ${baseLocal} entities`,
        `2–5km Wider Market density: ${baseWider} entities`,
      ],
      evidence_type: densityEvidenceType,
      underlying_sources: baseSources,
    },
    {
      key: 'ground_level_evidence',
      label: 'Ground-Level Evidence',
      rating: groundEvidenceRating,
      explanation: groundEvidenceExplanation,
      supporting_evidence: groundSupporting,
      evidence_type: groundEvidenceType,
      underlying_sources: streetScanAvailable
        ? ['Street Scan (OBSERVED)']
        : [`${baselineSourceLabel} (DATABASE)`],
    },
    {
      key: 'data_coverage',
      label: 'Data Coverage',
      rating: coverageRating,
      explanation: coverageExplanation,
      supporting_evidence: [
        `Baseline mode: ${dataMode} (${baselineSourceLabel})`,
        `Street Scan status: ${streetScanStatus.replace(/_/g, ' ')}`,
      ],
      evidence_type: coverageEvidenceType,
      underlying_sources: baseSources,
    },
    {
      key: 'risk',
      label: 'Risk',
      rating: riskRating,
      explanation: riskExplanation,
      supporting_evidence: [
        `Composite sensitivity exposure: ${compositeRiskScore}/100`,
        `Rent assumption delta: ${
          assumptions.rentDeltaPct >= 0 ? '+' : ''
        }${assumptions.rentDeltaPct}% · Activity delta: ${
          assumptions.activityDeltaPct >= 0 ? '+' : ''
        }${assumptions.activityDeltaPct}% · Competition delta: ${
          assumptions.competitionDeltaCount >= 0 ? '+' : ''
        }${assumptions.competitionDeltaCount}`,
      ],
      evidence_type: riskEvidenceType,
      underlying_sources: [...baseSources, 'LOCUS Sensitivity Engine'],
    },
  ];

  const factors: LocationIntelligenceFactor[] = rawFactors.map((f) => {
    const baseMatch = baselineReference?.factors.find((b) => b.key === f.key);
    const baselineRating = baseMatch ? baseMatch.rating : f.rating;
    return {
      ...f,
      baseline_rating: baselineRating,
      changed_from_baseline: baselineRating !== f.rating,
    };
  });

  // Synthesize Explainable Decision Posture
  let decisionPosture: DecisionPostureSummary;
  if (
    (customerFitRating === 'STRONG' || customerFitRating === 'HIGH') &&
    (riskRating === 'LOW' || riskRating === 'MEDIUM')
  ) {
    decisionPosture = {
      posture: 'FAVORABLE ENTRY POSTURE',
      tone: 'emerald',
      headline: `Strong commercial activity (${commercialActivityRating}) with manageable competitive and rental exposure (${riskRating} risk).`,
      rationale: `Analytical estimate indicates ${
        candidate.local_area || candidate.label
      } supports a ${profile.businessType} targeting ${
        profile.targetCustomer
      } within the ${profile.budget} budget envelope (${effective300mCompetitors} immediate 0–300m competitors).`,
      evidence_type: isScenario ? 'PREDICTED_ANALYTICAL' : 'INFERRED',
    };
  } else if (
    (commercialActivityRating === 'STRONG' ||
      commercialActivityRating === 'HIGH') &&
    (competitionRating === 'HIGH' ||
      competitionRating === 'STRONG' ||
      riskRating === 'STRONG')
  ) {
    decisionPosture = {
      posture: 'VIABLE WITH DIFFERENTIATION',
      tone: 'indigo',
      headline: `Validated demand (${commercialActivityRating} activity), but contested 0–300m frontage (${effective300mCompetitors} competitors) requires format differentiation.`,
      rationale: `High commercial throughput validates ${profile.businessType} demand, yet ${effective300mCompetitors} immediate competitors and rent pressure (${effectiveRentPressureIndex}/100) penalize undifferentiated entrants.`,
      evidence_type: isScenario ? 'PREDICTED_ANALYTICAL' : 'INFERRED',
    };
  } else if (riskRating === 'HIGH' && customerFitRating === 'LOW') {
    decisionPosture = {
      posture: 'HIGH STRUCTURAL PRESSURE',
      tone: 'rose',
      headline: `Adverse sensitivity balance: ${riskRating} risk and ${customerFitRating} customer/margin fit under current assumptions.`,
      rationale: `With ${effective300mCompetitors} immediate competitors, ${effectiveRentPressureIndex}/100 rent pressure, and ${effectiveActivityIndex}/100 activity index, unit economics face severe compression for a ${profile.budget} budget.`,
      evidence_type: isScenario ? 'PREDICTED_ANALYTICAL' : 'INFERRED',
    };
  } else {
    decisionPosture = {
      posture: 'ELEVATED SENSITIVITY — PROCEED WITH CAUTION',
      tone: 'amber',
      headline: `Moderate viability (${customerFitRating} fit, ${riskRating} risk) — sensitive to rent escalation or additional 0–300m entrants.`,
      rationale: `Location exhibits ${commercialActivityRating} commercial activity and ${competitionRating} competition (${effective300mCompetitors} in 0–300m). Verify lease terms and ground frontage before committing capital.`,
      evidence_type: isScenario ? 'PREDICTED_ANALYTICAL' : 'INFERRED',
    };
  }

  return {
    mode: isScenario ? 'SCENARIO' : 'BASELINE',
    data_mode: dataMode,
    street_scan_status: streetScanStatus,
    assumptions: { ...assumptions },
    metrics,
    factors,
    decision_posture: decisionPosture,
  };
}

/**
 * Runs the unified Location Intelligence Engine on Baseline (0, 0, 0) and Scenario assumptions,
 * returning both outputs and the exact list of factors that shifted.
 */
export function compareBaselineAndScenarioIntelligence(params: {
  profile: BusinessProfileConfig;
  candidate: {
    latitude: number;
    longitude: number;
    state: string;
    city: string;
    local_area: string;
    label: string;
  };
  marketBaseline: MarketBaselineResponse | null;
  streetScanFusion: StreetScanFusionResponse | null;
  assumptions: ScenarioAssumptions;
}): LocationIntelligenceComparisonResponse {
  const {
    profile,
    candidate,
    marketBaseline,
    streetScanFusion,
    assumptions,
  } = params;

  const baselineEval = evaluateLocationIntelligence({
    profile,
    candidate,
    marketBaseline,
    streetScanFusion,
    assumptions: BASELINE_SCENARIO_ASSUMPTIONS,
  });

  const scenarioEval = evaluateLocationIntelligence({
    profile,
    candidate,
    marketBaseline,
    streetScanFusion,
    assumptions,
    baselineReference: baselineEval,
  });

  const shiftedFactors: FactorShiftSummary[] = [];
  for (const scenFactor of scenarioEval.factors) {
    if (scenFactor.changed_from_baseline) {
      let driver = 'Combined scenario assumptions';
      if (
        scenFactor.key === 'commercial_activity' &&
        assumptions.activityDeltaPct !== 0
      ) {
        driver = `Activity assumption (${
          assumptions.activityDeltaPct > 0 ? '+' : ''
        }${assumptions.activityDeltaPct}%)`;
      } else if (
        (scenFactor.key === 'competition' ||
          scenFactor.key === 'commercial_density') &&
        assumptions.competitionDeltaCount !== 0
      ) {
        driver = `Competition assumption (${
          assumptions.competitionDeltaCount > 0 ? '+' : ''
        }${assumptions.competitionDeltaCount} in 0–300m)`;
      } else if (
        scenFactor.key === 'customer_fit' ||
        scenFactor.key === 'risk'
      ) {
        const parts: string[] = [];
        if (assumptions.rentDeltaPct !== 0) {
          parts.push(
            `Rent ${assumptions.rentDeltaPct > 0 ? '+' : ''}${
              assumptions.rentDeltaPct
            }%`
          );
        }
        if (assumptions.activityDeltaPct !== 0) {
          parts.push(
            `Activity ${assumptions.activityDeltaPct > 0 ? '+' : ''}${
              assumptions.activityDeltaPct
            }%`
          );
        }
        if (assumptions.competitionDeltaCount !== 0) {
          parts.push(
            `Competition ${assumptions.competitionDeltaCount > 0 ? '+' : ''}${
              assumptions.competitionDeltaCount
            }`
          );
        }
        driver = parts.join(' + ') || driver;
      }

      shiftedFactors.push({
        key: scenFactor.key,
        label: scenFactor.label,
        from_rating: scenFactor.baseline_rating,
        to_rating: scenFactor.rating,
        driver,
      });
    }
  }

  const isBaseline =
    assumptions.rentDeltaPct === 0 &&
    assumptions.activityDeltaPct === 0 &&
    assumptions.competitionDeltaCount === 0;

  let sensitivitySummary = '';
  if (isBaseline) {
    sensitivitySummary =
      'Baseline assumptions active (Rent 0%, Activity 0%, Competition +0). Adjust any slider to test how sensitive this location decision is to changing market conditions.';
  } else if (shiftedFactors.length === 0) {
    sensitivitySummary = `Analytical estimate: Under Rent ${
      assumptions.rentDeltaPct >= 0 ? '+' : ''
    }${assumptions.rentDeltaPct}%, Activity ${
      assumptions.activityDeltaPct >= 0 ? '+' : ''
    }${assumptions.activityDeltaPct}%, and Competition ${
      assumptions.competitionDeltaCount >= 0 ? '+' : ''
    }${assumptions.competitionDeltaCount}, categorical factor ratings remain resilient with no tier shifts from baseline.`;
  } else {
    const shiftText = shiftedFactors
      .map((s) => `${s.label} (${s.from_rating} → ${s.to_rating})`)
      .join(', ');
    sensitivitySummary = `Scenario impact: ${
      shiftedFactors.length
    } factor${shiftedFactors.length === 1 ? '' : 's'} shifted — ${shiftText}. Decision posture is "${
      scenarioEval.decision_posture.posture
    }".`;
  }

  return {
    candidate,
    profile,
    baseline_evaluation: baselineEval,
    scenario_evaluation: scenarioEval,
    shifted_factors: shiftedFactors,
    sensitivity_summary: sensitivitySummary,
    evaluated_at: new Date().toISOString(),
  };
}
