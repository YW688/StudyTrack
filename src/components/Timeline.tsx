import { useEffect, useRef, useState } from "react";
import type { Experience } from "../types";
import {
  EXPERIENCE_KIND_META,
  experienceKindLabel,
  formatExperienceRange,
  isSafeHttpUrl,
  resumeReadiness,
  type ExperienceTermGroup,
} from "../lib/experience";
import { tierStars } from "../lib/level";
import TierPips from "./TierPips";

export type TimelineVariant = "rope" | "hand";

const DETAIL_SECTIONS: {
  key: "problem" | "method" | "contribution" | "result";
  label: string;
}[] = [
  { key: "problem", label: "问题" },
  { key: "method", label: "方法" },
  { key: "contribution", label: "我的贡献" },
  { key: "result", label: "结果" },
];

interface TimelineProps {
  groups: ExperienceTermGroup[];
  undated: Experience[];
  variant?: TimelineVariant;
  onVariantChange: (variant: TimelineVariant) => void;
  onEdit: (experience: Experience) => void;
  onDelete: (id: string) => Promise<void>;
  onConfirm: (id: string) => void;
}

export default function Timeline({
  groups,
  undated,
  variant = "rope",
  onVariantChange,
  onEdit,
  onDelete,
  onConfirm,
}: TimelineProps) {
  const [allOpen, setAllOpen] = useState(false);

  return (
    <div className={`tl tl-${variant}`}>
      <div className="tl-tools">
        <div
          role="group"
          aria-label="时间线样式"
          className="border-rule flex items-center gap-0.5 rounded-lg border p-0.5"
        >
          <StyleButton
            active={variant === "rope"}
            label="简略"
            onClick={() => onVariantChange("rope")}
          />
          <StyleButton
            active={variant === "hand"}
            label="手写"
            onClick={() => onVariantChange("hand")}
          />
        </div>

        <button
          type="button"
          className="tl-tool"
          aria-pressed={allOpen}
          onClick={() => setAllOpen((value) => !value)}
        >
          {allOpen ? "收起全部" : "全部展开"}
        </button>
      </div>

      {groups.map((group) => (
        <section
          key={group.term.key}
          aria-label={`${group.term.label} 学期`}
          className="tl-group"
        >
          <TermHeader label={group.term.label} count={group.items.length} />
          <ol className="tl-list">
            {group.items.map((experience) => (
              <TimelineRow
                key={experience.id}
                experience={experience}
                expanded={allOpen}
                onEdit={onEdit}
                onDelete={onDelete}
                onConfirm={onConfirm}
              />
            ))}
          </ol>
        </section>
      ))}

      {undated.length > 0 && (
        <section aria-label="未标时间的经历" className="tl-group">
          <TermHeader label="未标时间" count={undated.length} muted />
          <ol className="tl-list">
            {undated.map((experience) => (
              <TimelineRow
                key={experience.id}
                experience={experience}
                expanded={allOpen}
                onEdit={onEdit}
                onDelete={onDelete}
                onConfirm={onConfirm}
              />
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

function TermHeader({
  label,
  count,
  muted = false,
}: {
  label: string;
  count: number;
  muted?: boolean;
}) {
  return (
    <header className="tl-term">
      <span aria-hidden="true" className="tl-term-knot" />
      <p className={muted ? "tl-term-label is-muted" : "tl-term-label"}>
        {label}
      </p>
      <span aria-hidden="true" className="tl-term-rule" />
      <span className="tl-term-count">{count} 段</span>
    </header>
  );
}

function StyleButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={[
        "inline-flex min-h-11 items-center rounded-md px-2.5 text-xs transition-colors sm:min-h-8",
        active
          ? "bg-ink text-paper font-medium"
          : "text-ink-3 hover:bg-ink/[0.05]",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function TimelineRow({
  experience,
  expanded,
  onEdit,
  onDelete,
  onConfirm,
}: {
  experience: Experience;
  expanded: boolean;
  onEdit: (experience: Experience) => void;
  onDelete: (id: string) => Promise<void>;
  onConfirm: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const meta = EXPERIENCE_KIND_META[experience.kind];
  const range = formatExperienceRange(experience.start, experience.end);
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
  const pending = experience.confidence === "low";
  const summary =
    experience.result.trim() ||
    experience.problem.trim() ||
    experience.method.trim() ||
    experience.contribution.trim();
  const detailSections = DETAIL_SECTIONS.filter(
    (section) => experience[section.key].trim().length > 0,
  );
  const hasDetail =
    detailSections.length > 0 ||
    experience.metrics.length > 0 ||
    experience.evidence.length > 0 ||
    experience.skills.length > 0;

  async function handleDelete() {
    setDeleting(true);
    try {
      await onDelete(experience.id);
    } catch {
      setDeleting(false);
      setConfirming(false);
    }
  }

  return (
    <li className="tl-item">
      <span aria-hidden="true" className="tl-node-cell">
        <span className="tl-node" style={{ color: meta.color }} />
      </span>

      <article className="tl-body">
        <div className="tl-meta">
          <span className="tl-date">{range}</span>
          <span
            className="tl-kind"
            style={{ color: meta.color, backgroundColor: meta.pale }}
          >
            {experienceKindLabel(experience.kind, experience.kindLabel)}
          </span>
          <span className={`tl-quality${tierUp ? " is-tier-up" : ""}`}>
            <TierPips units={tier} total={4} label={`品质 ${tier}/4`} />
            <span className="tl-quality-text" aria-hidden="true">
              品质 {tier}/4
            </span>
          </span>
          {ready && <span className="tl-ready">简历就绪</span>}
          {pending && <span className="tl-pending">待确认</span>}
        </div>

        <h3 className="tl-title">
          {experience.title}
          {experience.org && (
            <span className="tl-org">{experience.org}</span>
          )}
        </h3>

        <p className={summary ? "tl-summary" : "tl-summary is-empty"}>
          {summary || "结果还没填 补一句就能进简历"}
        </p>

        {expanded && (
          <div className="tl-detail">
            {detailSections.map((section) => (
              <div key={section.key} className="tl-detail-row">
                <p className="tl-detail-label">{section.label}</p>
                <p className="tl-detail-text">{experience[section.key]}</p>
              </div>
            ))}
            {experience.metrics.length > 0 && (
              <div className="tl-detail-row">
                <p className="tl-detail-label">数据</p>
                <p className="tl-detail-text">
                  {experience.metrics
                    .map((metric) => `${metric.label} ${metric.value}`)
                    .join(" ")}
                </p>
              </div>
            )}
            {experience.evidence.length > 0 && (
              <div className="tl-detail-row">
                <p className="tl-detail-label">证据</p>
                <p className="tl-detail-text">
                  {experience.evidence.map((item, index) => (
                    <span key={`${item.label}-${index}`}>
                      {index > 0 && " "}
                      {isSafeHttpUrl(item.url) ? (
                        <a href={item.url} target="_blank" rel="noreferrer">
                          {item.label}
                        </a>
                      ) : (
                        item.label
                      )}
                    </span>
                  ))}
                </p>
              </div>
            )}
            {experience.skills.length > 0 && (
              <div className="tl-detail-row">
                <p className="tl-detail-label">技能</p>
                <p className="tl-detail-text">
                  {experience.skills.join(" ")}
                </p>
              </div>
            )}
            {!hasDetail && (
              <p className="tl-detail-empty">四段式还没填 点编辑补齐</p>
            )}
          </div>
        )}

        <div className="tl-actions">
          <button
            type="button"
            className="tl-action"
            onClick={() => onEdit(experience)}
          >
            编辑
          </button>
          {pending && (
            <button
              type="button"
              className="tl-action"
              onClick={() => onConfirm(experience.id)}
            >
              确认
            </button>
          )}
          {confirming ? (
            <>
              <button
                type="button"
                className="tl-action is-danger"
                disabled={deleting}
                onClick={() => void handleDelete()}
              >
                {deleting ? "删除中" : "确认删除"}
              </button>
              <button
                type="button"
                className="tl-action"
                onClick={() => setConfirming(false)}
              >
                取消
              </button>
            </>
          ) : (
            <button
              type="button"
              className="tl-action"
              onClick={() => setConfirming(true)}
            >
              删除
            </button>
          )}
        </div>
      </article>
    </li>
  );
}
