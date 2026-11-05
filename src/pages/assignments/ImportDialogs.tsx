import { useEffect, useRef, useState, type ReactNode } from "react";
import type {
  Assignment,
  AssignmentKind,
  AssignmentSource,
  Confidence,
} from "../../types";
import { ASSIGNMENT_KIND_LABELS } from "../../types";
import {
  fromLocalInputValue,
  parseAssignmentsText,
  toLocalInputValue,
  type ParsedAssignment,
} from "../../parse/assignments";
import { createSampleAssignments } from "../../store/fixtures/assignments";
import {
  extractAssignmentsFromImage,
  isVisionConfigured,
  MAX_IMAGE_BYTES,
} from "../../ai/client";

export const BTN_PRIMARY =
  "bg-ink text-paper inline-flex min-h-11 items-center justify-center rounded-lg px-5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40";
export const BTN_SECONDARY =
  "border-rule hover:bg-ink/[0.03] inline-flex min-h-11 items-center justify-center rounded-lg border px-4 text-sm";
const FIELD =
  "border-rule focus-visible:border-accent-ink focus-visible:ring-2 focus-visible:ring-accent/45 h-10 w-full rounded-md border bg-surface px-2 text-sm outline-none";

export interface ReviewPayload {
  items: ParsedAssignment[];
  warnings: string[];
  source: AssignmentSource;
  sourceLabel: string;
}

interface DialogProps {
  title: string;
  subtitle?: string;
  wide?: boolean;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

export function Dialog({
  title,
  subtitle,
  wide = false,
  onClose,
  children,
  footer,
}: DialogProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="bg-ink/30 fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={[
          "bg-paper flex max-h-[92dvh] w-full flex-col rounded-t-2xl sm:rounded-2xl",
          wide ? "sm:max-w-2xl" : "sm:max-w-md",
        ].join(" ")}
      >
        <header className="border-rule flex items-start justify-between gap-4 border-b px-5 py-4">
          <div>
            <h2 className="text-base font-medium">{title}</h2>
            {subtitle && (
              <p className="mt-1 text-xs leading-5 text-ink-3">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="hover:bg-ink/[0.04] flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg text-ink-3"
          >
            ×
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {children}
        </div>
        {footer && (
          <footer className="border-rule flex flex-wrap justify-end gap-2 border-t px-5 py-3">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}

export function createSampleReviewPayload(): ReviewPayload {
  return {
    items: createSampleAssignments().items.map((item) => ({
      title: item.title,
      courseName: item.courseName,
      due: item.due,
      kind: item.kind,
      confidence: item.confidence,
      detail: item.detail,
    })),
    warnings: ["三张截图整理的示例 请核对后导入"],
    source: "sample",
    sourceLabel: "示例待办",
  };
}

const SAMPLE_TEXT = [
  "实验三 数据库操作 2026-11-08 23:55",
  "实验四 综合实训 截止 11-14 23:55",
  "新建作业2 使用外部中断实现指示灯交替闪烁 2026-11-02 12:29",
].join("\n");

export function PasteDialog({
  onClose,
  onParsed,
}: {
  onClose: () => void;
  onParsed: (payload: ReviewPayload) => void;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleParse() {
    const result = parseAssignmentsText(text);
    if (!result.items.length) {
      setError(result.warnings[0] ?? "没有识别到待办 请检查文本格式");
      return;
    }
    onParsed({
      items: result.items,
      warnings: result.warnings,
      source: "paste",
      sourceLabel: "粘贴导入",
    });
  }

  return (
    <Dialog
      title="粘贴作业文本"
      subtitle="每行一条 标题和截止写在同一行"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={BTN_SECONDARY}>
            取消
          </button>
          <button
            type="button"
            onClick={handleParse}
            disabled={!text.trim()}
            className={BTN_PRIMARY}
          >
            解析文本
          </button>
        </>
      }
    >
      <label className="block">
        <span className="mb-1 block text-[11px] text-ink-3">
          从学习通复制作业通知，或按下面格式手写
        </span>
        <textarea
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setError(null);
          }}
          rows={7}
          autoFocus
          placeholder={SAMPLE_TEXT}
          className="border-rule focus-visible:border-accent-ink focus-visible:ring-2 focus-visible:ring-accent/45 w-full resize-y rounded-lg border bg-surface px-3 py-2 text-sm leading-6 outline-none"
        />
      </label>

      <div className="mt-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => {
            setText(SAMPLE_TEXT);
            setError(null);
          }}
          className="text-[11px] text-ink-3 underline underline-offset-2 hover:text-ink"
        >
          填入示例
        </button>
        <span className="font-mono text-micro text-ink-4">
          截止时间读不到时留空
        </span>
      </div>

      {error && (
        <p
          role="alert"
          className="border-amber/50 bg-amber/[0.06] mt-3 rounded-lg border-l-2 px-3 py-2 text-xs leading-5 text-ink-2"
        >
          {error}
        </p>
      )}

      <p className="mt-4 text-[11px] leading-5 text-ink-3">
        只处理你主动粘贴的文本 不登录学习通
      </p>
    </Dialog>
  );
}

export function ScreenshotDialog({
  onClose,
  onParsed,
  onPasteInstead,
  onManualInstead,
}: {
  onClose: () => void;
  onParsed: (payload: ReviewPayload) => void;
  onPasteInstead: () => void;
  onManualInstead: () => void;
}) {
  const configured = isVisionConfigured();
  const [phase, setPhase] = useState<"idle" | "working" | "fallback">(
    configured ? "idle" : "fallback",
  );
  const [message, setMessage] = useState<string | null>(
    configured
      ? null
      : "本机还没接入视觉模型 先用下面的示例数据 或改用粘贴 手动录入",
  );
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  async function handleFile(file: File) {
    if (preview) URL.revokeObjectURL(preview);
    const url = URL.createObjectURL(file);
    setPreview(url);

    if (!isVisionConfigured()) {
      setPhase("fallback");
      setMessage(
        "视觉解析尚未配置 改用粘贴文本或手动添加 也可以用示例截图数据",
      );
      return;
    }
    if (!file.type.startsWith("image/")) {
      setPhase("fallback");
      setMessage("请选择 PNG / JPG 格式的截图");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setPhase("fallback");
      setMessage("图片超过 8MB 请压缩后再试");
      return;
    }

    setPhase("working");
    setMessage(null);
    try {
      const result = await extractAssignmentsFromImage(file);
      if (!result.items.length) {
        setPhase("fallback");
        setMessage(result.warnings[0] ?? "截图里没有识别到作业 请换一张或手动录入");
        return;
      }
      onParsed({
        items: result.items,
        warnings: result.warnings,
        source: "ocr",
        sourceLabel: "截图导入",
      });
    } catch (error) {
      setPhase("fallback");
      setMessage(
        error instanceof Error
          ? error.message
          : "截图解析失败 请重试或手动录入",
      );
    }
  }

  return (
    <Dialog
      title="导入截图"
      subtitle="只处理你主动上传的截图"
      onClose={onClose}
      footer={
        phase === "working" ? (
          <button type="button" onClick={onClose} className={BTN_SECONDARY}>
            取消识别
          </button>
        ) : (
          <button type="button" onClick={onClose} className={BTN_SECONDARY}>
            关闭
          </button>
        )
      }
    >
      {phase === "working" && (
        <p
          role="status"
          className="flex items-center gap-2 text-sm text-ink-3"
        >
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
          正在识别截图，最长等待 45 秒…
        </p>
      )}

      {phase !== "working" && (
        <>
          <div className="border-rule rounded-xl border bg-surface p-4">
            <p className="text-sm leading-6 text-ink-2">
              识别标题与截止时间 结果先给你核对
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className={BTN_PRIMARY}
              >
                选择截图
              </button>
              <span className="font-mono text-micro text-ink-4">
                PNG JPG ≤ 8MB
              </span>
            </div>
            <p className="mt-3 text-[11px] leading-5 text-ink-3">
              图片只用于本次识别
            </p>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file);
              event.target.value = "";
            }}
          />

          {preview && (
            <img
              src={preview}
              alt="待识别截图预览"
              className="border-rule mt-3 max-h-44 w-full rounded-lg border bg-surface object-contain"
            />
          )}

          {message && (
            <div className="border-amber/50 bg-amber/[0.06] mt-3 rounded-lg border-l-2 px-3 py-3 text-xs leading-5 text-ink-2">
              <p className="font-medium text-ink">
                {preview ? "暂不能识别这张截图" : "截图识别暂未启用"}
              </p>
              <p className="mt-1">{message}</p>
            </div>
          )}

          <div className="mt-4">
            <p className="mb-2 font-mono text-micro tracking-[0.12em] text-ink-4">
              其他可用方式
            </p>
            <div className="grid gap-2">
              <button
                type="button"
                onClick={() => onParsed(createSampleReviewPayload())}
                className={BTN_SECONDARY}
              >
                用示例截图数据（3 条）
              </button>
              <button
                type="button"
                onClick={onPasteInstead}
                className={BTN_SECONDARY}
              >
                改成粘贴文本
              </button>
              <button
                type="button"
                onClick={onManualInstead}
                className={BTN_SECONDARY}
              >
                手动添加一条
              </button>
            </div>
          </div>
        </>
      )}
    </Dialog>
  );
}

interface ReviewRow {
  title: string;
  courseName: string;
  due: string;
  kind: AssignmentKind;
  detail: string;
  confidence: Confidence;
}

export function ReviewDialog({
  payload,
  onClose,
  onConfirm,
}: {
  payload: ReviewPayload;
  onClose: () => void;
  onConfirm: (items: ParsedAssignment[]) => void;
}) {
  const [rows, setRows] = useState<ReviewRow[]>(() =>
    payload.items.map((item) => ({
      title: item.title,
      courseName: item.courseName ?? "",
      due: toLocalInputValue(item.due),
      kind: item.kind,
      detail: item.detail ?? "",
      confidence: item.confidence,
    })),
  );

  function update(index: number, patch: Partial<ReviewRow>) {
    setRows((prev) =>
      prev.map((row, rowIndex) =>
        rowIndex === index
          ? { ...row, ...patch, confidence: "high" }
          : row,
      ),
    );
  }

  function remove(index: number) {
    setRows((prev) => prev.filter((_, rowIndex) => rowIndex !== index));
  }

  const invalid = rows.some((row) => !row.title.trim());
  const lowCount = rows.filter(
    (row) => row.confidence === "low" || !row.due,
  ).length;

  return (
    <Dialog
      title="核对导入结果"
      subtitle={`共 ${rows.length} 条 低置信与未识别截止的条目标黄 可直接修改`}
      wide
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={BTN_SECONDARY}>
            返回
          </button>
          <button
            type="button"
            disabled={invalid || rows.length === 0}
            onClick={() =>
              onConfirm(
                rows.map((row) => ({
                  title: row.title.trim(),
                  courseName: row.courseName.trim() || undefined,
                  due: fromLocalInputValue(row.due),
                  kind: row.kind,
                  detail: row.detail.trim() || undefined,
                  confidence:
                    row.confidence === "low" || !row.due ? "low" : "high",
                })),
              )
            }
            className={BTN_PRIMARY}
          >
            确认加入 {rows.length} 条
          </button>
        </>
      }
    >
      {payload.warnings.length > 0 && (
        <ul className="border-amber/50 bg-amber/[0.06] mb-3 space-y-1 rounded-lg border-l-2 px-3 py-2 text-xs leading-5 text-ink-2">
          {payload.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}

      {lowCount > 0 && (
        <p className="mb-3 text-[11px] leading-5 text-amber-ink">
          {lowCount} 条需要你核对
        </p>
      )}

      <div className="space-y-3">
        {rows.map((row, index) => (
          <article
            key={index}
            className={[
              "rounded-xl border bg-surface p-3",
              row.confidence === "low" || !row.due
                ? "border-amber/50 bg-amber/[0.03]"
                : "border-rule",
            ].join(" ")}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-micro tracking-[0.12em] text-ink-4">
                第 {index + 1} 条
              </span>
              <button
                type="button"
                onClick={() => remove(index)}
                className="text-ink-3 inline-flex min-h-9 items-center text-[11px] underline underline-offset-2 hover:text-red-800"
              >
                移除
              </button>
            </div>

            <label className="mt-1 block">
              <span className="mb-1 block font-mono text-micro tracking-[0.12em] text-ink-4">
                标题
              </span>
              <input
                value={row.title}
                onChange={(event) =>
                  update(index, { title: event.target.value })
                }
                className={FIELD}
              />
            </label>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="block">
                <span className="mb-1 block text-micro text-ink-3">
                  课程（可空）
                </span>
                <input
                  value={row.courseName}
                  onChange={(event) =>
                    update(index, { courseName: event.target.value })
                  }
                  className={FIELD}
                  placeholder="未提供"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-micro text-ink-3">类型</span>
                <select
                  value={row.kind}
                  onChange={(event) =>
                    update(index, {
                      kind: event.target.value as AssignmentKind,
                    })
                  }
                  className={FIELD}
                >
                  {(
                    Object.keys(ASSIGNMENT_KIND_LABELS) as AssignmentKind[]
                  ).map((kind) => (
                    <option key={kind} value={kind}>
                      {ASSIGNMENT_KIND_LABELS[kind]}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="mt-2 block">
              <span className="mb-1 block text-micro text-ink-3">
                截止时间（读不到就留空）
              </span>
              <input
                type="datetime-local"
                value={row.due}
                onChange={(event) =>
                  update(index, { due: event.target.value })
                }
                className={FIELD}
              />
            </label>

            {row.detail && (
              <p className="mt-2 text-[11px] leading-5 text-ink-3">
                {row.detail}
              </p>
            )}
          </article>
        ))}
      </div>
    </Dialog>
  );
}

export interface AssignmentFormValue {
  title: string;
  courseName: string;
  due: string;
  kind: AssignmentKind;
  detail: string;
}

export function AssignmentFormDialog({
  initial,
  onClose,
  onSubmit,
}: {
  initial?: Assignment | null;
  onClose: () => void;
  onSubmit: (value: AssignmentFormValue) => Promise<void>;
}) {
  const [form, setForm] = useState<AssignmentFormValue>(() => ({
    title: initial?.title ?? "",
    courseName: initial?.courseName ?? "",
    due: toLocalInputValue(initial?.due ?? null),
    kind: initial?.kind ?? "homework",
    detail: initial?.detail ?? "",
  }));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!form.title.trim()) {
      setError("请填写待办标题");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit({ ...form, title: form.title.trim() });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "写入本机失败 请检查浏览器存储权限",
      );
      setSaving(false);
    }
  }

  return (
    <Dialog
      title={initial ? "编辑待办" : "手动添加待办"}
      subtitle="作业 竞赛报名 实习投递都可以放在这里"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={BTN_SECONDARY}>
            取消
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={saving}
            className={BTN_PRIMARY}
          >
            {saving ? "保存中…" : initial ? "保存修改" : "添加到待办"}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-[11px] text-ink-3">标题</span>
          <input
            value={form.title}
            onChange={(event) => {
              setForm({ ...form, title: event.target.value });
              setError(null);
            }}
            autoFocus
            className={FIELD}
            placeholder="如 实验三 数据库操作"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-[11px] text-ink-3">
              课程（可空）
            </span>
            <input
              value={form.courseName}
              onChange={(event) =>
                setForm({ ...form, courseName: event.target.value })
              }
              className={FIELD}
              placeholder="如 数据库原理"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] text-ink-3">类型</span>
            <select
              value={form.kind}
              onChange={(event) =>
                setForm({
                  ...form,
                  kind: event.target.value as AssignmentKind,
                })
              }
              className={FIELD}
            >
              {(Object.keys(ASSIGNMENT_KIND_LABELS) as AssignmentKind[]).map(
                (kind) => (
                  <option key={kind} value={kind}>
                    {ASSIGNMENT_KIND_LABELS[kind]}
                  </option>
                ),
              )}
            </select>
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-[11px] text-ink-3">
            截止时间（可空）
          </span>
          <input
            type="datetime-local"
            value={form.due}
            onChange={(event) => setForm({ ...form, due: event.target.value })}
            className={FIELD}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-[11px] text-ink-3">
            备注（可空）
          </span>
          <textarea
            value={form.detail}
            onChange={(event) =>
              setForm({ ...form, detail: event.target.value })
            }
            rows={3}
            className="border-rule focus-visible:border-accent-ink focus-visible:ring-2 focus-visible:ring-accent/45 w-full resize-y rounded-md border bg-surface px-2 py-2 text-sm leading-6 outline-none"
            placeholder="链接、附件名或提交要求"
          />
        </label>

        {error && (
          <p role="alert" className="text-[11px] leading-5 text-amber-ink">
            {error}
          </p>
        )}
      </div>
    </Dialog>
  );
}
