import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Crop,
  Globe,
  Loader2,
  Sliders,
  Sparkles,
  X,
  ZoomIn,
} from 'lucide-react';
import {
  cleanOcrText,
  CropBoundingBox,
  detectScripts,
  extractHighResCrop,
  generateDefaultSignboardCrops,
  generatePreprocessingVariants,
  PreprocessingVariantType,
  scoreOcrRead,
} from '../../utils/signboardOcrEngine';
import {
  initMultilingualTesseractWorker,
  SUPPORTED_OCR_LANGUAGES,
} from '../../utils/streetScanPipeline';

export interface SignboardCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  photoFile: File | null;
  photoUrl: string | null;
  photoName: string;
  defaultLangCode?: string;
  onApplyResult: (result: {
    rawText: string;
    normalizedName: string;
    confidence: number;
    language: string;
    variantUsed: string;
    cropDataUrl: string;
  }) => void;
}

export const SignboardCropModal: React.FC<SignboardCropModalProps> = ({
  isOpen,
  onClose,
  photoFile: _photoFile,
  photoUrl,
  photoName,
  defaultLangCode = 'eng+tel',
  onApplyResult,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Crop box in 0..1 normalized coordinates
  const [cropBox, setCropBox] = useState<CropBoundingBox>({
    x: 0.1,
    y: 0.25,
    width: 0.8,
    height: 0.35,
  });

  const [selectedLang, setSelectedLang] = useState<string>(defaultLangCode);
  const [selectedVariant, setSelectedVariant] =
    useState<PreprocessingVariantType>('auto');

  // Preprocessed crop preview
  const [originalCropPreview, setOriginalCropPreview] = useState<string | null>(
    null
  );
  const [processedCropPreview, setProcessedCropPreview] = useState<string | null>(
    null
  );
  const [cropDimensions, setCropDimensions] = useState<{
    w: number;
    h: number;
    scale: number;
  }>({ w: 0, h: 0, scale: 1 });

  // OCR state
  const [isOcrRunning, setIsOcrRunning] = useState<boolean>(false);
  const [rawOcrText, setRawOcrText] = useState<string>('');
  const [editableName, setEditableName] = useState<string>('');
  const [ocrConfidence, setOcrConfidence] = useState<number | null>(null);
  const [variantReport, setVariantReport] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Mouse drag state for interactive canvas cropping
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(
    null
  );

  // Reset or initialize crop when modal opens or photo changes
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setRawOcrText('');
      setEditableName('');
      setOcrConfidence(null);
      setVariantReport('');
      setSelectedLang(defaultLangCode);
    }
  }, [isOpen, defaultLangCode]);

  // Update processed crop previews whenever cropBox or photoUrl changes
  const updateCropPreviews = useCallback(() => {
    const img = imageRef.current;
    if (!img || !img.complete || img.naturalWidth === 0) return;

    try {
      const { cropCanvas, scaleFactor } = extractHighResCrop(img, cropBox, 500);
      setOriginalCropPreview(cropCanvas.toDataURL('image/png'));
      setCropDimensions({
        w: cropCanvas.width,
        h: cropCanvas.height,
        scale: scaleFactor,
      });

      const variants = generatePreprocessingVariants(cropCanvas, scaleFactor);
      const activeVariant =
        selectedVariant === 'auto'
          ? variants.standard_contrast
          : variants[selectedVariant];
      setProcessedCropPreview(activeVariant.dataUrl);
    } catch (err: any) {
      console.warn('[SignboardCropModal] Preview error:', err);
    }
  }, [cropBox, selectedVariant]);

  useEffect(() => {
    if (isOpen && photoUrl) {
      // Delay slightly for image to load
      const t = window.setTimeout(updateCropPreviews, 100);
      return () => window.clearTimeout(t);
    }
  }, [isOpen, photoUrl, updateCropPreviews]);

  // Interactive mouse drag on original image
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const ny = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    setIsDragging(true);
    setDragStart({ x: nx, y: ny });
    setCropBox({ x: nx, y: ny, width: 0.05, height: 0.05 });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStart) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const currentX = Math.max(
      0,
      Math.min(1, (e.clientX - rect.left) / rect.width)
    );
    const currentY = Math.max(
      0,
      Math.min(1, (e.clientY - rect.top) / rect.height)
    );

    const left = Math.min(dragStart.x, currentX);
    const top = Math.min(dragStart.y, currentY);
    const width = Math.max(0.04, Math.abs(currentX - dragStart.x));
    const height = Math.max(0.04, Math.abs(currentY - dragStart.y));

    setCropBox({ x: left, y: top, width, height });
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      setDragStart(null);
      updateCropPreviews();
    }
  };

  // Run Tesseract OCR on the crop
  const handleRunOcr = async () => {
    const img = imageRef.current;
    if (!img) return;

    setIsOcrRunning(true);
    setErrorMessage(null);
    setRawOcrText('');
    setEditableName('');
    setOcrConfidence(null);

    try {
      const { cropCanvas, scaleFactor } = extractHighResCrop(img, cropBox, 600);
      const variants = generatePreprocessingVariants(cropCanvas, scaleFactor);

      // Determine which variants to test
      const variantsToTry: PreprocessingVariantType[] =
        selectedVariant === 'auto'
          ? [
              'standard_contrast',
              'inverted_dark_board',
              'grayscale_sharpened',
              'adaptive_threshold',
            ]
          : [selectedVariant];

      // Initialize Tesseract worker via unified multilingual engine
      const { worker, activeLangs, sourceMode, langWarning } =
        await initMultilingualTesseractWorker(selectedLang, 12000);

      let bestText = '';
      let bestConf = 0;
      let bestScore = -1;
      let winningVariant: PreprocessingVariantType = variantsToTry[0];
      let winningDataUrl = variants[winningVariant].dataUrl;

      // Try candidate preprocessing filters and pick the highest-fidelity read
      for (const vType of variantsToTry) {
        const vCrop = variants[vType];

        const res = await worker.recognize(vCrop.dataUrl);
        const text = String(res.data?.text || '').trim();
        const conf =
          typeof res.data?.confidence === 'number' && res.data.confidence > 0
            ? Number((res.data.confidence / 100).toFixed(3))
            : 0;

        const { score } = scoreOcrRead(text, conf);
        if (score > bestScore || (!bestText && text.length > 0)) {
          bestScore = score;
          bestText = text;
          bestConf = conf;
          winningVariant = vType;
          winningDataUrl = vCrop.dataUrl;
        }
      }

      await worker.terminate();

      setProcessedCropPreview(winningDataUrl);
      setRawOcrText(bestText || '(No text detected in this region)');
      const cleaned = cleanOcrText(bestText);
      setEditableName(cleaned);
      setOcrConfidence(bestConf);

      const scriptRes = detectScripts(bestText);
      const langStatusNote = langWarning
        ? `[Fallback: English]`
        : `[${sourceMode === 'local' ? 'Offline' : 'CDN'}]`;

      setVariantReport(
        `Language: ${activeLangs} ${langStatusNote} · Filter: ${winningVariant} (${scaleFactor.toFixed(
          1
        )}x) · Script: ${scriptRes.primaryScript}`
      );
    } catch (err: any) {
      console.error('[SignboardCropModal] OCR error:', err);
      setErrorMessage(
        err?.message ||
          'Failed to transcribe signboard text. Try adjusting the crop bounding box or selecting another preprocessing filter.'
      );
    } finally {
      setIsOcrRunning(false);
    }
  };

  const handleApply = () => {
    const trimmed = editableName.trim();
    if (!trimmed) {
      setErrorMessage('Please enter or confirm a valid business name.');
      return;
    }

    onApplyResult({
      rawText: rawOcrText,
      normalizedName: trimmed,
      confidence: ocrConfidence || 0.85,
      language: selectedLang,
      variantUsed: variantReport,
      cropDataUrl: processedCropPreview || originalCropPreview || '',
    });
    onClose();
  };

  if (!isOpen) return null;

  const defaultPresets = imageRef.current
    ? generateDefaultSignboardCrops(
        imageRef.current.naturalWidth || 800,
        imageRef.current.naturalHeight || 600
      )
    : [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="signboard-crop-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md"
    >
      <div
        ref={containerRef}
        className="liquid-glass-dark relative flex flex-col w-full max-w-5xl max-h-[92vh] rounded-3xl border border-teal-400/40 bg-[#061817]/95 p-5 shadow-[0_24px_64px_rgba(0,0,0,0.85)] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-teal-400/40 bg-teal-500/20 text-teal-300">
              <Crop className="h-5 w-5" />
            </div>
            <div>
              <h2
                id="signboard-crop-modal-title"
                className="font-display text-base font-semibold text-white"
              >
                Signboard Region Inspection &amp; Multilingual OCR
              </h2>
              <p className="font-mono text-[11px] text-slate-300">
                Inspect high-resolution photo: <code className="text-teal-300">{photoName}</code>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body: Two Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-3 overflow-y-auto custom-scrollbar flex-1">
          {/* Left: Original Photo with Interactive Crop Box */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <ZoomIn className="h-3.5 w-3.5 text-teal-300" />
                <span>Original Photograph (Click &amp; Drag to Crop)</span>
              </span>
              <span className="font-mono text-[10px] text-slate-400">
                Box: {Math.round(cropBox.width * 100)}% × {Math.round(cropBox.height * 100)}%
              </span>
            </div>

            <div
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              className="relative aspect-auto max-h-[380px] w-full overflow-hidden rounded-2xl border border-white/15 bg-black/60 cursor-crosshair select-none flex items-center justify-center"
            >
              {photoUrl ? (
                <>
                  <img
                    ref={imageRef}
                    src={photoUrl}
                    alt={photoName}
                    onLoad={updateCropPreviews}
                    className="max-h-[380px] w-auto max-w-full object-contain pointer-events-none"
                  />
                  {/* Visual Bounding Box Overlay */}
                  <div
                    style={{
                      position: 'absolute',
                      left: `${cropBox.x * 100}%`,
                      top: `${cropBox.y * 100}%`,
                      width: `${cropBox.width * 100}%`,
                      height: `${cropBox.height * 100}%`,
                    }}
                    className="border-2 border-teal-400 bg-teal-400/20 shadow-[0_0_12px_rgba(20,184,166,0.6)] pointer-events-none rounded"
                  >
                    <span className="absolute -top-5 left-0 rounded bg-teal-500 px-1 font-mono text-[9px] font-bold text-black uppercase">
                      Signboard Crop
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-xs text-slate-400">No image loaded</p>
              )}
            </div>

            {/* Crop Preset Buttons */}
            <div className="space-y-1">
              <span className="font-mono text-[10px] uppercase text-slate-400">
                Quick Crop Presets:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {defaultPresets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setCropBox(preset.box);
                      window.setTimeout(updateCropPreviews, 50);
                    }}
                    className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 font-mono text-[10px] text-slate-300 hover:border-teal-400/50 hover:text-white transition-all"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Preprocessing & OCR Controls */}
          <div className="space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              {/* Processed Crop Preview */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <Sliders className="h-3.5 w-3.5 text-cyan-300" />
                    <span>Processed High-Resolution Signboard Crop</span>
                  </span>
                  <span className="font-mono text-[10.5px] text-cyan-300">
                    {cropDimensions.w}×{cropDimensions.h}px ({cropDimensions.scale.toFixed(1)}x upscaled)
                  </span>
                </div>

                <div className="relative aspect-video max-h-[170px] w-full overflow-hidden rounded-2xl border border-teal-400/30 bg-black/80 flex items-center justify-center p-2">
                  {processedCropPreview ? (
                    <img
                      src={processedCropPreview}
                      alt="Processed Crop Preview"
                      className="max-h-full max-w-full object-contain rounded"
                    />
                  ) : (
                    <p className="text-xs text-slate-500">Generating crop preview...</p>
                  )}
                </div>
              </div>

              {/* Controls: Language and Preprocessing Variant */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label
                    htmlFor="crop-ocr-language-select"
                    className="flex items-center gap-1 font-mono text-[10px] uppercase text-slate-300"
                  >
                    <Globe className="h-3 w-3 text-teal-300" />
                    <span>Language Model:</span>
                  </label>
                  <select
                    id="crop-ocr-language-select"
                    value={selectedLang}
                    onChange={(e) => setSelectedLang(e.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-[#0a1a19] px-2.5 py-1.5 text-xs text-white outline-none focus:border-teal-400"
                  >
                    <optgroup label="Offline Verified (Local Models)">
                      {SUPPORTED_OCR_LANGUAGES.filter(
                        (l) => l.tier === 'LOCAL_VERIFIED'
                      ).map((l) => (
                        <option key={l.code} value={l.code}>
                          {l.label}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Experimental / On-Demand CDN">
                      {SUPPORTED_OCR_LANGUAGES.filter(
                        (l) => l.tier === 'EXPERIMENTAL_CDN'
                      ).map((l) => (
                        <option key={l.code} value={l.code}>
                          {l.label}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="crop-filter-preset-select"
                    className="flex items-center gap-1 font-mono text-[10px] uppercase text-slate-300"
                  >
                    <Sliders className="h-3 w-3 text-cyan-300" />
                    <span>Filter Preset:</span>
                  </label>
                  <select
                    id="crop-filter-preset-select"
                    value={selectedVariant}
                    onChange={(e) => {
                      setSelectedVariant(e.target.value as PreprocessingVariantType);
                      window.setTimeout(updateCropPreviews, 50);
                    }}
                    className="w-full rounded-xl border border-white/15 bg-[#0a1a19] px-2.5 py-1.5 text-xs text-white outline-none focus:border-teal-400"
                  >
                    <option value="auto">Auto Multi-Variant (Recommended)</option>
                    <option value="standard_contrast">High Contrast (Fascias)</option>
                    <option value="inverted_dark_board">Inverted (Dark Kiosk Board)</option>
                    <option value="grayscale_sharpened">Edge Sharpened (Blur fix)</option>
                    <option value="adaptive_threshold">Adaptive Binarization</option>
                  </select>
                </div>
              </div>

              {/* Action Button: Transcribe Signboard */}
              <button
                type="button"
                disabled={isOcrRunning}
                onClick={handleRunOcr}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-teal-300/50 bg-gradient-to-r from-teal-500/50 via-cyan-500/40 to-sky-500/50 py-2 text-xs font-semibold text-white shadow-[0_4px_16px_rgba(20,184,166,0.3)] hover:brightness-115 transition-all disabled:opacity-50"
              >
                {isOcrRunning ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-teal-200" />
                    <span>Transcribing Multilingual Text...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 text-teal-200" />
                    <span>Transcribe Signboard Crop ({selectedLang})</span>
                  </>
                )}
              </button>

              {/* Diagnostics & Result Box */}
              {rawOcrText && (
                <div className="rounded-2xl border border-white/15 bg-black/40 p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-[10px] uppercase text-slate-400">
                      Raw Tesseract Output:
                    </span>
                    {ocrConfidence !== null && (
                      <span
                        className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
                          ocrConfidence >= 0.7
                            ? 'border border-emerald-400/40 bg-emerald-500/15 text-emerald-300'
                            : ocrConfidence >= 0.4
                            ? 'border border-amber-400/40 bg-amber-500/15 text-amber-300'
                            : 'border border-rose-400/40 bg-rose-500/15 text-rose-300'
                        }`}
                      >
                        Confidence: {Math.round(ocrConfidence * 100)}%
                        {ocrConfidence < 0.4 ? ' (Low / Verify)' : ''}
                      </span>
                    )}
                  </div>

                  <pre className="max-h-[60px] overflow-y-auto rounded-lg bg-black/70 p-2 font-mono text-xs text-emerald-300 whitespace-pre-wrap select-all">
                    {rawOcrText}
                  </pre>

                  {variantReport && (
                    <p className="font-mono text-[9.5px] text-slate-400">{variantReport}</p>
                  )}

                  {/* Editable Business Name Input */}
                  <div className="space-y-1 pt-1 border-t border-white/10">
                    <label
                      htmlFor="verified-business-name-input"
                      className="block font-mono text-[10px] uppercase text-slate-300 font-semibold"
                    >
                      Verified Business Name (Correct / Confirm):
                    </label>
                    <input
                      id="verified-business-name-input"
                      type="text"
                      value={editableName}
                      onChange={(e) => setEditableName(e.target.value)}
                      placeholder="e.g. MeeSeva / CSC Center or మహేందర్ హోటల్"
                      className="w-full rounded-xl border border-teal-400/60 bg-black/80 px-3 py-1.5 text-xs text-white outline-none focus:ring-1 focus:ring-teal-400"
                    />
                  </div>
                </div>
              )}

              {errorMessage && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-400/40 bg-amber-500/10 p-2.5 text-xs text-amber-200">
                  <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>

            {/* Modal Bottom Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-white/15 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!editableName.trim() || isOcrRunning}
                onClick={handleApply}
                className="flex items-center gap-1.5 rounded-xl border border-emerald-400/60 bg-emerald-500/30 hover:bg-emerald-500/45 px-4 py-1.5 text-xs font-semibold text-emerald-200 shadow-[0_2px_12px_rgba(16,185,129,0.35)] transition-all disabled:opacity-40"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Apply to Corridor Scan</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
