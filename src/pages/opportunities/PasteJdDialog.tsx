import { useEffect, useRef, useState, type FormEvent } from "react";
import type { JobPosting, JobType } from "../../types";
import { JOB_TYPE_LABELS } from "../../types";
import { parsePastedJd } from "../../search";
import { FloatField } from "../../components/FloatField";

interface PasteJdDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (job: JobPosting, warnings: string[]) => void;
}

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
      setError("JD 太短 至少粘贴 20 个字");
      return;
    }
    const result = parsePastedJd({ raw: text, title, company, city, type });
    if (!result.job) {
      setError(result.warnings[0] ?? "没有解析出岗位要求 请检查粘贴内容");
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
            <p className="font-mono text-micro tracking-[0.16em] text-ink-3">
              粘贴 JD 本地解析
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
            className="hover:bg-ink/[0.04] -mr-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-xl text-ink-3"
          >
            ×
          </button>
        </header>

        <form onSubmit={handleSubmit} className="px-4 py-4 sm:px-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <FloatField
              id="jd-title"
              label="岗位名称（选填）"
              value={title}
              onChange={setTitle}
              maxLength={60}
              inputRef={(node) => {
                titleRef.current = node;
              }}
              hint="留空则取 JD 第一行"
            />
            <FloatField
              id="jd-company"
              label="公司 / 来源（选填）"
              value={company}
              onChange={setCompany}
              maxLength={40}
            />
            <FloatField
              id="jd-city"
              label="城市（选填）"
              value={city}
              onChange={setCity}
              maxLength={20}
            />
            <div>
              <p className="mb-1.5 font-mono text-micro tracking-[0.14em] text-ink-3">
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
                      type === item ? "bg-ink text-paper" : "text-ink-3",
                    ].join(" ")}
                  >
                    {JOB_TYPE_LABELS[item]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-3">
            <FloatField
              id="jd-raw"
              label="JD 原文"
              value={raw}
              onChange={setRaw}
              multiline
              rows={9}
              maxLength={12000}
              inputClassName="text-xs leading-6"
              hint={`${raw.length.toLocaleString("en-US")} 字 每行一条要求 最多拆出 8 条 只在本地识别`}
            />
          </div>

          {error && (
            <p
              role="alert"
              className="border-amber/50 bg-amber/[0.07] mt-3 rounded-lg border-l-2 px-3 py-2 text-xs leading-5 text-ink-2"
            >
              {error}
            </p>
          )}

          <div className="border-rule mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <p className="max-w-xs text-micro leading-5 text-ink-4">
              以官网为准 不代投 不抓取
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
