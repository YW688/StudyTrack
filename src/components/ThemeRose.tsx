/** 晨光描图室的量角器纹章：半圆刻度、直尺底线与中心套准十字，只在霞光主题下点亮 */
export function DraftingRose({ className }: { className?: string }) {
  const cx = 20;
  const cy = 23.4;
  const radius = 14.4;
  const point = (angle: number, r: number) => {
    const rad = (angle * Math.PI) / 180;
    return `${(cx + Math.cos(rad) * r).toFixed(2)} ${(cy - Math.sin(rad) * r).toFixed(2)}`;
  };
  const ticks = Array.from({ length: 13 }, (_, index) => index * 15);

  return (
    <svg
      className={className}
      viewBox="0 0 40 40"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="0.7"
    >
      <circle cx="20" cy="20" r="18" opacity="0.26" strokeWidth="0.6" />
      <path d={`M${point(180, radius)} A${radius} ${radius} 0 0 1 ${point(0, radius)}`} opacity="0.6" />
      {ticks.map((angle) => {
        const major = angle % 45 === 0;
        return (
          <line
            key={angle}
            x1={Number(point(angle, major ? 10.4 : 12).split(" ")[0])}
            y1={Number(point(angle, major ? 10.4 : 12).split(" ")[1])}
            x2={Number(point(angle, radius).split(" ")[0])}
            y2={Number(point(angle, radius).split(" ")[1])}
            strokeWidth={major ? 0.85 : 0.55}
            opacity={major ? 0.72 : 0.42}
          />
        );
      })}
      <path d="M4.4 23.4h31.2" opacity="0.55" />
      <path d="M20 20v6.8M16.6 23.4h6.8" stroke="var(--drafting-accent, currentColor)" strokeWidth="0.85" opacity="0.8" />
      <path d="M12.6 30.6h14.8" opacity="0.3" strokeWidth="0.55" />
    </svg>
  );
}

const STAR_POINTS = [
  [11.6, 17.2],
  [18.4, 11.4],
  [27.2, 15.6],
  [23.4, 26.4],
] as const;

function sparkle(x: number, y: number, r: number) {
  return `M${x} ${y - r}L${x + r * 0.3} ${y - r * 0.3}L${x + r} ${y}L${x + r * 0.3} ${y + r * 0.3}L${x} ${y + r}L${x - r * 0.3} ${y + r * 0.3}L${x - r} ${y}L${x - r * 0.3} ${y - r * 0.3}Z`;
}

/** 观星台的星座纹章：黄铜子午环、十六分度刻度与四颗连线的星，只在夜间主题下点亮 */
export function ObservatoryRose({ className }: { className?: string }) {
  const ticks = Array.from({ length: 16 }, (_, index) => index * 22.5);
  const point = (angle: number, r: number) => {
    const rad = (angle * Math.PI) / 180;
    return [20 + Math.cos(rad) * r, 20 + Math.sin(rad) * r] as const;
  };

  return (
    <svg
      className={className}
      viewBox="0 0 40 40"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="0.7"
    >
      <circle cx="20" cy="20" r="18" opacity="0.34" strokeWidth="0.6" />
      <circle cx="20" cy="20" r="13.6" opacity="0.2" strokeWidth="0.5" />
      {ticks.map((angle) => {
        const major = angle % 90 === 0;
        const [x1, y1] = point(angle, major ? 15.2 : 16.4);
        const [x2, y2] = point(angle, 17.9);
        return (
          <line key={angle} x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={major ? 0.85 : 0.5} opacity={major ? 0.7 : 0.36} />
        );
      })}
      <path
        d={`M${STAR_POINTS.map((p) => `${p[0]} ${p[1]}`).join("L")}Z`}
        strokeWidth="0.55"
        opacity="0.45"
      />
      <path d="M18.4 11.4L23.4 26.4" strokeWidth="0.5" opacity="0.3" />
      {STAR_POINTS.map(([x, y]) => (
        <path key={`${x}-${y}`} d={sparkle(x, y, 2.5)} fill="currentColor" stroke="none" opacity="0.82" />
      ))}
    </svg>
  );
}
