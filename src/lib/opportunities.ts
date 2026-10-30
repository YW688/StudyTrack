import type { JobFamily, MatchTier } from "../types";

export const MATCH_TIER_CHIP: Record<MatchTier, string> = {
  high: "border-ink/25 bg-ink/[0.06] text-ink",
  medium: "border-amber/40 bg-amber/[0.08] text-amber-ink",
  low: "border-rule bg-white text-ink/45",
};

export const MATCH_TIER_BAR: Record<MatchTier, string> = {
  high: "bg-ink",
  medium: "bg-amber",
  low: "bg-ink/30",
};

export const JOB_FAMILIES: JobFamily[] = [
  "技术",
  "数据",
  "产品",
  "设计",
  "运营",
  "研究",
  "职能",
];

const GRADE_LABELS = ["大一", "大二", "大三", "大四", "研究生"];

export function gradeNumberFromLabel(label: string): number {
  const index = GRADE_LABELS.indexOf(label.trim());
  return index >= 0 ? index + 1 : 0;
}

export function gradeLabelFromNumber(value: number): string {
  return GRADE_LABELS[value - 1] ?? "";
}

function compressRuns(values: number[]): { start: number; end: number }[] {
  const runs: { start: number; end: number }[] = [];
  for (const value of values) {
    const last = runs[runs.length - 1];
    if (last && value === last.end + 1) {
      last.end = value;
    } else {
      runs.push({ start: value, end: value });
    }
  }
  return runs;
}

export function formatGradeFit(fit: number[]): string {
  const values = [...new Set(fit)]
    .filter((value) => value >= 1 && value <= 5)
    .sort((a, b) => a - b);
  if (values.length === 0) return "不限年级";
  if (values.length === 5) return "全年级";
  return compressRuns(values)
    .map((run) => {
      const start = gradeLabelFromNumber(run.start);
      const end = gradeLabelFromNumber(run.end);
      return run.start === run.end ? start : `${start}–${end}`;
    })
    .join("、");
}

export function formatMonthRanges(months: number[]): string {
  const values = [...new Set(months)]
    .filter((month) => month >= 1 && month <= 12)
    .sort((a, b) => a - b);
  if (values.length === 0) return "开放时间未标注";
  if (values.length === 12) return "全年开放";
  return compressRuns(values)
    .map((run) =>
      run.start === run.end
        ? `${run.start} 月`
        : `${run.start}–${run.end} 月`,
    )
    .join("、");
}

export function formatCollectedAt(value: string): string {
  return value.replace(/-/g, ".");
}

export function matchTier(score: number): MatchTier {
  if (score >= 75) return "high";
  if (score >= 55) return "medium";
  return "low";
}

const COMPANY_TONES = [
  { bg: "#E7EDF6", text: "#1C3355", border: "#C5D2E5" },
  { bg: "#F5EAE3", text: "#5A3A2B", border: "#E4D0C3" },
  { bg: "#E8EFE8", text: "#2F4A36", border: "#CBDCCB" },
  { bg: "#EEE9F1", text: "#46324F", border: "#D8CEDF" },
  { bg: "#F3EEE2", text: "#4F4128", border: "#E1D6BE" },
  { bg: "#E9EAEC", text: "#333B45", border: "#D2D5DA" },
];

export function companyTone(name: string): (typeof COMPANY_TONES)[number] {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return COMPANY_TONES[hash % COMPANY_TONES.length];
}

export function currentMonth(): number {
  return new Date().getMonth() + 1;
}
