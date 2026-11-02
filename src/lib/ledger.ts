import dayjs, { type Dayjs } from "dayjs";
import {
  DAY_LABELS,
  GREEN_EVENT_TYPES,
  LEDGER_EVENT_TYPES,
  type Experience,
  type LedgerEvent,
  type LedgerEventType,
  type Note,
  type Profile,
} from "../types";

export const DAY_CUTOFF_HOUR = 4;

export type GreenLevel = 0 | 1 | 2 | 3;

export function studyDate(now: Dayjs = dayjs()): Dayjs {
  const local = now.hour() < DAY_CUTOFF_HOUR ? now.subtract(1, "day") : now;
  return local.startOf("day");
}

export function studyDateKey(now: Dayjs = dayjs()): string {
  return studyDate(now).format("YYYY-MM-DD");
}

export function previousStudyDateKey(now: Dayjs = dayjs()): string {
  return studyDate(now).subtract(1, "day").format("YYYY-MM-DD");
}

export function isGreenEvent(event: LedgerEvent): boolean {
  if (event.revokedAt) return false;
  return (GREEN_EVENT_TYPES as readonly string[]).includes(event.type);
}

export function liveEvents(events: LedgerEvent[]): LedgerEvent[] {
  return events.filter((event) => !event.revokedAt);
}

export function greenUnitsForDay(
  events: LedgerEvent[],
  dateKey: string,
): number {
  const units = new Set<string>();
  for (const event of events) {
    if (event.date !== dateKey || !isGreenEvent(event)) continue;
    units.add(event.type === "note_added" ? "note_added" : event.id);
  }
  return units.size;
}

export function greenLevelForDay(
  events: LedgerEvent[],
  dateKey: string,
): GreenLevel {
  return Math.min(greenUnitsForDay(events, dateKey), 3) as GreenLevel;
}

export interface GreenCell {
  dateKey: string;
  weekday: number;
  label: string;
  level: GreenLevel;
  isToday: boolean;
  isFuture: boolean;
}

export function weekGreenCells(
  events: LedgerEvent[],
  now: Dayjs = dayjs(),
): GreenCell[] {
  const today = studyDate(now);
  const todayKey = today.format("YYYY-MM-DD");
  const monday = today.subtract((today.day() + 6) % 7, "day");
  return Array.from({ length: 7 }, (_, index) => {
    const date = monday.add(index, "day");
    const dateKey = date.format("YYYY-MM-DD");
    return {
      dateKey,
      weekday: index + 1,
      label: DAY_LABELS[index],
      level: greenLevelForDay(events, dateKey),
      isToday: dateKey === todayKey,
      isFuture: date.isAfter(today, "day"),
    };
  });
}

export interface GreenMatrixDay {
  dateKey: string;
  level: GreenLevel;
  isToday: boolean;
  isFuture: boolean;
}

export interface GreenMatrixWeek {
  key: string;
  days: GreenMatrixDay[];
  monthLabel: string | null;
}

export interface GreenMatrix {
  weeks: GreenMatrixWeek[];
  activeDays: number;
  startKey: string;
  endKey: string;
}

export function greenMatrix(
  events: LedgerEvent[],
  now: Dayjs = dayjs(),
  weekCount = 16,
): GreenMatrix {
  const today = studyDate(now);
  const todayKey = today.format("YYYY-MM-DD");
  const monday = today.subtract((today.day() + 6) % 7, "day");
  const start = monday.subtract(weekCount - 1, "week");
  let activeDays = 0;

  const weeks = Array.from({ length: weekCount }, (_, weekIndex) => {
    const weekStart = start.add(weekIndex, "week");
    let monthLabel =
      weekIndex === 0 ? `${weekStart.month() + 1}月` : null;
    const days = Array.from({ length: 7 }, (_, dayIndex) => {
      const date = weekStart.add(dayIndex, "day");
      const dateKey = date.format("YYYY-MM-DD");
      const level = greenLevelForDay(events, dateKey);
      if (level > 0) activeDays += 1;
      if (weekIndex > 0 && date.date() === 1) {
        monthLabel = `${date.month() + 1}月`;
      }
      return {
        dateKey,
        level,
        isToday: dateKey === todayKey,
        isFuture: date.isAfter(today, "day"),
      };
    });
    return { key: weekStart.format("YYYY-MM-DD"), days, monthLabel };
  });

  return {
    weeks,
    activeDays,
    startKey: start.format("YYYY-MM-DD"),
    endKey: todayKey,
  };
}

export function weekGreenDayCount(
  events: LedgerEvent[],
  now: Dayjs = dayjs(),
): number {
  return weekGreenCells(events, now).filter((cell) => cell.level > 0).length;
}

export function weekRangeLabel(now: Dayjs = dayjs()): string {
  const today = studyDate(now);
  const monday = today.subtract((today.day() + 6) % 7, "day");
  const sunday = monday.add(6, "day");
  return `${monday.format("M月D日")} – ${sunday.format("M月D日")}`;
}

export interface StreakInfo {
  days: number;
  includesToday: boolean;
}

export function streakInfo(
  events: LedgerEvent[],
  now: Dayjs = dayjs(),
): StreakInfo {
  const today = studyDate(now);
  const active = new Set(
    events.filter(isGreenEvent).map((event) => event.date),
  );
  const includesToday = active.has(today.format("YYYY-MM-DD"));
  let cursor = includesToday ? today : today.subtract(1, "day");
  let days = 0;
  while (active.has(cursor.format("YYYY-MM-DD"))) {
    days += 1;
    cursor = cursor.subtract(1, "day");
  }
  return { days, includesToday };
}

export function countByType(
  events: LedgerEvent[],
  dateKey?: string,
): Record<LedgerEventType, number> {
  const counts = Object.fromEntries(
    LEDGER_EVENT_TYPES.map((type) => [type, 0]),
  ) as Record<LedgerEventType, number>;
  for (const event of events) {
    if (event.revokedAt) continue;
    if (dateKey && event.date !== dateKey) continue;
    counts[event.type] += 1;
  }
  return counts;
}

export interface DaySettlement {
  dateKey: string;
  events: LedgerEvent[];
  greenUnits: number;
  counts: Record<LedgerEventType, number>;
  empty: boolean;
}

export function settleDay(
  events: LedgerEvent[],
  dateKey: string,
): DaySettlement {
  const dayEvents = events
    .filter((event) => event.date === dateKey)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const counts = countByType(dayEvents);
  return {
    dateKey,
    events: dayEvents,
    greenUnits: greenUnitsForDay(events, dateKey),
    counts,
    empty: liveEvents(dayEvents).length === 0,
  };
}

export interface ReadinessItem {
  key: "basics" | "breadth" | "evidence" | "direction";
  label: string;
  weight: number;
  earned: number;
  hint: string;
}

export interface Readiness {
  score: number;
  label: string;
  next: string;
  items: ReadinessItem[];
}

export function computeReadiness(
  profile: Profile | null,
  experiences: Experience[],
): Readiness {
  const basics = profile
    ? profile.major.trim()
      ? profile.grade
        ? 20
        : 15
      : profile.grade
        ? 12
        : 0
    : 0;
  const breadth = Math.min(experiences.length / 3, 1) * 30;
  const withEvidence = experiences.filter(
    (experience) => experience.evidence.length > 0,
  ).length;
  const evidence = experiences.length
    ? (withEvidence / experiences.length) * 30
    : 0;
  const skills = profile
    ? Math.min(profile.skills.length / 3, 1) * 10
    : 0;
  const direction = profile && profile.targetRoles.length > 0 ? 10 : 0;

  const items: ReadinessItem[] = [
    {
      key: "basics",
      label: "基本信息",
      weight: 20,
      earned: basics,
      hint: "补上专业，情报会按你的方向筛。",
    },
    {
      key: "breadth",
      label: "战绩数量",
      weight: 30,
      earned: breadth,
      hint:
        experiences.length >= 3
          ? "已经有 3 条以上战绩。"
          : `再写 ${3 - experiences.length} 条战绩，征途才有厚度。`,
    },
    {
      key: "evidence",
      label: "证据覆盖",
      weight: 30,
      earned: evidence,
      hint:
        experiences.length === 0
          ? "先写下第一条战绩。"
          : withEvidence === experiences.length
            ? "每条战绩都有证据。"
            : `还有 ${experiences.length - withEvidence} 条战绩没有证据。`,
    },
    {
      key: "direction",
      label: "方向与技能",
      weight: 20,
      earned: skills + direction,
      hint:
        profile && profile.targetRoles.length > 0
          ? "方向已写，技能可以慢慢补到 3 个。"
          : "写下 3 个技能和 1 个目标岗位。",
    },
  ];

  const score = Math.round(
    items.reduce((sum, item) => sum + item.earned, 0),
  );
  const label =
    score >= 80
      ? "可以出征"
      : score >= 50
        ? "还差几块"
        : score > 0
          ? "正在成形"
          : "从今天开始";
  const next =
    items.find((item) => item.earned < item.weight)?.hint ??
    "档案已经能出征，去征召看看。";

  return { score, label, next, items };
}

export interface ArchiveStats {
  experiences: number;
  evidence: number;
  notes: number;
  activeDays: number;
}

export function archiveStats(
  experiences: Experience[],
  notes: Note[],
  ledger: LedgerEvent[],
): ArchiveStats {
  return {
    experiences: experiences.length,
    evidence: experiences.reduce(
      (sum, experience) => sum + experience.evidence.length,
      0,
    ),
    notes: notes.length,
    activeDays: new Set(
      ledger.filter(isGreenEvent).map((event) => event.date),
    ).size,
  };
}
