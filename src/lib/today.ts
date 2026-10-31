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
  return timetable.courses
    .flatMap((course) =>
      course.sessions
        .filter(
          (session) =>
            session.day === weekday && session.weeks.includes(week),
        )
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

export interface JudgmentInput {
  now?: Dayjs;
  profile: Profile | null;
  courses: TodayCourse[];
  pending: Assignment[];
  ledger: LedgerEvent[];
}

export function buildTodayJudgment(input: JudgmentInput): TodayJudgment {
  const now = input.now ?? dayjs();
  const { profile, courses, pending, ledger } = input;

  if (!profile) {
    return {
      line: "先用一分钟，把这学期放上桌。",
      detail: "只问年级、专业和想去哪。每一步都能跳过，之后随时能改。",
    };
  }

  const overdue = pending.filter(
    (assignment) =>
      assignment.due && dayjs(assignment.due).isBefore(now),
  );
  if (overdue.length > 0) {
    return {
      line: `先清掉 ${overdue.length} 个逾期项。`,
      detail: "在今日委托里划掉，完成会记进账本；不用一次清完。",
    };
  }

  const urgent = pending.find(
    (assignment) => ddlTier(assignment.due, now) === "urgent",
  );
  if (urgent) {
    return {
      line: "今天有个截止在等你。",
      detail: `${urgent.title} · ${formatDue(urgent.due)}`,
    };
  }

  if (courses.length > 0) {
    const first = courses[0];
    return {
      line: `今天 ${courses.length} 节课，先上完再说。`,
      detail: `${first.course.name} · 第 ${first.startPeriod}-${first.endPeriod} 节${first.location ? ` · ${first.location}` : ""}`,
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
      line: `昨天留下 ${yesterdayGreen} 条记录，今天别断。`,
      detail: "补一条就够，不必写长；绿格只记产生结果的动作。",
    };
  }

  return {
    line: "今天没有硬性截止，适合补一条战绩。",
    detail: "写下今天推进的一件事，之后写简历时它会派上用场。",
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
    prompts.push(`今天「${courses[0].course.name}」讲了什么？`);
  }
  if (pending[0]) {
    prompts.push(`「${pending[0].title}」推进到哪一步了？`);
  }
  prompts.push("今天最有成就感的一件事");
  prompts.push("遇到的问题和解决办法");
  return [...new Set(prompts)].slice(0, 3);
}
