/* 罗盘花：八个尖长短相间，刻纹式细线；颜色跟随所在主题 */
const ROSE = Array.from({ length: 16 }, (_, index) => {
  const angle = (index / 16) * Math.PI * 2 - Math.PI / 2;
  const radius = index % 4 === 0 ? 12.6 : index % 4 === 2 ? 8.4 : 4.4;
  return `${(20 + radius * Math.cos(angle)).toFixed(2)} ${(
    20 +
    radius * Math.sin(angle)
  ).toFixed(2)}`;
}).join(" L");

export default function CompassRose({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 40 40"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="0.7"
    >
      <circle cx="20" cy="20" r="17.6" opacity="0.32" strokeWidth="0.6" />
      <circle cx="20" cy="20" r="13.9" opacity="0.24" strokeWidth="0.5" />
      <path d={`M${ROSE}Z`} opacity="0.55" strokeLinejoin="round" />
      <circle
        cx="20"
        cy="20"
        r="1.1"
        fill="currentColor"
        stroke="none"
        opacity="0.55"
      />
    </svg>
  );
}
