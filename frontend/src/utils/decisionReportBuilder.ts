import {
  AnalysisMode,
  DecisionReportHandoffPayload,
  EvidenceCoverageSummary,
  EvidenceLedgerRow,
  FinalPostureReason,
  MarketEntryReportData,
  PlainLanguageOutcome,
  PlainLanguageReasonItem,
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
          status_badge: 'MAP-BASED BASELINE',
          corridor_scope_statement:
            'Map-Based Assessment incorporates verified commercial places and street networks within 0–300m walking radius.',
          unavailable_explanation:
            'Operating in Map-Based mode using verified commercial places within the 0–300m walking catchment. Street Scan video is an optional enhancement for visual storefront and activity detection.',
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
          'Operating in Map-Based Analysis mode. Displays the 0–300m mapped database baseline. An optional Street Scan can be uploaded in Step 02 to reconcile against on-ground visual signals.',
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
      id: 'reason-map-coverage',
      polarity: 'POSITIVE',
      headline: `Structured map coverage (${totalMapped} mapped businesses indexed)`,
      detail:
        `Evaluation built from structured commercial database baseline across ${totalMapped} nearby places. Optional street video can provide additional visual storefront validation.`,
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

  // --- PLAIN-LANGUAGE EXECUTIVE OUTCOME & REASONING (FOR ORDINARY USERS) ---
  const hasBaseline = Boolean(marketBaseline && totalMapped > 0);
  const rentDelta = scenarioAssumptions.rentDeltaPct;
  const additionalSignals = streetScanFusion?.counts.additional_signals ?? 0;
  const observedEntities = streetScanFusion?.counts.observed_entities ?? 0;
  const budgetText = profile.budget
    ? (profile.budget.startsWith('₹') ? profile.budget : `₹${profile.budget}`)
    : '';

  // 1. Plain-Language Outcome: exactly one of 4 defined states
  let plainOutcome: PlainLanguageOutcome;
  let plainOutcomeTheme: 'emerald' | 'amber' | 'rose' | 'slate';

  if (!hasBaseline || totalMapped < 2) {
    plainOutcome = 'NOT ENOUGH INFORMATION YET';
    plainOutcomeTheme = 'slate';
  } else if (
    activeEval.decision_posture.posture === 'HIGH STRUCTURAL PRESSURE' ||
    (marketOverview.commercial_density.level === 'STRONG' && marketOverview.commercial_activity.level === 'LOW') ||
    (mapped300m >= 5 && marketOverview.customer_fit.level === 'LOW')
  ) {
    plainOutcome = 'CONSIDER ANOTHER LOCATION';
    plainOutcomeTheme = 'rose';
  } else if (
    activeEval.decision_posture.posture === 'ELEVATED SENSITIVITY — PROCEED WITH CAUTION' ||
    (activeEval.decision_posture.posture === 'VIABLE WITH DIFFERENTIATION' && (mapped300m >= 3 || additionalSignals >= 3 || rentDelta >= 15)) ||
    mapped300m >= 3 ||
    rentDelta >= 15 ||
    activeEval.factors.some((f) => f.key === 'risk' && (f.rating === 'HIGH' || f.rating === 'STRONG'))
  ) {
    plainOutcome = 'POSSIBLE, WITH SOME RISKS';
    plainOutcomeTheme = 'amber';
  } else {
    // Supportive baseline/street signals; favorable entry posture
    plainOutcome = 'LOOKS PROMISING';
    plainOutcomeTheme = 'emerald';
  }

  // 2. Plain-Language Explanation: answers what looks good, what could make it difficult, what is unknown, what to check
  const explanationSentences: string[] = [];

  // What looks good:
  if (totalMapped >= 4) {
    explanationSentences.push(
      `Information from the map shows ${totalMapped} nearby businesses, indicating this area already draws regular customer foot traffic.`
    );
  } else if (totalMapped >= 1) {
    explanationSentences.push(
      `Information from the map shows commercial activity in this neighborhood with ${totalMapped} active businesses operating nearby.`
    );
  } else {
    explanationSentences.push(
      `Map data currently shows very few commercial establishments recorded around this specific spot.`
    );
  }

  // What could make it difficult:
  if (mapped300m > 0) {
    explanationSentences.push(
      `However, ${mapped300m} similar ${mapped300m === 1 ? 'business is' : 'businesses are'} already operating within 300 metres, so local customers already have close alternatives.`
    );
  } else if (streetScanExecuted && additionalSignals > 0) {
    explanationSentences.push(
      `However, what the street video detected includes ${additionalSignals} unmapped ${additionalSignals === 1 ? 'stall or competitor' : 'stalls or competitors'} along this road that do not show up on standard maps.`
    );
  } else if (rentDelta > 0) {
    explanationSentences.push(
      `However, testing a +${rentDelta}% rent increase suggests higher monthly costs would quickly squeeze margins.`
    );
  } else if (budgetText) {
    explanationSentences.push(
      `Operating under your ${budgetText} budget leaves little financial margin if setup costs or initial customer traction take longer than expected.`
    );
  }

  // What is still unknown:
  if (!streetScanExecuted) {
    explanationSentences.push(
      `Exact storefront visibility, informal street vendors, and on-ground pedestrian flow have not been visually checked and are best confirmed during an on-site visit.`
    );
  } else {
    explanationSentences.push(
      `While the street video confirmed visible storefront frontage, daily customer flow at different times of the week and exact landlord lease terms have not been verified.`
    );
  }

  // What should the user check before spending money:
  explanationSentences.push(
    `Before paying a deposit or signing a lease, visit this spot during your expected busy hours, verify exact landlord rent and utilities in writing, and confirm local permissions.`
  );

  const plainExplanation = explanationSentences.join(' ');

  // 3. WHY THIS LOCATION MAY WORK (up to 3 plain-language items)
  const whyItMayWork: PlainLanguageReasonItem[] = [];

  if (totalMapped >= 4) {
    whyItMayWork.push({
      point: `${totalMapped} businesses are found nearby, suggesting this area already attracts everyday commercial visitors.`,
      source_tag: 'Information from the map',
    });
  } else if (totalMapped >= 1) {
    whyItMayWork.push({
      point: `Commercial presence exists with ${totalMapped} nearby shops operating in the immediate area.`,
      source_tag: 'Information from the map',
    });
  }

  if (profile.targetCustomer && (marketOverview.customer_fit.level === 'STRONG' || marketOverview.customer_fit.level === 'HIGH')) {
    whyItMayWork.push({
      point: `The surrounding neighborhood appears well-matched for your target customers (${profile.targetCustomer}).`,
      source_tag: 'Our best estimate from the available information',
    });
  } else if (marketOverview.accessibility.level === 'STRONG' || marketOverview.accessibility.level === 'HIGH') {
    whyItMayWork.push({
      point: `Road connectivity and transit stops make it relatively easy for visitors to reach this spot.`,
      source_tag: 'Information from the map',
    });
  }

  if (streetScanExecuted && observedEntities > 0) {
    whyItMayWork.push({
      point: `What the street video detected includes ${observedEntities} active storefronts and pedestrian movement along this road.`,
      source_tag: 'What the street video detected',
    });
  } else if (mapped300m === 0) {
    whyItMayWork.push({
      point: `No direct competitors were found within immediate walking distance (0–300m) on standard maps.`,
      source_tag: 'Information from the map',
    });
  } else if (whyItMayWork.length < 3 && marketOverview.commercial_activity.level !== 'LOW') {
    whyItMayWork.push({
      point: `The wider area supports active commercial demand across multiple retail and food categories.`,
      source_tag: 'Information from the map',
    });
  }

  // 4. WHAT COULD GO WRONG (up to 2 important risks)
  const whatCouldGoWrong: PlainLanguageReasonItem[] = [];

  if (mapped300m > 0) {
    whatCouldGoWrong.push({
      point: `${mapped300m} similar ${mapped300m === 1 ? 'business is' : 'businesses are'} already operating within 300 metres, competing for the same customers.`,
      source_tag: 'Information from the map',
    });
  } else if (streetScanExecuted && additionalSignals > 0) {
    whatCouldGoWrong.push({
      point: `What the street video detected includes ${additionalSignals} unmapped informal ${additionalSignals === 1 ? 'stall' : 'stalls'} not visible on online maps.`,
      source_tag: 'What the street video detected',
    });
  }

  if (rentDelta > 0) {
    whatCouldGoWrong.push({
      point: `Under the tested +${rentDelta}% rent scenario, higher monthly overhead could quickly strain your margins.`,
      source_tag: 'From scenario testing',
    });
  } else if (budgetText) {
    whatCouldGoWrong.push({
      point: `Actual landlord rent, security deposits, and power/water costs have not been verified against your ${budgetText} budget.`,
      source_tag: 'What we still need to check',
    });
  } else {
    whatCouldGoWrong.push({
      point: `Actual shop rent, advance deposits, and setup expenses have not been verified with property owners.`,
      source_tag: 'What we still need to check',
    });
  }

  if (whatCouldGoWrong.length < 2 && !streetScanExecuted) {
    whatCouldGoWrong.push({
      point: `Storefront visibility and pavement foot traffic remain to be verified on the ground or with an optional street video.`,
      source_tag: 'What we still need to check',
    });
  }

  // 5. WHAT TO DO BEFORE SPENDING MONEY (1 specific, practical next step based on most important missing evidence)
  let whatToDoBeforeSpending = '';
  if (mapped300m >= 3) {
    whatToDoBeforeSpending = `Visit the ${mapped300m} closest competing shops within 300 metres to compare their exact menu, pricing, and peak customer hours before deciding your offerings.`;
  } else if (rentDelta > 0 && budgetText) {
    whatToDoBeforeSpending = `Confirm the landlord's total monthly rent and advance deposit in writing to guarantee setup costs stay safely within your ${budgetText} budget.`;
  } else {
    whatToDoBeforeSpending = 'Visit this exact spot during morning and evening peak hours to observe real pedestrian traffic and ask neighboring shopkeepers about lease terms and permissions.';
  }

  // Analysis Mode & Scope Explanation
  const analysisMode: AnalysisMode = streetScanExecuted ? 'MAP_AND_STREET' : 'MAP_BASED';
  const modeLabel: 'MAP-BASED ASSESSMENT' | 'MAP + STREET EVIDENCE' = streetScanExecuted
    ? 'MAP + STREET EVIDENCE'
    : 'MAP-BASED ASSESSMENT';
  const confidenceLabel = modeLabel;

  const scopeExplanation = streetScanExecuted
    ? 'This assessment combines mapped business data with on-the-ground visual evidence from your street footage. Visual signals provide storefront and activity context along the recorded corridor.'
    : 'This assessment uses the available map and business information to evaluate the area. A street video can add visual evidence, but it is optional. Some details, such as exact storefront visibility, informal vendors and real pedestrian activity, may require an on-site check.';

  const isProvisional = activeEval.data_mode === 'DEMO';
  const provisionalReason = activeEval.data_mode === 'DEMO'
    ? 'Market baseline uses calibrated demo registry data. Connect live Google Places API for real-time provider listings.'
    : 'Assessment synthesized from live mapped business listings and spatial network data.';

  // Neutral Evidence Coverage Summary
  const hasLivePlaces = activeEval.data_mode === 'LIVE';
  const hasDemoPlaces = totalMapped > 0;
  const businessListingsStatus: EvidenceCoverageSummary['business_listings'] = hasLivePlaces
    ? 'AVAILABLE'
    : hasDemoPlaces
    ? 'DEMO_BASELINE'
    : 'UNAVAILABLE';
  const businessListingsLabel = hasLivePlaces
    ? `Live Google Places (${totalMapped} places)`
    : hasDemoPlaces
    ? `Demo baseline registry (${totalMapped} places)`
    : 'No listings returned';

  const geographicContextStatus: EvidenceCoverageSummary['geographic_context'] =
    coordinates && coordinates.lat ? 'AVAILABLE' : 'UNAVAILABLE';
  const geographicContextLabel = coordinates
    ? `${localArea || city} (${coordinates.lat.toFixed(4)}, ${coordinates.lng.toFixed(4)})`
    : 'Location not resolved';

  const streetVisualStatus: EvidenceCoverageSummary['street_visual_evidence'] =
    streetScanExecuted ? 'AVAILABLE' : 'NOT_PROVIDED';
  const streetVisualLabel = streetScanExecuted
    ? streetScanFusion?.scan_mode === 'LIVE_UPLOAD'
      ? 'Live street video analyzed'
      : 'Calibrated scan telemetry'
    : 'Not provided (optional enhancement)';

  const rentCostsStatus: EvidenceCoverageSummary['rent_operating_costs'] = budgetText
    ? 'USER_PROVIDED'
    : 'UNKNOWN';
  const rentCostsLabel = budgetText
    ? `User budget: ${budgetText}`
    : 'Unknown (unspecified)';

  const evidenceCoverage: EvidenceCoverageSummary = {
    business_listings: businessListingsStatus,
    business_listings_label: businessListingsLabel,
    geographic_context: geographicContextStatus,
    geographic_context_label: geographicContextLabel,
    street_visual_evidence: streetVisualStatus,
    street_visual_evidence_label: streetVisualLabel,
    rent_operating_costs: rentCostsStatus,
    rent_operating_costs_label: rentCostsLabel,
  };

  // Top 3 supporting signals
  const keySupportingSignals = reasons
    .filter((r) => r.polarity === 'POSITIVE')
    .slice(0, 3)
    .map((r) => ({
      label: r.headline,
      detail: r.detail,
      evidence_type: r.evidence_type,
    }));

  if (keySupportingSignals.length < 3) {
    if (baseAccessFactor && !keySupportingSignals.some((s) => s.label.includes('Accessibility'))) {
      keySupportingSignals.push({
        label: `Frontage Accessibility (${baseAccessFactor.rating})`,
        detail: baseAccessFactor.explanation,
        evidence_type: baseAccessFactor.evidence_type,
      });
    }
  }

  // Top 2 key risks or evidence gaps
  const keyRisksOrGaps = reasons
    .filter((r) => r.polarity === 'NEGATIVE')
    .slice(0, 2)
    .map((r) => ({
      label: r.headline,
      detail: r.detail,
      evidence_type: r.evidence_type,
    }));

  if (keyRisksOrGaps.length < 2 && risksAndLimitations.length > 0) {
    const fallbackLim = risksAndLimitations[0];
    keyRisksOrGaps.push({
      label: fallbackLim.scope,
      detail: fallbackLim.statement,
      evidence_type: fallbackLim.evidence_type,
    });
  }

  // Most useful next validation step
  let nextValidationStep = whatToDoBeforeSpending;

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
      posture_headline: plainOutcome,
      posture_evidence_type: activeEval.decision_posture.evidence_type,
    },

    executiveSummary: {
      outcome: plainOutcome,
      outcome_theme: plainOutcomeTheme,
      analysis_mode: analysisMode,
      mode_label: modeLabel,
      scope_explanation: scopeExplanation,
      evidence_coverage: evidenceCoverage,
      plain_explanation: plainExplanation,
      why_it_may_work: whyItMayWork.slice(0, 3),
      what_could_go_wrong: whatCouldGoWrong.slice(0, 2),
      what_to_do_before_spending: whatToDoBeforeSpending,
      is_provisional: isProvisional,
      confidence_label: confidenceLabel,
      provisional_reason: provisionalReason,
      key_supporting_signals: keySupportingSignals,
      key_risks_or_gaps: keyRisksOrGaps,
      next_validation_step: nextValidationStep,
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
