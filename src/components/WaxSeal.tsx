import { useId } from "react";

interface WaxSealProps {
  units: number;
  total: number;
  ready?: boolean;
  size?: number;
  className?: string;
}

/** 从 12 点方向顺时针取 fraction 圆的扇形路径，用作压印比例的遮罩。 */
function wedgePath(fraction: number): string {
  if (fraction >= 1) {
    return "M12 12 m-12 0 a12 12 0 1 0 24 0 a12 12 0 1 0 -24 0";
  }
  const angle = fraction * Math.PI * 2 - Math.PI / 2;
  const x = 12 + 12 * Math.cos(angle);
  const y = 12 + 12 * Math.sin(angle);
  const large = fraction > 0.5 ? 1 : 0;
  return `M12 12 L12 0 A12 12 0 ${large} 1 ${x.toFixed(2)} ${y.toFixed(2)} Z`;
}

/* 手压蜡边：固定的一圈半径扰动，让轮廓不像机器画的圆 */
const LOBE = [
  0.1, 0.55, 0.2, 0.72, 0.15, 0.48, 0.05, 0.62, 0.25, 0.7, 0.05, 0.52, 0.3,
  0.66, 0.12, 0.58,
];

function lobedPath(radius = 9.3): string {
  const steps = LOBE.length;
  const points = LOBE.map((offset, index) => {
    const angle = (index / steps) * Math.PI * 2 - Math.PI / 2;
    const r = radius + offset;
    return [12 + r * Math.cos(angle), 12 + r * Math.sin(angle)] as const;
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

const SEAL_BLOB = lobedPath();

/**
 * 火漆蜡封三态：简历就绪为完整实印，未就绪按四段式 n/total 显示压印比例，
 * 0 段为空心描边。只在庄园主题下显示，显示开关在 index.css。
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
        viewBox="0 0 24 24"
        width={size}
        height={size}
        aria-hidden="true"
        className={className}
      >
        <path
          d={SEAL_BLOB}
          fill="none"
          stroke="var(--manor-gold-line)"
          strokeWidth="0.9"
          strokeDasharray="1.7 2.1"
          opacity="0.8"
        />
        <path
          d="M12 8.6 14.2 12 12 15.4 9.8 12Z"
          fill="none"
          stroke="var(--manor-gold-line)"
          strokeWidth="0.6"
          opacity="0.55"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      className={className}
    >
      <defs>
        <radialGradient id={`${uid}w`} cx="36%" cy="26%" r="84%">
          <stop offset="0%" stopColor="#a84a31" />
          <stop offset="40%" stopColor="#7d281b" />
          <stop offset="100%" stopColor="#4a130d" />
        </radialGradient>
        <clipPath id={`${uid}c`}>
          <path d={SEAL_BLOB} />
        </clipPath>
        <mask id={`${uid}m`} maskUnits="userSpaceOnUse">
          <rect width="24" height="24" fill="black" />
          <path d={wedgePath(fraction)} fill="white" />
        </mask>
      </defs>

      <g clipPath={`url(#${uid}c)`}>
        <g mask={`url(#${uid}m)`}>
          <path d={SEAL_BLOB} fill={`url(#${uid}w)`} />
          <path
            d={SEAL_BLOB}
            fill="none"
            stroke="#3a0f09"
            strokeWidth="0.9"
            opacity="0.85"
          />
          <ellipse
            cx="9.1"
            cy="7.9"
            rx="3.1"
            ry="1.8"
            transform="rotate(-34 9.1 7.9)"
            fill="#ffd9c4"
            opacity="0.22"
          />
          <circle
            cx="12"
            cy="12"
            r="6.2"
            fill="none"
            stroke="#3a0f09"
            strokeWidth="0.55"
            opacity="0.6"
          />
          <path
            d="M12 8.3 14.5 12 12 15.7 9.5 12Z"
            fill="none"
            stroke="#3a0f09"
            strokeWidth="0.85"
            opacity="0.75"
          />
          <path
            d="M12 9.9 13.3 12 12 14.1 10.7 12Z"
            fill="none"
            stroke="#3a0f09"
            strokeWidth="0.5"
            opacity="0.55"
          />
        </g>
      </g>

      <circle cx="13.5" cy="21.5" r="1.15" fill="#5d1b12" />
      <circle cx="11.6" cy="22.5" r="0.62" fill="#571810" opacity="0.9" />
    </svg>
  );
}
