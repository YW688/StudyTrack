const BLADE_ANGLES = [0, 60, 120, 180, 240, 300];

const OUTER_RING = 20.4;
const BARREL_RING = 15.6;

function polar(angle: number, radius: number) {
  const rad = (angle * Math.PI) / 180;
  return [24 + Math.cos(rad) * radius, 24 + Math.sin(rad) * radius] as const;
}

const fmt = (point: readonly number[]) => `${point[0].toFixed(2)} ${point[1].toFixed(2)}`;

/**
 * 四档残缺：镜头筒与套准刻度始终不变，只有六叶光圈按品质收拢。
 * blades 是叶尖所在半径，opening 是通光孔半径，rotation 是收拢时叶片转向，
 * light 是通光孔里的进光量。0 档叶尖在圆心合拢，只剩一圈暗缝。
 */
const IRIS_BY_TIER = [
  { blades: 9.4, opening: 0, rotation: 26, light: 0 },
  { blades: 10.8, opening: 2.7, rotation: 19, light: 0.09 },
  { blades: 12.4, opening: 5.3, rotation: 13, light: 0.12 },
  { blades: 14.1, opening: 8.1, rotation: 6, light: 0.15 },
  { blades: BARREL_RING, opening: 10.6, rotation: 0, light: 0.18 },
] as const;

const clampTier = (tier: number) => Math.max(0, Math.min(4, Math.round(tier)));

/**
 * 晨光描图室的光圈纹章：外圈套准刻度、六叶光圈与中心十字，
 * 只在霞光主题下由 index.css 点亮
 */
export default function ApertureMark({
  size = 32,
  className,
  tier = 4,
}: {
  size?: number;
  className?: string;
  tier?: number;
}) {
  const iris = IRIS_BY_TIER[clampTier(tier)];
  const tips = BLADE_ANGLES.map((angle) =>
    polar(angle + iris.rotation, iris.blades),
  );
  const opening = BLADE_ANGLES.map((angle) =>
    polar(angle + iris.rotation, iris.opening),
  );

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
        r={BARREL_RING}
        fill="none"
        stroke="currentColor"
        strokeWidth="0.8"
        opacity="0.8"
      />
      {tips.map((tip, index) => (
        <path
          key={`blade-${index}`}
          d={`M${fmt(tip)} L${fmt(tips[(index + 1) % tips.length])}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="0.7"
          opacity="0.42"
        />
      ))}
      {tips.map((tip, index) => (
        <path
          key={`edge-${index}`}
          d={`M${fmt(tip)} L${fmt(opening[(index + 1) % opening.length])}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="0.6"
          opacity="0.5"
        />
      ))}
      {iris.opening > 0 && (
        <path
          d={`M${opening.map(fmt).join(" L")} Z`}
          fill="var(--aperture-accent, #c96f9f)"
          fillOpacity={iris.light}
          stroke="var(--aperture-accent, #c96f9f)"
          strokeOpacity={0.45 + iris.light}
          strokeWidth="1"
        />
      )}
      <path
        d="M24 1.6v3.4M24 43v3.4M1.6 24h3.4M43 24h3.4"
        stroke="currentColor"
        strokeWidth="0.8"
        opacity="0.5"
      />
      {iris.opening > 0 && (
        <circle
          cx="24"
          cy="24"
          r="1.15"
          fill="var(--aperture-accent, #c96f9f)"
        />
      )}
    </svg>
  );
}
