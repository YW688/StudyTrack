import dayjs from "dayjs";
import type { SourceCheck } from "../store/sourceChecks";

interface SourceCheckBadgeProps {
  check?: SourceCheck;
  compact?: boolean;
}

function metaFor(check?: SourceCheck): { label: string; tone: string } {
  if (!check) {
    return {
      label: "未核验",
      tone: "border-ink/15 bg-ink/[0.03] text-ink-4",
    };
  }
  if (check.status === "skipped" || check.status === "blocked") {
    return {
      label: "未抓取",
      tone: "border-ink/15 bg-ink/[0.03] text-ink-4",
    };
  }
  if (check.status === "unreachable") {
    return {
      label: "来源未核验",
      tone: "border-amber/40 bg-amber/[0.08] text-amber-ink",
    };
  }
  if (check.mode === "fetch" && check.dateMatched === true) {
    return {
      label: "来源已核验",
      tone: "border-accent/40 bg-accent/[0.08] text-accent-ink",
    };
  }
  if (check.mode === "fetch" && check.dateMatched === false) {
    return {
      label: "日期待复核",
      tone: "border-amber/40 bg-amber/[0.08] text-amber-ink",
    };
  }
  if (check.mode === "fetch") {
    return {
      label: "正文已读取",
      tone: "border-ink/20 bg-ink/[0.05] text-ink-3",
    };
  }
  return {
    label: "来源可访问",
    tone: "border-ink/15 bg-ink/[0.04] text-ink-3",
  };
}

export default function SourceCheckBadge({
  check,
  compact = false,
}: SourceCheckBadgeProps) {
  const meta = metaFor(check);
  const checkedAt = check?.checkedAt
    ? dayjs(check.checkedAt).format("M月D日 HH:mm")
    : null;
  const title = [meta.label, check?.note, checkedAt ? `核验于 ${checkedAt}` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <span
      title={title}
      aria-label={`来源核验：${meta.label}`}
      className={[
        "inline-flex shrink-0 items-center rounded-full border font-mono whitespace-nowrap",
        compact ? "px-1.5 py-0.5 text-micro" : "px-2 py-0.5 text-micro",
        meta.tone,
      ].join(" ")}
    >
      {meta.label}
    </span>
  );
}
