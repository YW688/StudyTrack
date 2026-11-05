import dayjs from "dayjs";
import channelsRaw from "../../../data/channels.json";
import { createDemoSeed } from "../../store/fixtures/demo";
import { CALENDAR_ITEMS, CALENDAR_UPDATED_AT } from "../../store/calendar";
import { currentWeekOf, dateOfDay, formatWeeksLabel } from "../../parse/schedule";
import {
  JOB_LIBRARY_NOTE,
  JOB_POSTINGS,
  QUALIFICATION_LABELS,
  buildMatchContext,
  qualifyJob,
  rankJobs,
} from "../../search";
import { formatGradeFit } from "../../lib/opportunities";
import {
  briefingAside,
  briefingSegment,
  buildTodayJudgment,
  coursesOnDay,
  pendingAssignments,
  pickEcho,
  pickEchoQueue,
  weekdayOf,
} from "../../lib/today";
import { SKY_TYPE_COLORS, buildSky, starPoint } from "../../lib/sky";
import { CONSTELLATIONS } from "../../lib/constellations";
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
} from "../../lib/ledger";
import {
  buildTermAxis,
  countResumeReady,
  experienceKindLabel,
  formatExperienceRange,
  readyExperienceIds,
  relativeDaysLabel,
  resumeReadiness,
  EXPERIENCE_KINDS,
} from "../../lib/experience";
import {
  collectSkills,
  contactParts,
  educationParts,
  rawDisplayBullets,
} from "../../lib/resume";
import { ddlTier, formatDue } from "../../lib/ddl";
import {
  calendarTimingLabel,
  pickRelevantCalendarItems,
  whyRelevant,
} from "../../lib/calendar";
import {
  ASSIGNMENT_KIND_LABELS,
  CALENDAR_CATEGORY_LABELS,
  JOB_TYPE_LABELS,
  MATCH_TIER_LABELS,
  type ExperienceKind,
} from "../../types";

const DAY_LABELS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
const TIER_TEXT: Record<string, string> = {
  overdue: "已逾期",
  urgent: "24 小时内",
  soon: "3 天内",
  later: "",
  none: "",
};

const seed = createDemoSeed();
const now = dayjs();
const week = currentWeekOf(
  seed.timetable.semester.startDate,
  seed.timetable.semester.totalWeeks,
  now,
);
const weekday = weekdayOf(now);
const courses = coursesOnDay(seed.timetable, week, weekday);
const pending = pendingAssignments(seed.assignments.items);
const experiences = seed.experiences.experiences;
const echo = pickEcho(experiences, now);
const readiness = computeReadiness(seed.profile, experiences);
const level = characterLevel(experiences);
const streak = streakInfo(seed.ledger, now);
const weekCompare = weekOverWeek(seed.ledger, now);
const yesterday = settleDay(seed.ledger, previousStudyDateKey(now));
const intel = pickRelevantCalendarItems(CALENDAR_ITEMS, seed.profile, 4, now);
const termAxis = buildTermAxis(experiences, now);

const semester = seed.timetable.semester;

function sessionsOf(weekNumber: number) {
  return seed.timetable.courses.flatMap((course) =>
    course.sessions
      .filter((item) => item.weeks.includes(weekNumber))
      .map((item) => ({
        day: item.day,
        dayLabel: DAY_LABELS[item.day - 1] ?? "",
        name: course.name,
        location: course.location ?? "",
        start: item.startPeriod,
        end: item.endPeriod,
        weeksLabel: formatWeeksLabel(item.weeks),
        color: course.color ?? "slate",
      })),
  );
}

/**
 * 课表示例图取整学期排课最密的那一周
 * 落地页的截图不能随真实日历滑到空白周
 */
const shotWeek = (() => {
  let best = 1;
  let bestCount = -1;
  const totalWeeks = semester.totalWeeks;
  for (let candidate = 1; candidate <= totalWeeks; candidate += 1) {
    const count = sessionsOf(candidate).length;
    if (count > bestCount) {
      bestCount = count;
      best = candidate;
    }
  }
  return best;
})();

const shotSessions = sessionsOf(shotWeek);
const shotMaxPeriod = Math.max(
  8,
  ...shotSessions.map((item) => item.end),
);

export const TIMETABLE_SHOT = {
  weekLabel: `第 ${shotWeek} 周`,
  semesterName: semester.name,
  periodCount: shotMaxPeriod,
  days: ([1, 2, 3, 4, 5, 6, 7] as const).map((day) => ({
    label: DAY_LABELS[day - 1] ?? "",
    date: dateOfDay(semester.startDate, shotWeek, day) ?? "",
    isToday: shotWeek === week && weekday === day,
    sessions: shotSessions.filter((item) => item.day === day),
  })),
};

/** 匹配分 命中 待补 资格都走征召页那套本地引擎 */
const matchContext = buildMatchContext(seed.resume, experiences, JOB_POSTINGS);
const rankedMatches = rankJobs(JOB_POSTINGS, matchContext);
const readyIds = readyExperienceIds(experiences);
const experienceTitle = new Map(
  experiences.map((item) => [item.id, item.title]),
);

const demoJobs = rankedMatches.map((match) => {
  const job = JOB_POSTINGS.find((item) => item.id === match.jobId);
  const qual = qualifyJob(match, readyIds);
  return {
    id: match.jobId,
    company: job?.company ?? "",
    title: job?.title ?? "",
    city: job?.city ?? "",
    cohort: job?.cohort ?? "",
    initial: (job?.company ?? "").slice(0, 1),
    typeLabel: job ? JOB_TYPE_LABELS[job.type] : "",
    gradeFit: job ? formatGradeFit(job.gradeFit) : "",
    sourceName: job?.sourceName ?? "",
    score: match.score,
    tierLabel: MATCH_TIER_LABELS[match.tier],
    qual: QUALIFICATION_LABELS[qual.tier],
    requirementCount: job?.requirements.length ?? 0,
    skillLine: job
      ? `${match.matchedSkills.length}/${job.skills.length} 技能`
      : "未识别技能",
    hits: match.hits.map((hit) => ({
      requirement: hit.requirement,
      quote: hit.quote,
      title: experienceTitle.get(hit.experienceId) ?? "已删除的经历",
    })),
    gaps: match.gaps.map((gap) => ({
      requirement: gap.requirement,
      advice: gap.advice,
    })),
  };
});

const relevantPool = rankedMatches.filter((match) => match.tier !== "low");
const missingPool =
  relevantPool.length > 0 ? relevantPool : rankedMatches.slice(0, 10);
const missingFrequency = new Map<string, number>();
for (const match of missingPool) {
  for (const skill of match.missingSkills) {
    if (skill === "待识别") continue;
    missingFrequency.set(skill, (missingFrequency.get(skill) ?? 0) + 1);
  }
}
const missingSkills = [...missingFrequency.entries()]
  .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-Hans-CN"))
  .map(([skill]) => skill);

const campusCount = JOB_POSTINGS.filter(
  (job) => job.type === "campus",
).length;

const bountyStats = [
  {
    label: "岗位库",
    value: JOB_POSTINGS.length,
    note: `${campusCount} 校招 ${JOB_POSTINGS.length - campusCount} 实习`,
  },
  {
    label: "高匹配",
    value: rankedMatches.filter((match) => match.tier === "high").length,
    note: "≥ 75 分 可直接尝试",
  },
  {
    label: "可尝试",
    value: rankedMatches.filter((match) => match.tier === "medium").length,
    note: "55–74 分 补一两项",
  },
  {
    label: "待补技能",
    value: missingSkills.length,
    note: missingSkills.length
      ? `常见 ${missingSkills.slice(0, 2).join(" ")}`
      : "暂无明显缺口",
  },
];

/** 简历纸只按已勾选的经历排版 技能与作品链接也只从这些条目里取 */
const selectedEntries = seed.resume.selectedExperienceIds
  .map((id) => experiences.find((item) => item.id === id))
  .filter((item): item is (typeof experiences)[number] => Boolean(item));

export const RESUME_SHOT = {
  name: seed.resume.basics.name,
  target: seed.resume.basics.target,
  contact: contactParts(seed.resume.basics).join(" · "),
  education: educationParts(seed.resume.basics).join(" · "),
  skills: collectSkills(selectedEntries).join(" · "),
  entries: selectedEntries.map((item) => ({
    title: item.title,
    org: item.org ?? "",
    range: formatExperienceRange(item.start, item.end),
    bullets: rawDisplayBullets(item).map((bullet) => bullet.text),
  })),
};

const inboxRows = seed.notes.map((note) => {
  const at = dayjs(note.createdAt);
  return {
    text: note.text,
    time: at.isAfter(now.startOf("day"))
      ? `今天 ${at.format("HH:mm")}`
      : at.format("M月D日 HH:mm"),
  };
});

const feedRows = experiences.map((item) => {
  const days = Math.max(
    0,
    now.startOf("day").diff(dayjs(item.createdAt).startOf("day"), "day"),
  );
  const readiness = resumeReadiness(item);
  return {
    id: item.id,
    title: item.title,
    recordedAt: `记于 ${relativeDaysLabel(days)}`,
    readyLine: readiness.ready
      ? "简历就绪"
      : `差 ${readiness.missing.slice(0, 2).join(" ")}`,
  };
});

/** 学径空间的星点用真实星图同一套播种 位置与颜色都来自 buildSky */
const sky = buildSky(seed.ledger, now);
const skyPoints = sky.stars.map((star) => {
  const point = starPoint(star.seed, 100, 100);
  return {
    key: star.key,
    label: star.label,
    count: star.count,
    isToday: star.isToday,
    x: point.x,
    y: point.y,
    color: SKY_TYPE_COLORS[star.eventType],
  };
});
const skyRecent = sky.stars.slice(-4).reverse().map((star) => ({
  key: star.key,
  label: star.label,
  count: star.count,
  isToday: star.isToday,
}));
const skySelectedStar =
  sky.stars.find((star) => star.isToday) ??
  sky.stars[sky.stars.length - 1] ??
  null;
const skySelected = skySelectedStar
  ? {
      label: skySelectedStar.label,
      count: skySelectedStar.count,
      isToday: skySelectedStar.isToday,
      events: skySelectedStar.events.map((event) => ({
        typeLabel: event.typeLabel,
        title: event.title,
        detail: event.detail,
      })),
    }
  : null;
const echoQueue = pickEchoQueue(experiences, now);

export const DEMO = {
  semesterName: seed.timetable.semester.name,
  weekLabel: week === null ? "开学日期未设" : `第 ${week} 周`,
  dayLabel: DAY_LABELS[weekday - 1] ?? "",
  dateLabel: now.format("YYYY年M月D日"),
  shortDateLabel: now.format("M 月 D 日"),
  briefing: briefingSegment(now),
  judgment: buildTodayJudgment({
    now,
    profile: seed.profile,
    courses,
    pending,
    ledger: seed.ledger,
    weekUnknown: week === null,
  }),
  aside: briefingAside({
    intel: intel[0]
      ? { title: intel[0].title, timing: calendarTimingLabel(intel[0]) }
      : null,
    readyCount: level.ready,
    pendingCount: pending.length,
  }),
  todaySessions: courses.map((item) => ({
    periods: `${item.startPeriod}-${item.endPeriod} 节`,
    name: item.course.name,
    location: item.location ?? item.course.location ?? "",
  })),
  weekSessions: week === null ? [] : sessionsOf(week),
  pendingCount: pending.length,
  pendingRows: pending.map((item) => ({
    title: item.title,
    kindLabel: ASSIGNMENT_KIND_LABELS[item.kind],
    dueLabel: formatDue(item.due),
    tierText: TIER_TEXT[ddlTier(item.due, now)] ?? "",
  })),
  doneToday: seed.assignments.items.filter(
    (item) =>
      item.status === "done" && dayjs(item.createdAt).isSame(now, "day"),
  ),
  captureCount: seed.notes.filter((note) =>
    dayjs(note.createdAt).isSame(now, "day"),
  ).length,
  settlement: [
    { label: "完成作业", value: yesterday.counts.assignment_done },
    { label: "新增战绩", value: yesterday.counts.experience_added },
    { label: "补充证据", value: yesterday.counts.evidence_added },
    { label: "留下记录", value: yesterday.counts.note_added },
  ],
  settlementEmpty: yesterday.empty,
  weekGreen: weekCompare,
  weekLine: weekCompareLine(weekCompare),
  streakLine: comboLine(streak.days, streak.includesToday),
  readinessScore: readiness.score,
  readinessLabel: readiness.label,
  levelUp: levelUpLine(level),
  levelNumber: level.level,
  echo: echo
    ? {
        kindLabel: experienceKindLabel(echo.experience.kind),
        label: echo.label,
        range: formatExperienceRange(echo.experience.start, echo.experience.end),
        title: echo.experience.title,
        quote: echo.quote,
        tierText: tierLine(echo.experience),
        stars: tierStars(echo.experience),
      }
    : null,
  intel: intel.map((item) => ({
    categoryLabel: CALENDAR_CATEGORY_LABELS[item.category],
    title: item.title,
    timing: calendarTimingLabel(item),
    organizer: `${item.organizer ?? ""} ${whyRelevant(item, seed.profile)}`.trim(),
  })),
  experiences: experiences.map((item) => ({
    id: item.id,
    kindLabel: experienceKindLabel(item.kind),
    title: item.title,
    org: item.org ?? "",
    range: formatExperienceRange(item.start, item.end),
    stars: tierStars(item),
    tierText: tierLine(item),
    ready: resumeReadiness(item).ready,
    missing: resumeReadiness(item).missing,
    metrics: item.metrics.map((m) => ({ label: m.label, value: m.value })),
    evidence: item.evidence.map((e) => e.label),
    skills: item.skills,
    parts: [
      { label: "问题", text: item.problem },
      { label: "方法", text: item.method },
      { label: "我的贡献", text: item.contribution },
      { label: "结果", text: item.result },
    ],
  })),
  kindFilters: [
    { label: "全部", count: experiences.length },
    ...EXPERIENCE_KINDS.map((kind) => ({
      label: experienceKindLabel(kind as ExperienceKind),
      count: experiences.filter((item) => item.kind === kind).length,
    })).filter((item) => item.count > 0),
  ],
  terms: termAxis.map((cell) => ({
    label: cell.term.label,
    count: cell.count,
  })),
  timeline: [...experiences]
    .sort((a, b) => (b.start ?? "").localeCompare(a.start ?? ""))
    .map((item) => ({
      title: item.title,
      kindLabel: experienceKindLabel(item.kind),
      range: formatExperienceRange(item.start, item.end),
      summary: item.result.trim() || item.problem.trim(),
    })),
  readyCount: countResumeReady(experiences),
  totalExperiences: experiences.length,
  notes: seed.notes.map((note) => note.text),
  inbox: inboxRows,
  feed: feedRows,
  jobs: demoJobs,
  bountyStats,
  jobLibraryCount: JOB_POSTINGS.length,
  jobLibraryNote: JOB_LIBRARY_NOTE,
  jobSearchHint: "检索岗位 公司 城市 技能 如 React 数据 杭州",
  qualifiedCount: demoJobs.filter((job) => job.qual === "够格").length,
  nearCount: demoJobs.filter((job) => job.qual === "差一步").length,
  readyForMatchCount: readyIds.size,
  channelCount: channelsRaw.length,
  space: {
    litCount: sky.stars.length,
    totalEvents: sky.totalEvents,
    todayLit: sky.stars.some((star) => star.isToday),
    points: skyPoints,
    recent: skyRecent,
    selected: skySelected,
    echoLabel: echo ? echo.label : "还没有",
    meteorCount: echoQueue.length,
    constellation: CONSTELLATIONS[0],
  },
  profile: seed.profile,
  resume: {
    basics: seed.resume.basics,
    selected: seed.resume.selectedExperienceIds
      .map((id) => experiences.find((item) => item.id === id)?.title)
      .filter((title): title is string => Boolean(title)),
  },
};

/** 落地页三处战绩卡共用同一条 保证示例图与工作台一致 */
export const FEATURED_EXPERIENCE =
  DEMO.experiences.find((item) => item.ready) ?? DEMO.experiences[0] ?? null;

/** 真实简历纸的栏目顺序是 教育 经历 技能 作品链接 */
export const RESUME_EDUCATION_LINE = `${DEMO.resume.basics.school} · ${DEMO.resume.basics.major} · ${DEMO.resume.basics.grade}`;

/** 工具箱四项照抄工具箱页 字段名与 Tool 一致 hint 是主说明 meta 是右下角次要信息 */
export const TOOL_ROWS = [
  {
    no: "01",
    label: "课表",
    hint: "Excel 导入 单双周展开 周视图",
    meta: "上课时间与教室",
    tone: "var(--lp-tone-2)",
  },
  {
    no: "02",
    label: "作业",
    hint: "截图 粘贴或手动录入 按 DDL 排",
    meta: "未完成与完成状态",
    tone: "var(--lp-tone-3)",
  },
  {
    no: "03",
    label: "简历",
    hint: "勾选经历自动排版 浏览器打印 A4",
    meta: "只导出你确认过的内容",
    tone: "var(--lp-tone-5)",
  },
  {
    no: "04",
    label: "日历",
    hint: "竞赛 考试报名 校内节点",
    meta: CALENDAR_UPDATED_AT
      ? `${CALENDAR_ITEMS.length} 条 更新于 ${dayjs(CALENDAR_UPDATED_AT).format(
          "M月D日",
        )}`
      : `${CALENDAR_ITEMS.length} 条 更新日期待补`,
    tone: "var(--lp-tone-1)",
  },
];
