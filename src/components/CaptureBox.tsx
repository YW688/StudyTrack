import { useState, type FormEvent, type KeyboardEvent } from "react";
import dayjs, { type Dayjs } from "dayjs";
import type { Note } from "../types";
import { studyDateKey } from "../lib/ledger";

interface CaptureBoxProps {
  now: Dayjs;
  notes: Note[];
  prompts: string[];
  onAddNote: (text: string, tags?: string[]) => Promise<void>;
}

export default function CaptureBox({
  now,
  notes,
  prompts,
  onAddNote,
}: CaptureBoxProps) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const todayKey = studyDateKey(now);
  const todayNotes = notes
    .filter((note) => studyDateKey(dayjs(note.createdAt)) === todayKey)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  async function handleSubmit(event?: FormEvent) {
    event?.preventDefault();
    const value = text.trim();
    if (!value) {
      setError("先写一句再记。");
      setFlash(null);
      return;
    }
    setSaving(true);
    setError(null);
    setFlash(null);
    try {
      await onAddNote(value);
      setText("");
      setFlash(
        `已记下，今天第 ${todayNotes.length + 1} 条。绿格也记上了。`,
      );
    } catch {
      setError("这次没写进本机，请检查浏览器存储权限后重试。");
    } finally {
      setSaving(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      void handleSubmit();
    }
  }

  return (
    <section
      id="today-capture"
      aria-label="留痕"
      className="border-rule scroll-mt-4 overflow-hidden rounded-xl border bg-surface"
    >
      <header className="border-rule flex items-center justify-between gap-3 border-b px-4 py-2 sm:px-5">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[10px] tracking-[0.12em] text-accent-ink">
            04
          </span>
          <h2 className="text-sm font-medium">留痕</h2>
        </div>
        <span className="font-mono text-[10px] text-ink/35">一句就够</span>
      </header>

      <form onSubmit={(event) => void handleSubmit(event)}>
        <div className="px-4 pt-3.5 sm:px-5">
          <label htmlFor="capture-text" className="sr-only">
            今天留下了什么
          </label>
          <textarea
            id="capture-text"
            value={text}
            onChange={(event) => {
              setText(event.target.value.slice(0, 500));
              if (flash) setFlash(null);
              if (error) setError(null);
            }}
            onKeyDown={handleKeyDown}
            rows={3}
            placeholder="今天推进了什么？一句话就够。"
            className="border-rule focus:border-accent/60 focus:ring-accent/15 min-h-[92px] w-full resize-y rounded-lg border bg-paper/40 px-3 py-2.5 text-sm leading-6 outline-none placeholder:text-ink/30 focus:ring-2"
          />
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {prompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => {
                  setText(prompt);
                  setError(null);
                  setFlash(null);
                }}
                className="border-rule hover:bg-ink/[0.04] inline-flex min-h-8 items-center rounded-full border px-2.5 text-[10px] text-ink/55"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-5">
          <p className="font-mono text-[10px] text-ink/30">
            {text.length}/500 · Ctrl/⌘ + Enter 提交
          </p>
          <button
            type="submit"
            disabled={saving}
            className="bg-ink text-paper inline-flex min-h-11 items-center justify-center rounded-lg px-5 text-sm font-medium disabled:opacity-50"
          >
            {saving ? "正在记…" : "记下这件事"}
          </button>
        </div>
      </form>

      <p
        aria-live="polite"
        className={[
          "px-4 pb-2 text-[11px] leading-5 sm:px-5",
          error ? "text-red-800" : "text-ink/45",
        ].join(" ")}
      >
        {error ?? flash ?? "会进账本；只统计完成、新增、补证据、写记录、生成简历这些动作。"}
      </p>

      <div className="border-rule border-t px-4 py-3 sm:px-5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-mono text-[10px] tracking-[0.08em] text-ink/40">
            今天留下 · {todayNotes.length}
          </p>
          <p className="font-mono text-[9px] text-ink/25">收件箱</p>
        </div>
        {todayNotes.length === 0 ? (
          <p className="mt-2 text-[11px] leading-5 text-ink/40">
            今天还没有记录。写下一件推进过的事，之后写简历时能回来找。
          </p>
        ) : (
          <ul className="mt-1.5 space-y-2">
            {todayNotes.slice(0, 3).map((note) => (
              <li key={note.id} className="flex gap-2.5">
                <span className="mt-0.5 w-9 shrink-0 font-mono text-[10px] tabular-nums text-ink/35">
                  {dayjs(note.createdAt).format("HH:mm")}
                </span>
                <span className="line-clamp-2 min-w-0 flex-1 text-[11px] leading-5 text-ink/65">
                  {note.text}
                </span>
              </li>
            ))}
          </ul>
        )}
        {todayNotes.length > 3 && (
          <p className="mt-1.5 font-mono text-[9px] text-ink/30">
            还有 {todayNotes.length - 3} 条在账本里。
          </p>
        )}
      </div>
    </section>
  );
}
