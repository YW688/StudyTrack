import dayjs, { type Dayjs } from "dayjs";
import type { Experience, LedgerEvent } from "../types";
import { fourPartCount, resumeReadiness } from "./experience";
import { greenUnitsForDay, studyDate } from "./ledger";

/** 一条战绩升到下一级要过的格子：四段式 4 + 证据或量化 1 + 置信确认 1。 */
export const LEVEL_UNIT_TOTAL = 6;

function readinessUnits(experience: Experience): number {
  const hasProof =
    experience.evidence.length > 0 || experience.metrics.length > 0;
  return (
    fourPartCount(experience) +
    (hasProof ? 1 : 0) +
    (experience.confidence === "high" ? 1 : 0)
  );
}

export interface NextLevelTarget {
  experience: Experience;
  units: number;
}

/** 下一级只说一件事：四段式 → 证据 → 确认，按缺口的先后顺序给动词开头的下一步。 */
function levelGap(experience: Experience): string {
  const parts = fourPartCount(experience);
  if (parts < 4) return `再写 ${4 - parts} 段四段式`;
  if (experience.evidence.length === 0 && experience.metrics.length === 0) {
    return "补一条证据或量化数据";
  }
  return "确认一次低置信内容";
}

/** 最接近就绪的那条战绩就是「下一级」的目标；全就绪时返回 null。 */
function nextLevelTarget(items: Experience[]): NextLevelTarget | null {
  const candidates = items
    .filter((item) => !resumeReadiness(item).ready)
    .map((experience) => ({
      experience,
      units: readinessUnits(experience),
    }));
  if (candidates.length === 0) return null;
  return candidates.sort(
    (a, b) =>
      b.units - a.units ||
      b.experience.createdAt.localeCompare(a.experience.createdAt),
  )[0];
}

export interface CharacterLevel {
  level: number;
  ready: number;
  total: number;
  nextUnits: number;
  percent: number;
  next: NextLevelTarget | null;
}

/** 等级 = 能放进简历的战绩数 + 1；进度条 = 最接近就绪那条还差几格。 */
export function characterLevel(items: Experience[]): CharacterLevel {
  const ready = items.filter((item) => resumeReadiness(item).ready).length;
  const next = nextLevelTarget(items);
  const nextUnits =
    items.length === 0 ? 0 : next ? next.units : LEVEL_UNIT_TOTAL;
  return {
    level: ready + 1,
    ready,
    total: items.length,
    nextUnits,
    percent: Math.round((nextUnits / LEVEL_UNIT_TOTAL) * 100),
    next,
  };
}

export function levelUpLine(level: CharacterLevel): string {
  if (level.total === 0) return "写下第一条战绩，等级从那一刻开始";
  if (!level.next) {
    return `${level.ready} 条战绩全部就绪，去征召接委托`;
  }
  return `下一级：「${level.next.experience.title}」${levelGap(level.next.experience)}`;
}

export interface WeekCompare {
  thisWeek: number;
  lastWeek: number;
  delta: number;
  elapsed: number;
}

/** 与自己比：本周已有的绿格天数，对比上周同样星期数。 */
export function weekOverWeek(
  events: LedgerEvent[],
  now: Dayjs = dayjs(),
): WeekCompare {
  const today = studyDate(now);
  const monday = today.subtract((today.day() + 6) % 7, "day");
  const elapsed = today.diff(monday, "day") + 1;
  const count = (offset: number) => {
    let green = 0;
    for (let index = 0; index < elapsed; index += 1) {
      const key = monday
        .add(offset + index, "day")
        .format("YYYY-MM-DD");
      if (greenUnitsForDay(events, key) > 0) green += 1;
    }
    return green;
  };
  const thisWeek = count(0);
  const lastWeek = count(-7);
  return { thisWeek, lastWeek, delta: thisWeek - lastWeek, elapsed };
}

export function weekCompareLine(compare: WeekCompare): string {
  const trend =
    compare.delta > 0
      ? `比上周同期多 ${compare.delta} 天`
      : compare.delta < 0
        ? `比上周同期少 ${-compare.delta} 天`
        : "和上周同期持平";
  return `本周 ${compare.thisWeek}/${compare.elapsed} 天有记录 ${trend}`;
}

const MILESTONES: [number, string][] = [
  [30, "一个月没断"],
  [14, "两周没断"],
  [7, "一周没断"],
  [3, "连上三天"],
];

/** 里程碑只在正好达到的那天提示一次，其余日子只报今天有没有续上。 */
export function comboLine(days: number, includesToday: boolean): string {
  if (days <= 0) return "连击从今天第一条记录开始";
  const status = includesToday ? "今天已接上" : "今天补一条就续上";
  const milestone = MILESTONES.find(([need]) => need === days);
  return milestone
    ? `连击 ${days} 天 ${milestone[1]} ${status}`
    : `连击 ${days} 天 ${status}`;
}

/** 战绩品质：四段式写满几段就是几颗星。 */
export function tierStars(experience: Experience): number {
  return fourPartCount(experience);
}

export function tierLine(experience: Experience): string {
  const stars = tierStars(experience);
  if (resumeReadiness(experience).ready) {
    return `品质 ${stars}/4 已就绪，可进简历`;
  }
  return `品质 ${stars}/4 ${levelGap(experience)}`;
}
