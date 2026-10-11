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
 * - handles null/undefined safely
 * - lowercases (locale-aware, safe for non-Latin scripts)
 * - strips control/noise characters but preserves Unicode letters (Telugu, Devanagari, etc.)
 * - collapses whitespace
 */
export function normalizeOcrText(raw: unknown): string {
  if (typeof raw !== 'string') {
    if (raw === null || raw === undefined) return '';
    raw = String(raw);
  }
  return (raw as string)
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[^\p{L}\p{M}\p{N}&'\-\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase();
}

/**
 * Formats a normalized OCR string into clean Title Case for UI display if the raw string is all-caps or noisy.
 * Preserves mixed-script names (Telugu + Latin) safely.
 */
export function formatCleanDisplayName(raw: unknown, normalized: unknown): string {
  const rawStr = typeof raw === 'string' ? raw : String(raw || '');
  const normStr = typeof normalized === 'string' ? normalized : String(normalized || '');

  const trimmedRaw = rawStr
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[^\p{L}\p{M}\p{N}&'\-.\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const hasNonLatinScript = /[^\u0000-\u024F]/u.test(trimmedRaw);
  if (hasNonLatinScript) {
    return trimmedRaw.length >= 2 ? trimmedRaw : normStr;
  }

  if (trimmedRaw.length >= 3 && /[a-z]/.test(trimmedRaw) && /[A-Z]/.test(trimmedRaw)) {
    return trimmedRaw;
  }

  return normStr
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toLocaleUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Filters out obvious OCR noise, license plates, phone numbers, and non-storefront street signs.
 * Unicode-safe: Indic scripts are preserved without requiring Latin characters.
 */
export function isPlausibleStorefrontOcr(
  rawText: unknown,
  normalizedText: unknown,
  confidence: unknown
): boolean {
  const norm = typeof normalizedText === 'string' ? normalizedText.trim() : '';
  const conf = typeof confidence === 'number' && Number.isFinite(confidence) ? confidence : 0;

  if (!norm || norm.length < 3 || norm.length > 96) {
    return false;
  }

  if (conf > 0 && conf < 0.28) {
    return false;
  }

  const compact = norm.replace(/\s+/g, '');
  if (/^[a-z]{2}\d{1,2}[a-z]{1,3}\d{3,4}$/i.test(compact)) {
    return false;
  }

  const letterCount = (norm.match(/[\p{L}\p{M}]/gu) || []).length;
  const digitCount = (norm.match(/\d/g) || []).length;
  if (letterCount < 2 || digitCount > letterCount * 2) {
    return false;
  }

  if (/^(.)\1{2,}$/.test(compact)) {
    return false;
  }

  if (NON_BUSINESS_STOP_PHRASES.has(norm)) {
    return false;
  }

  const words = norm.split(' ').filter(Boolean);
  const hasReadableWord = words.some((w) => {
    const wLetters = (w.match(/[\p{L}\p{M}]/gu) || []).length;
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
function bigramSimilarity(a: unknown, b: unknown): number {
  const s1 = typeof a === 'string' ? a.replace(/\s+/g, '') : '';
  const s2 = typeof b === 'string' ? b.replace(/\s+/g, '') : '';
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
export function computeEntityNameSimilarity(normA: unknown, normB: unknown): number {
  const a = normalizeOcrText(normA);
  const b = normalizeOcrText(normB);
  if (!a || !b) return 0;
  if (a === b) return 1;

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
    tokenScore = matchedTokens / Math.min(tokensA.length, tokensB.length);
  }

  const dice = bigramSimilarity(a, b);
  return Math.max(dice, tokenScore * 0.9);
}

function classifyCocoGroup(
  className: string
): 'PEDESTRIAN' | 'VEHICULAR' | 'STREET_CONTEXT' {
  const norm = (className || '').toLowerCase();
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

function buildFrameObjectContextNote(
  frames: NormalizedFrameObservation[],
  frameIndices: number[]
): string {
  const indexSet = new Set(frameIndices);
  const peakByClass = new Map<string, number>();

  for (const frame of frames || []) {
    if (!frame || !indexSet.has(frame.frame_index)) continue;
    const countsInFrame = new Map<string, number>();
    for (const obj of frame.objects || []) {
      if (!obj || typeof obj.class_name !== 'string') continue;
      const c = obj.class_name.toLowerCase().trim();
      if (!c) continue;
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
 * Deduplicates OCR reads across frames/photos into unique commercial entities.
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

  const safeFrames = Array.isArray(frames) ? frames.filter(Boolean) : [];
  const clusters: ClusterAccumulator[] = [];

  const sortedFrames = [...safeFrames].sort(
    (a, b) => (a.timestamp_sec || 0) - (b.timestamp_sec || 0)
  );

  for (const frame of sortedFrames) {
    const timestamp = Number.isFinite(frame.timestamp_sec) ? frame.timestamp_sec : 0;
    const frameIndex = typeof frame.frame_index === 'number' ? frame.frame_index : 1;

    for (const read of frame.ocr_reads || []) {
      if (!read || typeof read !== 'object') continue;
      const rawText = typeof read.raw_text === 'string' ? read.raw_text : String(read.raw_text || '');
      const conf = Number.isFinite(read.confidence) ? read.confidence : 0;

      const normCheck = normalizeOcrText(read.normalized_text || rawText);
      if (normCheck.startsWith('ocr lang warning') || normCheck.startsWith('ocr notice')) {
        continue;
      }

      const norm = normCheck;
      if (!isPlausibleStorefrontOcr(rawText, norm, conf)) {
        continue;
      }

      const candidateDisplay = formatCleanDisplayName(rawText, norm);

      let matchedCluster: ClusterAccumulator | null = null;
      let bestSim = 0;

      for (const cluster of clusters) {
        const sim = computeEntityNameSimilarity(norm, cluster.bestNormalizedName);
        const timeDelta = Math.abs(timestamp - cluster.lastSeenSec);
        const threshold = timeDelta <= 15 ? 0.72 : 0.8;
        if (sim >= threshold && sim > bestSim) {
          bestSim = sim;
          matchedCluster = cluster;
        }
      }

      if (matchedCluster) {
        matchedCluster.frameIndices.add(frameIndex);
        matchedCluster.firstSeenSec = Math.min(matchedCluster.firstSeenSec, timestamp);
        matchedCluster.lastSeenSec = Math.max(matchedCluster.lastSeenSec, timestamp);
        matchedCluster.confidences.push(conf);
        if (rawText.trim()) {
          matchedCluster.rawVariants.add(rawText.trim());
        }

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
          frameIndices: new Set([frameIndex]),
          firstSeenSec: timestamp,
          lastSeenSec: timestamp,
          rawVariants: new Set(rawText.trim() ? [rawText.trim()] : []),
        });
      }
    }
  }

  return clusters.map((cluster, idx) => {
    const frameList = Array.from(cluster.frameIndices).sort((a, b) => a - b);
    const meanConf =
      cluster.confidences.length > 0
        ? cluster.confidences.reduce((sum, c) => sum + c, 0) / cluster.confidences.length
        : cluster.bestConfidence;
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
      nearby_activity_context: buildFrameObjectContextNote(safeFrames, frameList),
    };
  });
}

/**
 * Aggregates COCO object detections across all frames.
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

  for (const frame of frames || []) {
    if (!frame) continue;
    const objs = Array.isArray(frame.objects) ? frame.objects.filter(Boolean) : [];
    if (objs.length > 0) {
      framesWithActivity += 1;
    }

    const frameCounts = new Map<string, { count: number; confSum: number }>();
    for (const obj of objs) {
      if (!obj || typeof obj.class_name !== 'string') continue;
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
 * Reconciles 0–300m baseline database entries against observed street scan entities.
 */
function reconcileBaselineVsObserved(
  baseline300m: NormalizedBaselinePlace[],
  baselineLocal: NormalizedBaselinePlace[],
  observedEntities: DeduplicatedObservedEntity[],
  mediaTypeNotice: 'photos' | 'video' = 'photos'
) {
  const matchedBaselineIds = new Set<string>();
  const ledger: ReconciledFusionItem[] = [];

  let matchedCount = 0;
  let additionalSignalsCount = 0;

  const safe300m = Array.isArray(baseline300m) ? baseline300m.filter(Boolean) : [];
  const safeLocal = Array.isArray(baselineLocal) ? baselineLocal.filter(Boolean) : [];

  const nearBoundaryPlaces = safeLocal.filter(
    (p) =>
      typeof p.distance_m === 'number' &&
      p.distance_m <= 360 &&
      !safe300m.some((b) => b && b.place_id === p.place_id)
  );
  const candidateBaselinePool = [...safe300m, ...nearBoundaryPlaces];

  for (const obs of observedEntities) {
    if (!obs) continue;
    let bestMatch: NormalizedBaselinePlace | null = null;
    let bestSim = 0;

    for (const basePlace of candidateBaselinePool) {
      if (!basePlace || !basePlace.place_id) continue;
      if (matchedBaselineIds.has(basePlace.place_id)) continue;
      const sim = computeEntityNameSimilarity(
        obs.normalized_name,
        basePlace.business_name || ''
      );
      if (sim >= 0.74 && sim > bestSim) {
        bestSim = sim;
        bestMatch = basePlace;
      }
    }

    if (bestMatch) {
      matchedBaselineIds.add(bestMatch.place_id);
      matchedCount += 1;
      const framesLabel = obs.frame_indices && obs.frame_indices.length > 0
        ? `frames #${obs.frame_indices.join(', #')}`
        : 'keyframe observations';

      ledger.push({
        fusion_id: `fusion-matched-${bestMatch.place_id}`,
        name: bestMatch.business_name || obs.display_name,
        reconciliation_status: 'MATCHED',
        evidence_type: 'INFERRED',
        sources: [bestMatch.source || 'Database', 'Street Scan'],
        confidence: Number(
          Math.min(0.99, ((obs.confidence || 0.8) + 0.9) / 2).toFixed(2)
        ),
        distance_m: typeof bestMatch.distance_m === 'number' ? bestMatch.distance_m : undefined,
        spatial_band: '0-300m',
        explanation: `Cross-source match (${Math.round(
          bestSim * 100
        )}% text similarity): Listed in ${
          bestMatch.source || 'Database'
        } (${bestMatch.distance_m ?? 120}m) and OCR-confirmed in Street Scan ${framesLabel}.`,
        observed_detail: obs,
        baseline_detail: bestMatch,
      });
    } else {
      additionalSignalsCount += 1;
      const framesLabel = obs.frame_indices && obs.frame_indices.length > 0
        ? `frames #${obs.frame_indices.join(', #')}`
        : 'observations';

      ledger.push({
        fusion_id: `fusion-additional-${obs.entity_id}`,
        name: obs.display_name,
        reconciliation_status: 'ADDITIONAL_SIGNAL',
        evidence_type: 'OBSERVED',
        sources: ['Street Scan'],
        confidence: obs.confidence || 0.75,
        spatial_band: '0-300m',
        explanation: `Additional observed commercial text signal across ${framesLabel} (${obs.first_seen_sec}s–${
          obs.last_seen_sec
        }s). Not matched to the 0–300m category baseline — may reflect a newly opened storefront, informal/unindexed business, adjacent category, or partial signage read.`,
        observed_detail: obs,
      });
    }
  }

  let baselineOnlyCount = 0;
  for (const basePlace of safe300m) {
    if (!basePlace || !basePlace.place_id) continue;
    if (matchedBaselineIds.has(basePlace.place_id)) continue;
    baselineOnlyCount += 1;
    const mediaNotice =
      mediaTypeNotice === 'photos'
        ? 'uploaded storefront photographs'
        : 'video clip';

    ledger.push({
      fusion_id: `fusion-baseline-${basePlace.place_id}`,
      name: basePlace.business_name || 'Unobserved Baseline Place',
      reconciliation_status: 'BASELINE_ONLY',
      evidence_type: 'DATABASE',
      sources: [basePlace.source || 'Database'],
      confidence: basePlace.confidence === 'HIGH' ? 0.92 : 0.82,
      distance_m: typeof basePlace.distance_m === 'number' ? basePlace.distance_m : undefined,
      spatial_band: '0-300m',
      explanation: `Indexed in ${basePlace.source || 'Database'} (${
        basePlace.distance_m ?? 150
      }m from pin). Not observed across the ${mediaNotice} — street scan only captures the physical perspectives photographed within the 0–300m corridor.`,
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

/**
 * Pure core fusion processor. Accepts the parsed request payload, validates fields safely,
 * and computes the complete StreetScanFusionResponse.
 */
export function handleStreetScanFusion(payload: unknown): StreetScanFusionResponse {
  if (!payload || typeof payload !== 'object') {
    const error: any = new Error('Invalid request payload: expected a JSON object.');
    error.statusCode = 400;
    throw error;
  }

  const body = payload as Partial<StreetScanFuseRequest>;

  const scanMode: StreetScanMode =
    body.scan_mode === 'CALIBRATED_DEMO'
      ? 'CALIBRATED_DEMO'
      : body.scan_mode === 'PHOTO_BATCH'
      ? 'PHOTO_BATCH'
      : body.input_mode === 'PHOTOS'
      ? 'PHOTO_BATCH'
      : 'LIVE_UPLOAD';

  const inputMode =
    body.input_mode || (scanMode === 'PHOTO_BATCH' ? 'PHOTOS' : 'VIDEO');

  // Sanitize frames array safely
  const rawFrames = Array.isArray(body.frames) ? body.frames : [];
  const frames: NormalizedFrameObservation[] = rawFrames
    .filter((f): f is NormalizedFrameObservation => Boolean(f && typeof f === 'object'))
    .map((f, idx) => ({
      frame_index: typeof f.frame_index === 'number' ? f.frame_index : idx + 1,
      timestamp_sec:
        typeof f.timestamp_sec === 'number' && Number.isFinite(f.timestamp_sec)
          ? f.timestamp_sec
          : idx * 3.5,
      sharpness_score:
        typeof f.sharpness_score === 'number' && Number.isFinite(f.sharpness_score)
          ? f.sharpness_score
          : 50,
      ocr_sampled: Boolean(f.ocr_sampled),
      objects: Array.isArray(f.objects)
        ? f.objects
            .filter((o) => o && typeof o === 'object')
            .map((o) => ({
              class_name: typeof o.class_name === 'string' ? o.class_name : '',
              confidence:
                typeof o.confidence === 'number' && Number.isFinite(o.confidence)
                  ? o.confidence
                  : 0.6,
              bbox:
                Array.isArray(o.bbox) && o.bbox.length === 4
                  ? [o.bbox[0], o.bbox[1], o.bbox[2], o.bbox[3]]
                  : [0, 0, 0, 0],
            }))
        : [],
      ocr_reads: Array.isArray(f.ocr_reads)
        ? f.ocr_reads
            .filter((r) => r && typeof r === 'object')
            .map((r) => {
              const raw = typeof r.raw_text === 'string' ? r.raw_text : String(r.raw_text || '');
              const norm = typeof r.normalized_text === 'string' ? r.normalized_text : normalizeOcrText(raw);
              const conf = typeof r.confidence === 'number' && Number.isFinite(r.confidence) ? r.confidence : 0;
              return {
                raw_text: raw,
                normalized_text: norm,
                confidence: conf,
                bbox: Array.isArray(r.bbox) && r.bbox.length === 4 ? r.bbox : undefined,
              };
            })
        : [],
    }));

  // Sanitize baseline records
  const raw300m = Array.isArray(body.baseline_places_300m)
    ? body.baseline_places_300m
    : [];
  const baseline300m: NormalizedBaselinePlace[] = raw300m
    .filter((p): p is NormalizedBaselinePlace => Boolean(p && typeof p === 'object'))
    .map((p, idx) => ({
      place_id: typeof p.place_id === 'string' ? p.place_id : `base-300m-${idx}`,
      business_name: typeof p.business_name === 'string' ? p.business_name : 'Commercial Storefront',
      category: typeof p.category === 'string' ? p.category : 'Storefront',
      latitude: typeof p.latitude === 'number' ? p.latitude : 17.4485,
      longitude: typeof p.longitude === 'number' ? p.longitude : 78.3748,
      source: typeof p.source === 'string' ? p.source : 'Google Places',
      confidence: p.confidence === 'HIGH' || p.confidence === 'MEDIUM' ? p.confidence : 'HIGH',
      distance_m: typeof p.distance_m === 'number' && Number.isFinite(p.distance_m) ? p.distance_m : 150,
      spatial_band: '0-300m',
      evidence_type: 'DATABASE',
      vicinity: typeof p.vicinity === 'string' ? p.vicinity : undefined,
      rating: typeof p.rating === 'number' ? p.rating : undefined,
      user_ratings_total: typeof p.user_ratings_total === 'number' ? p.user_ratings_total : undefined,
    }));

  const rawLocal = Array.isArray(body.baseline_places_local)
    ? body.baseline_places_local
    : [];
  const baselineLocal: NormalizedBaselinePlace[] = rawLocal
    .filter((p): p is NormalizedBaselinePlace => Boolean(p && typeof p === 'object'))
    .map((p, idx) => ({
      place_id: typeof p.place_id === 'string' ? p.place_id : `base-local-${idx}`,
      business_name: typeof p.business_name === 'string' ? p.business_name : 'Commercial Storefront',
      category: typeof p.category === 'string' ? p.category : 'Storefront',
      latitude: typeof p.latitude === 'number' ? p.latitude : 17.4485,
      longitude: typeof p.longitude === 'number' ? p.longitude : 78.3748,
      source: typeof p.source === 'string' ? p.source : 'Google Places',
      confidence: p.confidence === 'HIGH' || p.confidence === 'MEDIUM' ? p.confidence : 'MEDIUM',
      distance_m: typeof p.distance_m === 'number' && Number.isFinite(p.distance_m) ? p.distance_m : 500,
      spatial_band: (p.spatial_band as any) || '300m-2km',
      evidence_type: 'DATABASE',
      vicinity: typeof p.vicinity === 'string' ? p.vicinity : undefined,
      rating: typeof p.rating === 'number' ? p.rating : undefined,
      user_ratings_total: typeof p.user_ratings_total === 'number' ? p.user_ratings_total : undefined,
    }));

  const deduplicatedEntities = deduplicateOcrObservations(frames, scanMode);
  const activitySummary = aggregateCocoActivity(frames);
  const mediaTypeNotice = inputMode === 'PHOTOS' ? 'photos' : 'video';
  const {
    matchedCount,
    additionalSignalsCount,
    baselineOnlyCount,
    ledger,
  } = reconcileBaselineVsObserved(
    baseline300m,
    baselineLocal,
    deduplicatedEntities,
    mediaTypeNotice
  );

  const distinctContextClasses = activitySummary.class_breakdown.filter(
    (c) => c.category_group === 'STREET_CONTEXT'
  ).length;
  const observedCommercialSignals =
    deduplicatedEntities.length + distinctContextClasses;

  const honestyNotice =
    scanMode === 'CALIBRATED_DEMO'
      ? 'CALIBRATED DEMO MODE: Using deterministic sample street-scan telemetry anchored to your 0–300m baseline. Upload storefront photos or an MP4/MOV street clip to run live browser COCO object detection and keyframe OCR.'
      : scanMode === 'PHOTO_BATCH' || inputMode === 'PHOTOS'
      ? `GROUND REALITY SCOPE (0–300m): Street Scan reflects only the storefronts and physical storefront perspectives captured across the ${frames.length} uploaded photographs, not the entire 2–5km wider market.`
      : 'GROUND REALITY SCOPE (0–300m): Street Scan reflects only the physical street segment captured in the uploaded video, not the entire 2–5km wider market.';

  const videoMeta = body.video_metadata || ({} as any);
  const durationSec = Number(
    (
      typeof videoMeta.duration_sec === 'number' && Number.isFinite(videoMeta.duration_sec)
        ? videoMeta.duration_sec
        : frames.length * 3.5 || 0
    ).toFixed(1)
  );

  const framesExtracted =
    typeof videoMeta.frames_extracted === 'number' && videoMeta.frames_extracted > 0
      ? videoMeta.frames_extracted
      : frames.length;

  const ocrKeyframesCount =
    typeof videoMeta.ocr_keyframes_count === 'number'
      ? videoMeta.ocr_keyframes_count
      : frames.filter((f) => f.ocr_sampled).length;

  const defaultFilename =
    scanMode === 'PHOTO_BATCH' || inputMode === 'PHOTOS'
      ? `${frames.length} storefront photos`
      : 'street-scan.mp4';

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
      filename: videoMeta.filename || defaultFilename,
      duration_sec: durationSec,
      frames_extracted: framesExtracted,
      ocr_keyframes_count: ocrKeyframesCount,
      sampled_fps: typeof videoMeta.sampled_fps === 'number' ? videoMeta.sampled_fps : 1,
    },
    activity_summary: activitySummary,
    counts: {
      mapped_baseline_300m: baseline300m.length,
      observed_entities: deduplicatedEntities.length,
      observed_commercial_signals: observedCommercialSignals,
      ocr_confirmed_names: deduplicatedEntities.filter((e) => e.ocr_confirmed).length,
      matched_entities: matchedCount,
      additional_signals: additionalSignalsCount,
      baseline_only_unobserved: baselineOnlyCount,
    },
    deduplicated_entities: deduplicatedEntities,
    reconciled_ledger: ledger,
    processed_at: new Date().toISOString(),
  };

  return response;
}

function sendJson(res: NodeHttpResponse, status: number, payload: unknown): void {
  try {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify(payload));
  } catch (err: any) {
    console.error('[StreetScan sendJson Error]:', err?.message || err);
  }
}

async function readJsonBody(req: NodeHttpRequest): Promise<Record<string, unknown>> {
  const reqAny = req as any;
  if (reqAny.body) {
    if (typeof reqAny.body === 'object' && reqAny.body !== null) {
      return reqAny.body as Record<string, unknown>;
    }
    if (typeof reqAny.body === 'string') {
      try {
        return JSON.parse(reqAny.body) as Record<string, unknown>;
      } catch (err: any) {
        const error: any = new Error('Malformed JSON request body: ' + err.message);
        error.statusCode = 400;
        throw error;
      }
    }
  }

  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk: unknown) => {
      raw += String(chunk);
      if (raw.length > 10_000_000) {
        reject(new Error('Payload too large (exceeds 10MB limit)'));
      }
    });
    req.on('end', () => {
      if (!raw.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw) as Record<string, unknown>);
      } catch (err: any) {
        const error: any = new Error('Malformed JSON request body: ' + err.message);
        error.statusCode = 400;
        reject(error);
      }
    });
    req.on('error', () => {
      reject(new Error('Request stream error'));
    });
  });
}

/**
 * Express/Connect middleware for local Vite development server.
 */
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
      const body = await readJsonBody(req);
      const result = handleStreetScanFusion(body);
      console.log(
        `[StreetScan Fusion 200] Mode: ${result.scan_mode}, Frames: ${result.video_summary.frames_extracted}, Observed Entities: ${result.deduplicated_entities.length}`
      );
      sendJson(res, 200, result);
    } catch (err: any) {
      console.error('[StreetScan Middleware Error]:', err?.message || err);
      const statusCode = typeof err?.statusCode === 'number' ? err.statusCode : 400;
      sendJson(res, statusCode, {
        error: err?.message || 'Failed to fuse street scan observations',
        statusCode,
      });
    }
  };
}
