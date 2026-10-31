import dayjs, { type Dayjs } from "dayjs";
import {
  RESUME_GRADES,
  type CalendarItem,
  type Profile,
} from "../types";

export function calendarItemStart(item: CalendarItem): Dayjs | null {
  const raw = item.deadline ?? item.start;
  if (!raw) return null;
  const date = dayjs(raw);
  return date.isValid() ? date : null;
}

export function calendarItemEnd(item: CalendarItem): Dayjs | null {
  const raw = item.deadline ?? item.end ?? item.start;
  if (!raw) return null;
  const date = dayjs(raw);
  return date.isValid() ? date : null;
}

export function isCalendarItemPast(
  item: CalendarItem,
  now: Dayjs = dayjs(),
): boolean {
  const end = calendarItemEnd(item);
  if (!end) return false;
  return end.endOf("day").isBefore(now);
}

export function isCalendarItemToday(
  item: CalendarItem,
  now: Dayjs = dayjs(),
): boolean {
  const actionDate = calendarItemStart(item);
  if (actionDate && now.isSame(actionDate, "day")) return true;
  if (!item.start) return false;
  const start = dayjs(item.start);
  if (!start.isValid()) return false;
  const end = item.end ? dayjs(item.end) : start;
  return (
    !now.isBefore(start.startOf("day")) && !now.isAfter(end.endOf("day"))
  );
}

export function formatCalendarDate(value: string): string {
  const date = dayjs(value);
  if (!date.isValid()) return value;
  if (/^\d{4}-\d{2}$/.test(value)) {
    return date.year() === dayjs().year()
      ? date.format("M月")
      : date.format("YYYY年M月");
  }
  return date.year() === dayjs().year()
    ? date.format("M月D日")
    : date.format("YYYY年M月D日");
}

export function calendarScheduleValue(item: CalendarItem): number {
  const raw = item.deadline ?? item.start ?? item.end;
  if (!raw) return Number.POSITIVE_INFINITY;
  const value = dayjs(raw).valueOf();
  return Number.isNaN(value) ? Number.POSITIVE_INFINITY : value;
}

export function calendarScheduleLines(item: CalendarItem): string[] {
  const lines: string[] = [];
  if (item.deadline) lines.push(`截止 ${formatCalendarDate(item.deadline)}`);
  if (item.start) {
    const range = item.end
      ? `${formatCalendarDate(item.start)} – ${formatCalendarDate(item.end)}`
      : formatCalendarDate(item.start);
    lines.push(item.deadline ? `活动 ${range}` : range);
  }
  if (lines.length === 0) {
    lines.push(
      item.sourceType === "sample" ? "以本校通知为准" : "官方尚未公布日期",
    );
  }
  return lines;
}

export function calendarTimingLabel(item: CalendarItem): string {
  return calendarScheduleLines(item)[0] ?? "";
}

function profileGradeNumber(profile: Profile | null): number | null {
  if (!profile) return null;
  if (profile.grade === "" || profile.grade === "其他") return 0;
  const index = RESUME_GRADES.indexOf(profile.grade);
  return index >= 0 ? index + 1 : null;
}

export function pickRelevantCalendarItems(
  items: CalendarItem[],
  profile: Profile | null,
  limit = 3,
  now: Dayjs = dayjs(),
): CalendarItem[] {
  const gradeNumber = profileGradeNumber(profile);
  const upcoming = items.filter(
    (item) =>
      calendarItemStart(item) !== null && !isCalendarItemPast(item, now),
  );
  const sorted = [...upcoming].sort(
    (a, b) => calendarScheduleValue(a) - calendarScheduleValue(b),
  );
  const fit = sorted.filter((item) => {
    if (gradeNumber === null || gradeNumber === 0) return true;
    if (item.fitGrades.length === 0) return true;
    return item.fitGrades.includes(gradeNumber);
  });
  const pool = fit.length > 0 ? fit : sorted;
  return pool.slice(0, limit);
}

export function whyRelevant(
  item: CalendarItem,
  profile: Profile | null,
): string {
  const gradeNumber = profileGradeNumber(profile);
  if (item.fitMajors?.length && profile?.major.trim()) {
    const match = item.fitMajors.some(
      (major) =>
        profile.major.includes(major) || major.includes(profile.major),
    );
    if (match) return "与你的专业相关";
  }
  if (gradeNumber === null || gradeNumber === 0) return "全校可关注";
  if (item.fitGrades.includes(gradeNumber)) return `${profile?.grade ?? ""}可关注`;
  if (item.fitGrades.length === 0) return "不限年级";
  return `适合 ${item.fitGrades
    .map((grade) => RESUME_GRADES[grade - 1])
    .filter(Boolean)
    .join(" / ")}`;
}
