import {
  CategoricalLevel,
  NodeHttpRequest,
  NodeHttpResponse,
  NormalizedBaselinePlace,
} from './marketBaselineApi';

export type StreetScanMode = 'LIVE_UPLOAD' | 'CALIBRATED_DEMO' | 'PHOTO_BATCH';

export interface RawCocoObjectDetection {
  class_name: string;
  confidence: number;
  bbox: [number, number, number, number];
}

export interface RawFrameOcrRead {
  raw_text: string;
  normalized_text: string;
  confidence: number;
  bbox?: [number, number, number, number];
}

export interface NormalizedFrameObservation {
  frame_index: number;
  timestamp_sec: number;
  sharpness_score: number;
  ocr_sampled: boolean;
  objects: RawCocoObjectDetection[];
  ocr_reads: RawFrameOcrRead[];
}

export interface DeduplicatedObservedEntity {
  entity_id: string;
  display_name: string;
  normalized_name: string;
  source: 'Street Scan';
  detector_label: 'Tesseract OCR + COCO Context' | 'Calibrated Demo Signboard';
  evidence_type: 'OBSERVED';
  confidence: number;
  ocr_confirmed: boolean;
  frame_indices: number[];
  first_seen_sec: number;
  last_seen_sec: number;
  raw_ocr_variants: string[];
  nearby_activity_context: string;
  user_edited?: boolean;
  raw_text?: string;
  script_detected?: string;
  preprocessing_note?: string;
}

export type ReconciliationStatus =
  | 'MATCHED'
  | 'ADDITIONAL_SIGNAL'
  | 'BASELINE_ONLY';

export interface ReconciledFusionItem {
  fusion_id: string;
  name: string;
  reconciliation_status: ReconciliationStatus;
  evidence_type: 'OBSERVED' | 'DATABASE' | 'INFERRED';
  sources: string[];
  confidence: number;
  distance_m?: number;
  spatial_band: '0-300m';
  explanation: string;
  observed_detail?: DeduplicatedObservedEntity;
  baseline_detail?: NormalizedBaselinePlace;
}

export interface CocoClassAggregate {
  class_name: string;
  category_group: 'PEDESTRIAN' | 'VEHICULAR' | 'STREET_CONTEXT';
  total_detections: number;
  frames_present: number;
  peak_per_frame: number;
  avg_confidence: number;
}

export interface StreetScanFuseRequest {
  candidate: {
    latitude: number;
    longitude: number;
    state: string;
    city: string;
    local_area: string;
    label: string;
  };
  business_type: string;
  scan_mode: StreetScanMode;
  input_mode?: 'VIDEO' | 'PHOTOS';
  detector_engine: string;
  ocr_engine: string;
  video_metadata: {
    filename: string;
    duration_sec: number;
    width: number;
    height: number;
    sampled_fps: number;
    frames_extracted: number;
    ocr_keyframes_count: number;
  };
  frames: NormalizedFrameObservation[];
  baseline_places_300m: NormalizedBaselinePlace[];
  baseline_places_local: NormalizedBaselinePlace[];
}

export interface StreetScanFusionResponse {
  scan_mode: StreetScanMode;
  input_mode?: 'VIDEO' | 'PHOTOS';
  detector_engine: string;
  ocr_engine: string;
  spatial_scope: '0-300m';
  honesty_notice: string;
  video_summary: {
    filename: string;
    duration_sec: number;
    frames_extracted: number;
    ocr_keyframes_count: number;
    sampled_fps: number;
  };
  activity_summary: {
    total_object_detections: number;
    frames_with_activity: number;
    peak_pedestrians_in_frame: number;
    total_vehicles_detected: number;
    street_context_objects_detected: number;
    activity_level: CategoricalLevel;
    class_breakdown: CocoClassAggregate[];
  };
  counts: {
    mapped_baseline_300m: number;
    observed_entities: number;
    observed_commercial_signals: number;
    ocr_confirmed_names: number;
    matched_entities: number;
    additional_signals: number;
    baseline_only_unobserved: number;
  };
  deduplicated_entities: DeduplicatedObservedEntity[];
  reconciled_ledger: ReconciledFusionItem[];
  processed_at: string;
}

const NON_BUSINESS_STOP_PHRASES = new Set([
  'no parking',
  'parking',
  'one way',
  'slow',
  'stop',
  'push',
  'pull',
  'open',
  'closed',
  'welcome',
  'exit',
  'entry',
  'way in',
  'way out',
  'to let',
  'for rent',
  'for lease',
  'gstin',
  'fssai',
  'cash only',
  'paytm',
  'phonepe',
  'gpay',
  'upi accepted',
  'free wifi',
  'cctv',
  'under surveillance',
  'floor',
  'ground floor',
  'first floor',
  'road no',
  'main road',
  'cross road',
]);

const GENERIC_CATEGORY_TOKENS = new Set([
  'the',
  'and',
  'of',
  'in',
  'at',
  'by',
  'for',
  'pvt',
  'ltd',
  'india',
  'hyderabad',
  'bengaluru',
  'bangalore',
  'mumbai',
  'pune',
  'delhi',
  'chennai',
  'ahmedabad',
]);

/**
 * Normalizes raw OCR signboard text:
 * - lowercases (locale-aware, safe for non-Latin scripts)
 * - strips control/noise characters but preserves Unicode letters (Telugu, Devanagari, etc.)
 * - collapses whitespace
 *
 * Note: the original [^a-z0-9…] replacement has been replaced with a
 * Unicode-property class so Telugu and other non-Latin scripts are not erased.
 */
export function normalizeOcrText(raw: string): string {
  return raw
    .replace(/[\r\n\t]+/g, ' ')
    // Strip chars that are not Unicode letters, digits, &, ', - or space
    .replace(/[^\p{L}\p{N}&'\-\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase();
}

/**
 * Formats a normalized OCR string into clean Title Case for UI display if the raw string is all-caps or noisy.
 * Preserves mixed-script names (Telugu + Latin) by testing for any mixed-case Latin presence OR
 * non-Latin Unicode letters.
 */
function formatCleanDisplayName(raw: string, normalized: string): string {
  const trimmedRaw = raw
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[^\p{L}\p{N}&'\-.\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // If the raw text contains any non-Latin Unicode letters (e.g. Telugu), preserve it as-is
  // so the script characters aren't mangled by Title Case splitting.
  const hasNonLatinScript = /[^\u0000-\u024F]/u.test(trimmedRaw);
  if (hasNonLatinScript) {
    return trimmedRaw.length >= 2 ? trimmedRaw : normalized;
  }

  // For Latin text: preserve if already mixed-case (looks intentional)
  if (trimmedRaw.length >= 3 && /[a-z]/.test(trimmedRaw) && /[A-Z]/.test(trimmedRaw)) {
    return trimmedRaw;
  }

  // Otherwise Title Case the normalized form
  return normalized
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toLocaleUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Filters out obvious OCR noise, license plates, phone numbers, and non-storefront street signs.
 *
 * Unicode-safe: does NOT require Latin characters or Latin vowels. Valid Telugu,
 * Devanagari, or other Indic script text must not be rejected solely because it
 * lacks [aeiouy] or [a-z].
 *
 * Confidence sentinel: when the client sends confidence = 0, that means the OCR
 * engine returned no usable confidence value ("Confidence unavailable"). We
 * accept those reads at a neutral threshold rather than hard-rejecting them,
 * since the text content may still be genuine — the filtering below catches actual
 * noise independently.
 */
export function isPlausibleStorefrontOcr(
  rawText: string,
  normalizedText: string,
  confidence: number
): boolean {
  if (!normalizedText || normalizedText.length < 3 || normalizedText.length > 96) {
    return false;
  }

  // confidence === 0 is the "unavailable" sentinel from the pipeline client.
  // Reject reads with a genuinely low but non-zero confidence (< 0.28).
  if (confidence > 0 && confidence < 0.28) {
    return false;
  }

  // Reject Indian vehicle registration plate patterns (e.g. TS09AB1234)
  const compact = normalizedText.replace(/\s+/g, '');
  if (/^[a-z]{2}\d{1,2}[a-z]{1,3}\d{3,4}$/i.test(compact)) {
    return false;
  }

  // Reject phone numbers / pure digits / price tags
  // Use Unicode letter count so non-Latin scripts contribute to this check.
  const letterCount = (normalizedText.match(/\p{L}/gu) || []).length;
  const digitCount = (normalizedText.match(/\d/g) || []).length;
  if (letterCount < 2 || digitCount > letterCount * 2) {
    return false;
  }

  // Reject single-character repeated OCR artifacts (e.g. "iii", "lll", "eee")
  if (/^(.)\1{2,}$/.test(compact)) {
    return false;
  }

  // Reject known non-business traffic/door phrases (these are Latin so the set still applies)
  if (NON_BUSINESS_STOP_PHRASES.has(normalizedText)) {
    return false;
  }

  // Ensure at least one word has >= 2 Unicode letter codepoints.
  // This replaces the old /[aeiouy]/ Latin-vowel check which would reject all
  // Telugu text. A word with 2+ letters in any script is considered readable.
  const words = normalizedText.split(' ').filter(Boolean);
  const hasReadableWord = words.some((w) => {
    const wLetters = (w.match(/\p{L}/gu) || []).length;
    return wLetters >= 2;
  });
  if (!hasReadableWord) {
    return false;
  }

  return true;
}

/**
 * Character bigram Sorensen-Dice similarity (0..1)
 */
function bigramSimilarity(a: string, b: string): number {
  const s1 = a.replace(/\s+/g, '');
  const s2 = b.replace(/\s+/g, '');
  if (s1 === s2) return 1;
  if (s1.length < 2 || s2.length < 2) return 0;

  const bigrams1 = new Map<string, number>();
  for (let i = 0; i < s1.length - 1; i += 1) {
    const bg = s1.slice(i, i + 2);
    bigrams1.set(bg, (bigrams1.get(bg) || 0) + 1);
  }

  let intersection = 0;
  for (let i = 0; i < s2.length - 1; i += 1) {
    const bg = s2.slice(i, i + 2);
    const count = bigrams1.get(bg) || 0;
    if (count > 0) {
      bigrams1.set(bg, count - 1);
      intersection += 1;
    }
  }

  return (2 * intersection) / (s1.length - 1 + (s2.length - 1));
}

/**
 * Computes commercial entity name similarity (0..1) combining token overlap and bigram similarity.
 */
export function computeEntityNameSimilarity(normA: string, normB: string): number {
  const a = normalizeOcrText(normA);
  const b = normalizeOcrText(normB);
  if (!a || !b) return 0;
  if (a === b) return 1;

  // Substring containment when shorter string is at least 5 chars (e.g., "roastery coffee" in "roastery coffee house")
  const shorter = a.length <= b.length ? a : b;
  const longer = a.length <= b.length ? b : a;
  if (shorter.length >= 5 && longer.includes(shorter)) {
    return Math.max(0.84, bigramSimilarity(a, b));
  }

  const tokensA = a
    .split(' ')
    .filter((t) => t.length >= 2 && !GENERIC_CATEGORY_TOKENS.has(t));
  const tokensB = b
    .split(' ')
    .filter((t) => t.length >= 2 && !GENERIC_CATEGORY_TOKENS.has(t));

  let tokenScore = 0;
  if (tokensA.length > 0 && tokensB.length > 0) {
    let matchedTokens = 0;
    for (const ta of tokensA) {
      if (
        tokensB.some(
          (tb) => tb === ta || (ta.length >= 4 && tb.length >= 4 && bigramSimilarity(ta, tb) >= 0.8)
        )
      ) {
        matchedTokens += 1;
      }
    }
    tokenScore =
      matchedTokens / Math.min(tokensA.length, tokensB.length);
  }

  const dice = bigramSimilarity(a, b);
  return Math.max(dice, tokenScore * 0.9);
}

function classifyCocoGroup(
  className: string
): 'PEDESTRIAN' | 'VEHICULAR' | 'STREET_CONTEXT' {
  const norm = className.toLowerCase();
  if (norm === 'person') return 'PEDESTRIAN';
  if (
    norm === 'car' ||
    norm === 'motorcycle' ||
    norm === 'bicycle' ||
    norm === 'bus' ||
    norm === 'truck'
  ) {
    return 'VEHICULAR';
  }
  return 'STREET_CONTEXT';
}

/**
 * Summarizes COCO objects detected across a set of frame indices for contextual provenance.
 */
function buildFrameObjectContextNote(
  frames: NormalizedFrameObservation[],
  frameIndices: number[]
): string {
  const indexSet = new Set(frameIndices);
  const peakByClass = new Map<string, number>();

  for (const frame of frames) {
    if (!indexSet.has(frame.frame_index)) continue;
    const countsInFrame = new Map<string, number>();
    for (const obj of frame.objects || []) {
      const c = obj.class_name.toLowerCase();
      countsInFrame.set(c, (countsInFrame.get(c) || 0) + 1);
    }
    for (const [cls, cnt] of countsInFrame.entries()) {
      peakByClass.set(cls, Math.max(peakByClass.get(cls) || 0, cnt));
    }
  }

  if (peakByClass.size === 0) {
    return 'Signboard text extracted via keyframe OCR';
  }

  const summaryParts = Array.from(peakByClass.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cls, cnt]) => `${cnt} ${cls}`);

  return `Observed alongside COCO activity (${summaryParts.join(', ')})`;
}

/**
 * Temporal deduplication across sampled video frames:
 * Collapses repeated storefront reads across consecutive/nearby frames into unique observed entities.
 */
export function deduplicateOcrObservations(
  frames: NormalizedFrameObservation[],
  scanMode: StreetScanMode
): DeduplicatedObservedEntity[] {
  interface ClusterAccumulator {
    bestDisplayName: string;
    bestNormalizedName: string;
    bestConfidence: number;
    confidences: number[];
    frameIndices: Set<number>;
    firstSeenSec: number;
    lastSeenSec: number;
    rawVariants: Set<string>;
  }

  const clusters: ClusterAccumulator[] = [];

  const sortedFrames = [...frames].sort(
    (a, b) => a.timestamp_sec - b.timestamp_sec
  );

  for (const frame of sortedFrames) {
    for (const read of frame.ocr_reads || []) {
      const conf = Number.isFinite(read.confidence) ? read.confidence : 0;

      // confidence === 0 is the "unavailable" sentinel from the client pipeline.
      // Reads with unavailable confidence should still be evaluated on their text,
      // UNLESS the normalized text is the OCR language-warning diagnostic itself
      // (which should never appear in the evidence list).
      const normCheck = normalizeOcrText(read.normalized_text || read.raw_text || '');
      if (normCheck.startsWith('ocr lang warning')) {
        continue;
      }

      const norm = normCheck;

      if (!isPlausibleStorefrontOcr(read.raw_text, norm, conf)) {
        continue;
      }

      const candidateDisplay = formatCleanDisplayName(read.raw_text, norm);

      // Find an existing cluster that matches by normalized name similarity
      let matchedCluster: ClusterAccumulator | null = null;
      let bestSim = 0;

      for (const cluster of clusters) {
        const sim = computeEntityNameSimilarity(norm, cluster.bestNormalizedName);
        const timeDelta = Math.abs(frame.timestamp_sec - cluster.lastSeenSec);
        // Slightly more relaxed threshold (0.72) when temporally adjacent (<= 15s), strict (0.80) across distant frames
        const threshold = timeDelta <= 15 ? 0.72 : 0.8;
        if (sim >= threshold && sim > bestSim) {
          bestSim = sim;
          matchedCluster = cluster;
        }
      }

      if (matchedCluster) {
        matchedCluster.frameIndices.add(frame.frame_index);
        matchedCluster.firstSeenSec = Math.min(
          matchedCluster.firstSeenSec,
          frame.timestamp_sec
        );
        matchedCluster.lastSeenSec = Math.max(
          matchedCluster.lastSeenSec,
          frame.timestamp_sec
        );
        matchedCluster.confidences.push(conf);
        matchedCluster.rawVariants.add(read.raw_text.trim());

        // Prefer the higher-confidence or slightly more complete storefront name
        if (
          conf > matchedCluster.bestConfidence + 0.04 ||
          (conf >= matchedCluster.bestConfidence - 0.05 &&
            norm.length > matchedCluster.bestNormalizedName.length)
        ) {
          matchedCluster.bestConfidence = Math.max(matchedCluster.bestConfidence, conf);
          matchedCluster.bestNormalizedName = norm;
          matchedCluster.bestDisplayName = candidateDisplay;
        }
      } else {
        clusters.push({
          bestDisplayName: candidateDisplay,
          bestNormalizedName: norm,
          bestConfidence: conf,
          confidences: [conf],
          frameIndices: new Set([frame.frame_index]),
          firstSeenSec: frame.timestamp_sec,
          lastSeenSec: frame.timestamp_sec,
          rawVariants: new Set([read.raw_text.trim()]),
        });
      }
    }
  }

  return clusters.map((cluster, idx) => {
    const frameList = Array.from(cluster.frameIndices).sort((a, b) => a - b);
    const meanConf =
      cluster.confidences.reduce((sum, c) => sum + c, 0) /
      cluster.confidences.length;
    // Multi-frame temporal confirmation slightly boosts stability up to 0.98
    const temporalBoost = Math.min(0.06, (frameList.length - 1) * 0.02);
    const finalConfidence = Number(
      Math.min(0.98, Math.max(cluster.bestConfidence, meanConf + temporalBoost)).toFixed(2)
    );

    return {
      entity_id: `obs-entity-${idx + 1}`,
      display_name: cluster.bestDisplayName,
      normalized_name: cluster.bestNormalizedName,
      source: 'Street Scan',
      detector_label:
        scanMode === 'CALIBRATED_DEMO'
          ? 'Calibrated Demo Signboard'
          : 'Tesseract OCR + COCO Context',
      evidence_type: 'OBSERVED',
      confidence: finalConfidence,
      ocr_confirmed: true,
      frame_indices: frameList,
      first_seen_sec: Number(cluster.firstSeenSec.toFixed(1)),
      last_seen_sec: Number(cluster.lastSeenSec.toFixed(1)),
      raw_ocr_variants: Array.from(cluster.rawVariants).slice(0, 4),
      nearby_activity_context: buildFrameObjectContextNote(frames, frameList),
    };
  });
}

/**
 * Aggregates COCO object detections across all sampled frames.
 */
function aggregateCocoActivity(frames: NormalizedFrameObservation[]) {
  const byClass = new Map<
    string,
    {
      total: number;
      framesPresent: number;
      peak: number;
      confSum: number;
    }
  >();

  let totalObjectDetections = 0;
  let framesWithActivity = 0;
  let peakPedestriansInFrame = 0;
  let totalVehiclesDetected = 0;
  let streetContextObjectsDetected = 0;

  for (const frame of frames) {
    const objs = frame.objects || [];
    if (objs.length > 0) {
      framesWithActivity += 1;
    }

    const frameCounts = new Map<string, { count: number; confSum: number }>();
    for (const obj of objs) {
      const cls = obj.class_name.toLowerCase().trim();
      if (!cls) continue;
      totalObjectDetections += 1;
      const cur = frameCounts.get(cls) || { count: 0, confSum: 0 };
      cur.count += 1;
      cur.confSum += Number.isFinite(obj.confidence) ? obj.confidence : 0.6;
      frameCounts.set(cls, cur);

      const group = classifyCocoGroup(cls);
      if (group === 'VEHICULAR') totalVehiclesDetected += 1;
      if (group === 'STREET_CONTEXT') streetContextObjectsDetected += 1;
    }

    const framePersons = frameCounts.get('person')?.count || 0;
    if (framePersons > peakPedestriansInFrame) {
      peakPedestriansInFrame = framePersons;
    }

    for (const [cls, fStat] of frameCounts.entries()) {
      const agg = byClass.get(cls) || {
        total: 0,
        framesPresent: 0,
        peak: 0,
        confSum: 0,
      };
      agg.total += fStat.count;
      agg.framesPresent += 1;
      agg.peak = Math.max(agg.peak, fStat.count);
      agg.confSum += fStat.confSum;
      byClass.set(cls, agg);
    }
  }

  const classBreakdown: CocoClassAggregate[] = Array.from(byClass.entries())
    .map(([class_name, stat]) => ({
      class_name,
      category_group: classifyCocoGroup(class_name),
      total_detections: stat.total,
      frames_present: stat.framesPresent,
      peak_per_frame: stat.peak,
      avg_confidence: Number((stat.confSum / Math.max(1, stat.total)).toFixed(2)),
    }))
    .sort((a, b) => b.total_detections - a.total_detections);

  let activityLevel: CategoricalLevel = 'LOW';
  if (peakPedestriansInFrame >= 8 || totalObjectDetections >= 45) {
    activityLevel = 'STRONG';
  } else if (peakPedestriansInFrame >= 4 || totalObjectDetections >= 22) {
    activityLevel = 'HIGH';
  } else if (peakPedestriansInFrame >= 2 || totalObjectDetections >= 8) {
    activityLevel = 'MEDIUM';
  }

  return {
    total_object_detections: totalObjectDetections,
    frames_with_activity: framesWithActivity,
    peak_pedestrians_in_frame: peakPedestriansInFrame,
    total_vehicles_detected: totalVehiclesDetected,
    street_context_objects_detected: streetContextObjectsDetected,
    activity_level: activityLevel,
    class_breakdown: classBreakdown,
  };
}

/**
 * Reconciles Page 3's 0–300m DATABASE baseline against View 2's OBSERVED street scan entities.
 */
function reconcileBaselineVsObserved(
  baseline300m: NormalizedBaselinePlace[],
  baselineLocal: NormalizedBaselinePlace[],
  observedEntities: DeduplicatedObservedEntity[]
) {
  const matchedBaselineIds = new Set<string>();
  const ledger: ReconciledFusionItem[] = [];

  let matchedCount = 0;
  let additionalSignalsCount = 0;

  // Candidate pool includes 0-300m baseline + any 300m-2km place within 360m (GPS/corridor tolerance)
  const nearBoundaryPlaces = (baselineLocal || []).filter(
    (p) => p.distance_m <= 360 && !baseline300m.some((b) => b.place_id === p.place_id)
  );
  const candidateBaselinePool = [...baseline300m, ...nearBoundaryPlaces];

  for (const obs of observedEntities) {
    let bestMatch: NormalizedBaselinePlace | null = null;
    let bestSim = 0;

    for (const basePlace of candidateBaselinePool) {
      if (matchedBaselineIds.has(basePlace.place_id)) continue;
      const sim = computeEntityNameSimilarity(
        obs.normalized_name,
        basePlace.business_name
      );
      if (sim >= 0.74 && sim > bestSim) {
        bestSim = sim;
        bestMatch = basePlace;
      }
    }

    if (bestMatch) {
      matchedBaselineIds.add(bestMatch.place_id);
      matchedCount += 1;
      ledger.push({
        fusion_id: `fusion-matched-${bestMatch.place_id}`,
        name: bestMatch.business_name,
        reconciliation_status: 'MATCHED',
        evidence_type: 'INFERRED',
        sources: [bestMatch.source, 'Street Scan'],
        confidence: Number(
          Math.min(0.99, (obs.confidence + 0.9) / 2).toFixed(2)
        ),
        distance_m: bestMatch.distance_m,
        spatial_band: '0-300m',
        explanation: `Cross-source match (${Math.round(
          bestSim * 100
        )}% text similarity): Listed in ${
          bestMatch.source
        } (${bestMatch.distance_m}m) and OCR-confirmed in Street Scan frames #${obs.frame_indices.join(
          ', #'
        )}.`,
        observed_detail: obs,
        baseline_detail: bestMatch,
      });
    } else {
      additionalSignalsCount += 1;
      ledger.push({
        fusion_id: `fusion-additional-${obs.entity_id}`,
        name: obs.display_name,
        reconciliation_status: 'ADDITIONAL_SIGNAL',
        evidence_type: 'OBSERVED',
        sources: ['Street Scan'],
        confidence: obs.confidence,
        spatial_band: '0-300m',
        explanation: `Additional observed commercial text signal across frames #${obs.frame_indices.join(
          ', #'
        )} (${obs.first_seen_sec}s–${
          obs.last_seen_sec
        }s). Not matched to the 0–300m category baseline — may reflect a newly opened storefront, informal/unindexed business, adjacent category, or partial signage read.`,
        observed_detail: obs,
      });
    }
  }

  // Remaining 0-300m baseline places that were not observed in the uploaded street segment
  let baselineOnlyCount = 0;
  for (const basePlace of baseline300m) {
    if (matchedBaselineIds.has(basePlace.place_id)) continue;
    baselineOnlyCount += 1;
    ledger.push({
      fusion_id: `fusion-baseline-${basePlace.place_id}`,
      name: basePlace.business_name,
      reconciliation_status: 'BASELINE_ONLY',
      evidence_type: 'DATABASE',
      sources: [basePlace.source],
      confidence: basePlace.confidence === 'HIGH' ? 0.92 : 0.82,
      distance_m: basePlace.distance_m,
      spatial_band: '0-300m',
      explanation: `Indexed in ${basePlace.source} (${basePlace.distance_m}m from pin). Not observed in this video clip — a single street scan only covers the camera's physical path within the 0–300m Ground Reality zone.`,
      baseline_detail: basePlace,
    });
  }

  return {
    matchedCount,
    additionalSignalsCount,
    baselineOnlyCount,
    ledger,
  };
}

function sendJson(res: NodeHttpResponse, status: number, payload: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

function readJsonBody(req: NodeHttpRequest): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk: unknown) => {
      raw += String(chunk);
      if (raw.length > 2_000_000) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!raw.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw) as Record<string, unknown>);
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', () => reject(new Error('Request stream error')));
  });
}

export function createStreetScanMiddleware() {
  return async (
    req: NodeHttpRequest,
    res: NodeHttpResponse,
    next: () => void
  ): Promise<void> => {
    const rawUrl = req.url || '';
    const pathname = rawUrl.split('?')[0];

    if (pathname !== '/api/street-scan/fuse') {
      next();
      return;
    }

    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Method not allowed. Use POST.' });
      return;
    }

    try {
      const body = (await readJsonBody(
        req
      )) as unknown as Partial<StreetScanFuseRequest>;

      const scanMode: StreetScanMode =
        body.scan_mode === 'CALIBRATED_DEMO'
          ? 'CALIBRATED_DEMO'
          : body.scan_mode === 'PHOTO_BATCH'
          ? 'PHOTO_BATCH'
          : 'LIVE_UPLOAD';
      const inputMode = body.input_mode || (scanMode === 'PHOTO_BATCH' ? 'PHOTOS' : 'VIDEO');
      const frames: NormalizedFrameObservation[] = Array.isArray(body.frames)
        ? body.frames
        : [];
      const baseline300m: NormalizedBaselinePlace[] = Array.isArray(
        body.baseline_places_300m
      )
        ? body.baseline_places_300m
        : [];
      const baselineLocal: NormalizedBaselinePlace[] = Array.isArray(
        body.baseline_places_local
      )
        ? body.baseline_places_local
        : [];

      const deduplicatedEntities = deduplicateOcrObservations(frames, scanMode);
      const activitySummary = aggregateCocoActivity(frames);
      const {
        matchedCount,
        additionalSignalsCount,
        baselineOnlyCount,
        ledger,
      } = reconcileBaselineVsObserved(
        baseline300m,
        baselineLocal,
        deduplicatedEntities
      );

      // Observed commercial signals = OCR-confirmed signboards + distinct street-context COCO object classes present
      const distinctContextClasses = activitySummary.class_breakdown.filter(
        (c) => c.category_group === 'STREET_CONTEXT'
      ).length;
      const observedCommercialSignals =
        deduplicatedEntities.length + distinctContextClasses;

      const honestyNotice =
        scanMode === 'CALIBRATED_DEMO'
          ? 'CALIBRATED DEMO MODE: Using deterministic sample street-scan telemetry anchored to your 0–300m baseline. Upload storefront photos or an MP4/MOV street clip to run live browser COCO object detection and keyframe OCR.'
          : scanMode === 'PHOTO_BATCH'
          ? `GROUND REALITY SCOPE (0–300m): Street Scan reflects only the storefronts and physical storefront perspectives captured across the ${frames.length} uploaded photographs, not the entire 2–5km wider market.`
          : 'GROUND REALITY SCOPE (0–300m): Street Scan reflects only the physical street segment captured in the uploaded video, not the entire 2–5km wider market.';

      const response: StreetScanFusionResponse = {
        scan_mode: scanMode,
        input_mode: inputMode,
        detector_engine:
          body.detector_engine ||
          (scanMode === 'CALIBRATED_DEMO'
            ? 'Calibrated Demo COCO + OCR Telemetry'
            : 'COCO-SSD Object Detection (TensorFlow.js)'),
        ocr_engine:
          body.ocr_engine ||
          (scanMode === 'CALIBRATED_DEMO'
            ? 'Calibrated Demo Signboard Transcript'
            : 'Tesseract.js Keyframe OCR'),
        spatial_scope: '0-300m',
        honesty_notice: honestyNotice,
        video_summary: {
          filename: body.video_metadata?.filename || (scanMode === 'PHOTO_BATCH' ? `${frames.length} storefront photos` : 'street-scan.mp4'),
          duration_sec: Number(
            (body.video_metadata?.duration_sec || frames.length || 0).toFixed(1)
          ),
          frames_extracted:
            body.video_metadata?.frames_extracted || frames.length,
          ocr_keyframes_count:
            body.video_metadata?.ocr_keyframes_count ||
            frames.filter((f) => f.ocr_sampled).length,
          sampled_fps: body.video_metadata?.sampled_fps || 1,
        },
        activity_summary: activitySummary,
        counts: {
          mapped_baseline_300m: baseline300m.length,
          observed_entities: deduplicatedEntities.length,
          observed_commercial_signals: observedCommercialSignals,
          ocr_confirmed_names: deduplicatedEntities.filter(
            (e) => e.ocr_confirmed
          ).length,
          matched_entities: matchedCount,
          additional_signals: additionalSignalsCount,
          baseline_only_unobserved: baselineOnlyCount,
        },
        deduplicated_entities: deduplicatedEntities,
        reconciled_ledger: ledger,
        processed_at: new Date().toISOString(),
      };

      sendJson(res, 200, response);
    } catch (err: any) {
      sendJson(res, 400, {
        error: err?.message || 'Failed to fuse street scan observations',
      });
    }
  };
}
