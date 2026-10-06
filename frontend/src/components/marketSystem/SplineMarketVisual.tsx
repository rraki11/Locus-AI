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
    stageX: 59.2,
    stageY: 66.8,
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
      {/* Abstract Prismatic Spatial Signal Nodes on Deep Obsidian-Indigo Stage */}
      <div
        className={`absolute left-[39.5%] top-[35.5%] h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#D946EF]/45 bg-[radial-gradient(circle_at_35%_35%,rgba(217,70,239,0.48)_0%,rgba(168,85,247,0.22)_52%,rgba(11,14,29,0.92)_100%)] shadow-[0_0_44px_rgba(217,70,239,0.28)] transition-transform duration-500 ${
          activeNodeId === 'competition-access' ? 'scale-110' : 'scale-100'
        }`}
      />
      <div
        className={`absolute left-[49.8%] top-[52.8%] h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#C084FC]/50 bg-[radial-gradient(circle_at_35%_35%,rgba(56,189,248,0.42)_0%,rgba(192,132,252,0.28)_48%,rgba(8,10,22,0.96)_100%)] shadow-[0_0_60px_rgba(168,85,247,0.3)] transition-transform duration-500 ${
          activeNodeId === 'candidate-location' ? 'scale-105' : 'scale-100'
        }`}
      />
      <div
        className={`absolute left-[58.5%] top-[67.8%] h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#38BDF8]/45 bg-[radial-gradient(circle_at_35%_35%,rgba(56,189,248,0.44)_0%,rgba(244,114,182,0.18)_55%,rgba(11,14,29,0.92)_100%)] opacity-90 shadow-[0_0_36px_rgba(56,189,248,0.25)] transition-transform duration-500 ${
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

    // 1. Disable Spline's built-in erratic mouse-follow events & scroll hijacking
    // (we drive smooth, bounded spatial parallax via our own pointerRef rAF loop below)
    try {
      if (typeof splineApp.setGlobalEvents === 'function') {
        splineApp.setGlobalEvents(false);
      }
      if (internalApp._eventManager) {
        internalApp._eventManager.updateUseWindowEvents?.(false);
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

    // 4. Calibrate "Group 2" / "Group" / "Star 3" (the 3rd little element) so it sits
    // squarely centered inside its cyan signal circle, with no wild mouse-follow drift.
    let star3OuterGroup: any = null;
    let star3InnerGroup: any = null;
    let star3MeshNode: any = null;
    let star2Node: any = null;
    let star1Node: any = null;
    let dirLight: any = null;

    const BASE_STAR1_POS = { x: 0, y: 0 };
    const BASE_STAR2_POS = { x: -33.51, y: 33.9 };
    const BASE_STAR3_GROUP_POS = { x: 14.5, y: -38.5 };

    let baseLightPosX = 200;
    let baseLightPosY = 300;

    try {
      if (internalApp._scene && typeof internalApp._scene.traverse === 'function') {
        internalApp._scene.traverse((node: any) => {
          if (
            node.uuid === 'cce4d4e2-f65b-4a4d-8fab-2b48b1429c5d' ||
            node.name === 'Group 2'
          ) {
            star3OuterGroup = node;
            if (node.position) {
              node.position.x = BASE_STAR3_GROUP_POS.x;
              node.position.y = BASE_STAR3_GROUP_POS.y;
            }
          } else if (node.name === 'Group') {
            star3InnerGroup = node;
          } else if (node.name === 'Star 3') {
            star3MeshNode = node;
          } else if (
            node.uuid === 'bf8914e6-b3ec-455d-844c-37d9cd8ea6e3' ||
            node.name === 'Star 2'
          ) {
            star2Node = node;
          } else if (
            node.uuid === 'f0daa678-567b-46c9-9625-323a1bb42dfd' ||
            node.name === 'Star'
          ) {
            star1Node = node;
          } else if (
            node.uuid === '830a2708-8ed9-49cf-a68e-085299899103' ||
            node.name === 'Directional Light'
          ) {
            dirLight = node;
            baseLightPosX = node.position?.x ?? 200;
            baseLightPosY = node.position?.y ?? 300;
          }
        });
      }
    } catch {
      // Non-fatal
    }

    let currentX = 0;
    let currentY = 0;
    let rafId: number | null = null;

    const MAX_ROT_RAD = 0.025;
    const MAX_POS_SHIFT = 1.8;
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

        if (star1Node?.position) {
          star1Node.position.x = BASE_STAR1_POS.x + currentX * MAX_POS_SHIFT;
          star1Node.position.y = BASE_STAR1_POS.y - currentY * MAX_POS_SHIFT;
          if (star1Node.rotation) {
            star1Node.rotation.x = -currentY * MAX_ROT_RAD;
            star1Node.rotation.y = currentX * MAX_ROT_RAD;
          }
          star1Node.updateMatrix?.();
          star1Node.updateMatrixWorld?.(true);
        }

        if (star2Node?.position) {
          star2Node.position.x = BASE_STAR2_POS.x + currentX * MAX_POS_SHIFT;
          star2Node.position.y = BASE_STAR2_POS.y - currentY * MAX_POS_SHIFT;
          if (star2Node.rotation) {
            star2Node.rotation.x = -currentY * MAX_ROT_RAD;
            star2Node.rotation.y = currentX * MAX_ROT_RAD;
          }
          star2Node.updateMatrix?.();
          star2Node.updateMatrixWorld?.(true);
        }

        // Keep inner Group & Star 3 locked to the exact midpoint offset so the 3rd little element
        // sits bullseye at (592, 668) inside the lower-right cyan signal circle
        if (star3InnerGroup?.position) {
          star3InnerGroup.position.x = 0;
          star3InnerGroup.position.y = 0;
          star3InnerGroup.position.z = 0;
          star3InnerGroup.updateMatrix?.();
          star3InnerGroup.updateMatrixWorld?.(true);
        }
        if (star3MeshNode?.position) {
          star3MeshNode.position.x = 2.36 + currentX * MAX_POS_SHIFT;
          star3MeshNode.position.y = 11.5 - currentY * MAX_POS_SHIFT;
          star3MeshNode.position.z = -1.59;
          star3MeshNode.updateMatrix?.();
          star3MeshNode.updateMatrixWorld?.(true);
        }

        if (star3OuterGroup) {
          if (star3OuterGroup.position) {
            star3OuterGroup.position.x =
              BASE_STAR3_GROUP_POS.x + currentX * MAX_POS_SHIFT;
            star3OuterGroup.position.y =
              BASE_STAR3_GROUP_POS.y - currentY * MAX_POS_SHIFT;
          }
          if (star3OuterGroup.rotation) {
            star3OuterGroup.rotation.x = -currentY * MAX_ROT_RAD;
            star3OuterGroup.rotation.y = currentX * MAX_ROT_RAD;
          }
          star3OuterGroup.updateMatrix?.();
          star3OuterGroup.updateMatrixWorld?.(true);
        }

        if (dirLight?.position) {
          dirLight.position.x = baseLightPosX + currentX * 28;
          dirLight.position.y = baseLightPosY - currentY * 28;
          dirLight.updateMatrix?.();
          dirLight.updateMatrixWorld?.(true);
        }

        if (stageParallaxRef.current) {
          const overlayShiftX = (currentX * 4.5).toFixed(2);
          const overlayShiftY = (currentY * 4.5).toFixed(2);
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
      {/* PRISMATIC OBSIDIAN SPATIAL INSTRUMENT STAGE (#070913 / #0B0E1D) */}
      <div className="relative h-[500px] w-full max-w-[780px] sm:h-[560px] lg:h-[640px]">
        {/* 1. Deep Obsidian-Indigo Glass Stage Housing with Prismatic Specular Rim */}
        <div
          className="pointer-events-none absolute inset-4 rounded-[36px] border border-[#C084FC]/25 bg-[radial-gradient(circle_at_48%_46%,#151730_0%,#0B0E1E_54%,#070913_100%)] shadow-[0_32px_90px_-20px_rgba(4,5,14,0.92),0_0_56px_-18px_rgba(168,85,247,0.22),inset_0_1px_0_0_rgba(232,121,249,0.18)] backdrop-blur-xl"
          aria-hidden="true"
        />

        {/* Multi-Spectrum Volumetric Glows Anchored Behind Each 3D Sparkle Object */}
        {/* Upper-left Violet/Magenta Star Glow */}
        <div
          className="pointer-events-none absolute left-[39.5%] top-[35.5%] h-[280px] w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background:
              'radial-gradient(circle at 50% 50%, rgba(217, 70, 239, 0.20) 0%, rgba(168, 85, 247, 0.09) 46%, rgba(11, 14, 30, 0.0) 74%)',
          }}
          aria-hidden="true"
        />
        {/* Center Prismatic Obsidian Core Glow */}
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background:
              'radial-gradient(circle at 48% 50%, rgba(139, 92, 246, 0.16) 0%, rgba(56, 189, 248, 0.09) 44%, rgba(11, 14, 30, 0.0) 76%)',
          }}
          aria-hidden="true"
        />
        {/* Lower-right Electric Cyan & Coral Star Glow */}
        <div
          className="pointer-events-none absolute left-[58.5%] top-[67.8%] h-[260px] w-[260px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background:
              'radial-gradient(circle at 50% 50%, rgba(56, 189, 248, 0.18) 0%, rgba(244, 114, 182, 0.08) 46%, rgba(11, 14, 30, 0.0) 74%)',
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
                <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.72" />
                <stop offset="50%" stopColor="#C084FC" stopOpacity="0.90" />
                <stop offset="100%" stopColor="#E879F9" stopOpacity="0.78" />
              </linearGradient>

              <linearGradient
                id="locusSignalCouplingSecondary"
                x1="49.8%"
                y1="52.8%"
                x2="58.5%"
                y2="67.8%"
              >
                <stop offset="0%" stopColor="#C084FC" stopOpacity="0.65" />
                <stop offset="55%" stopColor="#38BDF8" stopOpacity="0.82" />
                <stop offset="100%" stopColor="#FB7185" stopOpacity="0.58" />
              </linearGradient>
            </defs>

            {/* Outer Local Area Boundary Ring */}
            <circle
              cx="498"
              cy="528"
              r="330"
              fill="none"
              stroke="rgba(226, 232, 240, 0.075)"
              strokeWidth="1"
            />
            {/* Middle Market Catchment Ring (Prismatic Violet) */}
            <circle
              cx="498"
              cy="528"
              r="235"
              fill="none"
              stroke="rgba(192, 132, 252, 0.25)"
              strokeWidth="1"
              strokeDasharray="5 7"
            />
            {/* Inner Candidate Location Radius Ring (Electric Cyan) */}
            <circle
              cx="498"
              cy="528"
              r="138"
              fill="none"
              stroke="rgba(56, 189, 248, 0.22)"
              strokeWidth="1"
            />

            {/* Signal Field Ring around Upper-Left Signal (Star 2 — Violet/Magenta) */}
            <circle
              cx="395"
              cy="355"
              r={activeNodeId === 'competition-access' ? '92' : '82'}
              fill="none"
              stroke={
                isPrimaryFieldHighlighted
                  ? 'rgba(217, 70, 239, 0.44)'
                  : 'rgba(192, 132, 252, 0.22)'
              }
              strokeWidth="1.2"
              strokeDasharray="3 5"
            />

            {/* Signal Field Ring around Lower-Right Signal (Star 3 — Electric Cyan) */}
            <circle
              cx="592"
              cy="668"
              r={activeNodeId === 'commercial-activity' ? '64' : '54'}
              fill="none"
              stroke={
                isSecondaryFieldHighlighted
                  ? 'rgba(56, 189, 248, 0.48)'
                  : 'rgba(56, 189, 248, 0.24)'
              }
              strokeWidth="1"
            />

            {/* Subtle Spatial Coordinate Crosshairs */}
            <line
              x1="140"
              y1="528"
              x2="856"
              y2="528"
              stroke="rgba(192, 132, 252, 0.06)"
              strokeWidth="1"
            />
            <line
              x1="498"
              y1="170"
              x2="498"
              y2="886"
              stroke="rgba(56, 189, 248, 0.06)"
              strokeWidth="1"
            />

            {/* SIGNAL RELATIONSHIP ARC 1: CANDIDATE LOCATION <-> COMPETITION & ACCESSIBILITY */}
            <path
              d="M 498 528 Q 392 468 395 355"
              fill="none"
              stroke="url(#locusSignalCouplingPrimary)"
              strokeWidth={isPrimaryFieldHighlighted ? '2.1' : '1.4'}
              strokeLinecap="round"
            />
            <path
              d="M 498 528 Q 392 468 395 355"
              fill="none"
              stroke="#E879F9"
              strokeWidth="1.8"
              strokeDasharray="6 10"
              strokeOpacity={isPrimaryFieldHighlighted ? '0.68' : '0.30'}
            />

            {/* Animated Signal Pulses Flowing Between Local Market Signals */}
            {!preferFallback && (
              <>
                <circle r="3.4" fill="#E879F9">
                  <animateMotion
                    dur="4.4s"
                    repeatCount="indefinite"
                    path="M 395 355 Q 392 468 498 528"
                  />
                </circle>
                <circle r="2.8" fill="#38BDF8">
                  <animateMotion
                    dur="5.2s"
                    repeatCount="indefinite"
                    path="M 498 528 Q 565 590 592 668"
                  />
                </circle>
              </>
            )}

            {/* SIGNAL RELATIONSHIP ARC 2: CANDIDATE LOCATION <-> COMMERCIAL ACTIVITY */}
            <path
              d="M 498 528 Q 565 590 592 668"
              fill="none"
              stroke="url(#locusSignalCouplingSecondary)"
              strokeWidth={isSecondaryFieldHighlighted ? '1.8' : '1.25'}
              strokeDasharray="4 6"
            />

            {/* Technical Leader Lines Connecting 3D Signal Objects to Unobstructed Pills */}
            {/* Upper-left signal leader line (Violet/Magenta) */}
            <polyline
              points="356,288 318,225 288,225"
              fill="none"
              stroke="rgba(217, 70, 239, 0.48)"
              strokeWidth="1"
            />
            <circle cx="356" cy="288" r="2.4" fill="#E879F9" />

            {/* Center candidate location leader line (Prismatic Lavender/Silver) */}
            <polyline
              points="612,516 664,485 700,485"
              fill="none"
              stroke="rgba(192, 132, 252, 0.45)"
              strokeWidth="1"
            />
            <circle cx="612" cy="516" r="2.4" fill="#C084FC" />

            {/* Lower-right signal leader line (Electric Cyan) */}
            <polyline
              points="638,676 676,705 702,705"
              fill="none"
              stroke="rgba(56, 189, 248, 0.48)"
              strokeWidth="1"
            />
            <circle cx="638" cy="676" r="2.4" fill="#38BDF8" />
          </svg>
        </div>

        {/* 3. Interactive 3D Spline Canvas (Prismatic Sparkle Objects as Spatial Signals) */}
        <div className="spline-canvas-wrapper pointer-events-none relative z-10 h-full w-full">
          {!isLoaded && !useFallback && (
            <div
              className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
              role="status"
              aria-live="polite"
            >
              <div className="relative flex items-center justify-center">
                <div
                  className="h-28 w-28 animate-ping rounded-full border border-[#C084FC]/35"
                  style={{ animationDuration: '2.8s' }}
                />
                <div className="absolute h-16 w-16 rounded-full border border-[#38BDF8]/40 bg-[#0B0E1D]/85 backdrop-blur-md" />
                <div className="absolute h-2.5 w-2.5 rounded-full bg-gradient-to-tr from-[#E879F9] to-[#38BDF8]" />
              </div>
              <span className="mt-4 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-[#E9D5FF]/80">
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

        {/* 4. Restrained Prismatic Spatial Signal Labels (No Hardcoded Cities) */}
        <div className="pointer-events-none absolute inset-0 z-20">
          {/* Top-Right Instrument Stage Header Pill */}
          <div className="absolute right-7 top-7 hidden sm:block">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#C084FC]/30 bg-[#0B0E1E]/85 px-3.5 py-1.5 shadow-[0_8px_24px_-6px_rgba(6,5,18,0.75),inset_0_1px_0_0_rgba(255,255,255,0.12)] backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-tr from-[#E879F9] to-[#38BDF8] shadow-[0_0_8px_rgba(232,121,249,0.85)]" />
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[#E2E8F0]/90">
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
                  ? 'border-[#C084FC]/35 bg-[#0C0F22]/90 text-[#E9D5FF] shadow-[0_6px_20px_rgba(12,8,28,0.65)]'
                  : 'border-white/10 bg-[#090C1A]/75 text-[#94A3B8]/80'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#C084FC] shadow-[0_0_8px_rgba(192,132,252,0.8)]" />
              <span className="font-mono text-[9px] font-bold uppercase tracking-[0.18em]">
                LOCAL CATCHMENT
              </span>
            </div>
          </div>

          {/* Generic Spatial Signal Callout Pills Matched to Each 3D Star's Chromatic Palette */}
          {nodes.map((node) => {
            const isHovered = activeNodeId === node.id;
            const isCore = node.tier === 'primary-core';
            const isUpperViolet = node.id === 'competition-access';
            const isLowerCyan = node.id === 'commercial-activity';

            const pillBorderStyle = isHovered
              ? isLowerCyan
                ? 'border-[#38BDF8]/65 bg-[#0D1328]/95 shadow-[0_12px_32px_-8px_rgba(56,189,248,0.34)]'
                : 'border-[#E879F9]/65 bg-[#12112A]/95 shadow-[0_12px_32px_-8px_rgba(217,70,239,0.34)]'
              : isCore
              ? 'border-[#C084FC]/40 bg-[#0C1022]/90 shadow-[0_12px_28px_-6px_rgba(6,5,18,0.8),inset_0_1px_0_0_rgba(255,255,255,0.12)]'
              : isUpperViolet
              ? 'border-[#D946EF]/30 bg-[#0B0E1F]/85 shadow-[0_8px_22px_-6px_rgba(6,5,18,0.7)]'
              : 'border-[#38BDF8]/30 bg-[#0A1022]/85 shadow-[0_8px_22px_-6px_rgba(6,5,18,0.7)]';

            const dotClass = isCore
              ? 'bg-gradient-to-tr from-[#C084FC] via-[#E879F9] to-[#38BDF8] shadow-[0_0_9px_rgba(217,70,239,0.9)]'
              : isUpperViolet
              ? 'bg-[#E879F9] shadow-[0_0_8px_rgba(232,121,249,0.85)]'
              : 'bg-[#38BDF8] shadow-[0_0_8px_rgba(56,189,248,0.85)]';

            const subLabelColor = isCore
              ? 'text-[#E879F9]'
              : isUpperViolet
              ? 'text-[#D8B4FE]'
              : 'text-[#7DD3FC]';

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

                {/* Unobstructed Prismatic Obsidian Signal Pill */}
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
                    className={`inline-flex flex-col rounded-xl border px-3 py-1.5 backdrop-blur-md transition-all duration-300 ${pillBorderStyle}`}
                  >
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
                      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#F8FAFC]">
                        {node.label}
                      </span>
                    </div>
                    <span
                      className={`mt-0.5 pl-3.5 font-mono text-[8.5px] font-semibold uppercase tracking-[0.16em] ${subLabelColor}`}
                    >
                      {node.subLabel}
                    </span>
                  </div>
                </div>
              </React.Fragment>
            );
          })}

          {/* Bottom Stage Metaphor Pill: SCATTERED SIGNALS -> STRUCTURED MARKET -> LOCAL INTELLIGENCE */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
            <div className="inline-flex items-center gap-2.5 rounded-full border border-[#C084FC]/30 bg-[#0B0E1E]/90 px-4 py-1.5 shadow-[0_12px_30px_-6px_rgba(5,4,16,0.8),inset_0_1px_0_0_rgba(255,255,255,0.12)] backdrop-blur-md">
              <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-[#D8B4FE]">
                SCATTERED SIGNALS
              </span>
              <span className="font-mono text-[10px] text-[#E879F9]">→</span>
              <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-[#F1F5F9]">
                STRUCTURED MARKET
              </span>
              <span className="font-mono text-[10px] text-[#38BDF8]">→</span>
              <span className="bg-gradient-to-r from-[#E879F9] to-[#38BDF8] bg-clip-text font-mono text-[9.5px] font-bold uppercase tracking-[0.18em] text-transparent">
                LOCAL INTELLIGENCE
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
