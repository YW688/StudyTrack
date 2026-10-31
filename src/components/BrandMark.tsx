interface BrandMarkProps {
  className?: string;
  size?: number;
}

export default function BrandMark({
  className = "",
  size,
}: BrandMarkProps) {
  return (
    <svg
      viewBox="0 0 256 256"
      width={size}
      height={size}
      className={`brand-mark ${className}`.trim()}
      aria-hidden="true"
      focusable="false"
    >
      <rect className="brand-mark__tile" width="256" height="256" rx="56" />
      <path
        className="brand-mark__star"
        d="M196 46C199 59 205 65 218 68C205 71 199 77 196 90C193 77 187 71 174 68C187 65 193 59 196 46Z"
      />
      <path
        className="brand-mark__ink"
        d="M52 178L196 172C188 188 168 200 142 200H90C68 200 56 190 52 178Z"
      />
      <path className="brand-mark__mast" d="M122 175V96" />
      <path
        className="brand-mark__ink"
        d="M127 102C151 112 172 136 179 168H127Z"
      />
      <g className="brand-mark__waves">
        <path
          className="brand-mark__wave brand-mark__wave--left"
          d="M42 212C58 204 76 220 94 211"
        />
        <path
          className="brand-mark__wave brand-mark__wave--right"
          d="M156 212C174 204 192 220 212 211"
        />
      </g>
    </svg>
  );
}
