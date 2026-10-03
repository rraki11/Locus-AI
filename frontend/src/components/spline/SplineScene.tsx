import React, { Component, ReactNode, Suspense, lazy, useEffect, useRef, useState } from 'react';
import type { Application } from '@splinetool/runtime';
import { SplineLoader, SplineSceneVariant } from './SplineLoader';
import { SplineFallback } from './SplineFallback';

const LazySpline = lazy(() => import('@splinetool/react-spline'));

interface ErrorBoundaryProps {
  fallback: ReactNode;
  onError?: () => void;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class SplineErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
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

function isWebGLSupported(): boolean {
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

/**
 * Exact UUIDs and object names inspected from the .splinecode binaries
 * that must be hidden so only the desired 3D geometry remains visible:
 *
 * Scene 1 (glassmorph.splinecode):
 * - c36dee03-8ac2-4616-8bc2-6a50e5db13b5 : "R" (template corner logo)
 * - 5bb83dd4-f628-484c-9434-dcf23ade24a3 : "designgabor" (template author link)
 * Note: "Sphere" (9820e770-962d-4994-ac3d-6a725cb2b5c8) is the main spatial object
 * behind "glass tiles" (5a092663-e8f4-4f43-bf2e-201ff7efdda0); its material layers
 * are re-toned to oxidized green-silver (#D7E1DD highlight, #A9B8B3 base, #3D806D deep sage).
 *
 * Scene 3 (particles.splinecode):
 * - 1251e35c-f2a5-4dc9-9a72-bcb835fc296a : "Text" ("Move your mouse.")
 */
const HIDDEN_UUIDS_BY_VARIANT: Record<SplineSceneVariant, Set<string>> = {
  glassmorph: new Set([
    'c36dee03-8ac2-4616-8bc2-6a50e5db13b5', // "R" corner monogram
    '5bb83dd4-f628-484c-9434-dcf23ade24a3', // "designgabor" link object
  ]),
  particles: new Set([
    '1251e35c-f2a5-4dc9-9a72-bcb835fc296a', // "Move your mouse." Text
  ]),
};

const HIDDEN_NAMES_BY_VARIANT: Record<SplineSceneVariant, Set<string>> = {
  glassmorph: new Set(['R', 'designgabor']),
  particles: new Set(['Text']),
};

function configureSplineScene(
  splineApp: Application,
  variant: SplineSceneVariant,
  transparentBackground: boolean,
  heroPointerRef?: React.MutableRefObject<{ x: number; y: number }>
): () => void {
  const internalApp = splineApp as any;
  const hiddenUuids = HIDDEN_UUIDS_BY_VARIANT[variant];
  const hiddenNames = HIDDEN_NAMES_BY_VARIANT[variant];

  // 1. Enable global window pointer events and prevent scroll capture
  try {
    if (internalApp._eventManager && !internalApp.eventManager) {
      internalApp.eventManager = internalApp._eventManager;
    }

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
      internalApp._controls.orbitControls.resetHoverEffectOnPointerLeave = false;
      internalApp._controls.orbitControls.updateUseWindowEvents?.(true);
    }
  } catch {
    // Ignore if internal controls structure differs
  }

  // 2. Disable built-in Spline watermark overlay pass
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

  // 3. Hide unwanted template objects via BOTH public SPEObject.hide() and raw Three.js scene traversal
  try {
    const allObjects = splineApp.getAllObjects();
    for (const obj of allObjects) {
      if (hiddenUuids.has(obj.uuid) || hiddenNames.has((obj.name || '').trim())) {
        if (typeof obj.hide === 'function') {
          obj.hide();
        }
      }
    }
  } catch {
    // Continue to raw scene traversal
  }

  try {
    if (internalApp._scene && typeof internalApp._scene.traverse === 'function') {
      internalApp._scene.traverse((node: any) => {
        const uuid = String(node.uuid || '');
        const name = String(node.name || '').trim();
        const isTextMesh =
          node.geometry?.type === 'TextGeometry' ||
          node.data?.geometry?.type === 'TextGeometry';

        if (hiddenUuids.has(uuid) || hiddenNames.has(name) || isTextMesh) {
          node.visible = false;
          if (node.data) {
            node.data.visible = false;
          }
        }
      });
    }
  } catch {
    // Non-fatal
  }

  // Fixed middle BASE_POSITION for Scene 1 (glassmorph):
  // - Camera and Sphere anchored at the exact center of the central glass tile grid (313.0, 178.75)
  //   so both the glass structure and the spatial ball sit at 50.0% X, 50.0% Y in the middle of the website.
  // - Mouse follow uses PARALLAX_NDC_FACTOR = 0.25 (~±240px X, ±135px Y at 1920x1080) with smooth damping
  const CAM_CENTER_WORLD_X = 313.0;
  const CAM_CENTER_WORLD_Y = 178.75;
  const RESTING_WORLD_X = 313.0;
  const RESTING_WORLD_Y = 178.75;
  const RESTING_WORLD_Z = -759.9539759195773;
  const PARALLAX_NDC_FACTOR = 0.25;
  const SMOOTHING_FACTOR = 0.08;

  const alignCameraToMiddleComposition = (): { m00: number; m11: number } | null => {
    const cam =
      internalApp._eventManager?.eventContext?.getCamera?.() ||
      internalApp._scene?.activeCamera;
    if (!cam) return null;
    if (typeof cam.updateProjectionMatrix === 'function') {
      cam.updateProjectionMatrix();
    }
    const m00 = cam.projectionMatrix?.elements?.[0];
    const m11 = cam.projectionMatrix?.elements?.[5];
    if (typeof m00 === 'number' && m00 !== 0 && typeof m11 === 'number' && m11 !== 0) {
      cam.position.x = CAM_CENTER_WORLD_X;
      cam.position.y = CAM_CENTER_WORLD_Y;
      if (cam.data?.position) {
        cam.data.position[0] = CAM_CENTER_WORLD_X;
        cam.data.position[1] = CAM_CENTER_WORLD_Y;
      }
      cam.updateMatrix?.();
      cam.updateMatrixWorld?.(true);
      if (internalApp._controls?.orbitControls) {
        internalApp._controls.orbitControls.enabled = false;
        internalApp._controls.orbitControls.target?.set?.(CAM_CENTER_WORLD_X, CAM_CENTER_WORLD_Y, 0);
      }
      return { m00, m11 };
    }
    return null;
  };

  // 4. For Scene 1 (glassmorph), preserve the exact 3x3 liquid-glass tile structure in the middle and
  // organic green-silver spatial object material behind/within the glass structure.
  let sphereMeshRef: any = null;
  if (variant === 'glassmorph') {
    try {
      splineApp.setBackgroundColor('#F1F4F3');
      const activePage = internalApp._scene?.activePage;
      if (activePage?.bgColor?.setRGBA) {
        activePage.bgColor.setRGBA(241 / 255, 244 / 255, 243 / 255, 1);
      }

      alignCameraToMiddleComposition();

      const sphereProxy = splineApp.findObjectById('9820e770-962d-4994-ac3d-6a725cb2b5c8') as any;
      if (sphereProxy?.material?.layers) {
        let depthIndex = 0;
        for (const layer of sphereProxy.material.layers) {
          if ((layer.type === 'depth' || layer.type === 'gradient') && Array.isArray(layer.colors)) {
            if (depthIndex === 0) {
              layer.colors[0] = '#DCE4E1';
              layer.colors[1] = '#3B4945';
            } else {
              layer.colors[0] = '#A9B8B3';
              layer.colors[1] = '#6D7F7A';
              if ('alpha' in layer) {
                layer.alpha = 0.28;
              }
            }
            depthIndex += 1;
          } else if (layer.type === 'color') {
            layer.color = '#A9B8B3';
          } else if (layer.type === 'fresnel') {
            layer.color = '#D7E1DD';
          }
        }
      }

      if (internalApp._scene && typeof internalApp._scene.traverse === 'function') {
        internalApp._scene.traverse((node: any) => {
          if (node.uuid === '9820e770-962d-4994-ac3d-6a725cb2b5c8') {
            sphereMeshRef = node;
            if (node.position?.set) {
              node.position.set(RESTING_WORLD_X, RESTING_WORLD_Y, RESTING_WORLD_Z);
              node.updateMatrix?.();
              node.updateMatrixWorld?.(true);
            }
            // Disable Spline's internal canvas-bound Follow event on Sphere so that
            // our hero/window-level pointer controller is the single deterministic source
            // and hovering foreground HTML elements (CTA, headline, pills) never changes or resets the ball.
            if (Array.isArray(node.data?.events)) {
              for (const evData of node.data.events) {
                if (evData?.data?.type === 'Follow') {
                  evData.data.disabled = true;
                }
              }
            }
          }

          const u = node.material?.uniforms;
          if (!u) return;

          if (node.uuid === '9820e770-962d-4994-ac3d-6a725cb2b5c8') {
            if (typeof u.nodeU0?.value === 'number') u.nodeU0.value = -410;
            if (typeof u.nodeU1?.value === 'number') u.nodeU1.value = 410;
            if (u.nodeU3?.value && typeof u.nodeU3.value.set === 'function') {
              u.nodeU3.value.set(-0.58, 0.68, 0.45);
            }
            if (typeof u.nodeU11?.value === 'number') u.nodeU11.value = 0.25;
            if (u.nodeU13?.value?.setRGB) {
              u.nodeU13.value.setRGB(143 / 255, 161 / 255, 155 / 255);
            }
            if (typeof u.nodeU14?.value === 'number') u.nodeU14.value = 2.4;
            node.material.needsUpdate = true;
          } else if (node.uuid === '5a092663-e8f4-4f43-bf2e-201ff7efdda0') {
            if (u.nodeU0?.value?.setRGB) {
              u.nodeU0.value.setRGB(0.42, 0.45, 0.44);
            }
            if (typeof u.nodeU6?.value === 'number') u.nodeU6.value = 410;
            if (typeof u.nodeU8?.value === 'number') u.nodeU8.value = 3.2;
            node.material.needsUpdate = true;
          }
        });
      }
    } catch {
      // Non-fatal
    }
  }

  // 5. Configure transparent background if requested
  if (transparentBackground) {
    try {
      splineApp.setBackgroundColor('transparent');
      const activePage = internalApp._scene?.activePage;
      if (activePage) {
        if (activePage.bgColor && typeof activePage.bgColor.setRGBA === 'function') {
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
  }

  // 6. Disconnect Spline's built-in Follow handler on Scene 1 so it cannot snap or reset
  // when crossing between canvas, CTA button, headline, or other foreground elements.
  if (variant === 'glassmorph') {
    try {
      const followHandler = internalApp._eventManager?.handlers?.Follow;
      if (followHandler) {
        if (Array.isArray(followHandler.events)) {
          for (const ev of followHandler.events) {
            ev.paused = true;
            ev.isReset = false;
            if (ev.data) {
              ev.data.disabled = true;
            }
            ev.worldPosition0?.set?.(RESTING_WORLD_X, RESTING_WORLD_Y, RESTING_WORLD_Z);
          }
        }
        followHandler.disconnect?.();
      }
    } catch {
      // Non-fatal
    }
  }

  // 7. Single deterministic middle-anchored mouse-follow controller for Scene 1:
  // - Reads normalized hero pointer coordinates pointerX, pointerY in [-1, +1] from heroPointerRef
  // - Smoothly moves the Sphere with the mouse behind the middle 3x3 glass tiles
  // - Hovering over ANY foreground element (CTA button, headline, badge, etc.) continues moving
  //   the ball identically with zero interruption or reset.
  const fallbackPointer = { x: 0, y: 0 };
  let currentNdcOffsetX = 0;
  let currentNdcOffsetY = 0;
  let rafId: number | null = null;

  const updateSphereFromPointer = () => {
    if (variant !== 'glassmorph') return;
    try {
      const proj = alignCameraToMiddleComposition();
      if (!sphereMeshRef) {
        sphereMeshRef = internalApp._scene?.getObjectByProperty?.(
          'uuid',
          '9820e770-962d-4994-ac3d-6a725cb2b5c8'
        );
      }
      if (!sphereMeshRef || !proj) return;

      const sourcePointer = heroPointerRef ? heroPointerRef.current : fallbackPointer;
      const pointerX = Math.max(-1, Math.min(1, Number.isFinite(sourcePointer.x) ? sourcePointer.x : 0));
      const pointerY = Math.max(-1, Math.min(1, Number.isFinite(sourcePointer.y) ? sourcePointer.y : 0));

      const targetNdcOffsetX = pointerX * PARALLAX_NDC_FACTOR;
      const targetNdcOffsetY = pointerY * PARALLAX_NDC_FACTOR;

      const deltaX = targetNdcOffsetX - currentNdcOffsetX;
      const deltaY = targetNdcOffsetY - currentNdcOffsetY;

      if (Math.abs(deltaX) > 0.0001 || Math.abs(deltaY) > 0.0001) {
        currentNdcOffsetX += deltaX * SMOOTHING_FACTOR;
        currentNdcOffsetY += deltaY * SMOOTHING_FACTOR;
      } else {
        currentNdcOffsetX = targetNdcOffsetX;
        currentNdcOffsetY = targetNdcOffsetY;
      }

      const nextWorldX = RESTING_WORLD_X + currentNdcOffsetX / proj.m00;
      const nextWorldY = RESTING_WORLD_Y - currentNdcOffsetY / proj.m11;

      const moved =
        Math.abs((sphereMeshRef.position?.x ?? RESTING_WORLD_X) - nextWorldX) > 0.01 ||
        Math.abs((sphereMeshRef.position?.y ?? RESTING_WORLD_Y) - nextWorldY) > 0.01;

      sphereMeshRef.position.set(nextWorldX, nextWorldY, RESTING_WORLD_Z);
      sphereMeshRef.updateMatrix?.();
      sphereMeshRef.updateMatrixWorld?.(true);

      if (moved) {
        sphereMeshRef.dispatchEvent?.({ type: 'requestRender' });
        splineApp.requestRender();
        internalApp._requestRenderAutoMode?.();
      }
    } catch {
      // Non-fatal
    }
  };

  const startAnimationLoop = () => {
    if (variant !== 'glassmorph' || typeof window === 'undefined') return;
    const tick = () => {
      updateSphereFromPointer();
      rafId = window.requestAnimationFrame(tick);
    };
    rafId = window.requestAnimationFrame(tick);
  };

  startAnimationLoop();

  // Hook internalApp._resize so camera frustum updates from Spline's internal ResizeObserver
  // immediately keep the camera centered in the middle
  let origInternalResize: any = null;
  if (variant === 'glassmorph' && typeof internalApp._resize === 'function') {
    origInternalResize = internalApp._resize;
    internalApp._resize = function (...args: any[]) {
      const result = origInternalResize.apply(this, args);
      alignCameraToMiddleComposition();
      updateSphereFromPointer();
      splineApp.requestRender();
      return result;
    };
  }

  const handleFallbackPointerMove = (event: PointerEvent | MouseEvent) => {
    if (heroPointerRef) return;
    const rect = internalApp.canvas?.getBoundingClientRect?.();
    const width = rect && rect.width > 0 ? rect.width : window.innerWidth || 1920;
    const height = rect && rect.height > 0 ? rect.height : window.innerHeight || 1080;
    const left = rect ? rect.left : 0;
    const top = rect ? rect.top : 0;
    fallbackPointer.x = Math.max(-1, Math.min(1, ((event.clientX - left) / Math.max(1, width)) * 2 - 1));
    fallbackPointer.y = Math.max(-1, Math.min(1, ((event.clientY - top) / Math.max(1, height)) * 2 - 1));
  };

  const handleFallbackPointerLeave = () => {
    if (heroPointerRef) return;
    fallbackPointer.x = 0;
    fallbackPointer.y = 0;
  };

  const handleWindowResize = () => {
    if (variant !== 'glassmorph') return;
    alignCameraToMiddleComposition();
    updateSphereFromPointer();
    splineApp.requestRender();
  };

  let resizeObserver: ResizeObserver | null = null;
  if (typeof window !== 'undefined' && typeof ResizeObserver !== 'undefined' && internalApp.canvas) {
    resizeObserver = new ResizeObserver(() => {
      handleWindowResize();
    });
    resizeObserver.observe(internalApp.canvas);
  }

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    window.addEventListener('pointermove', handleFallbackPointerMove, { passive: true });
    window.addEventListener('resize', handleWindowResize, { passive: true });
    document.documentElement.addEventListener('mouseleave', handleFallbackPointerLeave, { passive: true });
  }

  try {
    updateSphereFromPointer();
    splineApp.requestRender();
    internalApp._requestRenderAutoMode?.();
  } catch {
    // Non-fatal
  }

  return () => {
    if (rafId !== null && typeof window !== 'undefined') {
      window.cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (origInternalResize && internalApp) {
      internalApp._resize = origInternalResize;
    }
    resizeObserver?.disconnect();
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      window.removeEventListener('pointermove', handleFallbackPointerMove);
      window.removeEventListener('resize', handleWindowResize);
      document.documentElement.removeEventListener('mouseleave', handleFallbackPointerLeave);
    }
  };
}

export interface SplineSceneProps {
  sceneUrl: string;
  localBackupUrl?: string;
  variant: SplineSceneVariant;
  shouldLoad?: boolean;
  preferFallback?: boolean;
  transparentBackground?: boolean;
  loaderLabel?: string;
  className?: string;
  heroPointerRef?: React.MutableRefObject<{ x: number; y: number }>;
  onSceneLoaded?: (app: Application) => void;
}

export const SplineScene: React.FC<SplineSceneProps> = ({
  sceneUrl,
  localBackupUrl,
  variant,
  shouldLoad = true,
  preferFallback = false,
  transparentBackground = false,
  loaderLabel,
  className = '',
  heroPointerRef,
  onSceneLoaded,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const splineAppRef = useRef<Application | null>(null);
  const cleanupListenersRef = useRef<(() => void) | null>(null);
  const [activeUrl, setActiveUrl] = useState<string>(sceneUrl);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [useFallback, setUseFallback] = useState<boolean>(preferFallback);
  const triedLocalBackupRef = useRef<boolean>(false);

  useEffect(() => {
    setUseFallback(preferFallback || !isWebGLSupported());
  }, [preferFallback]);

  useEffect(() => {
    if (!isLoaded || !splineAppRef.current) return;
    cleanupListenersRef.current?.();
    cleanupListenersRef.current = configureSplineScene(
      splineAppRef.current,
      variant,
      transparentBackground,
      heroPointerRef
    );
    return () => {
      cleanupListenersRef.current?.();
      cleanupListenersRef.current = null;
    };
  }, [isLoaded, variant, transparentBackground, heroPointerRef]);

  // Prevent Spline's internal canvas wheel listeners from calling preventDefault() and trapping page scroll
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const handleWheelCapture = (event: WheelEvent) => {
      event.stopImmediatePropagation();
    };

    el.addEventListener('wheel', handleWheelCapture, { capture: true, passive: true });
    return () => {
      el.removeEventListener('wheel', handleWheelCapture, { capture: true });
    };
  }, []);

  // Guard against embedded template MousePress -> Link actions opening external portfolio tabs
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const originalOpen = window.open;
    const guardedOpen: typeof window.open = function (url, target, features) {
      const urlStr = String(url ?? '');
      if (urlStr.includes('bento.me/hasslefreedesign')) {
        return null;
      }
      return originalOpen.call(window, url, target, features);
    };
    window.open = guardedOpen;
    return () => {
      window.open = originalOpen;
    };
  }, []);

  // Load timeout safeguard: if remote scene hangs on slow network, try local backup then fallback
  useEffect(() => {
    if (!shouldLoad || isLoaded || useFallback) return;

    const timer = window.setTimeout(() => {
      if (!isLoaded) {
        if (localBackupUrl && !triedLocalBackupRef.current && activeUrl !== localBackupUrl) {
          triedLocalBackupRef.current = true;
          setActiveUrl(localBackupUrl);
        } else {
          setUseFallback(true);
        }
      }
    }, 10000);

    return () => window.clearTimeout(timer);
  }, [shouldLoad, isLoaded, useFallback, localBackupUrl, activeUrl]);

  const handleLoad = (splineApp: Application) => {
    splineAppRef.current = splineApp;
    cleanupListenersRef.current?.();
    cleanupListenersRef.current = configureSplineScene(
      splineApp,
      variant,
      transparentBackground,
      heroPointerRef
    );
    (window as any).__activeSplineApp = splineApp;
    setIsLoaded(true);
    onSceneLoaded?.(splineApp);
  };

  const handleError = () => {
    if (localBackupUrl && !triedLocalBackupRef.current && activeUrl !== localBackupUrl) {
      triedLocalBackupRef.current = true;
      setActiveUrl(localBackupUrl);
    } else {
      setUseFallback(true);
    }
  };

  if (useFallback) {
    return <SplineFallback variant={variant} className={className} />;
  }

  if (!shouldLoad) {
    return (
      <div className={`relative h-full w-full ${className}`}>
        <SplineLoader variant={variant} label={loaderLabel} />
      </div>
    );
  }

  return (
    <div
      ref={wrapperRef}
      className={`spline-canvas-wrapper relative h-full w-full overflow-hidden ${className}`}
    >
      {!isLoaded && <SplineLoader variant={variant} label={loaderLabel} />}
      <SplineErrorBoundary
        onError={handleError}
        fallback={<SplineFallback variant={variant} className="h-full w-full" />}
      >
        <Suspense fallback={<SplineLoader variant={variant} label={loaderLabel} />}>
          <div
            className={`h-full w-full transition-opacity duration-700 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <LazySpline
              key={activeUrl}
              scene={activeUrl}
              onLoad={handleLoad}
              onError={handleError}
            />
          </div>
        </Suspense>
      </SplineErrorBoundary>
    </div>
  );
};
