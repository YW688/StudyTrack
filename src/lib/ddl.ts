import dayjs, { type Dayjs } from "dayjs";
import type { Assignment } from "../types";

export type DdlTier = "overdue" | "urgent" | "soon" | "later" | "none";

export function ddlTier(due: string | null, now: Dayjs = dayjs()): DdlTier {
  if (!due) return "none";
  const target = dayjs(due);
  if (!target.isValid()) return "none";
  if (target.isBefore(now)) return "overdue";
  const hours = target.diff(now, "hour", true);
  if (hours <= 24) return "urgent";
  if (hours <= 72) return "soon";
  return "later";
}

export function formatDue(due: string | null): string {
  if (!due) return "未设截止";
  const target = dayjs(due);
  if (!target.isValid()) return "未设截止";
  return target.year() === dayjs().year()
    ? target.format("M月D日 HH:mm")
    : target.format("YYYY年M月D日");
}

export function formatDueFull(due: string | null): string {
  if (!due) return "未设截止时间";
  const target = dayjs(due);
  return target.isValid() ? target.format("YYYY年M月D日 HH:mm") : "未设截止时间";
}

export function dueTimestamp(due: string | null): number {
  if (!due) return Number.POSITIVE_INFINITY;
  const target = dayjs(due).valueOf();
  return Number.isNaN(target) ? Number.POSITIVE_INFINITY : target;
}

export function sortAssignments(items: Assignment[]): Assignment[] {
  return [...items].sort((a, b) => {
    const aDone = a.status === "done";
    const bDone = b.status === "done";
    if (aDone !== bDone) return aDone ? 1 : -1;
    const aDue = dueTimestamp(a.due);
    const bDue = dueTimestamp(b.due);
    if (aDue !== bDue) return aDue - bDue;
    return a.createdAt.localeCompare(b.createdAt);
  });
}

export function mondayOf(now: Dayjs = dayjs()): Dayjs {
  return now.startOf("day").subtract((now.day() + 6) % 7, "day");
}

export interface WeeklySummary {
  courseCount: number;
  ddlCount: number;
  overdueCount: number;
  start: string;
  end: string;
}

export function weeklySummary(
  items: Assignment[],
  now: Dayjs = dayjs(),
): WeeklySummary {
  const start = mondayOf(now);
  const end = start.add(7, "day");

  const live = items.filter((item) => item.status !== "done" && item.due);
  const inWeek = live.filter((item) => {
    const due = dayjs(item.due);
    return due.isValid() && !due.isBefore(start) && due.isBefore(end);
  });

  const courses = new Set(
    inWeek.map((item) => item.courseName?.trim()).filter(Boolean),
  );
  const overdueCount = live.filter((item) => dayjs(item.due).isBefore(now)).length;

  return {
    courseCount: courses.size,
    ddlCount: inWeek.length,
    overdueCount,
    start: start.format("M月D日"),
    end: end.subtract(1, "day").format("M月D日"),
  };
}
