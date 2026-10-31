import { useState, type ReactNode } from "react";
import type {
  Experience,
  JobMatch,
  JobPosting,
  MatchEvidenceSource,
} from "../../types";
import { JOB_TYPE_LABELS, MATCH_TIER_LABELS } from "../../types";
import {
  MATCH_TIER_BAR,
  MATCH_TIER_CHIP,
  companyTone,
  formatCollectedAt,
  formatGradeFit,
} from "../../lib/opportunities";
import { copyText } from "../../lib/portfolio";

const SOURCE_LABELS: Record<MatchEvidenceSource, string> = {
  text: "经历原文",
  bullet: "简历要点",
  tag: "技能标签",
};

const BTN_PRIMARY =
  "bg-ink text-paper hover:bg-ink/90 inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-4 text-xs font-medium";
const BTN_SECONDARY =
  "border-rule hover:bg-ink/[0.03] inline-flex min-h-11 items-center justify-center rounded-lg border bg-white px-3 text-xs disabled:cursor-not-allowed disabled:opacity-40";

interface MatchDetailProps {
  job: JobPosting;
  match: JobMatch;
  experiences: Experience[];
  onNavigateExperiences: () => void;
  onNavigateResume: () => void;
  onBack?: () => void;
}

function MetaChip({ children }: { children: ReactNode }) {
  return (
    <span className="border-rule inline-flex min-h-6 items-center rounded border px-1.5 text-[10px] text-ink/50">
      {children}
    </span>
  );
}

function StatusChip({ kind }: { kind: "hit" | "gap" | "eligibility" }) {
  const meta = {
    hit: {
      label: "命中",
      className: "border-ink/20 bg-ink/[0.05] text-ink/65",
    },
    gap: {
      label: "待补",
      className: "border-amber/40 bg-amber/[0.08] text-amber-ink",
    },
    eligibility: {
      label: "资格",
      className: "border-rule bg-white text-ink/40",
    },
  }[kind];
  return (
    <span
      className={`inline-flex min-h-6 shrink-0 items-center rounded-full border px-2 text-[9px] ${meta.className}`}
    >
      {meta.label}
    </span>
  );
}

export default function MatchDetail({
  job,
  match,
  experiences,
  onNavigateExperiences,
  onNavigateResume,
  onBack,
}: MatchDetailProps) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const experienceById = new Map(
    experiences.map((experience) => [experience.id, experience]),
  );
  const tone = companyTone(job.company);
  const matchableCount = match.hits.length + match.gaps.length;
  const segments = 10;
  const filled = Math.max(
    0,
    Math.min(segments, Math.round(match.score / 10)),
  );
  const referenced = [
    ...new Set(match.hits.map((hit) => hit.experienceId)),
  ]
    .map((id) => experienceById.get(id))
    .filter((item): item is Experience => Boolean(item));

  async function handleCopy() {
    const lines = [
      `${job.company} · ${job.title}`,
      `匹配分 ${match.score}/100（${MATCH_TIER_LABELS[match.tier]}）`,
      ...(matchableCount > 0
        ? [`命中 ${match.hits.length}/${matchableCount} 项可匹配要求`]
        : []),
      ...match.hits.map(
        (hit) =>
          `[命中] ${hit.requirement}｜${
            experienceById.get(hit.experienceId)?.title ?? "经历"
          }：${hit.quote}`,
      ),
      ...match.gaps.map((gap) => `[待补] ${gap.requirement}`),
      ...(job.sourceUrl
        ? [`岗位来源：${job.sourceName}（${job.sourceUrl}）`]
        : []),
      "匹配依据：学径本机简历与经历；岗位信息以企业官网为准。",
    ];
    const ok = await copyText(lines.join("\n"));
    setCopied(ok);
    setCopyError(ok ? null : "复制失败，请手动选择文本复制。");
  }

  return (
    <article className="border-rule overflow-hidden rounded-xl border bg-white">
      <header className="border-rule border-b px-4 pt-4 pb-4 sm:px-5">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="-ml-1 mb-3 inline-flex min-h-9 items-center rounded px-1 text-[11px] text-ink/50 hover:text-ink xl:hidden"
          >
            <span aria-hidden="true" className="mr-1">
              ←
            </span>
            返回岗位列表
          </button>
        )}

        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border font-serif text-lg"
            style={{
              backgroundColor: tone.bg,
              color: tone.text,
              borderColor: tone.border,
            }}
          >
            {job.company.slice(0, 1)}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[9px] tracking-[0.12em] text-ink/40">
              <span>{job.company}</span>
              <span aria-hidden="true">·</span>
              <span>{job.cohort}</span>
              {job.custom && (
                <span className="border-amber/40 bg-amber/[0.08] text-amber-ink rounded-full border px-1.5 py-0.5 tracking-[0.06em]">
                  粘贴 JD
                </span>
              )}
            </div>
            <h2 className="mt-1 font-serif text-xl leading-7 tracking-tight sm:text-2xl">
              {job.title}
            </h2>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <MetaChip>{JOB_TYPE_LABELS[job.type]}</MetaChip>
              <MetaChip>{job.city}</MetaChip>
              <MetaChip>{formatGradeFit(job.gradeFit)}</MetaChip>
              <MetaChip>
                {job.family}
                {job.track !== "自定义" && job.track !== job.family
                  ? ` · ${job.track}`
                  : ""}
              </MetaChip>
            </div>
          </div>

          <div className="shrink-0 text-right">
            <p className="font-mono text-2xl leading-none tabular-nums sm:text-3xl">
              {match.score}
              <span className="ml-0.5 text-[10px] font-normal text-ink/35">
                /100
              </span>
            </p>
            <span
              className={`mt-1.5 inline-flex min-h-6 items-center rounded-full border px-2 text-[10px] ${MATCH_TIER_CHIP[match.tier]}`}
            >
              {MATCH_TIER_LABELS[match.tier]}
            </span>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <div className="flex flex-1 gap-0.5" aria-hidden="true">
            {Array.from({ length: segments }, (_, index) => (
              <span
                key={index}
                className={`h-1.5 flex-1 rounded-[1px] ${
                  index < filled ? MATCH_TIER_BAR[match.tier] : "bg-ink/10"
                }`}
              />
            ))}
          </div>
          <span className="shrink-0 font-mono text-[9px] tabular-nums text-ink/35">
            {matchableCount > 0
              ? `命中 ${match.hits.length}/${matchableCount}`
              : "无可匹配要求"}
          </span>
        </div>

        {job.custom ? (
          <p className="mt-2 text-[10px] leading-5 text-ink/35">
            粘贴的 JD · 只在当前页面有效，刷新后消失
          </p>
        ) : (
          <div className="border-rule mt-3 border-t pt-2.5">
            <p className="text-[10px] leading-5 text-ink/45">
              来源：{job.sourceName} · 官方招聘页 · 核对{" "}
              {formatCollectedAt(job.verifiedAt)}
            </p>
            {job.sourceUrl && (
              <a
                href={job.sourceUrl}
                target="_blank"
                rel="noreferrer noopener"
                title={job.sourceUrl}
                className="mt-0.5 block truncate font-mono text-[9px] leading-4 text-ink/35 underline decoration-ink/20 underline-offset-2 hover:text-ink"
              >
                {job.sourceUrl}
              </a>
            )}
          </div>
        )}
      </header>

      <div className="border-rule border-b px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-xs font-medium">为什么推荐</h3>
          <span className="font-mono text-[9px] tracking-[0.08em] text-ink/35">
            只依据简历与经历
          </span>
        </div>
        {match.reasons.length > 0 ? (
          <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {match.reasons.map((reason, index) => (
              <li
                key={reason}
                className="flex gap-2 text-[11px] leading-5 text-ink/65"
              >
                <span className="mt-0.5 font-mono text-[9px] tabular-nums text-amber">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[11px] leading-5 text-ink/45">
            暂无推荐理由。先补全求职意向与经历，再重新查看。
          </p>
        )}

        {match.warnings.length > 0 && (
          <div className="border-amber/50 bg-amber/[0.06] mt-3 rounded-lg border-l-2 px-3 py-2.5">
            <p className="text-[10px] font-medium text-amber-ink">需要注意</p>
            <ul className="mt-1 space-y-0.5">
              {match.warnings.map((warning) => (
                <li
                  key={warning}
                  className="text-[11px] leading-5 text-ink/65"
                >
                  {warning}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <section className="border-rule border-b px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-xs font-medium">要求对照</h3>
          <span className="font-mono text-[9px] tabular-nums text-ink/35">
            命中 {match.hits.length} · 待补 {match.gaps.length} · 资格{" "}
            {match.eligibility.length}
          </span>
        </div>
        <p className="mt-1 text-[10px] leading-5 text-ink/35">
          方向级要求，供自查使用；投递前以官网职位说明为准。
        </p>

        <ol className="border-rule mt-2 divide-y divide-rule border-t">
          {job.requirements.map((requirement, index) => {
            const hit = match.hits.find((item) => item.index === index);
            const gap = hit
              ? undefined
              : match.gaps.find((item) => item.index === index);
            const eligibility = hit || gap
              ? undefined
              : match.eligibility.find((item) => item.index === index);
            const hitExperience = hit
              ? experienceById.get(hit.experienceId)
              : undefined;
            const archiveExperience = gap?.archiveExperienceId
              ? experienceById.get(gap.archiveExperienceId)
              : undefined;

            return (
              <li key={index} className="py-3.5">
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 shrink-0 font-mono text-[9px] tabular-nums text-ink/30">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs leading-5">{requirement}</p>
                      <StatusChip
                        kind={
                          hit ? "hit" : gap ? "gap" : "eligibility"
                        }
                      />
                    </div>

                    {hit && (
                      <div className="border-ink/15 mt-2 border-l-2 pl-3">
                        <blockquote className="text-[11px] leading-5 text-ink/65">
                          「{hit.quote}」
                        </blockquote>
                        <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[10px] text-ink/40">
                          <span className="font-medium text-ink/65">
                            {hitExperience?.title ?? "已删除的经历"}
                          </span>
                          <span aria-hidden="true" className="text-ink/25">
                            ·
                          </span>
                          <span>{SOURCE_LABELS[hit.source]}</span>
                          {hit.source !== "tag" &&
                            hit.skills.length > 0 && (
                              <>
                                <span
                                  aria-hidden="true"
                                  className="text-ink/25"
                                >
                                  ·
                                </span>
                                <span>
                                  技能：{hit.skills.join("、")}
                                </span>
                              </>
                            )}
                        </p>
                      </div>
                    )}

                    {gap && (
                      <div className="mt-1.5">
                        <p className="text-[11px] leading-5 text-ink/55">
                          {gap.advice}
                        </p>
                        {archiveExperience && (
                          <div className="border-amber/30 bg-amber/[0.05] mt-2 rounded-lg border px-3 py-2.5">
                            <p className="text-[10px] leading-5 text-amber-ink">
                              这条经历还没进简历，勾选后可提升命中。
                            </p>
                            <p className="mt-1 text-[11px] font-medium leading-5">
                              {archiveExperience.title}
                            </p>
                            {gap.archiveQuote && (
                              <p className="mt-0.5 text-[10px] leading-5 text-ink/50">
                                「{gap.archiveQuote}」
                              </p>
                            )}
                            <button
                              type="button"
                              onClick={onNavigateResume}
                              className="mt-1.5 inline-flex min-h-8 items-center text-[10px] font-medium text-ink/65 underline underline-offset-2 hover:text-ink"
                            >
                              去简历勾选
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {eligibility && (
                      <p className="mt-1 text-[10px] leading-5 text-ink/40">
                        {eligibility.note}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="border-rule border-b px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-xs font-medium">技能覆盖</h3>
          <span className="font-mono text-[9px] tabular-nums text-ink/35">
            {match.matchedSkills.length}/{job.skills.length}
          </span>
        </div>
        {job.skills.length === 0 ? (
          <p className="mt-2 text-[11px] leading-5 text-ink/45">
            这条 JD 没有识别出技能关键词，请直接对照上方要求清单。
          </p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {match.matchedSkills.map((skill) => (
              <span
                key={skill}
                className="border-ink/20 bg-ink/[0.05] inline-flex min-h-6 items-center rounded-full border px-2 text-[10px] text-ink/70"
              >
                {skill}
              </span>
            ))}
            {match.missingSkills.map((skill) => (
              <span
                key={skill}
                className="border-amber/45 text-amber-ink inline-flex min-h-6 items-center gap-1 rounded-full border border-dashed px-2 text-[10px]"
              >
                {skill}
                <span className="text-[8px] text-ink/35">待补</span>
              </span>
            ))}
          </div>
        )}
        <p className="mt-2 text-[10px] leading-5 text-ink/35">
          技能只按经历原文与技能标签核对，不做推测。
        </p>
      </section>

      <footer className="bg-paper/60 px-4 py-4 sm:px-5">
        {referenced.length > 0 && (
          <div className="mb-3">
            <p className="text-[10px] font-medium text-ink/55">
              本次匹配引用了 {referenced.length} 条经历
            </p>
            <ul className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {referenced.map((experience) => (
                <li
                  key={experience.id}
                  className="border-rule inline-flex min-h-7 items-center rounded-md border bg-white px-2 text-[10px] text-ink/60"
                >
                  {experience.title}
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={onNavigateExperiences}
                  className="inline-flex min-h-7 items-center px-1 text-[10px] text-ink/45 underline underline-offset-2 hover:text-ink"
                >
                  打开经历库
                </button>
              </li>
            </ul>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {job.sourceUrl && (
              <a
                href={job.sourceUrl}
                target="_blank"
                rel="noreferrer noopener"
                className={BTN_PRIMARY}
              >
                去官网查看岗位
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
              </a>
            )}
            <button
              type="button"
              onClick={() => void handleCopy()}
              className={BTN_SECONDARY}
            >
              {copied ? "已复制匹配记录" : "复制匹配记录"}
            </button>
            <button
              type="button"
              onClick={onNavigateResume}
              className={BTN_SECONDARY}
            >
              编辑简历
            </button>
          </div>
          <p className="max-w-xs text-[10px] leading-5 text-ink/35">
            匹配分由本机经历计算，不代表企业筛选结果；岗位以官网为准，学径不代投。
          </p>
        </div>
        {copyError && (
          <p className="text-amber mt-2 text-[10px] leading-5">{copyError}</p>
        )}
      </footer>
    </article>
  );
}
