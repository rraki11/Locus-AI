import React, {
  Component,
  ReactNode,
  Suspense,
  lazy,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { Application } from '@splinetool/runtime';

const LazySpline = lazy(() => import('@splinetool/react-spline'));

export const WORKSPACE_SPLINE_SCENE_URL =
  'https://prod.spline.design/faSJFLVFZG5mHCdo/scene.splinecode';

interface ErrorBoundaryProps {
  fallback: ReactNode;
  onError?: () => void;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class WorkspaceSplineErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(): void {
    this.props.onError?.();
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

function isWebGLAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGL2RenderingContext &&
        (canvas.getContext('webgl2') || canvas.getContext('webgl'))
    );
  } catch {
    return false;
  }
}

import { WorkspaceStageThemeKey } from '../../context/WorkspaceThemeContext';

export interface WorkspaceSplineAmbientProps {
  entryProgress?: number;
  preferFallback?: boolean;
  forceFallback?: boolean;
  fixedViewport?: boolean;
  themeKey?: WorkspaceStageThemeKey;
}

interface StageWavePalette {
  base: string;
  wave1: [string, string, string, string]; // ulGrad stops
  wave2: [string, string, string];         // crestGrad stops
  wave3: [string, string];                 // undertow stops
  wave4: [string, string, string];         // lrGrad stops
  wave5: [string, string, string, string]; // coreGrad stops
  overlay1: string; // CSS wave 1 gradient
  overlay2: string; // CSS wave 2 gradient
}

const STAGE_PALETTES: Record<WorkspaceStageThemeKey, StageWavePalette> = {
  emerald: {
    // Stage 1: Market Discovery (Deep forest green, emerald, mint, pale mint)
    base: '#051410',
    wave1: [
      'rgba(15, 139, 104, 0.75)',
      'rgba(9, 45, 37, 0.65)',
      'rgba(6, 32, 26, 0.38)',
      'rgba(3, 16, 13, 0.12)',
    ],
    wave2: [
      'rgba(114, 217, 176, 0.58)',
      'rgba(15, 139, 104, 0.42)',
      'rgba(9, 45, 37, 0.18)',
    ],
    wave3: [
      'rgba(9, 45, 37, 0.62)',
      'rgba(5, 20, 16, 0.28)',
    ],
    wave4: [
      'rgba(15, 139, 104, 0.70)',
      'rgba(9, 45, 37, 0.55)',
      'rgba(4, 18, 14, 0.25)',
    ],
    wave5: [
      'rgba(114, 217, 176, 0.68)',
      'rgba(15, 139, 104, 0.52)',
      'rgba(9, 45, 37, 0.32)',
      'rgba(4, 18, 14, 0.12)',
    ],
    overlay1:
      'radial-gradient(ellipse 62% 56% at 48% 46%, rgba(114, 217, 176, 0.28) 0%, rgba(15, 139, 104, 0.42) 36%, rgba(9, 45, 37, 0.25) 64%, rgba(5, 20, 16, 0) 90%)',
    overlay2:
      'radial-gradient(ellipse 54% 48% at 58% 58%, rgba(15, 139, 104, 0.45) 0%, rgba(9, 45, 37, 0.35) 40%, rgba(4, 18, 14, 0.20) 68%, rgba(5, 20, 16, 0) 88%)',
  },
  teal: {
    // Stage 2: Ground Reality — Luminous Cyber Aurora (Electric Cyan, Aurora Teal, Deep Indigo)
    base: '#03080E',
    wave1: [
      'rgba(20, 184, 166, 0.48)',
      'rgba(14, 165, 233, 0.38)',
      'rgba(30, 27, 75, 0.28)',
      'rgba(3, 8, 14, 0.08)',
    ],
    wave2: [
      'rgba(94, 234, 212, 0.42)',
      'rgba(56, 189, 248, 0.32)',
      'rgba(15, 23, 42, 0.12)',
    ],
    wave3: [
      'rgba(99, 102, 241, 0.22)',
      'rgba(3, 8, 14, 0.15)',
    ],
    wave4: [
      'rgba(14, 165, 233, 0.44)',
      'rgba(20, 184, 166, 0.32)',
      'rgba(6, 12, 20, 0.16)',
    ],
    wave5: [
      'rgba(94, 234, 212, 0.42)',
      'rgba(139, 92, 246, 0.22)',
      'rgba(14, 165, 233, 0.18)',
      'rgba(3, 8, 14, 0.08)',
    ],
    overlay1:
      'radial-gradient(ellipse 62% 56% at 48% 46%, rgba(94, 234, 212, 0.16) 0%, rgba(14, 165, 233, 0.22) 36%, rgba(99, 102, 241, 0.14) 64%, rgba(3, 8, 14, 0) 90%)',
    overlay2:
      'radial-gradient(ellipse 54% 48% at 58% 58%, rgba(20, 184, 166, 0.22) 0%, rgba(79, 70, 229, 0.18) 40%, rgba(15, 23, 42, 0.12) 68%, rgba(3, 8, 14, 0) 88%)',
  },
  midnight: {
    // Stage 3: Location Intelligence (Midnight navy #091427, deep blue #112B46, muted blue #245A78, electric cyan #54D6E8)
    base: '#060E1C',
    wave1: [
      'rgba(36, 90, 120, 0.70)',
      'rgba(17, 43, 70, 0.65)',
      'rgba(9, 20, 39, 0.38)',
      'rgba(6, 14, 28, 0.12)',
    ],
    wave2: [
      'rgba(84, 214, 232, 0.58)',
      'rgba(36, 90, 120, 0.42)',
      'rgba(17, 43, 70, 0.18)',
    ],
    wave3: [
      'rgba(17, 43, 70, 0.60)',
      'rgba(6, 14, 28, 0.28)',
    ],
    wave4: [
      'rgba(36, 90, 120, 0.65)',
      'rgba(17, 43, 70, 0.52)',
      'rgba(9, 20, 39, 0.25)',
    ],
    wave5: [
      'rgba(84, 214, 232, 0.65)',
      'rgba(36, 90, 120, 0.48)',
      'rgba(17, 43, 70, 0.30)',
      'rgba(6, 14, 28, 0.12)',
    ],
    overlay1:
      'radial-gradient(ellipse 62% 56% at 48% 46%, rgba(84, 214, 232, 0.26) 0%, rgba(36, 90, 120, 0.38) 36%, rgba(17, 43, 70, 0.24) 64%, rgba(6, 14, 28, 0) 90%)',
    overlay2:
      'radial-gradient(ellipse 54% 48% at 58% 58%, rgba(84, 214, 232, 0.32) 0%, rgba(17, 43, 70, 0.35) 40%, rgba(9, 20, 39, 0.20) 68%, rgba(6, 14, 28, 0) 88%)',
  },
  report: {
    // Stage 4: Decision Report (Forest green #092D25, emerald #0F8B68, pale mint #E9F7F0, white #F8FBF9)
    base: '#081713',
    wave1: [
      'rgba(15, 139, 104, 0.62)',
      'rgba(9, 45, 37, 0.58)',
      'rgba(8, 23, 19, 0.35)',
      'rgba(4, 16, 13, 0.12)',
    ],
    wave2: [
      'rgba(114, 217, 176, 0.50)',
      'rgba(15, 139, 104, 0.36)',
      'rgba(9, 45, 37, 0.16)',
    ],
    wave3: [
      'rgba(9, 45, 37, 0.55)',
      'rgba(8, 23, 19, 0.26)',
    ],
    wave4: [
      'rgba(15, 139, 104, 0.58)',
      'rgba(9, 45, 37, 0.48)',
      'rgba(8, 23, 19, 0.22)',
    ],
    wave5: [
      'rgba(233, 247, 240, 0.40)',
      'rgba(114, 217, 176, 0.38)',
      'rgba(15, 139, 104, 0.28)',
      'rgba(8, 23, 19, 0.12)',
    ],
    overlay1:
      'radial-gradient(ellipse 62% 56% at 48% 46%, rgba(114, 217, 176, 0.22) 0%, rgba(15, 139, 104, 0.32) 36%, rgba(9, 45, 37, 0.22) 64%, rgba(8, 23, 19, 0) 90%)',
    overlay2:
      'radial-gradient(ellipse 54% 48% at 58% 58%, rgba(15, 139, 104, 0.35) 0%, rgba(9, 45, 37, 0.30) 40%, rgba(8, 23, 19, 0.16) 68%, rgba(8, 23, 19, 0) 88%)',
  },
};

/**
 * Continuous 60fps Looping Atmospheric Wave Canvas + Grain Layer
 * Dynamically themed per stage (Emerald -> Teal -> Midnight Navy -> Forest/Emerald Report)
 */
const LoopingWaveCanvas: React.FC<{
  preferFallback?: boolean;
  themeKey?: WorkspaceStageThemeKey;
}> = ({ preferFallback = false, themeKey = 'emerald' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const palette = STAGE_PALETTES[themeKey] || STAGE_PALETTES.emerald;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId: number | null = null;
    let width = (canvas.width = window.innerWidth || 1920);
    let height = (canvas.height = window.innerHeight || 1080);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth || 1920;
      height = canvas.height = window.innerHeight || 1080;
    };

    window.addEventListener('resize', handleResize, { passive: true });

    const startTime = performance.now();

    const renderFrame = (now: number) => {
      const t = preferFallback ? 1.2 : (now - startTime) * 0.001;

      // Base canvas background
      ctx.fillStyle = palette.base;
      ctx.fillRect(0, 0, width, height);

      // 1. Upper-left sweeping wave
      const ulX =
        width * (0.25 + Math.sin(t * 0.72) * 0.09 + Math.cos(t * 0.38) * 0.04);
      const ulY =
        height * (0.30 + Math.cos(t * 0.62) * 0.08 + Math.sin(t * 0.44) * 0.04);
      const ulRadius =
        Math.max(width, height) * (0.58 + Math.sin(t * 0.55) * 0.05);

      const ulGrad = ctx.createRadialGradient(ulX, ulY, 0, ulX, ulY, ulRadius);
      ulGrad.addColorStop(0, palette.wave1[0]);
      ulGrad.addColorStop(0.32, palette.wave1[1]);
      ulGrad.addColorStop(0.58, palette.wave1[2]);
      ulGrad.addColorStop(0.80, palette.wave1[3]);
      ulGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = ulGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Upper-left inner crest highlight
      const crestX = width * (0.33 + Math.cos(t * 0.82 + 0.8) * 0.08);
      const crestY = height * (0.24 + Math.sin(t * 0.74 + 0.5) * 0.08);
      const crestRadius =
        Math.max(width, height) * (0.34 + Math.cos(t * 0.65) * 0.04);

      const crestGrad = ctx.createRadialGradient(
        crestX,
        crestY,
        0,
        crestX,
        crestY,
        crestRadius
      );
      crestGrad.addColorStop(0, palette.wave2[0]);
      crestGrad.addColorStop(0.36, palette.wave2[1]);
      crestGrad.addColorStop(0.70, palette.wave2[2]);
      crestGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = crestGrad;
      ctx.fillRect(0, 0, width, height);

      // 3. Bottom-left deep undertow
      const blX = width * (0.10 + Math.sin(t * 0.52 + 2.1) * 0.07);
      const blY = height * (0.88 + Math.cos(t * 0.56 + 1.4) * 0.06);
      const blRadius = Math.max(width, height) * 0.44;

      const blGrad = ctx.createRadialGradient(blX, blY, 0, blX, blY, blRadius);
      blGrad.addColorStop(0, palette.wave3[0]);
      blGrad.addColorStop(0.48, palette.wave3[1]);
      blGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = blGrad;
      ctx.fillRect(0, 0, width, height);

      // 4. Lower-right sweeping outer wave
      const lrX =
        width * (0.76 + Math.cos(t * 0.68) * 0.09 + Math.sin(t * 0.36) * 0.04);
      const lrY =
        height * (0.68 + Math.sin(t * 0.64) * 0.08 + Math.cos(t * 0.40) * 0.04);
      const lrRadius =
        Math.max(width, height) * (0.56 + Math.cos(t * 0.50) * 0.05);

      const lrGrad = ctx.createRadialGradient(lrX, lrY, 0, lrX, lrY, lrRadius);
      lrGrad.addColorStop(0, palette.wave4[0]);
      lrGrad.addColorStop(0.36, palette.wave4[1]);
      lrGrad.addColorStop(0.66, palette.wave4[2]);
      lrGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = lrGrad;
      ctx.fillRect(0, 0, width, height);

      // 5. Lower-right core bloom
      const coreX = width * (0.85 + Math.sin(t * 0.86 + 0.4) * 0.06);
      const coreY = height * (0.70 + Math.cos(t * 0.76 + 0.9) * 0.07);
      const coreRadius =
        Math.max(width, height) * (0.34 + Math.sin(t * 0.9) * 0.035);

      const coreGrad = ctx.createRadialGradient(
        coreX,
        coreY,
        0,
        coreX,
        coreY,
        coreRadius
      );
      coreGrad.addColorStop(0, palette.wave5[0]);
      coreGrad.addColorStop(0.28, palette.wave5[1]);
      coreGrad.addColorStop(0.54, palette.wave5[2]);
      coreGrad.addColorStop(0.82, palette.wave5[3]);
      coreGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = coreGrad;
      ctx.fillRect(0, 0, width, height);

      if (!preferFallback) {
        rafId = window.requestAnimationFrame(renderFrame);
      }
    };

    rafId = window.requestAnimationFrame(renderFrame);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [preferFallback, palette]);

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden bg-[#03020A]"
      data-testid="workspace-spline-fallback"
      aria-hidden="true"
    >
      {/* 60fps Animated Fluid Looping Wave Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        style={{ filter: 'blur(16px) saturate(125%)' }}
      />

      {/* Secondary CSS orbital wave layers for rich fluid overlapping */}
      <div
        className="locus-loop-wave-primary absolute -left-[10%] -top-[16%] h-[86%] w-[66%] rounded-full transition-all duration-[850ms]"
        style={{
          background: palette.overlay1,
          filter: 'blur(42px)',
        }}
      />

      <div
        className="locus-loop-wave-amber absolute -bottom-[14%] -right-[6%] h-[68%] w-[52%] rounded-full transition-all duration-[850ms]"
        style={{
          background: palette.overlay2,
          filter: 'blur(38px)',
        }}
      />

      {/* Stippled grainy film noise matching the Looping Background reference texture */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.26] mix-blend-overlay"
        aria-hidden="true"
      >
        <filter id="locusLoopingGrain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.84"
            numOctaves="3"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#locusLoopingGrain)" />
      </svg>
    </div>
  );
};

export const WorkspaceSplineAmbient: React.FC<WorkspaceSplineAmbientProps> = ({
  entryProgress = 1,
  preferFallback = false,
  forceFallback = false,
  fixedViewport = false,
  themeKey = 'emerald',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isNearViewport, setIsNearViewport] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [useFallback, setUseFallback] = useState<boolean>(
    preferFallback || forceFallback
  );
  const palette = STAGE_PALETTES[themeKey] || STAGE_PALETTES.emerald;

  // Sync fallback state with props and WebGL availability
  useEffect(() => {
    const queryForceFallback =
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('splineFallback') === '1';

    setUseFallback(
      preferFallback ||
        forceFallback ||
        queryForceFallback ||
        !isWebGLAvailable()
    );
  }, [preferFallback, forceFallback]);

  // Lazy mount when Page 3 (Workspace) enters or approaches the viewport
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setIsNearViewport(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) {
          setIsNearViewport(entry.isIntersecting);
          if (!entry.isIntersecting) {
            setIsLoaded(false);
          }
        }
      },
      { rootMargin: '360px 0px', threshold: 0.01 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Prevent Spline wheel listeners from hijacking page or map scroll
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheelCapture = (event: WheelEvent) => {
      event.stopImmediatePropagation();
    };

    el.addEventListener('wheel', handleWheelCapture, {
      capture: true,
      passive: true,
    });
    return () => {
      el.removeEventListener('wheel', handleWheelCapture, { capture: true });
    };
  }, []);

  // Safeguard timeout: if remote Spline scene takes > 6.5s, rely on the 60fps LoopingWaveCanvas
  useEffect(() => {
    if (!isNearViewport || isLoaded || useFallback) return;

    const timer = window.setTimeout(() => {
      if (!isLoaded) {
        setUseFallback(true);
      }
    }, 6500);

    return () => window.clearTimeout(timer);
  }, [isNearViewport, isLoaded, useFallback]);

  const handleSplineLoad = (splineApp: Application) => {
    const internalApp = splineApp as any;

    try {
      if (internalApp._eventManager) {
        internalApp._eventManager.preventScroll = false;
        internalApp._eventManager.preventTouchScroll = false;
      }
      if (internalApp._controls?.orbitControls) {
        internalApp._controls.orbitControls.enableZoom = false;
        internalApp._controls.orbitControls.enablePan = false;
        internalApp._controls.orbitControls.enableRotate = false;
      }
    } catch {
      // Non-fatal
    }

    try {
      if (internalApp._renderer?.pipeline) {
        internalApp._renderer.pipeline.setWatermark?.(null);
        if (internalApp._renderer.pipeline.logoOverlayPass) {
          internalApp._renderer.pipeline.logoOverlayPass.enabled = false;
        }
      }
    } catch {
      // Non-fatal
    }

    setIsLoaded(true);
  };

  const handleSplineError = () => {
    setUseFallback(true);
  };

  const clampedEntry = Math.min(1, Math.max(0, entryProgress));
  const fieldScale = preferFallback ? 1 : 1.035 - clampedEntry * 0.035;
  const fieldOpacity = preferFallback ? 1 : 0.52 + clampedEntry * 0.48;

  return (
    <div
      ref={containerRef}
      className={`pointer-events-none inset-0 z-0 overflow-hidden transition-colors duration-[850ms] ease-in-out ${
        fixedViewport ? 'fixed h-screen w-screen' : 'absolute'
      }`}
      style={{ backgroundColor: palette.base }}
      aria-hidden="true"
    >
      <div
        className="absolute inset-0"
        style={{
          opacity: fieldOpacity,
          transform: `scale(${fieldScale.toFixed(4)})`,
          transformOrigin: 'center center',
        }}
      >
        {/* Always-active 60fps Looping Wave Canvas + Stippled Grain Foundation */}
        <LoopingWaveCanvas preferFallback={preferFallback} themeKey={themeKey} />

        {/* Live Spline Scene blended over the looping waves */}
        {!useFallback && isNearViewport && (
          <WorkspaceSplineErrorBoundary
            onError={handleSplineError}
            fallback={null}
          >
            <Suspense fallback={null}>
              <div
                data-testid="workspace-spline-stage"
                className={`spline-canvas-wrapper absolute inset-0 transition-opacity duration-1000 ${
                  isLoaded ? 'opacity-[0.68]' : 'opacity-0'
                }`}
                style={{
                  filter: 'saturate(112%) contrast(108%)',
                  mixBlendMode: 'screen',
                }}
              >
                <LazySpline
                  scene={WORKSPACE_SPLINE_SCENE_URL}
                  onLoad={handleSplineLoad}
                  onError={handleSplineError}
                />
              </div>
            </Suspense>
          </WorkspaceSplineErrorBoundary>
        )}
      </div>

      {/* Top-edge feather so Page 3 blends smoothly with Page 2's bottom edge (omitted in standalone fixed views) */}
      {!fixedViewport && (
        <div
          className="absolute inset-x-0 top-0 h-24"
          style={{
            background:
              'linear-gradient(to bottom, #080914 0%, rgba(3, 2, 10, 0.55) 48%, rgba(3, 2, 10, 0) 100%)',
          }}
        />
      )}
    </div>
  );
};
