import { useMemo, useState } from "react";
import type {
  Experience,
  ExperienceData,
  ExperienceKind,
} from "../../types";
import {
  EXPERIENCE_KINDS,
  EXPERIENCE_KIND_META,
  buildTermAxis,
  groupExperiencesByTerm,
  relativeDaysLabel,
  summarizeExperienceActivity,
  termStartMonth,
} from "../../lib/experience";
import Timeline from "../../components/Timeline";
import { createSampleExperiences } from "../../store/fixtures/experiences";
import ExperienceEditor, {
  type ExperienceFormValue,
} from "./ExperienceEditor";

interface ExperiencesPageProps {
  data: ExperienceData | null;
  onSave: (data: ExperienceData) => Promise<void>;
}

type KindFilter = ExperienceKind | "all";

const EMPTY: Experience[] = [];

const BTN_PRIMARY =
  "bg-ink text-paper inline-flex min-h-11 items-center justify-center rounded-lg px-5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40";
const BTN_SECONDARY =
  "border-rule hover:bg-ink/[0.03] inline-flex min-h-11 items-center justify-center rounded-lg border px-4 text-sm disabled:cursor-not-allowed disabled:opacity-40";

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `experience-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function ExperiencesPage({
  data,
  onSave,
}: ExperiencesPageProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Experience | null>(null);
  const [defaultStart, setDefaultStart] = useState<string | undefined>();
  const [filter, setFilter] = useState<KindFilter>("all");
  const [notice, setNotice] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [sampleBusy, setSampleBusy] = useState(false);

  const items = data?.experiences ?? EMPTY;

  const timeline = useMemo(() => groupExperiencesByTerm(items), [items]);
  const axis = useMemo(() => buildTermAxis(items), [items]);
  const activity = useMemo(() => summarizeExperienceActivity(items), [items]);
  const kindCounts = useMemo(() => {
    const counts = Object.fromEntries(
      EXPERIENCE_KINDS.map((kind) => [kind, 0]),
    ) as Record<ExperienceKind, number>;
    for (const item of items) counts[item.kind] += 1;
    return counts;
  }, [items]);

  const availableKinds = EXPERIENCE_KINDS.filter(
    (kind) => kindCounts[kind] > 0,
  );
  const effectiveFilter =
    filter !== "all" && kindCounts[filter] === 0 ? "all" : filter;
  const filtered =
    effectiveFilter === "all"
      ? items
      : items.filter((item) => item.kind === effectiveFilter);
  const filteredTimeline = useMemo(
    () => groupExperiencesByTerm(filtered),
    [filtered],
  );
  const undatedCount = timeline.undated.length;

  async function persist(nextItems: Experience[], label?: string) {
    const next: ExperienceData = {
      experiences: nextItems,
      updatedAt: new Date().toISOString(),
      sourceLabel: label ?? data?.sourceLabel,
    };
    await onSave(next);
  }

  function openCreate(start?: string) {
    setEditing(null);
    setDefaultStart(start);
    setDialogOpen(true);
  }

  function openEdit(experience: Experience) {
    setEditing(experience);
    setDefaultStart(undefined);
    setDialogOpen(true);
  }

  function closeEditor() {
    setDialogOpen(false);
    setEditing(null);
    setDefaultStart(undefined);
  }

  async function handleSave(value: ExperienceFormValue) {
    const now = new Date().toISOString();
    if (editing) {
      const nextItem: Experience = { ...editing, ...value, updatedAt: now };
      await persist(
        items.map((item) => (item.id === editing.id ? nextItem : item)),
      );
      setNotice(`已更新《${value.title}》`);
    } else {
      const created: Experience = {
        id: makeId(),
        ...value,
        confidence: "high",
        source: "manual",
        createdAt: now,
        updatedAt: now,
      };
      await persist([created, ...items]);
      setNotice(`已记录《${value.title}》`);
    }
    setSaveError(null);
    closeEditor();
  }

  async function handleDelete(id: string) {
    const target = items.find((item) => item.id === id);
    try {
      await persist(items.filter((item) => item.id !== id));
      setNotice(target ? `已删除《${target.title}》` : "已删除经历");
      setSaveError(null);
    } catch {
      setSaveError("写入本机失败，删除未生效。请检查浏览器存储权限后重试。");
    }
  }

  async function handleConfirm(id: string) {
    const now = new Date().toISOString();
    try {
      await persist(
        items.map((item) =>
          item.id === id
            ? { ...item, confidence: "high" as const, updatedAt: now }
            : item,
        ),
      );
      setNotice("已确认该条经历");
      setSaveError(null);
    } catch {
      setSaveError("写入本机失败，确认没有保存。请检查浏览器存储权限后重试。");
    }
  }

  async function handleSample() {
    setSampleBusy(true);
    try {
      const sample = createSampleExperiences();
      await onSave(sample);
      setNotice("已写入 6 条示例经历，可随时编辑或删除。");
      setSaveError(null);
    } catch {
      setSaveError("示例经历写入失败，请检查浏览器存储权限后重试。");
    } finally {
      setSampleBusy(false);
    }
  }

  return (
    <div className="px-4 pb-10 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <header className="border-rule flex flex-col gap-4 border-b py-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-[10px] tracking-[0.2em] text-ink/40">
              M2 · 经历 / 04
            </p>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1 className="font-serif text-2xl tracking-tight sm:text-3xl">
                经历库
              </h1>
              {items.length > 0 && (
                <span className="bg-ink/[0.05] rounded-full px-2 py-0.5 font-mono text-[10px] text-ink/55">
                  {items.length} 条
                </span>
              )}
            </div>
            <p className="mt-2 text-xs leading-5 text-ink/55">
              一条经历 = 一份可复用的简历素材。按学期沉淀，空白的学期就是待补的缺口。
            </p>
            {items.length > 0 && (
              <p className="mt-1 font-mono text-[10px] tabular-nums text-ink/35">
                覆盖 {availableKinds.length} 类 · 最近记录{" "}
                {relativeDaysLabel(activity.daysSinceLatest)}
                {activity.stale && (
                  <span className="text-amber"> · 已超过 30 天</span>
                )}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => openCreate()}
              className={BTN_PRIMARY}
            >
              记录一段经历
            </button>
          </div>
        </header>

        {notice && (
          <p
            role="status"
            className="border-rule mt-4 flex items-center gap-2 rounded-lg border bg-surface px-3 py-2 text-xs text-ink/60"
          >
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full bg-accent"
            />
            {notice}
          </p>
        )}

        {saveError && (
          <p
            role="alert"
            className="border-amber/50 bg-amber/[0.07] mt-4 rounded-lg border-l-2 px-3 py-2 text-xs leading-5 text-ink/75"
          >
            {saveError}
          </p>
        )}

        {items.length === 0 ? (
          <>
            <section className="border-rule mt-5 rounded-xl border bg-surface p-5 sm:p-8">
              <p className="font-mono text-[10px] tracking-[0.16em] text-ink/40">
                本机还没有经历
              </p>
              <h2 className="mt-2 text-lg font-medium tracking-tight">
                从一件已经做完的事开始
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-ink/60">
                课程设计、比赛、科研、实习、作品、志愿，或其他类型。先写标题和时间，
                四段式可以慢慢补；没有数字就留空，不会替你编。
              </p>

              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => openCreate()}
                  className={BTN_PRIMARY}
                >
                  记录第一条经历
                </button>
                <button
                  type="button"
                  onClick={() => void handleSample()}
                  disabled={sampleBusy}
                  className={BTN_SECONDARY}
                >
                  {sampleBusy ? "正在写入…" : "用 6 条示例经历体验"}
                </button>
              </div>

              <p className="mt-4 text-[11px] leading-5 text-ink/40">
                示例只写入本机浏览器，可随时编辑或删除；不会上传任何内容。
              </p>
            </section>

            <section className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                {
                  title: "四段式",
                  text: "问题、方法、我的贡献、结果。每段一到两句，简历直接用。",
                },
                {
                  title: "证据与技能",
                  text: "报告、截图、作品链接和技能标签，面试前不用再翻硬盘。",
                },
                {
                  title: "学期时间线",
                  text: "按学期倒序排列，哪一学期是空的，一眼就能看到。",
                },
              ].map((feature) => (
                <div
                  key={feature.title}
                  className="border-rule rounded-xl border border-dashed px-4 py-3"
                >
                  <p className="text-xs font-medium">{feature.title}</p>
                  <p className="mt-1 text-[11px] leading-5 text-ink/45">
                    {feature.text}
                  </p>
                </div>
              ))}
            </section>
          </>
        ) : (
          <>
            <section className="border-rule mt-5 overflow-hidden rounded-xl border bg-surface">
              <header className="border-rule flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-5">
                <div>
                  <p className="font-mono text-[9px] tracking-[0.16em] text-ink/40">
                    学期轴
                  </p>
                  <h2 className="mt-0.5 text-sm font-medium">四年经历分布</h2>
                </div>
                <p className="text-right text-[10px] leading-4 text-ink/40">
                  空白学期
                  <br />
                  就是简历缺口
                </p>
              </header>

              <div className="px-4 py-3 sm:px-5">
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {axis.map((cell) => {
                    const empty = cell.count === 0;
                    return (
                      <div
                        key={cell.term.key}
                        className={[
                          "min-w-[88px] flex-1 rounded-lg border px-3 py-2.5",
                          empty
                            ? "border-rule border-dashed bg-paper"
                            : "border-rule bg-paper",
                        ].join(" ")}
                      >
                        <p className="font-mono text-[10px] tracking-[0.04em] text-ink/45">
                          {cell.term.label}
                        </p>
                        <p className="mt-1 flex items-baseline gap-1">
                          <span
                            className={[
                              "font-serif text-xl leading-none tabular-nums",
                              empty ? "text-ink/25" : "text-ink",
                            ].join(" ")}
                          >
                            {cell.count}
                          </span>
                          <span className="text-[9px] text-ink/35">条</span>
                        </p>
                        {empty ? (
                          <button
                            type="button"
                            onClick={() => openCreate(termStartMonth(cell.term))}
                            className="text-accent-ink -ml-2 mt-0.5 inline-flex min-h-11 min-w-11 items-center px-2 text-[10px] underline underline-offset-2"
                          >
                            补记
                          </button>
                        ) : (
                          <p className="mt-1 font-mono text-[9px] text-ink/30">
                            有记录
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                <p className="mt-2 text-[10px] leading-5 text-ink/35">
                  秋季按 8 月至次年 1 月归档，春季按 2 至 7 月归档。
                  {undatedCount > 0 &&
                    ` 另有 ${undatedCount} 条未标时间，排在时间线末尾。`}
                </p>
              </div>
            </section>

            <section
              aria-label="按类型筛选"
              className="mt-4 flex flex-wrap items-center gap-1.5"
            >
              <FilterButton
                active={effectiveFilter === "all"}
                label="全部"
                count={items.length}
                onClick={() => setFilter("all")}
              />
              {availableKinds.map((kind) => (
                <FilterButton
                  key={kind}
                  active={effectiveFilter === kind}
                  label={EXPERIENCE_KIND_META[kind].label}
                  count={kindCounts[kind]}
                  onClick={() => setFilter(kind)}
                />
              ))}
            </section>

            <section className="mt-5">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-sm font-medium">
                  {effectiveFilter === "all"
                    ? "全部经历"
                    : EXPERIENCE_KIND_META[effectiveFilter].label}
                </h2>
                <span className="font-mono text-[10px] text-ink/35">
                  按学期倒序 · {filtered.length} 条
                </span>
              </div>

              {filtered.length > 0 ? (
                <Timeline
                  groups={filteredTimeline.groups}
                  undated={filteredTimeline.undated}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  onConfirm={(id) => void handleConfirm(id)}
                />
              ) : (
                <p className="border-rule mt-2 rounded-xl border border-dashed px-4 py-6 text-center text-xs text-ink/45">
                  这一学期还没有经历。
                  <button
                    type="button"
                    onClick={() => openCreate()}
                    className="text-ink/60 ml-1 underline underline-offset-2 hover:text-ink"
                  >
                    补一条
                  </button>
                </p>
              )}
            </section>
          </>
        )}

        <div className="border-rule mt-6 border-t pt-4">
          <p className="flex items-center gap-2 text-[11px] text-ink/35">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full bg-accent"
            />
            数据只存在你的浏览器 · 四段式与证据都可在简历阶段复用
          </p>
        </div>
      </div>

      {dialogOpen && (
        <ExperienceEditor
          initial={editing}
          defaultStart={defaultStart}
          onClose={closeEditor}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

function FilterButton({
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
        "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 text-xs transition-colors sm:min-h-9",
        active
          ? "bg-ink border-ink text-paper"
          : "border-rule bg-surface text-ink/55 hover:bg-ink/[0.03]",
      ].join(" ")}
    >
      {label}
      <span
        className={[
          "font-mono text-[9px] tabular-nums",
          active ? "text-paper/60" : "text-ink/30",
        ].join(" ")}
      >
        {count}
      </span>
    </button>
  );
}
