import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import type {
  Experience,
  ExperienceEvidence,
  ExperienceKind,
  ExperienceMetric,
} from "../../types";
import {
  EXPERIENCE_KINDS,
  EXPERIENCE_KIND_META,
  isSafeHttpUrl,
  normalizeMonth,
  splitLabels,
} from "../../lib/experience";
import { FloatField } from "../../components/FloatField";

export interface ExperienceFormValue {
  kind: ExperienceKind;
  kindLabel?: string;
  title: string;
  org?: string;
  start?: string;
  end?: string;
  problem: string;
  method: string;
  contribution: string;
  result: string;
  metrics: ExperienceMetric[];
  evidence: ExperienceEvidence[];
  skills: string[];
  tags: string[];
}

interface ExperienceEditorProps {
  initial: Experience | null;
  defaultStart?: string;
  initialMethod?: string;
  onClose: () => void;
  onSave: (value: ExperienceFormValue) => Promise<void>;
}

const BTN_PRIMARY =
  "bg-ink text-paper inline-flex min-h-11 items-center justify-center rounded-lg px-5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40";
const BTN_SECONDARY =
  "border-rule hover:bg-ink/[0.03] inline-flex min-h-11 items-center justify-center rounded-lg border px-4 text-sm";

const PARTS = [
  { key: "problem", label: "问题" },
  { key: "method", label: "方法" },
  { key: "contribution", label: "我的贡献" },
  { key: "result", label: "结果" },
] as const;

export default function ExperienceEditor({
  initial,
  defaultStart,
  initialMethod,
  onClose,
  onSave,
}: ExperienceEditorProps) {
  const [kind, setKind] = useState<ExperienceKind>(
    initial?.kind ?? "course",
  );
  const [kindLabel, setKindLabel] = useState(initial?.kindLabel ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [org, setOrg] = useState(initial?.org ?? "");
  const [start, setStart] = useState(
    initial?.start ?? normalizeMonth(defaultStart) ?? "",
  );
  const [end, setEnd] = useState(initial?.end ?? "");
  const [parts, setParts] = useState({
    problem: initial?.problem ?? "",
    method: initial?.method ?? initialMethod ?? "",
    contribution: initial?.contribution ?? "",
    result: initial?.result ?? "",
  });
  const [metrics, setMetrics] = useState<ExperienceMetric[]>(
    initial ? initial.metrics.map((metric) => ({ ...metric })) : [],
  );
  const [evidence, setEvidence] = useState<ExperienceEvidence[]>(
    initial ? initial.evidence.map((item) => ({ ...item })) : [],
  );
  const [skillsText, setSkillsText] = useState(
    initial?.skills.join("，") ?? "",
  );
  const [tagsText, setTagsText] = useState(initial?.tags.join("，") ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  // 弹层嵌在列表的滚动容器里，autoFocus 会让 Chrome 顺手把底下的列表滚到输入框
  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  function updatePart(key: keyof typeof parts, value: string) {
    setParts((current) => ({ ...current, [key]: value }));
  }

  function updateMetric(index: number, patch: Partial<ExperienceMetric>) {
    setMetrics((current) =>
      current.map((metric, i) => (i === index ? { ...metric, ...patch } : metric)),
    );
  }

  function updateEvidence(index: number, patch: Partial<ExperienceEvidence>) {
    setEvidence((current) =>
      current.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError("请先填写经历标题");
      return;
    }
    if (start && end && end < start) {
      setError("结束月份不能早于开始月份");
      return;
    }

    const cleanMetrics: ExperienceMetric[] = [];
    for (let i = 0; i < metrics.length; i += 1) {
      const label = metrics[i].label.trim();
      const value = metrics[i].value.trim();
      if (!label && !value) continue;
      if (!label || !value) {
        setError(`第 ${i + 1} 条量化数据缺少名称或数值，请补齐或删除。`);
        return;
      }
      cleanMetrics.push({ label, value });
    }

    const cleanEvidence: ExperienceEvidence[] = [];
    for (let i = 0; i < evidence.length; i += 1) {
      const label = evidence[i].label.trim();
      const url = evidence[i].url?.trim() ?? "";
      if (!label && !url) continue;
      if (!label) {
        setError(`第 ${i + 1} 条证据缺少名称。`);
        return;
      }
      if (url && !isSafeHttpUrl(url)) {
        setError(`第 ${i + 1} 条证据链接需要以 http:// 或 https:// 开头。`);
        return;
      }
      cleanEvidence.push(url ? { label, url } : { label });
    }

    const value: ExperienceFormValue = {
      kind,
      kindLabel: kind === "other" ? kindLabel.trim() || undefined : undefined,
      title: cleanTitle,
      org: org.trim() || undefined,
      start: normalizeMonth(start),
      end: normalizeMonth(end),
      problem: parts.problem.trim(),
      method: parts.method.trim(),
      contribution: parts.contribution.trim(),
      result: parts.result.trim(),
      metrics: cleanMetrics,
      evidence: cleanEvidence,
      skills: splitLabels(skillsText),
      tags: splitLabels(tagsText),
    };

    setSaving(true);
    try {
      await onSave(value);
    } catch {
      setError("写入本机失败 请检查浏览器存储权限后重试");
      setSaving(false);
    }
  }

  return (
    <div
      className="bg-ink/30 fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="experience-editor-title"
        className="bg-paper flex max-h-[92dvh] w-full flex-col rounded-t-2xl sm:max-w-2xl sm:rounded-2xl"
      >
        <header className="border-rule flex items-start justify-between gap-4 border-b px-5 py-4">
          <div>
            <p className="font-mono text-micro tracking-[0.18em] text-ink-4">
              征途 经历 {initial ? "编辑" : "新记录"}
            </p>
            <h2
              id="experience-editor-title"
              className="mt-1 text-base font-medium"
            >
              {initial ? "编辑经历" : "记录一段经历"}
            </h2>
            <p className="mt-1 text-xs leading-5 text-ink-3">
              没有数字就留空
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            disabled={saving}
            className="hover:bg-ink/[0.04] flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg text-ink-3 disabled:opacity-40"
          >
            ×
          </button>
        </header>

        <form
          id="experience-form"
          noValidate
          onSubmit={(event) => void handleSubmit(event)}
          className="min-h-0 flex-1 overflow-y-auto px-5 py-5"
        >
          <section aria-labelledby="experience-basics">
            <SectionLabel index="01" id="experience-basics" label="基本信息" />
            <div className="mt-3 space-y-3">
              <div>
                <span className="mb-1.5 block text-xs text-ink-3">类型</span>
                <div
                  role="group"
                  aria-label="经历类型"
                  className="grid grid-cols-2 gap-1.5 sm:grid-cols-3"
                >
                  {EXPERIENCE_KINDS.map((item) => {
                    const meta = EXPERIENCE_KIND_META[item];
                    const active = item === kind;
                    return (
                      <button
                        key={item}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setKind(item)}
                        className={[
                          "min-h-11 rounded-lg border px-2 text-xs transition-colors",
                          active ? "font-medium" : "border-rule bg-surface text-ink-3 hover:bg-ink/[0.03]",
                        ].join(" ")}
                        style={
                          active
                            ? {
                                color: meta.color,
                                backgroundColor: meta.pale,
                                borderColor: meta.color,
                              }
                            : undefined
                        }
                      >
                        {meta.label}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1.5 text-micro leading-4 text-ink-4">
                  {EXPERIENCE_KIND_META[kind].hint}
                </p>

                {kind === "other" && (
                  <div className="mt-2">
                    <FloatField
                      id="experience-kind-label"
                      label="自定义类型"
                      value={kindLabel}
                      onChange={setKindLabel}
                      maxLength={20}
                      hint="留空显示「其他」"
                    />
                  </div>
                )}
              </div>

              <FloatField
                id="experience-title"
                label="标题"
                value={title}
                onChange={setTitle}
                maxLength={120}
                required
                inputRef={(node) => {
                  titleRef.current = node;
                }}
              />

              <FloatField
                id="experience-org"
                label="组织 课程 赛事"
                value={org}
                onChange={setOrg}
                maxLength={80}
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <FloatField
                  id="experience-start"
                  label="开始月份"
                  type="month"
                  value={start}
                  onChange={setStart}
                />
                <FloatField
                  id="experience-end"
                  label="结束月份"
                  type="month"
                  value={end}
                  onChange={setEnd}
                  hint="留空表示进行中"
                />
              </div>
            </div>
          </section>

          <section aria-labelledby="experience-parts" className="mt-6">
            <SectionLabel index="02" id="experience-parts" label="四段式" />
            <p className="mt-1 text-[11px] leading-5 text-ink-3">
              问题 → 方法 → 我的贡献 → 结果
            </p>
            <div className="mt-3 space-y-3">
              {PARTS.map((part) => (
                <FloatField
                  key={part.key}
                  id={`experience-${part.key}`}
                  label={part.label}
                  value={parts[part.key]}
                  onChange={(value) => updatePart(part.key, value)}
                  multiline
                  rows={3}
                  maxLength={2000}
                />
              ))}
            </div>
          </section>

          <section aria-labelledby="experience-proof" className="mt-6">
            <SectionLabel index="03" id="experience-proof" label="证据与标签" />
            <p className="mt-1 text-[11px] leading-5 text-ink-3">
              没有就留空 证据可以是报告 截图 作品链接
            </p>

            <div className="mt-3">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-xs text-ink-3">量化数据</p>
                <p className="text-micro text-ink-4">名称 + 数值</p>
              </div>
              <div className="mt-1.5 space-y-1.5">
                {metrics.map((metric, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_44px] gap-1.5"
                  >
                    <FloatField
                      label="名称"
                      value={metric.label}
                      onChange={(value) => updateMetric(index, { label: value })}
                      maxLength={40}
                    />
                    <FloatField
                      label="数值"
                      value={metric.value}
                      onChange={(value) => updateMetric(index, { value })}
                      maxLength={80}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setMetrics((current) =>
                          current.filter((_, i) => i !== index),
                        )
                      }
                      aria-label={`删除第 ${index + 1} 条量化数据`}
                      className="border-rule hover:bg-ink/[0.03] flex h-11 w-11 items-center justify-center rounded-md border text-sm text-ink-3"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() =>
                  setMetrics((current) => [...current, { label: "", value: "" }])
                }
                disabled={metrics.length >= 20}
                className="border-rule hover:bg-ink/[0.03] mt-1.5 inline-flex min-h-11 items-center rounded-lg border border-dashed px-3 text-[11px] text-ink-3 disabled:opacity-40 sm:min-h-9"
              >
                + 添加量化数据
              </button>
            </div>

            <div className="mt-4">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-xs text-ink-3">证据</p>
                <p className="text-micro text-ink-4">名称 + 链接（可空）</p>
              </div>
              <div className="mt-1.5 space-y-1.5">
                {evidence.map((item, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_44px] gap-1.5"
                  >
                    <FloatField
                      label="名称"
                      value={item.label}
                      onChange={(value) => updateEvidence(index, { label: value })}
                      maxLength={60}
                    />
                    <FloatField
                      label="链接"
                      value={item.url ?? ""}
                      onChange={(value) =>
                        updateEvidence(index, { url: value || undefined })
                      }
                      maxLength={500}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setEvidence((current) =>
                          current.filter((_, i) => i !== index),
                        )
                      }
                      aria-label={`删除第 ${index + 1} 条证据`}
                      className="border-rule hover:bg-ink/[0.03] flex h-11 w-11 items-center justify-center rounded-md border text-sm text-ink-3"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() =>
                  setEvidence((current) => [...current, { label: "" }])
                }
                disabled={evidence.length >= 20}
                className="border-rule hover:bg-ink/[0.03] mt-1.5 inline-flex min-h-11 items-center rounded-lg border border-dashed px-3 text-[11px] text-ink-3 disabled:opacity-40 sm:min-h-9"
              >
                + 添加证据
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <FloatField
                id="experience-skills"
                label="技能标签"
                value={skillsText}
                onChange={setSkillsText}
                hint="用逗号分隔"
              />
              <FloatField
                id="experience-tags"
                label="关键词标签"
                value={tagsText}
                onChange={setTagsText}
                hint="用于时间线筛选"
              />
            </div>
          </section>
        </form>

        <footer className="border-rule border-t px-5 py-3">
          {error && (
            <p
              role="alert"
              className="border-amber/50 bg-amber/[0.07] mb-2 rounded-lg border-l-2 px-3 py-2 text-xs leading-5 text-ink-2"
            >
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className={BTN_SECONDARY}
            >
              取消
            </button>
            <button
              type="submit"
              form="experience-form"
              disabled={saving}
              className={BTN_PRIMARY}
            >
              {saving ? "保存中…" : initial ? "保存修改" : "保存经历"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function SectionLabel({
  index,
  id,
  label,
}: {
  index: string;
  id: string;
  label: ReactNode;
}) {
  return (
    <div className="flex items-baseline gap-2.5">
      <span className="font-mono text-micro tracking-[0.12em] text-accent-ink">
        {index}
      </span>
      <h3 id={id} className="text-sm font-medium">
        {label}
      </h3>
    </div>
  );
}
