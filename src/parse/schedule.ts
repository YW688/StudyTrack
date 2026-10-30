import dayjs from "dayjs";
import type { Course, CourseSession, DayOfWeek } from "../types";
import { DAY_LABELS } from "../types";

const FULLWIDTH_DIGITS = /[０-９]/g;

function toHalfWidth(input: string): string {
  return input.replace(FULLWIDTH_DIGITS, (d) =>
    String.fromCharCode(d.charCodeAt(0) - 0xfee0),
  );
}

export function expandWeeksText(input: string): number[] | null {
  if (!input) return null;
  const text = toHalfWidth(input).replace(/\s+/g, "");
  if (!/周/.test(text)) return null;
  if (/单双|全周|每周|不固定/.test(text)) return null;

  const parity = /单/.test(text) ? "odd" : /双/.test(text) ? "even" : null;
  const bodies = [...text.matchAll(/([\d,、\-–~至]+)周/g)].map((m) => m[1]);
  if (!bodies.length) return null;

  const weeks = new Set<number>();
  for (const token of bodies.join(",").split(/[,、]/)) {
    const range = token.match(/^(\d+)(?:[-–~至](\d+))?$/);
    if (!range) continue;
    let start = Number(range[1]);
    let end = range[2] ? Number(range[2]) : start;
    if (start > end) [start, end] = [end, start];
    if (start < 1 || end > 30) continue;
    for (let week = start; week <= end; week += 1) weeks.add(week);
  }

  let result = [...weeks].sort((a, b) => a - b);
  if (parity === "odd") result = result.filter((w) => w % 2 === 1);
  if (parity === "even") result = result.filter((w) => w % 2 === 0);
  return result.length ? result : null;
}

export function formatWeeksLabel(weeks: number[]): string {
  if (!weeks.length) return "周次未知";
  const sorted = [...weeks].sort((a, b) => a - b);
  const isArithmetic =
    sorted.length > 1 &&
    sorted.every((w, i) => i === 0 || w - sorted[i - 1] === 2);

  if (isArithmetic) {
    const parity = sorted[0] % 2 === 1 ? "单" : "双";
    return `${sorted[0]}-${sorted[sorted.length - 1]}周 ${parity}`;
  }

  const runs: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (let i = 1; i <= sorted.length; i += 1) {
    const current = sorted[i];
    if (current === prev + 1) {
      prev = current;
      continue;
    }
    runs.push(start === prev ? `${start}` : `${start}-${prev}`);
    start = current;
    prev = current;
  }
  return `${runs.join(",")}周`;
}

export function parsePeriodRange(text: string): [number, number] | null {
  const match = toHalfWidth(text).match(/(\d+)\s*[-–~至]\s*(\d+)\s*节/);
  if (match) {
    const start = Number(match[1]);
    const end = Number(match[2]);
    if (start >= 1 && end >= start && end <= 20) return [start, end];
    return null;
  }
  const single = toHalfWidth(text).match(/(\d+)\s*节/);
  if (single) {
    const period = Number(single[1]);
    if (period >= 1 && period <= 20) return [period, period];
  }
  return null;
}

export function currentWeekOf(
  startDate: string | undefined,
  totalWeeks: number,
  today = dayjs(),
): number | null {
  if (!startDate) return null;
  const start = dayjs(startDate).startOf("day");
  if (!start.isValid()) return null;
  const diff = today.startOf("day").diff(start, "day");
  if (diff < 0) return null;
  const week = Math.floor(diff / 7) + 1;
  return week >= 1 && week <= totalWeeks ? week : null;
}

export function dateOfDay(
  startDate: string | undefined,
  week: number,
  day: DayOfWeek,
): string | null {
  if (!startDate) return null;
  const start = dayjs(startDate);
  if (!start.isValid()) return null;
  return start.add((week - 1) * 7 + (day - 1), "day").format("MM-DD");
}

export interface WeekConflict {
  day: DayOfWeek;
  startPeriod: number;
  endPeriod: number;
  a: Course;
  b: Course;
}

export function sessionsOverlap(a: CourseSession, b: CourseSession): boolean {
  return (
    a.day === b.day &&
    a.startPeriod <= b.endPeriod &&
    b.startPeriod <= a.endPeriod
  );
}

export function findConflicts(courses: Course[], week?: number): WeekConflict[] {
  const conflicts: WeekConflict[] = [];
  for (let i = 0; i < courses.length; i += 1) {
    for (let j = i + 1; j < courses.length; j += 1) {
      const a = courses[i];
      const b = courses[j];
      for (const sa of a.sessions) {
        for (const sb of b.sessions) {
          if (!sessionsOverlap(sa, sb)) continue;
          const overlaps = sa.weeks.some((w) => sb.weeks.includes(w));
          if (!overlaps) continue;
          if (week !== undefined && !sa.weeks.includes(week)) continue;
          conflicts.push({
            day: sa.day,
            startPeriod: Math.max(sa.startPeriod, sb.startPeriod),
            endPeriod: Math.min(sa.endPeriod, sb.endPeriod),
            a,
            b,
          });
        }
      }
    }
  }
  return conflicts;
}

export function describeSession(session: CourseSession): string {
  return `${DAY_LABELS[session.day - 1]} ${session.startPeriod}-${session.endPeriod}节 · ${formatWeeksLabel(session.weeks)}`;
}
