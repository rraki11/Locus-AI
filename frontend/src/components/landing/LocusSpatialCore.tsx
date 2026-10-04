import React, { useEffect, useRef, useState } from 'react';

export type SpatialCoreVisualState =
  | 'idle'
  | 'hover'
  | 'location-selected'
  | 'intelligence-active';

export interface LocusSpatialCoreProps {
  /** Page-level normalized pointer coordinates in [-1, +1] */
  heroPointerRef: React.MutableRefObject<{ x: number; y: number }>;
  /** Raw client coordinates ref for proximity node hover detection across the hero */
  heroClientPointerRef: React.MutableRefObject<{
    clientX: number;
    clientY: number;
    active: boolean;
  }>;
  /** Coordinated visual state when the primary CTA is hovered */
  isCtaHovered: boolean;
  /** Reduced motion / static fallback mode */
  preferFallback?: boolean;
  /** Callback when a user clicks a spatial node */
  onNodeSelect?: (nodeId: string) => void;
}

interface Point2D {
  x: number;
  y: number;
}

interface Point3D {
  x: number;
  y: number;
  z: number;
}

interface TerrainCell {
  x: number;
  y: number;
  z: number;
  elevation: number; // 0..1
  isEdge: boolean;
}

interface TerrainTriangle {
  a: Point3D;
  b: Point3D;
  c: Point3D;
  nx: number;
  ny: number;
  nz: number;
  elevation: number;
}

interface SpatialNodeDef {
  id: string;
  /** Normalized model coords within India terrain [-1, 1] */
  x: number;
  y: number;
  z: number;
  isPrimary?: boolean;
  cityLabel?: string;
  labelSide?: 'left' | 'right';
  stageTag: 'LOCATION' | 'MARKET' | 'GROUND REALITY' | 'INTELLIGENCE';
  connectedTo: string[];
}

/**
 * Control polygon of India's geographic silhouette in model space
 * (x in [-0.82, 0.86], y in [-0.92, 0.90], where -y is North, +y is South).
 */
const INDIA_BASE_POLYGON: Point2D[] = [
  // Northern Crown (Ladakh / Kashmir)
  { x: -0.22, y: -0.89 },
  { x: -0.09, y: -0.93 },
  { x: 0.03, y: -0.87 },
  { x: 0.07, y: -0.78 },
  { x: -0.01, y: -0.69 },
  // Himachal / Uttarakhand / Nepal Himalayan curve
  { x: 0.05, y: -0.59 },
  { x: 0.15, y: -0.49 },
  { x: 0.26, y: -0.43 },
  { x: 0.37, y: -0.39 },
  // Sikkim & Siliguri Corridor
  { x: 0.42, y: -0.45 },
  { x: 0.46, y: -0.38 },
  // Northeast (Arunachal / Assam / Seven Sisters)
  { x: 0.58, y: -0.42 },
  { x: 0.74, y: -0.46 },
  { x: 0.85, y: -0.38 },
  { x: 0.80, y: -0.27 },
  { x: 0.71, y: -0.21 },
  { x: 0.68, y: -0.10 },
  { x: 0.60, y: -0.09 },
  { x: 0.54, y: -0.19 },
  { x: 0.45, y: -0.22 },
  // West Bengal / Sundarbans Delta
  { x: 0.42, y: -0.06 },
  { x: 0.34, y: 0.03 },
  // Odisha & Northern Circars Coast
  { x: 0.23, y: 0.13 },
  { x: 0.13, y: 0.26 },
  // Andhra & Coromandel Coast
  { x: 0.05, y: 0.38 },
  { x: 0.03, y: 0.54 },
  { x: -0.02, y: 0.69 },
  // Kanyakumari Southern Tip
  { x: -0.09, y: 0.88 },
  { x: -0.14, y: 0.85 },
  // Malabar / Kerala / Karnataka Western Coast
  { x: -0.22, y: 0.67 },
  { x: -0.29, y: 0.47 },
  { x: -0.35, y: 0.28 },
  // Konkan / Mumbai Coast
  { x: -0.41, y: 0.10 },
  { x: -0.43, y: -0.02 },
  // Gulf of Khambhat & Saurashtra (Gujarat)
  { x: -0.52, y: 0.04 },
  { x: -0.65, y: 0.01 },
  { x: -0.71, y: -0.07 },
  { x: -0.62, y: -0.14 },
  // Rann of Kutch
  { x: -0.75, y: -0.19 },
  { x: -0.71, y: -0.28 },
  { x: -0.57, y: -0.28 },
  // Rajasthan Thar Western Frontier
  { x: -0.55, y: -0.42 },
  { x: -0.44, y: -0.52 },
  // Punjab / Jammu Frontier
  { x: -0.32, y: -0.63 },
  { x: -0.30, y: -0.77 },
];

/**
 * Chaikin corner-cutting subdivision for organic, smooth geographic contours.
 */
function smoothPolygon(poly: Point2D[], iterations: number): Point2D[] {
  let current = poly;
  for (let it = 0; it < iterations; it++) {
    const next: Point2D[] = [];
    for (let i = 0; i < current.length; i++) {
      const p0 = current[i];
      const p1 = current[(i + 1) % current.length];
      next.push({
        x: p0.x * 0.75 + p1.x * 0.25,
        y: p0.y * 0.75 + p1.y * 0.25,
      });
      next.push({
        x: p0.x * 0.25 + p1.x * 0.75,
        y: p0.y * 0.25 + p1.y * 0.75,
      });
    }
    current = next;
  }
  return current;
}

const SMOOTH_INDIA_POLYGON = smoothPolygon(INDIA_BASE_POLYGON, 2);

/**
 * Spatial Intelligence Nodes anchored on the 3D terrain surface.
 * Presentation-only conceptual nodes representing LOCATION -> MARKET -> GROUND REALITY -> INTELLIGENCE.
 */
const SPATIAL_NODES: SpatialNodeDef[] = [
  {
    id: 'core-south',
    x: -0.14,
    y: 0.47,
    z: 24,
    isPrimary: true,
    stageTag: 'INTELLIGENCE',
    connectedTo: [
      'node-west',
      'node-central',
      'node-north',
      'node-east',
      'node-se',
    ],
  },
  {
    id: 'node-west',
    x: -0.37,
    y: 0.10,
    z: 18,
    cityLabel: 'MUMBAI',
    labelSide: 'left',
    stageTag: 'MARKET',
    connectedTo: ['core-south', 'node-nw', 'node-central'],
  },
  {
    id: 'node-central',
    x: -0.05,
    y: 0.23,
    z: 20,
    cityLabel: 'HYDERABAD',
    labelSide: 'right',
    stageTag: 'GROUND REALITY',
    connectedTo: ['core-south', 'node-west', 'node-north', 'node-east'],
  },
  {
    id: 'node-north',
    x: -0.13,
    y: -0.43,
    z: 20,
    stageTag: 'LOCATION',
    connectedTo: ['node-central', 'node-nw', 'node-east', 'core-south'],
  },
  {
    id: 'node-nw',
    x: -0.46,
    y: -0.14,
    z: 15,
    stageTag: 'LOCATION',
    connectedTo: ['node-west', 'node-north'],
  },
  {
    id: 'node-east',
    x: 0.33,
    y: -0.08,
    z: 16,
    stageTag: 'MARKET',
    connectedTo: ['node-north', 'node-central', 'core-south'],
  },
  {
    id: 'node-se',
    x: -0.01,
    y: 0.56,
    z: 16,
    stageTag: 'GROUND REALITY',
    connectedTo: ['core-south', 'node-central'],
  },
];

function isPointInPolygon(px: number, py: number, polygon: Point2D[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersect =
      yi > py !== yj > py &&
      px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function distToPolygonEdge(px: number, py: number, polygon: Point2D[]): number {
  let minD = Infinity;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const ax = polygon[j].x;
    const ay = polygon[j].y;
    const bx = polygon[i].x;
    const by = polygon[i].y;
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy + 1e-9;
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
    const projX = ax + t * dx;
    const projY = ay + t * dy;
    const d = Math.hypot(px - projX, py - projY);
    if (d < minD) minD = d;
  }
  return minD;
}

function sampleElevation(x: number, y: number): number {
  const himalaya = Math.exp(-Math.pow((y + 0.62) / 0.25, 2)) * 0.56;
  const westernGhats =
    y > 0.04 && y < 0.82
      ? Math.exp(-Math.pow((x + 0.28 + (y - 0.35) * 0.26) / 0.11, 2)) * 0.5
      : 0;
  const deccan =
    Math.exp(-(Math.pow((x + 0.11) / 0.33, 2) + Math.pow((y - 0.3) / 0.38, 2))) *
    0.48;
  const wave =
    (Math.sin(x * 9.5 + y * 6.2) * 0.5 + 0.5) * 0.16 +
    (Math.cos(x * 14.0 - y * 11.0) * 0.5 + 0.5) * 0.1;

  return Math.min(1, Math.max(0.08, himalaya + westernGhats + deccan + wave * 0.38));
}

function buildProceduralGeometry(): {
  cells: TerrainCell[];
  triangles: TerrainTriangle[];
} {
  const cells: TerrainCell[] = [];
  const stepX = 0.062;
  const stepY = 0.054;

  const gridMap = new Map<string, Point3D & { elevation: number }>();
  let rowIndex = 0;

  for (let y = -0.92; y <= 0.92; y += stepY) {
    const offsetX = rowIndex % 2 === 0 ? 0 : stepX * 0.5;
    let colIndex = 0;
    for (let x = -0.84 + offsetX; x <= 0.88; x += stepX) {
      if (isPointInPolygon(x, y, SMOOTH_INDIA_POLYGON)) {
        const edgeDist = distToPolygonEdge(x, y, SMOOTH_INDIA_POLYGON);
        const edgeTaper = Math.min(1, edgeDist / 0.085);
        const elev = sampleElevation(x, y) * (0.32 + 0.68 * edgeTaper);
        const z = 5 + elev * 24;

        cells.push({
          x,
          y,
          z,
          elevation: elev,
          isEdge: edgeDist < 0.05,
        });

        gridMap.set(`${rowIndex}:${colIndex}`, { x, y, z, elevation: elev });
      }
      colIndex++;
    }
    rowIndex++;
  }

  const triangles: TerrainTriangle[] = [];
  for (let r = 0; r < rowIndex; r++) {
    const isEven = r % 2 === 0;
    for (let c = 0; c < 36; c++) {
      const p0 = gridMap.get(`${r}:${c}`);
      const pRight = gridMap.get(`${r}:${c + 1}`);
      const pDownA = gridMap.get(`${r + 1}:${isEven ? c : c + 1}`);
      const pDownB = gridMap.get(`${r + 1}:${isEven ? c - 1 : c}`);

      const addTri = (
        a: Point3D & { elevation: number },
        b: Point3D & { elevation: number },
        d: Point3D & { elevation: number }
      ) => {
        const ux = b.x - a.x;
        const uy = b.y - a.y;
        const uz = (b.z - a.z) * 0.013;
        const vx = d.x - a.x;
        const vy = d.y - a.y;
        const vz = (d.z - a.z) * 0.013;
        let nx = uy * vz - uz * vy;
        let ny = uz * vx - ux * vz;
        let nz = ux * vy - uy * vx;
        const len = Math.hypot(nx, ny, nz) || 1;
        nx /= len;
        ny /= len;
        nz /= len;
        if (nz < 0) {
          nx = -nx;
          ny = -ny;
          nz = -nz;
        }
        triangles.push({
          a,
          b,
          c: d,
          nx,
          ny,
          nz,
          elevation: (a.elevation + b.elevation + d.elevation) / 3,
        });
      };

      if (p0 && pRight && pDownA) addTri(p0, pRight, pDownA);
      if (p0 && pDownA && pDownB) addTri(p0, pDownA, pDownB);
    }
  }

  return { cells, triangles };
}

const GEOMETRY_CACHE = buildProceduralGeometry();

export const LocusSpatialCore: React.FC<LocusSpatialCoreProps> = ({
  heroPointerRef,
  heroClientPointerRef,
  isCtaHovered,
  preferFallback = false,
  onNodeSelect,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('core-south');

  const hoveredNodeRef = useRef<string | null>(null);
  const selectedNodeRef = useRef<string>('core-south');
  const ctaHoveredRef = useRef<boolean>(isCtaHovered);

  useEffect(() => {
    ctaHoveredRef.current = isCtaHovered;
  }, [isCtaHovered]);

  useEffect(() => {
    selectedNodeRef.current = selectedNodeId;
  }, [selectedNodeId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let rafId: number | null = null;
    let smoothPtrX = 0;
    let smoothPtrY = 0;
    let smoothLightX = 0;
    let smoothLightY = 0;
    let lightInitialized = false;
    let smoothPointerPresence = 0;
    let smoothCtaBoost = 0;
    let smoothHoverBoost = 0;

    let projectedNodes: {
      id: string;
      sx: number;
      sy: number;
      sz: number;
      def: SpatialNodeDef;
    }[] = [];

    const resize = () => {
      if (!canvas || !container) return;
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(320, rect.width);
      const h = Math.max(320, rect.height);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    };

    const handleClick = (event: MouseEvent) => {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const lx = event.clientX - rect.left;
      const ly = event.clientY - rect.top;

      for (const n of projectedNodes) {
        if (Math.hypot(lx - n.sx, ly - n.sy) <= 38) {
          setSelectedNodeId(n.id);
          selectedNodeRef.current = n.id;
          onNodeSelect?.(n.id);
          break;
        }
      }
    };

    window.addEventListener('click', handleClick, { passive: true });

    const renderFrame = (timestamp: number) => {
      const ctx = canvas.getContext('2d');
      if (!ctx || !container) return;

      const rect = container.getBoundingClientRect();
      const W = Math.max(320, rect.width);
      const H = Math.max(320, rect.height);

      ctx.clearRect(0, 0, W, H);

      const t = preferFallback ? 0 : timestamp * 0.001;

      // 1. Anchored Instrument Geometry Base (Fixed center — zero positional drift)
      const centerX = W * 0.48;
      const centerY = H * 0.49;
      const scale = Math.min(W, H) * 0.41;

      if (!lightInitialized) {
        smoothLightX = centerX - scale * 0.08;
        smoothLightY = centerY + scale * 0.18;
        lightInitialized = true;
      }

      // 2. Smooth Damped Pointer & Presence Interpolation (Never snaps on mouse leave)
      const isPointerActive =
        !preferFallback && Boolean(heroClientPointerRef.current?.active);
      const targetPresence = isPointerActive ? 1 : 0;
      smoothPointerPresence += (targetPresence - smoothPointerPresence) * 0.04;

      const rawPtrX =
        isPointerActive && heroPointerRef.current
          ? Math.max(-1, Math.min(1, heroPointerRef.current.x))
          : 0;
      const rawPtrY =
        isPointerActive && heroPointerRef.current
          ? Math.max(-1, Math.min(1, heroPointerRef.current.y))
          : 0;

      // Very slow, heavily damped interpolation for micro-depth perception
      smoothPtrX += (rawPtrX - smoothPtrX) * 0.032;
      smoothPtrY += (rawPtrY - smoothPtrY) * 0.032;

      const targetCta = ctaHoveredRef.current ? 1 : 0;
      smoothCtaBoost += (targetCta - smoothCtaBoost) * 0.045;

      // Compute Cursor-Reactive Internal Light Field Coordinates inside the Spatial Core
      let targetLightX = centerX - scale * 0.08;
      let targetLightY = centerY + scale * 0.22;

      if (isPointerActive && heroClientPointerRef.current) {
        const localX = heroClientPointerRef.current.clientX - rect.left;
        const localY = heroClientPointerRef.current.clientY - rect.top;
        const distFromCoreCenter = Math.hypot(localX - centerX, localY - centerY);

        // Seamless blend: direct local tracking when near the core; mapped internal sweep when over left-side headline/CTA/nav
        const directWeight = Math.max(
          0,
          Math.min(1, 1.25 - distFromCoreCenter / (scale * 1.15))
        );
        const mappedX = centerX + rawPtrX * scale * 0.56;
        const mappedY = centerY + rawPtrY * scale * 0.56;

        targetLightX = localX * directWeight + mappedX * (1 - directWeight);
        targetLightY = localY * directWeight + mappedY * (1 - directWeight);
      }

      smoothLightX += (targetLightX - smoothLightX) * 0.055;
      smoothLightY += (targetLightY - smoothLightY) * 0.055;

      // 3. Node Proximity Hover Detection from Page-Level Client Coordinates
      let detectedHoverId: string | null = null;
      if (isPointerActive && projectedNodes.length > 0) {
        const localX = heroClientPointerRef.current.clientX - rect.left;
        const localY = heroClientPointerRef.current.clientY - rect.top;
        let minDist = 64;
        for (const pn of projectedNodes) {
          const d = Math.hypot(localX - pn.sx, localY - pn.sy);
          if (d < minDist) {
            minDist = d;
            detectedHoverId = pn.id;
          }
        }
      }

      if (detectedHoverId !== hoveredNodeRef.current) {
        hoveredNodeRef.current = detectedHoverId;
        setHoveredNodeId(detectedHoverId);
      }

      const targetHover = detectedHoverId ? 1 : 0;
      smoothHoverBoost += (targetHover - smoothHoverBoost) * 0.065;

      // 4. Micro 3D Depth Projection (Strictly 1-2 degrees max internal rotation, anchored center)
      // 0.022 rad ≈ 1.26°, 0.026 rad ≈ 1.49°
      const baseRotX = -0.31;
      const baseRotY = 0.19;
      const baseRotZ = -0.035;
      const fov = 1040;

      const project3D = (
        mx: number,
        my: number,
        mz: number,
        layerDepthFactor = 1.0
      ): { sx: number; sy: number; sz: number; scaleFactor: number } => {
        const rotX = baseRotX + smoothPtrY * 0.021 * layerDepthFactor;
        const rotY = baseRotY + smoothPtrX * 0.025 * layerDepthFactor;
        const rotZ = baseRotZ + smoothPtrX * 0.004 * layerDepthFactor;

        const cosX = Math.cos(rotX);
        const sinX = Math.sin(rotX);
        const cosY = Math.cos(rotY);
        const sinY = Math.sin(rotY);
        const cosZ = Math.cos(rotZ);
        const sinZ = Math.sin(rotZ);

        let x = mx * scale;
        let y = my * scale;
        let z = mz;

        const xz = x * cosZ - y * sinZ;
        const yz = x * sinZ + y * cosZ;
        x = xz;
        y = yz;

        const yx = y * cosX - z * sinX;
        const zx = y * sinX + z * cosX;
        y = yx;
        z = zx;

        const xy = x * cosY + z * sinY;
        const zy = -x * sinY + z * cosY;
        x = xy;
        z = zy;

        const perspective = fov / Math.max(240, fov - z);
        return {
          sx: centerX + x * perspective,
          sy: centerY + y * perspective,
          sz: z,
          scaleFactor: perspective,
        };
      };

      // 5. Anchored Ambient Instrument Field + Subtle Internal Light Halo
      const glowRadius = scale * 1.26;
      const ambientGrad = ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        glowRadius
      );
      const baseAmbientAlpha = 0.13 + smoothCtaBoost * 0.035;
      ambientGrad.addColorStop(
        0,
        `rgba(46, 115, 95, ${baseAmbientAlpha.toFixed(3)})`
      );
      ambientGrad.addColorStop(
        0.45,
        `rgba(111, 175, 155, ${(baseAmbientAlpha * 0.55).toFixed(3)})`
      );
      ambientGrad.addColorStop(
        0.78,
        `rgba(169, 184, 179, ${(baseAmbientAlpha * 0.18).toFixed(3)})`
      );
      ambientGrad.addColorStop(1, 'rgba(244, 247, 246, 0)');

      ctx.fillStyle = ambientGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, glowRadius, 0, Math.PI * 2);
      ctx.fill();

      // 6. 3D Orbital / Radius Measurement Rings (Micro-depth layer 0.45)
      const drawOrbitalRing = (
        radiusNorm: number,
        zPlane: number,
        strokeStyle: string,
        lineWidth: number,
        dashed?: number[]
      ) => {
        ctx.save();
        if (dashed) ctx.setLineDash(dashed);
        ctx.beginPath();
        const steps = 96;
        for (let i = 0; i <= steps; i++) {
          const ang = (i / steps) * Math.PI * 2 + t * 0.012;
          const rx = Math.cos(ang) * radiusNorm;
          const ry = Math.sin(ang) * radiusNorm;
          const p = project3D(rx, ry, zPlane, 0.45);
          if (i === 0) ctx.moveTo(p.sx, p.sy);
          else ctx.lineTo(p.sx, p.sy);
        }
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
        ctx.restore();
      };

      const ringBoost = smoothCtaBoost * 0.05 + smoothHoverBoost * 0.04;
      drawOrbitalRing(
        1.03,
        -12,
        `rgba(11, 18, 32, ${(0.065 + ringBoost).toFixed(3)})`,
        0.75
      );
      drawOrbitalRing(
        0.85,
        -4,
        `rgba(61, 128, 109, ${(0.14 + ringBoost).toFixed(3)})`,
        0.85,
        [3, 9]
      );
      drawOrbitalRing(
        0.65,
        4,
        `rgba(123, 148, 140, ${(0.1 + ringBoost).toFixed(3)})`,
        0.7
      );

      // Cardinal Axis Calibration Ticks
      const cardinalDirs: [number, number][] = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ];
      for (const [dx, dy] of cardinalDirs) {
        const pInner = project3D(dx * 0.92, dy * 0.92, -8, 0.45);
        const pOuter = project3D(dx * 1.1, dy * 1.1, -8, 0.45);
        ctx.beginPath();
        ctx.moveTo(pInner.sx, pInner.sy);
        ctx.lineTo(pOuter.sx, pOuter.sy);
        ctx.strokeStyle = 'rgba(61, 128, 109, 0.2)';
        ctx.lineWidth = 0.85;
        ctx.stroke();
      }

      // 7. Multi-Layered Translucent Frosted-Glass Topographic Strata
      const traceContourPath = (
        zHeight: number,
        scaleMult: number,
        depthFactor: number
      ) => {
        ctx.beginPath();
        SMOOTH_INDIA_POLYGON.forEach((pt, idx) => {
          const p = project3D(
            pt.x * scaleMult,
            pt.y * scaleMult,
            zHeight,
            depthFactor
          );
          if (idx === 0) ctx.moveTo(p.sx, p.sy);
          else ctx.lineTo(p.sx, p.sy);
        });
        ctx.closePath();
      };

      const drawSmoothContourStratum = (
        zHeight: number,
        scaleMult: number,
        depthFactor: number,
        fillStyle: string | CanvasGradient,
        strokeStyle: string,
        lineWidth: number
      ) => {
        ctx.save();
        traceContourPath(zHeight, scaleMult, depthFactor);
        ctx.fillStyle = fillStyle;
        ctx.fill();
        if (lineWidth > 0) {
          ctx.strokeStyle = strokeStyle;
          ctx.lineWidth = lineWidth;
          ctx.lineJoin = 'round';
          ctx.stroke();
        }
        ctx.restore();
      };

      // Soft Floating Ground Shadow Plane
      drawSmoothContourStratum(
        -22,
        1.005,
        0.35,
        'rgba(15, 23, 42, 0.042)',
        'rgba(15, 23, 42, 0.02)',
        0.5
      );

      // Stratum 1: Base Frosted Architectural Glass Plate
      const baseGlassGrad = ctx.createLinearGradient(
        centerX - scale * 0.7,
        centerY - scale * 0.85,
        centerX + scale * 0.7,
        centerY + scale * 0.85
      );
      baseGlassGrad.addColorStop(0, 'rgba(222, 236, 231, 0.56)');
      baseGlassGrad.addColorStop(0.5, 'rgba(204, 224, 217, 0.48)');
      baseGlassGrad.addColorStop(1, 'rgba(186, 212, 204, 0.42)');

      drawSmoothContourStratum(
        -6,
        1.0,
        0.65,
        baseGlassGrad,
        'rgba(61, 128, 109, 0.25)',
        1.0
      );

      // Stratum 2: Primary Translucent Glass Surface with Specular Rim
      const midGlassGrad = ctx.createLinearGradient(
        centerX - scale * 0.65,
        centerY - scale * 0.8,
        centerX + scale * 0.65,
        centerY + scale * 0.8
      );
      midGlassGrad.addColorStop(0, 'rgba(242, 249, 247, 0.62)');
      midGlassGrad.addColorStop(0.55, 'rgba(216, 234, 228, 0.50)');
      midGlassGrad.addColorStop(1, 'rgba(195, 220, 212, 0.44)');

      drawSmoothContourStratum(
        3,
        0.96,
        0.85,
        midGlassGrad,
        'rgba(255, 255, 255, 0.82)',
        1.15
      );

      // Cursor-Reactive Internal Glass Reflection & Local Illumination Clipped Inside Primary Stratum
      ctx.save();
      traceContourPath(3, 0.96, 0.85);
      ctx.clip();

      const localFieldRadius = scale * 0.68;
      const internalLightGrad = ctx.createRadialGradient(
        smoothLightX,
        smoothLightY,
        0,
        smoothLightX,
        smoothLightY,
        localFieldRadius
      );
      const sheenStrength =
        0.14 + smoothPointerPresence * 0.16 + smoothCtaBoost * 0.08;
      internalLightGrad.addColorStop(
        0,
        `rgba(255, 255, 255, ${(sheenStrength * 1.15).toFixed(3)})`
      );
      internalLightGrad.addColorStop(
        0.32,
        `rgba(167, 226, 208, ${(sheenStrength * 0.68).toFixed(3)})`
      );
      internalLightGrad.addColorStop(
        0.68,
        `rgba(94, 168, 147, ${(sheenStrength * 0.22).toFixed(3)})`
      );
      internalLightGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.fillStyle = internalLightGrad;
      ctx.fillRect(centerX - scale, centerY - scale, scale * 2, scale * 2);
      ctx.restore();

      // Stratum 3: Inner Elevated Topographic Contour
      drawSmoothContourStratum(
        10,
        0.82,
        1.0,
        'rgba(182, 216, 205, 0.24)',
        'rgba(61, 128, 109, 0.16)',
        0.8
      );

      // 8. 3D Faceted Topographic Mesh Triangles (Illuminated by Cursor-Reactive Internal Light Field)
      const lightDirX = smoothPtrX * 0.35 - 0.22;
      const lightDirY = smoothPtrY * 0.35 - 0.32;
      const lightDirZ = 0.92;
      const lightLen = Math.hypot(lightDirX, lightDirY, lightDirZ) || 1;
      const lx = lightDirX / lightLen;
      const ly = lightDirY / lightLen;
      const lz = lightDirZ / lightLen;

      const lightFalloffRadius = scale * 0.44;

      for (const tri of GEOMETRY_CACHE.triangles) {
        const pa = project3D(tri.a.x, tri.a.y, tri.a.z, 1.0);
        const pb = project3D(tri.b.x, tri.b.y, tri.b.z, 1.0);
        const pc = project3D(tri.c.x, tri.c.y, tri.c.z, 1.0);

        const tcx = (pa.sx + pb.sx + pc.sx) / 3;
        const tcy = (pa.sy + pb.sy + pc.sy) / 3;
        const distToLight = Math.hypot(tcx - smoothLightX, tcy - smoothLightY);
        const localIllum =
          Math.exp(-Math.pow(distToLight / lightFalloffRadius, 2)) *
          (0.3 + 0.7 * smoothPointerPresence);

        const dot = Math.max(0, tri.nx * lx + tri.ny * ly + tri.nz * lz);
        const elev = tri.elevation;

        const r = Math.round(
          122 + (1 - elev) * 78 + dot * 22 + localIllum * 16
        );
        const g = Math.round(
          174 + (1 - elev) * 48 + dot * 20 + localIllum * 26
        );
        const b = Math.round(
          160 + (1 - elev) * 52 + dot * 18 + localIllum * 22
        );
        const alpha =
          0.2 + elev * 0.3 + localIllum * 0.16 + smoothCtaBoost * 0.04;

        ctx.beginPath();
        ctx.moveTo(pa.sx, pa.sy);
        ctx.lineTo(pb.sx, pb.sy);
        ctx.lineTo(pc.sx, pc.sy);
        ctx.closePath();
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
        ctx.fill();

        const strokeAlpha = 0.14 + dot * 0.15 + localIllum * 0.24;
        ctx.strokeStyle = `rgba(255, 255, 255, ${strokeAlpha.toFixed(3)})`;
        ctx.lineWidth = 0.4 + localIllum * 0.2;
        ctx.stroke();
      }

      // 9. 3D Elevation Columns & Grid Cells (Softly Brightened by Nearby Light Field)
      const cellLightRadius = scale * 0.38;
      for (let i = 0; i < GEOMETRY_CACHE.cells.length; i++) {
        const cell = GEOMETRY_CACHE.cells[i];
        const pTop = project3D(cell.x, cell.y, cell.z, 1.05);
        const distCell = Math.hypot(
          pTop.sx - smoothLightX,
          pTop.sy - smoothLightY
        );
        const cellIllum =
          Math.exp(-Math.pow(distCell / cellLightRadius, 2)) *
          (0.25 + 0.75 * smoothPointerPresence);

        if ((cell.elevation > 0.36 && i % 2 === 0) || cellIllum > 0.35) {
          const pBase = project3D(cell.x, cell.y, 0, 0.75);
          ctx.beginPath();
          ctx.moveTo(pBase.sx, pBase.sy);
          ctx.lineTo(pTop.sx, pTop.sy);
          const colAlpha = 0.11 + cellIllum * 0.22;
          ctx.strokeStyle = `rgba(52, 126, 105, ${colAlpha.toFixed(3)})`;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }

        const ptRadius =
          (cell.isEdge ? 1.0 : 1.3 + cellIllum * 0.45) * pTop.scaleFactor;
        ctx.beginPath();
        ctx.arc(pTop.sx, pTop.sy, ptRadius, 0, Math.PI * 2);

        const cellAlpha =
          (cell.elevation > 0.48 ? 0.42 : 0.26) + cellIllum * 0.34;
        ctx.fillStyle =
          cellIllum > 0.25
            ? `rgba(34, 134, 105, ${cellAlpha.toFixed(3)})`
            : cell.elevation > 0.48
            ? `rgba(42, 108, 89, ${cellAlpha.toFixed(3)})`
            : `rgba(94, 132, 121, ${cellAlpha.toFixed(3)})`;
        ctx.fill();
      }

      // 10. Project the 7 Key Spatial Intelligence Nodes (Micro-depth layer 1.2)
      const activeFocusId = hoveredNodeRef.current || selectedNodeRef.current;
      projectedNodes = SPATIAL_NODES.map((def) => {
        const proj = project3D(def.x, def.y, def.z, 1.2);
        return {
          id: def.id,
          sx: proj.sx,
          sy: proj.sy,
          sz: proj.sz,
          def,
        };
      });

      if (typeof window !== 'undefined') {
        (window as any).__LOCUS_HERO_NODES__ = projectedNodes.map((n) => ({
          id: n.id,
          stageTag: n.def.stageTag,
          clientX: Math.round(rect.left + n.sx),
          clientY: Math.round(rect.top + n.sy),
          isHovered: hoveredNodeRef.current === n.id,
        }));
      }

      const nodeMap = new Map(projectedNodes.map((n) => [n.id, n]));

      // 11. Draw 3D Elevated Signal Arcs & Slow Elegant Signal Particles
      const drawnPairs = new Set<string>();
      const arcLightRadius = scale * 0.48;
      let arcIndex = 0;

      for (const src of projectedNodes) {
        for (const targetId of src.def.connectedTo) {
          const pairKey = [src.id, targetId].sort().join('--');
          if (drawnPairs.has(pairKey)) continue;
          drawnPairs.add(pairKey);
          arcIndex++;

          const dst = nodeMap.get(targetId);
          if (!dst) continue;

          const isExpansionCorridor =
            (src.id === 'node-central' && dst.id === 'node-west') ||
            (src.id === 'node-west' && dst.id === 'node-central');
          const connectsToPrimary =
            src.def.isPrimary || Boolean(dst.def.isPrimary);
          const connectsToHovered =
            hoveredNodeRef.current !== null &&
            (src.id === hoveredNodeRef.current ||
              dst.id === hoveredNodeRef.current);
          const isPrimaryArc =
            isExpansionCorridor ||
            connectsToPrimary ||
            src.id === activeFocusId ||
            dst.id === activeFocusId;

          const midX = (src.def.x + dst.def.x) * 0.5;
          const midY = (src.def.y + dst.def.y) * 0.5;
          const distNorm = Math.hypot(
            src.def.x - dst.def.x,
            src.def.y - dst.def.y
          );
          const apexZ =
            Math.max(src.def.z, dst.def.z) +
            26 +
            distNorm * 40 +
            smoothCtaBoost * 4;
          const midProj = project3D(midX, midY, apexZ, 1.25);

          // Distance from cursor light field to arc midpoint & endpoints
          const dMid = Math.hypot(
            midProj.sx - smoothLightX,
            midProj.sy - smoothLightY
          );
          const dSrc = Math.hypot(src.sx - smoothLightX, src.sy - smoothLightY);
          const dDst = Math.hypot(dst.sx - smoothLightX, dst.sy - smoothLightY);
          const minArcDist = Math.min(dMid, (dSrc + dDst) * 0.5);
          const arcLightBoost =
            Math.exp(-Math.pow(minArcDist / arcLightRadius, 2)) *
            smoothPointerPresence;

          ctx.save();
          ctx.beginPath();
          ctx.moveTo(src.sx, src.sy);
          ctx.quadraticCurveTo(midProj.sx, midProj.sy, dst.sx, dst.sy);

          if (isPrimaryArc || connectsToHovered) {
            const baseOpacity = connectsToHovered
              ? 0.8
              : isExpansionCorridor
              ? 0.62 + smoothCtaBoost * 0.26 + arcLightBoost * 0.18
              : 0.44 + smoothCtaBoost * 0.34 + arcLightBoost * 0.24;
            const peakOpacity = Math.min(1, baseOpacity + 0.18);

            const arcGrad = ctx.createLinearGradient(
              src.sx,
              src.sy,
              dst.sx,
              dst.sy
            );
            arcGrad.addColorStop(
              0,
              `rgba(46, 125, 102, ${(baseOpacity * 0.85).toFixed(3)})`
            );
            arcGrad.addColorStop(
              0.5,
              `rgba(20, 158, 116, ${peakOpacity.toFixed(3)})`
            );
            arcGrad.addColorStop(
              1,
              `rgba(46, 125, 102, ${baseOpacity.toFixed(3)})`
            );
            ctx.strokeStyle = arcGrad;
            ctx.lineWidth =
              (isExpansionCorridor ? 1.75 : 1.45) +
              smoothCtaBoost * 0.45 +
              (connectsToHovered ? 0.4 : 0) +
              arcLightBoost * 0.3;
          } else {
            const secOpacity =
              0.16 + arcLightBoost * 0.26 + smoothCtaBoost * 0.1;
            ctx.strokeStyle = `rgba(61, 128, 109, ${secOpacity.toFixed(3)})`;
            ctx.lineWidth = 0.95 + arcLightBoost * 0.25;
          }
          ctx.stroke();

          // Slow, Elegant Signal Particles (HYDERABAD -> MUMBAI corridor + INTELLIGENCE paths)
          if ((isPrimaryArc || arcLightBoost > 0.3) && !preferFallback) {
            // Orient HYDERABAD -> MUMBAI expansion flow explicitly, or toward primary node
            let flowFrom = dst.def.isPrimary ? src : dst;
            let flowTo = dst.def.isPrimary ? dst : src;
            if (isExpansionCorridor) {
              flowFrom = src.id === 'node-central' ? src : dst; // HYDERABAD
              flowTo = src.id === 'node-west' ? src : dst; // MUMBAI
            }

            // Slow, calm cadence (~8.5s per traversal, slightly faster when CTA hovered)
            const speed = 0.115 + smoothCtaBoost * 0.035;
            const rawPhase = (t * speed + arcIndex * 0.23) % 1.35;

            if (rawPhase <= 1.0) {
              const pulseT = rawPhase;
              const invT = 1 - pulseT;
              const px =
                invT * invT * flowFrom.sx +
                2 * invT * pulseT * midProj.sx +
                pulseT * pulseT * flowTo.sx;
              const py =
                invT * invT * flowFrom.sy +
                2 * invT * pulseT * midProj.sy +
                pulseT * pulseT * flowTo.sy;

              // Fade smoothly at start and end of arc
              const edgeEnvelope = Math.sin(pulseT * Math.PI);
              const particleAlpha =
                edgeEnvelope *
                (0.58 + smoothCtaBoost * 0.32 + arcLightBoost * 0.2);

              // Soft subtle signal halo
              const sigGlow = ctx.createRadialGradient(px, py, 0, px, py, 6.5);
              sigGlow.addColorStop(
                0,
                `rgba(52, 211, 153, ${(particleAlpha * 0.55).toFixed(3)})`
              );
              sigGlow.addColorStop(1, 'rgba(52, 211, 153, 0)');
              ctx.beginPath();
              ctx.arc(px, py, 6.5, 0, Math.PI * 2);
              ctx.fillStyle = sigGlow;
              ctx.fill();

              // Crisp signal core dot
              ctx.beginPath();
              ctx.arc(
                px,
                py,
                1.9 + smoothCtaBoost * 0.4,
                0,
                Math.PI * 2
              );
              ctx.fillStyle = `rgba(16, 185, 129, ${Math.min(
                1,
                particleAlpha * 1.15
              ).toFixed(3)})`;
              ctx.fill();
            }
          }
          ctx.restore();
        }
      }

      // 12. Render Each Spatial Node (Active INTELLIGENCE Node + HYDERABAD -> MUMBAI Corridor)
      for (let nIdx = 0; nIdx < projectedNodes.length; nIdx++) {
        const node = projectedNodes[nIdx];
        const isHovered = hoveredNodeRef.current === node.id;
        const isSelected = selectedNodeRef.current === node.id;
        const isPrimary = Boolean(node.def.isPrimary);
        const isCityNode = Boolean(node.def.cityLabel);
        const isConnectedToHovered =
          hoveredNodeRef.current !== null &&
          node.def.connectedTo.includes(hoveredNodeRef.current);

        // Local cursor light proximity for this node
        const distNodeToLight = Math.hypot(
          node.sx - smoothLightX,
          node.sy - smoothLightY
        );
        const nodeLightBoost =
          Math.exp(-Math.pow(distNodeToLight / (scale * 0.42), 2)) *
          smoothPointerPresence;

        // Occasional calm harmonic illumination wave on secondary nodes
        const slowPulse = preferFallback
          ? 0
          : Math.max(0, Math.sin(t * 0.42 + nIdx * 1.65)) * 0.18;

        // Concentric Local Surface Ring around Primary Node, City Corridor Nodes & Hovered/Lit Nodes
        if (
          isPrimary ||
          isCityNode ||
          isHovered ||
          isSelected ||
          isConnectedToHovered ||
          nodeLightBoost > 0.32
        ) {
          const localRingRadius = isPrimary
            ? 0.132 + smoothCtaBoost * 0.014
            : isHovered
            ? 0.118
            : isCityNode
            ? 0.094
            : 0.082;
          ctx.save();
          ctx.beginPath();
          const segs = 44;
          for (let s = 0; s <= segs; s++) {
            const a = (s / segs) * Math.PI * 2;
            const rp = project3D(
              node.def.x + Math.cos(a) * localRingRadius,
              node.def.y + Math.sin(a) * localRingRadius,
              node.def.z,
              1.2
            );
            if (s === 0) ctx.moveTo(rp.sx, rp.sy);
            else ctx.lineTo(rp.sx, rp.sy);
          }
          const ringAlpha = isPrimary
            ? 0.56 + smoothCtaBoost * 0.24 + nodeLightBoost * 0.15
            : isHovered
            ? 0.58
            : isCityNode
            ? 0.34 + smoothCtaBoost * 0.14 + nodeLightBoost * 0.2
            : 0.22 + nodeLightBoost * 0.28;
          ctx.strokeStyle =
            isPrimary || isHovered
              ? `rgba(22, 163, 122, ${Math.min(0.9, ringAlpha).toFixed(3)})`
              : `rgba(61, 128, 109, ${Math.min(0.75, ringAlpha).toFixed(3)})`;
          ctx.lineWidth = isPrimary || isHovered ? 1.25 : 0.9;
          ctx.stroke();

          // Outer subtle precision ring exclusively for the Primary INTELLIGENCE node
          if (isPrimary) {
            const outerRingR = 0.185 + smoothCtaBoost * 0.018;
            ctx.beginPath();
            ctx.setLineDash([2, 6]);
            for (let s = 0; s <= segs; s++) {
              const a = (s / segs) * Math.PI * 2 - t * 0.04;
              const rp = project3D(
                node.def.x + Math.cos(a) * outerRingR,
                node.def.y + Math.sin(a) * outerRingR,
                node.def.z,
                1.2
              );
              if (s === 0) ctx.moveTo(rp.sx, rp.sy);
              else ctx.lineTo(rp.sx, rp.sy);
            }
            ctx.strokeStyle = `rgba(46, 125, 102, ${(
              0.28 +
              smoothCtaBoost * 0.22 +
              nodeLightBoost * 0.15
            ).toFixed(3)})`;
            ctx.lineWidth = 0.85;
            ctx.stroke();
          }
          ctx.restore();
        }

        const haloRadius = isPrimary
          ? 34 + smoothCtaBoost * 8 + nodeLightBoost * 5
          : isHovered
          ? 32
          : isCityNode
          ? 22 + nodeLightBoost * 6
          : isSelected
          ? 24
          : 15 + nodeLightBoost * 7;
        const nodeHalo = ctx.createRadialGradient(
          node.sx,
          node.sy,
          0,
          node.sx,
          node.sy,
          haloRadius
        );
        if (isPrimary || isHovered || isSelected) {
          const coreHaloAlpha = isPrimary
            ? 0.38 + smoothCtaBoost * 0.14 + nodeLightBoost * 0.1
            : 0.36;
          nodeHalo.addColorStop(
            0,
            `rgba(20, 168, 124, ${Math.min(0.65, coreHaloAlpha).toFixed(3)})`
          );
          nodeHalo.addColorStop(
            0.48,
            `rgba(61, 128, 109, ${(coreHaloAlpha * 0.42).toFixed(3)})`
          );
          nodeHalo.addColorStop(1, 'rgba(61, 128, 109, 0)');
        } else {
          const secHaloAlpha = 0.55 + nodeLightBoost * 0.3 + slowPulse;
          nodeHalo.addColorStop(
            0,
            `rgba(255, 255, 255, ${Math.min(0.9, secHaloAlpha).toFixed(3)})`
          );
          nodeHalo.addColorStop(
            0.55,
            `rgba(94, 168, 147, ${(nodeLightBoost * 0.24 + slowPulse * 0.4).toFixed(3)})`
          );
          nodeHalo.addColorStop(1, 'rgba(61, 128, 109, 0)');
        }
        ctx.beginPath();
        ctx.arc(node.sx, node.sy, haloRadius, 0, Math.PI * 2);
        ctx.fillStyle = nodeHalo;
        ctx.fill();

        const pinOuterR = isPrimary
          ? 9.2 + (isHovered ? 1.6 : 0) + smoothCtaBoost * 1.1
          : isHovered
          ? 8.4
          : isCityNode
          ? 5.8 + nodeLightBoost * 0.8
          : isSelected
          ? 7.2
          : isConnectedToHovered
          ? 5.4
          : 4.4 + nodeLightBoost * 1.1;

        ctx.beginPath();
        ctx.arc(node.sx, node.sy, pinOuterR, 0, Math.PI * 2);
        ctx.fillStyle =
          isPrimary || isHovered || isSelected
            ? 'rgba(13, 37, 31, 0.95)'
            : isCityNode
            ? 'rgba(20, 56, 46, 0.92)'
            : nodeLightBoost > 0.35
            ? 'rgba(244, 252, 249, 0.98)'
            : 'rgba(255, 255, 255, 0.94)';
        ctx.fill();
        ctx.strokeStyle =
          isPrimary || isHovered || isSelected || isCityNode
            ? `rgba(110, 231, 183, ${(0.88 + smoothCtaBoost * 0.12).toFixed(3)})`
            : `rgba(61, 128, 109, ${(0.55 + nodeLightBoost * 0.35).toFixed(3)})`;
        ctx.lineWidth = isPrimary ? 1.65 : 1.45;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(
          node.sx,
          node.sy,
          isPrimary || isHovered
            ? 3.4 + smoothCtaBoost * 0.35
            : isCityNode
            ? 2.5
            : 2.1 + nodeLightBoost * 0.4,
          0,
          Math.PI * 2
        );
        ctx.fillStyle =
          isPrimary || isHovered || isSelected || isCityNode
            ? '#6EE7B7'
            : nodeLightBoost > 0.3
            ? '#229B78'
            : '#3D806D';
        ctx.fill();

        // Subtle, restrained location node labels for HYDERABAD -> MUMBAI (plus hovered node tag)
        if (isCityNode || isHovered) {
          const labelText = node.def.cityLabel || node.def.stageTag;
          ctx.save();
          ctx.font = '600 9px "JetBrains Mono", monospace';
          const textWidth = ctx.measureText(labelText).width;
          const pillW = textWidth + 18;
          const pillH = 20;
          const isLeft = node.def.labelSide === 'left';
          const pillX = isLeft ? node.sx - pillW - 12 : node.sx + 12;
          const pillY = node.sy - pillH / 2;

          ctx.beginPath();
          ctx.roundRect(pillX, pillY, pillW, pillH, 10);
          ctx.fillStyle = isHovered
            ? 'rgba(248, 253, 251, 0.94)'
            : 'rgba(255, 255, 255, 0.84)';
          ctx.fill();
          ctx.strokeStyle = isHovered
            ? 'rgba(22, 163, 122, 0.55)'
            : 'rgba(61, 128, 109, 0.30)';
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.fillStyle = '#0B1220';
          ctx.textBaseline = 'middle';
          ctx.fillText(labelText, pillX + 9, node.sy + 0.5);
          ctx.restore();
        }
      }

      if (!preferFallback) {
        rafId = window.requestAnimationFrame(renderFrame);
      }
    };

    resize();
    renderFrame(performance.now());

    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            resize();
            if (preferFallback) renderFrame(performance.now());
          })
        : null;
    ro?.observe(container);
    window.addEventListener('resize', resize, { passive: true });

    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      ro?.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('click', handleClick);
    };
  }, [heroPointerRef, heroClientPointerRef, preferFallback, onNodeSelect]);

  const activeVisualState: SpatialCoreVisualState = isCtaHovered
    ? 'intelligence-active'
    : hoveredNodeId
    ? 'hover'
    : selectedNodeId
    ? 'location-selected'
    : 'idle';

  const activeNodeDef =
    SPATIAL_NODES.find((n) => n.id === (hoveredNodeId || selectedNodeId)) ||
    SPATIAL_NODES[0];

  return (
    <div
      ref={containerRef}
      className="relative flex h-full w-full items-center justify-center select-none"
      aria-label="LOCUS Interactive 3D Spatial Core"
    >
      <canvas ref={canvasRef} className="block h-full w-full" />

      {/* Top-Right Product Category Pill */}
      <div className="pointer-events-none absolute right-8 top-8 hidden flex-col items-end gap-1.5 sm:flex">
        <div
          data-locus-zone="GLASS"
          className="liquid-pill-light flex items-center gap-2 rounded-full px-3.5 py-1"
        >
          <span
            className={`h-1.5 w-1.5 rounded-full transition-colors duration-300 ${
              activeVisualState === 'intelligence-active' ||
              activeVisualState === 'hover'
                ? 'bg-emerald-500'
                : 'bg-[#3D806D]'
            }`}
          />
          <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.2em] text-[#0B1220]/75">
            MARKET INTELLIGENCE PLATFORM
          </span>
        </div>
      </div>

      {/* Bottom Centered 4-Stage Visual Flow Legend */}
      <div className="pointer-events-none absolute bottom-6 left-1/2 hidden -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-[#0B1220]/10 bg-white/75 px-4 py-1.5 shadow-sm backdrop-blur-md lg:flex">
        {(
          ['LOCATION', 'MARKET', 'GROUND REALITY', 'INTELLIGENCE'] as const
        ).map((stage, idx) => {
          const isCurrent =
            activeNodeDef.stageTag === stage ||
            (isCtaHovered && stage === 'INTELLIGENCE');
          return (
            <React.Fragment key={stage}>
              <span
                className={`font-mono text-[9px] uppercase tracking-[0.16em] transition-colors duration-300 ${
                  isCurrent
                    ? 'font-bold text-[#1F6E58]'
                    : 'text-[#0B1220]/45'
                }`}
              >
                {stage}
              </span>
              {idx < 3 && (
                <span className="font-mono text-[9px] text-[#0B1220]/25">→</span>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
