import { useMemo, useState } from "react";
import type {
  Experience,
  ExperienceKind,
  ResumeBulletCache,
} from "../types";
import {
  EXPERIENCE_KINDS,
  EXPERIENCE_KIND_META,
  experienceKindLabel,
  formatExperienceRange,
} from "../lib/experience";
import { bulletCacheNote, sortByEndDesc } from "../lib/resume";

export type PoolFilter = "all" | "selected" | "unselected";

interface ExperiencePoolProps {
  experiences: Experience[];
  selectedIds: string[];
  conciseIds: string[];
  bullets: Record<string, ResumeBulletCache>;
  filter: PoolFilter;
  kindFilter: ExperienceKind[];
  onFilterChange: (filter: PoolFilter) => void;
  onToggleKind: (kind: ExperienceKind) => void;
  onResetFilters: () => void;
  onToggleSelect: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onToggleConcise: (id: string) => void;
  onClear: () => void;
  onGenerate: (id: string) => void;
  generatingId: string | null;
  onNavigateExperiences: () => void;
}

const BTN_LINK =
  "hover:text-ink inline-flex min-h-11 items-center text-[11px] text-ink/50 underline-offset-2 hover:underline sm:min-h-8";
const BTN_SMALL =
  "border-rule hover:bg-ink/[0.03] inline-flex min-h-9 items-center justify-center rounded-md border bg-white px-2.5 text-[10px] text-ink/60 disabled:cursor-not-allowed disabled:opacity-40";

export default function ExperiencePool({
  experiences,
  selectedIds,
  conciseIds,
  bullets,
  filter,
  kindFilter,
  onFilterChange,
  onToggleKind,
  onResetFilters,
  onToggleSelect,
  onMove,
  onToggleConcise,
  onClear,
  onGenerate,
  generatingId,
  onNavigateExperiences,
}: ExperiencePoolProps) {
  const [confirmingLowId, setConfirmingLowId] = useState<string | null>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);

  const sorted = useMemo(() => sortByEndDesc(experiences), [experiences]);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const conciseSet = useMemo(() => new Set(conciseIds), [conciseIds]);

  const kindCounts = useMemo(() => {
    const counts = Object.fromEntries(
      EXPERIENCE_KINDS.map((kind) => [kind, 0]),
    ) as Record<ExperienceKind, number>;
    for (const item of experiences) counts[item.kind] += 1;
    return counts;
  }, [experiences]);

  const availableKinds = EXPERIENCE_KINDS.filter(
    (kind) => kindCounts[kind] > 0,
  );
  const selectedCount = sorted.filter((item) => selectedSet.has(item.id)).length;

  const filtered = sorted.filter((item) => {
    if (filter === "selected" && !selectedSet.has(item.id)) return false;
    if (filter === "unselected" && selectedSet.has(item.id)) return false;
    if (kindFilter.length > 0 && !kindFilter.includes(item.kind)) return false;
    return true;
  });

  function handleCheckbox(item: Experience, checked: boolean) {
    if (checked && item.confidence === "low") {
      setConfirmingLowId(item.id);
      return;
    }
    setConfirmingLowId(null);
    onToggleSelect(item.id);
  }

  if (experiences.length === 0) {
    return (
      <section className="border-rule rounded-xl border bg-white p-5">
        <p className="font-mono text-[10px] tracking-[0.16em] text-ink/40">
          经历池 · 空
        </p>
        <h2 className="mt-2 text-base font-medium tracking-tight">
          你还没有记录经历
        </h2>
        <p className="mt-2 text-sm leading-6 text-ink/60">
          去「经历」页记一条，简历会自动更新。课程设计、比赛、实习、作品都可以，
          没有数字就留空。
        </p>
        <button
          type="button"
          onClick={onNavigateExperiences}
          className="bg-ink text-paper mt-4 inline-flex min-h-11 items-center justify-center rounded-lg px-5 text-sm font-medium"
        >
          去记录经历
        </button>
      </section>
    );
  }

  return (
    <section aria-labelledby="resume-pool-title">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="font-mono text-[10px] tracking-[0.16em] text-ink/40">
            经历池 · {experiences.length} 条
          </p>
          <h2
            id="resume-pool-title"
            className="mt-1 text-base font-medium tracking-tight"
          >
            选择要写进简历的素材
          </h2>
        </div>
        {selectedCount > 0 && (
          <div className="flex items-center gap-2">
            {confirmingClear ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onClear();
                    setConfirmingClear(false);
                  }}
                  className="inline-flex min-h-11 items-center text-[11px] font-medium text-red-800 underline underline-offset-2 sm:min-h-8"
                >
                  确认清空 {selectedCount} 条
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingClear(false)}
                  className={BTN_LINK}
                >
                  取消
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingClear(true)}
                className={BTN_LINK}
              >
                清空已选
              </button>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5" aria-label="按加入状态筛选">
        <FilterPill
          active={filter === "all"}
          label="全部"
          count={experiences.length}
          onClick={() => onFilterChange("all")}
        />
        <FilterPill
          active={filter === "selected"}
          label="已加入"
          count={selectedCount}
          onClick={() => onFilterChange("selected")}
        />
        <FilterPill
          active={filter === "unselected"}
          label="未加入"
          count={experiences.length - selectedCount}
          onClick={() => onFilterChange("unselected")}
        />
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5" aria-label="按经历类型筛选">
        {availableKinds.map((kind) => {
          const active = kindFilter.includes(kind);
          return (
            <button
              key={kind}
              type="button"
              aria-pressed={active}
              onClick={() => onToggleKind(kind)}
              className={[
                "inline-flex min-h-9 items-center gap-1 rounded-full border px-2.5 text-[10px] transition-colors",
                active
                  ? "border-ink bg-ink text-paper"
                  : "border-rule bg-white text-ink/50 hover:bg-ink/[0.03]",
              ].join(" ")}
            >
              {EXPERIENCE_KIND_META[kind].label}
              <span
                className={[
                  "font-mono tabular-nums",
                  active ? "text-paper/55" : "text-ink/30",
                ].join(" ")}
              >
                {kindCounts[kind]}
              </span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="border-rule mt-3 rounded-xl border border-dashed px-4 py-6 text-center">
          <p className="text-xs text-ink/45">当前筛选下没有经历。</p>
          <button
            type="button"
            onClick={onResetFilters}
            className="text-ink/60 mt-1 inline-flex min-h-11 items-center text-xs underline underline-offset-2 hover:text-ink"
          >
            清除筛选
          </button>
        </div>
      ) : (
        <ul className="mt-3 space-y-2">
          {filtered.map((item) => {
            const selected = selectedSet.has(item.id);
            const concise = conciseSet.has(item.id);
            const order = selectedIds.indexOf(item.id) + 1;
            const cache = bullets[item.id];
            const low = item.confidence === "low";
            const meta = EXPERIENCE_KIND_META[item.kind];
            const range = formatExperienceRange(item.start, item.end);
            const skills = item.skills.slice(0, 3);
            const hiddenSkills = Math.max(0, item.skills.length - skills.length);
            const summary = item.result.trim() || item.problem.trim();
            const hasContent = Boolean(
              item.problem.trim() ||
                item.method.trim() ||
                item.contribution.trim() ||
                item.result.trim(),
            );
            const generating = generatingId === item.id;

            return (
              <li
                key={item.id}
                className={[
                  "border-rule rounded-xl border bg-white transition-colors",
                  selected ? "border-ink/25" : "",
                  low ? "bg-amber/[0.03]" : "",
                ].join(" ")}
              >
                <div className="p-3.5">
                  <label className="flex min-h-11 cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={(event) =>
                        handleCheckbox(item, event.target.checked)
                      }
                      aria-label={`${selected ? "从简历移除" : "加入简历"}《${item.title}》`}
                      className="accent-ink mt-1 h-4 w-4 shrink-0"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span
                          className="rounded-full px-2 py-0.5 font-mono text-[9px]"
                          style={{
                            color: meta.color,
                            backgroundColor: meta.pale,
                          }}
                        >
                          {experienceKindLabel(item.kind, item.kindLabel)}
                        </span>
                        <span className="font-mono text-[10px] tabular-nums text-ink/45">
                          {range}
                        </span>
                        {low && (
                          <span className="bg-amber/15 rounded-full px-1.5 py-0.5 font-mono text-[9px] text-amber">
                            待确认
                          </span>
                        )}
                        {selected && (
                          <span className="bg-ink/[0.06] rounded-full px-1.5 py-0.5 font-mono text-[9px] tabular-nums text-ink/55">
                            简历第 {order} 条
                          </span>
                        )}
                      </span>

                      <span className="mt-1.5 block text-[13px] leading-5 font-medium tracking-tight break-words">
                        {item.title}
                      </span>
                      {item.org && (
                        <span className="mt-0.5 block text-[10px] leading-4 text-ink/45">
                          {item.org}
                        </span>
                      )}
                      {!selected && summary && (
                        <span className="mt-1 line-clamp-2 block text-[11px] leading-5 text-ink/50">
                          {summary}
                        </span>
                      )}
                      {skills.length > 0 && (
                        <span className="mt-1.5 flex flex-wrap gap-1">
                          {skills.map((skill) => (
                            <span
                              key={skill}
                              className="bg-ink/[0.05] rounded-full px-1.5 py-0.5 text-[9px] text-ink/55"
                            >
                              {skill}
                            </span>
                          ))}
                          {hiddenSkills > 0 && (
                            <span className="px-1 py-0.5 font-mono text-[9px] text-ink/30">
                              +{hiddenSkills}
                            </span>
                          )}
                        </span>
                      )}
                    </span>
                  </label>

                  {confirmingLowId === item.id && !selected && (
                    <div
                      role="alert"
                      className="border-amber/40 bg-amber/[0.06] mt-2 rounded-lg border-l-2 px-3 py-2"
                    >
                      <p className="text-[11px] leading-5 text-ink/70">
                        这条经历标为「待确认」。加入简历前，建议先去经历页核对原文。
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            onToggleSelect(item.id);
                            setConfirmingLowId(null);
                          }}
                          className="text-amber inline-flex min-h-11 items-center text-[11px] font-medium underline underline-offset-2 sm:min-h-8"
                        >
                          仍要加入
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingLowId(null)}
                          className={BTN_LINK}
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  )}

                  {selected && (
                    <div className="border-rule mt-2.5 border-t pt-2">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-mono text-[9px] tracking-[0.1em] text-ink/35">
                          排序
                        </span>
                        <button
                          type="button"
                          onClick={() => onMove(item.id, -1)}
                          disabled={order <= 1}
                          aria-label={`上移《${item.title}》`}
                          className={BTN_SMALL}
                        >
                          ↑ 上移
                        </button>
                        <button
                          type="button"
                          onClick={() => onMove(item.id, 1)}
                          disabled={order >= selectedIds.length}
                          aria-label={`下移《${item.title}》`}
                          className={BTN_SMALL}
                        >
                          ↓ 下移
                        </button>
                        <span aria-hidden="true" className="text-ink/20">
                          /
                        </span>
                        <label className="flex min-h-9 cursor-pointer items-center gap-1.5 text-[10px] text-ink/60">
                          <input
                            type="checkbox"
                            checked={concise}
                            onChange={() => onToggleConcise(item.id)}
                            className="accent-ink h-3.5 w-3.5"
                          />
                          精简为 1 行
                        </label>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onGenerate(item.id)}
                          disabled={generating}
                          className="border-rule hover:bg-ink/[0.03] inline-flex min-h-9 items-center justify-center rounded-md border bg-white px-2.5 text-[10px] font-medium text-ink/70 disabled:cursor-wait disabled:opacity-50"
                        >
                          {generating
                            ? "生成中…"
                            : cache
                              ? "重新生成要点"
                              : "生成要点"}
                        </button>
                        {cache ? (
                          <span
                            className={[
                              "rounded-full px-1.5 py-0.5 font-mono text-[9px]",
                              cache.source === "ai"
                                ? "bg-[#E7EDF6] text-[#1C3355]"
                                : cache.status === "fallback"
                                  ? "bg-amber/15 text-amber"
                                  : "bg-ink/[0.06] text-ink/55",
                            ].join(" ")}
                          >
                            {cache.source === "ai"
                              ? "AI 生成"
                              : cache.status === "fallback"
                                ? "原文兜底"
                                : "本地草稿"}
                          </span>
                        ) : (
                          <span className="font-mono text-[9px] text-ink/30">
                            当前显示原文
                          </span>
                        )}
                      </div>

                      {cache && (
                        <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-ink/40">
                          {bulletCacheNote(cache)}
                        </p>
                      )}
                      {!hasContent && (
                        <p className="mt-1 text-[10px] leading-4 text-amber">
                          四段式为空，请先去经历页补充。
                          <button
                            type="button"
                            onClick={onNavigateExperiences}
                            className="ml-1 underline underline-offset-2"
                          >
                            去补充
                          </button>
                        </p>
                      )}
                      {low && (
                        <p className="mt-1 text-[10px] leading-4 text-amber">
                          待确认经历已加入，导出前请核对原文。
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function FilterPill({
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
        "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-[11px] transition-colors",
        active
          ? "border-ink bg-ink text-paper"
          : "border-rule bg-white text-ink/55 hover:bg-ink/[0.03]",
      ].join(" ")}
    >
      {label}
      <span
        className={[
          "font-mono text-[9px] tabular-nums",
          active ? "text-paper/55" : "text-ink/30",
        ].join(" ")}
      >
        {count}
      </span>
    </button>
  );
}
