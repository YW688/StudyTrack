import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import type {
  ChannelType,
  Experience,
  ExperienceData,
  JobFamily,
  JobPosting,
  JobType,
  ResumeData,
} from "../../types";
import {
  CHANNEL_TYPE_LABELS,
  JOB_TYPE_LABELS,
  MATCH_TIER_LABELS,
} from "../../types";
import {
  JOB_FAMILIES,
  MATCH_TIER_BAR,
  MATCH_TIER_CHIP,
  companyTone,
  currentMonth,
  formatGradeFit,
  formatMonthRanges,
} from "../../lib/opportunities";
import {
  CHANNELS,
  CHANNEL_LIBRARY_ISSUE,
  CHANNEL_LIBRARY_NOTE,
  JOB_LIBRARY_ISSUE,
  JOB_LIBRARY_NOTE,
  JOB_POSTINGS,
  QUALIFICATION_LABELS,
  buildMatchContext,
  qualifyJob,
  rankJobs,
  type QualificationTier,
} from "../../search";
import { createJobIndex, searchJobScores } from "../../search/bm25";
import { readyExperienceIds } from "../../lib/experience";
import MatchDetail from "./MatchDetail";
import PasteJdDialog from "./PasteJdDialog";
import SourceCheckBadge from "../../components/SourceCheckBadge";
import {
  SOURCE_CHECKS,
  SOURCE_CHECKED_AT,
  SOURCE_CHECK_POLICY,
  getSourceCheck,
} from "../../store/sourceChecks";

interface OpportunitiesPageProps {
  experiences: ExperienceData | null;
  resume: ResumeData;
  onNavigateResume: () => void;
  onNavigateExperiences: () => void;
  onUseSample: () => Promise<void>;
}

const EMPTY_EXPERIENCES: Experience[] = [];
const BTN_PRIMARY =
  "bg-ink text-paper inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40";
const BTN_SECONDARY =
  "border-rule hover:bg-ink/[0.03] inline-flex min-h-11 items-center justify-center rounded-lg border bg-surface px-3 text-xs disabled:cursor-not-allowed disabled:opacity-40";
const LINK_ACTION =
  "text-accent-ink inline-flex min-h-8 items-center text-micro font-medium underline underline-offset-2 hover:text-ink";

const CHANNEL_TABS: { id: "all" | ChannelType; label: string }[] = [
  { id: "all", label: "全部" },
  { id: "campus", label: "校招官网" },
  { id: "platform", label: "招聘平台" },
  { id: "public", label: "公共服务" },
];

const TYPE_TABS: { id: "all" | JobType; label: string }[] = [
  { id: "all", label: "全部" },
  { id: "campus", label: "校招" },
  { id: "intern", label: "实习" },
];

const QUALIFICATION_CHIP_CLASS: Record<QualificationTier, string> = {
  qualified: "chip-ok-line",
  near: "border-amber/40 bg-amber/10 text-amber-ink",
  far: "border-rule bg-ink/[0.04] text-ink-4",
};

export default function OpportunitiesPage({
  experiences,
  resume,
  onNavigateResume,
  onNavigateExperiences,
  onUseSample,
}: OpportunitiesPageProps) {
  const [customJob, setCustomJob] = useState<JobPosting | null>(null);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | JobType>("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [familyFilter, setFamilyFilter] = useState<"all" | JobFamily>("all");
  const [qualFilter, setQualFilter] = useState<"all" | QualificationTier>("all");
  const [channelType, setChannelType] = useState<"all" | ChannelType>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "detail">("list");
  const [pasteOpen, setPasteOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [seedError, setSeedError] = useState<string | null>(null);
  const [seedBusy, setSeedBusy] = useState(false);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 8000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const items = experiences?.experiences ?? EMPTY_EXPERIENCES;
  const allJobs = useMemo(
    () => (customJob ? [customJob, ...JOB_POSTINGS] : JOB_POSTINGS),
    [customJob],
  );
  const context = useMemo(
    () => buildMatchContext(resume, items, allJobs),
    [resume, items, allJobs],
  );
  const matches = useMemo(
    () => rankJobs(allJobs, context),
    [allJobs, context],
  );
  const readyIds = useMemo(() => readyExperienceIds(items), [items]);
  const qualifications = useMemo(
    () =>
      new Map(matches.map((match) => [match.jobId, qualifyJob(match, readyIds)])),
    [matches, readyIds],
  );
  const jobById = useMemo(
    () => new Map(allJobs.map((job) => [job.id, job])),
    [allJobs],
  );
  const jobIndex = useMemo(() => createJobIndex(allJobs), [allJobs]);
  const searchScores = useMemo(
    () =>
      query.trim() ? searchJobScores(jobIndex, query.trim()) : null,
    [jobIndex, query],
  );

  const visible = useMemo(
    () =>
      matches.filter((match) => {
        const job = jobById.get(match.jobId);
        if (!job) return false;
        if (typeFilter !== "all" && job.type !== typeFilter) return false;
        if (cityFilter !== "all" && job.city !== cityFilter) return false;
        if (familyFilter !== "all" && job.family !== familyFilter) {
          return false;
        }
        if (
          qualFilter !== "all" &&
          qualifications.get(match.jobId)?.tier !== qualFilter
        ) {
          return false;
        }
        if (searchScores && !searchScores.has(job.id)) return false;
        return true;
      }),
    [
      matches,
      jobById,
      typeFilter,
      cityFilter,
      familyFilter,
      qualFilter,
      qualifications,
      searchScores,
    ],
  );

  const selectedMatch =
    visible.find((match) => match.jobId === selectedId) ??
    visible[0] ??
    null;
  const selectedJob = selectedMatch
    ? jobById.get(selectedMatch.jobId) ?? null
    : null;

  useEffect(() => {
    document
      .getElementById("match-detail-pane")
      ?.scrollTo({ top: 0 });
  }, [selectedMatch?.jobId]);

  const cityOptions = useMemo(
    () =>
      [...new Set(allJobs.map((job) => job.city))]
        .filter((city) => city !== "未填写")
        .sort((a, b) => a.localeCompare(b, "zh-Hans-CN")),
    [allJobs],
  );
  const familyOptions = useMemo(() => {
    const present = new Set(allJobs.map((job) => job.family));
    const list = JOB_FAMILIES.filter((family) => present.has(family));
    if (present.has("其他")) list.push("其他");
    return list;
  }, [allJobs]);

  const filtersActive =
    query.trim().length > 0 ||
    typeFilter !== "all" ||
    cityFilter !== "all" ||
    familyFilter !== "all" ||
    qualFilter !== "all";

  const qualifiedCount = matches.filter(
    (match) => qualifications.get(match.jobId)?.tier === "qualified",
  ).length;
  const nearCount = matches.filter(
    (match) => qualifications.get(match.jobId)?.tier === "near",
  ).length;
  const farCount = matches.length - qualifiedCount - nearCount;

  const profile = context.profile;
  const incomplete = profile.completeness.filter((item) => !item.done);
  const campusCount = allJobs.filter((job) => job.type === "campus").length;
  const internCount = allJobs.length - campusCount;
  const highCount = matches.filter((match) => match.tier === "high").length;
  const mediumCount = matches.filter(
    (match) => match.tier === "medium",
  ).length;

  const relevantMatches = matches.filter((match) => match.tier !== "low");
  const missingPool =
    relevantMatches.length > 0 ? relevantMatches : matches.slice(0, 10);
  const missingFrequency = new Map<string, number>();
  for (const match of missingPool) {
    for (const skill of match.missingSkills) {
      if (skill === "待识别") continue;
      missingFrequency.set(skill, (missingFrequency.get(skill) ?? 0) + 1);
    }
  }
  const missingList = [...missingFrequency.entries()].sort(
    (a, b) =>
      b[1] - a[1] || a[0].localeCompare(b[0], "zh-Hans-CN"),
  );
  const topMissing = missingList.slice(0, 3).map(([skill]) => skill);

  const filteredChannels = CHANNELS.filter(
    (channel) => channelType === "all" || channel.type === channelType,
  );
  const typeTabs = TYPE_TABS.filter(
    (tab) =>
      tab.id === "all" || allJobs.some((job) => job.type === tab.id),
  );
  const channelTabs = CHANNEL_TABS.filter(
    (tab) =>
      tab.id === "all" ||
      CHANNELS.some((channel) => channel.type === tab.id),
  );
  const month = currentMonth();
  const channelChecks = SOURCE_CHECKS.filter(
    (check) => check.kind === "channel",
  );
  const jobChecks = SOURCE_CHECKS.filter((check) => check.kind === "job");
  const channelOk = channelChecks.filter(
    (check) => check.status === "ok",
  ).length;
  const jobOk = jobChecks.filter((check) => check.status === "ok").length;

  const stats = [
    {
      label: "岗位库",
      value: allJobs.length,
      note: `${campusCount} 校招 ${internCount} 实习`,
    },
    {
      label: "高匹配",
      value: highCount,
      note: "≥ 75 分，可直接尝试",
    },
    {
      label: "可尝试",
      value: mediumCount,
      note: "55–74 分，补一两项",
    },
    {
      label: "待补技能",
      value: missingList.length,
      note:
        topMissing.length > 0
          ? `常见：${topMissing.slice(0, 2).join("、")}`
          : "暂无明显缺口",
    },
  ];

  const profileFields = [
    {
      label: "求职意向",
      value: profile.target,
      done: profile.target.length > 0,
    },
    {
      label: "年级 / 专业",
      value: [profile.grade, profile.major].filter(Boolean).join(" "),
      done: Boolean(profile.grade && profile.major),
    },
    {
      label: "意向城市",
      value: profile.city,
      done: profile.city.length > 0,
    },
    {
      label: "匹配经历",
      value: profile.usesSelected
        ? `简历已选 ${profile.selectedCount} 条`
        : profile.experienceCount > 0
          ? `全部 ${profile.experienceCount} 条（未勾选）`
          : "暂无经历",
      done: profile.usesSelected,
    },
  ];

  function resetFilters() {
    setQuery("");
    setTypeFilter("all");
    setCityFilter("all");
    setFamilyFilter("all");
    setQualFilter("all");
  }

  function selectJob(id: string) {
    setSelectedId(id);
    if (!window.matchMedia("(min-width: 1280px)").matches) {
      setView("detail");
      window.setTimeout(() => {
        document
          .getElementById("match-detail-pane")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 30);
    }
  }

  function backToList() {
    setView("list");
    window.setTimeout(() => {
      document
        .getElementById("job-list")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 30);
  }

  async function handleSeed() {
    setSeedBusy(true);
    setSeedError(null);
    try {
      await onUseSample();
      setNotice("已写入示例经历，匹配结果已按示例经历更新。");
    } catch {
      setSeedError("示例经历写入失败，请检查浏览器存储权限后重试。");
    } finally {
      setSeedBusy(false);
    }
  }

  function handleJdCreated(job: JobPosting, warnings: string[]) {
    setCustomJob(job);
    setSelectedId(job.id);
    setQuery("");
    setTypeFilter("all");
    setCityFilter("all");
    setFamilyFilter("all");
    setPasteOpen(false);
    setView("detail");
    setNotice(
      `已解析「${job.title}」，匹配结果已更新。${
        warnings.length > 0 ? warnings.join(" ") : ""
      }`.trim(),
    );
    window.setTimeout(() => {
      document
        .getElementById("match-detail-pane")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 40);
  }

  return (
    <div className="px-4 pb-16 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1440px]">
        <header className="border-rule flex flex-col gap-4 border-b py-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-micro tracking-[0.2em] text-ink-3">
              征召
            </p>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1 className="font-serif text-2xl tracking-tight sm:text-3xl">
                征召
              </h1>
              <span className="bg-ink/[0.05] rounded-full px-2 py-0.5 font-mono text-micro text-ink-3">
                {profile.usesSelected
                  ? `简历 ${profile.selectedCount} 条经历`
                  : profile.experienceCount > 0
                    ? `全部 ${profile.experienceCount} 条经历`
                    : "尚无经历"}
              </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-ink-3">
              {CHANNELS.length} 个官方入口 + {JOB_POSTINGS.length} 张演示岗位卡 把经历对到要求上：命中指回原文，缺口给出下一步
            </p>
            <p className="mt-1 font-mono text-micro leading-5 text-ink-4">
              来源核验：官方入口 {channelOk}/{CHANNELS.length} 可达 演示卡来源{" "}
              {jobOk}/{JOB_POSTINGS.length} 可达
              {SOURCE_CHECKED_AT
                ? ` 核验于 ${dayjs(SOURCE_CHECKED_AT).format("M月D日 HH:mm")}`
                : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onNavigateResume}
              className={BTN_SECONDARY}
            >
              编辑简历
            </button>
            <button
              type="button"
              onClick={() => setPasteOpen(true)}
              className={BTN_PRIMARY}
            >
              粘贴 JD 匹配
            </button>
          </div>
        </header>

        {notice && (
          <p
            role="status"
            className="border-rule mt-4 flex items-start gap-2 rounded-lg border bg-surface px-3 py-2 text-xs leading-5 text-ink-3"
          >
            <span
              aria-hidden="true"
              className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
            />
            <span>{notice}</span>
          </p>
        )}

        {seedError && (
          <p
            role="alert"
            className="border-amber/50 bg-amber/[0.07] mt-4 rounded-lg border-l-2 px-3 py-2 text-xs leading-5 text-ink-2"
          >
            {seedError}
          </p>
        )}

        {JOB_LIBRARY_ISSUE && (
          <p
            role="alert"
            className="border-amber/50 bg-amber/[0.07] mt-4 rounded-lg border-l-2 px-3 py-2 text-xs leading-5 text-ink-2"
          >
            {JOB_LIBRARY_ISSUE}。仍可粘贴一份 JD 做本地匹配。
          </p>
        )}

        {items.length === 0 && (
          <section className="border-accent/50 bg-accent/[0.06] mt-4 rounded-lg border-l-2 px-4 py-3">
            <p className="text-sm font-medium">还没有可匹配的经历</p>
            <p className="mt-1 text-[11px] leading-5 text-ink-3">
              命中项必须引用经历原文。先用示例经历走一遍，或去经历库写第一条。
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void handleSeed()}
                disabled={seedBusy}
                className={BTN_PRIMARY}
              >
                {seedBusy ? "正在写入…" : "用示例经历体验"}
              </button>
              <button
                type="button"
                onClick={onNavigateExperiences}
                className={BTN_SECONDARY}
              >
                打开经历库
              </button>
            </div>
          </section>
        )}

        <section
          aria-label="匹配概览"
          className="bg-rule border-rule mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border sm:grid-cols-4"
        >
          {stats.map((stat) => (
            <div key={stat.label} className="bg-surface px-4 py-3.5">
              <p className="font-mono text-micro tracking-[0.14em] text-ink-3">
                {stat.label}
              </p>
              <p className="mt-1.5 font-mono text-2xl leading-none tabular-nums">
                {stat.value}
              </p>
              <p className="mt-1.5 text-micro leading-4 text-ink-3">
                {stat.note}
              </p>
            </div>
          ))}
        </section>

        <section
          aria-label="匹配依据"
          className="border-rule mt-4 overflow-hidden rounded-xl border bg-surface"
        >
          <div className="border-rule flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium">匹配依据</p>
              <span className="bg-ink/[0.05] rounded-full px-2 py-0.5 font-mono text-micro text-ink-3">
                {profile.usesSelected ? "来自简历" : "全部经历"}
              </span>
            </div>
            <button
              type="button"
              onClick={onNavigateResume}
              className="inline-flex min-h-8 items-center text-micro text-ink-3 underline underline-offset-2 hover:text-ink"
            >
              修改意向与勾选
            </button>
          </div>
          <dl className="bg-rule grid grid-cols-2 gap-px sm:grid-cols-4">
            {profileFields.map((field) => (
              <div key={field.label} className="bg-surface px-4 py-3">
                <dt className="flex items-center gap-1.5 font-mono text-micro tracking-[0.12em] text-ink-3">
                  {field.label}
                  {!field.done && (
                    <span
                      aria-hidden="true"
                      className="h-1 w-1 rounded-full bg-amber"
                    />
                  )}
                </dt>
                <dd
                  className={`mt-1 text-xs leading-5 break-words ${
                    field.done ? "text-ink-2" : "text-ink-4"
                  }`}
                >
                  {field.value || "未填写"}
                </dd>
              </div>
            ))}
          </dl>
          <div className="border-rule flex flex-wrap items-center gap-1.5 border-t px-4 py-2.5">
            <span className="font-mono text-micro tracking-[0.1em] text-ink-4">
              技能底稿
            </span>
            {profile.skills.length > 0 ? (
              <>
                {profile.skills.slice(0, 10).map((skill) => (
                  <span
                    key={skill}
                    className="border-rule rounded-full border px-1.5 py-0.5 text-micro text-ink-3"
                  >
                    {skill}
                  </span>
                ))}
                {profile.skills.length > 10 && (
                  <span className="font-mono text-micro text-ink-4">
                    +{profile.skills.length - 10}
                  </span>
                )}
              </>
            ) : (
              <span className="text-micro text-ink-4">
                在经历里填写技能标签，匹配会更准
              </span>
            )}
            <span className="ml-auto text-micro text-ink-4">
              来自{profile.usesSelected ? "简历已选经历" : "全部经历"}
            </span>
          </div>
          {incomplete.length > 0 ? (
            <div className="border-rule bg-amber/[0.05] flex flex-wrap items-center justify-between gap-2 border-t px-4 py-2.5">
              <p className="text-micro leading-5 text-ink-3">
                补全后可提高排序准确度：
                {incomplete.map((item) => item.label).join("、")}
              </p>
              <button
                type="button"
                onClick={onNavigateResume}
                className={LINK_ACTION}
              >
                去简历补全
              </button>
            </div>
          ) : (
            <p className="border-rule border-t px-4 py-2.5 text-micro leading-5 text-ink-4">
              匹配依据齐全，排序已按求职意向、城市与年级加权。
            </p>
          )}
        </section>

        <section
          aria-label="筛选岗位"
          className="border-rule mt-4 overflow-hidden rounded-xl border bg-surface"
        >
          <div className="flex flex-col gap-2 p-3 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <label htmlFor="job-search" className="sr-only">
                检索岗位
              </label>
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                fill="none"
                className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-4"
              >
                <circle
                  cx="7"
                  cy="7"
                  r="4.5"
                  stroke="currentColor"
                  strokeWidth="1.4"
                />
                <path
                  d="m10.5 10.5 3 3"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
              <input
                id="job-search"
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="检索岗位、公司、城市或技能，如 React / 数据 / 杭州"
                className="border-rule focus-visible:border-accent-ink focus:ring-2 focus:ring-accent/45 min-h-11 w-full rounded-lg border bg-surface pr-11 pl-9 text-xs text-ink outline-none transition-colors placeholder:text-ink-4"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="清空检索"
                  className="hover:bg-ink/[0.04] absolute top-0 right-0 inline-flex h-11 w-11 items-center justify-center rounded-lg text-lg text-ink-4 hover:text-ink"
                >
                  ×
                </button>
              )}
            </div>

            <div
              role="group"
              aria-label="岗位类型"
              className="border-rule inline-flex rounded-lg border bg-surface p-0.5"
            >
              {typeTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  aria-pressed={typeFilter === tab.id}
                  onClick={() => setTypeFilter(tab.id)}
                  className={[
                    "min-h-10 rounded-md px-3 text-xs whitespace-nowrap",
                    typeFilter === tab.id
                      ? "bg-ink text-paper"
                      : "text-ink-3",
                  ].join(" ")}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <label className="sr-only" htmlFor="job-city">
              城市
            </label>
            <select
              id="job-city"
              value={cityFilter}
              onChange={(event) => setCityFilter(event.target.value)}
              className="border-rule focus-visible:border-accent-ink focus:ring-2 focus:ring-accent/45 min-h-11 rounded-lg border bg-surface px-2 text-xs text-ink-3 outline-none"
            >
              <option value="all">全部城市</option>
              {cityOptions.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>

            <label className="sr-only" htmlFor="job-family">
              职能方向
            </label>
            <select
              id="job-family"
              value={familyFilter}
              onChange={(event) =>
                setFamilyFilter(event.target.value as "all" | JobFamily)
              }
              className="border-rule focus-visible:border-accent-ink focus:ring-2 focus:ring-accent/45 min-h-11 rounded-lg border bg-surface px-2 text-xs text-ink-3 outline-none"
            >
              <option value="all">全部方向</option>
              {familyOptions.map((family) => (
                <option key={family} value={family}>
                  {family}
                </option>
              ))}
            </select>
          </div>

          <div
            role="group"
            aria-label="按应聘资格筛选"
            className="mt-2 flex flex-wrap items-center gap-1.5 px-3 pb-1"
          >
            <span className="font-mono text-micro tracking-[0.14em] text-ink-4">
              应聘资格
            </span>
            <QualPill
              active={qualFilter === "all"}
              label="全部"
              count={matches.length}
              onClick={() => setQualFilter("all")}
            />
            <QualPill
              active={qualFilter === "qualified"}
              label={QUALIFICATION_LABELS.qualified}
              count={qualifiedCount}
              onClick={() => setQualFilter("qualified")}
            />
            <QualPill
              active={qualFilter === "near"}
              label={QUALIFICATION_LABELS.near}
              count={nearCount}
              onClick={() => setQualFilter("near")}
            />
            <QualPill
              active={qualFilter === "far"}
              label={QUALIFICATION_LABELS.far}
              count={farCount}
              onClick={() => setQualFilter("far")}
            />
            <span className="text-micro ml-auto text-ink-4">
              按 {readyIds.size} 条简历就绪的战绩判定
              {readyIds.size === 0 && (
                <button
                  type="button"
                  onClick={onNavigateExperiences}
                  className="text-ink-3 ml-1 underline underline-offset-2 hover:text-ink"
                >
                  去补战绩
                </button>
              )}
            </span>
          </div>

          <div className="border-rule flex flex-wrap items-center justify-between gap-2 border-t px-3 py-2">
            <p className="max-w-2xl text-micro leading-4 text-ink-4">
              {JOB_LIBRARY_NOTE}
            </p>
            <div className="flex items-center gap-3">
              <span className="font-mono text-micro tabular-nums text-ink-3">
                显示 {visible.length} / {allJobs.length}
              </span>
              {filtersActive && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-ink-3 inline-flex min-h-8 items-center text-micro underline underline-offset-2 hover:text-ink"
                >
                  重置筛选
                </button>
              )}
            </div>
          </div>
        </section>

        <div className="mt-4 flex items-center justify-between gap-3 xl:hidden">
          <div
            className="border-rule inline-flex rounded-lg border bg-surface p-0.5"
            aria-label="切换岗位列表与详情"
          >
            <button
              type="button"
              aria-pressed={view === "list"}
              onClick={() => setView("list")}
              className={[
                "min-h-10 rounded-md px-3 text-xs",
                view === "list" ? "bg-ink text-paper" : "text-ink-3",
              ].join(" ")}
            >
              岗位列表
            </button>
            <button
              type="button"
              aria-pressed={view === "detail"}
              onClick={() => setView("detail")}
              className={[
                "min-h-10 rounded-md px-3 text-xs",
                view === "detail" ? "bg-ink text-paper" : "text-ink-3",
              ].join(" ")}
            >
              匹配详情
            </button>
          </div>
          <span className="font-mono text-micro tabular-nums text-ink-3">
            显示 {visible.length}
          </span>
        </div>

        <div className="mt-3 grid gap-4 xl:grid-cols-[minmax(0,400px)_minmax(0,1fr)] xl:items-start 2xl:grid-cols-[minmax(0,430px)_minmax(0,1fr)]">
          <section
            id="job-list"
            aria-label="岗位列表"
            className={view === "list" ? "scroll-mt-4" : "hidden xl:block"}
          >
            <div className="mb-2 flex items-baseline justify-between gap-2 px-1">
              <h2 className="text-xs font-medium">推荐结果</h2>
              <span className="font-mono text-micro tracking-[0.08em] text-ink-4">
                按匹配分降序 附官网
              </span>
            </div>

            <ul className="space-y-2">
              {visible.map((match) => {
                const job = jobById.get(match.jobId);
                if (!job) return null;
                const selected = selectedMatch?.jobId === job.id;
                const tone = companyTone(job.company);
                const qual = qualifications.get(job.id);
                const requirementTotal =
                  match.hits.length + match.gaps.length;
                const filled = Math.max(
                  0,
                  Math.min(10, Math.round(match.score / 10)),
                );

                return (
                  <li
                    key={job.id}
                    className={[
                      "overflow-hidden rounded-xl border bg-surface transition-colors",
                      selected
                        ? "border-ink/35 ring-1 ring-ink/10"
                        : "border-rule hover:border-ink/25 hover:bg-ink/[0.015]",
                    ].join(" ")}
                  >
                    <button
                      type="button"
                      onClick={() => selectJob(job.id)}
                      aria-current={selected ? "true" : undefined}
                      className="focus-visible:ring-accent w-full p-3.5 text-left focus-visible:ring-2 focus-visible:ring-inset focus-visible:outline-none"
                    >
                      <span className="flex items-start gap-3">
                        <span
                          aria-hidden="true"
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border font-serif text-base"
                          style={{
                            backgroundColor: tone.bg,
                            color: tone.text,
                            borderColor: tone.border,
                          }}
                        >
                          {job.company.slice(0, 1)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2">
                            <span className="truncate font-mono text-micro tracking-[0.08em] text-ink-3">
                              {job.company} {job.cohort}
                            </span>
                            {job.custom && (
                              <span className="border-ink/15 bg-ink/[0.05] shrink-0 rounded-full border px-1.5 py-0.5 text-micro text-ink-3">
                                粘贴
                              </span>
                            )}
                          </span>
                          <span className="mt-1 flex items-start justify-between gap-2">
                            <span className="text-[13px] leading-5 font-medium">
                              {job.title}
                            </span>
                            <span className="shrink-0 font-mono text-base leading-5 tabular-nums">
                              {match.score}
                            </span>
                          </span>
                          <span className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-micro text-ink-3">
                            <span>{JOB_TYPE_LABELS[job.type]}</span>
                            <span>{job.city}</span>
                            <span>{formatGradeFit(job.gradeFit)}</span>
                            {qual && (
                              <>
                                <span
                                  className={`inline-flex min-h-5 items-center rounded-full border px-1.5 ${QUALIFICATION_CHIP_CLASS[qual.tier]}`}
                                  title={
                                    qual.blockers.length > 0
                                      ? `差什么：${qual.blockers.join("；")}`
                                      : "可匹配要求全部由就绪战绩命中"
                                  }
                                >
                                  {QUALIFICATION_LABELS[qual.tier]}
                                </span>
                              </>
                            )}
                          </span>
                          <span className="mt-2 flex items-center gap-2">
                            <span
                              className={`inline-flex min-h-5 items-center rounded-full border px-1.5 text-micro ${MATCH_TIER_CHIP[match.tier]}`}
                            >
                              {MATCH_TIER_LABELS[match.tier]}
                            </span>
                            <span className="text-micro text-ink-3">
                              {requirementTotal > 0
                                ? `命中 ${match.hits.length}/${requirementTotal}`
                                : "待对照"}
                            </span>
                            <span className="ml-auto font-mono text-micro text-ink-4">
                              {job.skills.length > 0
                                ? `${match.matchedSkills.length}/${job.skills.length} 技能`
                                : "未识别技能"}
                            </span>
                          </span>
                          <span
                            aria-hidden="true"
                            className="mt-1.5 flex gap-0.5"
                          >
                            {Array.from({ length: 10 }, (_, index) => (
                              <span
                                key={index}
                                className={`h-1 flex-1 rounded-[1px] ${
                                  index < filled
                                    ? MATCH_TIER_BAR[match.tier]
                                    : "bg-ink/10"
                                }`}
                              />
                            ))}
                          </span>
                        </span>
                      </span>
                    </button>
                    <div className="border-rule flex items-center justify-between gap-2 border-t pr-1.5 pl-3.5">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span className="min-w-0 truncate font-mono text-micro text-ink-4">
                          {job.custom
                            ? "粘贴 JD 仅当前页面"
                            : `来源：${job.sourceName}`}
                        </span>
                        {!job.custom && (
                          <SourceCheckBadge
                            check={getSourceCheck(job.id)}
                            compact
                          />
                        )}
                      </span>
                      {job.sourceUrl ? (
                        <a
                          href={job.sourceUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="text-ink-3 hover:text-ink inline-flex min-h-11 shrink-0 items-center gap-1 text-micro font-medium underline decoration-ink/20 underline-offset-2 xl:min-h-8"
                        >
                          查看官网
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 12 12"
                            fill="none"
                            className="h-2.5 w-2.5"
                          >
                            <path
                              d="M4 2.5h5.5V8M9.5 2.5 2.5 9.5"
                              stroke="currentColor"
                              strokeWidth="1.2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </a>
                      ) : (
                        <span className="font-mono text-micro text-ink-4">
                          本地匹配
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>

            {visible.length === 0 && (
              <div className="border-rule bg-paper mt-2 rounded-xl border border-dashed px-4 py-8 text-center">
                <p className="text-sm font-medium">
                  {allJobs.length === 0
                    ? "岗位库暂不可用"
                    : "没有符合条件的岗位"}
                </p>
                <p className="mx-auto mt-1.5 max-w-sm text-[11px] leading-5 text-ink-3">
                  {allJobs.length === 0
                    ? "仍可粘贴一份 JD，在本地对照经历。"
                    : "换个关键词或重置筛选。岗位方向库只收录已核对的官方校招与实习方向。"}
                </p>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  {filtersActive && (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className={BTN_SECONDARY}
                    >
                      重置筛选
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setPasteOpen(true)}
                    className={BTN_SECONDARY}
                  >
                    粘贴 JD 匹配
                  </button>
                </div>
              </div>
            )}
          </section>

          <div
            id="match-detail-pane"
            className={[
              "scroll-mt-4 xl:sticky xl:top-4 xl:max-h-[calc(100dvh-2rem)] xl:overflow-y-auto xl:overscroll-contain xl:pr-1 xl:[scrollbar-width:thin]",
              view === "detail" ? "" : "hidden xl:block",
            ].join(" ")}
          >
            {selectedJob && selectedMatch ? (
              <MatchDetail
                key={selectedJob.id}
                job={selectedJob}
                match={selectedMatch}
                experiences={items}
                onNavigateExperiences={onNavigateExperiences}
                onNavigateResume={onNavigateResume}
                onBack={backToList}
              />
            ) : (
              <div className="border-rule bg-paper rounded-xl border border-dashed px-4 py-10 text-center">
                <p className="text-sm font-medium">
                  {allJobs.length === 0
                    ? "还没有可对照的岗位"
                    : visible.length === 0
                      ? "当前筛选下没有结果"
                      : "选择一个岗位"}
                </p>
                <p className="mx-auto mt-1.5 max-w-sm text-[11px] leading-5 text-ink-3">
                  {visible.length === 0
                    ? "调整检索词或筛选条件，再查看匹配详情。"
                    : "选中岗位后，这里会逐条展示命中依据与待补缺口。"}
                </p>
                <button
                  type="button"
                  onClick={() => setPasteOpen(true)}
                  className={`${BTN_SECONDARY} mt-3`}
                >
                  粘贴 JD 匹配
                </button>
              </div>
            )}
          </div>
        </div>

        <section
          aria-labelledby="channel-heading"
          className="border-rule mt-8 border-t pt-6"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-mono text-micro tracking-[0.18em] text-ink-4">
                渠道入口 / CHANNELS
              </p>
              <h2
                id="channel-heading"
                className="mt-1 font-serif text-xl tracking-tight"
              >
                {CHANNELS.length} 个官方入口，自己去投
              </h2>
              <p className="mt-1 max-w-2xl text-[11px] leading-5 text-ink-3">
                {CHANNEL_LIBRARY_NOTE}
              </p>
            </div>
            <p className="font-mono text-micro tabular-nums text-ink-4">
              {CHANNELS.length} 个入口 不抓取内容
            </p>
          </div>

          {CHANNEL_LIBRARY_ISSUE && (
            <p
              role="alert"
              className="border-amber/50 bg-amber/[0.07] mt-3 rounded-lg border-l-2 px-3 py-2 text-xs leading-5 text-ink-2"
            >
              {CHANNEL_LIBRARY_ISSUE}
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-1.5">
            {channelTabs.map((tab) => {
              const count =
                tab.id === "all"
                  ? CHANNELS.length
                  : CHANNELS.filter((channel) => channel.type === tab.id)
                      .length;
              const active = channelType === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setChannelType(tab.id)}
                  className={[
                    "inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3 text-[11px] transition-colors",
                    active
                      ? "border-ink bg-ink text-paper"
                      : "border-rule hover:bg-ink/[0.03] bg-surface text-ink-3",
                  ].join(" ")}
                >
                  {tab.label}
                  <span
                    className={`font-mono text-micro tabular-nums ${
                      active ? "text-paper/55" : "text-ink-4"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <ul className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {filteredChannels.map((channel) => {
              const openNow = channel.openMonths.includes(month);
              return (
                <li key={channel.id}>
                  <a
                    href={channel.entryUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="border-rule hover:border-ink/25 hover:bg-ink/[0.015] focus-visible:ring-accent group flex h-full flex-col rounded-xl border bg-surface p-4 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                  >
                    <span className="flex items-start justify-between gap-2">
                      <span>
                        <span className="block text-sm font-medium">
                          {channel.name}
                        </span>
                        <span className="mt-0.5 block font-mono text-micro tracking-[0.1em] text-ink-4">
                          {CHANNEL_TYPE_LABELS[channel.type]}
                        </span>
                      </span>
                      {openNow && (
                        <span className="border-accent/40 bg-accent/[0.08] text-accent-ink inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-micro">
                          <span
                            aria-hidden="true"
                            className="h-1 w-1 rounded-full bg-accent"
                          />
                          本月开放
                        </span>
                      )}
                    </span>
                    <span className="mt-2 text-[11px] leading-5 text-ink-3">
                      开放：{formatMonthRanges(channel.openMonths)}
                    </span>
                    {channel.note && (
                      <span className="mt-1 text-micro leading-4 text-ink-3">
                        {channel.note}
                      </span>
                    )}
                    <span className="border-rule mt-3 flex items-center justify-between gap-2 border-t pt-2.5">
                      <span className="flex min-w-0 flex-wrap items-center gap-1.5">
                        <span className="text-micro text-ink-3">
                          适合 {formatGradeFit(channel.fitGrade)}
                        </span>
                        <SourceCheckBadge
                          check={getSourceCheck(channel.id)}
                          compact
                        />
                      </span>
                      <span className="inline-flex shrink-0 items-center gap-1 text-micro text-ink-3 group-hover:text-ink">
                        打开官网
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 12 12"
                          fill="none"
                          className="h-3 w-3"
                        >
                          <path
                            d="M4 2.5h5.5V8M9.5 2.5 2.5 9.5"
                            stroke="currentColor"
                            strokeWidth="1.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>

          <p className="mt-3 text-micro leading-5 text-ink-4">
            {SOURCE_CHECK_POLICY}
          </p>
        </section>

        <footer className="border-rule mt-8 border-t py-5">
          <p className="text-micro leading-5 text-ink-4">
            匹配、检索与数据存储均在本机浏览器完成；来源核验在构建期完成，只检查官方公开入口可达性；岗位方向仍为人工整理，具体在招职位与截止时间以官网为准；学径不代投、不抓取招聘平台职位内容。
          </p>
        </footer>
      </div>

      {pasteOpen && (
        <PasteJdDialog
          open={pasteOpen}
          onClose={() => setPasteOpen(false)}
          onCreate={handleJdCreated}
        />
      )}
    </div>
  );
}

function QualPill({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={[
        "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-2.5 text-micro transition-colors",
        active
          ? "border-ink bg-ink text-paper"
          : "border-rule bg-surface text-ink-3 hover:bg-ink/[0.03]",
      ].join(" ")}
    >
      {label}
      <span
        className={[
          "font-mono tabular-nums",
          active ? "text-paper/55" : "text-ink-4",
        ].join(" ")}
      >
        {count}
      </span>
    </button>
  );
}
