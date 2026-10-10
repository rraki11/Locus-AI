import {
  BusinessProfileConfig,
  CategoricalLevel,
  MarketBaselineResponse,
  NormalizedBaselinePlace,
} from '../data/marketDiscoveryData';

export type EvidenceType =
  | 'OBSERVED'
  | 'DATABASE'
  | 'INFERRED'
  | 'PREDICTED_ANALYTICAL';

export type StreetScanMode = 'LIVE_UPLOAD' | 'CALIBRATED_DEMO' | 'PHOTO_BATCH';

export type StreetScanInputMode = 'VIDEO' | 'PHOTOS';

export interface StreetScanPhotoItem {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
  sizeBytes: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'ERROR';
  error?: string;
  width?: number;
  height?: number;
  ocrReadsCount?: number;
  cocoObjectsCount?: number;
  cropPreviewUrl?: string;
  rawOcrText?: string;
  normalizedOcrText?: string;
  ocrConfidence?: number;
  preprocessingVariant?: string;
  detectedLanguage?: string;
  isUserConfirmed?: boolean;
}

export type StreetScanPipelineStage =
  | 'IDLE'
  | 'UPLOADING'
  | 'EXTRACTING_FRAMES'
  | 'DETECTING_OBJECTS'
  | 'READING_SIGNS'
  | 'DEDUPLICATING'
  | 'FUSING_EVIDENCE'
  | 'COMPLETE'
  | 'ERROR';

export type CocoDetectableClass =
  | 'person'
  | 'car'
  | 'motorcycle'
  | 'bicycle'
  | 'bus'
  | 'truck'
  | 'chair'
  | 'bench'
  | 'dining table'
  | 'umbrella'
  | 'potted plant'
  | 'backpack'
  | 'handbag'
  | 'bottle'
  | 'cup';

export interface RawCocoObjectDetection {
  class_name: CocoDetectableClass | string;
  confidence: number;
  /** Normalized [x, y, width, height] in 0..1 coordinates */
  bbox: [number, number, number, number];
}

export interface RawFrameOcrRead {
  raw_text: string;
  normalized_text: string;
  confidence: number; // 0..1
  /** Normalized [x, y, width, height] in 0..1 coordinates */
  bbox?: [number, number, number, number];
}

/**
 * Lightweight normalized observation per sampled frame sent to /api/street-scan/fuse.
 * Raw image/canvas pixel buffers are never sent over the network.
 */
export interface NormalizedFrameObservation {
  frame_index: number;
  timestamp_sec: number;
  sharpness_score: number;
  ocr_sampled: boolean;
  objects: RawCocoObjectDetection[];
  ocr_reads: RawFrameOcrRead[];
}

/**
 * Temporally deduplicated OCR storefront/signboard entity observed in the street scan.
 */
export interface DeduplicatedObservedEntity {
  entity_id: string;
  display_name: string;
  normalized_name: string;
  source: 'Street Scan';
  detector_label: 'Tesseract OCR + COCO Context' | 'Calibrated Demo Signboard';
  evidence_type: 'OBSERVED';
  confidence: number; // 0..1
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
  evidence_type: EvidenceType; // 'OBSERVED' | 'DATABASE' | 'INFERRED'
  sources: string[];
  confidence: number; // 0..1
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
  input_mode?: StreetScanInputMode;
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
  input_mode?: StreetScanInputMode;
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

/**
 * Context handed off from View 1 (Page 3: Market Discovery) into View 2 (Street Scan + Ground Truth Fusion)
 */
export interface GroundRealityHandoffPayload {
  profile: BusinessProfileConfig;
  state: string;
  city: string;
  localArea: string;
  candidateName: string;
  coordinates: { lat: number; lng: number };
  marketBaseline: MarketBaselineResponse | null;
}
