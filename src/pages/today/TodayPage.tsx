import { useEffect, useState, type ReactNode } from "react";
import dayjs, { type Dayjs } from "dayjs";
import type {
  Assignment,
  AssignmentData,
  Course,
  CourseSession,
  DayOfWeek,
  ExperienceData,
  TimetableData,
} from "../../types";
import { ASSIGNMENT_KIND_LABELS, DAY_LABELS } from "../../types";
import { currentWeekOf, formatWeeksLabel } from "../../parse/schedule";
import {
  EXPERIENCE_KIND_META,
  formatExperienceRange,
  fourPartCount,
  relativeDaysLabel,
  summarizeExperienceActivity,
} from "../../lib/experience";
import {
  ddlTier,
  formatDue,
  formatDueFull,
  mondayOf,
  sortAssignments,
  weeklySummary,
} from "../../lib/ddl";

interface TodayPageProps {
  timetable: TimetableData | null;
  assignments: AssignmentData | null;
  experiences: ExperienceData | null;
  onSaveAssignments: (data: AssignmentData) => Promise<void>;
  onUseSample: () => Promise<void>;
  onNavigate: (id: "timetable" | "assignments" | "experiences") => void;
}

interface DaySession {
  course: Course;
  session: CourseSession;
}

interface NextTeachingDay {
  date: Dayjs;
  week: number;
  sessions: DaySession[];
}

const WEEKDAY_NAMES = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

const PALETTE: Record<string, { bg: string; border: string; text: string }> = {
  blue: { bg: "#E7EDF6", border: "#C5D2E5", text: "#1C3355" },
  clay: { bg: "#F5EAE3", border: "#E4D0C3", text: "#5A3A2B" },
  moss: { bg: "#E8EFE8", border: "#CBDCCB", text: "#2F4A36" },
  plum: { bg: "#EEE9F1", border: "#D8CEDF", text: "#46324F" },
  sand: { bg: "#F3EEE2", border: "#E1D6BE", text: "#4F4128" },
  slate: { bg: "#E9EAEC", border: "#D2D5DA", text: "#333B45" },
};

const TIER_TEXT: Record<string, string> = {
  overdue: "已逾期",
  urgent: "24 小时内",
  soon: "3 天内",
  later: "",
  none: "",
};

const BTN_PRIMARY =
  "bg-ink text-paper inline-flex min-h-11 items-center justify-center rounded-lg px-5 text-sm font-medium disabled:opacity-60";
const BTN_SECONDARY =
  "border-rule hover:bg-ink/[0.03] inline-flex min-h-11 items-center justify-center rounded-lg border bg-white px-4 text-sm disabled:opacity-60";
const BTN_LINK =
  "hover:text-ink inline-flex min-h-11 items-center text-[11px] text-ink/50 underline underline-offset-4 sm:min-h-9";

function dayIndexOf(date: Dayjs): number {
  return (date.day() + 6) % 7;
}

function daySessions(
  courses: Course[],
  day: DayOfWeek,
  week: number,
): DaySession[] {
  return courses
    .flatMap((course) =>
      course.sessions
        .filter((session) => session.day === day && session.weeks.includes(week))
        .map((session) => ({ course, session })),
    )
    .sort(
      (a, b) =>
        a.session.startPeriod - b.session.startPeriod ||
        a.session.endPeriod - b.session.endPeriod,
    );
}

function nextTeachingDay(
  timetable: TimetableData,
  from: Dayjs,
): NextTeachingDay | null {
  for (let offset = 1; offset <= 7; offset += 1) {
    const date = from.add(offset, "day");
    const week = currentWeekOf(
      timetable.semester.startDate,
      timetable.semester.totalWeeks,
      date,
    );
    if (week === null) continue;
    const day = (dayIndexOf(date) + 1) as DayOfWeek;
    const sessions = daySessions(timetable.courses, day, week);
    if (sessions.length) return { date, week, sessions };
  }
  return null;
}

function dueLabel(due: string | null): string {
  if (!due) return "未设截止";
  const target = dayjs(due);
  if (!target.isValid()) return "未设截止";

  const today = dayjs();
  if (target.isSame(today, "day")) return `今天 ${target.format("HH:mm")}`;
  if (target.isSame(today.add(1, "day"), "day")) {
    return `明天 ${target.format("HH:mm")}`;
  }
  const diffDays = target.startOf("day").diff(today.startOf("day"), "day");
  if (diffDays > 1 && diffDays < 7) {
    return `${DAY_LABELS[dayIndexOf(target)]} ${target.format("HH:mm")}`;
  }
  return formatDue(due);
}

function tierTextClass(tier: string): string {
  if (tier === "overdue" || tier === "urgent") return "text-red-800";
  if (tier === "soon") return "text-amber";
  if (tier === "none") return "text-ink/40";
  return "text-ink/55";
}

export default function TodayPage({
  timetable,
  assignments,
  experiences,
  onSaveAssignments,
  onUseSample,
  onNavigate,
}: TodayPageProps) {
  const [, setTick] = useState(0);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [sampleError, setSampleError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setInterval(
      () => setTick((value) => value + 1),
      60_000,
    );
    return () => window.clearInterval(timer);
  }, []);

  const now = dayjs();
  const currentWeek = timetable
    ? currentWeekOf(
        timetable.semester.startDate,
        timetable.semester.totalWeeks,
        now,
      )
    : null;
  const todayDay = (dayIndexOf(now) + 1) as DayOfWeek;
  const todaySessions =
    timetable && currentWeek !== null
      ? daySessions(timetable.courses, todayDay, currentWeek)
      : [];
  const next =
    timetable && todaySessions.length === 0
      ? nextTeachingDay(timetable, now)
      : null;

  const items = assignments?.items ?? [];
  const pending = sortAssignments(items).filter(
    (item) => item.status !== "done",
  );
  const summary = weeklySummary(items, now);

  const weekStart = mondayOf(now);
  const nextWeekStart = weekStart.add(7, "day");
  const nextWeekEnd = nextWeekStart.add(7, "day");
  const weekDays = Array.from({ length: 7 }, (_, index) =>
    weekStart.add(index, "day"),
  );
  const weekItems = pending.filter((item) => {
    if (!item.due) return false;
    const due = dayjs(item.due);
    return due.isValid() && !due.isBefore(weekStart) && due.isBefore(nextWeekStart);
  });
  const nextWeekCount = pending.filter((item) => {
    if (!item.due) return false;
    const due = dayjs(item.due);
    return due.isValid() && !due.isBefore(nextWeekStart) && due.isBefore(nextWeekEnd);
  }).length;

  const hasAny = timetable !== null || assignments !== null;

  const courseHint = !timetable
    ? "课表未导入"
    : currentWeek === null
      ? timetable.semester.startDate
        ? "不在学期周次"
        : "缺开学日期"
      : todaySessions.length > 0
        ? `首节 ${todaySessions[0].session.startPeriod}-${todaySessions[0].session.endPeriod} 节`
        : next
          ? `下一课 ${DAY_LABELS[dayIndexOf(next.date)]}`
          : "本周无排课";
  const pendingHint = assignments
    ? pending.length > 0
      ? `${formatDue(pending[0].due)} 最近`
      : "全部完成"
    : "作业未导入";
  const ddlHint = assignments
    ? nextWeekCount > 0
      ? `下周 ${nextWeekCount} 项`
      : summary.ddlCount > 0
        ? "都在本周内"
        : "暂无近期 DDL"
    : "作业未导入";

  async function handleSample() {
    setSeeding(true);
    setSampleError(null);
    try {
      await onUseSample();
    } catch {
      setSampleError("示例数据写入失败，请检查浏览器存储权限后重试。");
    } finally {
      setSeeding(false);
    }
  }

  async function toggleAssignment(item: Assignment) {
    if (!assignments) return;
    const nextData: AssignmentData = {
      ...assignments,
      items: assignments.items.map((current) =>
        current.id === item.id
          ? {
              ...current,
              status: current.status === "done" ? "todo" : "done",
            }
          : current,
      ),
      updatedAt: new Date().toISOString(),
    };
    try {
      await onSaveAssignments(nextData);
      setSaveError(null);
    } catch {
      setSaveError("写入本机失败，请检查浏览器存储权限后重试。");
    }
  }

  return (
    <div className="px-4 pb-10 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <header className="border-rule flex flex-col gap-4 border-b py-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-[10px] tracking-[0.2em] text-ink/40">
              M1 · 今日 / 01
            </p>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1 className="font-serif text-2xl tracking-tight sm:text-3xl">
                今天
              </h1>
              <p className="font-mono text-[11px] tabular-nums text-ink/45">
                {now.format("M月D日")} · {WEEKDAY_NAMES[now.day()]}
                {currentWeek !== null ? ` · 第 ${currentWeek} 周` : ""}
              </p>
            </div>
            <p className="mt-2 text-xs leading-5 text-ink/55">
              {timetable?.semester.name ?? "还没有导入课表"} ·{" "}
              {assignments
                ? `未完成 ${pending.length} 项`
                : "还没有作业数据"}
              {next && ` · 下一课 ${DAY_LABELS[dayIndexOf(next.date)]}`}
            </p>
          </div>

          {hasAny && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onNavigate("timetable")}
                className="border-rule hover:bg-ink/[0.03] inline-flex min-h-11 items-center rounded-lg border px-3 text-xs"
              >
                整周课表
              </button>
              <button
                type="button"
                onClick={() => onNavigate("assignments")}
                className="border-rule hover:bg-ink/[0.03] inline-flex min-h-11 items-center rounded-lg border px-3 text-xs"
              >
                管理作业
              </button>
            </div>
          )}
        </header>

        {!hasAny ? (
          <>
            <section className="border-rule mt-5 rounded-xl border bg-white p-5 sm:p-8">
              <p className="font-mono text-[10px] tracking-[0.16em] text-ink/40">
                本机还没有数据
              </p>
              <h2 className="mt-2 text-lg font-medium tracking-tight">
                先看一眼今天该做什么
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-ink/60">
                用示例课表和三张作业截图的数据，直接体验今日的阅读顺序；
                也可以从空白开始，导入自己的课表与作业。
              </p>

              {sampleError && (
                <p
                  role="alert"
                  className="border-amber/50 bg-amber/[0.06] mt-3 rounded-lg border-l-2 px-3 py-2 text-xs leading-5 text-ink/75"
                >
                  {sampleError}
                </p>
              )}

              <div className="mt-5 grid gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => void handleSample()}
                  disabled={seeding}
                  className={BTN_PRIMARY}
                >
                  {seeding ? "正在准备…" : "用示例体验"}
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate("timetable")}
                  className={BTN_SECONDARY}
                >
                  导入课表
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate("assignments")}
                  className={BTN_SECONDARY}
                >
                  添加作业
                </button>
              </div>

              <p className="mt-4 text-[11px] leading-5 text-ink/40">
                无需注册 · 不采集个人信息 · 示例数据只写入本机浏览器
              </p>
            </section>
            <PageFoot />
          </>
        ) : (
          <>
            <section
              aria-label="今日概览"
              className="border-rule mt-5 grid grid-cols-3 overflow-hidden rounded-xl border bg-white"
            >
              <Stat
                label="今日课程"
                value={timetable ? String(todaySessions.length) : "—"}
                unit={timetable ? "个时段" : "未导入"}
                hint={courseHint}
                divider
              />
              <Stat
                label="未完成"
                value={assignments ? String(pending.length) : "—"}
                unit={assignments ? "项" : "未导入"}
                hint={pendingHint}
                divider
              />
              <Stat
                label="本周 DDL"
                value={assignments ? String(summary.ddlCount) : "—"}
                unit={assignments ? "个" : "未导入"}
                hint={ddlHint}
              />
            </section>

            {saveError && (
              <p
                role="alert"
                className="border-amber/50 bg-amber/[0.06] mt-4 rounded-lg border-l-2 px-3 py-2 text-xs leading-5 text-ink/75"
              >
                {saveError}
              </p>
            )}

            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
              <div className="space-y-4">
                <Panel
                  index="01"
                  title="今日课程"
                  action={
                    <button
                      type="button"
                      onClick={() => onNavigate("timetable")}
                      className={BTN_LINK}
                    >
                      整周课表
                    </button>
                  }
                >
                  <TodayCourses
                    timetable={timetable}
                    currentWeek={currentWeek}
                    sessions={todaySessions}
                    next={next}
                    onTimetable={() => onNavigate("timetable")}
                  />
                </Panel>

                <Panel
                  index="02"
                  title={`未完成作业${assignments ? ` · ${pending.length}` : ""}`}
                  action={
                    <button
                      type="button"
                      onClick={() => onNavigate("assignments")}
                      className={BTN_LINK}
                    >
                      全部作业
                    </button>
                  }
                >
                  {!assignments ? (
                    <EmptyBlock
                      text="还没有作业数据，先把这周的 DDL 收进来。"
                      actionLabel="去添加作业"
                      onAction={() => onNavigate("assignments")}
                    />
                  ) : pending.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-ink/50 sm:px-5">
                      没有未完成的作业。
                    </p>
                  ) : (
                    <>
                      <ul>
                        {pending.slice(0, 5).map((item) => (
                          <PendingRow
                            key={item.id}
                            item={item}
                            onToggle={() => void toggleAssignment(item)}
                          />
                        ))}
                      </ul>
                      {pending.length > 5 && (
                        <div className="border-rule flex items-center justify-between border-t px-4 py-2.5 text-[10px] text-ink/40 sm:px-5">
                          <span>还有 {pending.length - 5} 项未显示</span>
                          <button
                            type="button"
                            onClick={() => onNavigate("assignments")}
                            className="text-ink/55 underline underline-offset-2 hover:text-ink"
                          >
                            去作业页
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </Panel>
              </div>

              <div className="space-y-4">
                <Panel
                  index="03"
                  title="本周 DDL"
                  action={
                    <button
                      type="button"
                      onClick={() => onNavigate("assignments")}
                      className={BTN_LINK}
                    >
                      全部 DDL
                    </button>
                  }
                >
                  <div className="px-4 py-4 sm:px-5">
                    <div className="grid grid-cols-7 gap-1">
                      {weekDays.map((day, index) => {
                        const count = assignments
                          ? pending.filter(
                              (item) =>
                                item.due &&
                                dayjs(item.due).isValid() &&
                                dayjs(item.due).isSame(day, "day"),
                            ).length
                          : 0;
                        const isToday = day.isSame(now, "day");
                        return (
                          <div
                            key={day.format("YYYY-MM-DD")}
                            aria-label={`${DAY_LABELS[index]} ${day.format("M月D日")}，${count} 个 DDL`}
                            className={[
                              "rounded-lg border px-0.5 py-2 text-center",
                              isToday
                                ? "border-amber/50 bg-amber/[0.07]"
                                : index >= 5
                                  ? "border-transparent bg-ink/[0.02]"
                                  : "border-transparent",
                            ].join(" ")}
                          >
                            <p className="font-mono text-[9px] text-ink/40">
                              {DAY_LABELS[index].slice(1)}
                            </p>
                            <p
                              className={[
                                "mt-0.5 font-serif text-sm tabular-nums",
                                isToday ? "text-ink" : "text-ink/70",
                              ].join(" ")}
                            >
                              {day.format("D")}
                            </p>
                            <span
                              aria-hidden="true"
                              className={[
                                "mx-auto mt-1 block h-1.5 w-1.5 rounded-full",
                                count > 0 ? "bg-amber" : "bg-ink/10",
                              ].join(" ")}
                            />
                          </div>
                        );
                      })}
                    </div>

                    <p className="mt-3 font-mono text-[10px] text-ink/40">
                      本周 {summary.ddlCount} 个 DDL
                      {summary.overdueCount > 0 && (
                        <span className="text-red-800">
                          {" "}
                          · {summary.overdueCount} 项已逾期
                        </span>
                      )}
                    </p>

                    {weekItems.length > 0 ? (
                      <ul className="mt-1">
                        {weekItems.slice(0, 3).map((item) => (
                          <li
                            key={item.id}
                            className="border-rule flex items-baseline gap-2 border-t py-2 text-xs first:border-t-0"
                          >
                            <span
                              className={[
                                "w-10 shrink-0 font-mono text-[10px] tabular-nums",
                                tierTextClass(ddlTier(item.due)),
                              ].join(" ")}
                            >
                              {item.due ? dayjs(item.due).format("M/D") : "—"}
                            </span>
                            <span className="truncate text-ink/70">
                              {item.title}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-[11px] leading-5 text-ink/40">
                        本周没有 DDL。
                        {nextWeekCount > 0
                          ? `下周有 ${nextWeekCount} 项，已经按截止时间排在待办里。`
                          : "可以先把下周的作业记下来。"}
                      </p>
                    )}

                    {weekItems.length > 3 && (
                      <p className="mt-1 text-[10px] text-ink/35">
                        本周还有 {weekItems.length - 3} 项。
                      </p>
                    )}
                  </div>
                </Panel>

                <Panel
                  index="04"
                  title="经历"
                  action={
                    <button
                      type="button"
                      onClick={() => onNavigate("experiences")}
                      className={BTN_LINK}
                    >
                      经历库
                    </button>
                  }
                >
                  <TodayExperience
                    data={experiences}
                    onOpen={() => onNavigate("experiences")}
                  />
                </Panel>
              </div>
            </div>

            <PageFoot />
          </>
        )}
      </div>
    </div>
  );
}

function TodayExperience({
  data,
  onOpen,
}: {
  data: ExperienceData | null;
  onOpen: () => void;
}) {
  const items = data?.experiences ?? [];

  if (!items.length) {
    return (
      <div className="px-4 py-4 sm:px-5">
        <p className="text-sm font-medium">还没有记录经历</p>
        <p className="mt-1 text-[11px] leading-5 text-ink/50">
          把最近做完的课程设计、比赛或实习记一条；四段式可以先写一句。
        </p>
        <button
          type="button"
          onClick={onOpen}
          className="mt-1 inline-flex min-h-11 items-center text-xs text-ink/55 underline underline-offset-4 hover:text-ink sm:min-h-9"
        >
          去记第一条 →
        </button>
      </div>
    );
  }

  const activity = summarizeExperienceActivity(items);
  const latest = activity.latest;
  if (!latest) return null;

  const meta = EXPERIENCE_KIND_META[latest.kind];

  return (
    <div className="px-4 py-4 sm:px-5">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium">
          {activity.stale ? "最近没记经历" : "经历在更新"}
        </p>
        <span className="shrink-0 font-mono text-[9px] tabular-nums text-ink/35">
          {activity.total} 条
        </span>
      </div>
      <p className="mt-1 text-[11px] leading-5 text-ink/50">
        {activity.stale
          ? `最近 30 天没有新增经历。距上次记录 ${activity.daysSinceLatest ?? 0} 天，趁还记得，把最近做完的事补一条。`
          : `${relativeDaysLabel(activity.daysSinceLatest)}新增了一条经历。`}
      </p>

      <button
        type="button"
        onClick={onOpen}
        className="border-rule hover:bg-ink/[0.02] mt-3 block w-full rounded-lg border border-dashed px-3 py-2.5 text-left"
      >
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span
            className="rounded-full px-1.5 py-0.5 font-mono text-[9px]"
            style={{ color: meta.color, backgroundColor: meta.pale }}
          >
            {meta.label}
          </span>
          <span className="font-mono text-[9px] text-ink/40">
            {formatExperienceRange(latest.start, latest.end)}
          </span>
          {latest.confidence === "low" && (
            <span className="bg-amber/15 rounded-full px-1.5 py-0.5 font-mono text-[9px] text-amber">
              待确认
            </span>
          )}
        </span>
        <span className="mt-1.5 line-clamp-1 block text-xs font-medium">
          {latest.title}
        </span>
        {latest.org && (
          <span className="mt-0.5 line-clamp-1 block text-[10px] text-ink/40">
            {latest.org}
          </span>
        )}
      </button>

      <div className="mt-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex min-h-11 items-center text-[11px] text-ink/50 underline underline-offset-4 hover:text-ink sm:min-h-9"
        >
          查看时间线
        </button>
        <span className="font-mono text-[9px] tabular-nums text-ink/30">
          四段式 {fourPartCount(latest)}/4
        </span>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  unit,
  hint,
  divider,
}: {
  label: string;
  value: string;
  unit: string;
  hint: string;
  divider?: boolean;
}) {
  return (
    <div
      className={[
        "px-3 py-3 sm:px-5 sm:py-4",
        divider ? "border-rule border-r" : "",
      ].join(" ")}
    >
      <p className="font-mono text-[9px] tracking-[0.12em] text-ink/40">
        {label}
      </p>
      <p className="mt-1 flex flex-wrap items-baseline gap-x-1">
        <span className="font-serif text-2xl leading-none tabular-nums sm:text-3xl">
          {value}
        </span>
        <span className="text-[10px] text-ink/40">{unit}</span>
      </p>
      <p className="mt-1 truncate text-[10px] leading-4 text-ink/35">{hint}</p>
    </div>
  );
}

function Panel({
  index,
  title,
  action,
  children,
}: {
  index: string;
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="border-rule overflow-hidden rounded-xl border bg-white">
      <header className="border-rule flex items-center justify-between gap-3 border-b px-4 py-2 sm:px-5">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[10px] tracking-[0.12em] text-amber">
            {index}
          </span>
          <h2 className="text-sm font-medium">{title}</h2>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

function TodayCourses({
  timetable,
  currentWeek,
  sessions,
  next,
  onTimetable,
}: {
  timetable: TimetableData | null;
  currentWeek: number | null;
  sessions: DaySession[];
  next: NextTeachingDay | null;
  onTimetable: () => void;
}) {
  if (!timetable) {
    return (
      <EmptyBlock
        text="还没有课表，无法判断今天上什么。"
        actionLabel="去导入课表"
        onAction={onTimetable}
      />
    );
  }

  if (currentWeek === null) {
    return (
      <EmptyBlock
        text={
          timetable.semester.startDate
            ? `今天不在课表的周次范围内（共 ${timetable.semester.totalWeeks} 周）。`
            : "课表缺少开学日期，无法定位今天属于第几周。"
        }
        actionLabel="去课表补全"
        onAction={onTimetable}
      />
    );
  }

  if (sessions.length > 0) {
    return (
      <ul className="px-4 py-4 sm:px-5">
        {sessions.map(({ course, session }, index) => {
          const palette = PALETTE[course.color ?? "slate"] ?? PALETTE.slate;
          const meta = [course.location, course.teacher]
            .filter(Boolean)
            .join(" · ");
          return (
            <li
              key={`${course.id}-${index}`}
              className="border-rule flex items-start gap-3 border-t py-3 first:border-t-0 first:pt-0 last:pb-0"
            >
              <div
                className="w-14 shrink-0 rounded-lg border px-1 py-1.5 text-center"
                style={{
                  backgroundColor: palette.bg,
                  borderColor: palette.border,
                  color: palette.text,
                }}
              >
                <p className="font-mono text-[11px] leading-4 tabular-nums">
                  {session.startPeriod}-{session.endPeriod}
                </p>
                <p className="text-[9px] leading-3 opacity-60">节</p>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-5 font-medium">{course.name}</p>
                {meta && (
                  <p className="mt-1 text-[11px] leading-5 text-ink/55">
                    {meta}
                  </p>
                )}
                <p className="mt-0.5 font-mono text-[10px] text-ink/35">
                  {formatWeeksLabel(session.weeks)}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div className="px-4 py-4 sm:px-5">
      <p className="text-sm leading-6 text-ink/60">今天没有课。</p>
      {next ? (
        <div className="border-rule mt-3 rounded-lg border border-dashed px-3 py-3">
          <p className="font-mono text-[10px] tracking-[0.04em] text-ink/40">
            下一上课日 · {DAY_LABELS[dayIndexOf(next.date)]}{" "}
            {next.date.format("M月D日")} · 第 {next.week} 周
          </p>
          <ul className="mt-2 space-y-2">
            {next.sessions.slice(0, 3).map(({ course, session }, index) => (
              <li
                key={`${course.id}-${index}`}
                className="flex items-baseline gap-2 text-xs"
              >
                <span className="w-12 shrink-0 font-mono text-[10px] tabular-nums text-ink/45">
                  {session.startPeriod}-{session.endPeriod} 节
                </span>
                <span className="truncate text-ink/75">{course.name}</span>
                {course.location && (
                  <span className="ml-auto hidden max-w-[45%] truncate text-[10px] text-ink/35 sm:block">
                    {course.location}
                  </span>
                )}
              </li>
            ))}
          </ul>
          {next.sessions.length > 3 && (
            <p className="mt-2 text-[10px] text-ink/35">
              还有 {next.sessions.length - 3} 个时段。
            </p>
          )}
        </div>
      ) : (
        <p className="mt-2 text-[11px] leading-5 text-ink/40">
          接下来一周也没有排课，可切换到其他周查看课表。
        </p>
      )}
    </div>
  );
}

function PendingRow({
  item,
  onToggle,
}: {
  item: Assignment;
  onToggle: () => void;
}) {
  const tier = ddlTier(item.due);
  const meta = [item.courseName, ASSIGNMENT_KIND_LABELS[item.kind]]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="border-rule flex items-start gap-2 border-t px-4 py-3 first:border-t-0 sm:gap-3 sm:px-5">
      <label
        className="flex h-11 w-9 shrink-0 cursor-pointer items-center justify-center"
        title="标记完成"
      >
        <input
          type="checkbox"
          checked={false}
          onChange={onToggle}
          className="h-5 w-5 cursor-pointer accent-ink"
        />
        <span className="sr-only">标记完成：{item.title}</span>
      </label>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="line-clamp-1 text-sm leading-5 font-medium">
            {item.title}
          </p>
          {item.confidence === "low" && (
            <span className="bg-amber/15 rounded-full px-1.5 py-0.5 font-mono text-[9px] text-amber">
              待确认
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[11px] leading-5 text-ink/45">{meta}</p>
      </div>

      <div className="shrink-0 text-right">
        <p
          title={formatDueFull(item.due)}
          className={[
            "font-mono text-[10px] whitespace-nowrap",
            tierTextClass(tier),
          ].join(" ")}
        >
          {dueLabel(item.due)}
        </p>
        {TIER_TEXT[tier] && (
          <p
            className={[
              "font-mono text-[9px] whitespace-nowrap",
              tierTextClass(tier),
            ].join(" ")}
          >
            {TIER_TEXT[tier]}
          </p>
        )}
      </div>
    </li>
  );
}

function EmptyBlock({
  text,
  actionLabel,
  onAction,
}: {
  text: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="px-4 py-4 sm:px-5">
      <p className="text-sm leading-6 text-ink/55">{text}</p>
      <button
        type="button"
        onClick={onAction}
        className="mt-1 inline-flex min-h-11 items-center text-xs text-ink/55 underline underline-offset-4 hover:text-ink"
      >
        {actionLabel} →
      </button>
    </div>
  );
}

function PageFoot() {
  return (
    <p className="mt-6 flex items-center gap-2 text-[11px] text-ink/35">
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-amber" />
      数据只存在你的浏览器 · 提醒只在本机，不会推送
    </p>
  );
}
