import React, { useEffect, useRef } from 'react';

interface WorkspaceArcProps {
  /** Normalized workspace pointer coordinates in [-1, +1] */
  pointerRef: React.MutableRefObject<{ x: number; y: number }>;
  /** Active stage index (0..5) subtly shifts the arc's focal calibration angle */
  activeStage: number;
  /** When true, disables continuous rAF animation and renders a clean static spatial backdrop */
  reducedMotion?: boolean;
}

interface SignalParticle {
  baseAngle: number;
  radialOffset: number;
  size: number;
  driftSpeed: number;
  phase: number;
  tone: 'silver' | 'sage' | 'cyan';
}

export const WorkspaceArc: React.FC<WorkspaceArcProps> = ({
  pointerRef,
  activeStage,
  reducedMotion = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<number>(activeStage);

  useEffect(() => {
    stageRef.current = activeStage;
  }, [activeStage]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const mediaReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const isStatic = reducedMotion || Boolean(mediaReduced);

    const particles: SignalParticle[] = Array.from({ length: 28 }, (_, i) => ({
      baseAngle: -Math.PI * 0.76 + (i / 27) * (Math.PI * 0.52),
      radialOffset: ((i * 37) % 84) - 42,
      size: 1.1 + ((i * 13) % 14) * 0.08,
      driftSpeed: (i % 2 === 0 ? 1 : -1) * (0.00006 + (i % 5) * 0.00002),
      phase: i * 0.75,
      tone: i % 3 === 0 ? 'sage' : i % 7 === 0 ? 'cyan' : 'silver',
    }));

    let rafId: number | null = null;
    let autonomousDrift = 0;
    let smoothX = 0;
    let smoothY = 0;
    let smoothStageBias = (stageRef.current - 2.5) * 0.03;

    const resizeCanvas = () => {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = window.innerWidth || 1920;
      const height = window.innerHeight || 1080;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    };

    const renderFrame = (timestamp: number) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const W = window.innerWidth || 1920;
      const H = window.innerHeight || 1080;

      ctx.clearRect(0, 0, W, H);

      const targetX = Math.max(-1, Math.min(1, pointerRef.current?.x ?? 0));
      const targetY = Math.max(-1, Math.min(1, pointerRef.current?.y ?? 0));
      const targetStageBias = (stageRef.current - 2.5) * 0.03;

      if (isStatic) {
        smoothX = 0;
        smoothY = 0;
        smoothStageBias = targetStageBias;
      } else {
        smoothX += (targetX - smoothX) * 0.045;
        smoothY += (targetY - smoothY) * 0.045;
        smoothStageBias += (targetStageBias - smoothStageBias) * 0.04;
        autonomousDrift += (0.005 / 180) * Math.PI;
      }

      // 1. Sweeping Eternal Arc Geometry (crown positioned at ~23% viewport height behind the workspace)
      const primaryRadius = Math.max(W * 0.72, H * 1.05);
      const arcCenterX = W * 0.53 + smoothX * 16;
      const arcCenterY = H * 0.23 + primaryRadius + smoothY * 10;
      const innerDatumRadius = primaryRadius - 42;
      const outerDatumRadius = primaryRadius + 34;

      const startAngle = -Math.PI * 0.78 + Math.sin(autonomousDrift) * 0.015;
      const endAngle = -Math.PI * 0.22 + Math.sin(autonomousDrift) * 0.015;

      // 2. Soft Ambient Light-Field Wash Behind Active UI
      const lightFieldX = W * (0.53 + smoothX * 0.14);
      const lightFieldY = H * (0.34 + smoothY * 0.08);
      const ambientGrad = ctx.createRadialGradient(
        lightFieldX,
        lightFieldY,
        0,
        lightFieldX,
        lightFieldY,
        Math.max(W, H) * 0.48
      );
      ambientGrad.addColorStop(0, 'rgba(111, 175, 155, 0.075)');
      ambientGrad.addColorStop(0.38, 'rgba(169, 184, 179, 0.04)');
      ambientGrad.addColorStop(0.75, 'rgba(15, 23, 42, 0.015)');
      ambientGrad.addColorStop(1, 'rgba(6, 9, 14, 0)');
      ctx.fillStyle = ambientGrad;
      ctx.fillRect(0, 0, W, H);

      // 3. Dimensional Glass-Body Band Along the Eternal Arc
      ctx.save();
      const bandGrad = ctx.createLinearGradient(W * 0.08, H * 0.35, W * 0.92, H * 0.35);
      bandGrad.addColorStop(0, 'rgba(169, 184, 179, 0)');
      bandGrad.addColorStop(0.22, 'rgba(111, 175, 155, 0.055)');
      bandGrad.addColorStop(0.5, 'rgba(215, 225, 221, 0.095)');
      bandGrad.addColorStop(0.78, 'rgba(61, 128, 109, 0.055)');
      bandGrad.addColorStop(1, 'rgba(169, 184, 179, 0)');

      ctx.beginPath();
      ctx.arc(arcCenterX, arcCenterY, primaryRadius, startAngle, endAngle);
      ctx.strokeStyle = bandGrad;
      ctx.lineWidth = 42;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.restore();

      // 4. Crisp Metallic Specular Rim Edge
      const rimGrad = ctx.createLinearGradient(W * 0.1, H * 0.3, W * 0.9, H * 0.3);
      rimGrad.addColorStop(0, 'rgba(169, 184, 179, 0)');
      rimGrad.addColorStop(0.18, 'rgba(169, 184, 179, 0.22)');
      rimGrad.addColorStop(0.5, 'rgba(215, 225, 221, 0.42)');
      rimGrad.addColorStop(0.82, 'rgba(111, 175, 155, 0.24)');
      rimGrad.addColorStop(1, 'rgba(169, 184, 179, 0)');

      ctx.beginPath();
      ctx.arc(arcCenterX, arcCenterY, primaryRadius, startAngle, endAngle);
      ctx.strokeStyle = rimGrad;
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // 5. Inner & Outer Spatial Datum Rings
      ctx.beginPath();
      ctx.arc(arcCenterX, arcCenterY, innerDatumRadius, startAngle + 0.04, endAngle - 0.04);
      ctx.strokeStyle = 'rgba(111, 175, 155, 0.12)';
      ctx.lineWidth = 0.8;
      ctx.setLineDash([3, 9]);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.beginPath();
      ctx.arc(arcCenterX, arcCenterY, outerDatumRadius, startAngle + 0.06, endAngle - 0.06);
      ctx.strokeStyle = 'rgba(215, 225, 221, 0.07)';
      ctx.lineWidth = 0.65;
      ctx.stroke();

      // 6. Fine Spatial Calibration Ticks
      const numTicks = 21;
      for (let i = 0; i < numTicks; i++) {
        const frac = i / (numTicks - 1);
        const tickAngle = startAngle + 0.06 + frac * (endAngle - startAngle - 0.12);
        const isMajor = i % 4 === 0;
        const rInner = primaryRadius - (isMajor ? 11 : 5);
        const rOuter = primaryRadius + (isMajor ? 11 : 5);
        ctx.beginPath();
        ctx.moveTo(
          arcCenterX + rInner * Math.cos(tickAngle),
          arcCenterY + rInner * Math.sin(tickAngle)
        );
        ctx.lineTo(
          arcCenterX + rOuter * Math.cos(tickAngle),
          arcCenterY + rOuter * Math.sin(tickAngle)
        );
        ctx.strokeStyle = isMajor
          ? 'rgba(215, 225, 221, 0.18)'
          : 'rgba(169, 184, 179, 0.08)';
        ctx.lineWidth = isMajor ? 0.9 : 0.6;
        ctx.stroke();
      }

      // 7. Mouse-Reactive Specular Light Field Traveling Smoothly Along the Arc
      const midAngle = -Math.PI * 0.5 + smoothStageBias;
      const maxExcursion = Math.PI * 0.19;
      const breathOffset = isStatic ? 0 : Math.sin(timestamp * 0.0006) * 0.018;
      const highlightAngle =
        midAngle + smoothX * maxExcursion + smoothY * (maxExcursion * 0.2) + breathOffset;

      const hx = arcCenterX + primaryRadius * Math.cos(highlightAngle);
      const hy = arcCenterY + primaryRadius * Math.sin(highlightAngle);

      // Soft Gaussian-like Light-Field Halo on the Arc
      const halo = ctx.createRadialGradient(hx, hy, 0, hx, hy, 210);
      halo.addColorStop(0, 'rgba(226, 236, 232, 0.25)');
      halo.addColorStop(0.32, 'rgba(111, 175, 155, 0.11)');
      halo.addColorStop(0.68, 'rgba(61, 128, 109, 0.035)');
      halo.addColorStop(1, 'rgba(6, 9, 14, 0)');

      ctx.beginPath();
      ctx.arc(hx, hy, 210, 0, Math.PI * 2);
      ctx.fillStyle = halo;
      ctx.fill();

      // Bright Specular Rim Segment Following the Cursor
      ctx.save();
      const segSpan = 0.095;
      ctx.beginPath();
      ctx.arc(
        arcCenterX,
        arcCenterY,
        primaryRadius,
        highlightAngle - segSpan,
        highlightAngle + segSpan
      );
      const specRimGrad = ctx.createLinearGradient(
        arcCenterX + primaryRadius * Math.cos(highlightAngle - segSpan),
        arcCenterY + primaryRadius * Math.sin(highlightAngle - segSpan),
        arcCenterX + primaryRadius * Math.cos(highlightAngle + segSpan),
        arcCenterY + primaryRadius * Math.sin(highlightAngle + segSpan)
      );
      specRimGrad.addColorStop(0, 'rgba(215, 225, 221, 0)');
      specRimGrad.addColorStop(0.5, 'rgba(241, 247, 245, 0.82)');
      specRimGrad.addColorStop(1, 'rgba(215, 225, 221, 0)');
      ctx.strokeStyle = specRimGrad;
      ctx.lineWidth = 2.6;
      ctx.stroke();
      ctx.restore();

      // 8. Restrained Spatial Signal Nodes Along the Arc
      const timeSec = timestamp * 0.001;
      for (const p of particles) {
        const angle =
          p.baseAngle +
          (isStatic ? 0 : timeSec * p.driftSpeed * 60) +
          smoothX * 0.025;
        const r =
          primaryRadius +
          p.radialOffset +
          (isStatic ? 0 : Math.sin(timeSec * 0.45 + p.phase) * 5) +
          smoothY * 5;

        const px = arcCenterX + r * Math.cos(angle);
        const py = arcCenterY + r * Math.sin(angle);

        const alpha = isStatic
          ? 0.16
          : 0.10 + Math.abs(Math.sin(timeSec * 0.35 + p.phase)) * 0.15;

        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        if (p.tone === 'sage') {
          ctx.fillStyle = `rgba(111, 175, 155, ${alpha.toFixed(3)})`;
        } else if (p.tone === 'cyan') {
          ctx.fillStyle = `rgba(56, 189, 248, ${(alpha * 0.85).toFixed(3)})`;
        } else {
          ctx.fillStyle = `rgba(215, 225, 221, ${alpha.toFixed(3)})`;
        }
        ctx.fill();
      }

      if (!isStatic) {
        rafId = window.requestAnimationFrame(renderFrame);
      }
    };

    resizeCanvas();
    renderFrame(performance.now());

    window.addEventListener('resize', resizeCanvas, { passive: true });
    return () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [pointerRef, reducedMotion]);

  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      aria-hidden="true"
    >
      {/* Subtle Spatial Coordinate Grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(215, 225, 221, 0.5) 1px, transparent 1px), linear-gradient(to bottom, rgba(215, 225, 221, 0.5) 1px, transparent 1px)',
          backgroundSize: '72px 72px',
        }}
      />
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
};
