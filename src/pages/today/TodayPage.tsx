import { useEffect, useRef, useState, type FormEvent } from "react";
import dayjs, { type Dayjs } from "dayjs";
import type {
  Assignment,
  AssignmentData,
  CalendarCategory,
  CalendarItem,
  ExperienceData,
  LedgerEvent,
  Note,
  Profile,
  TimetableData,
} from "../../types";
import {
  ASSIGNMENT_KIND_LABELS,
  CALENDAR_CATEGORY_LABELS,
  DAY_LABELS,
  GOAL_LABELS,
} from "../../types";
import TierPips from "../../components/TierPips";
import WaxSeal from "../../components/WaxSeal";
import ApertureMark from "../../components/ApertureMark";
import StarMark from "../../components/StarMark";
import { currentWeekOf } from "../../parse/schedule";
import {
  EXPERIENCE_KIND_META,
  experienceKindLabel,
  formatExperienceRange,
} from "../../lib/experience";
import { ddlTier, formatDue, formatDueFull } from "../../lib/ddl";
import {
  briefingAside,
  briefingSegment,
  buildCapturePrompts,
  buildTodayJudgment,
  coursesOnDay,
  coursesOnWeekday,
  pickEcho,
  pendingAssignments,
  weekdayOf,
} from "../../lib/today";
import {
  calendarTimingLabel,
  pickRelevantCalendarItems,
  whyRelevant,
} from "../../lib/calendar";
import {
  characterLevel,
  comboLine,
  levelUpLine,
  tierLine,
  tierStars,
  weekCompareLine,
  weekOverWeek,
} from "../../lib/level";
import {
  computeReadiness,
  previousStudyDateKey,
  settleDay,
  streakInfo,
  studyDateKey,
} from "../../lib/ledger";
import { CALENDAR_ISSUE, CALENDAR_ITEMS } from "../../store/calendar";

interface TodayPageProps {
  timetable: TimetableData | null;
  assignments: AssignmentData | null;
  experiences: ExperienceData | null;
  profile: Profile | null;
  ledger: LedgerEvent[];
  notes: Note[];
  unlockedHint: boolean;
  onDismissUnlockHint: () => void;
  onToggleAssignment: (item: Assignment) => Promise<void>;
  onAddNote: (text: string, tags?: string[]) => Promise<void>;
  onCaptureSaved?: () => void;
  demoMode: boolean;
  onExitDemo: () => void;
  onOpenWindow: (
    id:
      | "timetable"
      | "assignments"
      | "experiences"
      | "resume"
      | "opportunities"
      | "calendar",
  ) => void;
}

const TIER_TEXT: Record<string, string> = {
  overdue: "已逾期",
  urgent: "24 小时内",
  soon: "3 天内",
  later: "",
  none: "",
};

const BTN_SECONDARY =
  "app-pill inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm";

const CATEGORY_CHIP: Record<CalendarCategory, string> = {
  contest: "bg-accent/10 text-accent-ink",
  exam: "bg-amber/15 text-amber-ink",
  campus: "bg-ink/[0.06] text-ink-3",
};

function dayIndexOf(date: Dayjs): number {
  return (date.day() + 6) % 7;
}

function dueLabel(due: string | null, now: Dayjs): string {
  if (!due) return "未设截止";
  const target = dayjs(due);
  if (!target.isValid()) return "未设截止";
  if (target.isSame(now, "day")) return `今天 ${target.format("HH:mm")}`;
  if (target.isSame(now.add(1, "day"), "day")) {
    return `明天 ${target.format("HH:mm")}`;
  }
  const diffDays = target.startOf("day").diff(now.startOf("day"), "day");
  if (diffDays > 1 && diffDays < 7) {
    return `${DAY_LABELS[dayIndexOf(target)]} ${target.format("HH:mm")}`;
  }
  return formatDue(due);
}

function tierTextClass(tier: string): string {
  if (tier === "overdue" || tier === "urgent") return "text-red-800";
  if (tier === "soon") return "text-amber-ink";
  return "text-ink-3";
}

export default function TodayPage({
  timetable,
  assignments,
  experiences,
  profile,
  ledger,
  notes,
  unlockedHint,
  onDismissUnlockHint,
  onToggleAssignment,
  onAddNote,
  onCaptureSaved,
  demoMode,
  onExitDemo,
  onOpenWindow,
}: TodayPageProps) {
  const [, setTick] = useState(0);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [intelBusy, setIntelBusy] = useState<string | null>(null);
  const [intelError, setIntelError] = useState<string | null>(null);
  const [intelIndex, setIntelIndex] = useState(0);
  const [intelPaused, setIntelPaused] = useState(false);
  const [captureText, setCaptureText] = useState("");
  const [captureStatus, setCaptureStatus] = useState<
    "idle" | "saving" | "done" | "error"
  >("idle");
  const captureRef = useRef<HTMLInputElement>(null);

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
  const weekUnknown = Boolean(timetable && !timetable.semester.startDate);
  const weekday = weekdayOf(now);
  const courses = weekUnknown
    ? coursesOnWeekday(timetable, weekday)
    : coursesOnDay(timetable, currentWeek, weekday);
  const pending = pendingAssignments(assignments?.items ?? null);
  const experienceItems = experiences?.experiences ?? [];
  const judgment = buildTodayJudgment({
    now,
    profile,
    courses: weekUnknown ? [] : courses,
    pending,
    ledger,
    weekUnknown,
  });
  const echo = pickEcho(experienceItems, now);
  const intel = pickRelevantCalendarItems(CALENDAR_ITEMS, profile, 4, now);
  const intelCount = intel.length;
  const prompts = buildCapturePrompts(weekUnknown ? [] : courses, pending);
  const readiness = computeReadiness(profile, experienceItems);
  const level = characterLevel(experienceItems);
  const echoStars = echo ? tierStars(echo.experience) : 0;
  const aside = briefingAside({
    intel: intel[0]
      ? { title: intel[0].title, timing: calendarTimingLabel(intel[0]) }
      : null,
    readyCount: level.ready,
    pendingCount: pending.length,
  });

  useEffect(() => {
    if (intelIndex >= intelCount) setIntelIndex(0);
  }, [intelIndex, intelCount]);

  useEffect(() => {
    if (intelCount <= 1 || intelPaused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(
      () => setIntelIndex((index) => (index + 1) % intelCount),
      6500,
    );
    return () => window.clearInterval(timer);
  }, [intelCount, intelPaused]);

  const todayKey = studyDateKey(now);
  const todaySettlement = settleDay(ledger, todayKey);
  const yesterdayKey = previousStudyDateKey(now);
  const yesterday = settleDay(ledger, yesterdayKey);
  const streak = streakInfo(ledger, now);
  const todayNotes = notes
    .filter((note) => studyDateKey(dayjs(note.createdAt)) === todayKey)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const completedToday = [
    ...new Map(
      todaySettlement.events
        .filter(
          (event) =>
            !event.revokedAt &&
            event.type === "assignment_done" &&
            event.refId,
        )
        .map((event) => {
          const item = assignments?.items.find(
            (candidate) =>
              candidate.id === event.refId && candidate.status === "done",
          );
          return item ? [item.id, item] : null;
        })
        .filter((entry): entry is [string, Assignment] => entry !== null),
    ).values(),
  ].slice(0, 3);

  const streakLine = comboLine(streak.days, streak.includesToday);
  const weekLine = weekCompareLine(weekOverWeek(ledger, now));

  async function handleToggle(item: Assignment) {
    setSaveError(null);
    try {
      await onToggleAssignment(item);
    } catch {
      setSaveError("这项没写进本机，请检查浏览器存储权限后重试");
    }
  }

  async function handleCapture(event?: FormEvent) {
    event?.preventDefault();
    const value = captureText.trim();
    if (!value) {
      captureRef.current?.focus();
      return;
    }
    setCaptureStatus("saving");
    try {
      await onAddNote(value);
      setCaptureText("");
      setCaptureStatus("done");
      onCaptureSaved?.();
    } catch {
      setCaptureStatus("error");
    }
  }

  function intelSaved(item: CalendarItem): boolean {
    return notes.some((note) => note.text.includes(item.title));
  }

  async function handleIntelNote(item: CalendarItem) {
    setIntelBusy(item.id);
    setIntelError(null);
    try {
      await onAddNote(
        `关注：${item.title}（${whyRelevant(item, profile)}，${calendarTimingLabel(item)}）`,
        ["情报"],
      );
    } catch {
      setIntelError("这条没记下来，请检查浏览器存储权限后重试");
    } finally {
      setIntelBusy(null);
    }
  }

  return (
    <div className="px-4 pt-5 pb-12 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <header className="page-head">
          <div className="page-head-main">
            <h1 className="page-title">今天</h1>
            <p className="page-sub flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>{now.format("YYYY年M月D日")}</span>
              <span>{pending.length} 项未完成</span>
            </p>
            {profile && (
              <p className="page-sub flex flex-wrap items-center gap-x-3 gap-y-1 lg:hidden">
                <span className="text-accent-ink">{`Lv.${level.level}`}</span>
                <span>{profile.grade || "年级未填"}</span>
                <span>{profile.major || "专业未填"}</span>
                <span>{GOAL_LABELS[profile.goal]}</span>
              </p>
            )}
          </div>

          <div className="page-actions">
            <button
              type="button"
              onClick={() => onOpenWindow("timetable")}
              className={BTN_SECONDARY}
            >
              课表            </button>
            <button
              type="button"
              onClick={() => onOpenWindow("assignments")}
              className={BTN_SECONDARY}
            >
              作业            </button>
          </div>
        </header>

        {demoMode && (
          <div className="app-demo-line flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-mono text-micro tracking-[0.14em] text-amber-ink">
              示例路径
            </span>
            <button type="button" onClick={() => onOpenWindow("experiences")}>
              看征途
            </button>
            <button
              type="button"
              onClick={() => onOpenWindow("opportunities")}
            >
              看征召
            </button>
            <button type="button" onClick={onExitDemo} className="text-amber-ink">
              清除示例并退出
            </button>
          </div>
        )}

        {(saveError || intelError) && (
          <p
            role="alert"
            className="border-amber/50 bg-amber/[0.06] mt-3 rounded-xl border-l-2 px-3 py-2 text-xs leading-5 text-ink-2"
          >
            {saveError ?? intelError}
          </p>
        )}

        {unlockedHint && (
          <section
            aria-label="建档完成"
            className="border-rule mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-surface px-4 py-3"
          >
            <div>
              <p className="font-mono text-micro tracking-[0.16em] text-accent-ink">
                建档完成 五个面已开启
              </p>
              <p className="mt-1 text-xs leading-5 text-ink-3">
                第一条战绩已记进征途
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onOpenWindow("experiences")}
                className={BTN_SECONDARY}
              >
                看动态              </button>
              <button
                type="button"
                onClick={onDismissUnlockHint}
                className="text-[11px] text-ink-4 underline underline-offset-4 hover:text-ink"
              >
                知道
              </button>
            </div>
          </section>
        )}

        <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,1.85fr)_minmax(0,0.95fr)]">
          <div className="min-w-0 space-y-4">
            <section className="app-card app-card-brief p-6 sm:p-8">
              <div className="app-card-head">
                <p className="app-card-label">{briefingSegment(now)}</p>
              </div>
              <h2 className="mt-4 max-w-[34rem] font-serif text-[clamp(1.75rem,2.7vw,2.4rem)] leading-[1.32] tracking-[0.01em]">
                {judgment.line}
              </h2>

              <div className="mt-4 max-w-[36rem]">
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[12.5px] leading-6 text-ink-3">
                  {courses.length > 0 ? (
                    courses.map((course) => (
                      <span
                        key={`${course.course.id}-${course.startPeriod}`}
                        className="whitespace-nowrap"
                      >
                        <span className="font-mono tabular-nums text-ink-4">
                          {course.startPeriod}-{course.endPeriod} 节
                        </span>{" "}
                        <span className="text-ink-2">{course.course.name}</span>
                      </span>
                    ))
                  ) : (
                    <span>
                      {timetable
                        ? weekUnknown
                          ? "课表已导入 未设开学日期"
                          : "今天没有课"
                        : "课表未导入"}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => onOpenWindow("timetable")}
                    className="app-text-link"
                  >
                    {!timetable
                      ? "导入课表"
                      : weekUnknown
                        ? "设开学日期"
                        : "课表"}
                  </button>
                </div>

                {judgment.detail && (
                  <p className="mt-1 text-[12px] leading-5 text-ink-3">
                    {judgment.detail}
                  </p>
                )}

                {weekUnknown && courses.length > 0 && (
                  <p className="mt-1 text-[11px] leading-5 text-amber-ink">
                    周次未校准 先按每周有课列出
                  </p>
                )}

                {aside && (
                  <p className="mt-1.5 text-[12px] leading-5 text-amber-ink">
                    {aside}
                  </p>
                )}
              </div>

              <form
                onSubmit={(event) => void handleCapture(event)}
                className="mt-6"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-mono text-micro tracking-[0.14em] text-ink-4">
                    留痕
                  </p>
                  <p className="shrink-0 font-mono text-micro tabular-nums text-ink-4">
                    今天 {todayNotes.length} 条
                  </p>
                </div>

                <div
                  className={`app-capture-bar mt-2${captureStatus === "done" ? " is-stamped" : ""}`}
                >
                  <span aria-hidden="true" className="app-capture-dot" />
                  {captureStatus === "done" && (
                    <>
                      <WaxSeal
                        units={4}
                        total={4}
                        ready
                        size={16}
                        className="app-seal-stamp"
                      />
                      <ApertureMark size={15} className="app-stamp-aperture" />
                      <StarMark size={15} className="app-stamp-star" />
                    </>
                  )}
                  <label htmlFor="today-capture-input" className="sr-only">
                    今天做了什么
                  </label>
                  <input
                    ref={captureRef}
                    id="today-capture-input"
                    value={captureText}
                    onChange={(event) => {
                      setCaptureText(event.target.value.slice(0, 500));
                      if (captureStatus !== "saving") setCaptureStatus("idle");
                    }}
                    placeholder="今天做了什么 一句话也行"
                    className="app-capture-input"
                  />
                  <button
                    type="submit"
                    disabled={captureStatus === "saving"}
                    className="app-capture-submit"
                  >
                    {captureStatus === "saving" ? "提交中…" : "提交征途碎片"}
                  </button>
                </div>

                {prompts.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] leading-5">
                    {prompts.slice(0, 2).map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => {
                          setCaptureText(prompt);
                          setCaptureStatus("idle");
                        }}
                        className="max-w-full truncate text-left text-ink-4 underline decoration-ink/20 underline-offset-4 transition-colors hover:text-ink"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                )}

                {captureStatus !== "idle" && (
                  <p
                    aria-live="polite"
                    className={[
                      "mt-2 text-[11px] leading-5",
                      captureStatus === "error" ? "text-red-800" : "text-ink-3",
                    ].join(" ")}
                  >
                    {captureStatus === "error"
                      ? "这次没写进本机 请检查浏览器存储权限后重试"
                      : "已存进碎片收件箱"}
                  </p>
                )}
              </form>

              {todayNotes.length > 0 && (
                <ul className="mt-3 space-y-1.5 border-t border-rule/60 pt-2.5">
                  {todayNotes.slice(0, 3).map((note) => (
                    <li key={note.id} className="flex gap-2.5">
                      <span className="w-9 shrink-0 font-mono text-micro tabular-nums text-ink-4">
                        {dayjs(note.createdAt).format("HH:mm")}
                      </span>
                      <span className="note-hand line-clamp-2 min-w-0 flex-1 text-[11px] leading-5 text-ink-3">
                        {note.text}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              <p className="mt-4 text-[11px] leading-5 text-ink-4">
                {levelUpLine(level)}
              </p>
            </section>

            <section className="app-card p-5">
              <div className="app-card-head">
                <p className="app-card-label">委托</p>
                <p className="app-card-meta">
                  {assignments ? `${pending.length} 项未完成` : "作业未导入"}
                </p>
              </div>

              {!assignments ? (
                <div className="mt-3">
                  <p className="text-sm leading-6 text-ink-3">还没有作业数据</p>
                  <button
                    type="button"
                    onClick={() => onOpenWindow("assignments")}
                    className="app-text-link mt-1"
                  >
                    去添加作业                  </button>
                </div>
              ) : pending.length === 0 ? (
                <p className="mt-3 text-sm leading-6 text-ink-3">
                  没有未完成的作业
                </p>
              ) : (
                <ul className="mt-1">
                  {pending.map((item, index) => (
                    <TaskRow
                      key={item.id}
                      item={item}
                      now={now}
                      first={index === 0}
                      onToggle={() => void handleToggle(item)}
                    />
                  ))}
                </ul>
              )}

              {completedToday.length > 0 && (
                <div className="mt-2 rounded-xl bg-ink/[0.025] px-3 py-2.5">
                  <p className="font-mono text-micro tracking-[0.08em] text-ink-4">
                    今天已划掉 {completedToday.length}
                  </p>
                  <ul className="mt-1 space-y-1">
                    {completedToday.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center gap-2 text-[11px]"
                      >
                        <CheckGlyph />
                        <span className="min-w-0 flex-1 truncate text-ink-3 line-through">
                          {item.title}
                        </span>
                        <button
                          type="button"
                          onClick={() => void handleToggle(item)}
                          className="shrink-0 text-ink-3 underline underline-offset-2 hover:text-ink"
                        >
                          撤销
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          </div>

          <div className="min-w-0 space-y-4">
            <section className="app-card p-4">
              <div className="app-card-head">
                <p className="app-card-label">情报</p>
                <button
                  type="button"
                  onClick={() => onOpenWindow("calendar")}
                  className="app-text-link"
                >
                  日历                </button>
              </div>

              {CALENDAR_ISSUE ? (
                <p className="mt-3 text-[11px] leading-5 text-amber-ink">
                  {CALENDAR_ISSUE}
                </p>
              ) : intel.length === 0 ? (
                <p className="mt-3 text-[11px] leading-5 text-ink-3">
                  近期没有已公布日期的情报
                </p>
              ) : (
                <div
                  role="region"
                  aria-roledescription="轮播"
                  aria-label="近期情报"
                  className="mt-2"
                  onMouseEnter={() => setIntelPaused(true)}
                  onMouseLeave={() => setIntelPaused(false)}
                  onFocus={() => setIntelPaused(true)}
                  onBlur={() => setIntelPaused(false)}
                >
                  <div className="overflow-hidden">
                    <div
                      className="flex transition-transform duration-500 ease-out"
                      style={{ transform: `translateX(-${intelIndex * 100}%)` }}
                    >
                      {intel.map((item, index) => {
                        const saved = intelSaved(item);
                        const active = index === intelIndex;
                        return (
                          <div
                            key={item.id}
                            inert={!active}
                            aria-hidden={!active}
                            aria-roledescription="幻灯片"
                            aria-label={`第 ${index + 1} 条 共 ${intel.length} 条`}
                            className="w-full shrink-0"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={[
                                  "shrink-0 rounded-full px-2 py-0.5 font-mono text-[12px] leading-5",
                                  CATEGORY_CHIP[item.category],
                                ].join(" ")}
                              >
                                {CALENDAR_CATEGORY_LABELS[item.category]}
                              </span>
                              <span className="ml-auto shrink-0 font-mono text-micro text-ink-4">
                                {calendarTimingLabel(item)}
                              </span>
                            </div>
                            <p className="mt-1 text-[13px] leading-5 font-medium">
                              {item.title}
                            </p>
                            <div className="mt-1 flex items-center justify-between gap-2">
                              <span className="truncate text-micro text-ink-3">
                                {[item.organizer, whyRelevant(item, profile)]
                                  .filter(Boolean)
                                  .join(" ")}
                              </span>
                              <button
                                type="button"
                                onClick={() => void handleIntelNote(item)}
                                disabled={saved || intelBusy === item.id}
                                className="app-mini-chip shrink-0 disabled:opacity-45"
                              >
                                {saved
                                  ? "已记下"
                                  : intelBusy === item.id
                                    ? "记录中…"
                                    : "记下"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {intel.length > 1 && (
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <div
                        className="flex items-center gap-0.5"
                        role="group"
                        aria-label="切换情报"
                      >
                        {intel.map((item, index) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setIntelIndex(index)}
                            aria-label={`第 ${index + 1} 条：${item.title}`}
                            aria-current={
                              index === intelIndex ? "true" : undefined
                            }
                            className="flex min-h-11 w-8 items-center justify-center"
                          >
                            <span
                              aria-hidden="true"
                              className={[
                                "block rounded-full transition-all",
                                index === intelIndex
                                  ? "h-1.5 w-5 bg-accent"
                                  : "h-1.5 w-1.5 bg-ink/20",
                              ].join(" ")}
                            />
                          </button>
                        ))}
                      </div>
                      <span className="font-mono text-micro tabular-nums text-ink-4">
                        {intelIndex + 1} / {intel.length}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </section>

            <section className="app-card p-4">
              <div className="app-card-head">
                <p className="app-card-label">节奏</p>
              </div>

              {yesterday.empty ? (
                <p className="mt-3 text-[12px] leading-6 text-ink-3">
                  昨天没有产生结果的动作
                </p>
              ) : (
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5">
                  {[
                    { label: "完成作业", value: yesterday.counts.assignment_done },
                    { label: "新增战绩", value: yesterday.counts.experience_added },
                    { label: "补充证据", value: yesterday.counts.evidence_added },
                    { label: "留下记录", value: yesterday.counts.note_added },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-baseline justify-between gap-2"
                    >
                      <dt className="text-[11px] text-ink-3">{item.label}</dt>
                      <dd
                        className={[
                          "font-serif text-xl leading-none tabular-nums",
                          item.value > 0 ? "text-ink" : "text-ink-4",
                        ].join(" ")}
                      >
                        {item.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}

              <div className="mt-3">
                <p className="font-mono text-micro leading-5 text-ink-3">
                  {weekLine} {streakLine}
                </p>
              </div>

              <div className="mt-3 flex items-center gap-3 border-t border-rule/60 pt-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-micro text-ink-3">
                    档案就绪度 {readiness.score}/100 {readiness.label}
                  </p>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-ink/10">
                    <div
                      className="h-full rounded-full bg-accent transition-[width] duration-500"
                      style={{ width: `${readiness.score}%` }}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenWindow("experiences")}
                  className="app-text-link shrink-0"
                >
                  征途                </button>
                <button
                  type="button"
                  onClick={() => onOpenWindow("resume")}
                  className="app-text-link shrink-0"
                >
                  简历                </button>
              </div>
            </section>

            <section className="app-card p-4">
              <div className="app-card-head">
                <p className="app-card-label">回声</p>
                <button
                  type="button"
                  onClick={() => onOpenWindow("experiences")}
                  className="app-text-link"
                >
                  经历库                </button>
              </div>

              {!echo ? (
                <p className="mt-3 text-[12px] leading-6 text-ink-3">
                  今天写下第一条战绩
                </p>
              ) : (
                <div className="mt-3">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span
                      className="rounded-full px-2 py-0.5 font-mono text-[12px] leading-5"
                      style={{
                        color: EXPERIENCE_KIND_META[echo.experience.kind].color,
                        backgroundColor:
                          EXPERIENCE_KIND_META[echo.experience.kind].pale,
                      }}
                    >
                      {experienceKindLabel(
                        echo.experience.kind,
                        echo.experience.kindLabel,
                      )}
                    </span>
                    <span className="font-mono text-micro text-ink-4">
                      {echo.label}
                    </span>
                    <span className="font-mono text-micro text-ink-4">
                      {formatExperienceRange(
                        echo.experience.start,
                        echo.experience.end,
                      )}
                    </span>
                  </div>
                  <p className="mt-2 font-serif text-lg leading-7">
                    {echo.experience.title}
                  </p>
                  {echo.quote ? (
                    <p className="mt-1.5 line-clamp-2 text-[11px] leading-5 text-ink-3">
                      “{echo.quote}”
                    </p>
                  ) : (
                    <p className="mt-1.5 text-[11px] leading-5 text-amber-ink">
                      结果还没写
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-2">
                    <TierPips
                      units={echoStars}
                      total={4}
                      label={`品质 ${echoStars}/4`}
                    />
                    <span className="font-mono text-micro text-ink-4">
                      {tierLine(echo.experience)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenWindow("experiences")}
                    className="app-text-link mt-2"
                  >
                    看看原文                  </button>
                </div>
              )}
            </section>

          </div>
        </div>

        <p className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-4">
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-full bg-[#6f8f6a]"
          />
          <span>本机存档</span>
          <span>数据只存在你的浏览器</span>
          <span>记录不外传不推送</span>
        </p>
      </div>
    </div>
  );
}

function TaskRow({
  item,
  now,
  first,
  onToggle,
}: {
  item: Assignment;
  now: Dayjs;
  first: boolean;
  onToggle: () => void;
}) {
  const tier = ddlTier(item.due, now);
  const meta = [item.courseName, ASSIGNMENT_KIND_LABELS[item.kind]]
    .filter(Boolean)
    .join(" ");

  return (
    <li className="flex items-start gap-2 border-t border-rule/60 py-1.5 first:border-t-0 sm:gap-3">
      <label
        className="flex h-11 w-9 shrink-0 cursor-pointer items-center justify-center"
        title="标记完成"
      >
        <input
          type="checkbox"
          checked={false}
          onChange={onToggle}
          className="app-checkbox"
        />
        <span className="sr-only">标记完成：{item.title}</span>
      </label>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-sm leading-5 font-medium">{item.title}</p>
          {first && (
            <span className="bg-accent/12 text-accent-ink rounded-full px-1.5 py-0.5 font-mono text-micro">
              先做这件
            </span>
          )}
          {item.confidence === "low" && (
            <span className="bg-amber/15 rounded-full px-1.5 py-0.5 font-mono text-micro text-amber-ink">
              待确认
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[11px] leading-4 text-ink-3">{meta}</p>
      </div>

      <div className="shrink-0 text-right">
        <p
          title={formatDueFull(item.due)}
          className={[
            "font-mono text-micro whitespace-nowrap",
            tierTextClass(tier),
          ].join(" ")}
        >
          {dueLabel(item.due, now)}
        </p>
        {TIER_TEXT[tier] && (
          <p
            className={[
              "font-mono text-micro whitespace-nowrap",
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

function CheckGlyph() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5 shrink-0 text-[#6f8f6a]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 8.5 6.2 11.5 13 4.5" />
    </svg>
  );
}
