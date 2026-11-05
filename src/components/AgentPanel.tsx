import { useEffect, useRef, useState } from "react";
import type {
  AgentMessage,
  Experience,
  ExperienceEvidence,
  ExperienceKind,
  ExperienceMetric,
  JobPosting,
  LedgerEvent,
  Note,
  Profile,
  ResumeData,
} from "../types";
import { JOB_TYPE_LABELS, GOALS, GOAL_LABELS, RESUME_GRADES } from "../types";
import {
  EXPERIENCE_KINDS,
  EXPERIENCE_KIND_META,
} from "../lib/experience";
import { newId } from "../lib/id";
import WindowLayer from "./WindowLayer";
import { FloatField, FloatSelect } from "./FloatField";
import {
  agentGreeting,
  emptyExperienceDraft,
  missingExperienceParts,
  profileDraftFrom,
  readinessGaps,
  runAgent,
  type AgentAction,
  type AgentDraft,
  type AgentExperienceDraft,
  type AgentJobDraft,
  type AgentMode,
  type AgentNavigate,
  type AgentProfileDraft,
  type AgentWindow,
} from "../ai/tasks/agent";
import { THEMES, type ThemeId } from "../lib/theme";
import { isAiMockMode } from "../ai/client";
import { useAiConfig } from "../ai/useAiConfig";

export type DockMode = "closed" | "docked" | "floating";

function useWideLayout(): boolean {
  const [wide, setWide] = useState(
    () => window.matchMedia("(min-width: 1024px)").matches,
  );
  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const onChange = () => setWide(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return wide;
}

interface AgentPanelProps {
  profile: Profile | null;
  experiences: Experience[];
  ledger: LedgerEvent[];
  notes: Note[];
  resume: ResumeData;
  jobs: JobPosting[];
  messages: AgentMessage[];
  raised?: boolean;
  dockMode: DockMode;
  onDockModeChange: (mode: DockMode) => void;
  onMessagesChange: (messages: AgentMessage[]) => void;
  onSaveProfile: (draft: AgentProfileDraft) => Promise<void>;
  onSaveExperience: (draft: AgentExperienceDraft) => Promise<void>;
  onSaveJob: (draft: AgentJobDraft) => Promise<void>;
  onAddNote: (text: string, tags?: string[]) => Promise<void>;
  onNavigate: (id: AgentNavigate) => void;
  onOpenWindow: (id: AgentWindow) => void;
  theme: ThemeId;
  cursorOn: boolean;
  onThemeChange: (theme: ThemeId) => void;
  onCursorChange: (on: boolean) => void;
}

const BTN_PRIMARY =
  "bg-ink text-paper inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50";
const BTN_SECONDARY =
  "border-rule hover:bg-ink/[0.03] inline-flex min-h-11 items-center justify-center rounded-lg border bg-surface px-3 text-xs disabled:cursor-not-allowed disabled:opacity-50";
const BTN_GHOST =
  "inline-flex min-h-11 items-center px-2 text-xs text-ink-3 underline underline-offset-4 hover:text-ink disabled:opacity-40";

const QUICK_ACTIONS = [
  { id: "profile", label: "帮我建档" },
  { id: "experience", label: "记一条经历" },
  { id: "note", label: "提交碎片" },
  { id: "week", label: "这周做了什么" },
  { id: "readiness", label: "离实习还差什么" },
  { id: "jobs", label: "看 3 个岗位" },
  { id: "guide", label: "站内怎么用" },
] as const;

type QuickId = (typeof QUICK_ACTIONS)[number]["id"];

const MODE_LABELS: Record<AgentMode, string> = {
  auto: "自由提问",
  profile: "建档",
  experience: "记经历",
  note: "碎片",
};

const PLACEHOLDERS: Record<AgentMode, string> = {
  auto: "问记录官 这周做了什么 怎么换主题 也可以直接粘一段岗位 JD",
  profile: "如 大二 人工智能 想找算法实习 会 Python 和 SQL",
  experience:
    "如 做了一个校园选课系统 原来人工登记高峰期会超选 我用 MySQL 事务重写选课流程 负责数据库设计和 12 张表的建表脚本 200 人并发测试通过 报告被老师选为课堂示例",
  note: "把碎片内容写给我 确认后进征途碎片收件箱",
};

function splitList(value: string, limit: number): string[] {
  return [
    ...new Set(
      value
        .split(/[,，、;；\n]+/)
        .map((item) => item.trim().slice(0, 40))
        .filter(Boolean),
    ),
  ].slice(0, limit);
}

function makeMessage(role: "user" | "agent", text: string): AgentMessage {
  return {
    id: newId("agent"),
    role,
    text: text.slice(0, 4000),
    createdAt: new Date().toISOString(),
  };
}

function localDayKey(iso?: string): string {
  const date = iso ? new Date(iso) : new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function greetingHeadline(): string {
  const hour = new Date().getHours();
  return hour < 5
    ? "夜深了"
    : hour < 11
      ? "早上好"
      : hour < 14
        ? "中午好"
        : hour < 18
          ? "下午好"
          : "晚上好";
}

const NAVIGATE_LABELS: Record<AgentNavigate, string> = {
  today: "回到今日",
  experiences: "打开征途",
  opportunities: "打开征召",
  toolbox: "打开工具箱",
  space: "打开学径空间",
  resume: "打开简历",
};

function navigateLabel(id: AgentNavigate): string {
  return NAVIGATE_LABELS[id];
}

export default function AgentPanel({
  profile,
  experiences,
  ledger,
  notes,
  resume,
  jobs,
  messages,
  raised = false,
  dockMode,
  onDockModeChange,
  onMessagesChange,
  onSaveProfile,
  onSaveExperience,
  onSaveJob,
  onAddNote,
  onNavigate,
  onOpenWindow,
  theme,
  cursorOn,
  onThemeChange,
  onCursorChange,
}: AgentPanelProps) {
  const isWide = useWideLayout();
  const aiConfig = useAiConfig();
  const aiReady = Boolean(aiConfig?.apiKey?.trim()) || !isAiMockMode();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AgentMode>("auto");
  const [input, setInput] = useState("");
  const [draft, setDraft] = useState<AgentDraft | null>(null);
  const [draftVersion, setDraftVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [navigateTarget, setNavigateTarget] = useState<AgentNavigate | null>(
    null,
  );
  const [actionTarget, setActionTarget] = useState<AgentAction | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const draftRef = useRef<HTMLDivElement>(null);
  const lastDraftVersionRef = useRef(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastMessageLength =
    messages.length > 0 ? messages[messages.length - 1].text.length : 0;

  // 停靠与浮窗在桌面端常驻 不受 open 控制 自动滚动要按「面板此刻可见」判断
  const panelVisible = isWide ? dockMode !== "closed" : open;
  const todayKey = localDayKey();
  const todayLedgerCount = ledger.filter(
    (event) => !event.revokedAt && event.date === todayKey,
  ).length;
  const inboxCount = notes.filter((note) => note.status === "inbox").length;

  // 每次叫出来先招呼一声 一分钟内重复开合不刷屏 常驻停靠时按半小时算
  const wasVisibleRef = useRef(false);
  useEffect(() => {
    if (!panelVisible) {
      wasVisibleRef.current = false;
      return;
    }
    const justOpened = !wasVisibleRef.current;
    wasVisibleRef.current = true;
    if (messages.length === 0) return;
    const last = messages[messages.length - 1];
    const gap = justOpened ? 60 * 1000 : 30 * 60 * 1000;
    if (Date.now() - new Date(last.createdAt).getTime() < gap) return;
    onMessagesChange(
      [
        ...messages,
        makeMessage("agent", agentGreeting({ profile, ledger, notes })),
      ].slice(-500),
    );
  }, [panelVisible, messages, profile, ledger, notes, onMessagesChange]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const panel = document.getElementById("agent-panel");
      if (!panel) return;
      const focusable = [
        ...panel.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ].filter(
        (element) => !element.hasAttribute("disabled") && element.offsetParent,
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // 新草稿把第一行字段送到眼前 否则长卡会把标题顶出可视区
  // 只在草稿换版时定位 打字时 draft 每次变更都重排会让输入框一直跳
  useEffect(() => {
    if (!panelVisible) return;
    const list = listRef.current;
    if (!list) return;
    const card = draftRef.current;
    const isNewDraft =
      draftVersion > 0 && draftVersion !== lastDraftVersionRef.current;
    lastDraftVersionRef.current = draftVersion;
    if (isNewDraft && card) {
      const align = () => {
        const current = draftRef.current;
        if (!current) return;
        const top =
          current.getBoundingClientRect().top -
          list.getBoundingClientRect().top +
          list.scrollTop -
          8;
        list.scrollTop = Math.max(0, top);
      };
      align();
      // 面板展开动画未完成时 scrollTop 会被夹住 布局稳定后再对一次
      const timer = window.setTimeout(align, 260);
      return () => window.clearTimeout(timer);
    }
    // 草稿开着时不抢滚动位置 迟到的回复会把卡片顶出可视区
    if (card) return;
    list.scrollTop = list.scrollHeight;
  }, [panelVisible, messages.length, lastMessageLength, draftVersion, busy, thinking]);

  // 输入框随内容长高 到顶后转为框内滚动 避免长文被压在两行里看不见
  useEffect(() => {
    const node = inputRef.current;
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${Math.min(node.scrollHeight, 176)}px`;
  }, [input, mode]);

  function appendAgent(text: string) {
    onMessagesChange([...messages, makeMessage("agent", text)].slice(-500));
  }

  async function send(raw: string, forcedMode?: AgentMode) {
    const value = raw.trim();
    if (!value || busy || thinking) return;
    setError(null);
    const now = new Date().toISOString();
    const withUser = [
      ...messages,
      {
        id: newId("agent"),
        role: "user" as const,
        text: value.slice(0, 1000),
        createdAt: now,
      },
    ].slice(-500);
    onMessagesChange(withUser);
    setInput("");
    setThinking(true);
    setNavigateTarget(null);
    setActionTarget(null);
    try {
      const reply = await runAgent(
        value,
        { profile, experiences, ledger, notes, resume, jobs, theme, cursorOn },
        forcedMode ?? mode,
      );
      onMessagesChange(
        [
          ...withUser,
          {
            id: newId("agent"),
            role: "agent" as const,
            text: reply.text.slice(0, 4000),
            createdAt: new Date().toISOString(),
          },
        ].slice(-500),
      );
      if (reply.draft) {
        setDraft(reply.draft);
        setDraftVersion((count) => count + 1);
        setError(null);
      }
      setNavigateTarget(reply.navigate ?? null);
      setActionTarget(reply.action ?? null);
      setMode("auto");
    } catch {
      setError("整理失败 将这段原样贴进征途手动填 或稍后再发一次");
    } finally {
      setThinking(false);
    }
  }

  function guardDraft(): boolean {
    if (!draft) return false;
    appendAgent("先把上面的草稿确认或取消 再开新的");
    return true;
  }

  function openDraft(next: AgentDraft, userText: string, intro: string) {
    setDraft(next);
    setDraftVersion((count) => count + 1);
    setError(null);
    setNavigateTarget(null);
    setActionTarget(null);
    onMessagesChange(
      [
        ...messages,
        makeMessage("user", userText),
        makeMessage("agent", intro),
      ].slice(-500),
    );
    window.setTimeout(() => inputRef.current?.blur(), 0);
  }

  function runQuick(id: QuickId) {
    if (id === "profile") {
      if (guardDraft()) return;
      openDraft(
        { kind: "profile", data: profileDraftFrom(profile) },
        "帮我建档",
        "已把现有档案填进草稿 改完确认",
      );
      return;
    }
    if (id === "experience") {
      if (guardDraft()) return;
      openDraft(
        { kind: "experience", data: emptyExperienceDraft() },
        "记一条经历",
        "空白草稿已展开 填标题和四段里任意一段 有数字或证据就能进简历",
      );
      return;
    }
    if (id === "note") {
      if (guardDraft()) return;
      openDraft(
        { kind: "note", text: "" },
        "提交一条碎片",
        "好 这条按碎片记 写下内容就行 确认后进碎片收件箱",
      );
      return;
    }
    if (id === "week") void send("这周做了什么");
    else if (id === "readiness") void send("离实习还差什么");
    else if (id === "jobs") void send("看 3 个岗位");
    else void send("这个站怎么用");
  }

  async function handleConfirm() {
    if (!draft || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (draft.kind === "profile") {
        await onSaveProfile(draft.data);
        appendAgent(
          `已建档 ${[
            draft.data.grade || "年级未填",
            draft.data.major || "专业未填",
            GOAL_LABELS[draft.data.goal],
          ].join(" ")} 去征召可以按这份档案对照岗位`,
        );
        setNavigateTarget("opportunities");
      } else if (draft.kind === "experience") {
        const missing = missingExperienceParts(draft.data);
        if (!draft.data.title.trim()) {
          setError("标题不能为空");
          setBusy(false);
          return;
        }
        if (missing.length === 4) {
          setError("四段至少填一段 或改成提交一条碎片");
          setBusy(false);
          return;
        }
        await onSaveExperience(draft.data);
        const gaps = readinessGaps(draft.data);
        appendAgent(
          `已写入征途「${draft.data.title}」 ${
            gaps.length > 0
              ? `离简历就绪还差 ${gaps.join(" ")} 可以去经历页补`
              : "这条已简历就绪 自动选进简历草稿"
          }`,
        );
        setNavigateTarget("experiences");
      } else if (draft.kind === "job") {
        await onSaveJob(draft.data);
        appendAgent(
          `已存进本机岗位库「${draft.data.job.title}」 ${draft.data.score} 分 ${draft.data.qualLabel} 去征召会和演示卡一起排序`,
        );
        setNavigateTarget("opportunities");
      } else {
        await onAddNote(draft.text, ["记录官"]);
        appendAgent("已存进碎片收件箱 想转成战绩 去征途点 <转成战绩>");
        setNavigateTarget("experiences");
      }
      setDraft(null);
    } catch {
      setError("写入失败 请检查浏览器存储权限后重试");
    } finally {
      setBusy(false);
    }
  }

  async function handleNoteInstead() {
    if (!draft || draft.kind !== "experience" || busy) return;
    setBusy(true);
    setError(null);
    try {
      const noteText = [
        draft.data.title,
        draft.data.problem,
        draft.data.method,
        draft.data.contribution,
        draft.data.result,
      ]
        .filter(Boolean)
        .join("；");
      await onAddNote(noteText || draft.data.raw, ["记录官"]);
      appendAgent("已当碎片存进收件箱 之后想补全 去征途点 <转成战绩>");
      setDraft(null);
      setNavigateTarget("experiences");
    } catch {
      setError("写入失败 请检查浏览器存储权限后重试");
    } finally {
      setBusy(false);
    }
  }

  function handleCancel() {
    setDraft(null);
    setError(null);
    appendAgent("已取消 这次没有写入");
  }

  function handleNavigate(id: AgentNavigate) {
    onNavigate(id);
    setNavigateTarget(null);
    setActionTarget(null);
    setOpen(false);
  }

  function handleAction(action: AgentAction) {
    if (action.kind === "theme") {
      onThemeChange(action.theme);
      const name =
        THEMES.find((item) => item.id === action.theme)?.name ?? "新主题";
      appendAgent(`已切到${name}`);
    } else if (action.kind === "cursor") {
      onCursorChange(action.on);
      appendAgent(action.on ? "主题光标已开启" : "主题光标已关闭");
    } else {
      onOpenWindow(action.window);
      if (!isWide) setOpen(false);
    }
    setActionTarget(null);
    setNavigateTarget(null);
  }

  const panelBody = (
    <div className="agent-panel-body flex h-full min-h-0 w-full flex-col">
            <header className="agent-head border-rule flex shrink-0 items-center gap-3 border-b px-4 py-3">
              <span className="agent-head-mark" aria-hidden="true">
                记
              </span>
              <div className="min-w-0 flex-1">
                <h2
                  id="agent-title"
                  className="font-serif text-lg leading-5 tracking-tight"
                >
                  记录官
                </h2>
                <p className="agent-head-meta mt-0.5 font-mono text-micro leading-4 text-ink-4">
                  {aiReady
                    ? "模型已接入 写入前先给草稿"
                    : "本机规则 写入前先给草稿"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                {isWide && dockMode === "docked" && (
                  <button
                    type="button"
                    onClick={() => onDockModeChange("floating")}
                    aria-label="浮出为独立窗口"
                    title="浮出为独立窗口"
                    className="agent-tool hover:bg-ink/[0.04] inline-flex h-11 w-11 items-center justify-center rounded-lg text-[11px] leading-none text-ink-3 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
                  >
                    浮出
                  </button>
                )}
                {isWide && dockMode === "floating" && (
                  <button
                    type="button"
                    onClick={() => onDockModeChange("docked")}
                    aria-label="停靠到右侧"
                    title="停靠到右侧"
                    className="agent-tool hover:bg-ink/[0.04] inline-flex h-11 w-11 items-center justify-center rounded-lg text-[11px] leading-none text-ink-3 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
                  >
                    停靠
                  </button>
                )}
                {!isWide && (
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="关闭记录官"
                    className="agent-tool hover:bg-ink/[0.04] inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-lg leading-none text-ink-3 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
                  >
                    ×
                  </button>
                )}
              </div>
            </header>

            <div
              ref={listRef}
              className="agent-log flex-1 overflow-y-auto overscroll-contain px-4 py-4"
            >
              {messages.length === 0 ? (
                <div className="agent-empty">
                  <p className="font-serif text-base leading-6 tracking-tight">
                    {greetingHeadline()} 我是记录官
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-ink-3">
                    写账 收 JD 站内指路 都能问我
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-ink-4">
                    今天留痕 {todayLedgerCount} 条 碎片收件箱 {inboxCount} 条
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-ink-4">
                    想提交碎片直接说 提交一条碎片 或者把内容写给我
                  </p>
                </div>
              ) : (
                <ul className="agent-msgs">
                  {messages.slice(-40).map((message) => (
                    <MessageBubble key={message.id} message={message} />
                  ))}
                </ul>
              )}

              {thinking && (
                <p
                  role="status"
                  aria-live="polite"
                  className="agent-thinking font-mono text-micro mt-3 text-ink-4"
                >
                  正在整理这段 稍等一下
                </p>
              )}

              {draft && (
                <div ref={draftRef} className="agent-draft-wrap mt-4">
                  {draft.kind === "profile" ? (
                    <ProfileDraftCard
                      key={draftVersion}
                      data={draft.data}
                      onChange={(data) =>
                        setDraft({ kind: "profile", data })
                      }
                      onConfirm={() => void handleConfirm()}
                      onCancel={handleCancel}
                      busy={busy}
                      error={error}
                    />
                  ) : draft.kind === "experience" ? (
                    <ExperienceDraftCard
                      key={draftVersion}
                      data={draft.data}
                      onChange={(data) =>
                        setDraft({ kind: "experience", data })
                      }
                      onConfirm={() => void handleConfirm()}
                      onNote={() => void handleNoteInstead()}
                      onCancel={handleCancel}
                      busy={busy}
                      error={error}
                    />
                  ) : draft.kind === "job" ? (
                    <JobDraftCard
                      key={draftVersion}
                      data={draft.data}
                      onConfirm={() => void handleConfirm()}
                      onCancel={handleCancel}
                      busy={busy}
                      error={error}
                    />
                  ) : (
                    <NoteDraftCard
                      key={draftVersion}
                      text={draft.text}
                      onChange={(text) => setDraft({ kind: "note", text })}
                      onConfirm={() => void handleConfirm()}
                      onCancel={handleCancel}
                      busy={busy}
                      error={error}
                    />
                  )}
                </div>
              )}

              {actionTarget && (
                <button
                  type="button"
                  onClick={() => handleAction(actionTarget)}
                  className={`${BTN_PRIMARY} agent-jump mt-3 w-full`}
                >
                  {actionTarget.label}
                </button>
              )}

              {navigateTarget && (
                <button
                  type="button"
                  onClick={() => handleNavigate(navigateTarget)}
                  className={`${BTN_SECONDARY} agent-jump mt-3 w-full`}
                >
                  {navigateLabel(navigateTarget)}
                </button>
              )}

              {error && !draft && (
                <p
                  role="alert"
                  className="agent-error border-amber/50 bg-amber/[0.06] mt-3 rounded-lg border-l-2 px-3 py-2 text-[11px] leading-5 text-ink-2"
                >
                  {error}
                </p>
              )}
            </div>

            <footer className="agent-foot border-rule shrink-0 border-t px-4 pb-3 pt-2.5">
              <div className="agent-chips flex flex-wrap gap-1.5">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => runQuick(action.id)}
                    className="agent-chip text-micro"
                  >
                    {action.label}
                  </button>
                ))}
              </div>

              <div className="agent-compose">
                <textarea
                  ref={inputRef}
                  value={input}
                  aria-label="给记录官"
                  onChange={(event) =>
                    setInput(event.target.value.slice(0, 1000))
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void send(input);
                    }
                  }}
                  rows={2}
                  placeholder={PLACEHOLDERS[mode]}
                  className="agent-input text-xs outline-none"
                />

                <div className="agent-compose-bar">
                  <p className="agent-mode font-mono text-micro">
                    {mode === "auto"
                      ? "自由提问"
                      : `正在${MODE_LABELS[mode]}`}
                  </p>
                  {mode !== "auto" && (
                    <button
                      type="button"
                      onClick={() => setMode("auto")}
                      className="agent-exit text-micro underline underline-offset-2"
                    >
                      退出当前模式
                    </button>
                  )}
                  <span
                    className={`agent-count font-mono text-micro ${
                      input.length >= 900 ? "is-near" : ""
                    }`}
                  >
                    {input.length} / 1000
                  </span>
                  <button
                    type="button"
                    onClick={() => void send(input)}
                    disabled={!input.trim() || busy || thinking}
                    className="agent-send text-xs font-medium"
                  >
                    {thinking ? "整理中" : "发送"}
                  </button>
                </div>
              </div>
            </footer>
    </div>
  );

  if (isWide) {
    if (dockMode === "closed") {
      return null;
    }

    if (dockMode === "docked") {
      return (
        <section
          aria-label="记录官"
          className="border-rule bg-surface hidden h-dvh w-full border-l lg:flex lg:flex-col"
        >
          {panelBody}
        </section>
      );
    }

    return (
      <WindowLayer
        id="agent"
        title="记录官"
        subtitle={
          aiReady ? "模型已接入 写入前先给草稿" : "本地建档 写账 查账"
        }
        width={424}
        height={680}
        onClose={() => onDockModeChange("closed")}
        actions={
          <button
            type="button"
            onClick={() => onDockModeChange("docked")}
            aria-label="停靠到右侧"
            className="hover:bg-ink/[0.05] inline-flex min-h-9 items-center rounded-md px-2 text-micro text-ink-3 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
          >
            停靠
          </button>
        }
      >
        <div className="h-full min-h-0 [&>div>header]:hidden">
          {panelBody}
        </div>
      </WindowLayer>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="agent-panel"
        aria-label="打开记录官"
        className={[
          "agent-launcher no-print bg-ink text-paper fixed right-4 z-[80] inline-flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-[transform,opacity] hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:outline-none sm:right-6 sm:w-auto sm:justify-start sm:gap-2 sm:px-4",
          raised ? "bottom-24 lg:bottom-6" : "bottom-4 sm:bottom-6",
        ].join(" ")}
      >
        <span
          aria-hidden="true"
          className="border-paper/35 flex h-6 w-6 items-center justify-center rounded-full border font-serif text-[13px]"
        >
          记
        </span>
        <span className="hidden text-sm sm:inline">记录官</span>
      </button>

      {open && (
        <>
          <div
            aria-hidden="true"
            onClick={() => setOpen(false)}
            className="no-print bg-ink/30 fixed inset-0 z-[90]"
          />
          <section
            id="agent-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="agent-title"
            className="no-print border-rule bg-surface fixed inset-x-0 bottom-0 z-[100] flex max-h-[90dvh] flex-col rounded-t-2xl border-t shadow-2xl sm:inset-y-0 sm:right-0 sm:left-auto sm:w-[430px] sm:max-h-none sm:rounded-none sm:border-t-0 sm:border-l"
          >
            {panelBody}
          </section>
        </>
      )}
    </>
  );
}

function formatClock(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function MessageBubble({ message }: { message: AgentMessage }) {
  const isUser = message.role === "user";
  const clock = formatClock(message.createdAt);
  return (
    <li className={`agent-msg ${isUser ? "is-user" : "is-agent"}`}>
      <span className="agent-msg-mark" aria-hidden="true">
        {isUser ? "我" : "记"}
      </span>
      <div className="agent-msg-main">
        {clock && (
          <p className="agent-msg-meta font-mono text-micro">{clock}</p>
        )}
        <div className="agent-bubble">{message.text}</div>
      </div>
    </li>
  );
}

function ProfileDraftCard({
  data,
  onChange,
  onConfirm,
  onCancel,
  busy,
  error,
}: {
  data: AgentProfileDraft;
  onChange: (data: AgentProfileDraft) => void;
  onConfirm: () => void;
  onCancel: () => void;
  busy: boolean;
  error: string | null;
}) {
  const [targetText, setTargetText] = useState(
    data.targetRoles.join("，"),
  );
  const [skillsText, setSkillsText] = useState(data.skills.join("，"));

  function set<K extends keyof AgentProfileDraft>(
    key: K,
    value: AgentProfileDraft[K],
  ) {
    onChange({ ...data, [key]: value });
  }

  return (
    <div className="agent-draft border-accent/30 bg-accent/[0.04] rounded-xl border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium">档案草稿</p>
        <span className="font-mono text-micro text-ink-4">写入前确认</span>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <FloatSelect
          label="年级"
          value={data.grade}
          onChange={(value) =>
            set("grade", value as AgentProfileDraft["grade"])
          }
          options={[
            { value: "", label: "未填" },
            ...RESUME_GRADES.map((grade) => ({
              value: grade,
              label: grade,
            })),
          ]}
        />
        <FloatField
          label="专业"
          value={data.major}
          onChange={(value) => set("major", value.slice(0, 60))}
          maxLength={60}
        />
        <FloatSelect
          label="方向"
          value={data.goal}
          onChange={(value) => set("goal", value as AgentProfileDraft["goal"])}
          options={GOALS.map((goal) => ({
            value: goal,
            label: GOAL_LABELS[goal],
          }))}
        />
        <FloatField
          label="目标岗位"
          value={targetText}
          onChange={(value) => {
            setTargetText(value);
            set("targetRoles", splitList(value, 20));
          }}
          maxLength={80}
        />
      </div>

      <div className="mt-2">
        <FloatField
          label="技能"
          value={skillsText}
          onChange={(value) => {
            setSkillsText(value);
            set("skills", splitList(value, 30));
          }}
          maxLength={120}
        />
      </div>

      <p className="mt-2 text-micro leading-4 text-ink-4">
        岗位与技能用逗号分隔 不写姓名学号
      </p>
      {error && (
        <p role="alert" className="mt-2 text-micro text-red-800">
          {error}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className={BTN_PRIMARY}
        >
          {busy ? "正在写入…" : "确认建档"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className={BTN_GHOST}
        >
          取消
        </button>
      </div>
    </div>
  );
}

const EXPERIENCE_PARTS: {
  key: "problem" | "method" | "contribution" | "result";
  label: string;
}[] = [
  { key: "problem", label: "问题" },
  { key: "method", label: "方法" },
  { key: "contribution", label: "贡献" },
  { key: "result", label: "结果" },
];

function parseMetricLine(line: string): ExperienceMetric | null {
  const value = line.trim().replace(/\s+/g, " ");
  const at = value.search(/\d/);
  if (!value || at < 0) return null;
  const label = value.slice(0, at).trim().slice(-10) || "量化";
  return { label, value: value.slice(at).slice(0, 40) };
}

function parseEvidenceLine(line: string): ExperienceEvidence | null {
  const value = line.trim();
  if (!value) return null;
  const url = value.match(/https?:\/\/\S+/)?.[0] ?? "";
  const label = value.replace(url, "").trim().slice(0, 40);
  if (!label && !url) return null;
  return url ? { label: label || "链接", url: url.slice(0, 300) } : { label };
}

function DraftChip({
  text,
  onRemove,
}: {
  text: string;
  onRemove: () => void;
}) {
  return (
    <span className="border-rule bg-surface inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-1 text-micro">
      <span className="truncate">{text}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`移除 ${text}`}
        className="text-ink-4 hover:text-red-800 px-0.5 leading-none"
      >
        ×
      </button>
    </span>
  );
}

function AddLine({
  label,
  hint,
  value,
  onChange,
  onAdd,
  addLabel,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
  onAdd: () => void;
  addLabel: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="min-w-0 flex-1">
        <FloatField
          label={label}
          hint={hint}
          value={value}
          onChange={onChange}
          maxLength={60}
        />
      </div>
      <button
        type="button"
        onClick={onAdd}
        disabled={!value.trim()}
        className={BTN_SECONDARY}
      >
        {addLabel}
      </button>
    </div>
  );
}

function ExperienceDraftCard({
  data,
  onChange,
  onConfirm,
  onNote,
  onCancel,
  busy,
  error,
}: {
  data: AgentExperienceDraft;
  onChange: (data: AgentExperienceDraft) => void;
  onConfirm: () => void;
  onNote: () => void;
  onCancel: () => void;
  busy: boolean;
  error: string | null;
}) {
  const missing = missingExperienceParts(data);
  const gaps = readinessGaps(data);
  const [skillsText, setSkillsText] = useState(data.skills.join("，"));
  const [metricText, setMetricText] = useState("");
  const [evidenceText, setEvidenceText] = useState("");

  function set<K extends keyof AgentExperienceDraft>(
    key: K,
    value: AgentExperienceDraft[K],
  ) {
    onChange({ ...data, [key]: value });
  }

  function addMetric() {
    const metric = parseMetricLine(metricText);
    if (!metric) return;
    set("metrics", [...data.metrics, metric].slice(0, 6));
    setMetricText("");
  }

  function addEvidence() {
    const evidence = parseEvidenceLine(evidenceText);
    if (!evidence) return;
    set("evidence", [...data.evidence, evidence].slice(0, 6));
    setEvidenceText("");
  }

  return (
    <div className="agent-draft border-accent/30 bg-accent/[0.04] rounded-xl border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium">经历草稿</p>
        <span
          className={[
            "rounded-full border px-2 py-0.5 font-mono text-micro",
            data.confidence === "high"
              ? "border-accent/40 bg-accent/[0.08] text-accent-ink"
              : "border-amber/40 bg-amber/[0.08] text-amber-ink",
          ].join(" ")}
        >
          {data.confidence === "high"
            ? "四段齐全"
            : `还缺 ${missing.join("、") || "内容"}`}
        </span>
      </div>

      <div className="mt-3 grid gap-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <FloatField
            label="标题"
            value={data.title}
            onChange={(value) => set("title", value.slice(0, 120))}
            maxLength={120}
            required
          />
          <FloatSelect
            label="类型"
            value={data.kind}
            onChange={(value) => set("kind", value as ExperienceKind)}
            options={EXPERIENCE_KINDS.map((kind) => ({
              value: kind,
              label: EXPERIENCE_KIND_META[kind].label,
            }))}
          />
        </div>
        <FloatField
          label="组织 课程 赛事"
          value={data.org}
          onChange={(value) => set("org", value.slice(0, 80))}
          maxLength={80}
        />

        {EXPERIENCE_PARTS.map((part) => (
          <FloatField
            key={part.key}
            label={part.label}
            value={data[part.key]}
            onChange={(value) => set(part.key, value.slice(0, 2000))}
            multiline
            rows={2}
            maxLength={2000}
            warn={missing.includes(part.label)}
          />
        ))}

        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className="text-ink-4 font-mono text-micro">量化数据</span>
          {data.metrics.map((metric, index) => (
            <DraftChip
              key={`${metric.label}-${index}`}
              text={`${metric.label} ${metric.value}`}
              onRemove={() =>
                set(
                  "metrics",
                  data.metrics.filter((_, at) => at !== index),
                )
              }
            />
          ))}
          {data.metrics.length === 0 && (
            <span className="text-ink-4 text-micro">还没有</span>
          )}
        </div>
        <AddLine
          label="补一条量化"
          hint="标签与数字用空格分开"
          value={metricText}
          onChange={setMetricText}
          onAdd={addMetric}
          addLabel="加上"
        />

        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className="text-ink-4 font-mono text-micro">证据</span>
          {data.evidence.map((item, index) => (
            <DraftChip
              key={`${item.label}-${index}`}
              text={item.url ? `${item.label} 链接` : item.label}
              onRemove={() =>
                set(
                  "evidence",
                  data.evidence.filter((_, at) => at !== index),
                )
              }
            />
          ))}
          {data.evidence.length === 0 && (
            <span className="text-ink-4 text-micro">还没有</span>
          )}
        </div>
        <AddLine
          label="补一条证据"
          hint="名称 或 名称加链接"
          value={evidenceText}
          onChange={setEvidenceText}
          onAdd={addEvidence}
          addLabel="加上"
        />

        <FloatField
          label="技能"
          value={skillsText}
          onChange={(value) => {
            setSkillsText(value);
            set("skills", splitList(value, 30));
          }}
          maxLength={120}
        />
      </div>

      <p className="mt-2 text-micro leading-4 text-ink-4">
        {gaps.length > 0
          ? `离简历就绪还差 ${gaps.join(" ")} 四段不全时标为待确认 不进简历`
          : "四段与数字都齐 确认后即为简历就绪"}
      </p>
      {error && (
        <p role="alert" className="mt-2 text-micro text-red-800">
          {error}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className={BTN_PRIMARY}
        >
          {busy ? "正在写入…" : "确认写入征途"}
        </button>
        <button
          type="button"
          onClick={onNote}
          disabled={busy}
          className={BTN_SECONDARY}
        >
          只记一条备注
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className={BTN_GHOST}
        >
          取消
        </button>
      </div>
    </div>
  );
}

function JobDraftCard({
  data,
  onConfirm,
  onCancel,
  busy,
  error,
}: {
  data: AgentJobDraft;
  onConfirm: () => void;
  onCancel: () => void;
  busy: boolean;
  error: string | null;
}) {
  const { job } = data;
  const rows = [
    { label: "公司", value: job.company },
    { label: "岗位", value: job.title },
    job.city === "未填写" ? null : { label: "城市", value: job.city },
    { label: "类型", value: JOB_TYPE_LABELS[job.type] },
    { label: "要求", value: `${job.requirements.length} 条` },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="agent-draft border-rule bg-paper/40 rounded-xl border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium">岗位草稿</p>
        <span className="font-mono text-micro text-ink-4">写入前确认</span>
      </div>

      <dl className="mt-2 space-y-1">
        {rows.map((row) => (
          <div key={row.label} className="flex gap-2 text-[11px] leading-5">
            <dt className="w-8 shrink-0 text-ink-4">{row.label}</dt>
            <dd className="min-w-0 break-words text-ink-2">{row.value}</dd>
          </div>
        ))}
      </dl>

      <p className="border-rule mt-2 border-t pt-2 text-[11px] leading-5 text-ink-2">
        {data.total > 0
          ? `${data.score} 分 ${data.tierLabel} 命中 ${data.hits}/${data.total} ${data.qualLabel}`
          : `${data.score} 分 这段还没拆成可对照的要求`}
      </p>

      {data.gaps.length > 0 && (
        <ul className="mt-1 space-y-0.5">
          {data.gaps.map((gap) => (
            <li key={gap} className="text-micro leading-4 text-ink-4">
              缺口 {gap}
            </li>
          ))}
        </ul>
      )}

      {data.warnings.length > 0 && (
        <p className="mt-1 text-micro leading-4 text-ink-4">
          {data.warnings[0]}
        </p>
      )}

      <p className="mt-2 text-micro leading-4 text-ink-4">
        只存这台浏览器 之后和演示卡一起参与排序
      </p>

      {error && (
        <p role="alert" className="mt-2 text-micro text-red-800">
          {error}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className={BTN_PRIMARY}
        >
          {busy ? "正在写入…" : "存进本机岗位库"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className={BTN_SECONDARY}
        >
          取消
        </button>
      </div>
    </div>
  );
}

function NoteDraftCard({
  text,
  onChange,
  onConfirm,
  onCancel,
  busy,
  error,
}: {
  text: string;
  onChange: (text: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  busy: boolean;
  error: string | null;
}) {
  return (
    <div className="agent-draft border-rule bg-paper/40 rounded-xl border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium">碎片草稿</p>
        <span className="font-mono text-micro text-ink-4">写入前确认</span>
      </div>
      <FloatField
        label="碎片内容"
        value={text}
        onChange={(value) => onChange(value.slice(0, 1000))}
        multiline
        rows={3}
        maxLength={1000}
      />
      <p className="mt-2 text-micro leading-4 text-ink-4">
        确认后进征途碎片收件箱 不算完整经历
      </p>
      {error && (
        <p role="alert" className="mt-2 text-micro text-red-800">
          {error}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy || !text.trim()}
          className={BTN_PRIMARY}
        >
          {busy ? "正在写入…" : "存进收件箱"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className={BTN_GHOST}
        >
          取消
        </button>
      </div>
    </div>
  );
}
