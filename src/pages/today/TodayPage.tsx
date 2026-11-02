import { useEffect, useState, type FormEvent } from "react";
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
import { currentWeekOf } from "../../parse/schedule";
import {
  EXPERIENCE_KIND_META,
  experienceKindLabel,
  formatExperienceRange,
} from "../../lib/experience";
import { ddlTier, formatDue, formatDueFull } from "../../lib/ddl";
import {
  buildCapturePrompts,
  buildTodayJudgment,
  coursesOnDay,
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
  computeReadiness,
  previousStudyDateKey,
  settleDay,
  streakInfo,
  studyDateKey,
  weekGreenCells,
  weekGreenDayCount,
} from "../../lib/ledger";
import { CALENDAR_ISSUE, CALENDAR_ITEMS } from "../../store/calendar";
import TodayOnboarding, {
  type OnboardingValues,
} from "../../components/TodayOnboarding";

interface TodayPageProps {
  timetable: TimetableData | null;
  assignments: AssignmentData | null;
  experiences: ExperienceData | null;
  profile: Profile | null;
  ledger: LedgerEvent[];
  notes: Note[];
  onOnboard: (
    values: OnboardingValues,
    recentWork: string,
  ) => Promise<void>;
  onToggleAssignment: (item: Assignment) => Promise<void>;
  onAddNote: (text: string, tags?: string[]) => Promise<void>;
  onUseSample: () => Promise<void>;
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

const BTN_PRIMARY =
  "app-pill-primary inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full px-5 text-sm font-medium disabled:opacity-50";
const BTN_SECONDARY =
  "app-pill inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm";

const CATEGORY_CHIP: Record<CalendarCategory, string> = {
  contest: "bg-accent/10 text-accent-ink",
  exam: "bg-amber/15 text-amber-ink",
  campus: "bg-ink/[0.06] text-ink-3",
};

const ONBOARDING_HIDDEN_KEY = "studytrack:onboarding-hidden";

function readOnboardingHidden(): boolean {
  try {
    return window.sessionStorage.getItem(ONBOARDING_HIDDEN_KEY) === "1";
  } catch {
    return false;
  }
}

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
  if (tier === "none") return "text-ink-3";
  return "text-ink-3";
}

export default function TodayPage({
  timetable,
  assignments,
  experiences,
  profile,
  ledger,
  notes,
  onOnboard,
  onToggleAssignment,
  onAddNote,
  onUseSample,
  demoMode,
  onExitDemo,
  onOpenWindow,
}: TodayPageProps) {
  const [, setTick] = useState(0);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [sampleSeeding, setSampleSeeding] = useState(false);
  const [sampleError, setSampleError] = useState<string | null>(null);
  const [onboardingHidden, setOnboardingHidden] = useState(
    readOnboardingHidden,
  );
  const [intelBusy, setIntelBusy] = useState<string | null>(null);
  const [intelError, setIntelError] = useState<string | null>(null);
  const [captureText, setCaptureText] = useState("");
  const [captureStatus, setCaptureStatus] = useState<
    "idle" | "saving" | "done" | "error"
  >("idle");

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
  const courses = coursesOnDay(timetable, currentWeek, weekdayOf(now));
  const pending = pendingAssignments(assignments?.items ?? null);
  const experienceItems = experiences?.experiences ?? [];
  const judgment = buildTodayJudgment({
    now,
    profile,
    courses,
    pending,
    ledger,
  });
  const echo = pickEcho(experienceItems, now);
  const intel = pickRelevantCalendarItems(CALENDAR_ITEMS, profile, 2, now);
  const prompts = buildCapturePrompts(courses, pending);
  const readiness = computeReadiness(profile, experienceItems);

  const todayKey = studyDateKey(now);
  const todaySettlement = settleDay(ledger, todayKey);
  const yesterdayKey = previousStudyDateKey(now);
  const yesterday = settleDay(ledger, yesterdayKey);
  const streak = streakInfo(ledger, now);
  const greenCells = weekGreenCells(ledger, now);
  const greenDays = weekGreenDayCount(ledger, now);
  const todayNotes = notes
    .filter((note) => studyDateKey(dayjs(note.createdAt)) === todayKey)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const focusItem = pending[0] ?? null;
  const showOnboarding = profile === null && !onboardingHidden;

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

  const yesterdayLine = yesterday.empty
    ? "昨天没有产生结果的动作"
    : `昨日完成 ${yesterday.counts.assignment_done} · 战绩 ${yesterday.counts.experience_added} · 记录 ${yesterday.counts.note_added}`;
  const streakLine =
    streak.days > 0
      ? `连续 ${streak.days} 天${streak.includesToday ? " · 今天已接上" : " · 今天还差一条"}`
      : "绿格从今天第一条记录开始";

  function hideOnboarding() {
    setOnboardingHidden(true);
    try {
      window.sessionStorage.setItem(ONBOARDING_HIDDEN_KEY, "1");
    } catch {
      // UI-only preference; storage may be disabled.
    }
  }

  function reopenOnboarding() {
    setOnboardingHidden(false);
    try {
      window.sessionStorage.removeItem(ONBOARDING_HIDDEN_KEY);
    } catch {
      // UI-only preference; storage may be disabled.
    }
  }

  function startOnboarding() {
    reopenOnboarding();
    window.setTimeout(() => {
      document.getElementById("today-onboarding")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 40);
  }

  function focusCapture() {
    document.getElementById("today-capture")?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
    window.setTimeout(() => {
      document.getElementById("today-capture-input")?.focus();
    }, 280);
  }

  async function handleToggle(item: Assignment) {
    setSaveError(null);
    try {
      await onToggleAssignment(item);
    } catch {
      setSaveError("这项没写进本机，请检查浏览器存储权限后重试。");
    }
  }

  async function handleSample() {
    setSampleSeeding(true);
    setSampleError(null);
    try {
      await onUseSample();
    } catch {
      setSampleError("示例数据写入失败，请检查浏览器存储权限后重试。");
    } finally {
      setSampleSeeding(false);
    }
  }

  async function handleCapture(event?: FormEvent) {
    event?.preventDefault();
    const value = captureText.trim();
    if (!value) return;
    setCaptureStatus("saving");
    try {
      await onAddNote(value);
      setCaptureText("");
      setCaptureStatus("done");
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
      setIntelError("这条没记下来，请检查浏览器存储权限后重试。");
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
            <p className="page-sub">
              {now.format("YYYY年M月D日")} · {pending.length} 项未完成
              {streak.days > 0 ? ` · 连续 ${streak.days} 天` : ""}
            </p>
            {profile && (
              <p className="page-sub lg:hidden">
                {profile.grade || "年级未填"} ·{" "}
                {profile.major || "专业未填"} · {GOAL_LABELS[profile.goal]}
              </p>
            )}
          </div>

          <div className="page-actions">
            {profile && (
              <p className="app-profile-chip">
                <span>{profile.grade || "年级未填"}</span>
                <span aria-hidden="true">/</span>
                <span>{profile.major || "专业未填"}</span>
                <span aria-hidden="true">/</span>
                <span>{GOAL_LABELS[profile.goal]}</span>
              </p>
            )}
            <button
              type="button"
              onClick={() => onOpenWindow("timetable")}
              className={BTN_SECONDARY}
            >
              课表 ↗
            </button>
            <button
              type="button"
              onClick={() => onOpenWindow("assignments")}
              className={BTN_SECONDARY}
            >
              作业 ↗
            </button>
            {profile === null && onboardingHidden && (
              <button
                type="button"
                onClick={reopenOnboarding}
                className={BTN_SECONDARY}
              >
                建档
              </button>
            )}
          </div>
        </header>

        {demoMode && (
          <div className="app-demo-line">
            <span className="font-mono text-micro tracking-[0.14em] text-amber-ink">
              示例路径
            </span>
            <button type="button" onClick={() => onOpenWindow("experiences")}>
              看账本
            </button>
            <span aria-hidden="true" className="text-ink-4">
              /
            </span>
            <button type="button" onClick={() => onOpenWindow("opportunities")}>
              看悬赏
            </button>
            <span aria-hidden="true" className="text-ink-4">
              ·
            </span>
            <button
              type="button"
              onClick={onExitDemo}
              className="text-amber-ink"
            >
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

        {showOnboarding ? (
          <div
            id="today-onboarding"
            className="scroll-mt-4 [&>section]:mt-4"
          >
            <TodayOnboarding onComplete={onOnboard} onDismiss={hideOnboarding} />
          </div>
        ) : profile === null ? (
          <section className="app-card mt-2 max-w-3xl p-6 sm:p-7">
            <p className="app-card-label">开始使用</p>
            <h2 className="mt-3 font-serif text-[clamp(1.6rem,3vw,2.2rem)] leading-[1.3]">
              先把这学期放上桌。
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-7 text-ink-3">
              学径把课表、作业、经历和机会收进同一份本机档案。每天记一条，四年后能拿出可验证的履历。
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={startOnboarding}
                className={BTN_PRIMARY}
              >
                开始建档
              </button>
              <button
                type="button"
                onClick={() => void handleSample()}
                disabled={sampleSeeding}
                className={BTN_SECONDARY}
              >
                {sampleSeeding ? "正在准备…" : "用示例体验"}
              </button>
            </div>
            <p className="mt-3 font-mono text-micro text-ink-4">
              不写姓名学号，数据只存在你的浏览器。
            </p>
            {sampleError && (
              <p role="alert" className="mt-2 text-[11px] text-red-800">
                {sampleError}
              </p>
            )}
          </section>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
            <div className="min-w-0 space-y-4">
              <section className="app-card p-5 sm:p-6">
                <div className="app-card-head">
                  <p className="app-card-label">01 · 今日判词</p>
                  <p className="app-card-meta">
                    {now.format("M月D日")} · {DAY_LABELS[dayIndexOf(now)]}
                  </p>
                </div>
                <h2 className="mt-4 max-w-[34rem] font-serif text-[clamp(1.65rem,2.9vw,2.4rem)] leading-[1.34] tracking-[0.01em]">
                  {judgment.line}
                </h2>
                <p className="mt-3 max-w-[34rem] text-sm leading-7 text-ink-3">
                  {judgment.detail}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1.5">
                  {courses.length > 0 ? (
                    courses.map((course) => (
                      <span
                        key={`${course.course.id}-${course.startPeriod}`}
                        className="app-mini-chip"
                      >
                        <span className="font-mono text-micro text-ink-4">
                          {course.startPeriod}-{course.endPeriod} 节
                        </span>
                        <span className="font-medium text-ink-2">
                          {course.course.name}
                        </span>
                      </span>
                    ))
                  ) : (
                    <span className="text-[11px] text-ink-3">
                      {timetable ? "今天没有课。" : "课表未导入。"}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => onOpenWindow("timetable")}
                    className="app-text-link"
                  >
                    课表 ↗
                  </button>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  {focusItem ? (
                    <>
                      <button
                        type="button"
                        onClick={() => void handleToggle(focusItem)}
                        className={BTN_PRIMARY}
                      >
                        <CheckGlyph />
                        完成这一件
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenWindow("assignments")}
                        className={BTN_SECONDARY}
                      >
                        全部作业 ↗
                      </button>
                      <button
                        type="button"
                        onClick={focusCapture}
                        className="app-text-link min-h-11 px-2"
                      >
                        先记一条
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={focusCapture}
                        className={BTN_PRIMARY}
                      >
                        记下今天推进的一件事
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenWindow("experiences")}
                        className={BTN_SECONDARY}
                      >
                        打开账本 ↗
                      </button>
                    </>
                  )}
                </div>
              </section>

              <section className="app-card p-5 sm:p-6">
                <div className="app-card-head">
                  <p className="app-card-label">02 · 今日委托</p>
                  <p className="app-card-meta">
                    {assignments ? `${pending.length} 项未完成` : "作业未导入"}
                  </p>
                </div>

                {!assignments ? (
                  <div className="mt-3">
                    <p className="text-sm leading-6 text-ink-3">
                      还没有作业数据。可以在新窗口里粘贴、截图或手动添加。
                    </p>
                    <button
                      type="button"
                      onClick={() => onOpenWindow("assignments")}
                      className="app-text-link mt-1"
                    >
                      去添加作业 ↗
                    </button>
                  </div>
                ) : pending.length === 0 ? (
                  <p className="mt-3 text-sm leading-6 text-ink-3">
                    没有未完成的作业。可以看看之后的 DDL，或者记一条今天推进的事。
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
                      今天已划掉 · {completedToday.length}
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

              <section id="today-capture" className="app-card p-5 sm:p-6">
                <div className="app-card-head">
                  <p className="app-card-label">03 · 留痕</p>
                  <p className="app-card-meta">今天 {todayNotes.length} 条</p>
                </div>

                <form onSubmit={(event) => void handleCapture(event)} className="mt-3">
                  <div className="app-capture-bar">
                    <span aria-hidden="true" className="app-capture-dot" />
                    <label htmlFor="today-capture-input" className="sr-only">
                      今天做了什么
                    </label>
                    <input
                      id="today-capture-input"
                      value={captureText}
                      onChange={(event) => {
                        setCaptureText(event.target.value.slice(0, 500));
                        if (captureStatus !== "saving") setCaptureStatus("idle");
                      }}
                      placeholder="今天做了什么？一句话也行"
                      className="app-capture-input"
                    />
                    <button
                      type="submit"
                      disabled={captureStatus === "saving" || !captureText.trim()}
                      className="app-capture-submit"
                    >
                      {captureStatus === "saving" ? "记录中…" : "记一条"}
                    </button>
                  </div>

                  {prompts.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {prompts.slice(0, 2).map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          onClick={() => {
                            setCaptureText(prompt);
                            setCaptureStatus("idle");
                          }}
                          className="app-mini-chip max-w-full min-w-0 truncate"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  )}

                  <p
                    aria-live="polite"
                    className={[
                      "mt-2 text-[11px] leading-5",
                      captureStatus === "error"
                        ? "text-red-800"
                        : "text-ink-3",
                    ].join(" ")}
                  >
                    {captureStatus === "error"
                      ? "这次没写进本机，请检查浏览器存储权限后重试。"
                      : captureStatus === "done"
                        ? `已记下，今天第 ${todayNotes.length} 条。`
                        : "写一句就够，会进账本；只统计产生结果的动作。"}
                  </p>
                </form>

                {todayNotes.length > 0 && (
                  <ul className="mt-2 space-y-1.5 border-t border-rule/60 pt-2.5">
                    {todayNotes.slice(0, 3).map((note) => (
                      <li key={note.id} className="flex gap-2.5">
                        <span className="w-9 shrink-0 font-mono text-micro tabular-nums text-ink-4">
                          {dayjs(note.createdAt).format("HH:mm")}
                        </span>
                        <span className="line-clamp-2 min-w-0 flex-1 text-[11px] leading-5 text-ink-3">
                          {note.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            <div className="min-w-0 space-y-4">
              <section className="app-card p-5">
                <div className="app-card-head">
                  <p className="app-card-label">04 · 昨日结算</p>
                  <p className="app-card-meta">
                    {dayjs(yesterdayKey).format("M月D日")}
                  </p>
                </div>

                {yesterday.empty ? (
                  <p className="mt-3 text-[12px] leading-6 text-ink-3">
                    昨天没有产生结果的动作。空一天不算断，今天补一条就接上。
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

                <p className="mt-3 border-t border-rule/60 pt-2.5 font-mono text-micro leading-5 text-ink-3">
                  {yesterdayLine} · {streakLine}
                </p>
              </section>

              <section className="app-card p-5">
                <div className="app-card-head">
                  <p className="app-card-label">05 · 本周绿格</p>
                  <p className="app-card-meta">{greenDays} / 7</p>
                </div>

                <ul className="mt-3 grid grid-cols-7 gap-1.5">
                  {greenCells.map((cell) => (
                    <li key={cell.dateKey}>
                      <p className="text-center font-mono text-micro text-ink-4">
                        {cell.label.slice(1)}
                      </p>
                      <div
                        aria-label={`${cell.label} ${dayjs(cell.dateKey).format("M月D日")}，${
                          cell.level > 0 ? `${cell.level} 格记录` : "没有记录"
                        }${cell.isToday ? "，今天" : ""}`}
                        title={`${cell.dateKey} · ${
                          cell.level > 0 ? `${cell.level} 格` : "空"
                        }`}
                        data-level={cell.level}
                        className={[
                          "app-green-cell mt-1",
                          cell.isFuture ? "is-future" : "",
                          cell.isToday ? "is-today" : "",
                        ].join(" ")}
                      >
                        {dayjs(cell.dateKey).format("D")}
                      </div>
                    </li>
                  ))}
                </ul>

                <p className="mt-3 font-mono text-micro leading-5 text-ink-3">
                  连续 {streak.days} 天 · 只算产生结果的动作
                </p>

                <div className="mt-3 flex items-center gap-3 border-t border-rule/60 pt-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-micro text-ink-3">
                      档案就绪度 {readiness.score}/100 · {readiness.label}
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
                    账本 ↗
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenWindow("resume")}
                    className="app-text-link shrink-0"
                  >
                    简历 ↗
                  </button>
                </div>
              </section>

              <section className="app-card p-5">
                <div className="app-card-head">
                  <p className="app-card-label">06 · 回声</p>
                  <button
                    type="button"
                    onClick={() => onOpenWindow("experiences")}
                    className="app-text-link"
                  >
                    经历库 ↗
                  </button>
                </div>

                {!echo ? (
                  <p className="mt-3 text-[12px] leading-6 text-ink-3">
                    今天写下第一条战绩，过几天这里会把它送回来。
                  </p>
                ) : (
                  <div className="mt-3">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span
                        className="rounded-full px-1.5 py-0.5 font-mono text-micro"
                        style={{
                          color:
                            EXPERIENCE_KIND_META[echo.experience.kind].color,
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
                    <p className="mt-1.5 line-clamp-3 text-[11px] leading-5 text-ink-3">
                      “{echo.quote}”
                    </p>
                    <button
                      type="button"
                      onClick={() => onOpenWindow("experiences")}
                      className="app-text-link mt-2"
                    >
                      看看原文 ↗
                    </button>
                  </div>
                )}
              </section>

              <section className="app-card p-5">
                <div className="app-card-head">
                  <p className="app-card-label">07 · 今日情报</p>
                  <button
                    type="button"
                    onClick={() => onOpenWindow("calendar")}
                    className="app-text-link"
                  >
                    日历 ↗
                  </button>
                </div>

                {CALENDAR_ISSUE ? (
                  <p className="mt-3 text-[11px] leading-5 text-amber-ink">
                    {CALENDAR_ISSUE}
                  </p>
                ) : intel.length === 0 ? (
                  <p className="mt-3 text-[11px] leading-5 text-ink-3">
                    近期没有已公布日期的情报。未公布日期的条目只留在日历里，不猜时间。
                  </p>
                ) : (
                  <ul className="mt-1">
                    {intel.map((item) => {
                      const saved = intelSaved(item);
                      return (
                        <li
                          key={item.id}
                          className="border-t border-rule/60 py-2.5 first:border-t-0"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={[
                                "shrink-0 rounded-full px-1.5 py-0.5 font-mono text-micro",
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
                                .join(" · ")}
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
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </div>
          </div>
        )}

        <p className="mt-5 flex items-center gap-2 text-[11px] text-ink-4">
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-full bg-[#6f8f6a]"
          />
          数据只存在你的浏览器 · 记录只在本机，不会推送
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
    .join(" · ");

  return (
    <li className="flex items-start gap-2 border-t border-rule/60 py-3 first:border-t-0 sm:gap-3">
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
        <p className="mt-0.5 text-[11px] leading-5 text-ink-3">{meta}</p>
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
