import {
  DecisionReportHandoffPayload,
  EvidenceLedgerRow,
  FinalPostureReason,
  MarketEntryReportData,
  ReportLimitationItem,
  ShortDecisionPosture,
} from '../types/decisionReport';
import {
  DecisionPostureLevel,
  LocationIntelligenceFactor,
} from '../types/locationIntelligence';
import { compareBaselineAndScenarioIntelligence } from './locationIntelligenceEngine';

export function mapEnginePostureToShortPosture(
  level: DecisionPostureLevel
): ShortDecisionPosture {
  switch (level) {
    case 'FAVORABLE ENTRY POSTURE':
      return 'FAVORABLE';
    case 'VIABLE WITH DIFFERENTIATION':
      return 'MIXED';
    case 'ELEVATED SENSITIVITY — PROCEED WITH CAUTION':
      return 'CAUTION';
    case 'HIGH STRUCTURAL PRESSURE':
      return 'WEAK';
  }
}

function formatSignedDelta(value: number, suffix: string): string {
  if (value === 0) return `0${suffix} (Baseline)`;
  return `${value > 0 ? '+' : ''}${value}${suffix}`;
}

function findFactor(
  factors: LocationIntelligenceFactor[],
  key: LocationIntelligenceFactor['key']
): LocationIntelligenceFactor | undefined {
  return factors.find((f) => f.key === key);
}

/**
 * Pure deterministic builder that transforms accumulated state from
 * View 1 (Market Baseline), View 2 (Street Scan + Ground Truth Fusion),
 * and View 3 (Location Intelligence + Scenario Simulator) into
 * the View 4 Explainable Market Entry Report model.
 */
export function buildMarketEntryReport(
  handoff: DecisionReportHandoffPayload
): MarketEntryReportData {
  const {
    profile,
    state,
    city,
    localArea,
    candidateName,
    coordinates,
    marketBaseline,
    streetScanFusion,
    scenarioAssumptions,
  } = handoff;

  // Reuse existing View 3 comparison output if provided, or invoke the shared engine
  const comparison =
    handoff.intelligenceComparison ??
    compareBaselineAndScenarioIntelligence({
      profile,
      candidate: {
        latitude: coordinates.lat,
        longitude: coordinates.lng,
        state,
        city,
        local_area: localArea,
        label: candidateName,
      },
      marketBaseline,
      streetScanFusion,
      assumptions: scenarioAssumptions,
    });

  const baselineEval = comparison.baseline_evaluation;
  const activeEval = comparison.scenario_evaluation;
  const isScenarioModified =
    scenarioAssumptions.rentDeltaPct !== 0 ||
    scenarioAssumptions.activityDeltaPct !== 0 ||
    scenarioAssumptions.competitionDeltaCount !== 0;

  const streetScanExecuted = Boolean(streetScanFusion);
  const shortPosture = mapEnginePostureToShortPosture(
    activeEval.decision_posture.posture
  );
  const baselineShortPosture = mapEnginePostureToShortPosture(
    baselineEval.decision_posture.posture
  );

  // 1. Market Overview (strictly from View 1 MarketBaselineResponse + engine baseline factors)
  const mapped300m = marketBaseline?.bands['0-300m'].count ?? 0;
  const mappedLocal = marketBaseline?.bands['300m-2km'].count ?? 0;
  const mappedWider = marketBaseline?.bands['2-5km'].count ?? 0;
  const totalMapped =
    marketBaseline?.total_mapped ?? mapped300m + mappedLocal + mappedWider;

  const baselineFactors = baselineEval.factors;
  const baseActivityFactor = findFactor(baselineFactors, 'commercial_activity');
  const baseAccessFactor = findFactor(baselineFactors, 'accessibility');
  const baseCustomerFitFactor = findFactor(baselineFactors, 'customer_fit');
  const baseDensityFactor = findFactor(baselineFactors, 'commercial_density');

  const marketOverview: MarketEntryReportData['marketOverview'] = {
    source_label:
      marketBaseline?.source || 'DATABASE / Google Places Baseline Registry',
    provider_status_note:
      marketBaseline?.provider_status_note ||
      'Mapped competitors returned by provider across 0–300m, 300m–2km, and 2–5km spatial bands.',
    evidence_type: 'DATABASE',
    mapped_0_300m: mapped300m,
    mapped_300m_2km: mappedLocal,
    mapped_2_5km: mappedWider,
    total_mapped: totalMapped,
    commercial_activity: {
      level:
        marketBaseline?.factors.commercial_activity.level ??
        baseActivityFactor?.rating ??
        'MEDIUM',
      explanation:
        marketBaseline?.factors.commercial_activity.explanation ??
        baseActivityFactor?.explanation ??
        'Derived from mapped commercial POIs returned by provider.',
    },
    accessibility: {
      level:
        marketBaseline?.factors.accessibility.level ??
        baseAccessFactor?.rating ??
        'MEDIUM',
      explanation:
        marketBaseline?.factors.accessibility.explanation ??
        baseAccessFactor?.explanation ??
        'Derived from local road connectivity and mapped transit corridor nodes.',
    },
    customer_fit: {
      level:
        marketBaseline?.factors.customer_fit.level ??
        baseCustomerFitFactor?.rating ??
        'MEDIUM',
      explanation:
        marketBaseline?.factors.customer_fit.explanation ??
        baseCustomerFitFactor?.explanation ??
        `Evaluated for ${profile.businessType} targeting ${profile.targetCustomer}.`,
    },
    commercial_density: {
      level:
        marketBaseline?.factors.commercial_density.level ??
        baseDensityFactor?.rating ??
        'MEDIUM',
      explanation:
        marketBaseline?.factors.commercial_density.explanation ??
        baseDensityFactor?.explanation ??
        'Derived from spatial distribution of mapped businesses.',
    },
  };

  // 2. Ground Reality (strictly from View 2 StreetScanFusionResponse if executed)
  const groundReality: MarketEntryReportData['groundReality'] =
    streetScanFusion
      ? {
          executed: true,
          status_badge:
            streetScanFusion.scan_mode === 'LIVE_UPLOAD'
              ? 'LIVE STREET SCAN EXECUTED'
              : 'CALIBRATED DEMO SCAN EXECUTED',
          corridor_scope_statement:
            'The Street Scan represents only the physical corridor captured in the uploaded footage.',
          scan_metadata: {
            filename: streetScanFusion.video_summary.filename,
            duration_sec: streetScanFusion.video_summary.duration_sec,
            frames_extracted: streetScanFusion.video_summary.frames_extracted,
            ocr_keyframes_count:
              streetScanFusion.video_summary.ocr_keyframes_count,
            detector_engine: streetScanFusion.detector_engine,
            ocr_engine: streetScanFusion.ocr_engine,
          },
          counts: {
            observed_entities: streetScanFusion.counts.observed_entities,
            ocr_confirmed_names: streetScanFusion.counts.ocr_confirmed_names,
            observed_commercial_signals:
              streetScanFusion.counts.observed_commercial_signals,
            matched_entities: streetScanFusion.counts.matched_entities,
            additional_observed_signals:
              streetScanFusion.counts.additional_signals,
            baseline_only_entities:
              streetScanFusion.counts.baseline_only_unobserved,
            peak_pedestrians_in_frame:
              streetScanFusion.activity_summary.peak_pedestrians_in_frame,
            total_coco_detections:
              streetScanFusion.activity_summary.total_object_detections,
          },
          observed_entities_list: streetScanFusion.deduplicated_entities.map(
            (entity) => ({
              id: entity.entity_id,
              name: entity.display_name,
              confidence: entity.confidence,
              context: entity.nearby_activity_context,
              evidence_type: 'OBSERVED' as const,
            })
          ),
        }
      : {
          executed: false,
          status_badge: 'DATABASE BASELINE ONLY',
          corridor_scope_statement:
            'The Street Scan represents only the physical corridor captured in the uploaded footage.',
          unavailable_explanation:
            'Ground-level evidence is unavailable for this analysis.',
          counts: {
            observed_entities: 0,
            ocr_confirmed_names: 0,
            observed_commercial_signals: 0,
            matched_entities: 0,
            additional_observed_signals: 0,
            baseline_only_entities: mapped300m,
            peak_pedestrians_in_frame: 0,
            total_coco_detections: 0,
          },
          observed_entities_list: [],
        };

  // 3. Map vs Reality (0–300m Ground Reality band reconciliation)
  const mapVsReality: MarketEntryReportData['mapVsReality'] = streetScanFusion
    ? {
        available: true,
        database_baseline_mapped_300m:
          streetScanFusion.counts.mapped_baseline_300m,
        observed_in_street_scan: streetScanFusion.counts.observed_entities,
        matched: streetScanFusion.counts.matched_entities,
        additional_observed_signals: streetScanFusion.counts.additional_signals,
        baseline_only: streetScanFusion.counts.baseline_only_unobserved,
        reconciliation_note: `Within the 0–300m Ground Reality band, ${streetScanFusion.counts.mapped_baseline_300m} baseline entities were compared against ${streetScanFusion.counts.observed_entities} deduplicated Street Scan observations: ${streetScanFusion.counts.matched_entities} matched across sources, +${streetScanFusion.counts.additional_signals} additional observed signals not in the baseline, and ${streetScanFusion.counts.baseline_only_unobserved} baseline-only entities outside the camera angle or unconfirmed in the clip.`,
      }
    : {
        available: false,
        database_baseline_mapped_300m: mapped300m,
        observed_in_street_scan: 0,
        matched: 0,
        additional_observed_signals: 0,
        baseline_only: mapped300m,
        reconciliation_note:
          'Street Scan has not been executed for this location. Reconciliation displays only the 0–300m mapped database baseline with zero observed street-level entities.',
      };

  // 4. Evidence Ledger (DATABASE + OBSERVED + INFERRED + PREDICTED_ANALYTICAL)
  const evidenceLedger: EvidenceLedgerRow[] = [];

  // Add top 0-300m and 300m-2km DATABASE places from MarketBaselineResponse
  const sampleBaselinePlaces = [
    ...(marketBaseline?.bands['0-300m'].places ?? []).slice(0, 4),
    ...(marketBaseline?.bands['300m-2km'].places ?? []).slice(0, 3),
  ];

  for (const place of sampleBaselinePlaces) {
    evidenceLedger.push({
      id: `db-${place.place_id}`,
      evidence: place.business_name,
      source: place.source || 'Google Places',
      type: 'DATABASE',
      confidence: `${place.distance_m}m (${place.spatial_band})`,
      interpretation: `Mapped ${place.category} competitor returned by provider within ${place.spatial_band}.`,
    });
  }

  if (sampleBaselinePlaces.length === 0) {
    evidenceLedger.push({
      id: 'db-band-summary',
      evidence: `${totalMapped} mapped businesses (${mapped300m} in 0–300m, ${mappedLocal} in 300m–2km, ${mappedWider} in 2–5km)`,
      source: marketOverview.source_label,
      type: 'DATABASE',
      confidence: `Radii: 300m / 2km / 5km`,
      interpretation:
        'Structured provider baseline across all three spatial bands around the candidate pin.',
    });
  }

  // Add OBSERVED entities and activity signals from Street Scan (only if Street Scan ran)
  if (streetScanFusion) {
    for (const obs of streetScanFusion.deduplicated_entities) {
      evidenceLedger.push({
        id: `obs-${obs.entity_id}`,
        evidence: obs.display_name,
        source: 'Street Scan (OCR + Context)',
        type: 'OBSERVED',
        confidence: obs.confidence.toFixed(2),
        interpretation: `Deduplicated storefront signage observed across ${obs.frame_indices.length} frame(s) (${obs.first_seen_sec.toFixed(1)}s–${obs.last_seen_sec.toFixed(1)}s).`,
      });
    }

    evidenceLedger.push({
      id: 'obs-coco-activity',
      evidence: `${streetScanFusion.activity_summary.total_object_detections} COCO detections (peak ${streetScanFusion.activity_summary.peak_pedestrians_in_frame} pedestrians/frame)`,
      source: `Street Scan (${streetScanFusion.detector_engine})`,
      type: 'OBSERVED',
      confidence: `${streetScanFusion.video_summary.frames_extracted} frames`,
      interpretation:
        'Direct visual activity counts (pedestrians, vehicles, street context) captured in the physical corridor.',
    });

    // Add INFERRED reconciliation items from Street Scan Fusion
    for (const rec of streetScanFusion.reconciled_ledger.slice(0, 5)) {
      if (rec.reconciliation_status === 'MATCHED') {
        evidenceLedger.push({
          id: `inf-match-${rec.fusion_id}`,
          evidence: `${rec.name} — Matched across sources`,
          source: 'LOCUS Ground Truth Fusion',
          type: 'INFERRED',
          confidence: rec.confidence.toFixed(2),
          interpretation: rec.explanation,
        });
      } else if (rec.reconciliation_status === 'ADDITIONAL_SIGNAL') {
        evidenceLedger.push({
          id: `inf-add-${rec.fusion_id}`,
          evidence: `${rec.name} — Unmapped ground signal`,
          source: 'LOCUS Ground Truth Fusion',
          type: 'OBSERVED',
          confidence: rec.confidence.toFixed(2),
          interpretation: rec.explanation,
        });
      }
    }
  }

  // Add INFERRED Location Intelligence synthesis item
  const compFactor = findFactor(activeEval.factors, 'competition');
  const fitFactor = findFactor(activeEval.factors, 'customer_fit');
  if (compFactor) {
    evidenceLedger.push({
      id: 'inf-factor-competition',
      evidence: `Competition rated ${compFactor.rating} (${activeEval.metrics.effective_300m_competitors} effective in 0–300m)`,
      source: 'LOCUS Intelligence Engine',
      type: 'INFERRED',
      confidence: streetScanExecuted ? 'Baseline + Ground' : 'Baseline Only',
      interpretation: compFactor.explanation,
    });
  }
  if (fitFactor) {
    evidenceLedger.push({
      id: 'inf-factor-fit',
      evidence: `Customer Fit rated ${fitFactor.rating} for ${profile.targetCustomer}`,
      source: 'LOCUS Intelligence Engine',
      type: 'INFERRED',
      confidence: profile.budget,
      interpretation: fitFactor.explanation,
    });
  }

  // Add PREDICTED_ANALYTICAL row when Scenario assumptions or sensitivity are evaluated
  evidenceLedger.push({
    id: 'pred-scenario-sensitivity',
    evidence: isScenarioModified
      ? `Scenario Delta: Rent ${formatSignedDelta(scenarioAssumptions.rentDeltaPct, '%')}, Activity ${formatSignedDelta(scenarioAssumptions.activityDeltaPct, '%')}, Competition ${formatSignedDelta(scenarioAssumptions.competitionDeltaCount, '')}`
      : 'Baseline Scenario (0% Rent, 0% Activity, 0 Competition delta)',
    source: 'LOCUS Scenario Simulator',
    type: 'PREDICTED_ANALYTICAL',
    confidence: `${comparison.shifted_factors.length} factor shift(s)`,
    interpretation: comparison.sensitivity_summary,
  });

  // 5. Risks & Limitations (strictly relevant to actual data available)
  const risksAndLimitations: ReportLimitationItem[] = [
    {
      id: 'limit-provider-exhaustive',
      scope: 'Structured Provider Baseline',
      statement:
        'Google Places / baseline registry results are provider-ranked and radius-sampled results (up to 60 results per radius query), not guaranteed exhaustive counts of every business in the market.',
      evidence_type: 'DATABASE',
    },
  ];

  if (streetScanFusion) {
    risksAndLimitations.push(
      {
        id: 'limit-corridor-scope',
        scope: 'Spatial Scope of Street Scan',
        statement:
          'Street Scan only represents the physical 0–300m corridor and camera field-of-view captured in the uploaded footage; it does not cover the wider 300m–2km or 2–5km market bands.',
        evidence_type: 'OBSERVED',
      },
      {
        id: 'limit-coco-classes',
        scope: 'Object Detection Semantics',
        statement:
          'COCO object detection provides visual activity signals (such as pedestrians, vehicles, chairs, and umbrellas), not direct business-category classification.',
        evidence_type: 'OBSERVED',
      },
      {
        id: 'limit-ocr-noise',
        scope: 'Signboard OCR Tolerance',
        statement:
          'Tesseract OCR signboard reads depend on frame sharpness, lighting, and signage typography and may contain partial reads or recognition errors despite temporal deduplication.',
        evidence_type: 'INFERRED',
      }
    );
  } else {
    risksAndLimitations.push({
      id: 'limit-no-street-scan',
      scope: 'Missing Ground-Level Verification',
      statement:
        'Street Scan has not been executed for this candidate location. Unregistered storefronts, informal vendors, and real-time pedestrian activity within 0–300m remain unverified.',
      evidence_type: 'DATABASE',
    });
  }

  risksAndLimitations.push(
    {
      id: 'limit-scenario-sensitivity',
      scope: 'Scenario Analysis Framing',
      statement:
        'Scenario analysis is deterministic sensitivity analysis using the Location Intelligence factor engine, not a guaranteed revenue or financial forecast.',
      evidence_type: 'PREDICTED_ANALYTICAL',
    },
    {
      id: 'limit-customer-fit',
      scope: 'Customer-Fit Inference',
      statement: `Customer-fit conclusions for ${profile.businessType} (${profile.targetCustomer}) depend on available commercial corridor data and budget alignment (${profile.budget}), without proprietary POS transaction records.`,
      evidence_type: 'INFERRED',
    }
  );

  // 6. Final Decision Posture + 3-5 Evidence-Backed Reasons
  const reasons: FinalPostureReason[] = [];

  const actFactor = findFactor(activeEval.factors, 'commercial_activity');
  if (actFactor) {
    const isPos = actFactor.rating === 'STRONG' || actFactor.rating === 'HIGH';
    reasons.push({
      id: 'reason-activity',
      polarity: isPos ? 'POSITIVE' : 'NEGATIVE',
      headline: isPos
        ? `${actFactor.rating === 'STRONG' ? 'Strong' : 'High'} commercial activity (${actFactor.rating})`
        : `Constrained commercial activity (${actFactor.rating})`,
      detail: actFactor.explanation,
      evidence_type: actFactor.evidence_type,
    });
  }

  if (compFactor) {
    const isFavorableComp =
      compFactor.rating === 'LOW' || compFactor.rating === 'MEDIUM';
    reasons.push({
      id: 'reason-competition',
      polarity: isFavorableComp ? 'POSITIVE' : 'NEGATIVE',
      headline: isFavorableComp
        ? `Manageable direct competition (${activeEval.metrics.effective_300m_competitors} in 0–300m · ${compFactor.rating})`
        : `High competitive density (${activeEval.metrics.effective_300m_competitors} in 0–300m · ${compFactor.rating})`,
      detail: compFactor.explanation,
      evidence_type: compFactor.evidence_type,
    });
  }

  if (streetScanFusion) {
    reasons.push({
      id: 'reason-ground-reality',
      polarity:
        streetScanFusion.counts.additional_signals > 0
          ? 'NEGATIVE'
          : 'POSITIVE',
      headline:
        streetScanFusion.counts.additional_signals > 0
          ? `+${streetScanFusion.counts.additional_signals} additional ground-level commercial signal(s) observed in 0–300m`
          : `Ground-level scan confirmed ${streetScanFusion.counts.matched_entities} baseline business(es) with no hidden stalls`,
      detail: `Street Scan observed ${streetScanFusion.counts.observed_entities} deduplicated entities and ${streetScanFusion.activity_summary.total_object_detections} COCO activity detections along the corridor.`,
      evidence_type: 'OBSERVED',
    });
  } else {
    reasons.push({
      id: 'reason-missing-ground',
      polarity: 'NEGATIVE',
      headline: 'Limited ground-level coverage (Street Scan not executed)',
      detail:
        'Evaluation relies solely on structured database baseline; 0–300m physical storefront verification is pending.',
      evidence_type: 'DATABASE',
    });
  }

  if (fitFactor) {
    const isGoodFit =
      fitFactor.rating === 'STRONG' || fitFactor.rating === 'HIGH';
    reasons.push({
      id: 'reason-customer-fit',
      polarity: isGoodFit ? 'POSITIVE' : 'NEGATIVE',
      headline: isGoodFit
        ? `Aligned customer fit (${fitFactor.rating}) for ${profile.targetCustomer}`
        : `Customer fit & budget sensitivity (${fitFactor.rating}) under ${profile.budget}`,
      detail: fitFactor.explanation,
      evidence_type: fitFactor.evidence_type,
    });
  }

  const riskFactor = findFactor(activeEval.factors, 'risk');
  if (
    isScenarioModified ||
    (riskFactor &&
      (riskFactor.rating === 'HIGH' || riskFactor.rating === 'STRONG'))
  ) {
    reasons.push({
      id: 'reason-risk-sensitivity',
      polarity:
        riskFactor?.rating === 'LOW' || riskFactor?.rating === 'MEDIUM'
          ? 'POSITIVE'
          : 'NEGATIVE',
      headline: isScenarioModified
        ? `Scenario sensitivity (${comparison.shifted_factors.length} factor shift${comparison.shifted_factors.length === 1 ? '' : 's'} under tested assumptions)`
        : `Structural execution risk rated ${riskFactor?.rating ?? 'MEDIUM'}`,
      detail: isScenarioModified
        ? comparison.sensitivity_summary
        : riskFactor?.explanation ?? '',
      evidence_type: isScenarioModified
        ? 'PREDICTED_ANALYTICAL'
        : riskFactor?.evidence_type ?? 'INFERRED',
    });
  }

  // Non-prescriptive, evidence-backed decision guidance statement
  let decisionGuidanceStatement =
    'The available evidence supports further consideration of this location, subject to lease verification and corridor due diligence.';
  if (shortPosture === 'FAVORABLE') {
    decisionGuidanceStatement =
      'The available evidence supports further consideration of this location: commercial activity and customer-fit signals are supportive relative to observed corridor competition.';
  } else if (shortPosture === 'MIXED') {
    decisionGuidanceStatement =
      'The location shows favorable demand signals alongside competitive density, indicating that market entry viability depends on clear format differentiation and disciplined rent terms.';
  } else if (shortPosture === 'CAUTION') {
    decisionGuidanceStatement =
      'The location shows active commercial signals, but the decision is sensitive to rent, competition, or ground-truth coverage gaps; proceed only with conservative lease commitments.';
  } else {
    decisionGuidanceStatement =
      'Current evidence indicates elevated competitive or structural pressure relative to the configured business profile and scenario assumptions; alternative micro-markets or format adjustments should be evaluated.';
  }

  const sensitivityCaveat = isScenarioModified
    ? `Evaluated under active scenario assumptions (Rent ${formatSignedDelta(scenarioAssumptions.rentDeltaPct, '%')}, Activity ${formatSignedDelta(scenarioAssumptions.activityDeltaPct, '%')}, Competition ${formatSignedDelta(scenarioAssumptions.competitionDeltaCount, '')}), shifting ${comparison.shifted_factors.length} intelligence factor(s) from baseline.`
    : 'Evaluated at current baseline assumptions (0% Rent delta, 0% Activity delta, 0 Competition delta). Adjust View 3 Scenario Simulator sliders to test downside or upside sensitivity.';

  return {
    generated_at: comparison.evaluated_at,
    data_mode: activeEval.data_mode,
    street_scan_executed: streetScanExecuted,

    summary: {
      business_type: profile.businessType,
      target_customer: profile.targetCustomer,
      budget: profile.budget,
      expansion_objective: profile.expansionObjective,
      state,
      city,
      local_area: localArea,
      candidate_location: candidateName,
      coordinates,
      analysis_timestamp: comparison.evaluated_at,
      short_posture: shortPosture,
      engine_posture_level: activeEval.decision_posture.posture,
      posture_headline: activeEval.decision_posture.headline,
      posture_evidence_type: activeEval.decision_posture.evidence_type,
    },

    marketOverview,
    groundReality,
    mapVsReality,

    intelligence: {
      factors: activeEval.factors,
      active_mode: activeEval.mode,
    },

    scenario: {
      is_modified: isScenarioModified,
      label: 'SCENARIO IMPACT / SENSITIVITY ANALYSIS',
      assumptions: scenarioAssumptions,
      formatted_deltas: {
        rent: formatSignedDelta(scenarioAssumptions.rentDeltaPct, '%'),
        activity: formatSignedDelta(scenarioAssumptions.activityDeltaPct, '%'),
        competition: formatSignedDelta(
          scenarioAssumptions.competitionDeltaCount,
          ''
        ),
      },
      baseline_posture: baselineShortPosture,
      scenario_posture: shortPosture,
      shifted_factors: comparison.shifted_factors,
      sensitivity_summary: comparison.sensitivity_summary,
      metrics_comparison: {
        competitors_300m_baseline:
          baselineEval.metrics.effective_300m_competitors,
        competitors_300m_scenario:
          activeEval.metrics.effective_300m_competitors,
        activity_index_baseline:
          baselineEval.metrics.effective_activity_index,
        activity_index_scenario: activeEval.metrics.effective_activity_index,
        rent_pressure_baseline:
          baselineEval.metrics.effective_rent_pressure_index,
        rent_pressure_scenario:
          activeEval.metrics.effective_rent_pressure_index,
      },
    },

    evidenceLedger,
    risksAndLimitations,

    finalDecisionPosture: {
      short_posture: shortPosture,
      engine_posture_level: activeEval.decision_posture.posture,
      reasons: reasons.slice(0, 5),
      decision_guidance_statement: decisionGuidanceStatement,
      sensitivity_caveat: sensitivityCaveat,
    },
  };
}
