import { useEffect, useState, type ReactNode } from "react";
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
  archiveStats,
  computeReadiness,
  settleDay,
  studyDateKey,
} from "../../lib/ledger";
import { CALENDAR_ISSUE, CALENDAR_ITEMS } from "../../store/calendar";
import TodayBrief from "../../components/TodayBrief";
import TodayOnboarding, {
  type OnboardingValues,
} from "../../components/TodayOnboarding";
import CaptureBox from "../../components/CaptureBox";
import LedgerHeatmap from "../../components/LedgerHeatmap";
import GettingStartedGuide from "../../components/GettingStartedGuide";
import { GUIDE_OPPORTUNITIES_KEY } from "../../lib/guide";

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
  onNavigate: (
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
  "border-rule hover:bg-ink/[0.03] inline-flex min-h-11 items-center justify-center rounded-lg border bg-surface px-4 text-sm disabled:opacity-60";

const CATEGORY_CHIP: Record<CalendarCategory, string> = {
  contest: "bg-accent/10 text-accent-ink",
  exam: "bg-amber/15 text-amber-ink",
  campus: "bg-ink/[0.06] text-ink/60",
};

const ONBOARDING_HIDDEN_KEY = "studytrack:onboarding-hidden";

function readOnboardingHidden(): boolean {
  try {
    return window.sessionStorage.getItem(ONBOARDING_HIDDEN_KEY) === "1";
  } catch {
    return false;
  }
}

function readGuideOpportunities(): boolean {
  try {
    return window.localStorage.getItem(GUIDE_OPPORTUNITIES_KEY) === "1";
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
  if (tier === "soon") return "text-amber";
  if (tier === "none") return "text-ink/40";
  return "text-ink/55";
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
  onNavigate,
}: TodayPageProps) {
  const [, setTick] = useState(0);
  const [opportunitiesVisited, setOpportunitiesVisited] = useState(
    readGuideOpportunities,
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const [sampleSeeding, setSampleSeeding] = useState(false);
  const [sampleError, setSampleError] = useState<string | null>(null);
  const [onboardingHidden, setOnboardingHidden] = useState(
    readOnboardingHidden,
  );
  const [intelBusy, setIntelBusy] = useState<string | null>(null);
  const [intelError, setIntelError] = useState<string | null>(null);

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
  const intel = pickRelevantCalendarItems(CALENDAR_ITEMS, profile, 3, now);
  const prompts = buildCapturePrompts(courses, pending);
  const readiness = computeReadiness(profile, experienceItems);
  const stats = archiveStats(experienceItems, notes, ledger);

  const todayKey = studyDateKey(now);
  const todaySettlement = settleDay(ledger, todayKey);
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

  const showOnboarding = profile === null && !onboardingHidden;
  const showStarter =
    profile !== null && timetable === null && assignments === null;
  const showTodayBrief =
    profile !== null && (notes.length > 0 || experienceItems.length > 0);
  const showHeatmap =
    profile !== null && (ledger.length > 0 || experienceItems.length > 0);
  const weekLabel = currentWeek !== null ? `第 ${currentWeek} 周` : null;

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
      document.getElementById("capture-text")?.focus();
    }, 260);
  }

  function visitOpportunities() {
    try {
      window.localStorage.setItem(GUIDE_OPPORTUNITIES_KEY, "1");
    } catch {
      // UI-only preference; storage may be disabled.
    }
    setOpportunitiesVisited(true);
    onNavigate("opportunities");
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
    <div className="px-4 pb-10 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <header className="border-rule flex flex-col gap-4 border-b py-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-[10px] tracking-[0.2em] text-ink/40">
              今日 / 01
            </p>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1 className="font-serif text-2xl tracking-tight sm:text-3xl">
                今天
              </h1>
              <p className="font-mono text-[11px] tabular-nums text-ink/45">
                {now.format("YYYY年M月D日")} · {DAY_LABELS[dayIndexOf(now)]}
                {weekLabel ? ` · ${weekLabel}` : ""}
              </p>
            </div>
            <p className="mt-2 text-xs leading-5 text-ink/55">
              {timetable?.semester.name ?? "课表未导入"} ·{" "}
              {assignments
                ? `未完成 ${pending.length} 项`
                : "作业未导入"}
              {currentWeek === null && timetable?.semester.startDate
                ? " · 今天不在学期周次内"
                : ""}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {profile === null && !showOnboarding && (
              <button
                type="button"
                onClick={reopenOnboarding}
                className={BTN_SECONDARY}
              >
                建档
              </button>
            )}
            <button
              type="button"
              onClick={() => onNavigate("timetable")}
              className={BTN_SECONDARY}
            >
              课表
            </button>
            <button
              type="button"
              onClick={() => onNavigate("assignments")}
              className={BTN_SECONDARY}
            >
              作业
            </button>
          </div>
        </header>

        {timetable && (
          <div className="border-rule flex flex-wrap items-center gap-x-4 gap-y-2 border-b py-2.5">
            <p className="font-mono text-[10px] tracking-[0.08em] text-ink/35">
              今日课程
            </p>
            {courses.length > 0 ? (
              courses.slice(0, 4).map((course) => (
                <p
                  key={`${course.course.id}-${course.startPeriod}`}
                  className="flex min-w-0 items-baseline gap-2 text-[11px] text-ink/60"
                >
                  <span className="font-mono text-[10px] tabular-nums text-ink/35">
                    {course.startPeriod}-{course.endPeriod} 节
                  </span>
                  <span className="truncate font-medium text-ink/75">
                    {course.course.name}
                  </span>
                  {course.location && (
                    <span className="hidden truncate text-[10px] text-ink/30 sm:inline">
                      {course.location}
                    </span>
                  )}
                </p>
              ))
            ) : (
              <p className="text-[11px] text-ink/40">
                今天没有课。
                {currentWeek === null &&
                  timetable.semester.startDate &&
                  " 今天不在课表周次内。"}
              </p>
            )}
            {courses.length > 4 && (
              <p className="font-mono text-[10px] text-ink/30">
                还有 {courses.length - 4} 个时段
              </p>
            )}
          </div>
        )}

        <GettingStartedGuide
          profile={profile}
          notes={notes}
          experiences={experienceItems}
          demoMode={demoMode}
          sampleBusy={sampleSeeding}
          sampleError={sampleError}
          opportunitiesVisited={opportunitiesVisited}
          onStartOnboarding={startOnboarding}
          onWrite={focusCapture}
          onUseSample={() => void handleSample()}
          onNavigate={onNavigate}
          onVisitOpportunities={visitOpportunities}
        />

        {showTodayBrief && (
          <TodayBrief
            now={now}
            profile={profile}
            judgment={judgment}
            ledger={ledger}
          />
        )}

        {showOnboarding && (
          <div id="today-onboarding" className="scroll-mt-4">
            <TodayOnboarding
              onComplete={onOnboard}
              onDismiss={hideOnboarding}
            />
          </div>
        )}

        {showStarter && (
          <section className="border-amber/35 bg-amber/[0.05] mt-4 rounded-xl border px-4 py-3.5 sm:px-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium">课表和作业还没进来。</p>
                <p className="mt-0.5 text-[11px] leading-5 text-ink/50">
                  可以先看示例，也可以直接在下面留一条记录；不要求先填表。
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handleSample()}
                  disabled={sampleSeeding}
                  className="bg-ink text-paper inline-flex min-h-11 items-center rounded-lg px-4 text-xs font-medium disabled:opacity-50"
                >
                  {sampleSeeding ? "正在准备…" : "用示例体验"}
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate("timetable")}
                  className={BTN_SECONDARY}
                >
                  导入课表
                </button>
              </div>
            </div>
            {sampleError && (
              <p role="alert" className="mt-2 text-[11px] text-red-800">
                {sampleError}
              </p>
            )}
          </section>
        )}

        {(saveError || intelError) && (
          <p
            role="alert"
            className="border-amber/50 bg-amber/[0.06] mt-4 rounded-lg border-l-2 px-3 py-2 text-xs leading-5 text-ink/75"
          >
            {saveError ?? intelError}
          </p>
        )}

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <div className="space-y-4">
            <Panel
              index="03"
              title="今日委托"
              action={
                <button
                  type="button"
                  onClick={() => onNavigate("assignments")}
                  className="hover:text-ink inline-flex min-h-9 items-center text-[11px] text-ink/45 underline underline-offset-4"
                >
                  全部作业
                </button>
              }
            >
              {!assignments ? (
                <EmptyBlock
                  text="还没有作业数据。可以先看示例，或者去作业页添加。"
                  actionLabel="去添加作业"
                  onAction={() => onNavigate("assignments")}
                />
              ) : pending.length === 0 ? (
                <div className="px-4 py-4 sm:px-5">
                  <p className="text-sm leading-6 text-ink/55">
                    今天没有未完成的作业。
                  </p>
                  <button
                    type="button"
                    onClick={() => onNavigate("assignments")}
                    className="mt-1 inline-flex min-h-11 items-center text-xs text-ink/50 underline underline-offset-4 hover:text-ink"
                  >
                    看看之后的 DDL →
                  </button>
                </div>
              ) : (
                <>
                  <ul>
                    {pending.slice(0, 3).map((item) => (
                      <PendingRow
                        key={item.id}
                        item={item}
                        now={now}
                        onToggle={() => void handleToggle(item)}
                      />
                    ))}
                  </ul>
                  {pending.length > 3 && (
                    <div className="border-rule flex items-center justify-between border-t px-4 py-2 text-[10px] text-ink/40 sm:px-5">
                      <span>还有 {pending.length - 3} 项</span>
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

              {completedToday.length > 0 && (
                <div className="border-rule bg-ink/[0.015] border-t px-4 py-2.5 sm:px-5">
                  <p className="font-mono text-[9px] tracking-[0.08em] text-ink/35">
                    今天已划掉 · {completedToday.length}
                  </p>
                  <ul className="mt-1 space-y-1">
                    {completedToday.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center gap-2 text-[11px]"
                      >
                        <CheckGlyph />
                        <span className="min-w-0 flex-1 truncate text-ink/50 line-through">
                          {item.title}
                        </span>
                        <button
                          type="button"
                          onClick={() => void handleToggle(item)}
                          className="shrink-0 text-ink/40 underline underline-offset-2 hover:text-ink"
                        >
                          撤销
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Panel>

            <CaptureBox
              now={now}
              notes={notes}
              prompts={prompts}
              onAddNote={onAddNote}
            />
          </div>

          <div className="space-y-4">
            <Panel
              index="05"
              title="今日情报"
              action={
                <span className="font-mono text-[9px] text-ink/30">
                  {intel.length} 条
                </span>
              }
            >
              {CALENDAR_ISSUE ? (
                <div className="px-4 py-4 text-[11px] leading-5 text-amber sm:px-5">
                  {CALENDAR_ISSUE}
                </div>
              ) : intel.length === 0 ? (
                <div className="px-4 py-4 sm:px-5">
                  <p className="text-sm leading-6 text-ink/55">
                    近期没有已公布日期的情报。
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-ink/40">
                    未公布日期的条目只留在日历里，不猜时间。
                  </p>
                  <button
                    type="button"
                    onClick={() => onNavigate("calendar")}
                    className="mt-1 inline-flex min-h-11 items-center text-xs text-ink/50 underline underline-offset-4 hover:text-ink"
                  >
                    去日历看看 →
                  </button>
                </div>
              ) : (
                <>
                  <ul>
                    {intel.map((item) => {
                      const saved = intelSaved(item);
                      return (
                        <li
                          key={item.id}
                          className="border-rule border-t px-4 py-3 first:border-t-0 sm:px-5"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={[
                                "shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[9px]",
                                CATEGORY_CHIP[item.category],
                              ].join(" ")}
                            >
                              {CALENDAR_CATEGORY_LABELS[item.category]}
                            </span>
                            <span className="min-w-0 truncate font-mono text-[9px] text-ink/35">
                              {item.sourceType === "sample"
                                ? "示例 · 待核对"
                                : item.sourceName}
                            </span>
                            <span className="ml-auto shrink-0 font-mono text-[9px] text-ink/35">
                              {calendarTimingLabel(item)}
                            </span>
                          </div>
                          <p className="mt-1.5 text-sm leading-5 font-medium">
                            {item.title}
                          </p>
                          <p className="mt-0.5 text-[10px] leading-5 text-ink/45">
                            {[item.organizer, whyRelevant(item, profile)]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                          <div className="mt-1.5 flex items-center justify-between gap-2">
                            {item.sourceUrl ? (
                              <a
                                href={item.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex min-h-9 items-center text-[10px] text-ink/50 underline underline-offset-2 hover:text-ink"
                              >
                                官网 ↗
                              </a>
                            ) : (
                              <span className="text-[10px] text-ink/30">
                                {item.sourceType === "sample"
                                  ? "示例节点"
                                  : "来源待补"}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => void handleIntelNote(item)}
                              disabled={saved || intelBusy === item.id}
                              className="border-rule hover:bg-ink/[0.03] inline-flex min-h-9 items-center rounded-md border px-2.5 text-[10px] text-ink/55 disabled:opacity-45"
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
                  <div className="border-rule flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t px-4 py-2 text-[10px] leading-5 text-ink/35 sm:px-5">
                    <span>只写官方已公布的时间，未公布不猜。</span>
                    <button
                      type="button"
                      onClick={() => onNavigate("calendar")}
                      className="shrink-0 text-ink/45 underline underline-offset-2 hover:text-ink"
                    >
                      完整日历 →
                    </button>
                  </div>
                </>
              )}
            </Panel>

            {experienceItems.length > 0 && (
              <Panel
                index="06"
                title="回声"
              action={
                <button
                  type="button"
                  onClick={() => onNavigate("experiences")}
                  className="hover:text-ink inline-flex min-h-9 items-center text-[11px] text-ink/45 underline underline-offset-4"
                >
                  经历库
                </button>
              }
            >
              {!echo ? (
                <div className="px-4 py-4 sm:px-5">
                  <p className="text-sm leading-6 text-ink/55">
                    还没有可回声的战绩。
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-ink/40">
                    今天写下第一条，过几天这里会把它送回来。
                  </p>
                  <button
                    type="button"
                    onClick={() => onNavigate("experiences")}
                    className="mt-1 inline-flex min-h-11 items-center text-xs text-ink/50 underline underline-offset-4 hover:text-ink"
                  >
                    去记一条 →
                  </button>
                </div>
              ) : (
                <div className="px-4 py-4 sm:px-5">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span
                      className="rounded-full px-1.5 py-0.5 font-mono text-[9px]"
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
                    <span className="font-mono text-[9px] text-ink/35">
                      {echo.label}
                    </span>
                    <span className="font-mono text-[9px] text-ink/25">
                      {formatExperienceRange(
                        echo.experience.start,
                        echo.experience.end,
                      )}
                    </span>
                  </div>
                  <p className="mt-2 font-serif text-lg leading-7">
                    {echo.experience.title}
                  </p>
                  <p className="mt-1.5 line-clamp-3 text-[11px] leading-5 text-ink/55">
                    “{echo.quote}”
                  </p>
                  <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-1">
                      {echo.experience.skills.slice(0, 3).map((skill) => (
                        <span
                          key={skill}
                          className="bg-ink/[0.04] rounded-full px-1.5 py-0.5 font-mono text-[9px] text-ink/45"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigate("experiences")}
                      className="inline-flex min-h-9 items-center text-[10px] text-ink/50 underline underline-offset-4 hover:text-ink"
                    >
                      看看原文 →
                    </button>
                  </div>
                </div>
              )}
              </Panel>
            )}
          </div>
        </div>

        {showHeatmap && (
          <LedgerHeatmap
            now={now}
            ledger={ledger}
            stats={stats}
            readiness={readiness}
            onOpenExperiences={() => onNavigate("experiences")}
            onOpenResume={() => onNavigate("resume")}
          />
        )}

        <p className="mt-6 flex items-center gap-2 text-[11px] text-ink/35">
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
    <section className="border-rule overflow-hidden rounded-xl border bg-surface">
      <header className="border-rule flex items-center justify-between gap-3 border-b px-4 py-2 sm:px-5">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[10px] tracking-[0.12em] text-accent-ink">
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

function PendingRow({
  item,
  now,
  onToggle,
}: {
  item: Assignment;
  now: Dayjs;
  onToggle: () => void;
}) {
  const tier = ddlTier(item.due, now);
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
          {dueLabel(item.due, now)}
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
