import React, { useEffect, useId, useRef, useState } from 'react';

export interface SystemSculptureProps {
  shape: 'orbital' | 'signal' | 'lattice';
  expanded: boolean;
  motionEnabled: boolean;
}

type SculptureShape = SystemSculptureProps['shape'];

interface Point {
  u: number;
  v: number;
  x: number;
  y: number;
  z: number;
}

interface ProjectedPoint {
  x: number;
  y: number;
  z: number;
}

interface SculptureController {
  update: (next: SystemSculptureProps) => void;
}

const TAU = Math.PI * 2;
const ROWS = 32;
const COLS = 72;

const FALLBACK_COLORS = {
  accent: '#d9f991',
  ink: '#edf2e8',
  line: '#2e3c3c',
};

function targetPoint(point: Point, index: number, shape: SculptureShape, expanded: boolean) {
  const { u, v } = point;

  if (shape === 'signal') {
    const reach = expanded ? 1.12 : 1;
    const radius = (1.08 + 0.24 * Math.cos(3 * u + v)) * reach;
    const twist = v + u * 1.6;

    return {
      x: radius * Math.cos(u),
      y: 0.63 * Math.sin(twist) + 0.18 * Math.sin(u * 3),
      z: radius * Math.sin(u) * 0.68,
    };
  }

  if (shape === 'lattice') {
    const row = Math.floor(index / COLS);
    const column = index % COLS;
    const face = column % 6;
    const faceColumn = Math.floor(column / 6);
    const a = (faceColumn / 11 - 0.5) * 1.7;
    const b = (row / (ROWS - 1) - 0.5) * 1.7;
    const edge = 0.85 + (expanded ? 0.34 : 0);

    if (face === 0) return { x: edge, y: a, z: b };
    if (face === 1) return { x: -edge, y: a, z: b };
    if (face === 2) return { x: a, y: edge, z: b };
    if (face === 3) return { x: a, y: -edge, z: b };
    if (face === 4) return { x: a, y: b, z: edge };
    return { x: a, y: b, z: -edge };
  }

  const expansion = expanded ? 1.12 : 1;
  const tube = 0.36 + 0.05 * Math.sin(u * 3);
  const radius = (0.91 + tube * Math.cos(v)) * expansion;

  return {
    x: radius * Math.cos(u),
    y: radius * Math.sin(u),
    z: tube * Math.sin(v),
  };
}

function StaticSculpture({ shape, expanded }: Pick<SystemSculptureProps, 'shape' | 'expanded'>) {
  const scale = expanded ? 1.08 : 1;
  const fallbackId = useId().replace(/:/g, '');
  const gridId = `${fallbackId}-dot-grid`;
  const glowId = `${fallbackId}-glow`;

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 640 520"
      preserveAspectRatio="xMidYMid slice"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    >
      <defs>
        <pattern id={gridId} width="32" height="32" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.8" fill="var(--obs-line, #2e3c3c)" opacity="0.8" />
          <path d="M 0 0 H 32 M 0 0 V 32" stroke="var(--obs-line, #2e3c3c)" strokeWidth="0.45" opacity="0.28" />
        </pattern>
        <radialGradient id={glowId}>
          <stop offset="0" stopColor="var(--obs-accent, #d9f991)" stopOpacity="0.16" />
          <stop offset="1" stopColor="var(--obs-accent, #d9f991)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="640" height="520" fill={`url(#${gridId})`} />
      <circle cx="320" cy="260" r="192" fill={`url(#${glowId})`} />
      <g transform={`translate(320 260) scale(${scale})`} fill="none" stroke="var(--obs-accent, #d9f991)">
        <circle r="178" opacity="0.28" strokeWidth="1" strokeDasharray="2 8" />
        {shape === 'orbital' && (
          <>
            {[-52, -35, -18, 0, 18, 35, 52].map((offset) => (
              <ellipse key={offset} rx={142} ry={62 + Math.abs(offset) * 0.45} transform={`rotate(${offset})`} opacity="0.24" />
            ))}
            <ellipse rx="145" ry="66" opacity="0.75" strokeWidth="1.3" strokeDasharray="1 5" />
          </>
        )}
        {shape === 'signal' && (
          <>
            {[-36, -24, -12, 0, 12, 24, 36].map((offset) => (
              <path
                key={offset}
                d={`M -150 ${offset} C -90 ${-92 + offset}, -28 ${92 + offset}, 32 ${offset} S 114 ${-80 + offset}, 152 ${offset}`}
                opacity={offset === 0 ? 0.72 : 0.22}
                strokeDasharray={offset === 0 ? '1 5' : undefined}
              />
            ))}
          </>
        )}
        {shape === 'lattice' && (
          <g opacity="0.58" strokeWidth="0.9">
            <path d="M-112-112 112-112 112 112-112 112ZM-76-76 148-76 148 148-76 148ZM-112-112-76-76M112-112 148-76M112 112 148 148M-112 112-76 148" />
            {[-72, -32, 8, 48, 88].map((offset) => (
              <path key={offset} d={`M${offset}-112 ${offset + 36}-76M${offset}112 ${offset + 36}148M-112${offset} -76${offset + 36}M112${offset} 148${offset + 36}`} opacity="0.45" />
            ))}
          </g>
        )}
      </g>
    </svg>
  );
}

export const SystemSculpture: React.FC<SystemSculptureProps> = (props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<SculptureController | null>(null);
  const configRef = useRef<SystemSculptureProps>(props);
  const [canvasReady, setCanvasReady] = useState(false);
  configRef.current = props;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let context: CanvasRenderingContext2D | null = null;
    try {
      context = canvas.getContext('2d');
    } catch {
      context = null;
    }
    if (!context) return;

    const ctx = context;
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const paletteElement = canvas.closest<HTMLElement>('.observatory') ?? canvas;
    let config = configRef.current;
    let width = 0;
    let height = 0;
    let time = 0;
    let lastTime = 0;
    let animationFrame = 0;
    let drawFrame = 0;
    let inViewport = true;
    let pageVisible = !document.hidden;
    let pointer = { x: 0, y: 0 };
    let smoothPointer = { x: 0, y: 0 };
    let palette = { ...FALLBACK_COLORS };

    const points: Point[] = [];
    for (let row = 0; row < ROWS; row += 1) {
      for (let column = 0; column < COLS; column += 1) {
        const point: Point = {
          u: (column / COLS) * TAU,
          v: (row / ROWS) * TAU,
          x: 0,
          y: 0,
          z: 0,
        };
        Object.assign(point, targetPoint(point, points.length, config.shape, config.expanded));
        points.push(point);
      }
    }

    const shouldAnimate = () => config.motionEnabled && !motionQuery.matches && inViewport && pageVisible;

    const readPalette = () => {
      const styles = getComputedStyle(paletteElement);
      palette = {
        accent: styles.getPropertyValue('--obs-accent').trim() || FALLBACK_COLORS.accent,
        ink: styles.getPropertyValue('--obs-ink').trim() || FALLBACK_COLORS.ink,
        line: styles.getPropertyValue('--obs-line').trim() || FALLBACK_COLORS.line,
      };
    };

    const project = (x: number, y: number, z: number, rotation: number): ProjectedPoint => {
      const cosY = Math.cos(rotation);
      const sinY = Math.sin(rotation);
      const tilt = 0.6 + smoothPointer.y * 0.14;
      const cosX = Math.cos(tilt);
      const sinX = Math.sin(tilt);
      const rotatedX = x * cosY + z * sinY;
      const rotatedZ = -x * sinY + z * cosY;
      const rotatedY = y * cosX - rotatedZ * sinX;
      const depth = y * sinX + rotatedZ * cosX;
      const sculptureScale = Math.min(width * 0.285, height * 0.31);
      const perspective = 4.8 / (4.8 - depth);

      return {
        x: width * 0.49 + rotatedX * sculptureScale * perspective,
        y: height * 0.5 + rotatedY * sculptureScale * perspective,
        z: depth,
      };
    };

    const drawBackdrop = () => {
      ctx.lineWidth = 0.55;
      ctx.strokeStyle = palette.line;
      ctx.fillStyle = palette.line;

      for (let x = 20; x < width; x += 30) {
        for (let y = 38; y < height - 24; y += 30) {
          ctx.globalAlpha = (x + y) % 60 === 0 ? 0.5 : 0.28;
          ctx.fillRect(x, y, 1, 1);
        }
      }

      ctx.globalAlpha = 0.16;
      for (let x = 20; x < width; x += 120) {
        ctx.beginPath();
        ctx.moveTo(x, 38);
        ctx.lineTo(x, height - 24);
        ctx.stroke();
      }
      for (let y = 38; y < height - 24; y += 120) {
        ctx.beginPath();
        ctx.moveTo(20, y);
        ctx.lineTo(width - 20, y);
        ctx.stroke();
      }
    };

    const drawCalibrationRing = (radius: number) => {
      const centerX = width * 0.49;
      const centerY = height * 0.5;
      ctx.strokeStyle = palette.accent;
      ctx.lineWidth = 0.65;
      ctx.globalAlpha = 0.22;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, TAU);
      ctx.stroke();

      for (let index = 0; index < 72; index += 1) {
        const angle = (index / 72) * TAU;
        const major = index % 6 === 0;
        const inner = radius + (major ? 3 : 7);
        const outer = radius + (major ? 13 : 10);
        ctx.globalAlpha = major ? 0.62 : 0.22;
        ctx.beginPath();
        ctx.moveTo(centerX + Math.cos(angle) * inner, centerY + Math.sin(angle) * inner);
        ctx.lineTo(centerX + Math.cos(angle) * outer, centerY + Math.sin(angle) * outer);
        ctx.stroke();
      }

      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.moveTo(centerX - radius - 18, centerY);
      ctx.lineTo(centerX - radius + 8, centerY);
      ctx.moveTo(centerX + radius - 8, centerY);
      ctx.lineTo(centerX + radius + 18, centerY);
      ctx.stroke();
    };

    const drawSurfaceWires = (projected: ProjectedPoint[]) => {
      ctx.strokeStyle = palette.accent;
      ctx.lineWidth = 0.62;

      if (config.shape === 'lattice') {
        for (let face = 0; face < 6; face += 1) {
          for (let row = 0; row < ROWS; row += 4) {
            ctx.beginPath();
            for (let column = 0; column < 12; column += 1) {
              const point = projected[row * COLS + column * 6 + face];
              if (column === 0) ctx.moveTo(point.x, point.y);
              else ctx.lineTo(point.x, point.y);
            }
            ctx.globalAlpha = 0.18;
            ctx.stroke();
          }
          for (let column = 0; column < 12; column += 2) {
            ctx.beginPath();
            for (let row = 0; row < ROWS; row += 1) {
              const point = projected[row * COLS + column * 6 + face];
              if (row === 0) ctx.moveTo(point.x, point.y);
              else ctx.lineTo(point.x, point.y);
            }
            ctx.globalAlpha = 0.16;
            ctx.stroke();
          }
        }
        return;
      }

      for (let row = 0; row < ROWS; row += 2) {
        ctx.beginPath();
        for (let column = 0; column <= COLS; column += 1) {
          const point = projected[row * COLS + (column % COLS)];
          if (column === 0) ctx.moveTo(point.x, point.y);
          else ctx.lineTo(point.x, point.y);
        }
        ctx.globalAlpha = config.shape === 'signal' ? 0.16 : 0.2;
        ctx.stroke();
      }
      for (let column = 0; column < COLS; column += 6) {
        ctx.beginPath();
        for (let row = 0; row <= ROWS; row += 1) {
          const point = projected[(row % ROWS) * COLS + column];
          if (row === 0) ctx.moveTo(point.x, point.y);
          else ctx.lineTo(point.x, point.y);
        }
        ctx.globalAlpha = 0.2;
        ctx.stroke();
      }
    };

    const draw = (now: number, staticFrame = false) => {
      if (width <= 0 || height <= 0) return;
      const delta = lastTime ? Math.min((now - lastTime) / 1000, 0.05) : 0;
      lastTime = now;
      if (!staticFrame) time += delta;

      const pointerEase = staticFrame ? 1 : 1 - Math.exp(-delta * 5.2);
      smoothPointer.x += (pointer.x - smoothPointer.x) * pointerEase;
      smoothPointer.y += (pointer.y - smoothPointer.y) * pointerEase;

      ctx.clearRect(0, 0, width, height);
      drawBackdrop();

      const ringRadius = Math.min(width * 0.35, height * 0.385) * (config.expanded ? 1.04 : 1);
      drawCalibrationRing(ringRadius);

      const rotation = time * 0.13 + smoothPointer.x * 0.19 + 0.43;
      const projected: ProjectedPoint[] = [];
      const morphEase = staticFrame ? 1 : 1 - Math.exp(-delta * 4.7);

      points.forEach((point, index) => {
        const target = targetPoint(point, index, config.shape, config.expanded);
        point.x += (target.x - point.x) * morphEase;
        point.y += (target.y - point.y) * morphEase;
        point.z += (target.z - point.z) * morphEase;
        const wave = config.shape === 'signal' ? Math.sin(point.u * 4 + time * 0.7) * 0.07 : 0;
        projected.push(project(point.x, point.y + wave, point.z, rotation));
      });

      drawSurfaceWires(projected);

      const depthSorted = projected.map((point, index) => ({ ...point, index })).sort((a, b) => a.z - b.z);
      depthSorted.forEach((point) => {
        const depth = Math.max(0.1, Math.min(1, (point.z + 1.8) / 3.2));
        ctx.globalAlpha = 0.14 + depth * 0.78;
        ctx.fillStyle = point.index % 17 === 0 ? palette.ink : palette.accent;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 0.38 + depth * 0.68, 0, TAU);
        ctx.fill();
      });

      const tracerAngle = time * 0.18 - 1;
      const tracerX = width * 0.49 + Math.cos(tracerAngle) * ringRadius;
      const tracerY = height * 0.5 + Math.sin(tracerAngle) * ringRadius;
      ctx.fillStyle = palette.accent;
      ctx.globalAlpha = 0.82;
      ctx.beginPath();
      ctx.arc(tracerX, tracerY, 3, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 0.11;
      ctx.beginPath();
      ctx.arc(tracerX, tracerY, 9, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    };

    const loop = (now: number) => {
      animationFrame = 0;
      draw(now);
      if (shouldAnimate()) animationFrame = requestAnimationFrame(loop);
    };

    const requestStaticDraw = () => {
      if (drawFrame) cancelAnimationFrame(drawFrame);
      drawFrame = requestAnimationFrame((now) => {
        drawFrame = 0;
        draw(now, true);
      });
    };

    const reconcileAnimation = () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
        animationFrame = 0;
      }
      if (drawFrame) {
        cancelAnimationFrame(drawFrame);
        drawFrame = 0;
      }
      lastTime = 0;
      if (shouldAnimate()) animationFrame = requestAnimationFrame(loop);
      else requestStaticDraw();
    };

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      width = bounds.width;
      height = bounds.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const pixelWidth = Math.max(1, Math.round(width * dpr));
      const pixelHeight = Math.max(1, Math.round(height * dpr));

      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!shouldAnimate()) requestStaticDraw();
    };

    const onPointerMove = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      pointer = {
        x: ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
        y: ((event.clientY - bounds.top) / bounds.height) * 2 - 1,
      };
      if (!shouldAnimate()) requestStaticDraw();
    };

    const onPointerLeave = () => {
      pointer = { x: 0, y: 0 };
      if (!shouldAnimate()) requestStaticDraw();
    };

    const onVisibilityChange = () => {
      pageVisible = !document.hidden;
      reconcileAnimation();
    };

    const onMotionPreferenceChange = () => reconcileAnimation();

    readPalette();
    resize();
    setCanvasReady(true);

    canvas.addEventListener('pointermove', onPointerMove, { passive: true });
    canvas.addEventListener('pointerleave', onPointerLeave);
    document.addEventListener('visibilitychange', onVisibilityChange);
    motionQuery.addEventListener('change', onMotionPreferenceChange);

    let resizeObserver: ResizeObserver | null = null;
    if ('ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(canvas);
    } else {
      window.addEventListener('resize', resize, { passive: true });
    }

    let intersectionObserver: IntersectionObserver | null = null;
    if ('IntersectionObserver' in window) {
      intersectionObserver = new IntersectionObserver((entries) => {
        inViewport = entries[0]?.isIntersecting ?? true;
        reconcileAnimation();
      });
      intersectionObserver.observe(canvas);
    }

    const paletteObserver = new MutationObserver(() => {
      readPalette();
      if (!shouldAnimate()) requestStaticDraw();
    });
    paletteObserver.observe(paletteElement, { attributes: true, attributeFilter: ['data-direction'] });
    paletteObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    controllerRef.current = {
      update(next) {
        config = next;
        reconcileAnimation();
      },
    };
    reconcileAnimation();

    return () => {
      controllerRef.current = null;
      cancelAnimationFrame(animationFrame);
      cancelAnimationFrame(drawFrame);
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      paletteObserver.disconnect();
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      motionQuery.removeEventListener('change', onMotionPreferenceChange);
      if (!resizeObserver) window.removeEventListener('resize', resize);
    };
  }, []);

  useEffect(() => {
    controllerRef.current?.update(props);
  }, [props.expanded, props.motionEnabled, props.shape]);

  return (
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      {!canvasReady && <StaticSculpture shape={props.shape} expanded={props.expanded} />}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          opacity: canvasReady ? 1 : 0,
        }}
      />
    </div>
  );
};
