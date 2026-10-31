import { useEffect, useRef, useState, type FormEvent } from "react";
import type { JobPosting, JobType } from "../../types";
import { JOB_TYPE_LABELS } from "../../types";
import { parsePastedJd } from "../../search";

interface PasteJdDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (job: JobPosting, warnings: string[]) => void;
}

const FIELD =
  "border-rule focus:border-ink/35 focus:ring-2 focus:ring-accent/25 min-h-11 w-full rounded-lg border bg-surface px-3 text-sm text-ink outline-none transition-colors placeholder:text-ink/25";
const BTN_PRIMARY =
  "bg-ink text-paper inline-flex min-h-11 items-center justify-center rounded-lg px-5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40";
const BTN_SECONDARY =
  "border-rule hover:bg-ink/[0.03] inline-flex min-h-11 items-center justify-center rounded-lg border bg-surface px-4 text-xs disabled:cursor-not-allowed disabled:opacity-40";

export default function PasteJdDialog({
  open,
  onClose,
  onCreate,
}: PasteJdDialogProps) {
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [city, setCity] = useState("");
  const [type, setType] = useState<JobType>("intern");
  const [raw, setRaw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setCompany("");
    setCity("");
    setType("intern");
    setRaw("");
    setError(null);
    const timer = window.setTimeout(() => titleRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const canSubmit = raw.trim().length >= 20;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = raw.trim();
    if (text.length < 20) {
      setError("JD 太短，请至少粘贴 20 个字。");
      return;
    }
    const result = parsePastedJd({ raw: text, title, company, city, type });
    if (!result.job) {
      setError(result.warnings[0] ?? "没有解析出岗位要求，请检查粘贴内容。");
      return;
    }
    onCreate(result.job, result.warnings);
  }

  return (
    <div
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="bg-ink/35 fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="paste-jd-title"
        className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-surface sm:rounded-xl"
      >
        <header className="border-rule sticky top-0 z-10 flex items-start justify-between gap-3 border-b bg-surface px-4 py-3 sm:px-5">
          <div>
            <p className="font-mono text-[9px] tracking-[0.16em] text-ink/40">
              粘贴 JD · 本地解析
            </p>
            <h2
              id="paste-jd-title"
              className="mt-1 text-base font-medium tracking-tight"
            >
              把岗位要求对照到你的经历
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭粘贴 JD"
            className="hover:bg-ink/[0.04] -mr-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-xl text-ink/45"
          >
            ×
          </button>
        </header>

        <form onSubmit={handleSubmit} className="px-4 py-4 sm:px-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="jd-title"
                className="mb-1.5 block font-mono text-[9px] tracking-[0.14em] text-ink/40"
              >
                岗位名称（选填）
              </label>
              <input
                id="jd-title"
                ref={titleRef}
                type="text"
                value={title}
                maxLength={60}
                onChange={(event) => setTitle(event.target.value)}
                className={FIELD}
                placeholder="留空则取 JD 第一行"
              />
            </div>
            <div>
              <label
                htmlFor="jd-company"
                className="mb-1.5 block font-mono text-[9px] tracking-[0.14em] text-ink/40"
              >
                公司 / 来源（选填）
              </label>
              <input
                id="jd-company"
                type="text"
                value={company}
                maxLength={40}
                onChange={(event) => setCompany(event.target.value)}
                className={FIELD}
                placeholder="例如：某公司官网"
              />
            </div>
            <div>
              <label
                htmlFor="jd-city"
                className="mb-1.5 block font-mono text-[9px] tracking-[0.14em] text-ink/40"
              >
                城市（选填）
              </label>
              <input
                id="jd-city"
                type="text"
                value={city}
                maxLength={20}
                onChange={(event) => setCity(event.target.value)}
                className={FIELD}
                placeholder="例如：杭州"
              />
            </div>
            <div>
              <p className="mb-1.5 font-mono text-[9px] tracking-[0.14em] text-ink/40">
                岗位类型
              </p>
              <div
                role="group"
                aria-label="岗位类型"
                className="border-rule inline-flex w-full rounded-lg border bg-surface p-0.5"
              >
                {(["intern", "campus"] as JobType[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={type === item}
                    onClick={() => setType(item)}
                    className={[
                      "min-h-10 flex-1 rounded-md px-3 text-xs",
                      type === item ? "bg-ink text-paper" : "text-ink/55",
                    ].join(" ")}
                  >
                    {JOB_TYPE_LABELS[item]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-3">
            <div className="flex items-baseline justify-between gap-2">
              <label
                htmlFor="jd-raw"
                className="font-mono text-[9px] tracking-[0.14em] text-ink/40"
              >
                JD 原文
              </label>
              <span className="font-mono text-[9px] tabular-nums text-ink/30">
                {raw.length.toLocaleString("en-US")} / 12,000
              </span>
            </div>
            <textarea
              id="jd-raw"
              value={raw}
              maxLength={12000}
              rows={9}
              onChange={(event) => setRaw(event.target.value)}
              aria-describedby="jd-hint"
              className="border-rule focus:border-ink/35 focus:ring-2 focus:ring-accent/25 mt-1.5 w-full resize-y rounded-lg border bg-surface px-3 py-2.5 text-xs leading-6 text-ink outline-none transition-colors placeholder:text-ink/25"
              placeholder={
                "粘贴岗位职责与任职要求，每行一条效果最好。\n例如：\n- 熟悉 React 与 TypeScript，能独立完成页面开发\n- 了解前端性能优化\n- 每周到岗 4 天以上"
              }
            />
            <p id="jd-hint" className="mt-1.5 text-[10px] leading-5 text-ink/40">
              最多拆出 8 条要求，只在本地识别技能关键词；不会上传，也不保存到浏览器。
            </p>
          </div>

          {error && (
            <p
              role="alert"
              className="border-amber/50 bg-amber/[0.07] mt-3 rounded-lg border-l-2 px-3 py-2 text-xs leading-5 text-ink/75"
            >
              {error}
            </p>
          )}

          <div className="border-rule mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <p className="max-w-xs text-[10px] leading-5 text-ink/35">
              岗位信息以企业官网为准；学径不代投、不抓取招聘平台。
            </p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={onClose} className={BTN_SECONDARY}>
                取消
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className={BTN_PRIMARY}
              >
                解析并匹配
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
