import { useState } from "react";
import type { Experience } from "../types";
import {
  EXPERIENCE_KIND_META,
  experienceKindLabel,
  formatExperienceRange,
  fourPartCount,
  isSafeHttpUrl,
} from "../lib/experience";

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
  "hover:text-ink inline-flex min-h-11 items-center text-[11px] text-ink/50 underline-offset-2 hover:underline sm:min-h-8";

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
  const completeness = fourPartCount(experience);
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
        "border-rule rounded-xl border bg-surface transition-colors",
        experience.confidence === "low"
          ? "border-amber/50 bg-amber/[0.03]"
          : "",
      ].join(" ")}
    >
      <div className="px-4 py-3.5 sm:px-5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <span
            className="rounded-full px-2 py-0.5 font-mono text-[9px] tracking-[0.04em]"
            style={{
              color: meta.color,
              backgroundColor: meta.pale,
            }}
          >
            {experienceKindLabel(experience.kind, experience.kindLabel)}
          </span>
          <span className="font-mono text-[10px] tabular-nums text-ink/45">
            {range}
          </span>
          {ongoing && (
            <span className="bg-ink/[0.06] rounded-full px-1.5 py-0.5 font-mono text-[9px] text-ink/55">
              进行中
            </span>
          )}
          {experience.confidence === "low" && (
            <span className="bg-amber/15 rounded-full px-1.5 py-0.5 font-mono text-[9px] text-amber">
              待确认
            </span>
          )}
          {experience.source === "sample" && (
            <span className="border-rule rounded-full border px-1.5 py-0.5 font-mono text-[9px] text-ink/35">
              示例
            </span>
          )}
        </div>

        <h3 className="mt-2 text-[15px] leading-6 font-medium tracking-tight break-words">
          {experience.title}
        </h3>
        {experience.org && (
          <p className="mt-0.5 text-[11px] leading-5 text-ink/50">
            {experience.org}
          </p>
        )}

        {!expanded && (
          <p
            className={[
              "mt-2 text-xs leading-5",
              summary ? "line-clamp-2 text-ink/60" : "text-ink/35",
            ].join(" ")}
          >
            {summary || "四段式待补：问题 → 方法 → 贡献 → 结果"}
          </p>
        )}

        {!expanded && skillPreview.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {skillPreview.map((skill) => (
              <li
                key={skill}
                className="bg-ink/[0.05] rounded-full px-2 py-0.5 text-[10px] text-ink/60"
              >
                {skill}
              </li>
            ))}
            {hiddenSkills > 0 && (
              <li className="px-1 py-0.5 font-mono text-[9px] text-ink/35">
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
                    <p className="font-mono text-[9px] tracking-[0.14em] text-ink/35">
                      {section.label}
                    </p>
                    <p className="mt-1 whitespace-pre-line text-xs leading-5 text-ink/70">
                      {experience[section.key]}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs leading-5 text-ink/40">
                四段式还没填。补齐问题、方法、贡献和结果，简历与岗位匹配才有素材。
              </p>
            )}

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="font-mono text-[9px] tracking-[0.14em] text-ink/35">
                  量化数据
                </p>
                {experience.metrics.length > 0 ? (
                  <dl className="mt-1.5">
                    {experience.metrics.map((metric) => (
                      <div
                        key={`${metric.label}-${metric.value}`}
                        className="border-rule/70 flex items-baseline justify-between gap-3 border-b py-1 last:border-b-0"
                      >
                        <dt className="text-[10px] text-ink/45">{metric.label}</dt>
                        <dd className="font-mono text-[11px] tabular-nums text-ink/75">
                          {metric.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="mt-1 text-[10px] leading-5 text-ink/35">
                    原文未提供量化数据，不做推测。
                  </p>
                )}
              </div>

              <div>
                <p className="font-mono text-[9px] tracking-[0.14em] text-ink/35">
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
                            className="border-rule hover:bg-ink/[0.03] inline-flex min-h-8 items-center gap-1 rounded-md border px-2 text-[10px] text-ink/65"
                          >
                            {item.label}
                            <span aria-hidden="true" className="text-ink/30">
                              ↗
                            </span>
                          </a>
                        </li>
                      ) : (
                        <li
                          key={`${item.label}-${index}`}
                          className="border-rule inline-flex min-h-8 items-center rounded-md border px-2 text-[10px] text-ink/55"
                        >
                          {item.label}
                        </li>
                      ),
                    )}
                  </ul>
                ) : (
                  <p className="mt-1 text-[10px] leading-5 text-ink/35">
                    暂无证据，可补报告、截图或链接。
                  </p>
                )}
              </div>
            </div>

            {(experience.skills.length > 0 || experience.tags.length > 0) && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {experience.skills.length > 0 && (
                  <div>
                    <p className="font-mono text-[9px] tracking-[0.14em] text-ink/35">
                      技能
                    </p>
                    <ul className="mt-1.5 flex flex-wrap gap-1.5">
                      {experience.skills.map((skill) => (
                        <li
                          key={skill}
                          className="bg-ink/[0.05] rounded-full px-2 py-0.5 text-[10px] text-ink/65"
                        >
                          {skill}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {experience.tags.length > 0 && (
                  <div>
                    <p className="font-mono text-[9px] tracking-[0.14em] text-ink/35">
                      标签
                    </p>
                    <ul className="mt-1.5 flex flex-wrap gap-1.5">
                      {experience.tags.map((tag) => (
                        <li
                          key={tag}
                          className="border-rule rounded-full border px-2 py-0.5 text-[10px] text-ink/45"
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

        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-rule pt-2">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className={BTN_ACTION}
            aria-expanded={expanded}
          >
            {expanded ? "收起" : "查看四段式"}
          </button>
          <span aria-hidden="true" className="text-ink/20">
            /
          </span>
          <button type="button" onClick={onEdit} className={BTN_ACTION}>
            编辑
          </button>
          {experience.confidence === "low" && (
            <>
              <span aria-hidden="true" className="text-ink/20">
                /
              </span>
              <button
                type="button"
                onClick={onConfirm}
                className="text-amber inline-flex min-h-11 items-center text-[11px] font-medium underline-offset-2 hover:underline sm:min-h-8"
              >
                确认无误
              </button>
            </>
          )}
          <span aria-hidden="true" className="text-ink/20">
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
          <span
            className={[
              "ml-auto font-mono text-[9px] tabular-nums",
              completeness === 4 ? "text-ink/30" : "text-amber/80",
            ].join(" ")}
            title="已填写的四段式段落数"
          >
            四段式 {completeness}/4
          </span>
        </div>
      </div>
    </article>
  );
}
