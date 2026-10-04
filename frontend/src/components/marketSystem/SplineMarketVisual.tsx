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

export const PAGE_2_SPLINE_SCENE_URL =
  'https://prod.spline.design/xUBJpoAbk8N4F7LN/scene.splinecode';
export const PAGE_2_SPLINE_BACKUP_URL = '/spline/market-system.splinecode';

export interface MarketSpatialSignalNode {
  id: 'competition-access' | 'candidate-location' | 'commercial-activity';
  label: string;
  subLabel: string;
  tier: 'primary-core' | 'primary-signal' | 'secondary-signal';
  /** Normalized 3D object center on stage (%) */
  stageX: number;
  stageY: number;
  /** Unobstructed pill anchor position on stage (%) */
  pillX: number;
  pillY: number;
}

export const DEFAULT_MARKET_SIGNAL_NODES: MarketSpatialSignalNode[] = [
  {
    id: 'competition-access',
    label: 'COMPETITION & ACCESSIBILITY',
    subLabel: 'SURROUNDING SIGNAL',
    tier: 'primary-signal',
    stageX: 39.5,
    stageY: 35.5,
    pillX: 20.0,
    pillY: 19.5,
  },
  {
    id: 'candidate-location',
    label: 'CANDIDATE LOCATION',
    subLabel: 'MARKET SIGNAL CORE',
    tier: 'primary-core',
    stageX: 49.8,
    stageY: 52.8,
    pillX: 79.5,
    pillY: 47.0,
  },
  {
    id: 'commercial-activity',
    label: 'COMMERCIAL ACTIVITY',
    subLabel: 'GROUND REALITY',
    tier: 'secondary-signal',
    stageX: 58.5,
    stageY: 67.8,
    pillX: 79.5,
    pillY: 70.5,
  },
];

interface ErrorBoundaryProps {
  fallback: ReactNode;
  onError?: () => void;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class SplineStageErrorBoundary extends Component<
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

export interface SplineMarketVisualProps {
  pointerRef: React.MutableRefObject<{
    x: number;
    y: number;
    active: boolean;
  }>;
  nodes?: MarketSpatialSignalNode[];
  activeNodeId?: MarketSpatialSignalNode['id'] | null;
  onNodeHover?: (nodeId: MarketSpatialSignalNode['id'] | null) => void;
  preferFallback?: boolean;
  shouldLoad?: boolean;
}

/**
 * Fallback visual rendered when WebGL is unavailable, prefers-reduced-motion is active,
 * or the Spline scene fails to initialize.
 */
const SpatialStageFallback: React.FC<{
  activeNodeId?: MarketSpatialSignalNode['id'] | null;
}> = ({ activeNodeId }) => {
  return (
    <div
      className="pointer-events-none relative flex h-full w-full items-center justify-center overflow-hidden"
      aria-hidden="true"
    >
      {/* Abstract Spatial Signal Nodes on Deep Charcoal/Navy Stage */}
      <div
        className={`absolute left-[39.5%] top-[35.5%] h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#6FAF9B]/35 bg-[radial-gradient(circle_at_35%_35%,rgba(111,175,155,0.42)_0%,rgba(46,115,95,0.18)_52%,rgba(10,16,22,0.9)_100%)] shadow-[0_0_40px_rgba(111,175,155,0.18)] transition-transform duration-500 ${
          activeNodeId === 'competition-access' ? 'scale-110' : 'scale-100'
        }`}
      />
      <div
        className={`absolute left-[49.8%] top-[52.8%] h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#6FAF9B]/45 bg-[radial-gradient(circle_at_35%_35%,rgba(215,225,221,0.38)_0%,rgba(61,128,109,0.22)_48%,rgba(8,12,18,0.95)_100%)] shadow-[0_0_55px_rgba(61,128,109,0.22)] transition-transform duration-500 ${
          activeNodeId === 'candidate-location' ? 'scale-105' : 'scale-100'
        }`}
      />
      <div
        className={`absolute left-[58.5%] top-[67.8%] h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#3D806D]/35 bg-[radial-gradient(circle_at_35%_35%,rgba(111,175,155,0.32)_0%,rgba(12,19,26,0.92)_100%)] opacity-85 shadow-md transition-transform duration-500 ${
          activeNodeId === 'commercial-activity' ? 'scale-110' : 'scale-100'
        }`}
      />
    </div>
  );
};

export const SplineMarketVisual: React.FC<SplineMarketVisualProps> = ({
  pointerRef,
  nodes = DEFAULT_MARKET_SIGNAL_NODES,
  activeNodeId = null,
  onNodeHover,
  preferFallback = false,
  shouldLoad = true,
}) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const splineAppRef = useRef<Application | null>(null);
  const cleanupRuntimeRef = useRef<(() => void) | null>(null);
  const stageParallaxRef = useRef<HTMLDivElement>(null);

  const [sceneUrl, setSceneUrl] = useState<string>(PAGE_2_SPLINE_SCENE_URL);
  const [triedLocalBackup, setTriedLocalBackup] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [useFallback, setUseFallback] = useState<boolean>(preferFallback);
  const [isVisible, setIsVisible] = useState<boolean>(true);

  useEffect(() => {
    setUseFallback(preferFallback || !isWebGLAvailable());
  }, [preferFallback]);

  // Pause pointer rAF loop when Page 2 is scrolled completely out of the viewport
  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) {
          setIsVisible(entry.isIntersecting);
        }
      },
      { threshold: 0.02 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Prevent Spline's internal wheel listener from trapping vertical page scroll
  useEffect(() => {
    const el = stageRef.current;
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

  // Timeout safeguard: switch to local cached .splinecode if remote CDN takes > 4.5s, then fallback
  useEffect(() => {
    if (!shouldLoad || isLoaded || useFallback) return;

    const timer = window.setTimeout(() => {
      if (!isLoaded) {
        if (!triedLocalBackup && sceneUrl !== PAGE_2_SPLINE_BACKUP_URL) {
          setTriedLocalBackup(true);
          setSceneUrl(PAGE_2_SPLINE_BACKUP_URL);
        } else {
          setUseFallback(true);
        }
      }
    }, 4500);

    return () => window.clearTimeout(timer);
  }, [shouldLoad, isLoaded, useFallback, triedLocalBackup, sceneUrl]);

  // Configure transparent background, remove watermark, and attach smooth micro-depth pointer response
  const configureMarketSpline = (splineApp: Application): (() => void) => {
    const internalApp = splineApp as any;

    // 1. Enable window-level pointer events & disable scroll hijacking
    try {
      if (typeof splineApp.setGlobalEvents === 'function') {
        splineApp.setGlobalEvents(true);
      } else if (internalApp._eventManager?.updateUseWindowEvents) {
        internalApp._eventManager.updateUseWindowEvents(true);
      }

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

    // 2. Remove "Built with Spline" watermark pass so the stage reads cleanly as a LOCUS instrument
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

    // 3. Enable native transparent background so the 3 refractive objects sit over our charcoal/navy stage
    try {
      splineApp.setBackgroundColor('transparent');
      const activePage = internalApp._scene?.activePage;
      if (activePage) {
        if (
          activePage.bgColor &&
          typeof activePage.bgColor.setRGBA === 'function'
        ) {
          activePage.bgColor.setRGBA(0, 0, 0, 0);
        } else if (activePage.bgColor) {
          activePage.bgColor.a = 0;
        }
      }
      if (internalApp._renderer) {
        internalApp._renderer.clearAlphaOverride = 0;
        if (typeof internalApp._renderer.setClearAlpha === 'function') {
          internalApp._renderer.setClearAlpha(0);
        }
      }
    } catch {
      // Non-fatal
    }

    // 4. Locate root group ("Group 2") and Directional Light for subtle 1.5°-2.2° cursor depth response
    // while keeping Spline's built-in Start transition animations on Star / Star 2 / Star 3 untouched.
    let rootGroup: any = null;
    let dirLight: any = null;
    let baseGroupRotX = 0;
    let baseGroupRotY = 0;
    let baseGroupPosX = 0;
    let baseGroupPosY = 0;
    let baseLightPosX = 0;
    let baseLightPosY = 0;

    try {
      if (internalApp._scene && typeof internalApp._scene.traverse === 'function') {
        internalApp._scene.traverse((node: any) => {
          if (
            node.uuid === 'cce4d4e2-f65b-4a4d-8fab-2b48b1429c5d' ||
            node.name === 'Group 2'
          ) {
            rootGroup = node;
            baseGroupRotX = node.rotation?.x ?? 0;
            baseGroupRotY = node.rotation?.y ?? 0;
            baseGroupPosX = node.position?.x ?? 0;
            baseGroupPosY = node.position?.y ?? 0;
          } else if (
            node.uuid === '830a2708-8ed9-49cf-a68e-085299899103' ||
            node.name === 'Directional Light'
          ) {
            dirLight = node;
            baseLightPosX = node.position?.x ?? 0;
            baseLightPosY = node.position?.y ?? 0;
          }
        });
      }
    } catch {
      // Non-fatal
    }

    let currentX = 0;
    let currentY = 0;
    let rafId: number | null = null;

    const MAX_ROT_RAD = 0.038;
    const MAX_POS_SHIFT = 4.5;
    const SMOOTHING = 0.055;

    const tick = () => {
      try {
        const ptr = pointerRef.current;
        const targetX = ptr.active
          ? Math.max(-1, Math.min(1, ptr.x))
          : 0;
        const targetY = ptr.active
          ? Math.max(-1, Math.min(1, ptr.y))
          : 0;

        currentX += (targetX - currentX) * SMOOTHING;
        currentY += (targetY - currentY) * SMOOTHING;

        if (rootGroup) {
          rootGroup.rotation.x = baseGroupRotX - currentY * MAX_ROT_RAD;
          rootGroup.rotation.y = baseGroupRotY + currentX * MAX_ROT_RAD;
          rootGroup.position.x = baseGroupPosX + currentX * MAX_POS_SHIFT;
          rootGroup.position.y = baseGroupPosY - currentY * MAX_POS_SHIFT;
          rootGroup.updateMatrix?.();
          rootGroup.updateMatrixWorld?.(true);
        }

        if (dirLight?.position) {
          dirLight.position.x = baseLightPosX + currentX * 28;
          dirLight.position.y = baseLightPosY - currentY * 28;
          dirLight.updateMatrix?.();
          dirLight.updateMatrixWorld?.(true);
        }

        if (stageParallaxRef.current) {
          const overlayShiftX = (currentX * 7).toFixed(2);
          const overlayShiftY = (currentY * 7).toFixed(2);
          stageParallaxRef.current.style.transform = `translate3d(${overlayShiftX}px, ${overlayShiftY}px, 0)`;
        }

        splineApp.requestRender();
      } catch {
        // Non-fatal
      }
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);

    return () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  };

  useEffect(() => {
    if (!isLoaded || !splineAppRef.current || !isVisible || useFallback) {
      cleanupRuntimeRef.current?.();
      cleanupRuntimeRef.current = null;
      return;
    }

    cleanupRuntimeRef.current?.();
    cleanupRuntimeRef.current = configureMarketSpline(splineAppRef.current);

    return () => {
      cleanupRuntimeRef.current?.();
      cleanupRuntimeRef.current = null;
    };
  }, [isLoaded, isVisible, useFallback]);

  const handleSplineLoad = (app: Application) => {
    splineAppRef.current = app;
    cleanupRuntimeRef.current?.();
    cleanupRuntimeRef.current = configureMarketSpline(app);
    setIsLoaded(true);
  };

  const handleSplineError = () => {
    if (!triedLocalBackup && sceneUrl !== PAGE_2_SPLINE_BACKUP_URL) {
      setTriedLocalBackup(true);
      setSceneUrl(PAGE_2_SPLINE_BACKUP_URL);
    } else {
      setUseFallback(true);
    }
  };

  const isPrimaryFieldHighlighted =
    activeNodeId === null ||
    activeNodeId === 'candidate-location' ||
    activeNodeId === 'competition-access';
  const isSecondaryFieldHighlighted =
    activeNodeId === 'commercial-activity' ||
    activeNodeId === 'candidate-location';

  return (
    <div
      ref={stageRef}
      className="relative flex h-full w-full items-center justify-center select-none"
    >
      {/* DARK SPATIAL INSTRUMENT STAGE (#0A1016 / #0C131A) */}
      <div className="relative h-[500px] w-full max-w-[780px] sm:h-[560px] lg:h-[640px]">
        {/* 1. Deep Charcoal/Navy Glass Stage Housing with Subtle Tonal Variation */}
        <div
          className="pointer-events-none absolute inset-4 rounded-[36px] border border-[#6FAF9B]/20 bg-[radial-gradient(circle_at_50%_48%,#101A24_0%,#0C131A_52%,#090E14_100%)] shadow-[0_32px_80px_-20px_rgba(4,7,11,0.85),inset_0_1px_0_0_rgba(215,225,221,0.12)] backdrop-blur-xl"
          aria-hidden="true"
        />

        {/* Subtle LOCUS Sage/Emerald Volumetric Glow Behind the Prismatic Signal Objects */}
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-[440px] w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background:
              'radial-gradient(circle at 48% 50%, rgba(61, 128, 109, 0.16) 0%, rgba(111, 175, 155, 0.08) 42%, rgba(12, 19, 26, 0.0) 74%)',
          }}
          aria-hidden="true"
        />

        {/* 2. Local Market Catchment Rings & Signal Relationships (SVG Layer) */}
        <div
          ref={stageParallaxRef}
          className="pointer-events-none absolute inset-0 transition-transform duration-75 ease-out"
        >
          <svg
            viewBox="0 0 1000 1000"
            className="h-full w-full overflow-visible"
            aria-hidden="true"
          >
            <defs>
              <linearGradient
                id="locusSignalCouplingPrimary"
                x1="49.8%"
                y1="52.8%"
                x2="39.5%"
                y2="35.5%"
              >
                <stop offset="0%" stopColor="#6FAF9B" stopOpacity="0.65" />
                <stop offset="50%" stopColor="#3D806D" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#D7E1DD" stopOpacity="0.55" />
              </linearGradient>

              <linearGradient
                id="locusSignalCouplingSecondary"
                x1="49.8%"
                y1="52.8%"
                x2="58.5%"
                y2="67.8%"
              >
                <stop offset="0%" stopColor="#6FAF9B" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#3D806D" stopOpacity="0.24" />
              </linearGradient>
            </defs>

            {/* Outer Local Area Boundary Ring */}
            <circle
              cx="498"
              cy="528"
              r="330"
              fill="none"
              stroke="rgba(215, 225, 221, 0.07)"
              strokeWidth="1"
            />
            {/* Middle Market Catchment Ring */}
            <circle
              cx="498"
              cy="528"
              r="235"
              fill="none"
              stroke="rgba(111, 175, 155, 0.22)"
              strokeWidth="1"
              strokeDasharray="5 7"
            />
            {/* Inner Candidate Location Radius Ring */}
            <circle
              cx="498"
              cy="528"
              r="138"
              fill="none"
              stroke="rgba(111, 175, 155, 0.18)"
              strokeWidth="1"
            />

            {/* Signal Field Ring around Upper-Left Signal (Star 2) */}
            <circle
              cx="395"
              cy="355"
              r={activeNodeId === 'competition-access' ? '92' : '82'}
              fill="none"
              stroke={
                isPrimaryFieldHighlighted
                  ? 'rgba(111, 175, 155, 0.36)'
                  : 'rgba(111, 175, 155, 0.18)'
              }
              strokeWidth="1.2"
              strokeDasharray="3 5"
            />

            {/* Signal Field Ring around Lower-Right Signal (Star 3) */}
            <circle
              cx="585"
              cy="678"
              r={activeNodeId === 'commercial-activity' ? '64' : '54'}
              fill="none"
              stroke={
                isSecondaryFieldHighlighted
                  ? 'rgba(111, 175, 155, 0.32)'
                  : 'rgba(215, 225, 221, 0.12)'
              }
              strokeWidth="1"
            />

            {/* Subtle Spatial Coordinate Crosshairs */}
            <line
              x1="140"
              y1="528"
              x2="856"
              y2="528"
              stroke="rgba(215, 225, 221, 0.05)"
              strokeWidth="1"
            />
            <line
              x1="498"
              y1="170"
              x2="498"
              y2="886"
              stroke="rgba(215, 225, 221, 0.05)"
              strokeWidth="1"
            />

            {/* SIGNAL RELATIONSHIP ARC 1: CANDIDATE LOCATION <-> COMPETITION & ACCESSIBILITY */}
            <path
              d="M 498 528 Q 392 468 395 355"
              fill="none"
              stroke="url(#locusSignalCouplingPrimary)"
              strokeWidth={isPrimaryFieldHighlighted ? '2.0' : '1.3'}
              strokeLinecap="round"
            />
            <path
              d="M 498 528 Q 392 468 395 355"
              fill="none"
              stroke="#6FAF9B"
              strokeWidth="1.8"
              strokeDasharray="6 10"
              strokeOpacity={isPrimaryFieldHighlighted ? '0.6' : '0.25'}
            />

            {/* Animated Signal Pulse Flowing Between Local Market Signals */}
            {!preferFallback && (
              <circle r="3.2" fill="#6FAF9B">
                <animateMotion
                  dur="4.4s"
                  repeatCount="indefinite"
                  path="M 395 355 Q 392 468 498 528"
                />
              </circle>
            )}

            {/* SIGNAL RELATIONSHIP ARC 2: CANDIDATE LOCATION <-> COMMERCIAL ACTIVITY */}
            <path
              d="M 498 528 Q 565 592 585 678"
              fill="none"
              stroke="url(#locusSignalCouplingSecondary)"
              strokeWidth={isSecondaryFieldHighlighted ? '1.6' : '1.1'}
              strokeDasharray="4 6"
            />

            {/* Technical Leader Lines Connecting 3D Signal Objects to Unobstructed Pills */}
            {/* Upper-left signal leader line */}
            <polyline
              points="356,288 318,225 288,225"
              fill="none"
              stroke="rgba(111, 175, 155, 0.42)"
              strokeWidth="1"
            />
            <circle cx="356" cy="288" r="2.2" fill="#6FAF9B" />

            {/* Center candidate location leader line */}
            <polyline
              points="612,516 664,485 700,485"
              fill="none"
              stroke="rgba(215, 225, 221, 0.36)"
              strokeWidth="1"
            />
            <circle cx="612" cy="516" r="2.2" fill="#D7E1DD" />

            {/* Lower-right signal leader line */}
            <polyline
              points="632,684 676,708 702,708"
              fill="none"
              stroke="rgba(111, 175, 155, 0.34)"
              strokeWidth="1"
            />
            <circle cx="632" cy="684" r="2.2" fill="#3D806D" />
          </svg>
        </div>

        {/* 3. Interactive 3D Spline Canvas (Prismatic Sparkle Objects as Spatial Signals) */}
        <div className="spline-canvas-wrapper relative z-10 h-full w-full">
          {!isLoaded && !useFallback && (
            <div
              className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
              role="status"
              aria-live="polite"
            >
              <div className="relative flex items-center justify-center">
                <div
                  className="h-28 w-28 animate-ping rounded-full border border-[#6FAF9B]/30"
                  style={{ animationDuration: '2.8s' }}
                />
                <div className="absolute h-16 w-16 rounded-full border border-[#3D806D]/40 bg-[#0C131A]/80 backdrop-blur-md" />
                <div className="absolute h-2.5 w-2.5 rounded-full bg-[#6FAF9B]" />
              </div>
              <span className="mt-4 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-[#D7E1DD]/70">
                Calibrating Spatial Signals
              </span>
            </div>
          )}

          {useFallback ? (
            <SpatialStageFallback activeNodeId={activeNodeId} />
          ) : (
            shouldLoad && (
              <SplineStageErrorBoundary
                onError={handleSplineError}
                fallback={<SpatialStageFallback activeNodeId={activeNodeId} />}
              >
                <Suspense fallback={null}>
                  <div
                    className={`h-full w-full transition-opacity duration-700 ${
                      isLoaded ? 'opacity-100' : 'opacity-0'
                    }`}
                  >
                    <LazySpline
                      key={sceneUrl}
                      scene={sceneUrl}
                      onLoad={handleSplineLoad}
                      onError={handleSplineError}
                    />
                  </div>
                </Suspense>
              </SplineStageErrorBoundary>
            )
          )}
        </div>

        {/* 4. Restrained LOCUS Spatial Signal Labels (No Hardcoded Cities) */}
        <div className="pointer-events-none absolute inset-0 z-20">
          {/* Top-Right Instrument Stage Header Pill */}
          <div className="absolute right-7 top-7 hidden sm:block">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#6FAF9B]/25 bg-[#0C131A]/80 px-3.5 py-1.5 shadow-[0_8px_24px_-6px_rgba(0,0,0,0.6)] backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-full bg-[#6FAF9B]" />
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[#D7E1DD]/80">
                LOCAL MARKET STRUCTURE
              </span>
            </div>
          </div>

          {/* Left Catchment Field Indicator Pill (cleanly outside 3D silhouette) */}
          <div
            className="absolute"
            style={{
              left: '21.5%',
              top: '48.5%',
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 backdrop-blur-md transition-all duration-300 ${
                isPrimaryFieldHighlighted
                  ? 'border-[#6FAF9B]/30 bg-[#0C131A]/90 text-[#6FAF9B] shadow-[0_6px_20px_rgba(0,0,0,0.45)]'
                  : 'border-white/10 bg-[#0A1016]/75 text-[#A9B8B3]/70'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#6FAF9B]" />
              <span className="font-mono text-[9px] font-bold uppercase tracking-[0.18em]">
                LOCAL CATCHMENT
              </span>
            </div>
          </div>

          {/* Generic Spatial Signal Callout Pills */}
          {nodes.map((node) => {
            const isHovered = activeNodeId === node.id;
            const isCore = node.tier === 'primary-core';

            return (
              <React.Fragment key={node.id}>
                {/* Interactive Hover Target Zone around the 3D Signal Object */}
                <button
                  type="button"
                  style={{
                    left: `${node.stageX}%`,
                    top: `${node.stageY}%`,
                  }}
                  onMouseEnter={() => onNodeHover?.(node.id)}
                  onMouseLeave={() => onNodeHover?.(null)}
                  onFocus={() => onNodeHover?.(node.id)}
                  onBlur={() => onNodeHover?.(null)}
                  aria-label={`${node.label} — ${node.subLabel}`}
                  className="pointer-events-auto absolute h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full focus:outline-none"
                />

                {/* Unobstructed Dark Glass Signal Pill */}
                <div
                  style={{
                    left: `${node.pillX}%`,
                    top: `${node.pillY}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  className="pointer-events-auto absolute"
                  onMouseEnter={() => onNodeHover?.(node.id)}
                  onMouseLeave={() => onNodeHover?.(null)}
                >
                  <div
                    className={`inline-flex flex-col rounded-xl border px-3 py-1.5 backdrop-blur-md transition-all duration-300 ${
                      isHovered
                        ? 'border-[#6FAF9B]/60 bg-[#0E1720]/90 shadow-[0_12px_30px_-8px_rgba(111,175,155,0.28)]'
                        : isCore
                        ? 'border-[#6FAF9B]/30 bg-[#0C131A]/90 shadow-[0_10px_24px_-6px_rgba(0,0,0,0.65)]'
                        : 'border-white/15 bg-[#0A1016]/80 shadow-[0_8px_20px_-6px_rgba(0,0,0,0.5)]'
                    }`}
                  >
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          isCore
                            ? 'bg-[#6FAF9B] shadow-[0_0_8px_rgba(111,175,155,0.8)]'
                            : node.tier === 'primary-signal'
                            ? 'bg-[#3D806D]'
                            : 'bg-[#A9B8B3]'
                        }`}
                      />
                      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#F1F5F9]">
                        {node.label}
                      </span>
                    </div>
                    <span className="mt-0.5 pl-3.5 font-mono text-[8.5px] font-medium uppercase tracking-[0.16em] text-[#6FAF9B]/80">
                      {node.subLabel}
                    </span>
                  </div>
                </div>
              </React.Fragment>
            );
          })}

          {/* Bottom Stage Metaphor Pill: SCATTERED SIGNALS -> STRUCTURED MARKET -> LOCAL INTELLIGENCE */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
            <div className="inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-[#0C131A]/90 px-4 py-1.5 shadow-[0_10px_28px_-6px_rgba(0,0,0,0.65)] backdrop-blur-md">
              <span className="font-mono text-[9.5px] font-medium uppercase tracking-[0.18em] text-[#A9B8B3]">
                SCATTERED SIGNALS
              </span>
              <span className="font-mono text-[10px] text-[#6FAF9B]">→</span>
              <span className="font-mono text-[9.5px] font-medium uppercase tracking-[0.18em] text-[#D7E1DD]">
                STRUCTURED MARKET
              </span>
              <span className="font-mono text-[10px] text-[#6FAF9B]">→</span>
              <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.18em] text-[#6FAF9B]">
                LOCAL INTELLIGENCE
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
