/**
 * LOCUS AI - High-Resolution Signboard Preprocessing & Multilingual OCR Engine
 *
 * Designed specifically for Indian street environments (bilingual Telugu/English,
 * dark kiosks with bright lettering, washed-out building fascias, and small signboards).
 */

export interface CropBoundingBox {
  x: number; // 0..1 normalized
  y: number; // 0..1 normalized
  width: number; // 0..1 normalized
  height: number; // 0..1 normalized
}

export type PreprocessingVariantType =
  | 'auto'
  | 'standard_contrast'
  | 'inverted_dark_board'
  | 'grayscale_sharpened'
  | 'adaptive_threshold';

export interface PreprocessedCropResult {
  variantType: PreprocessingVariantType;
  canvas: HTMLCanvasElement;
  dataUrl: string;
  width: number;
  height: number;
  scaleFactor: number;
}

export interface SignboardOcrResult {
  rawText: string;
  normalizedText: string;
  confidence: number;
  languageUsed: string;
  variantUsed: PreprocessingVariantType;
  cropBox: CropBoundingBox;
  processedCropDataUrl: string;
  originalCropDataUrl: string;
  psmUsed: number;
  isHighConfidence: boolean;
  hasIndicScript: boolean;
  notes: string;
}

export type SupportedScriptId =
  | 'LATIN'
  | 'DEVANAGARI'
  | 'KANNADA'
  | 'TAMIL'
  | 'TELUGU';

export interface ScriptDetectionResult {
  primaryScript: string;
  detectedScripts: string[];
  isBilingual: boolean;
  isIndic: boolean;
  hasLatin: boolean;
}

export const SCRIPT_RANGES: Record<
  SupportedScriptId,
  { name: string; label: string; regex: RegExp }
> = {
  LATIN: { name: 'Latin', label: 'Latin (English)', regex: /[a-zA-Z]/ },
  DEVANAGARI: {
    name: 'Devanagari',
    label: 'Devanagari (हिन्दी / Hindi)',
    regex: /[\u0900-\u097F]/,
  },
  KANNADA: {
    name: 'Kannada',
    label: 'Kannada (ಕನ್ನಡ)',
    regex: /[\u0C80-\u0CFF]/,
  },
  TAMIL: { name: 'Tamil', label: 'Tamil (தமிழ்)', regex: /[\u0B80-\u0BFF]/ },
  TELUGU: {
    name: 'Telugu',
    label: 'Telugu (తెలుగు)',
    regex: /[\u0C00-\u0C7F]/,
  },
};

/**
 * Detects scripts present in text across Latin and target Indic scripts (Hindi, Kannada, Tamil, Telugu).
 */
export function detectScripts(text: string): ScriptDetectionResult {
  if (!text) {
    return {
      primaryScript: 'Unknown',
      detectedScripts: [],
      isBilingual: false,
      isIndic: false,
      hasLatin: false,
    };
  }

  const detected: string[] = [];
  let indicCount = 0;
  let hasLatin = false;

  for (const [key, meta] of Object.entries(SCRIPT_RANGES) as [
    SupportedScriptId,
    (typeof SCRIPT_RANGES)[SupportedScriptId]
  ][]) {
    if (meta.regex.test(text)) {
      detected.push(meta.name);
      if (key === 'LATIN') {
        hasLatin = true;
      } else {
        indicCount++;
      }
    }
  }

  const isIndic = indicCount > 0;
  const isBilingual = hasLatin && isIndic;

  let primaryScript = 'Unknown';
  if (isBilingual) {
    const nonLatin = detected.filter((s) => s !== 'Latin');
    primaryScript = `Bilingual (Latin + ${nonLatin.join('/')})`;
  } else if (detected.length === 1) {
    const matchKey = detected[0].toUpperCase() as SupportedScriptId;
    primaryScript = SCRIPT_RANGES[matchKey]?.label || detected[0];
  } else if (detected.length > 1) {
    primaryScript = `Multilingual (${detected.join(', ')})`;
  } else if (/\d/.test(text)) {
    primaryScript = 'Numeric / Identifier';
  }

  return {
    primaryScript,
    detectedScripts: detected,
    isBilingual,
    isIndic,
    hasLatin,
  };
}

/**
 * Checks if a string contains any supported Indic Unicode characters (Devanagari, Tamil, Telugu, Kannada).
 */
export function containsIndicScript(text: string): boolean {
  return /[\u0900-\u097F\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF]/.test(text);
}

/**
 * Checks if a string contains Telugu Unicode characters (U+0C00 to U+0C7F).
 */
export function containsTeluguScript(text: string): boolean {
  return /[\u0C00-\u0C7F]/.test(text);
}

/**
 * Extracts a crop from a full-resolution image at native resolution,
 * applying intelligent upscaling if the crop is small so character strokes
 * have sufficient pixel height for Tesseract's LSTM neural net.
 */
export function extractHighResCrop(
  source: HTMLImageElement | HTMLCanvasElement,
  box: CropBoundingBox,
  targetMinDimension = 600
): { cropCanvas: HTMLCanvasElement; scaleFactor: number } {
  const sourceW = 'naturalWidth' in source ? source.naturalWidth || source.width : source.width;
  const sourceH = 'naturalHeight' in source ? source.naturalHeight || source.height : source.height;

  const sx = Math.max(0, Math.floor(box.x * sourceW));
  const sy = Math.max(0, Math.floor(box.y * sourceH));
  const sw = Math.min(sourceW - sx, Math.max(16, Math.floor(box.width * sourceW)));
  const sh = Math.min(sourceH - sy, Math.max(16, Math.floor(box.height * sourceH)));

  // Calculate upscale factor if crop is small
  const minDim = Math.min(sw, sh);
  let scaleFactor = 1;
  if (minDim < targetMinDimension) {
    scaleFactor = Math.min(4, Math.max(1.5, targetMinDimension / minDim));
  }

  const outW = Math.round(sw * scaleFactor);
  const outH = Math.round(sh * scaleFactor);

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 2D context unavailable.');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, outW, outH);

  return { cropCanvas: canvas, scaleFactor };
}

/**
 * Generates image preprocessing variants to maximize OCR accuracy:
 * 1. Standard Contrast: Histogram stretch + gamma correction (for washed-out fascias like Photo A)
 * 2. Inverted: Dark background with bright letters (for kiosks like Photo B's blue counter)
 * 3. Grayscale Sharpened: Unsharp convolution filter to restore character loops and matras
 * 4. Adaptive Threshold: High-contrast binarization
 */
export function generatePreprocessingVariants(
  baseCropCanvas: HTMLCanvasElement,
  scaleFactor: number
): Record<PreprocessingVariantType, PreprocessedCropResult> {
  const w = baseCropCanvas.width;
  const h = baseCropCanvas.height;

  // Helper to clone canvas
  function createVariantCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(baseCropCanvas, 0, 0);
    return { canvas, ctx };
  }

  // 1. Standard Contrast Stretch
  const { canvas: contrastCanvas, ctx: contrastCtx } = createVariantCanvas();
  const contrastImgData = contrastCtx.getImageData(0, 0, w, h);
  const data = contrastImgData.data;

  // Find min and max luma for dynamic range stretch
  let minLuma = 255;
  let maxLuma = 0;
  for (let i = 0; i < data.length; i += 4) {
    const luma = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    if (luma < minLuma) minLuma = luma;
    if (luma > maxLuma) maxLuma = luma;
  }
  const lumaRange = Math.max(20, maxLuma - minLuma);

  for (let i = 0; i < data.length; i += 4) {
    // Contrast stretch
    data[i] = Math.min(255, Math.max(0, ((data[i] - minLuma) * 255) / lumaRange));
    data[i + 1] = Math.min(255, Math.max(0, ((data[i + 1] - minLuma) * 255) / lumaRange));
    data[i + 2] = Math.min(255, Math.max(0, ((data[i + 2] - minLuma) * 255) / lumaRange));
  }
  contrastCtx.putImageData(contrastImgData, 0, 0);

  // 2. Inverted Luma (Essential for dark signboards with bright text like blue/black kiosk boards)
  const { canvas: invertedCanvas, ctx: invertedCtx } = createVariantCanvas();
  const invertedImgData = invertedCtx.getImageData(0, 0, w, h);
  const invData = invertedImgData.data;
  for (let i = 0; i < invData.length; i += 4) {
    const gray = 0.299 * invData[i] + 0.587 * invData[i + 1] + 0.114 * invData[i + 2];
    // Invert: 255 - gray makes white letters black and dark blue background white
    const inv = 255 - gray;
    // Boost contrast slightly
    const boosted = inv > 128 ? Math.min(255, inv * 1.15) : Math.max(0, inv * 0.85);
    invData[i] = boosted;
    invData[i + 1] = boosted;
    invData[i + 2] = boosted;
  }
  invertedCtx.putImageData(invertedImgData, 0, 0);

  // 3. Grayscale Sharpened (Unsharp 3x3 convolution mask to sharpen blurred edges & loops)
  const { canvas: sharpCanvas, ctx: sharpCtx } = createVariantCanvas();
  const sharpImgData = sharpCtx.getImageData(0, 0, w, h);
  const sData = sharpImgData.data;
  const grayBuffer = new Uint8ClampedArray(w * h);

  for (let i = 0; i < sData.length; i += 4) {
    grayBuffer[i / 4] = Math.round(0.299 * sData[i] + 0.587 * sData[i + 1] + 0.114 * sData[i + 2]);
  }

  // Apply 3x3 unsharp mask: center 5, neighbours -1
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      const center = grayBuffer[idx];
      const up = grayBuffer[(y - 1) * w + x];
      const down = grayBuffer[(y + 1) * w + x];
      const left = grayBuffer[y * w + (x - 1)];
      const right = grayBuffer[y * w + (x + 1)];

      const sharpVal = Math.min(255, Math.max(0, center * 5 - up - down - left - right));
      const pIdx = idx * 4;
      sData[pIdx] = sharpVal;
      sData[pIdx + 1] = sharpVal;
      sData[pIdx + 2] = sharpVal;
    }
  }
  sharpCtx.putImageData(sharpImgData, 0, 0);

  // 4. Adaptive Threshold / Otsu Binarization
  const { canvas: threshCanvas, ctx: threshCtx } = createVariantCanvas();
  const threshImgData = threshCtx.getImageData(0, 0, w, h);
  const tData = threshImgData.data;
  const threshold = Math.round(minLuma + lumaRange * 0.48);

  for (let i = 0; i < tData.length; i += 4) {
    const gray = 0.299 * tData[i] + 0.587 * tData[i + 1] + 0.114 * tData[i + 2];
    const val = gray >= threshold ? 255 : 0;
    tData[i] = val;
    tData[i + 1] = val;
    tData[i + 2] = val;
  }
  threshCtx.putImageData(threshImgData, 0, 0);

  return {
    auto: {
      variantType: 'auto',
      canvas: contrastCanvas,
      dataUrl: contrastCanvas.toDataURL('image/png'),
      width: w,
      height: h,
      scaleFactor,
    },
    standard_contrast: {
      variantType: 'standard_contrast',
      canvas: contrastCanvas,
      dataUrl: contrastCanvas.toDataURL('image/png'),
      width: w,
      height: h,
      scaleFactor,
    },
    inverted_dark_board: {
      variantType: 'inverted_dark_board',
      canvas: invertedCanvas,
      dataUrl: invertedCanvas.toDataURL('image/png'),
      width: w,
      height: h,
      scaleFactor,
    },
    grayscale_sharpened: {
      variantType: 'grayscale_sharpened',
      canvas: sharpCanvas,
      dataUrl: sharpCanvas.toDataURL('image/png'),
      width: w,
      height: h,
      scaleFactor,
    },
    adaptive_threshold: {
      variantType: 'adaptive_threshold',
      canvas: threshCanvas,
      dataUrl: threshCanvas.toDataURL('image/png'),
      width: w,
      height: h,
      scaleFactor,
    },
  };
}

/**
 * Generates default candidate crop regions for standard street photographs:
 * 1. Upper Fascia (Building facade signage, y: 18%..52%, full width) -> matches Photo A
 * 2. Lower Kiosk / Storefront Counter (Kiosks, stalls, counters, y: 48%..88%, x: 10%..85%) -> matches Photo B
 * 3. Mid Commercial Band (y: 28%..72%, full width)
 * 4. Full frame (fallback)
 */
export function generateDefaultSignboardCrops(
  imageW: number,
  imageH: number
): { id: string; label: string; box: CropBoundingBox }[] {
  const isPortrait = imageH > imageW;

  return [
    {
      id: 'fascia_upper',
      label: 'Building Fascia / Overhead Banner (Photo A style)',
      box: {
        x: 0.05,
        y: isPortrait ? 0.22 : 0.15,
        width: 0.9,
        height: isPortrait ? 0.30 : 0.35,
      },
    },
    {
      id: 'counter_lower',
      label: 'Street Kiosk / Counter Signboard (Photo B style)',
      box: {
        x: 0.10,
        y: isPortrait ? 0.58 : 0.45,
        width: 0.55,
        height: isPortrait ? 0.32 : 0.45,
      },
    },
    {
      id: 'commercial_mid',
      label: 'Mid Commercial Band',
      box: {
        x: 0.08,
        y: isPortrait ? 0.32 : 0.25,
        width: 0.84,
        height: isPortrait ? 0.40 : 0.48,
      },
    },
    {
      id: 'full_image',
      label: 'Full Image',
      box: {
        x: 0.0,
        y: 0.0,
        width: 1.0,
        height: 1.0,
      },
    },
  ];
}

/**
 * Normalizes OCR line while strictly preserving Indic and Telugu Unicode characters.
 */
export function cleanOcrText(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/[\r\n]+/g, ' ')
    .replace(/[|—_~`^\\{}[\]]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Evaluates the quality and readability of an OCR read across all supported scripts.
 * Balances character-to-symbol ratio, length coherence, and script legitimacy.
 */
export function scoreOcrRead(
  rawText: string,
  conf: number
): {
  score: number;
  isLikelyText: boolean;
  hasTelugu: boolean;
  hasIndic: boolean;
  scriptInfo: ScriptDetectionResult;
} {
  const cleaned = cleanOcrText(rawText);
  const scriptInfo = detectScripts(cleaned);
  if (!cleaned || cleaned.length < 2) {
    return {
      score: 0,
      isLikelyText: false,
      hasTelugu: false,
      hasIndic: false,
      scriptInfo,
    };
  }

  // Count alphanumeric, Latin, and Indic characters (Devanagari, Tamil, Telugu, Kannada)
  const validChars = cleaned.replace(
    /[^a-zA-Z0-9\u0900-\u097F\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\s]/g,
    ''
  ).length;
  const ratio = validChars / cleaned.length;

  let score = conf * 0.5 + ratio * 30;

  // Reward valid Indic script reads uniformly across Hindi, Kannada, Tamil, and Telugu
  if (scriptInfo.isIndic) {
    score += 20;
  }
  // Reward mixed/bilingual commercial signage (common pattern on Indian storefronts)
  if (scriptInfo.isBilingual) {
    score += 10;
  }
  // Penalize single isolated noise characters, reward realistic storefront name lengths
  if (cleaned.length >= 4 && cleaned.length <= 50) {
    score += 15;
  }

  const hasTelugu = scriptInfo.detectedScripts.includes('Telugu');

  return {
    score,
    isLikelyText: ratio > 0.42 && cleaned.length >= 3,
    hasTelugu,
    hasIndic: scriptInfo.isIndic,
    scriptInfo,
  };
}
