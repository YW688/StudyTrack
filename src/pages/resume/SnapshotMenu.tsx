import { useEffect } from "react";
import type { ResumeSnapshot } from "../../types";
import {
  formatSnapshotTime,
  relativeTimeLabel,
} from "../../lib/resume";

interface SnapshotMenuProps {
  open: boolean;
  snapshots: ResumeSnapshot[];
  onClose: () => void;
  onPreview: (snapshot: ResumeSnapshot) => void;
  onRestore: (snapshot: ResumeSnapshot) => void;
}

export default function SnapshotMenu({
  open,
  snapshots,
  onClose,
  onPreview,
  onRestore,
}: SnapshotMenuProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-label="简历版本列表"
      className="border-rule absolute top-full right-0 z-30 mt-2 w-[min(21rem,calc(100vw-2rem))] rounded-xl border bg-white shadow-[0_18px_48px_rgba(22,35,58,0.14)]"
    >
      <div className="border-rule flex items-center justify-between border-b px-3 py-2">
        <div>
          <p className="text-xs font-medium">版本快照</p>
          <p className="mt-0.5 font-mono text-[9px] text-ink/35">
            最多保留 20 个
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="关闭版本列表"
          className="hover:bg-ink/[0.04] inline-flex h-11 w-11 items-center justify-center rounded-md text-ink/45"
        >
          ×
        </button>
      </div>

      {snapshots.length === 0 ? (
        <div className="px-3 py-5">
          <p className="text-[11px] leading-5 text-ink/45">
            还没有版本。点击「保存快照」记录当前简历，打印前也会自动保存一次。
          </p>
        </div>
      ) : (
        <ul className="max-h-[60vh] overflow-y-auto">
          {snapshots.map((snapshot) => (
            <li
              key={snapshot.id}
              className="border-rule border-b px-3 py-2.5 last:border-b-0"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                <p className="text-xs font-medium">
                  v{snapshot.version}
                  <span className="ml-2 font-mono text-[9px] font-normal text-ink/40">
                    {snapshot.selectedExperienceIds.length} 条经历
                  </span>
                </p>
                <p className="font-mono text-[9px] tabular-nums text-ink/35">
                  {formatSnapshotTime(snapshot.createdAt)}
                </p>
              </div>
              <p className="mt-0.5 font-mono text-[9px] text-ink/35">
                {relativeTimeLabel(snapshot.createdAt)}
                {snapshot.basics.name.trim()
                  ? ` · ${snapshot.basics.name.trim()}`
                  : ""}
              </p>
              <div className="mt-1.5 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onPreview(snapshot)}
                  className="text-ink/60 hover:text-ink inline-flex min-h-11 items-center text-[10px] underline underline-offset-2 sm:min-h-8"
                >
                  预览
                </button>
                <button
                  type="button"
                  onClick={() => onRestore(snapshot)}
                  className="text-amber inline-flex min-h-11 items-center text-[10px] font-medium underline underline-offset-2 sm:min-h-8"
                >
                  恢复
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
