import ApertureMark from "./ApertureMark";
import StarMark from "./StarMark";
import WaxSeal from "./WaxSeal";

export default function TierPips({
  units,
  total,
  label,
}: {
  units: number;
  total: number;
  label: string;
}) {
  return (
    <span role="img" aria-label={label} className="flex shrink-0 items-center gap-1">
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          aria-hidden="true"
          className={[
            "tier-pip inline-block h-1.5 w-1.5 rotate-45 border",
            index < units ? "border-accent/50 bg-accent" : "border-ink/15",
          ].join(" ")}
        />
      ))}
      <ApertureMark className="tier-aperture" size={20} tier={units} />
      <StarMark className="tier-star" size={16} tier={units} />
      <WaxSeal units={units} total={total} className="tier-seal" />
    </span>
  );
}
