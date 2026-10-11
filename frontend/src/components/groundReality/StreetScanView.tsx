import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Crop,
  Edit2,
  FileImage,
  FileVideo,
  Globe,
  Image as ImageIcon,
  Layers,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { WorkspaceSplineAmbient } from '../discovery/WorkspaceSplineAmbient';
import {
  WorkspaceStageHero,
  WorkspaceStageNav,
  WorkspaceViewKey,
} from '../common/WorkspaceStageNav';
import {
  DeduplicatedObservedEntity,
  EvidenceType,
  GroundRealityHandoffPayload,
  ReconciledFusionItem,
  ReconciliationStatus,
  StreetScanFusionResponse,
  StreetScanInputMode,
  StreetScanPhotoItem,
  StreetScanPipelineStage,
} from '../../types/streetScan';
import {
  normalizeOcrLineClient,
  prewarmStreetScanModels,
  runCalibratedDemoStreetScan,
  runLiveVideoStreetScan,
  runPhotoBatchStreetScan,
  SampledFramePreview,
  SUPPORTED_OCR_LANGUAGES,
} from '../../utils/streetScanPipeline';
import {
  DEMO_LOCATION_PRESETS,
  parseAndValidateCoordinates,
} from '../../data/marketDiscoveryData';
import {
  detectScripts,
} from '../../utils/signboardOcrEngine';
import { SignboardCropModal } from './SignboardCropModal';

export interface StreetScanViewProps {
  handoff: GroundRealityHandoffPayload;
  preferFallback?: boolean;
  onBackToMarketDiscovery: () => void;
  onBackToHome?: () => void;
  onContinueToIntelligence?: (
    fusionResult: StreetScanFusionResponse | null
  ) => void;
  unlockedViews?: Set<WorkspaceViewKey>;
  onNavigateToView?: (targetView: WorkspaceViewKey) => void;
}

const STAGE_ORDER: Record<StreetScanPipelineStage, number> = {
  IDLE: 0,
  UPLOADING: 1,
  EXTRACTING_FRAMES: 2,
  DETECTING_OBJECTS: 3,
  READING_SIGNS: 4,
  DEDUPLICATING: 5,
  FUSING_EVIDENCE: 6,
  COMPLETE: 7,
  ERROR: -1,
};

const EVIDENCE_BADGE_STYLE: Record<
  EvidenceType,
  { bg: string; dot: string; label: string }
> = {
  OBSERVED: {
    bg: 'border-emerald-400/45 bg-emerald-500/15 text-emerald-200',
    dot: 'bg-emerald-400',
    label: 'OBSERVED',
  },
  DATABASE: {
    bg: 'border-[#818CF8]/45 bg-[#4F46E5]/20 text-[#C7D2FE]',
    dot: 'bg-[#818CF8]',
    label: 'DATABASE',
  },
  INFERRED: {
    bg: 'border-[#FB923C]/50 bg-[#F97316]/20 text-[#FED7AA]',
    dot: 'bg-[#FB923C]',
    label: 'INFERRED',
  },
  PREDICTED_ANALYTICAL: {
    bg: 'border-[#E879F9]/45 bg-[#A855F7]/20 text-[#F5D0FE]',
    dot: 'bg-[#E879F9]',
    label: 'PREDICTED_ANALYTICAL',
  },
};

type LedgerFilter = 'ALL' | ReconciliationStatus | EvidenceType;

export const StreetScanView: React.FC<StreetScanViewProps> = ({
  handoff,
  preferFallback = false,
  onBackToMarketDiscovery,
  onBackToHome,
  onContinueToIntelligence,
  unlockedViews,
  onNavigateToView,
}) => {
  const videoFileInputRef = useRef<HTMLInputElement>(null);
  const photoFileInputRef = useRef<HTMLInputElement>(null);

  // Input Mode: default to multi-photo batch, user can toggle to video
  const [inputMode, setInputMode] = useState<StreetScanInputMode>('PHOTOS');

  // Photo batch state (5-15 images)
  const [photoQueue, setPhotoQueue] = useState<StreetScanPhotoItem[]>([]);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number>(0);

  // Multilingual OCR configuration (English + Telugu default)
  const [selectedLangCode, setSelectedLangCode] = useState<string>('eng+tel');

  // Pipeline execution & diagnostics state
  const [pipelineStage, setPipelineStage] =
    useState<StreetScanPipelineStage>('IDLE');
  const [statusMessage, setStatusMessage] = useState<string>(
    'Upload 5–15 storefront photos (JPG, PNG, WebP) or switch to street video.'
  );
  const [progressPct, setProgressPct] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [ocrLangWarning, setOcrLangWarning] = useState<string | null>(null);

  // Video state
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
  const [uploadedFilename, setUploadedFilename] = useState<string | null>(null);

  // Fusion and previews
  const [fusionResult, setFusionResult] =
    useState<StreetScanFusionResponse | null>(null);
  const [framePreviews, setFramePreviews] = useState<SampledFramePreview[]>([]);
  const [selectedFrameIndex, setSelectedFrameIndex] = useState<number>(1);
  const [ledgerFilter, setLedgerFilter] = useState<LedgerFilter>('ALL');

  // Manual inline correction of deduplicated storefronts
  const [editingEntityId, setEditingEntityId] = useState<string | null>(null);
  const [editingEntityName, setEditingEntityName] = useState<string>('');

  // Interactive Signboard Crop Modal state
  const [isCropModalOpen, setIsCropModalOpen] = useState<boolean>(false);
  const [cropTarget, setCropTarget] = useState<{
    file: File | null;
    url: string | null;
    name: string;
    photoIndex?: number;
    photoId?: string;
  } | null>(null);

  const scanInProgressRef = useRef(false);

  // Keep ref to photoQueue for cleanup on unmount
  const photoQueueRef = useRef(photoQueue);
  photoQueueRef.current = photoQueue;

  useEffect(() => {
    return () => {
      photoQueueRef.current.forEach((item) => {
        try {
          URL.revokeObjectURL(item.previewUrl);
        } catch {}
      });
    };
  }, []);

  const handleStageNav = useCallback(
    (target: WorkspaceViewKey) => {
      if (target === 'view1') {
        onBackToMarketDiscovery();
      } else if (target === 'view3') {
        onContinueToIntelligence?.(fusionResult);
      } else if (onNavigateToView) {
        onNavigateToView(target);
      }
    },
    [
      onBackToMarketDiscovery,
      onContinueToIntelligence,
      fusionResult,
      onNavigateToView,
    ]
  );

  // Prewarm COCO-SSD model asynchronously when entering View 2
  useEffect(() => {
    prewarmStreetScanModels();
  }, []);

  useEffect(() => {
    return () => {
      if (uploadedVideoUrl) {
        URL.revokeObjectURL(uploadedVideoUrl);
      }
    };
  }, [uploadedVideoUrl]);

  const lastScannedCoordRef = useRef<{ lat: number; lng: number } | null>(null);

  // If the user returns to View 1 and selects a different candidate location (>50m away),
  // clear any Street Scan from the previous corridor so observations are never misattributed.
  useEffect(() => {
    const prev = lastScannedCoordRef.current;
    const lat = handoff?.coordinates?.lat;
    const lng = handoff?.coordinates?.lng;
    if (
      prev &&
      typeof lat === 'number' &&
      typeof lng === 'number' &&
      (Math.abs(prev.lat - lat) > 0.0005 ||
        Math.abs(prev.lng - lng) > 0.0005)
    ) {
      setFusionResult(null);
      setFramePreviews([]);
      setPipelineStage('IDLE');
      setErrorMessage(null);
      setOcrLangWarning(null);
      setStatusMessage(
        'Candidate location changed. Upload 5–15 storefront photos or run the calibrated demo scan.'
      );
      lastScannedCoordRef.current = null;
    }
  }, [handoff?.coordinates?.lat, handoff?.coordinates?.lng]);

  const baseline300m = useMemo(
    () => handoff?.marketBaseline?.bands?.['0-300m']?.places ?? [],
    [handoff?.marketBaseline]
  );

  const baselineLocal = useMemo(
    () => handoff?.marketBaseline?.bands?.['300m-2km']?.places ?? [],
    [handoff?.marketBaseline]
  );

  const safeCoords = useMemo(() => {
    return parseAndValidateCoordinates(handoff?.coordinates);
  }, [handoff?.coordinates]);

  const candidateMeta = useMemo(() => {
    const coords = safeCoords ?? {
      lat: DEMO_LOCATION_PRESETS[0].lat,
      lng: DEMO_LOCATION_PRESETS[0].lng,
    };
    return {
      latitude: coords.lat,
      longitude: coords.lng,
      state: handoff?.state || DEMO_LOCATION_PRESETS[0].state,
      city: handoff?.city || DEMO_LOCATION_PRESETS[0].city,
      local_area: handoff?.localArea || DEMO_LOCATION_PRESETS[0].localArea,
      label: handoff?.candidateName || DEMO_LOCATION_PRESETS[0].candidateName,
    };
  }, [handoff, safeCoords]);

  // Handle Photo selection and validation
  const handleAddPhotos = useCallback(
    (filesList: FileList | File[]) => {
      setErrorMessage(null);
      const incoming = Array.from(filesList);
      if (incoming.length === 0) return;

      const validMimes = new Set(['image/jpeg', 'image/png', 'image/webp']);
      const validExts = new Set(['jpg', 'jpeg', 'png', 'webp']);

      const validNewPhotos: StreetScanPhotoItem[] = [];
      const errorNotes: string[] = [];

      for (const file of incoming) {
        const ext = file.name.toLowerCase().split('.').pop() || '';
        const isValidMime = validMimes.has(file.type);
        const isValidExt = validExts.has(ext);

        if (!isValidMime && !isValidExt) {
          errorNotes.push(`"${file.name}" skipped: unsupported format (use JPG, PNG, or WebP).`);
          continue;
        }

        if (file.size > 25 * 1024 * 1024) {
          errorNotes.push(`"${file.name}" skipped: file size exceeds 25MB limit.`);
          continue;
        }

        validNewPhotos.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          file,
          previewUrl: URL.createObjectURL(file),
          name: file.name,
          sizeBytes: file.size,
          status: 'PENDING',
        });
      }

      setPhotoQueue((prev) => {
        const combined = [...prev, ...validNewPhotos];
        if (combined.length > 15) {
          // Limit to max 15
          const excess = combined.slice(15);
          excess.forEach((item) => {
            try {
              URL.revokeObjectURL(item.previewUrl);
            } catch {}
          });
          const trimmed = combined.slice(0, 15);
          setErrorMessage(
            `A maximum of 15 photos is supported for 0–300m corridor scanning. Retained the first 15 photos.`
          );
          return trimmed;
        }
        return combined;
      });

      if (errorNotes.length > 0 && !errorMessage) {
        setErrorMessage(errorNotes[0]);
      }
    },
    [errorMessage]
  );

  const handleRemovePhoto = useCallback((photoId: string) => {
    setPhotoQueue((prev) => {
      const target = prev.find((p) => p.id === photoId);
      if (target) {
        try {
          URL.revokeObjectURL(target.previewUrl);
        } catch {}
      }
      return prev.filter((p) => p.id !== photoId);
    });
    setErrorMessage(null);
  }, []);

  const handleClearAllPhotos = useCallback(() => {
    setPhotoQueue((prev) => {
      prev.forEach((p) => {
        try {
          URL.revokeObjectURL(p.previewUrl);
        } catch {}
      });
      return [];
    });
    setErrorMessage(null);
    setSelectedPhotoIndex(0);
  }, []);

  // Execute Photo Batch Pipeline
  const handleRunPhotoBatch = useCallback(async () => {
    if (scanInProgressRef.current) {
      console.warn('[StreetScan] Scan already in progress; ignoring duplicate trigger.');
      return;
    }

    if (photoQueue.length < 5) {
      setErrorMessage(
        `Multi-image Ground Reality requires 5–15 storefront photos (currently ${photoQueue.length} selected). Please add ${
          5 - photoQueue.length
        } more photo(s).`
      );
      return;
    }

    if (photoQueue.length > 15) {
      setErrorMessage(
        `Corridor scan accepts at most 15 photos (currently ${photoQueue.length} selected). Please remove ${
          photoQueue.length - 15
        } photo(s).`
      );
      return;
    }

    scanInProgressRef.current = true;
    setErrorMessage(null);
    setOcrLangWarning(null);
    setFusionResult(null);
    setFramePreviews([]);

    // Set all photos to processing
    setPhotoQueue((prev) =>
      prev.map((p) => ({ ...p, status: 'PROCESSING', error: undefined }))
    );

    try {
      const files = photoQueue.map((p) => p.file);
      const { fusionResponse, framePreviews: nextFrames } =
        await runPhotoBatchStreetScan({
          files,
          candidate: candidateMeta,
          businessType: handoff?.profile?.businessType || 'Café',
          baselinePlaces300m: baseline300m,
          baselinePlacesLocal: baselineLocal,
          selectedLangCode,
          onProgress: (upd) => {
            setPipelineStage(upd.stage);
            setStatusMessage(upd.statusText);
            setProgressPct(upd.progressPct);
            if (upd.ocrLangWarning) {
              setOcrLangWarning(upd.ocrLangWarning);
            }
          },
          onPhotoProcessed: (photoIdx, _total, stats) => {
            setPhotoQueue((prev) =>
              prev.map((item, idx) =>
                idx === photoIdx - 1
                  ? {
                      ...item,
                      status: 'COMPLETED',
                      cocoObjectsCount: stats.objects,
                      ocrReadsCount: stats.reads,
                    }
                  : item
              )
            );
          },
        });

      lastScannedCoordRef.current = {
        lat: candidateMeta.latitude,
        lng: candidateMeta.longitude,
      };
      setFusionResult(fusionResponse);
      setFramePreviews(nextFrames);
      const firstOcrFrame = nextFrames.find((f) => f.ocr_sampled);
      setSelectedFrameIndex(firstOcrFrame?.frame_index ?? 1);
      setSelectedPhotoIndex(0);
    } catch (err: any) {
      setPipelineStage('ERROR');
      setErrorMessage(
        err?.message ||
          'Could not complete photo batch scan. Please ensure photos are valid JPG/PNG/WebP storefront views.'
      );
      setPhotoQueue((prev) =>
        prev.map((p) =>
          p.status === 'PROCESSING' ? { ...p, status: 'ERROR' } : p
        )
      );
    } finally {
      scanInProgressRef.current = false;
    }
  }, [
    photoQueue,
    candidateMeta,
    handoff?.profile?.businessType,
    baseline300m,
    baselineLocal,
    selectedLangCode,
  ]);

  // Execute Live Video Pipeline
  const handleVideoFileSelected = useCallback(
    async (file: File) => {
      if (scanInProgressRef.current) {
        console.warn('[StreetScan] Scan already in progress; ignoring duplicate trigger.');
        return;
      }
      scanInProgressRef.current = true;

      setErrorMessage(null);
      setOcrLangWarning(null);
      setFusionResult(null);
      setFramePreviews([]);
      if (uploadedVideoUrl) {
        URL.revokeObjectURL(uploadedVideoUrl);
      }

      const nextUrl = URL.createObjectURL(file);
      setUploadedVideoUrl(nextUrl);
      setUploadedFilename(file.name);

      try {
        const { fusionResponse, framePreviews: nextFrames } =
          await runLiveVideoStreetScan({
            file,
            candidate: candidateMeta,
            businessType: handoff?.profile?.businessType || 'Café',
            baselinePlaces300m: baseline300m,
            baselinePlacesLocal: baselineLocal,
            selectedLangCode,
            onProgress: (upd) => {
              setPipelineStage(upd.stage);
              setStatusMessage(upd.statusText);
              setProgressPct(upd.progressPct);
              if (upd.ocrLangWarning) {
                setOcrLangWarning(upd.ocrLangWarning);
              }
            },
          });

        lastScannedCoordRef.current = {
          lat: candidateMeta.latitude,
          lng: candidateMeta.longitude,
        };
        setFusionResult(fusionResponse);
        setFramePreviews(nextFrames);
        const firstOcrFrame = nextFrames.find((f) => f.ocr_sampled);
        setSelectedFrameIndex(firstOcrFrame?.frame_index ?? 1);
      } catch (err: any) {
        setPipelineStage('ERROR');
        setErrorMessage(
          err?.message ||
            'Could not process video file. You can retry with another MP4/MOV or run the explicitly labeled Calibrated Demo Scan.'
        );
      } finally {
        scanInProgressRef.current = false;
      }
    },
    [
      uploadedVideoUrl,
      candidateMeta,
      handoff?.profile?.businessType,
      baseline300m,
      baselineLocal,
      selectedLangCode,
    ]
  );

  // Execute Calibrated Demo Mode
  const handleRunCalibratedDemo = useCallback(async () => {
    if (scanInProgressRef.current) return;
    scanInProgressRef.current = true;

    setErrorMessage(null);
    setOcrLangWarning(null);
    if (uploadedVideoUrl) {
      URL.revokeObjectURL(uploadedVideoUrl);
      setUploadedVideoUrl(null);
    }
    setUploadedFilename(null);

    try {
      const { fusionResponse, framePreviews: nextFrames } =
        await runCalibratedDemoStreetScan({
          candidate: candidateMeta,
          businessType: handoff?.profile?.businessType || 'Café',
          baselinePlaces300m: baseline300m,
          baselinePlacesLocal: baselineLocal,
          onProgress: (upd) => {
            setPipelineStage(upd.stage);
            setStatusMessage(upd.statusText);
            setProgressPct(upd.progressPct);
          },
        });

      lastScannedCoordRef.current = {
        lat: candidateMeta.latitude,
        lng: candidateMeta.longitude,
      };
      setFusionResult(fusionResponse);
      setFramePreviews(nextFrames);
      const firstOcrFrame = nextFrames.find((f) => f.ocr_sampled);
      setSelectedFrameIndex(firstOcrFrame?.frame_index ?? 1);
    } catch (err: any) {
      setPipelineStage('ERROR');
      setErrorMessage(
        err?.message || 'Failed to run calibrated demo street scan.'
      );
    } finally {
      scanInProgressRef.current = false;
    }
  }, [
    uploadedVideoUrl,
    candidateMeta,
    handoff?.profile?.businessType,
    baseline300m,
    baselineLocal,
  ]);

  // Inline correction handlers for deduplicated storefronts
  const handleStartEdit = useCallback((entityId: string, currentName: string) => {
    setEditingEntityId(entityId);
    setEditingEntityName(currentName);
  }, []);

  const handleSaveEdit = useCallback(
    (entityId: string) => {
      const trimmed = editingEntityName.trim();
      if (!trimmed || !fusionResult) {
        setEditingEntityId(null);
        return;
      }

      setFusionResult((prev) => {
        if (!prev) return null;
        const normalized = normalizeOcrLineClient(trimmed);

        const nextDeduplicated = prev.deduplicated_entities.map((e) =>
          e.entity_id === entityId
            ? {
                ...e,
                display_name: trimmed,
                normalized_name: normalized,
                user_edited: true,
              }
            : e
        );

        const nextLedger = prev.reconciled_ledger.map((item) => {
          if (
            item.observed_detail?.entity_id === entityId ||
            item.name.toLowerCase() ===
              prev.deduplicated_entities
                .find((e) => e.entity_id === entityId)
                ?.display_name.toLowerCase()
          ) {
            return {
              ...item,
              name: trimmed,
              observed_detail: item.observed_detail
                ? {
                    ...item.observed_detail,
                    display_name: trimmed,
                    normalized_name: normalized,
                    user_edited: true,
                  }
                : undefined,
            };
          }
          return item;
        });

        return {
          ...prev,
          deduplicated_entities: nextDeduplicated,
          reconciled_ledger: nextLedger,
        };
      });

      setEditingEntityId(null);
    },
    [editingEntityName, fusionResult]
  );

  const handleCancelEdit = useCallback(() => {
    setEditingEntityId(null);
    setEditingEntityName('');
  }, []);

  const activeFramePreview = useMemo(
    () =>
      framePreviews.find((f) => f.frame_index === selectedFrameIndex) ||
      framePreviews[0] ||
      null,
    [framePreviews, selectedFrameIndex]
  );

  const handleOpenCropModal = useCallback(
    (photoIdx?: number) => {
      const idx = photoIdx !== undefined ? photoIdx : selectedPhotoIndex;
      if (inputMode === 'PHOTOS' && photoQueue.length > 0 && photoQueue[idx]) {
        const item = photoQueue[idx];
        setCropTarget({
          file: item.file,
          url: item.previewUrl,
          name: item.name,
          photoIndex: idx,
          photoId: item.id,
        });
        setIsCropModalOpen(true);
      } else if (activeFramePreview) {
        setCropTarget({
          file: null,
          url:
            activeFramePreview.original_data_url ||
            activeFramePreview.preview_data_url,
          name: `Observation #${activeFramePreview.frame_index}`,
          photoIndex: activeFramePreview.frame_index - 1,
        });
        setIsCropModalOpen(true);
      } else if (photoQueue.length > 0) {
        const item = photoQueue[0];
        setCropTarget({
          file: item.file,
          url: item.previewUrl,
          name: item.name,
          photoIndex: 0,
          photoId: item.id,
        });
        setIsCropModalOpen(true);
      }
    },
    [inputMode, photoQueue, selectedPhotoIndex, activeFramePreview]
  );

  const handleApplyManualCropResult = useCallback(
    (result: {
      rawText: string;
      normalizedName: string;
      confidence: number;
      language: string;
      variantUsed: string;
      cropDataUrl: string;
    }) => {
      const targetPhotoId = cropTarget?.photoId;
      const targetPhotoIdx = cropTarget?.photoIndex ?? selectedPhotoIndex;

      // 1. Update photoQueue item if available
      if (targetPhotoId) {
        setPhotoQueue((prev) =>
          prev.map((p) =>
            p.id === targetPhotoId
              ? {
                  ...p,
                  rawOcrText: result.rawText,
                  normalizedOcrText: result.normalizedName,
                  ocrConfidence: result.confidence,
                  cropPreviewUrl: result.cropDataUrl,
                  preprocessingVariant: result.variantUsed,
                  detectedLanguage: result.language,
                  isUserConfirmed: true,
                  ocrReadsCount: Math.max(p.ocrReadsCount || 0, 1),
                  status: 'COMPLETED',
                }
              : p
          )
        );
      }

      // 2. Update or insert into fusionResult
      setFusionResult((prev) => {
        const displayName =
          result.normalizedName || result.rawText || 'Confirmed Signboard';
        const normalizedName =
          result.normalizedName || normalizeOcrLineClient(displayName);
        const scriptInfo = detectScripts(result.rawText);
        const scriptDetected = scriptInfo.primaryScript;

        if (!prev) {
          const newEntity: DeduplicatedObservedEntity = {
            entity_id: `manual_${Date.now()}`,
            display_name: displayName,
            normalized_name: normalizedName,
            source: 'Street Scan',
            detector_label: 'Tesseract OCR + COCO Context',
            evidence_type: 'OBSERVED',
            confidence: result.confidence,
            ocr_confirmed: result.confidence > 0.25,
            frame_indices: [targetPhotoIdx + 1],
            first_seen_sec: targetPhotoIdx,
            last_seen_sec: targetPhotoIdx,
            raw_ocr_variants: [result.rawText],
            nearby_activity_context: `Signboard crop (${result.variantUsed}, ${result.language})`,
            user_edited: true,
            raw_text: result.rawText,
            script_detected: scriptDetected,
            preprocessing_note: result.variantUsed,
          };

          const newLedgerItem: ReconciledFusionItem = {
            fusion_id: `manual_ledger_${Date.now()}`,
            name: displayName,
            reconciliation_status: 'ADDITIONAL_SIGNAL',
            evidence_type: 'OBSERVED',
            sources: ['Manual Signboard Crop (Tesseract OCR)'],
            confidence: result.confidence,
            spatial_band: '0-300m',
            explanation:
              'Verified from full-resolution signboard crop.',
            observed_detail: newEntity,
          };

          return {
            scan_mode: 'PHOTO_BATCH',
            detector_engine: 'Manual Signboard Crop / Tesseract OCR',
            ocr_engine: `Tesseract.js (${result.language}) [PSM 6]`,
            spatial_scope: '0-300m',
            honesty_notice:
              'Storefront observation manually confirmed from high-resolution signboard crop.',
            video_summary: {
              filename: cropTarget?.name || 'signboard_crop.jpg',
              duration_sec: 0,
              frames_extracted: photoQueue.length || 1,
              ocr_keyframes_count: 1,
              sampled_fps: 1,
            },
            activity_summary: {
              total_object_detections: 0,
              frames_with_activity: 0,
              peak_pedestrians_in_frame: 0,
              total_vehicles_detected: 0,
              street_context_objects_detected: 0,
              activity_level: 'MEDIUM',
              class_breakdown: [],
            },
            counts: {
              mapped_baseline_300m: 0,
              observed_entities: 1,
              observed_commercial_signals: 1,
              ocr_confirmed_names: 1,
              matched_entities: 0,
              additional_signals: 1,
              baseline_only_unobserved: 0,
            },
            deduplicated_entities: [newEntity],
            reconciled_ledger: [newLedgerItem],
            processed_at: new Date().toISOString(),
          };
        }

        const existingIdx = prev.deduplicated_entities.findIndex(
          (e) =>
            e.frame_indices.includes(targetPhotoIdx + 1) ||
            e.normalized_name.toLowerCase() === normalizedName.toLowerCase()
        );

        let nextDeduplicated: DeduplicatedObservedEntity[];
        let updatedEntityId: string;

        if (existingIdx >= 0) {
          const existing = prev.deduplicated_entities[existingIdx];
          updatedEntityId = existing.entity_id;
          const updated: DeduplicatedObservedEntity = {
            ...existing,
            display_name: displayName,
            normalized_name: normalizedName,
            raw_text: result.rawText,
            script_detected: scriptDetected,
            confidence: Math.max(existing.confidence, result.confidence),
            preprocessing_note: result.variantUsed,
            user_edited: true,
          };
          nextDeduplicated = [...prev.deduplicated_entities];
          nextDeduplicated[existingIdx] = updated;
        } else {
          updatedEntityId = `manual_${Date.now()}`;
          const newEntity: DeduplicatedObservedEntity = {
            entity_id: updatedEntityId,
            display_name: displayName,
            normalized_name: normalizedName,
            source: 'Street Scan',
            detector_label: 'Tesseract OCR + COCO Context',
            evidence_type: 'OBSERVED',
            confidence: result.confidence,
            ocr_confirmed: result.confidence > 0.25,
            frame_indices: [targetPhotoIdx + 1],
            first_seen_sec: targetPhotoIdx,
            last_seen_sec: targetPhotoIdx,
            raw_ocr_variants: [result.rawText],
            nearby_activity_context: `Signboard crop (${result.variantUsed}, ${result.language})`,
            user_edited: true,
            raw_text: result.rawText,
            script_detected: scriptDetected,
            preprocessing_note: result.variantUsed,
          };
          nextDeduplicated = [newEntity, ...prev.deduplicated_entities];
        }

        const ledgerMatchesIdx = prev.reconciled_ledger.findIndex(
          (item) =>
            item.observed_detail?.entity_id === updatedEntityId ||
            item.name.toLowerCase() === normalizedName.toLowerCase()
        );

        let nextLedger: ReconciledFusionItem[];
        if (ledgerMatchesIdx >= 0) {
          nextLedger = prev.reconciled_ledger.map((item, idx) =>
            idx === ledgerMatchesIdx
              ? {
                  ...item,
                  name: displayName,
                  confidence: Math.max(
                    item.confidence,
                    result.confidence
                  ),
                  explanation:
                    'Verified from high-resolution signboard crop.',
                  observed_detail: nextDeduplicated.find(
                    (e) => e.entity_id === updatedEntityId
                  ),
                }
              : item
          );
        } else {
          const newLedgerItem: ReconciledFusionItem = {
            fusion_id: `manual_ledger_${Date.now()}`,
            name: displayName,
            reconciliation_status: 'ADDITIONAL_SIGNAL',
            evidence_type: 'OBSERVED',
            sources: ['Manual Signboard Crop (Tesseract OCR)'],
            confidence: result.confidence,
            spatial_band: '0-300m',
            explanation:
              'Ground reality observation verified via signboard crop.',
            observed_detail: nextDeduplicated.find(
              (e) => e.entity_id === updatedEntityId
            ),
          };
          nextLedger = [newLedgerItem, ...prev.reconciled_ledger];
        }

        const ocrConfirmedCount = nextDeduplicated.filter(
          (e) => (e.confidence || 0) > 0.25
        ).length;
        const addSignals = nextLedger.filter(
          (l) => l.reconciliation_status === 'ADDITIONAL_SIGNAL'
        ).length;

        return {
          ...prev,
          counts: {
            ...prev.counts,
            observed_entities: nextDeduplicated.length,
            ocr_confirmed_names: ocrConfirmedCount,
            additional_signals: addSignals,
          },
          deduplicated_entities: nextDeduplicated,
          reconciled_ledger: nextLedger,
        };
      });

      setIsCropModalOpen(false);
    },
    [cropTarget, selectedPhotoIndex, photoQueue.length]
  );

  const filteredLedger: ReconciledFusionItem[] = useMemo(() => {
    if (!fusionResult) return [];
    return fusionResult.reconciled_ledger.filter((item) => {
      if (ledgerFilter === 'ALL') return true;
      if (
        ledgerFilter === 'MATCHED' ||
        ledgerFilter === 'ADDITIONAL_SIGNAL' ||
        ledgerFilter === 'BASELINE_ONLY'
      ) {
        return item.reconciliation_status === ledgerFilter;
      }
      return item.evidence_type === ledgerFilter;
    });
  }, [fusionResult, ledgerFilter]);

  const isRunning =
    pipelineStage !== 'IDLE' &&
    pipelineStage !== 'COMPLETE' &&
    pipelineStage !== 'ERROR';

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      const raf = requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      });
      return () => cancelAnimationFrame(raf);
    }
  }, []);

  const currentStageRank = STAGE_ORDER[pipelineStage] ?? 0;

  const PIPELINE_STEPS = useMemo(
    () => [
      {
        stage: 'UPLOADING' as StreetScanPipelineStage,
        label: inputMode === 'PHOTOS' ? 'Validating Photos' : 'Uploading',
        subLabel:
          inputMode === 'PHOTOS'
            ? 'Validating 5–15 storefront photographs'
            : 'Validating MP4/MOV video stream',
      },
      {
        stage: 'EXTRACTING_FRAMES' as StreetScanPipelineStage,
        label:
          inputMode === 'PHOTOS' ? 'Preprocessing Photos' : 'Extracting frames',
        subLabel:
          inputMode === 'PHOTOS'
            ? 'Downscaling to 640px & contrast enhancement'
            : '~1 FPS downscaled keyframe sampling',
      },
      {
        stage: 'DETECTING_OBJECTS' as StreetScanPipelineStage,
        label: 'Detecting objects',
        subLabel: 'COCO object detection (pedestrians, vehicles, context)',
      },
      {
        stage: 'READING_SIGNS' as StreetScanPipelineStage,
        label: 'Reading signs',
        subLabel:
          inputMode === 'PHOTOS'
            ? `Multilingual OCR on storefront crops [${selectedLangCode}]`
            : `Selective OCR on keyframes [${selectedLangCode}]`,
      },
      {
        stage: 'DEDUPLICATING' as StreetScanPipelineStage,
        label: 'Deduplicating',
        subLabel: 'Cross-image & temporal storefront consolidation',
      },
      {
        stage: 'FUSING_EVIDENCE' as StreetScanPipelineStage,
        label: 'Fusing evidence',
        subLabel: '0–300m DATABASE baseline vs OBSERVED scan',
      },
    ],
    [inputMode, selectedLangCode]
  );

  return (
    <section
      aria-label="Page 3 — View 2: Street Scan and Ground Truth Fusion"
      className="relative min-h-screen w-full overflow-x-clip bg-[var(--stage-bg-base,#041312)] text-[#F8FAFC] transition-colors duration-[850ms] ease-in-out"
    >
      {/* Shared Ambient Looping Intelligence Field */}
      <WorkspaceSplineAmbient entryProgress={1} preferFallback={preferFallback} themeKey="teal" />

      {/* TOP BAR */}
      <header className="relative z-30 border-b border-white/[0.10] bg-[var(--stage-header-bg,rgba(7,29,27,0.80))] backdrop-blur-xl transition-colors duration-[850ms]">
        <div className="mx-auto flex max-w-[1680px] flex-wrap items-center justify-between gap-4 px-6 py-2.5 sm:px-10">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={() => {
                if (onBackToHome) {
                  onBackToHome();
                } else if (onBackToMarketDiscovery) {
                  onBackToMarketDiscovery();
                } else if (typeof window !== 'undefined') {
                  window.location.href = '/';
                }
              }}
              title="Return to LOCUS AI Home"
              className="group -ml-1 flex items-center gap-2 rounded-lg px-1.5 py-1 transition-all hover:bg-white/[0.08]"
            >
              <span
                className="h-2 w-2 rounded-full bg-gradient-to-tr from-[#0A3935] via-[#16A085] to-[#78E6C0] shadow-[0_0_10px_rgba(22,160,133,0.85)] transition-transform group-hover:scale-125"
                aria-hidden="true"
              />
              <span className="font-display text-sm font-bold tracking-[0.12em] text-white transition-colors group-hover:text-emerald-300">
                LOCUS AI
              </span>
            </button>
            <span className="h-3.5 w-px bg-white/15" aria-hidden="true" />
            <span className="bg-gradient-to-r from-[#78E6C0] via-[#16A085] to-[#A7F3D0] bg-clip-text text-xs font-semibold text-transparent">
              02 / Ground Reality — Street Scan &amp; Ground Truth Fusion
            </span>
          </div>

          {/* 4-View Workspace Sequence Stepper */}
          <WorkspaceStageNav
            currentStage="02"
            onNavigate={handleStageNav}
            unlockedViews={unlockedViews}
          />

          <div className="flex items-center gap-2.5">
            {fusionResult && (
              <span
                data-testid="street-scan-mode-pill"
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold ${
                  fusionResult.scan_mode === 'PHOTO_BATCH'
                    ? 'border-teal-400/45 bg-teal-500/15 text-teal-200'
                    : fusionResult.scan_mode === 'LIVE_UPLOAD'
                    ? 'border-emerald-400/45 bg-emerald-500/15 text-emerald-200'
                    : 'border-amber-400/45 bg-amber-500/15 text-amber-200'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    fusionResult.scan_mode === 'PHOTO_BATCH'
                      ? 'bg-teal-400'
                      : fusionResult.scan_mode === 'LIVE_UPLOAD'
                      ? 'bg-emerald-400'
                      : 'bg-amber-400'
                  }`}
                />
                <span>
                  {fusionResult.scan_mode === 'PHOTO_BATCH'
                    ? 'PHOTO BATCH · MULTI-IMAGE OCR'
                    : fusionResult.scan_mode === 'LIVE_UPLOAD'
                    ? 'LIVE VIDEO · COCO + OCR'
                    : 'CALIBRATED DEMO · LABELED FALLBACK'}
                </span>
              </span>
            )}

            <button
              type="button"
              onClick={onBackToMarketDiscovery}
              data-testid="back-to-market-discovery"
              className="liquid-glass-control inline-flex items-center gap-1.5 rounded-xl px-3 py-1 text-xs font-medium text-slate-200 transition-colors hover:border-[#C084FC]/50 hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-[#E879F9]" />
              <span>01 / Discovery</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN 3-COLUMN WORKSPACE */}
      <div className="relative z-10 mx-auto max-w-[1680px] px-6 py-4 sm:px-10 xl:py-5">
        {/* Prominent Stage Identity Strip */}
        <WorkspaceStageHero
          currentStage="02"
          candidateName={candidateMeta.label}
          city={candidateMeta.city}
          state={candidateMeta.state}
          businessType={handoff?.profile?.businessType}
          onNavigate={handleStageNav}
          unlockedViews={unlockedViews}
        />

        <div className="grid grid-cols-1 gap-5 xl:gap-6 lg:grid-cols-[minmax(310px,28%)_minmax(0,37%)_minmax(320px,35%)] lg:items-stretch">
          {/* LEFT PANEL: INPUT SELECTION (PHOTOS OR VIDEO) + PIPELINE STATUS */}
          <aside
            aria-label="Street Scan Upload and Pipeline Status"
            className="liquid-glass-dark flex flex-col justify-between rounded-3xl p-4 xl:p-5 max-h-[calc(100vh-140px)] overflow-y-auto custom-scrollbar"
          >
            <div className="space-y-4">
              {/* Candidate Scope Context */}
              <div className="flex items-start justify-between gap-2 border-b border-white/[0.08] pb-3">
                <div>
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#FB923C]">
                    STREET SCAN · 0–300m GROUND REALITY
                  </span>
                  <h2 className="mt-0.5 font-display text-base font-semibold text-white xl:text-lg">
                    {handoff?.localArea || handoff?.candidateName || 'Candidate Corridor'}
                  </h2>
                  <p className="text-xs text-slate-300/80">
                    {[handoff?.city, handoff?.state].filter(Boolean).join(', ')} ·{' '}
                    <span className="text-[#E879F9]">
                      {handoff?.profile?.businessType || 'Business'}
                    </span>
                  </p>
                </div>
                <span className="rounded-xl border border-[#818CF8]/35 bg-[#4F46E5]/15 px-2.5 py-1 font-mono text-[10px] font-semibold text-[#C7D2FE]">
                  {baseline300m.length} in 0–300m DB
                </span>
              </div>

              {/* Optional Enhancement Communication & Actions */}
              <div className="rounded-2xl border border-teal-400/30 border-t-white/25 bg-gradient-to-br from-teal-500/[0.12] via-sky-500/[0.07] to-transparent p-3.5 space-y-2.5 shadow-[0_12px_28px_-8px_rgba(20,184,166,0.22),inset_0_1px_0_0_rgba(255,255,255,0.22)] backdrop-blur-md">
                <div className="flex items-center gap-1.5 font-mono text-[10.5px] font-bold uppercase tracking-wider text-teal-300">
                  <Sparkles className="h-3.5 w-3.5 text-teal-400" />
                  <span>Ground Reality Enhancement</span>
                </div>
                <p className="text-xs leading-relaxed text-slate-200/90">
                  Supplement the map baseline with ground-truth visual storefronts. Upload multiple photographs or a short video clip.
                </p>
                <div className="flex flex-col gap-2 pt-0.5 sm:flex-row">
                  <button
                    type="button"
                    data-testid="skip-to-map-analysis-button"
                    onClick={() => onContinueToIntelligence?.(fusionResult)}
                    className="flex-1 rounded-xl border border-white/15 border-t-white/25 bg-white/[0.06] hover:bg-white/[0.12] hover:border-white/30 px-3 py-1.5 text-center text-xs font-semibold text-white transition-all shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)]"
                  >
                    Continue with Map Analysis
                  </button>
                  <button
                    type="button"
                    disabled={isRunning}
                    onClick={() => {
                      if (inputMode === 'PHOTOS') {
                        photoFileInputRef.current?.click();
                      } else {
                        videoFileInputRef.current?.click();
                      }
                    }}
                    className="flex-1 rounded-xl border border-teal-300/50 bg-gradient-to-r from-teal-500/50 via-cyan-500/40 to-sky-500/50 hover:brightness-115 px-3 py-1.5 text-center text-xs font-semibold text-white transition-all shadow-[0_4px_16px_-2px_rgba(20,184,166,0.4),inset_0_1px_0_0_rgba(255,255,255,0.28)] disabled:opacity-50"
                  >
                    {inputMode === 'PHOTOS' ? 'Add Photos' : 'Select Video'}
                  </button>
                </div>
              </div>

              {/* Input Mode Selector: Photos vs Video */}
              <div className="space-y-1.5">
                <label className="block font-mono text-[10.5px] font-semibold uppercase tracking-wider text-slate-300">
                  Input Mode
                </label>
                <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] p-1">
                  <button
                    type="button"
                    data-testid="mode-tab-photos"
                    disabled={isRunning}
                    onClick={() => {
                      setInputMode('PHOTOS');
                      setErrorMessage(null);
                    }}
                    className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-all ${
                      inputMode === 'PHOTOS'
                        ? 'border border-teal-400/60 bg-gradient-to-r from-teal-500/35 to-cyan-500/25 text-white shadow-[0_2px_10px_rgba(20,184,166,0.25)]'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <ImageIcon className="h-3.5 w-3.5 text-teal-300" />
                    <span>Photo Batch (5–15)</span>
                  </button>
                  <button
                    type="button"
                    data-testid="mode-tab-video"
                    disabled={isRunning}
                    onClick={() => {
                      setInputMode('VIDEO');
                      setErrorMessage(null);
                    }}
                    className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-all ${
                      inputMode === 'VIDEO'
                        ? 'border border-teal-400/60 bg-gradient-to-r from-teal-500/35 to-cyan-500/25 text-white shadow-[0_2px_10px_rgba(20,184,166,0.25)]'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <FileVideo className="h-3.5 w-3.5 text-cyan-300" />
                    <span>Street Video</span>
                  </button>
                </div>
              </div>

              {/* Multilingual OCR Language Selection */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="ocr-language-select"
                    className="flex items-center gap-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-wider text-slate-300"
                  >
                    <Globe className="h-3 w-3 text-teal-300" />
                    <span>Signboard OCR Model</span>
                  </label>
                  <span className="rounded bg-teal-500/15 px-1.5 py-0.5 font-mono text-[9px] font-medium text-teal-300">
                    {SUPPORTED_OCR_LANGUAGES.find((l) => l.code === selectedLangCode)?.isLocal
                      ? 'Offline Cached'
                      : 'On-Demand CDN'}
                  </span>
                </div>
                <select
                  id="ocr-language-select"
                  data-testid="ocr-language-select"
                  disabled={isRunning}
                  value={selectedLangCode}
                  onChange={(e) => setSelectedLangCode(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-[#091B1A] px-3 py-1.5 text-xs text-white outline-none transition-all focus:border-teal-400 focus:ring-1 focus:ring-teal-400 disabled:opacity-50"
                >
                  <optgroup label="Offline Verified (Local Models)">
                    {SUPPORTED_OCR_LANGUAGES.filter(
                      (l) => l.tier === 'LOCAL_VERIFIED'
                    ).map((lang) => (
                      <option
                        key={lang.code}
                        value={lang.code}
                        className="bg-[#091B1A] text-white"
                      >
                        {lang.label} [Offline]
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Experimental / On-Demand CDN">
                    {SUPPORTED_OCR_LANGUAGES.filter(
                      (l) => l.tier === 'EXPERIMENTAL_CDN'
                    ).map((lang) => (
                      <option
                        key={lang.code}
                        value={lang.code}
                        className="bg-[#091B1A] text-white"
                      >
                        {lang.label} [CDN]
                      </option>
                    ))}
                  </optgroup>
                </select>
                <p className="font-mono text-[10px] text-slate-400">
                  {SUPPORTED_OCR_LANGUAGES.find((l) => l.code === selectedLangCode)?.notes}
                </p>
              </div>

              {/* PHOTO BATCH MODE INTERFACE */}
              {inputMode === 'PHOTOS' && (
                <div className="space-y-3">
                  <input
                    ref={photoFileInputRef}
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                    data-testid="street-scan-photo-input"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleAddPhotos(e.target.files);
                      }
                      e.target.value = '';
                    }}
                  />

                  {/* Photo Dropzone / Upload Box */}
                  <div
                    onClick={() => !isRunning && photoFileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (isRunning) return;
                      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        handleAddPhotos(e.dataTransfer.files);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (!isRunning && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        photoFileInputRef.current?.click();
                      }
                    }}
                    data-testid="street-scan-photo-dropzone"
                    className={`group cursor-pointer rounded-2xl border border-dashed p-3.5 text-center transition-all ${
                      isRunning
                        ? 'cursor-wait border-teal-400/50 bg-teal-500/15'
                        : 'border-white/20 border-t-white/30 bg-gradient-to-b from-white/[0.04] to-transparent hover:border-teal-400/60 hover:bg-teal-500/[0.05] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)]'
                    }`}
                  >
                    <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-2xl border border-teal-400/35 bg-gradient-to-br from-teal-500/25 via-cyan-500/20 to-sky-500/20 shadow-[0_4px_12px_rgba(20,184,166,0.25)]">
                      <Upload className="h-4 w-4 text-teal-200" />
                    </div>
                    <p className="mt-2 text-xs font-semibold text-white">
                      Upload Storefront Photographs
                    </p>
                    <p className="mt-0.5 font-mono text-[10.5px] text-slate-400">
                      Select 5–15 images · JPG, PNG, WebP (max 25MB each)
                    </p>
                  </div>

                  {/* Photo Queue Counter & Controls */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 font-mono text-[10.5px] font-semibold ${
                          photoQueue.length >= 5 && photoQueue.length <= 15
                            ? 'border border-emerald-400/40 bg-emerald-500/15 text-emerald-300'
                            : photoQueue.length > 0
                            ? 'border border-amber-400/40 bg-amber-500/15 text-amber-300'
                            : 'border border-white/10 bg-white/[0.04] text-slate-400'
                        }`}
                      >
                        {photoQueue.length >= 5 && photoQueue.length <= 15 ? (
                          <Check className="h-3 w-3 text-emerald-400" />
                        ) : null}
                        <span>
                          {photoQueue.length} / 5–15 photos
                        </span>
                      </span>
                      {photoQueue.length > 0 && photoQueue.length < 5 && (
                        <span className="font-mono text-[10px] text-amber-300">
                          (Need {5 - photoQueue.length} more)
                        </span>
                      )}
                    </div>

                    {photoQueue.length > 0 && !isRunning && (
                      <div className="flex items-center gap-1.5">
                        {photoQueue.length < 15 && (
                          <button
                            type="button"
                            onClick={() => photoFileInputRef.current?.click()}
                            className="inline-flex items-center gap-1 rounded-lg border border-teal-400/30 bg-teal-500/10 px-2 py-0.5 text-[11px] font-medium text-teal-300 hover:bg-teal-500/20"
                          >
                            <Plus className="h-3 w-3" />
                            <span>Add</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleClearAllPhotos}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-400/30 bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-300 hover:bg-rose-500/20"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Clear</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Thumbnail Strip / Grid */}
                  {photoQueue.length > 0 && (
                    <div
                      data-testid="photo-thumbnails-strip"
                      className="grid grid-cols-4 gap-2 max-h-[170px] overflow-y-auto pr-1 custom-scrollbar"
                    >
                      {photoQueue.map((photo, idx) => {
                        const isSelected = selectedPhotoIndex === idx;
                        return (
                          <div
                            key={photo.id}
                            className={`group relative aspect-square rounded-xl overflow-hidden border cursor-pointer transition-all ${
                              isSelected
                                ? 'border-teal-400 shadow-[0_0_12px_rgba(20,184,166,0.4)]'
                                : 'border-white/15 hover:border-white/40'
                            }`}
                            onClick={() => setSelectedPhotoIndex(idx)}
                          >
                            <img
                              src={photo.previewUrl}
                              alt={photo.name}
                              className="h-full w-full object-cover"
                            />
                            {/* Photo Index Badge */}
                            <span className="absolute bottom-1 left-1 rounded bg-black/75 px-1 font-mono text-[9px] text-white">
                              #{idx + 1}
                            </span>
                            {/* Status Indicator */}
                            {photo.status === 'COMPLETED' && (
                              <span
                                title={`Processed: ${photo.ocrReadsCount || 0} OCR reads, ${photo.cocoObjectsCount || 0} objects`}
                                className="absolute top-1 left-1 rounded-full bg-emerald-500 p-0.5 text-black"
                              >
                                <Check className="h-2.5 w-2.5 text-black stroke-[3]" />
                              </span>
                            )}
                            {photo.status === 'PROCESSING' && (
                              <span className="absolute top-1 left-1 h-2.5 w-2.5 rounded-full bg-cyan-400 animate-ping" />
                            )}
                            {photo.status === 'ERROR' && (
                              <span className="absolute top-1 left-1 h-2.5 w-2.5 rounded-full bg-rose-500" />
                            )}
                            {/* Inspect & Crop Button Overlay on Thumbnail */}
                            <button
                              type="button"
                              title="Inspect & Crop Signboard"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenCropModal(idx);
                              }}
                              className="absolute top-1 right-6 h-4 w-4 rounded-full bg-black/80 text-teal-300 hover:bg-teal-500 hover:text-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Crop className="h-2.5 w-2.5" />
                            </button>
                            {/* Remove button */}
                            {!isRunning && (
                              <button
                                type="button"
                                title="Remove photo"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemovePhoto(photo.id);
                                }}
                                className="absolute top-1 right-1 h-4 w-4 rounded-full bg-black/80 text-white/80 hover:bg-rose-600 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="h-2.5 w-2.5" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Primary Action Button: Process Photo Batch */}
                  <button
                    type="button"
                    disabled={isRunning || photoQueue.length < 5 || photoQueue.length > 15}
                    onClick={() => void handleRunPhotoBatch()}
                    data-testid="run-photo-batch-scan-button"
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-teal-300/60 bg-gradient-to-r from-teal-500/60 via-cyan-500/50 to-sky-500/60 py-2.5 text-xs font-semibold text-white shadow-[0_4px_16px_rgba(20,184,166,0.35),inset_0_1px_0_rgba(255,255,255,0.25)] transition-all hover:brightness-110 disabled:opacity-45 disabled:cursor-not-allowed"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-teal-200" />
                    <span>
                      {isRunning
                        ? 'Processing Photographs...'
                        : photoQueue.length < 5
                        ? `Add ${5 - photoQueue.length} More Photo(s) to Scan`
                        : `Scan ${photoQueue.length} Storefront Photos`}
                    </span>
                  </button>
                </div>
              )}

              {/* VIDEO MODE INTERFACE */}
              {inputMode === 'VIDEO' && (
                <div className="space-y-2.5">
                  <input
                    ref={videoFileInputRef}
                    type="file"
                    accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
                    data-testid="street-scan-file-input"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        void handleVideoFileSelected(file);
                      }
                    }}
                  />

                  <div
                    onClick={() => !isRunning && videoFileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (isRunning) return;
                      const file = e.dataTransfer.files?.[0];
                      if (file) {
                        void handleVideoFileSelected(file);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (!isRunning && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        videoFileInputRef.current?.click();
                      }
                    }}
                    data-testid="street-scan-upload-dropzone"
                    className={`group cursor-pointer rounded-2xl border border-dashed p-4 text-center transition-all ${
                      isRunning
                        ? 'cursor-wait border-teal-400/50 bg-teal-500/15'
                        : 'border-white/20 border-t-white/30 bg-gradient-to-b from-white/[0.04] to-transparent hover:border-teal-400/60 hover:bg-teal-500/[0.05] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)]'
                    }`}
                  >
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl border border-teal-400/35 bg-gradient-to-br from-teal-500/25 via-cyan-500/20 to-sky-500/20 shadow-[0_4px_12px_rgba(20,184,166,0.25)]">
                      <FileVideo className="h-4 w-4 text-teal-200" />
                    </div>
                    <p className="mt-2 text-xs font-semibold text-white">
                      {uploadedFilename
                        ? `Uploaded: ${uploadedFilename}`
                        : 'Upload Street Video'}
                    </p>
                    <p className="mt-0.5 font-mono text-[10.5px] text-slate-400">
                      Supported: MP4 / MOV · 30–60 sec recommended
                    </p>
                  </div>
                </div>
              )}

              {/* Explicit Calibrated Demo Trigger (Available in both modes as a labeled fallback) */}
              <button
                type="button"
                disabled={isRunning}
                onClick={() => void handleRunCalibratedDemo()}
                data-testid="run-calibrated-demo-button"
                className="liquid-glass-control flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-slate-200 transition-all hover:border-teal-400/55 hover:text-white disabled:opacity-50"
              >
                <Sparkles className="h-3.5 w-3.5 text-teal-300" />
                <span>Run Calibrated Demo Scan (Labeled Sample Telemetry)</span>
              </button>

              {/* 6-Stage Processing Status Checklist */}
              <div className="border-t border-white/[0.08] pt-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-300">
                    Processing Status
                  </span>
                  <span className="font-mono text-[10.5px] text-[#FB923C]">
                    {progressPct}%
                  </span>
                </div>

                <div className="mb-2.5 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#4F46E5] via-[#E879F9] to-[#FB923C] transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>

                <div
                  data-testid="street-scan-pipeline-steps"
                  className="space-y-1.5"
                >
                  {PIPELINE_STEPS.map((step) => {
                    const stepRank = STAGE_ORDER[step.stage];
                    const isDone =
                      pipelineStage === 'COMPLETE' ||
                      currentStageRank > stepRank;
                    const isCurrent = pipelineStage === step.stage;

                    return (
                      <div
                        key={step.stage}
                        className={`flex items-center justify-between rounded-xl border px-2.5 py-1.5 text-xs transition-all ${
                          isCurrent
                            ? 'border-teal-400/60 border-t-white/30 bg-teal-500/20 text-white shadow-[0_0_16px_rgba(45,212,191,0.22),inset_0_1px_0_0_rgba(255,255,255,0.20)]'
                            : isDone
                            ? 'border-emerald-400/30 border-t-emerald-300/40 bg-emerald-500/[0.08] text-slate-200'
                            : 'border-white/[0.06] bg-white/[0.02] text-slate-400'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              isCurrent
                                ? 'animate-pulse bg-teal-300 shadow-[0_0_8px_rgba(45,212,191,0.8)]'
                                : isDone
                                ? 'bg-emerald-400'
                                : 'bg-slate-600'
                            }`}
                          />
                          <span className="font-medium">{step.label}</span>
                        </div>
                        <span className="font-mono text-[10px] text-slate-400">
                          {step.subLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <p className="mt-2 font-mono text-[10.5px] text-slate-300">
                  {statusMessage}
                </p>

                {errorMessage && (
                  <div
                    role="alert"
                    className="mt-2 flex flex-col gap-2 rounded-xl border border-amber-400/40 bg-amber-500/10 p-2.5 text-xs text-amber-200 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)]"
                  >
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                      <span className="flex-1 leading-relaxed">{errorMessage}</span>
                    </div>
                    {photoQueue.length >= 5 && (
                      <button
                        type="button"
                        disabled={isRunning}
                        onClick={() => void handleRunPhotoBatch()}
                        className="inline-flex items-center gap-1.5 self-start rounded-lg border border-amber-400/50 bg-amber-500/20 px-3 py-1 font-mono text-[11px] font-semibold text-amber-100 transition-all hover:bg-amber-500/30 disabled:opacity-50"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Retry Corridor Fusion ({photoQueue.length} Photos Kept)
                      </button>
                    )}
                  </div>
                )}

                {ocrLangWarning && (
                  <div
                    role="alert"
                    data-testid="ocr-lang-warning"
                    className="mt-2 flex items-start gap-2 rounded-xl border border-[#818CF8]/50 bg-[#4F46E5]/15 p-2.5 text-xs text-[#C7D2FE] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)]"
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#818CF8]" />
                    <div className="space-y-1">
                      <p className="font-semibold text-white">
                        Language Model Notice
                      </p>
                      <p className="leading-relaxed text-[11px]">{ocrLangWarning}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-3 border-t border-white/[0.08] pt-2.5 font-mono text-[10px] text-slate-400">
              Downscaled observations sent to{' '}
              <span className="text-slate-200">/api/street-scan/fuse</span> (raw
              photo/video binaries remain on client).
            </div>
          </aside>

          {/* CENTER PANEL: VISUAL EVIDENCE PREVIEW & DEDUPLICATED STOREFRONTS */}
          <div className="liquid-glass-dark flex flex-col justify-between rounded-3xl p-4 xl:p-5">
            <div className="space-y-4">
              {/* Header + Scope Honesty Banner */}
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-white/[0.08] pb-3">
                <div>
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300">
                    GROUND REALITY · VISUAL EVIDENCE
                  </span>
                  <h2 className="mt-0.5 font-display text-base font-semibold text-white xl:text-lg">
                    {fusionResult?.scan_mode === 'PHOTO_BATCH'
                      ? 'Photo Batch Evidence & Storefront Reads'
                      : 'Observed Entities & COCO Activity Signals'}
                  </h2>
                </div>
                <span
                  className={`rounded-lg border px-2 py-0.5 font-mono text-[10px] font-semibold ${EVIDENCE_BADGE_STYLE.OBSERVED.bg}`}
                >
                  OBSERVED
                </span>
              </div>

              {/* Spatial Scope Honesty Notice */}
              <div className="glass-sub-card rounded-2xl p-3.5 text-xs leading-relaxed text-slate-300">
                <span className="font-semibold text-white">
                  Spatial Scope (0–300m Ground Reality):{' '}
                </span>
                {fusionResult
                  ? fusionResult.honesty_notice
                  : 'Ground Reality observations cover storefronts captured in the 0–300m corridor—not the wider 2–5km market basin.'}
              </div>

              {/* Keyframe / Photo Preview Box */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-300">
                    {activeFramePreview
                      ? `Observation #${String(
                          activeFramePreview.frame_index
                        ).padStart(2, '0')} (${activeFramePreview.ocr_reads.length} sign read${
                          activeFramePreview.ocr_reads.length === 1 ? '' : 's'
                        }, ${activeFramePreview.objects.length} context obj)`
                      : uploadedVideoUrl
                      ? 'Uploaded Street Footage'
                      : photoQueue.length > 0
                      ? `Photo #${selectedPhotoIndex + 1}: ${photoQueue[selectedPhotoIndex]?.name}`
                      : 'Corridor Visual Preview'}
                  </span>

                  <div className="flex items-center gap-2">
                    {(photoQueue.length > 0 || activeFramePreview) && (
                      <button
                        type="button"
                        data-testid="inspect-crop-signboard-button"
                        onClick={() => handleOpenCropModal()}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-teal-400/40 bg-teal-500/15 px-2.5 py-1 text-[11px] font-medium text-teal-200 hover:border-teal-400 hover:bg-teal-500/25 shadow-[0_2px_8px_rgba(20,184,166,0.2)] transition-all"
                      >
                        <Crop className="h-3.5 w-3.5 text-teal-300" />
                        <span>Inspect &amp; Crop Signboard</span>
                      </button>
                    )}

                    {activeFramePreview?.ocr_sampled && (
                      <span className="rounded border border-emerald-400/40 bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[9.5px] font-semibold text-emerald-300">
                        OCR SAMPLED
                      </span>
                    )}
                  </div>
                </div>

                <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-b from-[#03090B] to-[#010406] shadow-[inset_0_0_28px_rgba(0,0,0,0.85),0_12px_28px_rgba(0,0,0,0.65)]">
                  {activeFramePreview ? (
                    <img
                      src={activeFramePreview.preview_data_url}
                      alt={`Extracted observation ${activeFramePreview.frame_index}`}
                      className="h-full w-full object-cover"
                    />
                  ) : uploadedVideoUrl ? (
                    <video
                      src={uploadedVideoUrl}
                      controls
                      playsInline
                      className="h-full w-full object-contain"
                    />
                  ) : photoQueue.length > 0 && photoQueue[selectedPhotoIndex] ? (
                    <img
                      src={photoQueue[selectedPhotoIndex].previewUrl}
                      alt={photoQueue[selectedPhotoIndex].name}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center p-4 text-center">
                      <FileImage className="h-7 w-7 text-slate-500" />
                      <p className="mt-1.5 text-xs text-slate-400">
                        No corridor imagery loaded yet.
                      </p>
                      <p className="mt-0.5 font-mono text-[10px] text-slate-500">
                        Upload 5–15 photographs or a video clip to begin.
                      </p>
                    </div>
                  )}
                </div>

                {/* Keyframe / Photo Scrubber Pills */}
                {framePreviews.length > 0 ? (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 custom-scrollbar">
                    {framePreviews.map((fp) => {
                      const isSelected =
                        fp.frame_index === activeFramePreview?.frame_index;
                      return (
                        <button
                          key={fp.frame_index}
                          type="button"
                          onClick={() => setSelectedFrameIndex(fp.frame_index)}
                          className={`shrink-0 rounded-lg border px-2 py-1 font-mono text-[10px] transition-all ${
                            isSelected
                              ? 'border-[#FB923C] bg-[#F97316]/25 font-semibold text-white'
                              : fp.ocr_sampled
                              ? 'border-emerald-400/35 bg-emerald-500/10 text-emerald-200 hover:border-emerald-400/60'
                              : 'border-white/10 bg-white/[0.03] text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          #{String(fp.frame_index).padStart(2, '0')}
                          {fp.ocr_reads.length > 0 ? ` · ${fp.ocr_reads.length} sign` : ''}
                        </button>
                      );
                    })}
                  </div>
                ) : photoQueue.length > 0 ? (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 custom-scrollbar">
                    {photoQueue.map((photo, idx) => {
                      const isSelected = selectedPhotoIndex === idx;
                      return (
                        <button
                          key={photo.id}
                          type="button"
                          onClick={() => setSelectedPhotoIndex(idx)}
                          className={`shrink-0 rounded-lg border px-2 py-0.5 font-mono text-[10px] transition-all ${
                            isSelected
                              ? 'border-teal-400 bg-teal-500/25 font-semibold text-white'
                              : 'border-white/10 bg-white/[0.03] text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Photo #{idx + 1}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>

              {/* Three Primary Ground Reality Counters */}
              <div
                data-testid="ground-reality-counters"
                className="grid grid-cols-3 gap-2.5"
              >
                <div className="rounded-2xl border border-emerald-400/35 border-t-white/30 bg-gradient-to-br from-emerald-500/[0.14] via-emerald-950/[0.25] to-transparent p-3.5 shadow-[0_10px_24px_-6px_rgba(16,185,129,0.25),inset_0_1px_0_0_rgba(255,255,255,0.22)] backdrop-blur-md">
                  <span className="block font-mono text-[10px] uppercase tracking-wider text-emerald-300 font-semibold">
                    Observed entities
                  </span>
                  <span
                    data-testid="count-observed-entities"
                    className="mt-1 block font-display text-2xl font-bold text-white tracking-tight"
                  >
                    {fusionResult ? fusionResult.counts.observed_entities : '—'}
                  </span>
                  <span className="mt-0.5 block font-mono text-[10px] text-emerald-200/60">
                    Deduplicated
                  </span>
                </div>

                <div className="rounded-2xl border border-sky-400/35 border-t-white/30 bg-gradient-to-br from-sky-500/[0.14] via-indigo-950/[0.25] to-transparent p-3.5 shadow-[0_10px_24px_-6px_rgba(56,189,248,0.25),inset_0_1px_0_0_rgba(255,255,255,0.22)] backdrop-blur-md">
                  <span className="block font-mono text-[10px] uppercase tracking-wider text-sky-300 font-semibold">
                    Commercial signals
                  </span>
                  <span
                    data-testid="count-commercial-signals"
                    className="mt-1 block font-display text-2xl font-bold text-white tracking-tight"
                  >
                    {fusionResult
                      ? fusionResult.counts.observed_commercial_signals
                      : '—'}
                  </span>
                  <span className="mt-0.5 block font-mono text-[10px] text-sky-200/60">
                    Signboards + context
                  </span>
                </div>

                <div className="rounded-2xl border border-amber-400/35 border-t-white/30 bg-gradient-to-br from-amber-500/[0.14] via-orange-950/[0.25] to-transparent p-3.5 shadow-[0_10px_24px_-6px_rgba(245,158,11,0.25),inset_0_1px_0_0_rgba(255,255,255,0.22)] backdrop-blur-md">
                  <span className="block font-mono text-[10px] uppercase tracking-wider text-amber-300 font-semibold">
                    OCR-confirmed names
                  </span>
                  <span
                    data-testid="count-ocr-confirmed"
                    className="mt-1 block font-display text-2xl font-bold text-white tracking-tight"
                  >
                    {fusionResult
                      ? fusionResult.counts.ocr_confirmed_names
                      : '—'}
                  </span>
                  <span className="mt-0.5 block font-mono text-[10px] text-amber-200/60">
                    Signboard text
                  </span>
                </div>
              </div>

              {/* Deduplicated OCR Storefront Entities with Manual Correction */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300">
                    Deduplicated Storefront Reads
                  </h3>
                  {fusionResult && (
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-slate-400">
                        {fusionResult.video_summary.frames_extracted}{' '}
                        {fusionResult.scan_mode === 'PHOTO_BATCH' ? 'photos' : 'frames'}
                      </span>
                      <span className="rounded border border-emerald-400/40 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-emerald-300">
                        {selectedLangCode}
                      </span>
                    </div>
                  )}
                </div>

                {fusionResult &&
                fusionResult.deduplicated_entities.length > 0 ? (
                  <div
                    data-testid="deduplicated-entities-list"
                    className="max-h-[260px] space-y-2 overflow-y-auto pr-1.5 custom-scrollbar"
                  >
                    {fusionResult.deduplicated_entities.map((entity) => {
                      const isEditing = editingEntityId === entity.entity_id;
                      return (
                        <div
                          key={entity.entity_id}
                          className="glass-sub-card rounded-2xl p-3 hover:border-teal-400/40 transition-all"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              {isEditing ? (
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    value={editingEntityName}
                                    onChange={(e) => setEditingEntityName(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        handleSaveEdit(entity.entity_id);
                                      } else if (e.key === 'Escape') {
                                        handleCancelEdit();
                                      }
                                    }}
                                    autoFocus
                                    className="rounded-lg border border-teal-400 bg-black/60 px-2 py-0.5 text-xs text-white outline-none focus:ring-1 focus:ring-teal-400"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEdit(entity.entity_id)}
                                    title="Confirm name correction"
                                    className="rounded p-1 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleCancelEdit}
                                    title="Cancel"
                                    className="rounded p-1 bg-white/10 text-slate-300 hover:bg-white/20"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-display text-sm font-semibold text-white">
                                    {entity.display_name}
                                  </span>
                                  {entity.user_edited && (
                                    <span className="rounded border border-teal-400/40 bg-teal-500/15 px-1 py-0.2 font-mono text-[8.5px] font-semibold text-teal-300">
                                      USER CONFIRMED
                                    </span>
                                  )}
                                  {/* Confidence Pill */}
                                  {(() => {
                                    const conf = Math.round(
                                      (entity.confidence || 0) * 100
                                    );
                                    if (conf >= 70) {
                                      return (
                                        <span className="rounded border border-emerald-400/40 bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-emerald-300">
                                          High ({conf}%)
                                        </span>
                                      );
                                    }
                                    if (conf >= 40) {
                                      return (
                                        <span className="rounded border border-amber-400/40 bg-amber-500/15 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-amber-300">
                                          Moderate ({conf}%)
                                        </span>
                                      );
                                    }
                                    return (
                                      <span className="rounded border border-rose-400/40 bg-rose-500/15 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-rose-300">
                                        Low confidence / Unreadable (
                                        {conf > 0 ? `${conf}%` : 'Low'})
                                      </span>
                                    );
                                  })()}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleStartEdit(
                                        entity.entity_id,
                                        entity.display_name
                                      )
                                    }
                                    title="Manually correct or confirm business name"
                                    className="p-1 text-slate-400 hover:text-teal-300 rounded hover:bg-white/5 transition-colors"
                                  >
                                    <Edit2 className="h-3 w-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const frameIdx =
                                        (entity.frame_indices[0] || 1) - 1;
                                      handleOpenCropModal(
                                        frameIdx >= 0 &&
                                          frameIdx < photoQueue.length
                                          ? frameIdx
                                          : undefined
                                      );
                                    }}
                                    title="Inspect & Crop Signboard for this entity"
                                    className="p-1 text-slate-400 hover:text-teal-300 rounded hover:bg-white/5 transition-colors"
                                  >
                                    <Crop className="h-3 w-3" />
                                  </button>
                                  <span
                                    className={`rounded border px-1.5 py-0.5 font-mono text-[9px] font-semibold ${EVIDENCE_BADGE_STYLE.OBSERVED.bg}`}
                                  >
                                    {entity.evidence_type}
                                  </span>
                                </div>
                              )}
                              <p className="mt-0.5 font-mono text-[10.5px] text-slate-400">
                                Source: {entity.source} ({entity.detector_label})
                              </p>
                            </div>

                            <span className="shrink-0 rounded-lg border border-teal-400/30 bg-teal-500/10 px-2 py-0.5 font-mono text-[10px] text-teal-300">
                              {fusionResult.scan_mode === 'PHOTO_BATCH'
                                ? `Photos #${entity.frame_indices.join(', #')}`
                                : `Frames #${entity.frame_indices.join(', #')}`}
                            </span>
                          </div>

                          <div className="mt-2 space-y-1 border-t border-white/[0.06] pt-1.5 font-mono text-[10px] text-slate-400">
                            {entity.raw_text && (
                              <div className="flex items-center gap-1.5 text-slate-300">
                                <span className="text-slate-400">Raw OCR:</span>
                                <code className="rounded bg-black/40 px-1 py-0.5 text-teal-200">
                                  "{entity.raw_text}"
                                </code>
                                {entity.script_detected && (
                                  <span className="text-[9px] text-slate-400">
                                    ({entity.script_detected})
                                  </span>
                                )}
                              </div>
                            )}
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span>
                                Normalized:{' '}
                                <code className="text-slate-200">
                                  "{entity.normalized_name}"
                                </code>
                              </span>
                              <span>{entity.nearby_activity_context}</span>
                            </div>
                            {entity.preprocessing_note && (
                              <div className="text-[9.5px] text-slate-400">
                                Filter: {entity.preprocessing_note}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : fusionResult ? (
                  <div className="glass-sub-card rounded-2xl p-4 text-xs text-slate-400">
                    No high-confidence commercial signboard text was confirmed
                    in the sampled keyframes/photos. Inspect the COCO activity
                    breakdown below.
                  </div>
                ) : (
                  <div className="glass-sub-card rounded-2xl p-4 text-xs text-slate-400">
                    Upload 5–15 storefront photos or click{' '}
                    <span className="font-medium text-white">
                      Run Calibrated Demo Scan
                    </span>{' '}
                    to extract signboard text and collapse repeated storefronts.
                  </div>
                )}
              </div>

              {/* COCO Object Detection Activity Breakdown */}
              <div className="space-y-2 border-t border-white/[0.08] pt-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300">
                    COCO Object &amp; Street Activity Signals
                  </h3>
                  <span className="font-mono text-[10px] text-[#A5B4FC]">
                    {fusionResult
                      ? fusionResult.detector_engine
                      : 'COCO-SSD (person, vehicles, seating)'}
                  </span>
                </div>

                {fusionResult &&
                fusionResult.activity_summary.class_breakdown.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {fusionResult.activity_summary.class_breakdown.map((cls) => (
                      <div
                        key={cls.class_name}
                        className="glass-sub-card rounded-xl px-3 py-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-semibold capitalize text-white">
                            {cls.class_name}
                          </span>
                          <span className="rounded bg-white/[0.08] px-1.5 py-0.5 font-mono text-[9.5px] text-[#FDBA74]">
                            {cls.total_detections} det
                          </span>
                        </div>
                        <p className="mt-0.5 font-mono text-[10px] text-slate-400">
                          Peak {cls.peak_per_frame}/frame ·{' '}
                          {Math.round(cls.avg_confidence * 100)}% conf
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">
                    Standard COCO object classes (pedestrians, cars, two-wheelers,
                    chairs, benches, dining tables, umbrellas) provide street activity context—never misrepresented as direct business classifications.
                  </p>
                )}
              </div>
            </div>

            <div className="mt-3 border-t border-white/[0.08] pt-2.5 flex items-center justify-between font-mono text-[10px] text-slate-400">
              <span>
                Storefront deduplication collapses repeated observations into a single entity.
              </span>
              {fusionResult && (
                <span className="text-emerald-300">
                  Activity: {fusionResult.activity_summary.activity_level}
                </span>
              )}
            </div>
          </div>

          {/* RIGHT PANEL: GROUND TRUTH FUSION — MAP BASELINE vs GROUND REALITY */}
          <aside
            aria-label="Ground Truth Fusion Panel"
            className="liquid-glass-dark flex flex-col justify-between rounded-3xl p-4 xl:p-5"
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2 border-b border-white/[0.08] pb-3">
                <div>
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#E879F9]">
                    GROUND TRUTH FUSION
                  </span>
                  <h2 className="mt-0.5 font-display text-base font-semibold text-white xl:text-lg">
                    Map Baseline vs Ground Reality
                  </h2>
                </div>
                <Layers className="h-4 w-4 text-[#FB923C]" />
              </div>

              {/* MAP BASELINE vs GROUND REALITY Summary Table */}
              <div
                data-testid="fusion-comparison-summary"
                className="glass-sub-card rounded-2xl p-4 space-y-2.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#818CF8]" />
                    <span className="text-slate-300">
                      Mapped baseline (0–300m)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded border border-[#818CF8]/35 bg-[#4F46E5]/15 px-1.5 py-0.5 font-mono text-[9px] text-[#C7D2FE]">
                      DATABASE
                    </span>
                    <span
                      data-testid="fusion-count-baseline"
                      className="font-mono text-sm font-bold text-white"
                    >
                      {fusionResult
                        ? fusionResult.counts.mapped_baseline_300m
                        : baseline300m.length}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    <span className="text-slate-300">Observed in scan</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded border border-emerald-400/35 bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[9px] text-emerald-200">
                      OBSERVED
                    </span>
                    <span
                      data-testid="fusion-count-observed"
                      className="font-mono text-sm font-bold text-white"
                    >
                      {fusionResult
                        ? fusionResult.counts.observed_entities
                        : '—'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#FB923C]" />
                    <span className="text-slate-300">
                      Matched across both sources
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded border border-[#FB923C]/40 bg-[#F97316]/15 px-1.5 py-0.5 font-mono text-[9px] text-[#FED7AA]">
                      INFERRED
                    </span>
                    <span
                      data-testid="fusion-count-matched"
                      className="font-mono text-sm font-bold text-[#FDBA74]"
                    >
                      {fusionResult
                        ? fusionResult.counts.matched_entities
                        : '—'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-white/[0.08] pt-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-300" />
                    <span className="font-semibold text-white">
                      Additional observed signals
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded border border-emerald-400/40 bg-emerald-500/20 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-emerald-200">
                      OBSERVED
                    </span>
                    <span
                      data-testid="fusion-count-additional"
                      className="font-mono text-sm font-bold text-emerald-300"
                    >
                      {fusionResult
                        ? `+${fusionResult.counts.additional_signals}`
                        : '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { id: 'ALL', label: 'All' },
                    { id: 'MATCHED', label: 'Matched (Inferred)' },
                    {
                      id: 'ADDITIONAL_SIGNAL',
                      label: 'Additional Signals (Observed)',
                    },
                    { id: 'BASELINE_ONLY', label: 'Baseline Only (Database)' },
                  ] as { id: LedgerFilter; label: string }[]
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setLedgerFilter(tab.id)}
                    className={`rounded-xl border px-2.5 py-1 font-mono text-[10px] transition-all ${
                      ledgerFilter === tab.id
                        ? 'border-teal-400/70 bg-teal-500/25 font-semibold text-white shadow-[0_0_12px_rgba(45,212,191,0.3)]'
                        : 'border-white/10 bg-white/[0.03] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Reconciled Evidence Ledger */}
              <div
                data-testid="reconciled-fusion-ledger"
                className="max-h-[340px] space-y-2 overflow-y-auto pr-1.5 custom-scrollbar"
              >
                {fusionResult ? (
                  filteredLedger.length > 0 ? (
                    filteredLedger.map((item) => {
                      const badge =
                        (item?.evidence_type &&
                          EVIDENCE_BADGE_STYLE[item.evidence_type]) ||
                        EVIDENCE_BADGE_STYLE.OBSERVED;
                      return (
                        <div
                          key={item.fusion_id}
                          className="glass-sub-card rounded-2xl p-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="font-display text-xs font-semibold text-white">
                                {item.name}
                              </span>
                              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 font-mono text-[10px] text-slate-400">
                                <span>
                                  Source: {item.sources.join(' + ')}
                                </span>
                                <span>·</span>
                                <span>
                                  Conf:{' '}
                                  {item.confidence > 0
                                    ? `${Math.round(item.confidence * 100)}%`
                                    : 'Available'}
                                </span>
                                {typeof item.distance_m === 'number' && (
                                  <>
                                    <span>·</span>
                                    <span>{item.distance_m}m</span>
                                  </>
                                )}
                              </div>
                            </div>

                            <span
                              className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[9px] font-semibold ${badge.bg}`}
                            >
                              {badge.label}
                            </span>
                          </div>

                          <p className="mt-1.5 text-[11px] leading-relaxed text-slate-300/90">
                            {item.explanation}
                          </p>
                        </div>
                      );
                    })
                  ) : (
                    <div className="glass-sub-card rounded-2xl p-4 text-xs text-slate-400">
                      No items match the selected filter ({ledgerFilter}).
                    </div>
                  )
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-400">
                      Awaiting Street Scan execution to reconcile against{' '}
                      <span className="font-semibold text-white">
                        {baseline300m.length} mapped 0–300m baseline entities
                      </span>
                      :
                    </p>
                    {baseline300m.slice(0, 5).map((place, pIdx) => (
                      <div
                        key={place.place_id || `${place.business_name || 'p'}-${pIdx}`}
                        className="glass-sub-card flex items-center justify-between rounded-xl px-3 py-2 text-xs"
                      >
                        <div className="truncate pr-2">
                          <span className="font-medium text-slate-200">
                            {place.business_name || 'Commercial Entity'}
                          </span>
                          <span className="ml-2 font-mono text-[10px] text-slate-400">
                            {place.distance_m ?? 0}m · {place.source || 'Database'}
                          </span>
                        </div>
                        <span
                          className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[9px] font-semibold ${EVIDENCE_BADGE_STYLE.DATABASE.bg}`}
                        >
                          DATABASE
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Continue to View 3 CTA + Evidence Taxonomy Legend Footer */}
            <div className="mt-3.5 space-y-3 border-t border-white/[0.08] pt-3">
              {onContinueToIntelligence && (
                <button
                  type="button"
                  data-testid="continue-to-intelligence-button"
                  onClick={() => onContinueToIntelligence(fusionResult)}
                  className="flex w-full items-center justify-between rounded-2xl border border-[#E879F9]/55 bg-[linear-gradient(135deg,rgba(79,70,229,0.68)_0%,rgba(168,85,247,0.56)_52%,rgba(249,115,22,0.58)_100%)] px-4 py-2.5 text-xs font-semibold tracking-wide text-white shadow-[0_12px_32px_-8px_rgba(147,51,234,0.55),inset_0_1px_0_rgba(255,255,255,0.28)] transition-all hover:border-[#FB923C] hover:brightness-110 focus:outline-none"
                >
                  <div className="flex flex-col items-start text-left">
                    <span>
                      {fusionResult
                        ? 'CONTINUE WITH ENHANCED ANALYSIS'
                        : 'CONTINUE WITH MAP-BASED ANALYSIS'}
                    </span>
                    <span className="font-mono text-[10px] text-slate-300 font-normal">
                      {fusionResult
                        ? 'Proceed with fused visual and map signals'
                        : 'Proceed using verified map listings without footage'}
                    </span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-[#FDBA74]" />
                </button>
              )}

              <div>
                <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-400">
                  LOCUS Evidence Taxonomy
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {(['OBSERVED', 'DATABASE', 'INFERRED'] as EvidenceType[]).map(
                    (ev) => {
                      const style = EVIDENCE_BADGE_STYLE[ev];
                      return (
                        <span
                          key={ev}
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-0.5 font-mono text-[9.5px] font-semibold ${style.bg}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${style.dot}`}
                          />
                          <span>{style.label}</span>
                        </span>
                      );
                    }
                  )}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Signboard Crop & High-Resolution Multilingual OCR Modal */}
      <SignboardCropModal
        isOpen={isCropModalOpen}
        onClose={() => setIsCropModalOpen(false)}
        photoFile={cropTarget?.file ?? null}
        photoUrl={cropTarget?.url ?? null}
        photoName={cropTarget?.name ?? 'Storefront Photo'}
        defaultLangCode={selectedLangCode}
        onApplyResult={handleApplyManualCropResult}
      />
    </section>
  );
};
