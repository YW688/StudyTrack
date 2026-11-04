import { useEffect, useRef, useState } from "react";
import type { Experience } from "../types";
import ApertureMark from "./ApertureMark";
import CompassRose from "./CompassRose";
import StarMark from "./StarMark";
import TierPips from "./TierPips";
import WaxSeal from "./WaxSeal";
import { DraftingRose, ObservatoryRose } from "./ThemeRose";
import {
  EXPERIENCE_KIND_META,
  experienceKindLabel,
  formatExperienceRange,
  isSafeHttpUrl,
  resumeReadiness,
} from "../lib/experience";
import { tierStars } from "../lib/level";

interface ExperienceCardProps {
  experience: Experience;
  onEdit: () => void;
  onDelete: () => Promise<void>;
  onConfirm: () => void;
}

const SECTION_META: {
  key: "problem" | "method" | "contribution" | "result";
  label: string;
}[] = [
  { key: "problem", label: "问题" },
  { key: "method", label: "方法" },
  { key: "contribution", label: "我的贡献" },
  { key: "result", label: "结果" },
];

const BTN_ACTION =
  "hover:text-ink inline-flex min-h-11 items-center text-[11px] text-ink-3 underline-offset-2 hover:underline sm:min-h-8";

export default function ExperienceCard({
  experience,
  onEdit,
  onDelete,
  onConfirm,
}: ExperienceCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const meta = EXPERIENCE_KIND_META[experience.kind];
  const range = formatExperienceRange(experience.start, experience.end);
  const ongoing = Boolean(experience.start) && !experience.end;
  const tier = tierStars(experience);
  const ready = resumeReadiness(experience).ready;
  const [tierUp, setTierUp] = useState(false);
  const lastTier = useRef(tier);
  useEffect(() => {
    const upgraded = lastTier.current < 4 && tier === 4;
    lastTier.current = tier;
    if (!upgraded) return;
    setTierUp(true);
    const timer = window.setTimeout(() => setTierUp(false), 420);
    return () => window.clearTimeout(timer);
  }, [tier]);
  const summary = experience.result.trim() || experience.problem.trim();
  const filledSections = SECTION_META.filter(
    (section) => experience[section.key].trim().length > 0,
  );
  const skillPreview = experience.skills.slice(0, 4);
  const hiddenSkills = Math.max(0, experience.skills.length - skillPreview.length);

  async function handleDelete() {
    setDeleting(true);
    try {
      await onDelete();
    } catch {
      setConfirmingDelete(false);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <article
      className={[
        "app-exp border-rule rounded-xl border bg-surface transition-colors",
        experience.confidence === "low"
          ? "border-amber/50 bg-amber/[0.03]"
          : "",
      ].join(" ")}
    >
      <div className="px-4 py-3.5 sm:px-5">
        <CompassRose className="app-exp-rose" />
        <DraftingRose className="app-exp-rose-drafting" />
        <ObservatoryRose className="app-exp-rose-observatory" />

        <div className={`app-exp-seal-corner${tierUp ? " is-tier-up" : ""}`}>
          <WaxSeal
            units={tier}
            total={4}
            ready={ready}
            size={56}
            className="app-exp-seal"
          />
          <ApertureMark size={52} className="app-exp-aperture" tier={tier} />
          <StarMark size={52} className="app-exp-star" tier={tier} />
          <span
            className="app-exp-seal-label"
            title={
              ready
                ? "四段式齐 有证据或量化 置信已确认"
                : "补齐四段式 证据与确认 才给第 4 星"
            }
          >
            <span>品质</span>
            <span className="app-exp-seal-count">{tier}/4</span>
          </span>
        </div>

        <div className="app-exp-head">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <span
            className="app-kind-chip rounded-full px-2 py-0.5 font-mono text-micro tracking-[0.04em]"
            style={{
              color: meta.color,
              backgroundColor: meta.pale,
            }}
          >
            {experienceKindLabel(experience.kind, experience.kindLabel)}
          </span>
          <span className="font-mono text-micro tabular-nums text-ink-3">
            {range}
          </span>
          {ongoing && (
            <span className="bg-ink/[0.06] rounded-full px-1.5 py-0.5 font-mono text-micro text-ink-3">
              进行中
            </span>
          )}
          {experience.confidence === "low" && (
            <span className="bg-amber/15 rounded-full px-1.5 py-0.5 font-mono text-micro text-amber-ink">
              待确认
            </span>
          )}
          {experience.source === "sample" && (
            <span className="border-rule rounded-full border px-1.5 py-0.5 font-mono text-micro text-ink-4">
              示例
            </span>
          )}
        </div>

        <h3 className="mt-2 text-[15px] leading-6 font-medium tracking-tight break-words">
          {experience.title}
        </h3>
        {experience.org && (
          <p className="mt-0.5 text-[11px] leading-5 text-ink-3">
            {experience.org}
          </p>
        )}
        </div>

        <div className="app-exp-divider" aria-hidden="true">
          <span className="app-exp-divider-line" />
          <svg
            className="app-exp-divider-mark"
            viewBox="0 0 28 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.9"
          >
            <path d="M14 2.4 17.6 6 14 9.6 10.4 6Z" />
            <circle cx="5" cy="6" r="0.9" fill="currentColor" stroke="none" />
            <circle cx="23" cy="6" r="0.9" fill="currentColor" stroke="none" />
          </svg>
          <span className="app-exp-divider-line" />
        </div>

        {!expanded && (
          <p
            className={[
              "app-exp-summary mt-2 text-xs leading-5",
              summary ? "line-clamp-2 text-ink-3" : "text-ink-4",
            ].join(" ")}
          >
            {summary || "四段式待补：问题 → 方法 → 贡献 → 结果"}
          </p>
        )}

        {!expanded && skillPreview.length > 0 && (
          <ul className="app-exp-skills mt-2 flex flex-wrap gap-1.5">
            {skillPreview.map((skill) => (
              <li
                key={skill}
                className="bg-ink/[0.05] rounded-full px-2 py-0.5 text-micro text-ink-3"
              >
                {skill}
              </li>
            ))}
            {hiddenSkills > 0 && (
              <li className="px-1 py-0.5 font-mono text-micro text-ink-4">
                +{hiddenSkills}
              </li>
            )}
          </ul>
        )}

        {expanded && (
          <div className="mt-3 border-t border-rule pt-3">
            {filledSections.length > 0 ? (
              <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {filledSections.map((section) => (
                  <div key={section.key}>
                    <p className="font-mono text-micro tracking-[0.14em] text-ink-4">
                      {section.label}
                    </p>
                    <p className="mt-1 whitespace-pre-line text-xs leading-5 text-ink-2">
                      {experience[section.key]}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs leading-5 text-ink-3">
                四段式还没填 补齐问题 方法 贡献 结果
              </p>
            )}

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="font-mono text-micro tracking-[0.14em] text-ink-4">
                  量化数据
                </p>
                {experience.metrics.length > 0 ? (
                  <dl className="mt-1.5">
                    {experience.metrics.map((metric) => (
                      <div
                        key={`${metric.label}-${metric.value}`}
                        className="border-rule/70 flex items-baseline justify-between gap-3 border-b py-1 last:border-b-0"
                      >
                        <dt className="text-micro text-ink-3">{metric.label}</dt>
                        <dd className="font-mono text-[11px] tabular-nums text-ink-2">
                          {metric.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="mt-1 text-micro leading-5 text-ink-4">
                    原文未提供量化数据
                  </p>
                )}
              </div>

              <div>
                <p className="font-mono text-micro tracking-[0.14em] text-ink-4">
                  证据
                </p>
                {experience.evidence.length > 0 ? (
                  <ul className="mt-1.5 flex flex-wrap gap-1.5">
                    {experience.evidence.map((item, index) =>
                      item.url && isSafeHttpUrl(item.url) ? (
                        <li key={`${item.label}-${index}`}>
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="border-rule hover:bg-ink/[0.03] inline-flex min-h-8 items-center rounded-md border px-2 text-micro text-ink-3"
                          >
                            {item.label}
                          </a>
                        </li>
                      ) : (
                        <li
                          key={`${item.label}-${index}`}
                          className="border-rule inline-flex min-h-8 items-center rounded-md border px-2 text-micro text-ink-3"
                        >
                          {item.label}
                        </li>
                      ),
                    )}
                  </ul>
                ) : (
                  <p className="mt-1 text-micro leading-5 text-ink-4">
                    暂无证据 可补报告 截图或链接
                  </p>
                )}
              </div>
            </div>

            {(experience.skills.length > 0 || experience.tags.length > 0) && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {experience.skills.length > 0 && (
                  <div>
                    <p className="font-mono text-micro tracking-[0.14em] text-ink-4">
                      技能
                    </p>
                    <ul className="mt-1.5 flex flex-wrap gap-1.5">
                      {experience.skills.map((skill) => (
                        <li
                          key={skill}
                          className="bg-ink/[0.05] rounded-full px-2 py-0.5 text-micro text-ink-3"
                        >
                          {skill}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {experience.tags.length > 0 && (
                  <div>
                    <p className="font-mono text-micro tracking-[0.14em] text-ink-4">
                      标签
                    </p>
                    <ul className="mt-1.5 flex flex-wrap gap-1.5">
                      {experience.tags.map((tag) => (
                        <li
                          key={tag}
                          className="border-rule rounded-full border px-2 py-0.5 text-micro text-ink-3"
                        >
                          {tag}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="app-exp-actions mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-rule pt-2">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className={BTN_ACTION}
            aria-expanded={expanded}
          >
            {expanded ? "收起" : "查看四段式"}
          </button>
          <span aria-hidden="true" className="text-ink-4">
            /
          </span>
          <button type="button" onClick={onEdit} className={BTN_ACTION}>
            编辑
          </button>
          {experience.confidence === "low" && (
            <>
              <span aria-hidden="true" className="text-ink-4">
                /
              </span>
              <button
                type="button"
                onClick={onConfirm}
                className="text-amber-ink inline-flex min-h-11 items-center text-[11px] font-medium underline-offset-2 hover:underline sm:min-h-8"
              >
                确认无误
              </button>
            </>
          )}
          <span aria-hidden="true" className="text-ink-4">
            /
          </span>
          {confirmingDelete ? (
            <>
              <button
                type="button"
                disabled={deleting}
                onClick={() => void handleDelete()}
                className="inline-flex min-h-11 items-center text-[11px] font-medium text-red-800 underline-offset-2 hover:underline disabled:opacity-50 sm:min-h-8"
              >
                {deleting ? "删除中…" : "确认删除"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className={BTN_ACTION}
              >
                取消
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className={BTN_ACTION}
            >
              删除
            </button>
          )}
          <span className="app-exp-tier-inline ml-auto flex items-center gap-2">
            <TierPips
              units={tier}
              total={4}
              label={`品质 ${tier}/4`}
            />
            <span
              title={
                ready
                  ? "四段式齐 有证据或量化 置信已确认"
                  : "补齐四段式 证据与确认 才算就绪"
              }
              className={[
                "font-mono text-micro tabular-nums",
                ready ? "text-accent-ink" : "text-ink-4",
              ].join(" ")}
            >
              {ready ? `品质 ${tier}/4 已就绪` : `品质 ${tier}/4`}
            </span>
          </span>
        </div>
      </div>
    </article>
  );
}
