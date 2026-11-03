import { useEffect, useMemo, useState } from "react";
import type {
  Assignment,
  AssignmentData,
  AssignmentStatus,
} from "../../types";
import { sortAssignments, weeklySummary } from "../../lib/ddl";
import { fromLocalInputValue, type ParsedAssignment } from "../../parse/assignments";
import AssignmentItem from "../../components/AssignmentItem";
import {
  AssignmentFormDialog,
  PasteDialog,
  ReviewDialog,
  ScreenshotDialog,
  BTN_PRIMARY,
  BTN_SECONDARY,
  createSampleReviewPayload,
  type AssignmentFormValue,
  type ReviewPayload,
} from "./ImportDialogs";

interface AssignmentsPageProps {
  data: AssignmentData | null;
  onSave: (data: AssignmentData) => Promise<void>;
}

type DialogKind = "paste" | "screenshot" | "manual" | null;

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `assignment-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function AssignmentsPage({
  data,
  onSave,
}: AssignmentsPageProps) {
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [editing, setEditing] = useState<Assignment | null>(null);
  const [review, setReview] = useState<ReviewPayload | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setTick((value) => value + 1), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const items = data?.items ?? [];
  const sorted = useMemo(() => sortAssignments(items), [items]);
  const pending = sorted.filter((item) => item.status !== "done");
  const completed = sorted.filter((item) => item.status === "done");
  const summary = useMemo(() => weeklySummary(items), [items]);

  async function persist(nextItems: Assignment[], sourceLabel?: string) {
    const next: AssignmentData = {
      items: nextItems,
      updatedAt: new Date().toISOString(),
      sourceLabel: sourceLabel ?? data?.sourceLabel,
    };
    await onSave(next);
  }

  async function updateItem(id: string, patch: Partial<Assignment>) {
    const next = items.map((item) =>
      item.id === id ? { ...item, ...patch } : item,
    );
    try {
      await persist(next);
      setSaveError(null);
    } catch {
      setSaveError("写入本机失败 请检查浏览器存储权限后重试");
    }
  }

  async function deleteItem(id: string) {
    const target = items.find((item) => item.id === id);
    try {
      await persist(items.filter((item) => item.id !== id));
      setNotice(target ? `已删除《${target.title}》` : "已删除待办");
      setSaveError(null);
    } catch {
      setSaveError("写入本机失败 请检查浏览器存储权限后重试");
    }
  }

  async function confirmImport(
    payload: ReviewPayload,
    parsed: ParsedAssignment[],
  ) {
    const existing = data?.items ?? [];
    const fresh = parsed.filter(
      (item) =>
        !existing.some(
          (current) =>
            current.title === item.title && current.due === item.due,
        ),
    );
    const skipped = parsed.length - fresh.length;
    const createdAt = new Date().toISOString();

    const created: Assignment[] = fresh.map((item) => ({
      id: makeId(),
      title: item.title,
      courseName: item.courseName,
      detail: item.detail,
      due: item.due,
      status: "todo",
      kind: item.kind,
      source: payload.source,
      confidence: item.confidence,
      createdAt,
    }));

    if (!created.length) {
      setReview(null);
      setNotice("这些待办已在列表 没有重复添加");
      return;
    }

    try {
      await persist([...existing, ...created], payload.sourceLabel);
      setReview(null);
      setDialog(null);
      setSaveError(null);
      setNotice(
        `已加入 ${created.length} 条待办${skipped ? `，跳过 ${skipped} 条重复` : ""}`,
      );
    } catch {
      setSaveError("写入本机失败 导入结果未保存 请重试或手动录入");
    }
  }

  async function handleFormSubmit(value: AssignmentFormValue) {
    const due = fromLocalInputValue(value.due);
    if (editing) {
      const next = items.map((item) =>
        item.id === editing.id
          ? {
              ...item,
              title: value.title,
              courseName: value.courseName.trim() || undefined,
              due,
              kind: value.kind,
              detail: value.detail.trim() || undefined,
              confidence: "high" as const,
            }
          : item,
      );
      await persist(next);
      setNotice(`已更新《${value.title}》`);
    } else {
      const created: Assignment = {
        id: makeId(),
        title: value.title,
        courseName: value.courseName.trim() || undefined,
        due,
        kind: value.kind,
        detail: value.detail.trim() || undefined,
        status: "todo",
        source: "manual",
        confidence: "high",
        createdAt: new Date().toISOString(),
      };
      await persist([...items, created], "手动录入");
      setNotice(`已添加《${value.title}》`);
    }
    setSaveError(null);
    setEditing(null);
    setDialog(null);
  }

  function openManual(item: Assignment | null) {
    setEditing(item);
    setDialog("manual");
  }

  function openSampleReview() {
    setReview(createSampleReviewPayload());
  }

  return (
    <div className="px-4 pb-10 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-4xl">
        <header className="border-rule flex flex-col gap-4 border-b py-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-micro tracking-[0.2em] text-ink-3">
              工具箱
            </p>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1 className="font-serif text-2xl tracking-tight sm:text-3xl">
                作业与待办
              </h1>
              <span
                className={[
                  "rounded-full px-2 py-0.5 font-mono text-micro",
                  pending.length > 0
                    ? "bg-accent/15 text-ink"
                    : "bg-ink/[0.05] text-ink-3",
                ].join(" ")}
              >
                未完成 {pending.length} 项
              </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-ink-3">
              按 DDL 从近到远排
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setDialog("paste")}
              className={BTN_SECONDARY}
            >
              粘贴文本
            </button>
            <button
              type="button"
              onClick={() => setDialog("screenshot")}
              className={BTN_SECONDARY}
            >
              导入截图
            </button>
            <button
              type="button"
              onClick={() => openManual(null)}
              className={BTN_PRIMARY}
            >
              手动添加
            </button>
          </div>
        </header>

        <section className="border-rule mt-5 rounded-xl border bg-surface px-4 py-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-mono text-micro tracking-[0.14em] text-ink-3">
              本周 {summary.start} – {summary.end}
            </p>
            <p className="font-mono text-micro text-ink-4">
              {summary.ddlCount > 0
                ? `${summary.courseCount > 0 ? `${summary.courseCount} 门课 ` : ""}${summary.ddlCount} 个 DDL`
                : ""}
            </p>
          </div>
          <p className="mt-1 text-sm leading-6">
            {summary.ddlCount > 0
              ? `本周 ${summary.courseCount > 0 ? `${summary.courseCount} 门课 ` : ""}${summary.ddlCount} 个 DDL`
              : "本周暂无 DDL"}
            {summary.overdueCount > 0 && (
              <span className="text-red-800">
                {" "}
                {summary.overdueCount} 项已逾期
              </span>
            )}
          </p>
          <p className="mt-1 text-[11px] leading-5 text-ink-3">
            24 小时内标红 72 小时内标琥珀
          </p>
        </section>

        {notice && (
          <p
            role="status"
            className="border-rule mt-4 flex items-center gap-2 rounded-lg border bg-surface px-3 py-2 text-xs text-ink-3"
          >
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-accent" />
            {notice}
          </p>
        )}

        {saveError && (
          <p
            role="alert"
            className="border-amber/50 bg-amber/[0.07] mt-4 rounded-lg border-l-2 px-3 py-2 text-xs leading-5 text-ink-2"
          >
            {saveError}
          </p>
        )}

        {items.length === 0 ? (
          <section className="border-rule mt-5 rounded-xl border bg-surface p-5 sm:p-8">
            <h2 className="text-lg font-medium tracking-tight">
              先把这周的作业收进来
            </h2>
            <p className="mt-2 max-w-lg text-sm leading-6 text-ink-3">
              截图 粘贴 或手动添加 读不到截止就留空
            </p>

            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setDialog("paste")}
                className={BTN_SECONDARY}
              >
                粘贴作业通知
              </button>
              <button
                type="button"
                onClick={() => setDialog("screenshot")}
                className={BTN_SECONDARY}
              >
                上传学习通截图
              </button>
              <button
                type="button"
                onClick={() => openManual(null)}
                className={BTN_SECONDARY}
              >
                手动添加一条
              </button>
              <button type="button" onClick={openSampleReview} className={BTN_PRIMARY}>
                用示例待办体验
              </button>
            </div>

            <p className="mt-5 text-[11px] leading-5 text-ink-3">
              不登录学习通 不抓取页面 只处理你主动上传的截图或粘贴的文本
            </p>
          </section>
        ) : (
          <>
            <section className="mt-5">
              <div className="mb-2 flex items-baseline justify-between">
                <h2 className="text-sm font-medium">待办 {pending.length}</h2>
                <span className="font-mono text-micro text-ink-4">
                  按截止时间升序
                </span>
              </div>

              {pending.length > 0 ? (
                <div className="space-y-2">
                  {pending.map((item) => (
                    <AssignmentItem
                      key={item.id}
                      item={item}
                      onToggle={() =>
                        void updateItem(item.id, {
                          status: item.status === "done" ? "todo" : "done",
                        })
                      }
                      onSetStatus={(status: AssignmentStatus) =>
                        void updateItem(item.id, { status })
                      }
                      onEdit={() => openManual(item)}
                      onDelete={() => void deleteItem(item.id)}
                      onConfirm={() =>
                        void updateItem(item.id, { confidence: "high" })
                      }
                    />
                  ))}
                </div>
              ) : (
                <p className="border-rule rounded-xl border border-dashed px-4 py-6 text-center text-xs text-ink-3">
                  没有未完成的待办
                </p>
              )}
            </section>

            {completed.length > 0 && (
              <section className="mt-5">
                <div className="mb-2 flex items-baseline justify-between">
                  <h2 className="text-sm font-medium text-ink-3">
                    已完成 {completed.length}
                  </h2>
                  <span className="font-mono text-micro text-ink-4">
                    勾选可恢复
                  </span>
                </div>
                <div className="space-y-2">
                  {completed.map((item) => (
                    <AssignmentItem
                      key={item.id}
                      item={item}
                      onToggle={() =>
                        void updateItem(item.id, {
                          status: item.status === "done" ? "todo" : "done",
                        })
                      }
                      onSetStatus={(status: AssignmentStatus) =>
                        void updateItem(item.id, { status })
                      }
                      onEdit={() => openManual(item)}
                      onDelete={() => void deleteItem(item.id)}
                      onConfirm={() =>
                        void updateItem(item.id, { confidence: "high" })
                      }
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        <div className="border-rule mt-6 border-t pt-4">
          <p className="flex items-center gap-2 text-[11px] text-ink-4">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-accent" />
            数据只存在你的浏览器 支持作业 竞赛报名 实习投递等截止事项
          </p>
        </div>
      </div>

      {review && (
        <ReviewDialog
          payload={review}
          onClose={() => setReview(null)}
          onConfirm={(parsed) => void confirmImport(review, parsed)}
        />
      )}

      {dialog === "paste" && (
        <PasteDialog
          onClose={() => setDialog(null)}
          onParsed={(payload) => {
            setDialog(null);
            setReview(payload);
          }}
        />
      )}

      {dialog === "screenshot" && (
        <ScreenshotDialog
          onClose={() => setDialog(null)}
          onParsed={(payload) => {
            setDialog(null);
            setReview(payload);
          }}
          onPasteInstead={() => setDialog("paste")}
          onManualInstead={() => openManual(null)}
        />
      )}

      {dialog === "manual" && (
        <AssignmentFormDialog
          initial={editing}
          onClose={() => {
            setDialog(null);
            setEditing(null);
          }}
          onSubmit={handleFormSubmit}
        />
      )}
    </div>
  );
}
