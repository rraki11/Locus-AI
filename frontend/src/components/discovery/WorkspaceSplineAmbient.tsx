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

export interface WorkspaceSplineAmbientProps {
  entryProgress?: number;
  preferFallback?: boolean;
  forceFallback?: boolean;
}

/**
 * Continuous 60fps Looping Atmospheric Wave Canvas + Grain Layer:
 * Directly matches the "Looping Background" reference image:
 * - Deep pitch-black diagonal void channel (#03020A)
 * - Upper-left sweeping wave: electric royal indigo/ultramarine (#3B28FF / #4F46E5)
 *   with a luminous rose-magenta/violet inner crest (#D946EF / #A855F7)
 * - Lower-right sweeping wave: deep indigo-violet outer aura (#4324E6 / #6D28D9)
 *   wrapping a glowing fiery orange-amber core (#FF6200 / #F97316 / #FB923C)
 * - Stippled grainy noise texture across the gradient transitions
 */
const LoopingWaveCanvas: React.FC<{ preferFallback?: boolean }> = ({
  preferFallback = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

      // Pitch-black / midnight base so the diagonal dark channel stays deep and high-contrast
      ctx.fillStyle = '#03020A';
      ctx.fillRect(0, 0, width, height);

      // 1. Upper-left sweeping electric indigo / ultramarine wave
      const ulX =
        width * (0.25 + Math.sin(t * 0.72) * 0.09 + Math.cos(t * 0.38) * 0.04);
      const ulY =
        height * (0.30 + Math.cos(t * 0.62) * 0.08 + Math.sin(t * 0.44) * 0.04);
      const ulRadius =
        Math.max(width, height) * (0.58 + Math.sin(t * 0.55) * 0.05);

      const ulGrad = ctx.createRadialGradient(ulX, ulY, 0, ulX, ulY, ulRadius);
      ulGrad.addColorStop(0, 'rgba(79, 52, 255, 0.88)');
      ulGrad.addColorStop(0.32, 'rgba(55, 34, 232, 0.72)');
      ulGrad.addColorStop(0.58, 'rgba(36, 20, 168, 0.38)');
      ulGrad.addColorStop(0.80, 'rgba(14, 8, 64, 0.12)');
      ulGrad.addColorStop(1, 'rgba(3, 2, 10, 0)');

      ctx.fillStyle = ulGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Upper-left inner rose-magenta / violet highlight crest (matches top-left pink-violet core in reference)
      const crestX =
        width * (0.33 + Math.cos(t * 0.82 + 0.8) * 0.08);
      const crestY =
        height * (0.24 + Math.sin(t * 0.74 + 0.5) * 0.08);
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
      crestGrad.addColorStop(0, 'rgba(224, 86, 253, 0.68)');
      crestGrad.addColorStop(0.36, 'rgba(147, 51, 234, 0.46)');
      crestGrad.addColorStop(0.70, 'rgba(67, 36, 230, 0.18)');
      crestGrad.addColorStop(1, 'rgba(3, 2, 10, 0)');

      ctx.fillStyle = crestGrad;
      ctx.fillRect(0, 0, width, height);

      // 3. Bottom-left deep ultramarine undertow
      const blX = width * (0.10 + Math.sin(t * 0.52 + 2.1) * 0.07);
      const blY = height * (0.88 + Math.cos(t * 0.56 + 1.4) * 0.06);
      const blRadius = Math.max(width, height) * 0.44;

      const blGrad = ctx.createRadialGradient(blX, blY, 0, blX, blY, blRadius);
      blGrad.addColorStop(0, 'rgba(59, 40, 245, 0.58)');
      blGrad.addColorStop(0.48, 'rgba(34, 18, 150, 0.28)');
      blGrad.addColorStop(1, 'rgba(3, 2, 10, 0)');

      ctx.fillStyle = blGrad;
      ctx.fillRect(0, 0, width, height);

      // 4. Lower-right sweeping indigo-violet outer wave
      const lrX =
        width * (0.76 + Math.cos(t * 0.68) * 0.09 + Math.sin(t * 0.36) * 0.04);
      const lrY =
        height * (0.68 + Math.sin(t * 0.64) * 0.08 + Math.cos(t * 0.40) * 0.04);
      const lrRadius =
        Math.max(width, height) * (0.56 + Math.cos(t * 0.50) * 0.05);

      const lrGrad = ctx.createRadialGradient(lrX, lrY, 0, lrX, lrY, lrRadius);
      lrGrad.addColorStop(0, 'rgba(91, 33, 246, 0.84)');
      lrGrad.addColorStop(0.36, 'rgba(67, 36, 230, 0.66)');
      lrGrad.addColorStop(0.66, 'rgba(36, 18, 148, 0.30)');
      lrGrad.addColorStop(1, 'rgba(3, 2, 10, 0)');

      ctx.fillStyle = lrGrad;
      ctx.fillRect(0, 0, width, height);

      // 5. Lower-right fiery orange-amber core bloom (matches the glowing orange focal wave on the right)
      const coreX =
        width * (0.85 + Math.sin(t * 0.86 + 0.4) * 0.06);
      const coreY =
        height * (0.70 + Math.cos(t * 0.76 + 0.9) * 0.07);
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
      coreGrad.addColorStop(0, 'rgba(255, 115, 15, 0.92)');
      coreGrad.addColorStop(0.28, 'rgba(249, 92, 22, 0.72)');
      coreGrad.addColorStop(0.54, 'rgba(192, 56, 212, 0.42)');
      coreGrad.addColorStop(0.82, 'rgba(79, 52, 255, 0.15)');
      coreGrad.addColorStop(1, 'rgba(3, 2, 10, 0)');

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
  }, [preferFallback]);

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
        className="locus-loop-wave-primary absolute -left-[10%] -top-[16%] h-[86%] w-[66%] rounded-full"
        style={{
          background:
            'radial-gradient(ellipse 62% 56% at 48% 46%, rgba(217, 70, 239, 0.42) 0%, rgba(79, 70, 229, 0.56) 36%, rgba(49, 46, 129, 0.28) 64%, rgba(3, 2, 10, 0) 90%)',
          filter: 'blur(42px)',
        }}
      />

      <div
        className="locus-loop-wave-amber absolute -bottom-[14%] -right-[6%] h-[68%] w-[52%] rounded-full"
        style={{
          background:
            'radial-gradient(ellipse 54% 48% at 58% 58%, rgba(255, 107, 0, 0.65) 0%, rgba(217, 70, 239, 0.38) 38%, rgba(67, 56, 202, 0.32) 66%, rgba(3, 2, 10, 0) 88%)',
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
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isNearViewport, setIsNearViewport] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [useFallback, setUseFallback] = useState<boolean>(
    preferFallback || forceFallback
  );

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
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-[#03020A]"
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
        <LoopingWaveCanvas preferFallback={preferFallback} />

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

      {/* Top-edge feather so Page 3 blends smoothly with Page 2's bottom edge */}
      <div
        className="absolute inset-x-0 top-0 h-24"
        style={{
          background:
            'linear-gradient(to bottom, #080914 0%, rgba(3, 2, 10, 0.55) 48%, rgba(3, 2, 10, 0) 100%)',
        }}
      />
    </div>
  );
};
