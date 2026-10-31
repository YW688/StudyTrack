import { useState } from "react";
import type { Assignment, AssignmentStatus } from "../types";
import {
  ASSIGNMENT_KIND_LABELS,
  ASSIGNMENT_SOURCE_LABELS,
} from "../types";
import { ddlTier, formatDue, formatDueFull } from "../lib/ddl";

interface AssignmentItemProps {
  item: Assignment;
  onToggle: () => void;
  onSetStatus: (status: AssignmentStatus) => void;
  onEdit: () => void;
  onDelete: () => void;
  onConfirm: () => void;
}

const TIER_CLASS: Record<string, string> = {
  overdue: "border-red-800/30 bg-red-800/[0.07] text-red-800",
  urgent: "border-red-800/30 bg-red-800/[0.07] text-red-800",
  soon: "border-amber/40 bg-amber/[0.08] text-amber",
  later: "border-rule bg-ink/[0.03] text-ink/55",
  none: "border-rule border-dashed text-ink/40",
};

const TIER_TEXT: Record<string, string> = {
  overdue: "已逾期",
  urgent: "24 小时内",
  soon: "3 天内",
  later: "",
  none: "可补截止",
};

export default function AssignmentItem({
  item,
  onToggle,
  onSetStatus,
  onEdit,
  onDelete,
  onConfirm,
}: AssignmentItemProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const done = item.status === "done";
  const tier = ddlTier(item.due);

  return (
    <article
      className={[
        "border-rule flex items-start gap-2 rounded-xl border bg-surface px-2.5 py-3 transition-colors sm:gap-3 sm:px-4",
        done ? "opacity-60" : "",
        !done && item.confidence === "low"
          ? "border-amber/50 bg-amber/[0.03]"
          : "",
      ].join(" ")}
    >
      <label
        className="flex h-11 w-9 shrink-0 cursor-pointer items-center justify-center"
        title={done ? "标记为未完成" : "标记完成"}
      >
        <input
          type="checkbox"
          checked={done}
          onChange={onToggle}
          className="h-5 w-5 cursor-pointer accent-ink"
        />
        <span className="sr-only">
          {done ? "标记为未完成" : "标记完成"}
        </span>
      </label>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p
            className={[
              "text-sm leading-5 font-medium break-words",
              done ? "text-ink/45 line-through" : "",
            ].join(" ")}
          >
            {item.title}
          </p>
          {item.status === "doing" && (
            <span className="bg-ink/[0.07] rounded-full px-1.5 py-0.5 font-mono text-[9px] text-ink/60">
              进行中
            </span>
          )}
          {!done && item.confidence === "low" && (
            <span className="bg-amber/15 rounded-full px-1.5 py-0.5 font-mono text-[9px] text-amber">
              待确认
            </span>
          )}
        </div>

        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] leading-5 text-ink/45">
          {item.courseName && (
            <span className="text-ink/65">{item.courseName}</span>
          )}
          <span>{ASSIGNMENT_KIND_LABELS[item.kind]}</span>
          <span aria-hidden="true">·</span>
          <span>{ASSIGNMENT_SOURCE_LABELS[item.source]}录入</span>
        </p>

        {item.detail && (
          <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-ink/40">
            {item.detail}
          </p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink/45">
          {!done && (
            <button
              type="button"
              onClick={() =>
                onSetStatus(item.status === "todo" ? "doing" : "todo")
              }
              className="hover:text-ink inline-flex min-h-11 items-center sm:min-h-9 underline-offset-2 hover:underline"
            >
              {item.status === "todo" ? "开始做" : "放回待办"}
            </button>
          )}
          {!done && item.confidence === "low" && (
            <button
              type="button"
              onClick={onConfirm}
              className="text-amber inline-flex min-h-11 items-center sm:min-h-9 font-medium underline-offset-2 hover:underline"
            >
              确认无误
            </button>
          )}
          <button
            type="button"
            onClick={onEdit}
            className="hover:text-ink inline-flex min-h-11 items-center sm:min-h-9 underline-offset-2 hover:underline"
          >
            编辑
          </button>
          {confirmingDelete ? (
            <>
              <button
                type="button"
                onClick={onDelete}
                className="inline-flex min-h-11 items-center sm:min-h-9 font-medium text-red-800 underline-offset-2 hover:underline"
              >
                确认删除
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="hover:text-ink inline-flex min-h-11 items-center sm:min-h-9 underline-offset-2 hover:underline"
              >
                取消
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="hover:text-ink inline-flex min-h-11 items-center sm:min-h-9 underline-offset-2 hover:underline"
            >
              删除
            </button>
          )}
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        <span
          title={formatDueFull(item.due)}
          className={[
            "inline-flex items-center gap-1 rounded-md border px-1.5 py-1 font-mono text-[10px] whitespace-nowrap",
            TIER_CLASS[tier],
          ].join(" ")}
        >
          {formatDue(item.due)}
        </span>
        {TIER_TEXT[tier] && (
          <span
            className={[
              "font-mono text-[9px] whitespace-nowrap",
              tier === "overdue" || tier === "urgent"
                ? "text-red-800"
                : tier === "soon"
                  ? "text-amber"
                  : "text-ink/35",
            ].join(" ")}
          >
            {TIER_TEXT[tier]}
          </span>
        )}
      </div>
    </article>
  );
}
