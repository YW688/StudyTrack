import dayjs, { type Dayjs } from "dayjs";
import type { Experience, ExperienceKind } from "../types";

export const EXPERIENCE_KINDS: ExperienceKind[] = [
  "course",
  "contest",
  "research",
  "intern",
  "design",
  "volunteer",
  "other",
];

export const EXPERIENCE_KIND_META: Record<
  ExperienceKind,
  { label: string; color: string; pale: string; hint: string }
> = {
  course: {
    label: "课程设计",
    color: "#8A5138",
    pale: "#F5EAE3",
    hint: "课程里做出来的项目",
  },
  contest: {
    label: "竞赛",
    color: "#A66B1F",
    pale: "#F6EDDC",
    hint: "学科竞赛与选拔",
  },
  research: {
    label: "科研",
    color: "#2F4E7A",
    pale: "#E7EDF6",
    hint: "课题、大创、实验室",
  },
  intern: {
    label: "实习",
    color: "#2F5A3C",
    pale: "#E8EFE8",
    hint: "公司或组织的实习",
  },
  design: {
    label: "作品",
    color: "#5A3C66",
    pale: "#EEE9F1",
    hint: "设计、写作、开源作品",
  },
  volunteer: {
    label: "志愿",
    color: "#3F4A56",
    pale: "#E9EAEC",
    hint: "志愿服务与社会实践",
  },
  other: {
    label: "其他",
    color: "#6B5B4A",
    pale: "#F1EDE8",
    hint: "不属于以上分类？自己写一个类型名",
  },
};

export function experienceKindLabel(
  kind: ExperienceKind,
  kindLabel?: string,
): string {
  if (kind === "other") {
    return kindLabel?.trim() || EXPERIENCE_KIND_META.other.label;
  }
  return EXPERIENCE_KIND_META[kind].label;
}

const MONTH_RE = /^(\d{4})-(\d{2})$/;

export function normalizeMonth(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const match = value.match(MONTH_RE);
  if (!match) return undefined;
  const month = Number(match[2]);
  return month >= 1 && month <= 12 ? value : undefined;
}

function monthOf(value: string | undefined): string | null {
  if (!value) return null;
  const match = value.match(/^(\d{4})-(\d{2})/);
  if (!match) return null;
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return `${match[1]}-${match[2]}`;
}

export function formatMonth(value: string | undefined): string {
  const month = monthOf(value);
  if (!month) return "";
  const [year, monthText] = month.split("-");
  return `${year}.${monthText}`;
}

export function formatExperienceRange(
  start: string | undefined,
  end: string | undefined,
): string {
  const from = formatMonth(start);
  const to = formatMonth(end);
  if (!from && !to) return "时间未填";
  if (from && !to) return `${from} – 至今`;
  if (!from && to) return `截至 ${to}`;
  return from === to ? from : `${from} – ${to}`;
}

export function sortExperiences(items: Experience[]): Experience[] {
  return [...items].sort((a, b) => {
    const aMonth = monthOf(a.start) ?? monthOf(a.end) ?? "";
    const bMonth = monthOf(b.start) ?? monthOf(b.end) ?? "";
    if (aMonth !== bMonth) {
      if (!aMonth) return 1;
      if (!bMonth) return -1;
      return bMonth.localeCompare(aMonth);
    }
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export type TermSeason = "spring" | "fall";

export interface TermInfo {
  key: string;
  label: string;
  year: number;
  season: TermSeason;
  serial: number;
}

export function termOf(value: string | undefined): TermInfo | null {
  const month = monthOf(value);
  if (!month) return null;
  const [yearText, monthText] = month.split("-");
  const calendarYear = Number(yearText);
  const calendarMonth = Number(monthText);
  const isFall = calendarMonth >= 8 || calendarMonth === 1;
  const termYear = calendarMonth === 1 ? calendarYear - 1 : calendarYear;
  const season: TermSeason = isFall ? "fall" : "spring";
  return {
    key: `${termYear}-${season}`,
    label: `${termYear} ${season === "fall" ? "秋" : "春"}`,
    year: termYear,
    season,
    serial: termYear * 2 + (season === "fall" ? 1 : 0),
  };
}

export function termStartMonth(term: TermInfo): string {
  return `${term.year}-${term.season === "fall" ? "09" : "03"}`;
}

export interface ExperienceTermGroup {
  term: TermInfo;
  items: Experience[];
}

export function groupExperiencesByTerm(items: Experience[]): {
  groups: ExperienceTermGroup[];
  undated: Experience[];
} {
  const groups = new Map<string, ExperienceTermGroup>();
  const undated: Experience[] = [];

  for (const item of sortExperiences(items)) {
    const term = termOf(item.start) ?? termOf(item.end);
    if (!term) {
      undated.push(item);
      continue;
    }
    const existing = groups.get(term.key);
    if (existing) {
      existing.items.push(item);
    } else {
      groups.set(term.key, { term, items: [item] });
    }
  }

  const ordered = [...groups.values()].sort(
    (a, b) => b.term.serial - a.term.serial,
  );
  return { groups: ordered, undated };
}

export interface TermAxisCell {
  term: TermInfo;
  count: number;
}

export function buildTermAxis(
  items: Experience[],
  now: Dayjs = dayjs(),
  maxTerms = 12,
): TermAxisCell[] {
  const current = termOf(now.format("YYYY-MM"));
  if (!current) return [];

  const dated = items
    .map((item) => termOf(item.start) ?? termOf(item.end))
    .filter((term): term is TermInfo => term !== null);
  if (!dated.length) return [];

  const counts = new Map<string, number>();
  for (const term of dated) {
    counts.set(term.key, (counts.get(term.key) ?? 0) + 1);
  }

  const latest = Math.max(current.serial, ...dated.map((term) => term.serial));
  const earliest = Math.min(...dated.map((term) => term.serial));
  const start = Math.max(earliest, latest - (maxTerms - 1));

  const cells: TermAxisCell[] = [];
  for (let serial = latest; serial >= start; serial -= 1) {
    const year = Math.floor(serial / 2);
    const season: TermSeason = serial % 2 === 1 ? "fall" : "spring";
    const term: TermInfo = {
      key: `${year}-${season}`,
      label: `${year} ${season === "fall" ? "秋" : "春"}`,
      year,
      season,
      serial,
    };
    cells.push({ term, count: counts.get(term.key) ?? 0 });
  }
  return cells;
}

export function fourPartCount(experience: Experience): number {
  return [
    experience.problem,
    experience.method,
    experience.contribution,
    experience.result,
  ].filter((part) => part.trim().length > 0).length;
}

export interface ExperienceActivitySummary {
  total: number;
  latest: Experience | null;
  daysSinceLatest: number | null;
  stale: boolean;
}

export function summarizeExperienceActivity(
  items: Experience[],
  now: Dayjs = dayjs(),
): ExperienceActivitySummary {
  const latest =
    [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
  if (!latest) {
    return { total: items.length, latest: null, daysSinceLatest: null, stale: false };
  }
  const created = dayjs(latest.createdAt);
  const daysSince = created.isValid()
    ? Math.max(0, now.startOf("day").diff(created.startOf("day"), "day"))
    : null;
  return {
    total: items.length,
    latest,
    daysSinceLatest: daysSince,
    stale: daysSince !== null && daysSince >= 30,
  };
}

export function relativeDaysLabel(days: number | null): string {
  if (days === null) return "时间未知";
  if (days <= 0) return "今天";
  if (days === 1) return "昨天";
  return `${days} 天前`;
}

export function isSafeHttpUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function splitLabels(input: string): string[] {
  return [
    ...new Set(
      input
        .split(/[,，、;；\n]/)
        .map((part) => part.trim())
        .filter(Boolean),
    ),
  ];
}
