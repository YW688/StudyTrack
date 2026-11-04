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

const FIELD =
  "border-rule focus-visible:border-accent-ink focus-visible:ring-2 focus-visible:ring-accent/45 h-11 w-full rounded-md border bg-surface px-2.5 text-sm outline-none";
const TEXTAREA =
  "border-rule focus-visible:border-accent-ink focus-visible:ring-2 focus-visible:ring-accent/45 min-h-24 w-full resize-y rounded-md border bg-surface px-2.5 py-2 text-sm leading-6 outline-none";
const BTN_PRIMARY =
  "bg-ink text-paper inline-flex min-h-11 items-center justify-center rounded-lg px-5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40";
const BTN_SECONDARY =
  "border-rule hover:bg-ink/[0.03] inline-flex min-h-11 items-center justify-center rounded-lg border px-4 text-sm";

const PARTS = [
  {
    key: "problem",
    label: "问题",
    placeholder: "当时要解决什么问题 例如 选课高峰期系统卡顿 人工登记容易超选",
  },
  {
    key: "method",
    label: "方法",
    placeholder: "你用了什么方法 技术或流程 例如 重新设计 E-R 模型 用事务处理选课",
  },
  {
    key: "contribution",
    label: "我的贡献",
    placeholder: "你具体做了什么 避免只写「参与」 写清楚自己负责的部分",
  },
  {
    key: "result",
    label: "结果",
    placeholder: "结果如何 有数字就写数字 没有就写可验证的结果 不猜数字",
  },
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
                    <label
                      htmlFor="experience-kind-label"
                      className="mb-1.5 block text-xs text-ink-3"
                    >
                      自定义类型
                    </label>
                    <input
                      id="experience-kind-label"
                      value={kindLabel}
                      onChange={(event) => setKindLabel(event.target.value)}
                      maxLength={20}
                      placeholder="例如：军训、社团、交换学习"
                      className={FIELD}
                    />
                    <p className="mt-1 text-micro leading-4 text-ink-4">
                      留空显示「其他」
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="experience-title"
                  className="mb-1.5 block text-xs text-ink-3"
                >
                  标题 <span className="text-amber-ink">*</span>
                </label>
                <input
                  id="experience-title"
                  ref={titleRef}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={120}
                  required
                  placeholder="例如：数据库课程设计：校园选课系统"
                  className={FIELD}
                />
              </div>

              <div>
                <label
                  htmlFor="experience-org"
                  className="mb-1.5 block text-xs text-ink-3"
                >
                  组织 / 课程 / 赛事
                </label>
                <input
                  id="experience-org"
                  value={org}
                  onChange={(event) => setOrg(event.target.value)}
                  maxLength={80}
                  placeholder="例如：《数据库原理》课程 计算机学院"
                  className={FIELD}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="experience-start"
                    className="mb-1.5 block text-xs text-ink-3"
                  >
                    开始月份
                  </label>
                  <input
                    id="experience-start"
                    type="month"
                    value={start}
                    onChange={(event) => setStart(event.target.value)}
                    className={FIELD}
                  />
                </div>
                <div>
                  <label
                    htmlFor="experience-end"
                    className="mb-1.5 block text-xs text-ink-3"
                  >
                    结束月份
                  </label>
                  <input
                    id="experience-end"
                    type="month"
                    value={end}
                    onChange={(event) => setEnd(event.target.value)}
                    className={FIELD}
                  />
                  <p className="mt-1 text-micro leading-4 text-ink-4">
                    留空表示进行中
                  </p>
                </div>
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
                <div key={part.key}>
                  <label
                    htmlFor={`experience-${part.key}`}
                    className="mb-1.5 block text-xs text-ink-3"
                  >
                    {part.label}
                  </label>
                  <textarea
                    id={`experience-${part.key}`}
                    value={parts[part.key]}
                    onChange={(event) =>
                      updatePart(part.key, event.target.value)
                    }
                    maxLength={2000}
                    rows={3}
                    placeholder={part.placeholder}
                    className={TEXTAREA}
                  />
                </div>
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
                    <input
                      value={metric.label}
                      onChange={(event) =>
                        updateMetric(index, { label: event.target.value })
                      }
                      maxLength={40}
                      aria-label={`第 ${index + 1} 条量化数据名称`}
                      placeholder="名称，如 首屏时间"
                      className={FIELD}
                    />
                    <input
                      value={metric.value}
                      onChange={(event) =>
                        updateMetric(index, { value: event.target.value })
                      }
                      maxLength={80}
                      aria-label={`第 ${index + 1} 条量化数据数值`}
                      placeholder="数值，如 5.2s → 1.8s"
                      className={FIELD}
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
                    <input
                      value={item.label}
                      onChange={(event) =>
                        updateEvidence(index, { label: event.target.value })
                      }
                      maxLength={60}
                      aria-label={`第 ${index + 1} 条证据名称`}
                      placeholder="名称，如 课程设计报告"
                      className={FIELD}
                    />
                    <input
                      value={item.url ?? ""}
                      onChange={(event) =>
                        updateEvidence(index, {
                          url: event.target.value || undefined,
                        })
                      }
                      maxLength={500}
                      aria-label={`第 ${index + 1} 条证据链接`}
                      placeholder="https://…（可空）"
                      className={FIELD}
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
              <div>
                <label
                  htmlFor="experience-skills"
                  className="mb-1.5 block text-xs text-ink-3"
                >
                  技能标签
                </label>
                <input
                  id="experience-skills"
                  value={skillsText}
                  onChange={(event) => setSkillsText(event.target.value)}
                  placeholder="Python，MySQL，Figma"
                  className={FIELD}
                />
                <p className="mt-1 text-micro leading-4 text-ink-4">
                  用逗号分隔
                </p>
              </div>
              <div>
                <label
                  htmlFor="experience-tags"
                  className="mb-1.5 block text-xs text-ink-3"
                >
                  关键词标签
                </label>
                <input
                  id="experience-tags"
                  value={tagsText}
                  onChange={(event) => setTagsText(event.target.value)}
                  placeholder="课程设计，团队协作"
                  className={FIELD}
                />
                <p className="mt-1 text-micro leading-4 text-ink-4">
                  用于时间线筛选
                </p>
              </div>
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
