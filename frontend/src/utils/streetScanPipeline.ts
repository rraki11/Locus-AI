import { NormalizedBaselinePlace } from '../data/marketDiscoveryData';
import {
  NormalizedFrameObservation,
  RawCocoObjectDetection,
  RawFrameOcrRead,
  StreetScanFuseRequest,
  StreetScanFusionResponse,
  StreetScanPipelineStage,
} from '../types/streetScan';

export interface SampledFramePreview {
  frame_index: number;
  timestamp_sec: number;
  sharpness_score: number;
  ocr_sampled: boolean;
  preview_data_url: string;
  objects: RawCocoObjectDetection[];
  ocr_reads: RawFrameOcrRead[];
}

export interface StreetScanProgressUpdate {
  stage: StreetScanPipelineStage;
  statusText: string;
  progressPct: number;
}

const RELEVANT_COCO_CLASSES = new Set([
  'person',
  'car',
  'motorcycle',
  'bicycle',
  'bus',
  'truck',
  'chair',
  'bench',
  'dining table',
  'umbrella',
  'potted plant',
  'backpack',
  'handbag',
  'bottle',
  'cup',
]);

let cachedCocoModelPromise: Promise<any> | null = null;

async function getCocoDetectorModel(): Promise<any> {
  if (!cachedCocoModelPromise) {
    cachedCocoModelPromise = (async () => {
      const tf = await import('@tensorflow/tfjs');
      await tf.ready();
      const cocoSsd = await import('@tensorflow-models/coco-ssd');
      return cocoSsd.load({ base: 'lite_mobilenet_v2' });
    })();
  }
  return cachedCocoModelPromise;
}

/**
 * Prewarms the COCO-SSD model in the background when View 2 mounts.
 */
export function prewarmStreetScanModels(): void {
  void getCocoDetectorModel().catch(() => {
    // Graceful no-op if WebGL/TFJS is unavailable
  });
}

/**
 * Computes a fast gradient sharpness & upper-storefront text-contrast score on a 640px canvas.
 */
function computeFrameSharpnessAndTextLikelihood(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): { sharpness: number; upperContrast: number } {
  const imageData = ctx.getImageData(0, 0, width, height).data;
  let totalGrad = 0;
  let upperGrad = 0;
  let samples = 0;
  let upperSamples = 0;
  const upperBandLimitY = Math.floor(height * 0.62);

  // Sample every 4th pixel for fast execution
  for (let y = 2; y < height - 2; y += 4) {
    for (let x = 2; x < width - 2; x += 4) {
      const idx = (y * width + x) * 4;
      const idxRight = (y * width + (x + 2)) * 4;
      const idxDown = ((y + 2) * width + x) * 4;

      const luma =
        imageData[idx] * 0.299 +
        imageData[idx + 1] * 0.587 +
        imageData[idx + 2] * 0.114;
      const lumaRight =
        imageData[idxRight] * 0.299 +
        imageData[idxRight + 1] * 0.587 +
        imageData[idxRight + 2] * 0.114;
      const lumaDown =
        imageData[idxDown] * 0.299 +
        imageData[idxDown + 1] * 0.587 +
        imageData[idxDown + 2] * 0.114;

      const grad = Math.abs(luma - lumaRight) + Math.abs(luma - lumaDown);
      totalGrad += grad;
      samples += 1;

      if (y <= upperBandLimitY) {
        upperGrad += grad;
        upperSamples += 1;
      }
    }
  }

  return {
    sharpness: Number((totalGrad / Math.max(1, samples)).toFixed(2)),
    upperContrast: Number((upperGrad / Math.max(1, upperSamples)).toFixed(2)),
  };
}

function seekVideoElement(
  video: HTMLVideoElement,
  timeSec: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      resolve();
    }, 2500);

    const onSeeked = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error('Video seek failed'));
    };
    const cleanup = () => {
      window.clearTimeout(timeout);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
    };

    video.addEventListener('seeked', onSeeked, { once: true });
    video.addEventListener('error', onError, { once: true });
    video.currentTime = timeSec;
  });
}

/**
 * Normalizes an OCR line for matching and filtering.
 *
 * Preserves Unicode scripts (Telugu U+0C00–U+0C7F, Devanagari, etc.)
 * by only stripping control characters and OCR noise punctuation —
 * NOT stripping all non-ASCII. Latin normalization (lowercase) is
 * applied where possible; other scripts are left as-is.
 */
function normalizeOcrLineClient(raw: string): string {
  return raw
    // Collapse whitespace control chars
    .replace(/[\r\n\t]+/g, ' ')
    // Strip pure punctuation/symbol noise but keep letters (any script), digits, &, ', -
    // Use Unicode-aware approach: strip chars that are not letter, digit, or kept punctuation
    .replace(/[^\p{L}\p{N}&'\-\s]/gu, ' ')
    // Collapse runs of spaces
    .replace(/\s+/g, ' ')
    .trim()
    // Lowercase only the ASCII/Latin portion (toLocaleLowerCase is safe for all scripts)
    .toLocaleLowerCase();
}

/**
 * Conservative OCR line usability filter — rejects empty, pure-noise, and
 * unusably short results WITHOUT requiring Latin characters.
 *
 * Rules (all must pass):
 *   1. Raw text must have at least 2 non-whitespace characters.
 *   2. Normalised text must be at least 3 characters (post-cleanup).
 *   3. Must not be pure digits / price / phone patterns.
 *   4. Must not be single-character repetition (OCR artefact like "llll").
 *   5. Must contain at least one "letter" codepoint (any Unicode script).
 *
 * Deliberately does NOT check for Latin vowels or Latin character sequences,
 * so valid Telugu, Devanagari, or other non-Latin signboard text is preserved.
 */
function isOcrLineUsable(rawText: string, normalizedText: string): boolean {
  // Rule 1: at least 2 non-whitespace chars in raw
  if (rawText.replace(/\s+/g, '').length < 2) return false;

  // Rule 2: normalised text at least 3 chars
  if (normalizedText.length < 3) return false;

  // Rule 5: must contain at least one Unicode letter (any script)
  // \p{L} matches letters in any Unicode script including Telugu, Devanagari, etc.
  if (!/\p{L}/u.test(normalizedText)) return false;

  // Rule 3a: reject pure-digit strings (e.g. "1234567890", "Rs 240")
  const letterCount = (normalizedText.match(/\p{L}/gu) || []).length;
  const digitCount = (normalizedText.match(/\d/g) || []).length;
  if (letterCount === 0 || digitCount > letterCount * 2) return false;

  // Rule 3b: reject strings that look like phone numbers or Indian vehicle plates
  const compact = normalizedText.replace(/\s+/g, '');
  if (/^\+?[\d\s\-]{7,}$/.test(compact)) return false;
  if (/^[a-z]{2}\d{1,2}[a-z]{1,3}\d{3,4}$/i.test(compact)) return false;

  // Rule 4: reject single-char repetition artefacts (e.g. "iiii", "llll")
  if (/^(.)\1{3,}$/.test(compact)) return false;

  // Rule extra: reject strings whose entire content is spaces/dashes/punctuation
  if (/^[\s\-_.,;:!?'"()\[\]{}|/\\]+$/.test(normalizedText)) return false;

  return true;
}

/**
 * Selects the top 5–8 highest-value keyframes for OCR based on:
 * - frame sharpness (skipping motion blur)
 * - upper signboard contrast density
 * - COCO street activity context
 * - minimum temporal separation so the entire video duration is represented
 */
function selectHighValueOcrFrameIndices(
  frames: {
    frame_index: number;
    timestamp_sec: number;
    sharpness_score: number;
    upper_contrast: number;
    objects: RawCocoObjectDetection[];
  }[],
  maxKeyframes = 7
): Set<number> {
  if (frames.length <= maxKeyframes) {
    return new Set(frames.map((f) => f.frame_index));
  }

  const scored = frames.map((f) => {
    const activityBonus = Math.min(12, f.objects.length * 2.2);
    const valueScore =
      f.sharpness_score * 0.55 + f.upper_contrast * 0.35 + activityBonus;
    return { ...f, valueScore };
  });

  scored.sort((a, b) => b.valueScore - a.valueScore);

  const selectedIndices = new Set<number>();
  const selectedTimestamps: number[] = [];

  // First pass: pick high-value frames spaced at least 1.8s apart
  for (const candidate of scored) {
    if (selectedIndices.size >= maxKeyframes) break;
    const tooClose = selectedTimestamps.some(
      (t) => Math.abs(t - candidate.timestamp_sec) < 1.8
    );
    if (!tooClose) {
      selectedIndices.add(candidate.frame_index);
      selectedTimestamps.push(candidate.timestamp_sec);
    }
  }

  // Fill up to min(6, frames.length) if temporal spacing was too strict on a very short video
  for (const candidate of scored) {
    if (selectedIndices.size >= Math.min(6, frames.length)) break;
    selectedIndices.add(candidate.frame_index);
  }

  return selectedIndices;
}

/**
 * Runs the end-to-end Live Video Street Scan pipeline in the browser and fuses via /api/street-scan/fuse.
 */
export async function runLiveVideoStreetScan(params: {
  file: File;
  candidate: {
    latitude: number;
    longitude: number;
    state: string;
    city: string;
    local_area: string;
    label: string;
  };
  businessType: string;
  baselinePlaces300m: NormalizedBaselinePlace[];
  baselinePlacesLocal: NormalizedBaselinePlace[];
  onProgress: (update: StreetScanProgressUpdate) => void;
}): Promise<{
  fusionResponse: StreetScanFusionResponse;
  framePreviews: SampledFramePreview[];
}> {
  const {
    file,
    candidate,
    businessType,
    baselinePlaces300m,
    baselinePlacesLocal,
    onProgress,
  } = params;

  if (!file || file.size === 0) {
    throw new Error('Selected video file is empty (0 bytes).');
  }

  onProgress({
    stage: 'UPLOADING',
    statusText: `Loading ${file.name}...`,
    progressPct: 8,
  });

  const videoUrl = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.src = videoUrl;
  video.muted = true;
  video.playsInline = true;
  video.crossOrigin = 'anonymous';

  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(
        () => reject(new Error('Timed out reading video metadata')),
        8000
      );
      video.onloadedmetadata = () => {
        window.clearTimeout(timeout);
        resolve();
      };
      video.onerror = () => {
        window.clearTimeout(timeout);
        reject(new Error('Unsupported or corrupted video file'));
      };
    });

    const rawDuration =
      Number.isFinite(video.duration) && video.duration > 0
        ? video.duration
        : 12;
    const durationSec = Math.min(rawDuration, 90);
    const nativeW = video.videoWidth || 1280;
    const nativeH = video.videoHeight || 720;

    // Downscale to max 640px width for fast, memory-safe frame extraction
    const scale = Math.min(1, 640 / nativeW);
    const targetW = Math.max(320, Math.round(nativeW * scale));
    const targetH = Math.max(180, Math.round(nativeH * scale));

    // Sample at ~1 FPS, capped at 24 frames max; handle very short videos (< 1s) gracefully
    const maxSampleFrames = 24;
    const sampleTimestamps: number[] = [];
    if (durationSec <= 1.2) {
      sampleTimestamps.push(Number(Math.min(0.1, durationSec * 0.25).toFixed(2)));
      if (durationSec >= 0.4) {
        sampleTimestamps.push(Number((durationSec * 0.65).toFixed(2)));
      }
    } else {
      const stepSec = Math.max(1.0, durationSec / maxSampleFrames);
      for (
        let t = 0.2;
        t < durationSec && sampleTimestamps.length < maxSampleFrames;
        t += stepSec
      ) {
        sampleTimestamps.push(Number(t.toFixed(2)));
      }
    }
    if (sampleTimestamps.length === 0) {
      sampleTimestamps.push(0);
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      throw new Error('Canvas 2D context unavailable');
    }

    interface ExtractedCanvasFrame {
      frame_index: number;
      timestamp_sec: number;
      sharpness_score: number;
      upper_contrast: number;
      preview_data_url: string;
      ocr_canvas_data_url: string;
      objects: RawCocoObjectDetection[];
      ocr_reads: RawFrameOcrRead[];
      ocr_sampled: boolean;
    }

    const extractedFrames: ExtractedCanvasFrame[] = [];

    // Create a secondary cropped canvas focusing on the upper 75% (signboard + storefront band) for cleaner OCR
    const ocrCropCanvas = document.createElement('canvas');
    const ocrCropHeight = Math.round(targetH * 0.75);
    ocrCropCanvas.width = targetW;
    ocrCropCanvas.height = ocrCropHeight;
    const ocrCropCtx = ocrCropCanvas.getContext('2d');

    for (let i = 0; i < sampleTimestamps.length; i += 1) {
      const ts = sampleTimestamps[i];
      onProgress({
        stage: 'EXTRACTING_FRAMES',
        statusText: `Extracting frame ${i + 1} of ${sampleTimestamps.length} (${ts.toFixed(1)}s)...`,
        progressPct: 12 + Math.round(((i + 1) / sampleTimestamps.length) * 20),
      });

      await seekVideoElement(video, ts);
      ctx.drawImage(video, 0, 0, targetW, targetH);

      const { sharpness, upperContrast } =
        computeFrameSharpnessAndTextLikelihood(ctx, targetW, targetH);

      if (ocrCropCtx) {
        ocrCropCtx.drawImage(
          canvas,
          0,
          0,
          targetW,
          ocrCropHeight,
          0,
          0,
          targetW,
          ocrCropHeight
        );
      }

      extractedFrames.push({
        frame_index: i + 1,
        timestamp_sec: ts,
        sharpness_score: sharpness,
        upper_contrast: upperContrast,
        preview_data_url: canvas.toDataURL('image/jpeg', 0.68),
        ocr_canvas_data_url: ocrCropCtx
          ? ocrCropCanvas.toDataURL('image/jpeg', 0.85)
          : canvas.toDataURL('image/jpeg', 0.85),
        objects: [],
        ocr_reads: [],
        ocr_sampled: false,
      });
    }

    // Step 3: COCO Object Detection across sampled frames
    onProgress({
      stage: 'DETECTING_OBJECTS',
      statusText: 'Running COCO object detection on extracted frames...',
      progressPct: 38,
    });

    let cocoModel: any = null;
    try {
      cocoModel = await getCocoDetectorModel();
    } catch {
      cocoModel = null;
    }

    if (cocoModel) {
      const probeImg = new Image();
      probeImg.width = targetW;
      probeImg.height = targetH;
      for (let i = 0; i < extractedFrames.length; i += 1) {
        const frame = extractedFrames[i];
        onProgress({
          stage: 'DETECTING_OBJECTS',
          statusText: `Detecting COCO objects in frame ${i + 1}/${extractedFrames.length}...`,
          progressPct:
            38 + Math.round(((i + 1) / extractedFrames.length) * 22),
        });

        await new Promise<void>((resolve) => {
          probeImg.onload = () => resolve();
          probeImg.onerror = () => resolve();
          probeImg.src = frame.preview_data_url;
        });

        try {
          const predictions: any[] = await cocoModel.detect(probeImg, 18, 0.35);
          frame.objects = predictions
            .filter(
              (p) =>
                p &&
                typeof p.class === 'string' &&
                RELEVANT_COCO_CLASSES.has(p.class.toLowerCase())
            )
            .map((p) => {
              const [bx, by, bw, bh] = Array.isArray(p.bbox)
                ? p.bbox
                : [0, 0, 0, 0];
              return {
                class_name: p.class.toLowerCase(),
                confidence: Number((p.score || 0.5).toFixed(2)),
                bbox: [
                  Number((bx / targetW).toFixed(3)),
                  Number((by / targetH).toFixed(3)),
                  Number((bw / targetW).toFixed(3)),
                  Number((bh / targetH).toFixed(3)),
                ],
              };
            });
        } catch {
          // Continue safely if a single frame fails detection
        }
      }
    }

    // Step 4: Select top 5–8 highest-value keyframes for Tesseract OCR
    const ocrTargetIndices = selectHighValueOcrFrameIndices(
      extractedFrames,
      7
    );
    const keyframesForOcr = extractedFrames.filter((f) =>
      ocrTargetIndices.has(f.frame_index)
    );

    onProgress({
      stage: 'READING_SIGNS',
      statusText: `Running OCR on ${keyframesForOcr.length} high-value keyframes...`,
      progressPct: 64,
    });

    try {
      const Tesseract = await import('tesseract.js');

      // ---------------------------------------------------------------------------
      // Language-data strategy for Tesseract.js v7
      //
      // Primary:  local /tessdata/ directory served from public/ (offline-safe, no
      //           CDN dependency).  Files: eng.traineddata.gz, tel.traineddata.gz
      //           Source: @tesseract.js-data/{eng,tel}@1.0.0 from jsDelivr, pinned.
      //
      // Fallback: jsDelivr CDN pinned to @tesseract.js-data/tel@1.0.0 / eng@1.0.0
      //           (the same source the Tesseract.js v7 worker uses by default).
      //
      // The langPath option tells the worker WHERE to fetch *.traineddata.gz from.
      // Worker URL pattern: {langPath}/{lang}/4.0.0/{lang}.traineddata.gz
      // Local files live at:  /tessdata/eng.traineddata.gz  (no subdirectory)
      //
      // Because the local files are flat (no /4.0.0/ sub-path), we set langPath to
      // the directory that contains them directly, i.e. the worker will try:
      //   /tessdata/tel.traineddata.gz   ← local flat path
      // But the worker appends /{lang}/4.0.0/{lang}.traineddata.gz, so we need a
      // different approach: pass the traineddata as a Blob/ArrayBuffer using the
      // Tesseract.js v7 Lang object API: { code: 'tel', data: ArrayBuffer }
      // This bypasses CDN entirely and is the only reliable way to use local files.
      // ---------------------------------------------------------------------------

      /**
       * Fetches a local traineddata.gz and decompresses it via DecompressionStream.
       * Returns the raw ArrayBuffer that Tesseract.js v7 accepts as `lang.data`.
       * Returns null if the asset is missing or DecompressionStream is unavailable.
       */
      async function fetchLocalTraineddata(lang: string): Promise<ArrayBuffer | null> {
        const localUrl = `/tessdata/${lang}.traineddata.gz`;
        try {
          const resp = await fetch(localUrl);
          if (!resp.ok) return null;

          // DecompressionStream is available in all modern browsers (Chrome 80+,
          // Firefox 113+, Safari 16.4+). Fall back to raw gzip if unavailable —
          // Tesseract.js v7 handles .gz buffers when gzip:true (the default).
          if (typeof DecompressionStream !== 'undefined') {
            const ds = new DecompressionStream('gzip');
            const decompressed = resp.body!.pipeThrough(ds);
            const reader = decompressed.getReader();
            const chunks: Uint8Array[] = [];
            let done = false;
            while (!done) {
              const { value, done: d } = await reader.read();
              if (value) chunks.push(value);
              done = d;
            }
            const total = chunks.reduce((n, c) => n + c.byteLength, 0);
            const out = new Uint8Array(total);
            let offset = 0;
            for (const chunk of chunks) {
              out.set(chunk, offset);
              offset += chunk.byteLength;
            }
            return out.buffer;
          }

          // DecompressionStream unavailable — return raw gzip buffer.
          // Tesseract.js v7 worker decompresses it internally when gzip:true.
          return await resp.arrayBuffer();
        } catch {
          return null;
        }
      }

      // --- Build worker with eng+tel, preferring local assets ---
      let worker: Awaited<ReturnType<typeof Tesseract.createWorker>> | null = null;
      let activeOcrLangs = 'eng+tel';
      let teluguLangStatus: 'local' | 'cdn' | 'unavailable' = 'unavailable';

      onProgress({
        stage: 'READING_SIGNS',
        statusText: 'Loading OCR language data (English + Telugu)...',
        progressPct: 64,
      });

      // Step 1: attempt to load both languages from local /tessdata/ assets.
      const [engBuf, telBuf] = await Promise.all([
        fetchLocalTraineddata('eng'),
        fetchLocalTraineddata('tel'),
      ]);

      if (engBuf && telBuf) {
        // Both local assets available — create worker with inline data (no network).
        try {
          worker = await Tesseract.createWorker(
            [
              { code: 'eng', data: engBuf },
              { code: 'tel', data: telBuf },
            ] as any,
          );
          teluguLangStatus = 'local';
        } catch {
          // Inline data API failed (older Tesseract.js build); fall through to CDN path.
          engBuf && (teluguLangStatus = 'unavailable');
          worker = null as any;
        }
      }

      // Step 2: if local load failed or files are missing, try CDN with explicit pins.
      if (!worker || teluguLangStatus === 'unavailable') {
        // langPath is set to the @tesseract.js-data CDN pinned to version 1.0.0.
        // The worker constructs: {langPath}/{lang}/4.0.0/{lang}.traineddata.gz
        // For eng+tel that becomes two separate fetches to the CDN.
        const pinnedLangPath =
          'https://cdn.jsdelivr.net/npm/@tesseract.js-data';
        try {
          worker = await Tesseract.createWorker('eng+tel', undefined, {
            langPath: pinnedLangPath,
            gzip: true,
          } as any);
          teluguLangStatus = 'cdn';
        } catch {
          // Telugu CDN fetch failed — fall back to English-only.
          activeOcrLangs = 'eng';
          teluguLangStatus = 'unavailable';
          try {
            if (engBuf) {
              worker = await Tesseract.createWorker(
                [{ code: 'eng', data: engBuf }] as any
              );
            } else {
              worker = await Tesseract.createWorker('eng', undefined, {
                langPath: pinnedLangPath,
                gzip: true,
              } as any);
            }
          } catch {
            // If even English fails, rethrow — caught by the outer try/catch which
            // continues the pipeline with COCO data only.
            throw new Error('OCR engine failed to initialise (both eng+tel and eng fallback failed)');
          }
        }
      }

      // Step 3: emit a structured onProgress status so the UI can display the warning.
      // We reuse the READING_SIGNS stage; the statusText encodes the lang status
      // in a way the UI can parse without a schema change.
      if (teluguLangStatus === 'unavailable') {
        onProgress({
          stage: 'READING_SIGNS',
          statusText:
            '__OCR_LANG_WARNING__: Telugu (tel) traineddata could not be loaded ' +
            '(local asset /tessdata/tel.traineddata.gz unreachable and CDN fetch failed). ' +
            'Only English is active. Telugu signboard text will NOT be recognised. ' +
            'Ensure the file is deployed under frontend/public/tessdata/ and the dev/prod server serves it.',
          progressPct: 64,
        });
      } else {
        onProgress({
          stage: 'READING_SIGNS',
          statusText:
            `OCR language data loaded: English + Telugu (${teluguLangStatus === 'local' ? 'local asset' : 'jsDelivr CDN'}).`,
          progressPct: 64,
        });
      }

      try {
        for (let k = 0; k < keyframesForOcr.length; k += 1) {
          const kf = keyframesForOcr[k];
          kf.ocr_sampled = true;
          onProgress({
            stage: 'READING_SIGNS',
            statusText: `Reading storefront signs on keyframe #${kf.frame_index} (${k + 1}/${keyframesForOcr.length}) [${activeOcrLangs}]...`,
            progressPct:
              64 + Math.round(((k + 1) / keyframesForOcr.length) * 20),
          });

          const result = await worker.recognize(
            kf.ocr_canvas_data_url,
            {},
            { blocks: true }
          );
          const pageData: any = result?.data;

          // Collect lines from pageData.lines or nested pageData.blocks
          const collectedLines: any[] = [];
          if (Array.isArray(pageData?.lines) && pageData.lines.length > 0) {
            collectedLines.push(...pageData.lines);
          } else if (Array.isArray(pageData?.blocks)) {
            for (const blk of pageData.blocks) {
              for (const para of blk?.paragraphs || []) {
                for (const ln of para?.lines || []) {
                  collectedLines.push(ln);
                }
              }
            }
          }

          if (collectedLines.length > 0) {
            for (const line of collectedLines) {
              const rawText = String(line?.text || '').trim();
              const normText = normalizeOcrLineClient(rawText);

              // --- Genuine engine confidence (no artificial floor clamp) ---
              // Tesseract returns 0–100. A value of 0 means the engine produced
              // no meaningful confidence (e.g. unrecognised script); we represent
              // that as null / "Confidence unavailable" downstream rather than
              // fabricating a 52% floor.
              const rawLineConf = line?.confidence;
              const rawPageConf = pageData?.confidence;
              const rawConf =
                typeof rawLineConf === 'number' && rawLineConf > 0
                  ? rawLineConf
                  : typeof rawPageConf === 'number' && rawPageConf > 0
                  ? rawPageConf
                  : null;
              // Normalise to 0..1 only when a real value is present.
              const conf: number | null =
                rawConf !== null
                  ? Number(Math.min(0.99, rawConf / 100).toFixed(2))
                  : null;

              // --- Conservative noise filter (Unicode-safe) ---
              // Reject: empty, whitespace-only, pure-digit/symbol noise, very short.
              // Do NOT reject on Latin-only presence — valid Telugu text has no
              // Latin chars and must not be discarded here.
              if (!isOcrLineUsable(rawText, normText)) {
                continue;
              }

              const bboxObj = line?.bbox;
              const bbox: [number, number, number, number] | undefined =
                bboxObj && typeof bboxObj.x0 === 'number'
                  ? [
                      Number((bboxObj.x0 / targetW).toFixed(3)),
                      Number((bboxObj.y0 / targetH).toFixed(3)),
                      Number(
                        ((bboxObj.x1 - bboxObj.x0) / targetW).toFixed(3)
                      ),
                      Number(
                        ((bboxObj.y1 - bboxObj.y0) / targetH).toFixed(3)
                      ),
                    ]
                  : undefined;
              kf.ocr_reads.push({
                raw_text: rawText,
                normalized_text: normText,
                // confidence is typed as number in RawFrameOcrRead; use 0 as the
                // sentinel for "unavailable" so the backend can distinguish it
                // from a genuine low-confidence read (backend checks conf < 0.48).
                // We deliberately do NOT clamp upward: 0 means unavailable.
                confidence: conf !== null ? conf : 0,
                bbox,
              });
            }
          } else if (typeof pageData?.text === 'string') {
            const rawLines = pageData.text
              .split(/\r?\n/)
              .map((s: string) => s.trim())
              .filter(Boolean);
            const rawPageConf = pageData?.confidence;
            const baseConf: number | null =
              typeof rawPageConf === 'number' && rawPageConf > 0
                ? Number(Math.min(0.98, rawPageConf / 100).toFixed(2))
                : null;
            for (const lineStr of rawLines) {
              const normText = normalizeOcrLineClient(lineStr);
              if (!isOcrLineUsable(lineStr, normText)) {
                continue;
              }
              kf.ocr_reads.push({
                raw_text: lineStr,
                normalized_text: normText,
                confidence: baseConf !== null ? baseConf : 0,
              });
            }
          }
        }
      } finally {
        await worker.terminate();
      }
    } catch {
      // OCR engine error is caught gracefully; pipeline still fuses COCO + any completed keyframes
    }

    // Step 5 & 6: Temporal Deduplication + Ground Truth Fusion via Backend
    onProgress({
      stage: 'DEDUPLICATING',
      statusText: 'Deduplicating multi-frame storefront reads...',
      progressPct: 88,
    });

    const normalizedFramesPayload: NormalizedFrameObservation[] =
      extractedFrames.map((f) => ({
        frame_index: f.frame_index,
        timestamp_sec: f.timestamp_sec,
        sharpness_score: f.sharpness_score,
        ocr_sampled: f.ocr_sampled,
        objects: f.objects,
        ocr_reads: f.ocr_reads,
      }));

    onProgress({
      stage: 'FUSING_EVIDENCE',
      statusText: 'Fusing 0–300m baseline against Street Scan observations...',
      progressPct: 94,
    });

    const fusePayload: StreetScanFuseRequest = {
      candidate,
      business_type: businessType,
      scan_mode: 'LIVE_UPLOAD',
      detector_engine: cocoModel
        ? 'COCO-SSD Object Detection (TensorFlow.js)'
        : 'Browser Frame Analyzer (COCO unavailable)',
      ocr_engine: 'Tesseract.js Keyframe OCR',
      video_metadata: {
        filename: file.name,
        duration_sec: Number(durationSec.toFixed(1)),
        width: targetW,
        height: targetH,
        sampled_fps: Number((extractedFrames.length / Math.max(1, durationSec)).toFixed(2)),
        frames_extracted: extractedFrames.length,
        ocr_keyframes_count: keyframesForOcr.length,
      },
      frames: normalizedFramesPayload,
      baseline_places_300m: baselinePlaces300m,
      baseline_places_local: baselinePlacesLocal,
    };

    const res = await fetch('/api/street-scan/fuse', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(fusePayload),
    });

    if (!res.ok) {
      throw new Error(`Fusion API returned ${res.status}`);
    }

    const fusionResponse = (await res.json()) as StreetScanFusionResponse;

    const framePreviews: SampledFramePreview[] = extractedFrames.map((f) => ({
      frame_index: f.frame_index,
      timestamp_sec: f.timestamp_sec,
      sharpness_score: f.sharpness_score,
      ocr_sampled: f.ocr_sampled,
      preview_data_url: f.preview_data_url,
      objects: f.objects,
      ocr_reads: f.ocr_reads,
    }));

    onProgress({
      stage: 'COMPLETE',
      statusText: 'Street Scan & Ground Truth Fusion complete',
      progressPct: 100,
    });

    return { fusionResponse, framePreviews };
  } finally {
    URL.revokeObjectURL(videoUrl);
  }
}

const DEMO_ADDITIONAL_SIGNALS_BY_CATEGORY: Record<string, string[]> = {
  Café: ['Kiosk Filter Coffee & Snacks', 'Roast & Co. Espresso Window', 'Morning Brew Artisan Bakehouse'],
  'QSR / Fast Casual': ['Street Wok & Roll Express', 'Tawa & Grill Counter', 'Midnight Momo & Shawarma Hub'],
  'Bakery / Dessert': ['OvenFresh Micro Patisserie', 'Cinnamon & Crumb Studio', 'Artisan Waffle & Gelato Bar'],
  'Fitness / Gym': ['CorePulse Functional Studio', 'IronBox Cross-Training Loft'],
  'Salon / Wellness': ['GlowLab Express Salon', 'Aura Skin & Hair Lounge'],
  'Retail Storefront': ['UrbanThread Concept Store', 'Craft & Curio Pop-up'],
  'Pharmacy / Diagnostic': ['MedQuick 24x7 Chemist', 'CarePlus Sample Collection Node'],
};

/**
 * Generates a realistic synthetic SVG keyframe preview for Calibrated Demo Mode,
 * clearly badged as CALIBRATED DEMO TELEMETRY so it is never mistaken for live camera footage.
 */
function createCalibratedDemoFrameSvgDataUrl(params: {
  frameIndex: number;
  timestampSec: number;
  localArea: string;
  signText?: string;
  objects: RawCocoObjectDetection[];
}): string {
  const { frameIndex, timestampSec, localArea, signText, objects } = params;
  const escapedArea = localArea.replace(/[<>&"']/g, '');
  const escapedSign = (signText || '').replace(/[<>&"']/g, '');

  const objRects = objects
    .map((o, idx) => {
      const [x, y, w, h] = o.bbox;
      const px = Math.round(x * 640);
      const py = Math.round(y * 360);
      const pw = Math.round(w * 640);
      const ph = Math.round(h * 360);
      const stroke =
        o.class_name === 'person'
          ? '#FB923C'
          : o.class_name === 'chair' || o.class_name === 'umbrella' || o.class_name === 'dining table'
          ? '#E879F9'
          : '#818CF8';
      return `<g key="${idx}">
        <rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="4" fill="none" stroke="${stroke}" stroke-width="2" stroke-dasharray="4 2" />
        <rect x="${px}" y="${Math.max(4, py - 18)}" width="${Math.min(130, o.class_name.length * 8 + 44)}" height="16" rx="3" fill="#060412" opacity="0.88" />
        <text x="${px + 5}" y="${Math.max(15, py - 6)}" fill="${stroke}" font-family="monospace" font-size="10">${o.class_name} ${Math.round(o.confidence * 100)}%</text>
      </g>`;
    })
    .join('');

  const signOverlay = escapedSign
    ? `<g>
        <rect x="130" y="54" width="380" height="58" rx="8" fill="#0B0720" stroke="#10B981" stroke-width="2.2" />
        <text x="320" y="88" text-anchor="middle" fill="#ECFDF5" font-family="sans-serif" font-weight="700" font-size="19">${escapedSign}</text>
        <rect x="130" y="34" width="168" height="17" rx="4" fill="#064E3B" />
        <text x="138" y="46" fill="#6EE7B7" font-family="monospace" font-size="10">OCR KEYFRAME READ</text>
      </g>`
    : '';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#060412" />
        <stop offset="55%" stop-color="#110B29" />
        <stop offset="100%" stop-color="#1D1033" />
      </linearGradient>
    </defs>
    <rect width="640" height="360" fill="url(#bg)" />
    <line x1="0" y1="250" x2="640" y2="250" stroke="rgba(168,85,247,0.22)" stroke-width="1" />
    <line x1="80" y1="360" x2="260" y2="250" stroke="rgba(129,140,248,0.18)" stroke-width="1.5" />
    <line x1="560" y1="360" x2="380" y2="250" stroke="rgba(251,146,60,0.18)" stroke-width="1.5" />
    <rect x="16" y="14" width="275" height="22" rx="5" fill="rgba(15,10,34,0.9)" stroke="rgba(232,121,249,0.4)" />
    <text x="26" y="29" fill="#F0ABFC" font-family="monospace" font-size="11">CALIBRATED DEMO · FRAME #${String(frameIndex).padStart(2, '0')} (${timestampSec.toFixed(1)}s)</text>
    <text x="620" y="29" text-anchor="end" fill="#94A3B8" font-family="monospace" font-size="11">${escapedArea} (0–300m)</text>
    ${signOverlay}
    ${objRects}
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Explicitly labeled Calibrated Demo Street Scan that sends deterministic multi-frame observations
 * (including repeated consecutive frame reads for temporal deduplication) to /api/street-scan/fuse.
 */
export async function runCalibratedDemoStreetScan(params: {
  candidate: {
    latitude: number;
    longitude: number;
    state: string;
    city: string;
    local_area: string;
    label: string;
  };
  businessType: string;
  baselinePlaces300m: NormalizedBaselinePlace[];
  baselinePlacesLocal: NormalizedBaselinePlace[];
  onProgress: (update: StreetScanProgressUpdate) => void;
}): Promise<{
  fusionResponse: StreetScanFusionResponse;
  framePreviews: SampledFramePreview[];
}> {
  const {
    candidate,
    businessType,
    baselinePlaces300m,
    baselinePlacesLocal,
    onProgress,
  } = params;

  onProgress({
    stage: 'EXTRACTING_FRAMES',
    statusText: 'Loading calibrated 0–300m demo street sequence (12 frames @ 1 FPS)...',
    progressPct: 25,
  });
  await new Promise((r) => window.setTimeout(r, 180));

  // Take up to 3 actual 0-300m baseline places (so matched count reflects real Page 3 baseline!)
  const matchedTargets = baselinePlaces300m.slice(
    0,
    Math.min(3, baselinePlaces300m.length)
  );
  const additionalPool =
    DEMO_ADDITIONAL_SIGNALS_BY_CATEGORY[businessType] ||
    DEMO_ADDITIONAL_SIGNALS_BY_CATEGORY['Café'];
  const additionalTargets = additionalPool.slice(0, 2);

  // Build 12 frames at 1 FPS where the same storefront appears across consecutive frames
  // so the backend temporal deduplicator collapses them into single entities.
  const signByFrame = new Map<number, { text: string; conf: number }>();

  if (matchedTargets[0]) {
    signByFrame.set(1, { text: matchedTargets[0].business_name, conf: 0.89 });
    signByFrame.set(2, {
      text: matchedTargets[0].business_name.toUpperCase(),
      conf: 0.93,
    });
  }
  if (additionalTargets[0]) {
    signByFrame.set(4, { text: additionalTargets[0], conf: 0.86 });
    signByFrame.set(5, { text: additionalTargets[0], conf: 0.91 });
  }
  if (matchedTargets[1]) {
    signByFrame.set(7, { text: matchedTargets[1].business_name, conf: 0.88 });
    signByFrame.set(8, { text: matchedTargets[1].business_name, conf: 0.94 });
  }
  if (additionalTargets[1]) {
    signByFrame.set(10, { text: additionalTargets[1], conf: 0.87 });
  }
  if (matchedTargets[2]) {
    signByFrame.set(11, { text: matchedTargets[2].business_name, conf: 0.90 });
    signByFrame.set(12, { text: matchedTargets[2].business_name, conf: 0.92 });
  }

  onProgress({
    stage: 'DETECTING_OBJECTS',
    statusText: 'Simulating COCO object & activity telemetry...',
    progressPct: 55,
  });
  await new Promise((r) => window.setTimeout(r, 180));

  const frames: NormalizedFrameObservation[] = [];
  const framePreviews: SampledFramePreview[] = [];

  for (let i = 1; i <= 12; i += 1) {
    const ts = i * 2.5;
    const signHit = signByFrame.get(i);
    const objects: RawCocoObjectDetection[] = [
      {
        class_name: 'person',
        confidence: 0.88,
        bbox: [0.18, 0.52, 0.11, 0.34],
      },
      {
        class_name: 'person',
        confidence: 0.82,
        bbox: [0.34, 0.54, 0.1, 0.32],
      },
      ...(i % 2 === 0
        ? [
            {
              class_name: 'motorcycle',
              confidence: 0.85,
              bbox: [0.64, 0.58, 0.16, 0.26] as [number, number, number, number],
            },
            {
              class_name: 'chair',
              confidence: 0.76,
              bbox: [0.46, 0.62, 0.09, 0.18] as [number, number, number, number],
            },
          ]
        : [
            {
              class_name: 'car',
              confidence: 0.91,
              bbox: [0.68, 0.54, 0.22, 0.28] as [number, number, number, number],
            },
          ]),
      ...(i % 3 === 0
        ? [
            {
              class_name: 'umbrella',
              confidence: 0.79,
              bbox: [0.24, 0.36, 0.18, 0.18] as [number, number, number, number],
            },
          ]
        : []),
    ];

    const ocrReads: RawFrameOcrRead[] = signHit
      ? [
          {
            raw_text: signHit.text,
            normalized_text: normalizeOcrLineClient(signHit.text),
            confidence: signHit.conf,
            bbox: [0.2, 0.15, 0.59, 0.16],
          },
        ]
      : [];

    const obs: NormalizedFrameObservation = {
      frame_index: i,
      timestamp_sec: ts,
      sharpness_score: Number((18.4 + (i % 4) * 2.1).toFixed(2)),
      ocr_sampled: Boolean(signHit),
      objects,
      ocr_reads: ocrReads,
    };

    frames.push(obs);
    framePreviews.push({
      ...obs,
      preview_data_url: createCalibratedDemoFrameSvgDataUrl({
        frameIndex: i,
        timestampSec: ts,
        localArea: candidate.local_area || candidate.city || candidate.label,
        signText: signHit?.text,
        objects,
      }),
    });
  }

  onProgress({
    stage: 'FUSING_EVIDENCE',
    statusText: 'Deduplicating multi-frame reads & fusing with 0–300m baseline...',
    progressPct: 86,
  });

  const fusePayload: StreetScanFuseRequest = {
    candidate,
    business_type: businessType,
    scan_mode: 'CALIBRATED_DEMO',
    detector_engine: 'Calibrated Demo COCO Telemetry',
    ocr_engine: 'Calibrated Demo Signboard OCR',
    video_metadata: {
      filename: `calibrated-demo-${(
        candidate.local_area ||
        candidate.city ||
        'corridor'
      )
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')}.mp4`,
      duration_sec: 30,
      width: 640,
      height: 360,
      sampled_fps: 0.4,
      frames_extracted: frames.length,
      ocr_keyframes_count: frames.filter((f) => f.ocr_sampled).length,
    },
    frames,
    baseline_places_300m: baselinePlaces300m,
    baseline_places_local: baselinePlacesLocal,
  };

  const res = await fetch('/api/street-scan/fuse', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(fusePayload),
  });

  if (!res.ok) {
    throw new Error(`Fusion API returned ${res.status}`);
  }

  const fusionResponse = (await res.json()) as StreetScanFusionResponse;

  onProgress({
    stage: 'COMPLETE',
    statusText: 'Calibrated Demo Street Scan complete',
    progressPct: 100,
  });

  return { fusionResponse, framePreviews };
}
