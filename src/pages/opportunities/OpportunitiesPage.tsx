import { useEffect, useMemo, useState } from "react";
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
  buildMatchContext,
  rankJobs,
} from "../../search";
import { createJobIndex, searchJobScores } from "../../search/bm25";
import MatchDetail from "./MatchDetail";
import PasteJdDialog from "./PasteJdDialog";

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
  "border-rule hover:bg-ink/[0.03] inline-flex min-h-11 items-center justify-center rounded-lg border bg-white px-3 text-xs disabled:cursor-not-allowed disabled:opacity-40";
const LINK_ACTION =
  "text-amber-ink inline-flex min-h-8 items-center text-[10px] font-medium underline underline-offset-2 hover:text-ink";

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
        if (searchScores && !searchScores.has(job.id)) return false;
        return true;
      }),
    [matches, jobById, typeFilter, cityFilter, familyFilter, searchScores],
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
    familyFilter !== "all";

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
  const month = currentMonth();

  const stats = [
    {
      label: "岗位库",
      value: allJobs.length,
      note: `${campusCount} 校招 · ${internCount} 实习`,
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
      value: [profile.grade, profile.major].filter(Boolean).join(" · "),
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
            <p className="font-mono text-[10px] tracking-[0.2em] text-ink/40">
              M4 · 机会 / 06
            </p>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1 className="font-serif text-2xl tracking-tight sm:text-3xl">
                机会仪表盘
              </h1>
              <span className="bg-ink/[0.05] rounded-full px-2 py-0.5 font-mono text-[10px] text-ink/55">
                {profile.usesSelected
                  ? `简历 ${profile.selectedCount} 条经历`
                  : profile.experienceCount > 0
                    ? `全部 ${profile.experienceCount} 条经历`
                    : "尚无经历"}
              </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-ink/55">
              把简历里的经历对到岗位要求上：命中哪几条、缺什么、下一步补什么。
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
            className="border-rule mt-4 flex items-start gap-2 rounded-lg border bg-white px-3 py-2 text-xs leading-5 text-ink/60"
          >
            <span
              aria-hidden="true"
              className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber"
            />
            <span>{notice}</span>
          </p>
        )}

        {seedError && (
          <p
            role="alert"
            className="border-amber/50 bg-amber/[0.07] mt-4 rounded-lg border-l-2 px-3 py-2 text-xs leading-5 text-ink/75"
          >
            {seedError}
          </p>
        )}

        {JOB_LIBRARY_ISSUE && (
          <p
            role="alert"
            className="border-amber/50 bg-amber/[0.07] mt-4 rounded-lg border-l-2 px-3 py-2 text-xs leading-5 text-ink/75"
          >
            {JOB_LIBRARY_ISSUE}。仍可粘贴一份 JD 做本地匹配。
          </p>
        )}

        {items.length === 0 && (
          <section className="border-amber/50 bg-amber/[0.07] mt-4 rounded-lg border-l-2 px-4 py-3">
            <p className="text-sm font-medium">还没有可匹配的经历</p>
            <p className="mt-1 text-[11px] leading-5 text-ink/60">
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
            <div key={stat.label} className="bg-white px-4 py-3.5">
              <p className="font-mono text-[9px] tracking-[0.14em] text-ink/40">
                {stat.label}
              </p>
              <p className="mt-1.5 font-mono text-2xl leading-none tabular-nums">
                {stat.value}
              </p>
              <p className="mt-1.5 text-[10px] leading-4 text-ink/40">
                {stat.note}
              </p>
            </div>
          ))}
        </section>

        <section
          aria-label="匹配依据"
          className="border-rule mt-4 overflow-hidden rounded-xl border bg-white"
        >
          <div className="border-rule flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium">匹配依据</p>
              <span className="bg-ink/[0.05] rounded-full px-2 py-0.5 font-mono text-[9px] text-ink/45">
                {profile.usesSelected ? "来自简历" : "全部经历"}
              </span>
            </div>
            <button
              type="button"
              onClick={onNavigateResume}
              className="inline-flex min-h-8 items-center text-[10px] text-ink/45 underline underline-offset-2 hover:text-ink"
            >
              修改意向与勾选
            </button>
          </div>
          <dl className="bg-rule grid grid-cols-2 gap-px sm:grid-cols-4">
            {profileFields.map((field) => (
              <div key={field.label} className="bg-white px-4 py-3">
                <dt className="flex items-center gap-1.5 font-mono text-[9px] tracking-[0.12em] text-ink/40">
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
                    field.done ? "text-ink/75" : "text-ink/35"
                  }`}
                >
                  {field.value || "未填写"}
                </dd>
              </div>
            ))}
          </dl>
          <div className="border-rule flex flex-wrap items-center gap-1.5 border-t px-4 py-2.5">
            <span className="font-mono text-[9px] tracking-[0.1em] text-ink/35">
              技能底稿
            </span>
            {profile.skills.length > 0 ? (
              <>
                {profile.skills.slice(0, 10).map((skill) => (
                  <span
                    key={skill}
                    className="border-rule rounded-full border px-1.5 py-0.5 text-[10px] text-ink/55"
                  >
                    {skill}
                  </span>
                ))}
                {profile.skills.length > 10 && (
                  <span className="font-mono text-[9px] text-ink/30">
                    +{profile.skills.length - 10}
                  </span>
                )}
              </>
            ) : (
              <span className="text-[10px] text-ink/35">
                在经历里填写技能标签，匹配会更准
              </span>
            )}
            <span className="ml-auto text-[9px] text-ink/30">
              来自{profile.usesSelected ? "简历已选经历" : "全部经历"}
            </span>
          </div>
          {incomplete.length > 0 ? (
            <div className="border-rule bg-amber/[0.05] flex flex-wrap items-center justify-between gap-2 border-t px-4 py-2.5">
              <p className="text-[10px] leading-5 text-ink/55">
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
            <p className="border-rule border-t px-4 py-2.5 text-[10px] leading-5 text-ink/35">
              匹配依据齐全，排序已按求职意向、城市与年级加权。
            </p>
          )}
        </section>

        <section
          aria-label="筛选岗位"
          className="border-rule mt-4 overflow-hidden rounded-xl border bg-white"
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
                className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink/30"
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
                className="border-rule focus:border-ink/35 focus:ring-2 focus:ring-amber/25 min-h-11 w-full rounded-lg border bg-white pr-11 pl-9 text-xs text-ink outline-none transition-colors placeholder:text-ink/25"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="清空检索"
                  className="hover:bg-ink/[0.04] absolute top-0 right-0 inline-flex h-11 w-11 items-center justify-center rounded-lg text-lg text-ink/35 hover:text-ink"
                >
                  ×
                </button>
              )}
            </div>

            <div
              role="group"
              aria-label="岗位类型"
              className="border-rule inline-flex rounded-lg border bg-white p-0.5"
            >
              {TYPE_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  aria-pressed={typeFilter === tab.id}
                  onClick={() => setTypeFilter(tab.id)}
                  className={[
                    "min-h-10 rounded-md px-3 text-xs whitespace-nowrap",
                    typeFilter === tab.id
                      ? "bg-ink text-paper"
                      : "text-ink/55",
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
              className="border-rule focus:border-ink/35 focus:ring-2 focus:ring-amber/25 min-h-11 rounded-lg border bg-white px-2 text-xs text-ink/65 outline-none"
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
              className="border-rule focus:border-ink/35 focus:ring-2 focus:ring-amber/25 min-h-11 rounded-lg border bg-white px-2 text-xs text-ink/65 outline-none"
            >
              <option value="all">全部方向</option>
              {familyOptions.map((family) => (
                <option key={family} value={family}>
                  {family}
                </option>
              ))}
            </select>
          </div>

          <div className="border-rule flex flex-wrap items-center justify-between gap-2 border-t px-3 py-2">
            <p className="max-w-2xl text-[10px] leading-4 text-ink/35">
              {JOB_LIBRARY_NOTE}
            </p>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[9px] tabular-nums text-ink/40">
                显示 {visible.length} / {allJobs.length}
              </span>
              {filtersActive && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-ink/50 inline-flex min-h-8 items-center text-[10px] underline underline-offset-2 hover:text-ink"
                >
                  重置筛选
                </button>
              )}
            </div>
          </div>
        </section>

        <div className="mt-4 flex items-center justify-between gap-3 xl:hidden">
          <div
            className="border-rule inline-flex rounded-lg border bg-white p-0.5"
            aria-label="切换岗位列表与详情"
          >
            <button
              type="button"
              aria-pressed={view === "list"}
              onClick={() => setView("list")}
              className={[
                "min-h-10 rounded-md px-3 text-xs",
                view === "list" ? "bg-ink text-paper" : "text-ink/55",
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
                view === "detail" ? "bg-ink text-paper" : "text-ink/55",
              ].join(" ")}
            >
              匹配详情
            </button>
          </div>
          <span className="font-mono text-[10px] tabular-nums text-ink/40">
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
              <span className="font-mono text-[9px] tracking-[0.08em] text-ink/35">
                按匹配分降序 · 附官网
              </span>
            </div>

            <ul className="space-y-2">
              {visible.map((match) => {
                const job = jobById.get(match.jobId);
                if (!job) return null;
                const selected = selectedMatch?.jobId === job.id;
                const tone = companyTone(job.company);
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
                      "overflow-hidden rounded-xl border bg-white transition-colors",
                      selected
                        ? "border-ink/35 ring-1 ring-ink/10"
                        : "border-rule hover:border-ink/25 hover:bg-ink/[0.015]",
                    ].join(" ")}
                  >
                    <button
                      type="button"
                      onClick={() => selectJob(job.id)}
                      aria-current={selected ? "true" : undefined}
                      className="focus-visible:ring-amber w-full p-3.5 text-left focus-visible:ring-2 focus-visible:ring-inset focus-visible:outline-none"
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
                            <span className="truncate font-mono text-[9px] tracking-[0.08em] text-ink/40">
                              {job.company} · {job.cohort}
                            </span>
                            {job.custom && (
                              <span className="border-amber/40 bg-amber/[0.08] text-amber-ink shrink-0 rounded-full border px-1.5 py-0.5 text-[9px]">
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
                          <span className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] text-ink/45">
                            <span>{JOB_TYPE_LABELS[job.type]}</span>
                            <span aria-hidden="true">·</span>
                            <span>{job.city}</span>
                            <span aria-hidden="true">·</span>
                            <span>{formatGradeFit(job.gradeFit)}</span>
                          </span>
                          <span className="mt-2 flex items-center gap-2">
                            <span
                              className={`inline-flex min-h-5 items-center rounded-full border px-1.5 text-[9px] ${MATCH_TIER_CHIP[match.tier]}`}
                            >
                              {MATCH_TIER_LABELS[match.tier]}
                            </span>
                            <span className="text-[10px] text-ink/40">
                              {requirementTotal > 0
                                ? `命中 ${match.hits.length}/${requirementTotal}`
                                : "待对照"}
                            </span>
                            <span className="ml-auto font-mono text-[9px] text-ink/30">
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
                      <span className="min-w-0 truncate font-mono text-[9px] text-ink/35">
                        {job.custom
                          ? "粘贴 JD · 仅当前页面"
                          : `来源：${job.sourceName}`}
                      </span>
                      {job.sourceUrl ? (
                        <a
                          href={job.sourceUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="text-ink/55 hover:text-ink inline-flex min-h-11 shrink-0 items-center gap-1 text-[10px] font-medium underline decoration-ink/20 underline-offset-2 xl:min-h-8"
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
                        <span className="font-mono text-[9px] text-ink/30">
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
                <p className="mx-auto mt-1.5 max-w-sm text-[11px] leading-5 text-ink/45">
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
                <p className="mx-auto mt-1.5 max-w-sm text-[11px] leading-5 text-ink/45">
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
              <p className="font-mono text-[9px] tracking-[0.18em] text-ink/35">
                渠道入口 / CHANNELS
              </p>
              <h2
                id="channel-heading"
                className="mt-1 font-serif text-xl tracking-tight"
              >
                官方渠道，自己去投
              </h2>
              <p className="mt-1 max-w-2xl text-[11px] leading-5 text-ink/45">
                {CHANNEL_LIBRARY_NOTE}
              </p>
            </div>
            <p className="font-mono text-[9px] tabular-nums text-ink/30">
              {CHANNELS.length} 个入口 · 不抓取内容
            </p>
          </div>

          {CHANNEL_LIBRARY_ISSUE && (
            <p
              role="alert"
              className="border-amber/50 bg-amber/[0.07] mt-3 rounded-lg border-l-2 px-3 py-2 text-xs leading-5 text-ink/75"
            >
              {CHANNEL_LIBRARY_ISSUE}
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-1.5">
            {CHANNEL_TABS.map((tab) => {
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
                      : "border-rule hover:bg-ink/[0.03] bg-white text-ink/55",
                  ].join(" ")}
                >
                  {tab.label}
                  <span
                    className={`font-mono text-[9px] tabular-nums ${
                      active ? "text-paper/55" : "text-ink/30"
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
                    className="border-rule hover:border-ink/25 hover:bg-ink/[0.015] focus-visible:ring-amber group flex h-full flex-col rounded-xl border bg-white p-4 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                  >
                    <span className="flex items-start justify-between gap-2">
                      <span>
                        <span className="block text-sm font-medium">
                          {channel.name}
                        </span>
                        <span className="mt-0.5 block font-mono text-[9px] tracking-[0.1em] text-ink/35">
                          {CHANNEL_TYPE_LABELS[channel.type]}
                        </span>
                      </span>
                      {openNow && (
                        <span className="border-amber/40 bg-amber/[0.07] text-amber-ink inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px]">
                          <span
                            aria-hidden="true"
                            className="h-1 w-1 rounded-full bg-amber"
                          />
                          本月开放
                        </span>
                      )}
                    </span>
                    <span className="mt-2 text-[11px] leading-5 text-ink/50">
                      开放：{formatMonthRanges(channel.openMonths)}
                    </span>
                    {channel.note && (
                      <span className="mt-1 text-[10px] leading-4 text-ink/40">
                        {channel.note}
                      </span>
                    )}
                    <span className="border-rule mt-3 flex items-center justify-between gap-2 border-t pt-2.5">
                      <span className="text-[10px] text-ink/40">
                        适合 {formatGradeFit(channel.fitGrade)}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] text-ink/55 group-hover:text-ink">
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
        </section>

        <footer className="border-rule mt-8 border-t py-5">
          <p className="text-[10px] leading-5 text-ink/35">
            匹配、检索与数据存储均在本机浏览器完成；岗位方向整理自企业官方校园招聘页面，链接直达官网，具体在招职位与截止时间以官网为准；学径不代投、不抓取招聘平台。
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
