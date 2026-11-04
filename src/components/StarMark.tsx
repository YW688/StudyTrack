import { useId } from "react";

const TICKS = Array.from({ length: 16 }, (_, index) => index * 22.5);

const TIP_ANGLES = [-90, 0, 90, 180];
const TIP_RADIUS = 16.8;
const NECK_RADIUS = 4.38;
const NECK_OFFSET = 46.8;

function polar(angle: number, radius: number) {
  const rad = (angle * Math.PI) / 180;
  return [24 + Math.cos(rad) * radius, 24 + Math.sin(rad) * radius] as const;
}

const fmt = (point: readonly number[]) => `${point[0].toFixed(2)} ${point[1].toFixed(2)}`;

/** 一条光芒：从圆心起，经两道颈口到星尖，四条拼起来就是完整的四角星 */
const RAYS = TIP_ANGLES.map(
  (angle) =>
    `M24 24 L${fmt(polar(angle - NECK_OFFSET, NECK_RADIUS))} L${fmt(
      polar(angle, TIP_RADIUS),
    )} L${fmt(polar(angle + NECK_OFFSET, NECK_RADIUS))} Z`,
);

const clampTier = (tier: number) => Math.max(0, Math.min(4, Math.round(tier)));

/**
 * 观星台的四角星盘纹章：黄铜细圈、十六分度刻度与四条光芒的四角星，
 * 只在夜间主题下由 index.css 点亮
 */
export default function StarMark({
  size = 32,
  className,
  tier = 4,
}: {
  size?: number;
  className?: string;
  tier?: number;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const brass = `url(#${uid}b)`;
  const lit = clampTier(tier);
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      aria-hidden="true"
      className={className}
    >
      <defs>
        <linearGradient
          id={`${uid}b`}
          x1="14"
          y1="8"
          x2="34"
          y2="42"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#edd6a6" />
          <stop offset="0.5" stopColor="#c9a45e" />
          <stop offset="1" stopColor="#937238" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="23" fill="var(--star-face, #101821)" />
      <circle
        cx="24"
        cy="24"
        r="20.4"
        fill="none"
        stroke={brass}
        strokeWidth="0.9"
        opacity="0.9"
      />
      <circle
        cx="24"
        cy="24"
        r="15.6"
        fill="none"
        stroke={brass}
        strokeWidth="0.5"
        opacity="0.42"
      />
      {TICKS.map((angle) => {
        const [x1, y1] = polar(angle, 17.4);
        const [x2, y2] = polar(angle, 19.9);
        return (
          <line
            key={angle}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={brass}
            strokeWidth="0.8"
            opacity={angle % 90 === 0 ? 0.85 : 0.45}
          />
        );
      })}
      {lit >= 3 && (
        <ellipse
          cx="24"
          cy="24"
          rx="19.2"
          ry="7.2"
          transform="rotate(-24 24 24)"
          fill="none"
          stroke={brass}
          strokeWidth="0.7"
          strokeDasharray="1 3.2"
          opacity="0.5"
        />
      )}
      {RAYS.map((d, index) =>
        index < lit ? (
          <path key={`lit-${index}`} d={d} fill={brass} />
        ) : (
          <path
            key={`ghost-${index}`}
            d={d}
            fill="none"
            stroke={brass}
            strokeWidth="0.6"
            strokeDasharray="1.4 1.6"
            opacity="0.34"
          />
        ),
      )}
      {lit > 0 && <circle cx="24" cy="24" r="1.2" fill="#f6ecd8" />}
    </svg>
  );
}
