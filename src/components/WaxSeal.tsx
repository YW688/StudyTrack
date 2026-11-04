import { useId } from "react";

interface WaxSealProps {
  units: number;
  total: number;
  ready?: boolean;
  size?: number;
  className?: string;
}

const CENTER = 24;

/* 手压蜡边：固定的一圈半径扰动，让轮廓不像机器画的圆 */
const RIM = [
  0.9, -0.8, 0.4, 1.2, -0.5, 0.2, -1, 0.7, 0.1, 1, -0.6, 0.3, 1.3, -0.4, 0.6,
  -0.9, 0.2, 0.8, -0.7, 0.5,
];

/* 压印面比蜡边低一层，扰动错开避免同相 */
const FACE = [
  0.5, -0.4, 0.9, -0.2, 0.6, -0.7, 0.3, 0.8, -0.5, 0.4, -0.8, 0.2, 0.7, -0.3,
  0.5, -0.6, 0.9, -0.2, 0.4, -0.7,
];

function lobedPath(radius: number, offsets: number[]): string {
  const steps = offsets.length;
  const points = offsets.map((offset, index) => {
    const angle = (index / steps) * Math.PI * 2 - Math.PI / 2;
    const r = radius + offset;
    return [CENTER + r * Math.cos(angle), CENTER + r * Math.sin(angle)] as const;
  });
  const mid = (a: readonly number[], b: readonly number[]) =>
    `${((a[0] + b[0]) / 2).toFixed(2)} ${((a[1] + b[1]) / 2).toFixed(2)}`;
  let d = `M${mid(points[0], points[1])}`;
  for (let i = 1; i <= steps; i += 1) {
    const point = points[i % steps];
    const next = points[(i + 1) % steps];
    d += ` Q${point[0].toFixed(2)} ${point[1].toFixed(2)} ${mid(point, next)}`;
  }
  return `${d} Z`;
}

function polar(angle: number, r: number) {
  const rad = (angle * Math.PI) / 180;
  return [CENTER + r * Math.cos(rad), CENTER + r * Math.sin(rad)] as const;
}

const fmt = (p: readonly number[]) => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`;

/* 缺口两侧不是干净半径，给几个偏角点，像掰断的蜡 */
const CUT_OUT = [
  [7, 2.5],
  [12.5, -1.8],
  [17.5, 3],
] as const;
const CUT_BACK = [
  [17.5, -2.2],
  [12.5, 2.8],
  [7, -3],
] as const;

function sectorPath(fraction: number): string {
  if (fraction >= 1) {
    return `M${CENTER} ${CENTER} m-27 0 a27 27 0 1 0 54 0 a27 27 0 1 0 -54 0`;
  }
  const a0 = -90;
  const a1 = a0 + fraction * 360;
  const out = CUT_OUT.map(([r, d]) => fmt(polar(a0 + d, r))).join(" L");
  const back = CUT_BACK.map(([r, d]) => fmt(polar(a1 + d, r))).join(" L");
  const large = fraction > 0.5 ? 1 : 0;
  return `M${CENTER} ${CENTER} L${out} L${fmt(polar(a0, 27))} A27 27 0 ${large} 1 ${fmt(polar(a1, 27))} L${back} Z`;
}

/* 断口受光：沿着两条掰开的面，只落在蜡体一侧 */
function cutPaths(fraction: number): string[] {
  if (fraction >= 1) return [];
  const a0 = -90;
  const a1 = a0 + fraction * 360;
  const out = CUT_OUT.map(([r, d]) => fmt(polar(a0 + d, r)));
  const back = CUT_BACK.map(([r, d]) => fmt(polar(a1 + d, r)));
  return [
    `M${out[0]} L${out[1]} L${out[2]} L${fmt(polar(a0, 20.6))}`,
    `M${fmt(polar(a1, 20.6))} L${back[0]} L${back[1]} L${back[2]}`,
  ];
}

const BLOB = lobedPath(19.4, RIM);
const FACE_PATH = lobedPath(14.6, FACE);
const STAR =
  "M24 15.6 26.7 21.3 32.4 24 26.7 26.7 24 32.4 21.3 26.7 15.6 24 21.3 21.3Z";

/**
 * 火漆蜡封三态：简历就绪为完整实印，未就绪按四段式 n/total 掰掉缺角，
 * 0 段只剩金珠环。只在庄园主题下显示，显示开关在 index.css。
 */
export default function WaxSeal({
  units,
  total,
  ready = false,
  size = 22,
  className,
}: WaxSealProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const hollow = !ready && units === 0;
  const fraction = ready ? 1 : total > 0 ? Math.min(units, total) / total : 0;

  if (hollow) {
    return (
      <svg
        viewBox="0 0 48 48"
        width={size}
        height={size}
        aria-hidden="true"
        className={className}
      >
        <circle
          cx={CENTER}
          cy={CENTER}
          r="18.4"
          fill="none"
          stroke="var(--manor-gold-line)"
          strokeWidth="1.3"
          strokeDasharray="0.1 4.15"
          strokeLinecap="round"
          opacity="0.9"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      aria-hidden="true"
      className={className}
    >
      <defs>
        <radialGradient id={`${uid}w`} cx="62%" cy="70%" r="88%">
          <stop offset="0%" stopColor="#a23a27" />
          <stop offset="38%" stopColor="#7c2518" />
          <stop offset="74%" stopColor="#58150d" />
          <stop offset="100%" stopColor="#340a06" />
        </radialGradient>
        <radialGradient id={`${uid}g`} cx="64%" cy="74%" r="62%">
          <stop offset="0%" stopColor="#ffd9c0" stopOpacity="0.32" />
          <stop offset="46%" stopColor="#ffc4a4" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#ffc4a4" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${uid}d`} cx="30%" cy="22%" r="72%">
          <stop offset="0%" stopColor="#240604" stopOpacity="0.48" />
          <stop offset="52%" stopColor="#2b0805" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#2b0805" stopOpacity="0" />
        </radialGradient>
        <clipPath id={`${uid}c`}>
          <path d={BLOB} />
        </clipPath>
        <mask id={`${uid}m`} maskUnits="userSpaceOnUse">
          <rect width="48" height="48" fill="black" />
          <path d={sectorPath(fraction)} fill="white" />
        </mask>
      </defs>

      <g clipPath={`url(#${uid}c)`}>
        <g mask={`url(#${uid}m)`}>
          <path d={BLOB} fill={`url(#${uid}w)`} />
          <path
            d={FACE_PATH}
            fill="#f2b795"
            fillOpacity="0.04"
            stroke="#3a0d07"
            strokeOpacity="0.3"
            strokeWidth="1.3"
          />
          <path d={FACE_PATH} fill={`url(#${uid}d)`} />
          <path d={FACE_PATH} fill={`url(#${uid}g)`} />
          <path
            d="M9.62 21.47 A14.6 14.6 0 0 1 36.64 16.7"
            fill="none"
            stroke="#2a0805"
            strokeOpacity="0.4"
            strokeWidth="1.2"
          />
          <path
            d="M37.72 28.99 A14.6 14.6 0 0 1 12.82 33.38"
            fill="none"
            stroke="#f7c3a6"
            strokeOpacity="0.32"
            strokeWidth="1.1"
          />
          <ellipse
            cx="28.9"
            cy="32.9"
            rx="2.3"
            ry="1.1"
            transform="rotate(-26 28.9 32.9)"
            fill="#ffeadd"
            opacity="0.3"
          />
          <path
            d="M6.52 17.64 A18.6 18.6 0 0 1 28.81 6.03"
            fill="none"
            stroke="#ffd2b6"
            strokeOpacity="0.2"
            strokeWidth="1.2"
          />
          <path
            d="M40.1 33.3 A18.6 18.6 0 0 1 19.2 42"
            fill="none"
            stroke="#ffd2b6"
            strokeOpacity="0.22"
            strokeWidth="1.2"
          />
          {cutPaths(fraction).map((d) => (
            <path
              key={d}
              d={d}
              fill="none"
              stroke="#ef9d7d"
              strokeOpacity="0.45"
              strokeWidth="0.8"
            />
          ))}
          <path
            d={STAR}
            fill="none"
            stroke="#3a0d07"
            strokeOpacity="0.5"
            strokeWidth="1"
            strokeLinejoin="round"
          />
          <path
            d={STAR}
            transform="translate(0.45 0.45)"
            fill="none"
            stroke="#f0b79b"
            strokeOpacity="0.28"
            strokeWidth="0.5"
            strokeLinejoin="round"
          />
          <path
            d={BLOB}
            fill="none"
            stroke="#2b0805"
            strokeOpacity="0.85"
            strokeWidth="0.8"
          />
        </g>
      </g>

      <circle cx="28.6" cy="43.4" r="1.7" fill="#5d1b12" />
      <circle cx="24.4" cy="45.8" r="0.85" fill="#571810" opacity="0.9" />
    </svg>
  );
}
