const BLADE_ANGLES = [0, 60, 120, 180, 240, 300];

const OUTER_RING = 20.4;
const INNER_RING = 15.6;
const OPENING = 10.6;

function polar(angle: number, radius: number) {
  const rad = (angle * Math.PI) / 180;
  return [24 + Math.cos(rad) * radius, 24 + Math.sin(rad) * radius] as const;
}

const fmt = (point: readonly number[]) => `${point[0].toFixed(2)} ${point[1].toFixed(2)}`;

const CHORDS = BLADE_ANGLES.map((angle, index) => {
  const next = BLADE_ANGLES[(index + 1) % BLADE_ANGLES.length];
  return `M${fmt(polar(angle, INNER_RING))} L${fmt(polar(next, INNER_RING))}`;
});

const OPENING_PATH = `M${BLADE_ANGLES.map((angle) => fmt(polar(angle, OPENING))).join(" L")} Z`;

/**
 * 晨光描图室的光圈纹章：外圈套准刻度、六叶光圈与中心十字，
 * 只在霞光主题下由 index.css 点亮
 */
export default function ApertureMark({
  size = 32,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      aria-hidden="true"
      className={className}
    >
      <circle cx="24" cy="24" r="23" fill="var(--aperture-face, #fcfdfe)" />
      <circle
        cx="24"
        cy="24"
        r={OUTER_RING}
        fill="none"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeDasharray="0.5 2.6"
        opacity="0.72"
      />
      <circle
        cx="24"
        cy="24"
        r={INNER_RING}
        fill="none"
        stroke="currentColor"
        strokeWidth="0.8"
        opacity="0.8"
      />
      {CHORDS.map((d) => (
        <path
          key={d}
          d={d}
          fill="none"
          stroke="currentColor"
          strokeWidth="0.7"
          opacity="0.42"
        />
      ))}
      <path
        d={OPENING_PATH}
        fill="var(--aperture-accent, #c96f9f)"
        fillOpacity="0.15"
        stroke="var(--aperture-accent, #c96f9f)"
        strokeOpacity="0.75"
        strokeWidth="1"
      />
      <path
        d="M24 1.6v3.4M24 43v3.4M1.6 24h3.4M43 24h3.4"
        stroke="currentColor"
        strokeWidth="0.8"
        opacity="0.5"
      />
      <circle
        cx="24"
        cy="24"
        r="1.15"
        fill="var(--aperture-accent, #c96f9f)"
      />
    </svg>
  );
}
