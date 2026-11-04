import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import CompassRose from "./CompassRose";
import type { EchoPick } from "../lib/today";
import {
  CONSTELLATIONS,
  type Constellation,
} from "../lib/constellations";
import {
  SKY_TYPE_COLORS,
  starPoint,
  type SkyStar,
} from "../lib/sky";
import type { LedgerEventType } from "../types";
import type { ThemeId } from "../lib/theme";

interface StarrySkyProps {
  theme: ThemeId;
  stars: SkyStar[];
  echoes: EchoPick[];
  todayLit: boolean;
  selected: string | null;
  onSelect: (key: string) => void;
  onGoToday?: () => void;
}

interface MeteorPath {
  startAt: number;
  duration: number;
  from: { x: number; y: number };
  to: { x: number; y: number };
  tailScale: number;
  lineWidth: number;
  brightness: number;
}

interface PlotStar extends SkyStar {
  x: number;
  y: number;
  radius: number;
  brightness: number;
}

const FONT_STACK =
  '"PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif';

/* 画布调色：霞光=白昼描图纸，夜间=深空，庄园=铜版雕印 */
interface SkyPalette {
  baseStops: [string, string, string];
  blobs: Array<[number, number, number, string]>;
  horizon: [string, string];
  constellationLine: string;
  constellationGlow: [string, string, string];
  constellationCore: string;
  labelRule: string;
  nameLabel: string;
  ambientRgb: string;
  ambientBase: number;
  ambientSpan: number;
  linkLine: string;
  hoverRing: string;
  selectRing: string;
  pulseRgb: string;
  todayLabel: string;
  meteorTrail: [string, string, string, string];
  meteorGlow: [string, string, string, string];
  meteorHead: string;
  plateBg: string;
  plateBorder: string;
  plateDot: string;
  plateKicker: string;
  plateTitle: string;
  plateQuote: string;
}

const DAWN_TYPE_COLORS: Partial<Record<LedgerEventType, string>> = {
  assignment_done: "#5f86c9",
  experience_added: "#d9a13f",
  experience_updated: "#c47a2c",
  evidence_added: "#3f9c77",
  note_added: "#c98a3c",
  resume_generated: "#9a6cc4",
  match_run: "#64748c",
};

const PALETTES: Record<ThemeId, SkyPalette> = {
  dawn: {
    baseStops: ["#f7f8f4", "#eef1f1", "#f3f2ec"],
    blobs: [
      [0.2, 0.16, 0.62, "rgba(191, 239, 243, 0.3)"],
      [0.82, 0.7, 0.56, "rgba(239, 150, 197, 0.2)"],
      [0.64, 0.22, 0.42, "rgba(200, 132, 42, 0.1)"],
      [0.12, 0.86, 0.46, "rgba(46, 104, 108, 0.08)"],
    ],
    horizon: ["rgba(0, 0, 0, 0)", "rgba(38, 49, 58, 0.07)"],
    constellationLine: "rgba(38, 49, 58, 0.42)",
    constellationGlow: [
      "rgba(194, 97, 143, 0.5)",
      "rgba(38, 49, 58, 0.12)",
      "rgba(38, 49, 58, 0)",
    ],
    constellationCore: "rgba(38, 49, 58, 0.9)",
    labelRule: "rgba(38, 49, 58, 0.3)",
    nameLabel: "rgba(38, 49, 58, 0.62)",
    ambientRgb: "38, 49, 58",
    ambientBase: 0.08,
    ambientSpan: 0.22,
    linkLine: "rgba(38, 49, 58, 0.14)",
    hoverRing: "rgba(38, 49, 58, 0.34)",
    selectRing: "rgba(194, 97, 143, 0.66)",
    pulseRgb: "194, 97, 143",
    todayLabel: "rgba(166, 76, 122, 0.95)",
    meteorTrail: [
      "rgba(38, 49, 58, 0)",
      "rgba(194, 97, 143, 0.16)",
      "rgba(194, 97, 143, 0.5)",
      "rgba(166, 76, 122, 0.88)",
    ],
    meteorGlow: [
      "rgba(255, 250, 252, 0.95)",
      "rgba(239, 150, 197, 0.5)",
      "rgba(194, 97, 143, 0.14)",
      "rgba(194, 97, 143, 0)",
    ],
    meteorHead: "rgba(166, 76, 122, 1)",
    plateBg: "rgba(252, 253, 254, 0.92)",
    plateBorder: "rgba(38, 49, 58, 0.26)",
    plateDot: "#c2618f",
    plateKicker: "#26313a",
    plateTitle: "rgba(38, 49, 58, 0.78)",
    plateQuote: "rgba(38, 49, 58, 0.6)",
  },
  night: {
    baseStops: ["#070b16", "#0a1022", "#05070e"],
    blobs: [
      [0.2, 0.16, 0.62, "rgba(64, 92, 178, 0.26)"],
      [0.82, 0.7, 0.56, "rgba(128, 80, 44, 0.2)"],
      [0.64, 0.22, 0.42, "rgba(96, 66, 148, 0.16)"],
      [0.12, 0.86, 0.46, "rgba(46, 104, 108, 0.14)"],
    ],
    horizon: ["rgba(0, 0, 0, 0)", "rgba(42, 28, 58, 0.28)"],
    constellationLine: "rgba(212, 190, 148, 0.34)",
    constellationGlow: [
      "rgba(255, 243, 214, 0.62)",
      "rgba(226, 200, 148, 0.2)",
      "rgba(226, 200, 148, 0)",
    ],
    constellationCore: "rgba(252, 244, 224, 0.9)",
    labelRule: "rgba(231, 201, 140, 0.3)",
    nameLabel: "rgba(231, 201, 140, 0.62)",
    ambientRgb: "226, 233, 248",
    ambientBase: 0.18,
    ambientSpan: 0.42,
    linkLine: "rgba(196, 172, 126, 0.14)",
    hoverRing: "rgba(255, 248, 230, 0.4)",
    selectRing: "rgba(231, 201, 140, 0.68)",
    pulseRgb: "231, 201, 140",
    todayLabel: "rgba(231, 201, 140, 0.92)",
    meteorTrail: [
      "rgba(255, 255, 255, 0)",
      "rgba(228, 196, 138, 0.14)",
      "rgba(255, 228, 176, 0.52)",
      "rgba(255, 250, 236, 0.92)",
    ],
    meteorGlow: [
      "rgba(255, 252, 240, 0.95)",
      "rgba(255, 226, 168, 0.5)",
      "rgba(238, 198, 128, 0.12)",
      "rgba(238, 202, 138, 0)",
    ],
    meteorHead: "rgba(255, 255, 250, 1)",
    plateBg: "rgba(6, 9, 18, 0.8)",
    plateBorder: "rgba(220, 186, 124, 0.38)",
    plateDot: "#e7c98c",
    plateKicker: "#f4ecd9",
    plateTitle: "rgba(244, 236, 217, 0.78)",
    plateQuote: "rgba(222, 213, 194, 0.72)",
  },
  manor: {
    baseStops: ["#151009", "#100d12", "#0b0a0d"],
    blobs: [
      [0.2, 0.16, 0.62, "rgba(186, 163, 112, 0.16)"],
      [0.82, 0.7, 0.56, "rgba(107, 32, 24, 0.12)"],
      [0.64, 0.22, 0.42, "rgba(154, 134, 88, 0.1)"],
      [0.12, 0.86, 0.46, "rgba(30, 30, 32, 0.16)"],
    ],
    horizon: ["rgba(0, 0, 0, 0)", "rgba(107, 32, 24, 0.1)"],
    constellationLine: "rgba(186, 163, 112, 0.46)",
    constellationGlow: [
      "rgba(241, 228, 194, 0.55)",
      "rgba(186, 163, 112, 0.18)",
      "rgba(186, 163, 112, 0)",
    ],
    constellationCore: "rgba(241, 228, 194, 0.92)",
    labelRule: "rgba(186, 163, 112, 0.34)",
    nameLabel: "rgba(186, 163, 112, 0.72)",
    ambientRgb: "241, 228, 194",
    ambientBase: 0.14,
    ambientSpan: 0.4,
    linkLine: "rgba(186, 163, 112, 0.16)",
    hoverRing: "rgba(241, 228, 194, 0.4)",
    selectRing: "rgba(186, 163, 112, 0.7)",
    pulseRgb: "186, 163, 112",
    todayLabel: "rgba(241, 228, 194, 0.92)",
    meteorTrail: [
      "rgba(255, 255, 255, 0)",
      "rgba(186, 163, 112, 0.16)",
      "rgba(231, 201, 140, 0.5)",
      "rgba(241, 228, 194, 0.92)",
    ],
    meteorGlow: [
      "rgba(255, 250, 240, 0.95)",
      "rgba(231, 201, 140, 0.5)",
      "rgba(186, 163, 112, 0.12)",
      "rgba(186, 163, 112, 0)",
    ],
    meteorHead: "rgba(250, 246, 236, 1)",
    plateBg: "rgba(30, 30, 32, 0.86)",
    plateBorder: "rgba(186, 163, 112, 0.4)",
    plateDot: "#baa370",
    plateKicker: "#f1e4c2",
    plateTitle: "rgba(241, 228, 194, 0.78)",
    plateQuote: "rgba(241, 228, 194, 0.6)",
  },
};

function starColorFor(
  theme: ThemeId,
  eventType: LedgerEventType,
): string {
  if (theme === "dawn") {
    return DAWN_TYPE_COLORS[eventType] ?? "#c2618f";
  }
  return SKY_TYPE_COLORS[eventType] ?? "#f2d49a";
}

function hexToRgba(hex: string, alpha: number): string {
  const value = hex.replace("#", "");
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const ratio = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return ratio * ratio * (3 - 2 * ratio);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function clampText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let current = text;
  while (current.length > 1) {
    current = current.slice(0, -1);
    if (ctx.measureText(`${current}…`).width <= maxWidth) {
      return `${current}…`;
    }
  }
  return "…";
}

function buildBackground(
  width: number,
  height: number,
  dpr: number,
  palette: SkyPalette,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * dpr));
  canvas.height = Math.max(1, Math.round(height * dpr));
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const base = ctx.createLinearGradient(0, 0, width * 0.2, height);
  base.addColorStop(0, palette.baseStops[0]);
  base.addColorStop(0.52, palette.baseStops[1]);
  base.addColorStop(1, palette.baseStops[2]);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, width, height);

  for (const [x, y, radius, color] of palette.blobs) {
    const glow = ctx.createRadialGradient(
      width * x,
      height * y,
      0,
      width * x,
      height * y,
      Math.max(width, height) * radius,
    );
    glow.addColorStop(0, color);
    glow.addColorStop(0.55, color.replace(/[\d.]+\)$/, "0.05)"));
    glow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
  }

  const horizon = ctx.createLinearGradient(0, height * 0.68, 0, height);
  horizon.addColorStop(0, palette.horizon[0]);
  horizon.addColorStop(1, palette.horizon[1]);
  ctx.fillStyle = horizon;
  ctx.fillRect(0, height * 0.68, width, height * 0.32);
  return canvas;
}

interface FittedStar {
  x: number;
  y: number;
  size: number;
}

/* 星座贴合已点亮的星：两个最远的星座节点对齐两颗真实亮星，其余亮星就近吸附到节点上 */
function fitConstellation(
  constellation: Constellation,
  lit: Array<{ x: number; y: number }>,
  width: number,
  height: number,
): { points: FittedStar[]; center: { x: number; y: number } } {
  const points: FittedStar[] = constellation.points.map((point) => ({
    x: point.x * width,
    y: point.y * height,
    size: point.size,
  }));
  const centroid = points.reduce(
    (sum, point) => ({ x: sum.x + point.x / points.length, y: sum.y + point.y / points.length }),
    { x: 0, y: 0 },
  );
  if (lit.length === 0) return { points, center: centroid };

  let anchorA = 0;
  let anchorB = 1;
  let anchorSpan = 0;
  for (let i = 0; i < points.length; i += 1) {
    for (let j = i + 1; j < points.length; j += 1) {
      const span = Math.hypot(points[j].x - points[i].x, points[j].y - points[i].y);
      if (span > anchorSpan) {
        anchorSpan = span;
        anchorA = i;
        anchorB = j;
      }
    }
  }

  if (lit.length === 1) {
    const star = lit[0];
    const principal = points.reduce((best, point) =>
      point.size > best.size ? point : best,
    );
    const shiftX = star.x - principal.x;
    const shiftY = star.y - principal.y;
    return {
      points: points.map((point) => ({
        ...point,
        x: point.x + shiftX,
        y: point.y + shiftY,
      })),
      center: { x: centroid.x + shiftX, y: centroid.y + shiftY },
    };
  }

  /* 选距离最接近星座跨度的两颗亮星，避免星座被缩成一团或撑满整张图 */
  let litA = 0;
  let litB = 1;
  let litGap = Infinity;
  for (let i = 0; i < lit.length; i += 1) {
    for (let j = i + 1; j < lit.length; j += 1) {
      const span = Math.hypot(lit[j].x - lit[i].x, lit[j].y - lit[i].y);
      const gap = Math.abs(span - anchorSpan);
      if (gap < litGap) {
        litGap = gap;
        litA = i;
        litB = j;
      }
    }
  }

  const span = Math.hypot(
    lit[litB].x - lit[litA].x,
    lit[litB].y - lit[litA].y,
  );
  const scale = Math.min(2.2, Math.max(0.35, span / (anchorSpan || 1)));
  const rotation =
    Math.atan2(lit[litB].y - lit[litA].y, lit[litB].x - lit[litA].x) -
    Math.atan2(
      points[anchorB].y - points[anchorA].y,
      points[anchorB].x - points[anchorA].x,
    );
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const midX = (points[anchorA].x + points[anchorB].x) / 2;
  const midY = (points[anchorA].y + points[anchorB].y) / 2;
  const litMidX = (lit[litA].x + lit[litB].x) / 2;
  const litMidY = (lit[litA].y + lit[litB].y) / 2;
  const fitted = points.map((point) => {
    const dx = (point.x - midX) * scale;
    const dy = (point.y - midY) * scale;
    return {
      x: litMidX + dx * cos - dy * sin,
      y: litMidY + dx * sin + dy * cos,
      size: point.size,
    };
  });

  const snapRadius = Math.max(26, Math.min(width, height) * 0.085);
  const taken = new Set<number>([anchorA, anchorB]);
  lit.forEach((star, index) => {
    if (index === litA || index === litB) return;
    let target = -1;
    let closest = snapRadius;
    fitted.forEach((point, pointIndex) => {
      if (taken.has(pointIndex)) return;
      const distance = Math.hypot(point.x - star.x, point.y - star.y);
      if (distance < closest) {
        closest = distance;
        target = pointIndex;
      }
    });
    if (target >= 0) {
      fitted[target] = { ...fitted[target], x: star.x, y: star.y };
      taken.add(target);
    }
  });

  return {
    points: fitted,
    center: fitted.reduce(
      (sum, point) => ({
        x: sum.x + point.x / fitted.length,
        y: sum.y + point.y / fitted.length,
      }),
      { x: 0, y: 0 },
    ),
  };
}

/* 星座轮播层：每张一层透明画布，运行期交叉淡入，不引入外部图片 */
function buildConstellationLayer(
  constellation: Constellation,
  lit: Array<{ x: number; y: number }>,
  width: number,
  height: number,
  dpr: number,
  palette: SkyPalette,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * dpr));
  canvas.height = Math.max(1, Math.round(height * dpr));
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const fitted = fitConstellation(constellation, lit, width, height);

  const wash = ctx.createRadialGradient(
    fitted.center.x,
    fitted.center.y,
    0,
    fitted.center.x,
    fitted.center.y,
    Math.max(width, height) * 0.58,
  );
  wash.addColorStop(0, constellation.wash.color);
  wash.addColorStop(0.58, constellation.wash.color.replace(/[\d.]+\)$/, "0.04)"));
  wash.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = palette.constellationLine;
  ctx.lineWidth = 0.9;
  for (const [from, to] of constellation.lines) {
    const start = fitted.points[from];
    const end = fitted.points[to];
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  }

  for (const point of fitted.points) {
    const glow = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, 11);
    glow.addColorStop(0, palette.constellationGlow[0]);
    glow.addColorStop(0.4, palette.constellationGlow[1]);
    glow.addColorStop(1, palette.constellationGlow[2]);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = palette.constellationCore;
    ctx.beginPath();
    ctx.arc(point.x, point.y, point.size, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = palette.labelRule;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(16, height - 26);
  ctx.lineTo(34, height - 26);
  ctx.stroke();
  ctx.fillStyle = palette.nameLabel;
  ctx.font = `600 10px ${FONT_STACK}`;
  ctx.fillText(constellation.name, 16, height - 13);
  return canvas;
}

export default function StarrySky({
  theme,
  stars,
  echoes,
  todayLit,
  selected,
  onSelect,
  onGoToday,
}: StarrySkyProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [hovered, setHovered] = useState<string | null>(null);
  const selectedRef = useRef<string | null>(selected);
  const hoveredRef = useRef<string | null>(hovered);
  const pulseRef = useRef(0);
  selectedRef.current = selected;
  hoveredRef.current = hovered;

  useEffect(() => {
    pulseRef.current = performance.now();
  }, [selected]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const measure = () => {
      const rect = wrap.getBoundingClientRect();
      setSize({
        width: Math.max(1, Math.round(rect.width)),
        height: Math.max(1, Math.round(rect.height)),
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(wrap);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const points = useMemo<PlotStar[]>(() => {
    if (size.width === 0 || size.height === 0) return [];
    return stars.map((star) => {
      const point = starPoint(star.seed, size.width, size.height);
      return {
        ...star,
        x: point.x,
        y: point.y,
        /* 一天只有一颗星 当天多记几条只让它更亮 记满三条就亮到头 */
        radius: 1.9 + Math.min(star.count, 3) * 0.1,
        brightness: Math.min(1, 0.68 + star.count * 0.107),
      };
    });
  }, [stars, size.width, size.height]);

  function chooseStar(key: string) {
    onSelect(key);
    pulseRef.current = performance.now();
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    let closest: PlotStar | null = null;
    let closestDistance = 22;
    for (const star of points) {
      const distance = Math.hypot(star.x - x, star.y - y);
      if (distance < closestDistance) {
        closest = star;
        closestDistance = distance;
      }
    }
    setHovered(closest?.key ?? null);
    event.currentTarget.style.cursor = closest ? "pointer" : "default";
  }

  function handlePointerLeave() {
    setHovered(null);
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    let closest: PlotStar | null = null;
    let closestDistance = 26;
    for (const star of points) {
      const distance = Math.hypot(star.x - x, star.y - y);
      if (distance < closestDistance) {
        closest = star;
        closestDistance = distance;
      }
    }
    if (closest) chooseStar(closest.key);
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.width === 0 || size.height === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = size.width;
    const height = size.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const palette = PALETTES[theme];
    const background = buildBackground(width, height, dpr, palette);
    const constellationTotal = CONSTELLATIONS.length;
    let activeIndex = -1;
    let activeLayer: HTMLCanvasElement | null = null;
    let upcomingIndex = 0;
    let upcomingLayer: HTMLCanvasElement | null = null;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const startedAt = performance.now();
    pulseRef.current = startedAt;

    const ambientCount = Math.max(
      80,
      Math.min(220, Math.round((width * height) / 4600)),
    );
    const ambient = Array.from({ length: ambientCount }, (_, index) => {
      const seed = Math.sin(index * 127.1 + width) * 43758.5453;
      const fraction = seed - Math.floor(seed);
      const seedTwo = Math.sin(index * 311.7 + height) * 24634.6345;
      const fractionTwo = seedTwo - Math.floor(seedTwo);
      return {
        x: fraction * width,
        y: fractionTwo * height,
        radius: 0.4 + fractionTwo * 1.1,
        phase: fraction * Math.PI * 2,
        speed: 900 + fractionTwo * 1600,
      };
    });

    let meteor: MeteorPath | null = null;
    let meteorEcho: EchoPick | null = null;
    let echoCursor = 0;
    let nextMeteorAt = startedAt + 1400;
    let shower: MeteorPath[] = [];
    let nextShowerAt = startedAt + 11000 + Math.random() * 5000;
    let frame = 0;

    /* 流星统一从右上角出发，直线匀速下落；远近决定大小、明暗与速度 */
    const spawnMeteor = (now: number) => {
      const from = { x: width * 1.02, y: -height * 0.04 };
      const to = { x: width * 0.36, y: height * 0.66 };
      meteor = {
        startAt: now,
        duration: 2600 + Math.random() * 400,
        from,
        to,
        tailScale: 0.9,
        lineWidth: 1.5,
        brightness: 0.9,
      };
      meteorEcho =
        echoes.length > 0 ? echoes[echoCursor % echoes.length] : null;
      echoCursor += 1;
    };

    const showerTargets: Array<[number, number]> = [
      [0.58, 0.5],
      [0.3, 0.72],
      [0.05, 0.9],
      [0.66, 0.58],
      [0.2, 0.8],
      [0.46, 0.64],
      [0.1, 0.86],
    ];

    const spawnShower = (now: number) => {
      const depths = [0.58, 0.92, 0.7, 1, 0.62, 0.84, 0.74];
      shower = depths.map((depth, index) => {
        const from = {
          x: width * (0.972 + index * 0.006),
          y: -height * (0.075 - index * 0.008),
        };
        const to = {
          x: width * showerTargets[index][0],
          y: height * showerTargets[index][1],
        };
        const distance = Math.hypot(to.x - from.x, to.y - from.y);
        const speed = Math.min(width, height) * (0.3 + depth * 0.34);
        return {
          startAt: now + index * 620 + Math.random() * 60,
          duration: (distance / speed) * 1000,
          from,
          to,
          tailScale: 0.32 + depth * 0.46,
          lineWidth: 0.6 + depth * 1.4,
          brightness: 0.26 + depth * 0.68,
        };
      });
      nextShowerAt = now + 28000 + Math.random() * 8000;
      nextMeteorAt = now + 7000 + Math.random() * 3000;
    };

    const drawMeteor = (
      now: number,
      path: MeteorPath,
      caption: EchoPick | null,
    ) => {
      const progress = (now - path.startAt) / path.duration;
      if (progress <= 0 || progress >= 1) return;
      const eased = smoothstep(0, 0.05, progress);
      const fadeOut = 1 - smoothstep(0.78, 1, progress);
      const alpha = eased * fadeOut * path.brightness;
      if (alpha <= 0.01) return;
      const headX = path.from.x + (path.to.x - path.from.x) * progress;
      const headY = path.from.y + (path.to.y - path.from.y) * progress;
      const dx = path.to.x - path.from.x;
      const dy = path.to.y - path.from.y;
      const length = Math.hypot(dx, dy) || 1;
      const unitX = dx / length;
      const unitY = dy / length;
      const tailLength = Math.min(width, height) * 0.34 * path.tailScale;
      const tailX = headX - unitX * tailLength;
      const tailY = headY - unitY * tailLength;

      ctx.save();
      const trail = ctx.createLinearGradient(tailX, tailY, headX, headY);
      trail.addColorStop(0, palette.meteorTrail[0]);
      trail.addColorStop(0.55, palette.meteorTrail[1]);
      trail.addColorStop(0.86, palette.meteorTrail[2]);
      trail.addColorStop(1, palette.meteorTrail[3]);
      ctx.lineCap = "round";

      ctx.globalAlpha = alpha * 0.24;
      ctx.strokeStyle = trail;
      ctx.lineWidth = path.lineWidth * 3.4;
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(headX, headY);
      ctx.stroke();

      ctx.globalAlpha = alpha;
      ctx.lineWidth = path.lineWidth;
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(headX, headY);
      ctx.stroke();

      if (caption) {
        const glowRadius = 12 + path.brightness * 7;
        const glow = ctx.createRadialGradient(
          headX,
          headY,
          0,
          headX,
          headY,
          glowRadius,
        );
        glow.addColorStop(0, palette.meteorGlow[0]);
        glow.addColorStop(0.3, palette.meteorGlow[1]);
        glow.addColorStop(0.68, palette.meteorGlow[2]);
        glow.addColorStop(1, palette.meteorGlow[3]);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(headX, headY, glowRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = palette.meteorHead;
        ctx.beginPath();
        ctx.arc(headX, headY, 1.7 + path.brightness * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!caption) {
        ctx.restore();
        return;
      }

      /* 文字只在流星经过中段时亮一下，不全程跟随，避免左右乱跳 */
      const captionFade =
        smoothstep(0.36, 0.46, progress) *
        (1 - smoothstep(0.56, 0.66, progress));
      if (captionFade <= 0.01) {
        ctx.restore();
        return;
      }

      /* 卡片定宽，标题与引文各占一行并截断，回声再多也不会把版面撑乱 */
      const plateWidth = Math.min(260, Math.max(184, width * 0.6), width - 20);
      const kicker = "回声";
      ctx.font = `600 12px ${FONT_STACK}`;
      const kickerWidth = ctx.measureText(kicker).width;
      const title = clampText(
        ctx,
        caption.experience.title,
        plateWidth - 24 - kickerWidth - 6,
      );
      const rawQuote = caption.quote.trim() || "结果还没写";
      const briefQuote =
        rawQuote.length > 22 ? `${rawQuote.slice(0, 22)}…` : rawQuote;
      ctx.font = `11px ${FONT_STACK}`;
      const summary = clampText(ctx, briefQuote, plateWidth - 24);
      ctx.font = `600 12px ${FONT_STACK}`;
      const plateHeight = 46;
      const midX = (path.from.x + path.to.x) / 2;
      const midY = (path.from.y + path.to.y) / 2;
      const plateX = Math.max(
        10,
        Math.min(width - plateWidth - 10, midX - plateWidth / 2),
      );
      const plateY = Math.max(10, midY - plateHeight - 16);
      ctx.globalAlpha = alpha * captionFade;
      ctx.fillStyle = palette.plateBg;
      roundRect(ctx, plateX, plateY, plateWidth, plateHeight, 9);
      ctx.fill();
      ctx.strokeStyle = palette.plateBorder;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = palette.plateDot;
      ctx.beginPath();
      ctx.arc(plateX + 11, plateY + 15, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = palette.plateKicker;
      ctx.font = `600 12px ${FONT_STACK}`;
      ctx.fillText(kicker, plateX + 18, plateY + 19);
      ctx.fillStyle = palette.plateTitle;
      ctx.fillText(
        `· ${title}`,
        plateX + 18 + kickerWidth + 5,
        plateY + 19,
      );
      ctx.fillStyle = palette.plateQuote;
      ctx.font = `11px ${FONT_STACK}`;
      ctx.fillText(summary, plateX + 12, plateY + 36);
      ctx.restore();
    };

    const render = (now: number) => {
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(background, 0, 0, width, height);

      if (reduced) {
        if (!activeLayer) {
          activeIndex = 0;
          activeLayer = buildConstellationLayer(
            CONSTELLATIONS[0],
            points,
            width,
            height,
            dpr,
            palette,
          );
        }
        ctx.globalAlpha = 0.46;
        ctx.drawImage(activeLayer, 0, 0, width, height);
      } else {
        const per = 6500;
        const fade = 1600;
        const total = per * constellationTotal;
        const elapsed = now - startedAt;
        const local = ((elapsed % total) + total) % total;
        const index = Math.floor(local / per);
        const within = local - index * per;
        if (index !== activeIndex) {
          activeIndex = index;
          activeLayer =
            upcomingLayer && upcomingIndex === index
              ? upcomingLayer
              : buildConstellationLayer(
                  CONSTELLATIONS[index],
                  points,
                  width,
                  height,
                  dpr,
                  palette,
                );
          upcomingIndex = (index + 1) % constellationTotal;
          upcomingLayer = buildConstellationLayer(
            CONSTELLATIONS[upcomingIndex],
            points,
            width,
            height,
            dpr,
            palette,
          );
        }
        const nextShare =
          within > per - fade ? smoothstep(per - fade, per, within) : 0;
        const alpha = 0.62 * smoothstep(0, 800, elapsed);
        if (alpha > 0.001 && activeLayer && upcomingLayer) {
          ctx.globalAlpha = alpha * (1 - nextShare);
          ctx.drawImage(activeLayer, 0, 0, width, height);
          if (nextShare > 0.001) {
            ctx.globalAlpha = alpha * nextShare;
            ctx.drawImage(upcomingLayer, 0, 0, width, height);
          }
        }
      }
      ctx.globalAlpha = 1;

      /* 连线按点亮先后串起来 距离太远就不连 免得横穿画面 */
      for (let index = 1; index < points.length; index += 1) {
        const previous = points[index - 1];
        const current = points[index];
        const distance = Math.hypot(
          current.x - previous.x,
          current.y - previous.y,
        );
        if (distance > Math.min(width, height) * 0.27) continue;
        ctx.strokeStyle = palette.linkLine;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(previous.x, previous.y);
        ctx.lineTo(current.x, current.y);
        ctx.stroke();
      }

      for (const star of ambient) {
        const twinkle = reduced
          ? 0.6
          : 0.45 + 0.55 * Math.sin(now / star.speed + star.phase);
        ctx.fillStyle = `rgba(${palette.ambientRgb}, ${(palette.ambientBase + twinkle * palette.ambientSpan).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      const activeKey = selectedRef.current;
      const hoverKey = hoveredRef.current;
      const pulseAge = now - pulseRef.current;
      points.forEach((star, index) => {
        const color = starColorFor(theme, star.eventType);
        const twinkle = reduced
          ? 1
          : 0.82 + 0.18 * Math.sin(now / 1100 + star.seed * 0.01);
        const radius = star.radius * twinkle;
        const isSelected = star.key === activeKey;
        const isHovered = star.key === hoverKey;
        const isRecent = index >= points.length - 3;
        /* 亮度按平方拉开 一条星与三条星的光晕差要一眼看得见 */
        const lit = star.brightness * star.brightness * twinkle;
        const glowRadius = radius * (6 + star.brightness * 6);

        const glow = ctx.createRadialGradient(
          star.x,
          star.y,
          0,
          star.x,
          star.y,
          glowRadius,
        );
        glow.addColorStop(0, hexToRgba(color, 0.62 * lit));
        glow.addColorStop(0.32, hexToRgba(color, 0.2 * lit));
        glow.addColorStop(1, hexToRgba(color, 0));
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(star.x, star.y, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        if (isSelected || isRecent) {
          ctx.strokeStyle = hexToRgba(color, isSelected ? 0.36 : 0.18);
          ctx.lineWidth = 1;
          const flare = radius * 7;
          ctx.beginPath();
          ctx.moveTo(star.x - flare, star.y);
          ctx.lineTo(star.x + flare, star.y);
          ctx.moveTo(star.x, star.y - flare);
          ctx.lineTo(star.x, star.y + flare);
          ctx.stroke();
        }

        ctx.fillStyle = hexToRgba(color, Math.min(0.98, 0.4 + lit * 0.58));
        ctx.beginPath();
        ctx.arc(star.x, star.y, Math.max(1.3, radius), 0, Math.PI * 2);
        ctx.fill();

        if (isHovered) {
          ctx.strokeStyle = palette.hoverRing;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(star.x, star.y, radius + 6, 0, Math.PI * 2);
          ctx.stroke();
        }
        if (isSelected) {
          ctx.strokeStyle = palette.selectRing;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(star.x, star.y, radius + 8, 0, Math.PI * 2);
          ctx.stroke();
        }
        if (isSelected && pulseAge >= 0 && pulseAge < 1000) {
          const progress = pulseAge / 1000;
          ctx.strokeStyle = `rgba(${palette.pulseRgb}, ${(0.5 * (1 - progress)).toFixed(3)})`;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(star.x, star.y, radius + 8 + progress * 30, 0, Math.PI * 2);
          ctx.stroke();
        }
        if (star.isToday) {
          ctx.fillStyle = palette.todayLabel;
          ctx.font = `9px ${FONT_STACK}`;
          ctx.fillText("今日", star.x + radius + 6, star.y + 3);
        }
      });

      if (stars.length === 0) return;

      if (reduced) {
        if (!meteor) {
          meteor = {
            startAt: startedAt,
            duration: 1,
            from: { x: width * 0.98, y: -height * 0.02 },
            to: { x: width * 0.34, y: height * 0.7 },
            tailScale: 0.9,
            lineWidth: 1.5,
            brightness: 0.9,
          };
        }
        drawMeteor(startedAt + 0.6, meteor, echoes[0] ?? null);
      } else {
        if (shower.length === 0 && !meteor && now >= nextShowerAt) {
          spawnShower(now);
        }
        if (shower.length > 0) {
          shower = shower.filter(
            (item) => now - item.startAt < item.duration,
          );
          for (const item of shower) drawMeteor(now, item, null);
        }

        if (meteor) {
          const progress = (now - meteor.startAt) / meteor.duration;
          if (progress >= 1) {
            meteor = null;
            meteorEcho = null;
            nextMeteorAt = now + 7800 + Math.random() * 4200;
          } else {
            drawMeteor(now, meteor, meteorEcho);
          }
        } else if (shower.length === 0 && now >= nextMeteorAt) {
          spawnMeteor(now);
        }
      }

      if (!reduced) {
        frame = window.requestAnimationFrame(render);
      }
    };

    render(startedAt);
    return () => window.cancelAnimationFrame(frame);
  }, [theme, size.width, size.height, points, echoes]);

  return (
    <div
      ref={wrapRef}
      className="sky-frame relative h-[320px] overflow-hidden rounded-xl border sm:h-[440px] lg:h-[520px]"
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`留痕星图 已点亮 ${stars.length} 天 共 ${stars.reduce(
          (sum, star) => sum + star.count,
          0,
        )} 条留痕${
          echoes[0] ? ` 回声是${echoes[0].experience.title}` : ""
        }`}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onPointerLeave={handlePointerLeave}
        className="absolute inset-0 h-full w-full touch-manipulation"
      />

      <div className="pointer-events-none absolute top-2.5 left-3.5 flex items-center gap-2.5">
        <CompassRose className="sky-rose-mark" />
        <p className="sky-mark-label font-mono text-[10px] tracking-[0.22em]">
          留痕星图
        </p>
      </div>
      {stars.length > 0 && !todayLit && (
        <p className="sky-missing pointer-events-none absolute top-3 right-4 flex items-center gap-1.5 font-mono text-[10px]">
          <span
            aria-hidden="true"
            className="sky-missing-dot h-1 w-1 rounded-full"
          />
          {theme === "dawn" ? "今天还差一颗星" : "今夜还差一颗星"}
        </p>
      )}

      {stars.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <p className="sky-empty-title font-serif text-xl">星空还空着</p>
          <p className="sky-empty-sub mt-1.5 text-[11px] leading-5">
            写下第一条留痕 点亮第一颗星
          </p>
          {onGoToday && (
            <button
              type="button"
              onClick={onGoToday}
              className="sky-empty-btn mt-4 inline-flex min-h-11 items-center justify-center rounded-full border px-5 text-xs transition-colors"
            >
              去今日留痕
            </button>
          )}
        </div>
      )}

      {stars.length > 0 && (
        <p className="sky-hint pointer-events-none absolute right-4 bottom-3 font-mono text-[10px]">
          点一颗星 看那天留下了什么
        </p>
      )}
    </div>
  );
}
