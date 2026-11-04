import { useId } from "react";

const TICKS = Array.from({ length: 16 }, (_, index) => index * 22.5);

const STAR =
  "M24 7.2 27 20.8 40.8 24 27 27.2 24 40.8 21 27.2 7.2 24 21 20.8Z";

function polar(angle: number, radius: number) {
  const rad = (angle * Math.PI) / 180;
  return [24 + Math.cos(rad) * radius, 24 + Math.sin(rad) * radius] as const;
}

/**
 * 观星台的四角星盘纹章：黄铜细圈、十六分度刻度与四条光芒的四角星，
 * 只在夜间主题下由 index.css 点亮
 */
export default function StarMark({
  size = 32,
  className,
}: {
  size?: number;
  className?: string;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const brass = `url(#${uid}b)`;
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
      <path d={STAR} fill={brass} />
      <circle cx="24" cy="24" r="1.2" fill="#f6ecd8" />
    </svg>
  );
}
