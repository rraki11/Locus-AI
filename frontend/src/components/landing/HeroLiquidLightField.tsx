import React, { useEffect, useRef } from 'react';

export type HeroLightZone =
  | 'BACKGROUND'
  | 'CTA'
  | 'SPATIAL_CORE'
  | 'GLASS'
  | 'TEXT_NAV';

export interface HeroLiquidLightFieldProps {
  /** Shared global hero client pointer ref (same source used by LocusSpatialCore) */
  heroClientPointerRef: React.MutableRefObject<{
    clientX: number;
    clientY: number;
    active: boolean;
    zone?: HeroLightZone;
  }>;
  /** Whether the primary CTA is currently hovered */
  isCtaHovered: boolean;
  /** Reduced motion / static fallback flag */
  preferFallback?: boolean;
}

interface ZonePalette {
  /** Layer C: Small brighter core RGB */
  coreR: number;
  coreG: number;
  coreB: number;
  /** Layer B: Medium translucent liquid body RGB */
  midR: number;
  midG: number;
  midB: number;
  /** Layer A & D: Large diffuse atmospheric glow & trailing smear RGB */
  outerR: number;
  outerG: number;
  outerB: number;
  /** Primary field opacity during motion (0.11 - 0.16) */
  movingAlpha: number;
  /** Ambient settled opacity when cursor stops (0.08 - 0.115) */
  settledAlpha: number;
  /** Secondary trail opacity (0.045 - 0.075) */
  trailAlpha: number;
  /** Zone radius multiplier */
  radiusScale: number;
}

/**
 * Deterministic context-aware palettes calibrated for clear perceptibility
 * and premium frosted-glass subtlety on the #F4F7F6 off-white hero canvas.
 */
const ZONE_PALETTES: Record<HeroLightZone, ZonePalette> = {
  BACKGROUND: {
    // Soft cool white core + translucent LOCUS mint-sage atmospheric refraction
    coreR: 255,
    coreG: 255,
    coreB: 255,
    midR: 72,
    midG: 156,
    midB: 132,
    outerR: 108,
    outerG: 176,
    outerB: 156,
    movingAlpha: 0.135,
    settledAlpha: 0.092,
    trailAlpha: 0.058,
    radiusScale: 1.0,
  },
  TEXT_NAV: {
    // Cooler architectural slate / blue-gray behind editorial typography
    coreR: 242,
    coreG: 249,
    coreB: 253,
    midR: 68,
    midG: 118,
    midB: 146,
    outerR: 98,
    outerG: 142,
    outerB: 166,
    movingAlpha: 0.13,
    settledAlpha: 0.088,
    trailAlpha: 0.054,
    radiusScale: 0.95,
  },
  GLASS: {
    // Soft white + crisp mint refraction
    coreR: 246,
    coreG: 255,
    coreB: 252,
    midR: 54,
    midG: 158,
    midB: 134,
    outerR: 92,
    outerG: 184,
    outerB: 162,
    movingAlpha: 0.145,
    settledAlpha: 0.098,
    trailAlpha: 0.062,
    radiusScale: 0.98,
  },
  CTA: {
    // Subtle deep navy + LOCUS emerald influence around EXPLORE A MARKET
    coreR: 92,
    coreG: 196,
    coreB: 162,
    midR: 24,
    midG: 84,
    midB: 72,
    outerR: 18,
    outerG: 48,
    outerB: 58,
    movingAlpha: 0.16,
    settledAlpha: 0.115,
    trailAlpha: 0.068,
    radiusScale: 0.94,
  },
  SPATIAL_CORE: {
    // Stronger LOCUS mint / emerald illumination reinforcing the 3D Spatial Core
    coreR: 176,
    coreG: 244,
    coreB: 220,
    midR: 32,
    midG: 148,
    midB: 114,
    outerR: 58,
    outerG: 172,
    outerB: 138,
    movingAlpha: 0.158,
    settledAlpha: 0.11,
    trailAlpha: 0.066,
    radiusScale: 1.06,
  },
};

export const HeroLiquidLightField: React.FC<HeroLiquidLightFieldProps> = ({
  heroClientPointerRef,
  isCtaHovered,
  preferFallback = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctaHoveredRef = useRef<boolean>(isCtaHovered);

  useEffect(() => {
    ctaHoveredRef.current = isCtaHovered;
  }, [isCtaHovered]);

  useEffect(() => {
    if (preferFallback) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    let rafId: number | null = null;
    let width = window.innerWidth || 1920;
    let height = window.innerHeight || 1080;

    const resize = () => {
      if (!canvas.parentElement) return;
      const rect = canvas.parentElement.getBoundingClientRect();
      width = Math.max(320, rect.width);
      height = Math.max(320, rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    };

    // Coupled spring-damped chain (~120-220ms behind cursor)
    let initialized = false;
    let coreX = width * 0.5; // Layer C: Small brighter core (~115ms lag)
    let coreY = height * 0.5;
    let bodyX = coreX; // Layer A & B: Liquid body & diffuse glow (~160ms lag)
    let bodyY = coreY;
    let midTrailX = coreX; // Layer D1: Mid trailing smear (~210ms lag)
    let midTrailY = coreY;
    let farTrailX = coreX; // Layer D2: Outer trailing smear (~270ms lag)
    let farTrailY = coreY;
    let prevTargetX = coreX;
    let prevTargetY = coreY;

    // Envelopes for presence and 400-700ms post-movement persistence
    let smoothPresence = 0;
    let motionEnergy = 0;
    let smoothAngle = 0;

    const currentColor: ZonePalette = { ...ZONE_PALETTES.BACKGROUND };

    const render = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, width, height);

      const ptr = heroClientPointerRef.current;
      const isActive = Boolean(ptr?.active);

      const parentRect = canvas.parentElement?.getBoundingClientRect();
      const offsetLeft = parentRect ? parentRect.left : 0;
      const offsetTop = parentRect ? parentRect.top : 0;

      if (isActive && ptr) {
        const targetX = ptr.clientX - offsetLeft;
        const targetY = ptr.clientY - offsetTop;

        if (!initialized) {
          coreX = targetX;
          coreY = targetY;
          bodyX = targetX;
          bodyY = targetY;
          midTrailX = targetX;
          midTrailY = targetY;
          farTrailX = targetX;
          farTrailY = targetY;
          prevTargetX = targetX;
          prevTargetY = targetY;
          initialized = true;
        }

        const dx = targetX - prevTargetX;
        const dy = targetY - prevTargetY;
        prevTargetX = targetX;
        prevTargetY = targetY;

        const frameSpeed = Math.hypot(dx, dy);
        const instEnergy = Math.min(1, frameSpeed / 22);

        // 400-700ms persistence after movement stops (0.962^35 frames ≈ 580ms decay)
        if (instEnergy > motionEnergy) {
          motionEnergy += (instEnergy - motionEnergy) * 0.32;
        } else {
          motionEnergy *= 0.962;
          if (motionEnergy < 0.002) motionEnergy = 0;
        }

        // Spring-damped follow (~120-220ms behind pointer)
        coreX += (targetX - coreX) * 0.145;
        coreY += (targetY - coreY) * 0.145;

        bodyX += (coreX - bodyX) * 0.115;
        bodyY += (coreY - bodyY) * 0.115;

        midTrailX += (bodyX - midTrailX) * 0.09;
        midTrailY += (bodyY - midTrailY) * 0.09;

        farTrailX += (midTrailX - farTrailX) * 0.072;
        farTrailY += (midTrailY - farTrailY) * 0.072;

        const trailDx = coreX - farTrailX;
        const trailDy = coreY - farTrailY;
        if (Math.hypot(trailDx, trailDy) > 1.2) {
          const targetAngle = Math.atan2(trailDy, trailDx);
          const diff = Math.atan2(
            Math.sin(targetAngle - smoothAngle),
            Math.cos(targetAngle - smoothAngle)
          );
          smoothAngle += diff * 0.16;
        }
      } else {
        motionEnergy *= 0.94;
        if (motionEnergy < 0.002) motionEnergy = 0;
        bodyX += (coreX - bodyX) * 0.11;
        bodyY += (coreY - bodyY) * 0.11;
        midTrailX += (bodyX - midTrailX) * 0.09;
        midTrailY += (bodyY - midTrailY) * 0.09;
        farTrailX += (midTrailX - farTrailX) * 0.08;
        farTrailY += (midTrailY - farTrailY) * 0.08;
      }

      const targetPresence = isActive ? 1 : 0;
      smoothPresence += (targetPresence - smoothPresence) * 0.06;

      // Resolve deterministic zone and smoothly interpolate palette (~300-450ms)
      const activeZone: HeroLightZone = ctaHoveredRef.current
        ? 'CTA'
        : ptr?.zone || 'BACKGROUND';
      const targetPalette = ZONE_PALETTES[activeZone];

      const colorLerp = 0.075;
      currentColor.coreR += (targetPalette.coreR - currentColor.coreR) * colorLerp;
      currentColor.coreG += (targetPalette.coreG - currentColor.coreG) * colorLerp;
      currentColor.coreB += (targetPalette.coreB - currentColor.coreB) * colorLerp;
      currentColor.midR += (targetPalette.midR - currentColor.midR) * colorLerp;
      currentColor.midG += (targetPalette.midG - currentColor.midG) * colorLerp;
      currentColor.midB += (targetPalette.midB - currentColor.midB) * colorLerp;
      currentColor.outerR +=
        (targetPalette.outerR - currentColor.outerR) * colorLerp;
      currentColor.outerG +=
        (targetPalette.outerG - currentColor.outerG) * colorLerp;
      currentColor.outerB +=
        (targetPalette.outerB - currentColor.outerB) * colorLerp;
      currentColor.movingAlpha +=
        (targetPalette.movingAlpha - currentColor.movingAlpha) * colorLerp;
      currentColor.settledAlpha +=
        (targetPalette.settledAlpha - currentColor.settledAlpha) * colorLerp;
      currentColor.trailAlpha +=
        (targetPalette.trailAlpha - currentColor.trailAlpha) * colorLerp;
      currentColor.radiusScale +=
        (targetPalette.radiusScale - currentColor.radiusScale) * colorLerp;

      // Primary field opacity blends smoothly between settled ambient glow and moving strength
      const primaryAlpha =
        (currentColor.settledAlpha +
          (currentColor.movingAlpha - currentColor.settledAlpha) *
            Math.min(1, motionEnergy * 1.25)) *
        smoothPresence;

      const secondaryTrailAlpha =
        currentColor.trailAlpha *
        Math.min(1, motionEnergy * 1.35 + 0.15) *
        smoothPresence;

      if (primaryAlpha > 0.002) {
        const cR = Math.round(currentColor.coreR);
        const cG = Math.round(currentColor.coreG);
        const cB = Math.round(currentColor.coreB);
        const mR = Math.round(currentColor.midR);
        const mG = Math.round(currentColor.midG);
        const mB = Math.round(currentColor.midB);
        const oR = Math.round(currentColor.outerR);
        const oG = Math.round(currentColor.outerG);
        const oB = Math.round(currentColor.outerB);

        // Responsive radius: ~320-350px on 1920x1080, scaled proportionally on 1440x900 and 1366x768
        const viewportScale = Math.min(1.08, Math.max(0.76, Math.min(width, height) / 1000));
        const radiusA = 335 * viewportScale * currentColor.radiusScale; // Layer A: Large diffuse atmospheric glow (280-360px)
        const radiusB = 195 * viewportScale * currentColor.radiusScale; // Layer B: Medium translucent liquid body
        const radiusC = 92 * viewportScale * currentColor.radiusScale; // Layer C: Small brighter core

        const trailDist = Math.hypot(coreX - farTrailX, coreY - farTrailY);
        const velocityStretch =
          1 + Math.min(0.28, (trailDist / 160) * (0.35 + motionEnergy * 0.65));

        // LAYER A: Large diffuse atmospheric glow (280-360px radius, very soft outer falloff)
        ctx.save();
        ctx.translate(bodyX, bodyY);
        ctx.rotate(smoothAngle);
        ctx.scale(
          1 + (velocityStretch - 1) * 0.45,
          1 / Math.sqrt(1 + (velocityStretch - 1) * 0.45)
        );
        const gradA = ctx.createRadialGradient(0, 0, 0, 0, 0, radiusA);
        gradA.addColorStop(
          0,
          `rgba(${mR}, ${mG}, ${mB}, ${(primaryAlpha * 0.68).toFixed(4)})`
        );
        gradA.addColorStop(
          0.35,
          `rgba(${oR}, ${oG}, ${oB}, ${(primaryAlpha * 0.44).toFixed(4)})`
        );
        gradA.addColorStop(
          0.7,
          `rgba(${oR}, ${oG}, ${oB}, ${(primaryAlpha * 0.15).toFixed(4)})`
        );
        gradA.addColorStop(1, `rgba(${oR}, ${oG}, ${oB}, 0)`);
        ctx.fillStyle = gradA;
        ctx.beginPath();
        ctx.arc(0, 0, radiusA, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // LAYER D: Faint trailing smear aligned with pointer velocity (400-700ms persistence)
        if (
          secondaryTrailAlpha > 0.003 &&
          (trailDist > 2 || motionEnergy > 0.04)
        ) {
          const drawTrailLobe = (
            tx: number,
            ty: number,
            r: number,
            a: number,
            stretchFactor: number
          ) => {
            ctx.save();
            ctx.translate(tx, ty);
            ctx.rotate(smoothAngle);
            ctx.scale(stretchFactor, 1 / Math.sqrt(stretchFactor));
            const gradD = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
            gradD.addColorStop(0, `rgba(${mR}, ${mG}, ${mB}, ${a.toFixed(4)})`);
            gradD.addColorStop(
              0.5,
              `rgba(${oR}, ${oG}, ${oB}, ${(a * 0.48).toFixed(4)})`
            );
            gradD.addColorStop(1, `rgba(${oR}, ${oG}, ${oB}, 0)`);
            ctx.fillStyle = gradD;
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          };

          drawTrailLobe(
            farTrailX,
            farTrailY,
            radiusB * 0.88,
            secondaryTrailAlpha * 0.6,
            velocityStretch * 1.1
          );
          drawTrailLobe(
            midTrailX,
            midTrailY,
            radiusB * 0.98,
            secondaryTrailAlpha * 0.85,
            velocityStretch * 1.05
          );
        }

        // LAYER B: Medium translucent liquid body
        ctx.save();
        ctx.translate(bodyX, bodyY);
        ctx.rotate(smoothAngle);
        ctx.scale(velocityStretch, 1 / Math.sqrt(velocityStretch));
        const gradB = ctx.createRadialGradient(0, 0, 0, 0, 0, radiusB);
        gradB.addColorStop(
          0,
          `rgba(${mR}, ${mG}, ${mB}, ${(primaryAlpha * 0.82).toFixed(4)})`
        );
        gradB.addColorStop(
          0.42,
          `rgba(${mR}, ${mG}, ${mB}, ${(primaryAlpha * 0.54).toFixed(4)})`
        );
        gradB.addColorStop(
          0.74,
          `rgba(${oR}, ${oG}, ${oB}, ${(primaryAlpha * 0.22).toFixed(4)})`
        );
        gradB.addColorStop(1, `rgba(${oR}, ${oG}, ${oB}, 0)`);
        ctx.fillStyle = gradB;
        ctx.beginPath();
        ctx.arc(0, 0, radiusB, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // LAYER C: Small brighter core following slightly behind pointer
        ctx.save();
        ctx.translate(coreX, coreY);
        const gradC = ctx.createRadialGradient(0, 0, 0, 0, 0, radiusC * 1.15);
        gradC.addColorStop(
          0,
          `rgba(${cR}, ${cG}, ${cB}, ${Math.min(0.24, primaryAlpha * 1.45).toFixed(4)})`
        );
        gradC.addColorStop(
          0.48,
          `rgba(${mR}, ${mG}, ${mB}, ${(primaryAlpha * 0.52).toFixed(4)})`
        );
        gradC.addColorStop(1, `rgba(${mR}, ${mG}, ${mB}, 0)`);
        ctx.fillStyle = gradC;
        ctx.beginPath();
        ctx.arc(0, 0, radiusC * 1.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      if (typeof window !== 'undefined') {
        (window as any).__LOCUS_LIQUID_LIGHT__ = {
          zone: activeZone,
          presence: Number(smoothPresence.toFixed(3)),
          motionEnergy: Number(motionEnergy.toFixed(3)),
          primaryAlpha: Number(primaryAlpha.toFixed(4)),
          secondaryTrailAlpha: Number(secondaryTrailAlpha.toFixed(4)),
          coreX: Math.round(coreX),
          coreY: Math.round(coreY),
          bodyX: Math.round(bodyX),
          bodyY: Math.round(bodyY),
          trailDistance: Number(
            Math.hypot(coreX - farTrailX, coreY - farTrailY).toFixed(1)
          ),
          midRgb: [
            Math.round(currentColor.midR),
            Math.round(currentColor.midG),
            Math.round(currentColor.midB),
          ],
        };
      }

      rafId = window.requestAnimationFrame(render);
    };

    resize();
    rafId = window.requestAnimationFrame(render);

    window.addEventListener('resize', resize, { passive: true });
    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, [heroClientPointerRef, preferFallback]);

  if (preferFallback) {
    return null;
  }

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[8] overflow-hidden"
      aria-hidden="true"
    >
      <canvas
        ref={canvasRef}
        className="block h-full w-full"
        style={{ filter: 'blur(24px)', transform: 'translateZ(0)' }}
      />
    </div>
  );
};
