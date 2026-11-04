import { useRef, useState, type ChangeEvent } from "react";
import { parseBackupText } from "../store/backup";

interface DataBackupProps {
  hasData: boolean;
  onExport: () => Promise<void>;
  onImport: (text: string) => Promise<{ ok: boolean; message: string }>;
  onClear: () => Promise<void>;
}

type Busy = "export" | "import" | "clear" | null;

interface Message {
  tone: "ok" | "error";
  text: string;
}

export default function DataBackup({
  hasData,
  onExport,
  onImport,
  onClear,
}: DataBackupProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [message, setMessage] = useState<Message | null>(null);
  const [pendingImport, setPendingImport] = useState<{
    text: string;
    experiences: number;
    ledger: number;
    notes: number;
  } | null>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);

  async function handleExport() {
    setBusy("export");
    setMessage(null);
    try {
      await onExport();
      setMessage({ tone: "ok", text: "已导出 浏览器正在下载备份文件" });
    } catch {
      setMessage({ tone: "error", text: "导出失败 请稍后重试" });
    } finally {
      setBusy(null);
    }
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setMessage(null);
    try {
      const text = await file.text();
      const parsed = parseBackupText(text);
      if (!parsed.ok) {
        setPendingImport(null);
        setMessage({ tone: "error", text: parsed.message });
        return;
      }
      setPendingImport({
        text,
        experiences: parsed.backup.experiences?.experiences.length ?? 0,
        ledger: parsed.backup.ledger?.length ?? 0,
        notes: parsed.backup.notes?.length ?? 0,
      });
    } catch {
      setMessage({ tone: "error", text: "读不出这个文件 请重试" });
    }
  }

  async function handleImport() {
    if (!pendingImport) return;
    setBusy("import");
    setMessage(null);
    try {
      const result = await onImport(pendingImport.text);
      setMessage({
        tone: result.ok ? "ok" : "error",
        text: result.message,
      });
      if (result.ok) setPendingImport(null);
    } catch {
      setMessage({ tone: "error", text: "导入失败 本机数据未被覆盖" });
    } finally {
      setBusy(null);
    }
  }

  async function handleClear() {
    setBusy("clear");
    setMessage(null);
    try {
      await onClear();
      setConfirmingClear(false);
      setMessage({ tone: "ok", text: "已清除本机全部数据" });
    } catch {
      setMessage({ tone: "error", text: "清除失败 请检查浏览器存储权限" });
    } finally {
      setBusy(null);
    }
  }

  const buttonClass =
    "border-rule hover:bg-ink/[0.03] inline-flex min-h-9 items-center justify-center rounded-md border bg-surface px-2.5 text-micro text-ink-3 disabled:opacity-40";

  return (
    <div>
      <p className="font-mono text-micro tracking-[0.2em] text-ink-4">
        本机数据
      </p>

      {pendingImport ? (
        <div className="border-amber/40 bg-amber/[0.05] mt-2 rounded-lg border px-3 py-2.5">
          <p className="text-[11px] font-medium leading-5 text-ink-2">
            确认覆盖本机数据？
          </p>
          <p className="mt-1 text-micro leading-5 text-ink-3">
            备份含 {pendingImport.experiences} 条战绩、{pendingImport.ledger} 条留痕记录、
            {pendingImport.notes} 条记录。导入后当前数据会被替换。
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => void handleImport()}
              disabled={busy === "import"}
              className="bg-ink text-paper inline-flex min-h-9 items-center rounded-md px-3 text-micro disabled:opacity-50"
            >
              {busy === "import" ? "导入中…" : "覆盖导入"}
            </button>
            <button
              type="button"
              onClick={() => setPendingImport(null)}
              className="text-ink-3 inline-flex min-h-9 items-center px-2 text-micro underline underline-offset-2"
            >
              取消
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => void handleExport()}
            disabled={!hasData || busy !== null}
            className={buttonClass}
          >
            {busy === "export" ? "导出中…" : "导出备份"}
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy !== null}
            className={buttonClass}
          >
            导入备份
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="application/json,.json"
            onChange={(event) => void handleFile(event)}
            className="sr-only"
            aria-label="选择学径备份文件"
          />
        </div>
      )}

      <p
        aria-live="polite"
        className={[
          "mt-1.5 min-h-4 text-micro leading-4",
          message?.tone === "error" ? "text-red-800" : "text-ink-3",
        ].join(" ")}
      >
        {message?.text ?? ""}
      </p>

      {hasData && (
        <div className="border-rule mt-2 border-t pt-2">
          {confirmingClear ? (
            <div className="flex items-center gap-2 text-[12px]">
              <button
                type="button"
                disabled={busy === "clear"}
                onClick={() => void handleClear()}
                className="text-red-800 inline-flex min-h-11 items-center rounded-lg px-1 underline underline-offset-4 disabled:opacity-50"
              >
                {busy === "clear" ? "清除中…" : "确认清除"}
              </button>
              <span aria-hidden="true" className="text-ink-4">
                /
              </span>
              <button
                type="button"
                onClick={() => setConfirmingClear(false)}
                className="hover:bg-ink/[0.04] text-ink-3 inline-flex min-h-11 items-center rounded-lg px-1 underline underline-offset-4"
              >
                取消
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingClear(true)}
              className="hover:bg-red-800/[0.06] text-red-800 inline-flex min-h-11 items-center rounded-lg px-1 text-[12px] underline underline-offset-4"
            >
              清除本机数据
            </button>
          )}
        </div>
      )}
    </div>
  );
}
