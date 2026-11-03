import dayjs, { type Dayjs } from "dayjs";
import {
  type Assignment,
  type Course,
  type DayOfWeek,
  type Experience,
  type LedgerEvent,
  type Profile,
  type TimetableData,
} from "../types";
import { ddlTier, formatDue, sortAssignments } from "./ddl";
import {
  isGreenEvent,
  previousStudyDateKey,
} from "./ledger";

export function weekdayOf(now: Dayjs = dayjs()): DayOfWeek {
  return (now.day() === 0 ? 7 : now.day()) as DayOfWeek;
}

export interface TodayCourse {
  course: Course;
  startPeriod: number;
  endPeriod: number;
  location?: string;
}

export function coursesOnDay(
  timetable: TimetableData | null,
  week: number | null,
  weekday: DayOfWeek,
): TodayCourse[] {
  if (!timetable || week === null) return [];
  return collectCourses(
    timetable,
    (session) => session.day === weekday && session.weeks.includes(week),
  );
}

/** 开学日期缺失时 退化为按星期列出 周次不参与筛选 */
export function coursesOnWeekday(
  timetable: TimetableData | null,
  weekday: DayOfWeek,
): TodayCourse[] {
  if (!timetable) return [];
  return collectCourses(timetable, (session) => session.day === weekday);
}

function collectCourses(
  timetable: TimetableData,
  match: (session: Course["sessions"][number]) => boolean,
): TodayCourse[] {
  return timetable.courses
    .flatMap((course) =>
      course.sessions
        .filter(match)
        .map((session) => ({
          course,
          startPeriod: session.startPeriod,
          endPeriod: session.endPeriod,
          location: course.location,
        })),
    )
    .sort((a, b) => a.startPeriod - b.startPeriod);
}

export function pendingAssignments(
  assignments: Assignment[] | null,
): Assignment[] {
  if (!assignments) return [];
  return sortAssignments(
    assignments.filter((assignment) => assignment.status !== "done"),
  );
}

export interface TodayJudgment {
  line: string;
  detail: string;
}

export type BriefingSegment = "晨间简报" | "午间简报" | "夜间简报";

export function briefingSegment(now: Dayjs = dayjs()): BriefingSegment {
  const hour = now.hour();
  if (hour >= 5 && hour < 11) return "晨间简报";
  if (hour >= 11 && hour < 17) return "午间简报";
  return "夜间简报";
}

export function briefingAside(input: {
  intel: { title: string; timing: string } | null;
  readyCount: number;
  pendingCount: number;
}): string | null {
  if (input.intel) {
    return `${input.intel.title} ${input.intel.timing}`;
  }
  if (input.pendingCount === 0 && input.readyCount > 0) {
    return `就绪战绩 ${input.readyCount} 条 去征召看匹配`;
  }
  return null;
}

export interface JudgmentInput {
  now?: Dayjs;
  profile: Profile | null;
  courses: TodayCourse[];
  pending: Assignment[];
  ledger: LedgerEvent[];
  weekUnknown?: boolean;
}

export function buildTodayJudgment(input: JudgmentInput): TodayJudgment {
  const now = input.now ?? dayjs();
  const { profile, courses, pending, ledger } = input;

  if (!profile) {
    return {
      line: "先用一分钟把这学期放上桌",
      detail: "只问年级专业和想去哪，每一步都能跳过",
    };
  }

  const overdue = pending.filter(
    (assignment) =>
      assignment.due && dayjs(assignment.due).isBefore(now),
  );
  if (overdue.length > 0) {
    return {
      line: `先清掉 ${overdue.length} 个逾期项`,
      detail: "",
    };
  }

  const urgent = pending.find(
    (assignment) => ddlTier(assignment.due, now) === "urgent",
  );
  if (urgent) {
    return {
      line: "今天有个截止在等你",
      detail: `${urgent.title} ${formatDue(urgent.due)}`,
    };
  }

  if (input.weekUnknown) {
    return {
      line: "先给课表补个开学日期",
      detail: "",
    };
  }

  if (courses.length > 0) {
    const first = courses[0];
    return {
      line: `今天 ${courses.length} 节课，先上完再说`,
      detail: first.location ? `地点 ${first.location}` : "",
    };
  }

  const yesterdayKey = previousStudyDateKey(now);
  const yesterdayGreen = new Set(
    ledger
      .filter(
        (event) =>
          event.date === yesterdayKey && isGreenEvent(event),
      )
      .map((event) => (event.type === "note_added" ? "note_added" : event.id)),
  ).size;
  if (yesterdayGreen > 0) {
    return {
      line: `昨天留下 ${yesterdayGreen} 条记录，今天别断`,
      detail: "",
    };
  }

  return {
    line: "今天没有硬性截止，适合补一条战绩",
    detail: "",
  };
}

export interface EchoPick {
  experience: Experience;
  daysAgo: number;
  label: string;
  quote: string;
}

export function pickEcho(
  experiences: Experience[],
  now: Dayjs = dayjs(),
): EchoPick | null {
  if (experiences.length === 0) return null;

  const candidates = experiences
    .map((experience) => {
      const created = dayjs(experience.createdAt);
      const daysAgo = created.isValid()
        ? Math.max(0, now.startOf("day").diff(created.startOf("day"), "day"))
        : 0;
      return { experience, daysAgo };
    })
    .sort((a, b) => a.daysAgo - b.daysAgo);

  const older = candidates.filter((candidate) => candidate.daysAgo >= 1);
  const picked = older[0] ?? candidates[0];
  const quote =
    picked.experience.result.trim() ||
    picked.experience.contribution.trim() ||
    picked.experience.method.trim();

  return {
    experience: picked.experience,
    daysAgo: picked.daysAgo,
    label: echoLabel(picked.daysAgo),
    quote,
  };
}

function echoLabel(daysAgo: number): string {
  if (daysAgo <= 0) return "今天写下的";
  if (daysAgo === 1) return "昨天写下的";
  if (daysAgo < 7) return `${daysAgo} 天前写下的`;
  if (daysAgo < 30) return "这个月写下的";
  if (daysAgo < 365) return `${Math.max(1, Math.round(daysAgo / 30))} 个月前写下的`;
  return `${Math.max(1, Math.round(daysAgo / 365))} 年前写下的`;
}

export function buildCapturePrompts(
  courses: TodayCourse[],
  pending: Assignment[],
): string[] {
  const prompts: string[] = [];
  if (courses[0]) {
    prompts.push(`今天「${courses[0].course.name}」讲了什么`);
  }
  if (pending[0]) {
    prompts.push(`「${pending[0].title}」推进到哪一步了`);
  }
  prompts.push("今天最有成就感的一件事");
  prompts.push("遇到的问题和解决办法");
  return [...new Set(prompts)].slice(0, 3);
}
