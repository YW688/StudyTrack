import { useEffect, useRef, useState } from "react";
import type {
  AgentMessage,
  Experience,
  ExperienceKind,
  LedgerEvent,
  Note,
  Profile,
  ResumeData,
} from "../types";
import { GOALS, GOAL_LABELS, RESUME_GRADES } from "../types";
import {
  EXPERIENCE_KINDS,
  EXPERIENCE_KIND_META,
} from "../lib/experience";
import { newId } from "../lib/id";
import {
  missingExperienceParts,
  runAgent,
  type AgentDraft,
  type AgentExperienceDraft,
  type AgentMode,
  type AgentProfileDraft,
  type AgentReply,
} from "../ai/tasks/agent";

interface AgentPanelProps {
  profile: Profile | null;
  experiences: Experience[];
  ledger: LedgerEvent[];
  notes: Note[];
  resume: ResumeData;
  messages: AgentMessage[];
  raised?: boolean;
  onMessagesChange: (messages: AgentMessage[]) => void;
  onSaveProfile: (draft: AgentProfileDraft) => Promise<void>;
  onSaveExperience: (draft: AgentExperienceDraft) => Promise<void>;
  onAddNote: (text: string, tags?: string[]) => Promise<void>;
  onNavigate: (
    id: "today" | "experiences" | "opportunities" | "resume",
  ) => void;
}

const FIELD =
  "mt-1 min-h-11 w-full rounded-lg border border-rule bg-surface px-3 text-xs text-ink outline-none focus:border-ink/35 focus:ring-2 focus:ring-accent/25";
const BTN_PRIMARY =
  "bg-ink text-paper inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50";
const BTN_SECONDARY =
  "border-rule hover:bg-ink/[0.03] inline-flex min-h-11 items-center justify-center rounded-lg border bg-surface px-3 text-xs disabled:cursor-not-allowed disabled:opacity-50";
const BTN_GHOST =
  "inline-flex min-h-11 items-center px-2 text-xs text-ink/45 underline underline-offset-4 hover:text-ink disabled:opacity-40";

const QUICK_ACTIONS = [
  { id: "profile", label: "帮我建档" },
  { id: "experience", label: "记一条经历" },
  { id: "note", label: "记一条备注" },
  { id: "week", label: "这周做了什么" },
  { id: "readiness", label: "离实习还差什么" },
  { id: "jobs", label: "看 3 个岗位" },
] as const;

type QuickId = (typeof QUICK_ACTIONS)[number]["id"];

const MODE_LABELS: Record<AgentMode, string> = {
  auto: "自由提问",
  profile: "建档",
  experience: "记经历",
  note: "记备注",
};

const PLACEHOLDERS: Record<AgentMode, string> = {
  auto: "问记录官：这周做了什么 / 我有哪些经历 / 离实习还差什么",
  profile: "如：大二，人工智能，想找算法实习，会 Python 和 SQL",
  experience:
    "如：做了一个校园选课系统，负责数据库设计，用 MySQL 事务解决超选问题，200 人并发测试通过",
  note: "把想法或待办丢给我，我记成一条记录。",
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

function navigateLabel(id: NonNullable<AgentReply["navigate"]>): string {
  if (id === "opportunities") return "打开悬赏";
  if (id === "experiences") return "打开账本";
  if (id === "resume") return "打开简历";
  return "回到今日";
}

export default function AgentPanel({
  profile,
  experiences,
  ledger,
  notes,
  resume,
  messages,
  raised = false,
  onMessagesChange,
  onSaveProfile,
  onSaveExperience,
  onAddNote,
  onNavigate,
}: AgentPanelProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AgentMode>("auto");
  const [input, setInput] = useState("");
  const [draft, setDraft] = useState<AgentDraft | null>(null);
  const [draftVersion, setDraftVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [navigateTarget, setNavigateTarget] = useState<
    AgentReply["navigate"] | null
  >(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

  useEffect(() => {
    if (!open) return;
    const node = listRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [open, messages.length, draft, busy]);

  function appendAgent(text: string) {
    onMessagesChange([...messages, makeMessage("agent", text)].slice(-500));
  }

  function send(raw: string, forcedMode?: AgentMode) {
    const value = raw.trim();
    if (!value || busy) return;
    setError(null);
    const reply = runAgent(
      value,
      { profile, experiences, ledger, notes, resume },
      forcedMode ?? mode,
    );
    const now = new Date().toISOString();
    const nextMessages = [
      ...messages,
      {
        id: newId("agent"),
        role: "user" as const,
        text: value.slice(0, 1000),
        createdAt: now,
      },
      {
        id: newId("agent"),
        role: "agent" as const,
        text: reply.text.slice(0, 4000),
        createdAt: now,
      },
    ].slice(-500);
    onMessagesChange(nextMessages);
    if (reply.draft) {
      setDraft(reply.draft);
      setDraftVersion((value) => value + 1);
      setError(null);
    }
    setNavigateTarget(reply.navigate ?? null);
    setInput("");
    setMode("auto");
  }

  function startMode(nextMode: AgentMode) {
    setMode(nextMode);
    setError(null);
    setInput("");
    if (nextMode === "profile") {
      appendAgent(
        "用一句话告诉我：年级、专业、想往哪走。比如：大二，人工智能，想找算法实习。",
      );
    } else if (nextMode === "experience") {
      appendAgent(
        "把这件事按你记得的写下来：做了什么、怎么做的、你负责什么、结果怎样。不用分段。",
      );
    } else if (nextMode === "note") {
      appendAgent("把想法或待办丢给我，我记成一条记录，不会当作完整经历。");
    }
    window.setTimeout(() => inputRef.current?.focus(), 30);
  }

  function runQuick(id: QuickId) {
    if (id === "profile") startMode("profile");
    else if (id === "experience") startMode("experience");
    else if (id === "note") startMode("note");
    else if (id === "week") send("这周做了什么");
    else if (id === "readiness") send("离实习还差什么");
    else send("看岗位");
  }

  async function handleConfirm() {
    if (!draft || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (draft.kind === "profile") {
        await onSaveProfile(draft.data);
        appendAgent(
          `已建档：${[
            draft.data.grade || "年级未填",
            draft.data.major || "专业未填",
            GOAL_LABELS[draft.data.goal],
          ].join(" · ")}。去悬赏可以按这份档案对照岗位。`,
        );
        setNavigateTarget("opportunities");
      } else if (draft.kind === "experience") {
        const missing = missingExperienceParts(draft.data);
        if (!draft.data.title.trim()) {
          setError("标题不能为空。");
          setBusy(false);
          return;
        }
        if (missing.length === 4) {
          setError("四段至少填一段，或者改成只记一条备注。");
          setBusy(false);
          return;
        }
        await onSaveExperience(draft.data);
        appendAgent(
          `已写入账本：「${draft.data.title}」。${
            missing.length > 0
              ? `还缺 ${missing.join("、")}，可以在经历页继续补。`
              : "四段已齐，可以去悬赏看匹配。"
          }`,
        );
        setNavigateTarget("experiences");
      } else {
        await onAddNote(draft.text, ["记录官"]);
        appendAgent("已记下这条记录。");
        setNavigateTarget("today");
      }
      setDraft(null);
    } catch {
      setError("写入失败，请检查浏览器存储权限后重试。");
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
      appendAgent("已按草稿记成一条记录，没有当作完整经历。");
      setDraft(null);
      setNavigateTarget("today");
    } catch {
      setError("写入失败，请检查浏览器存储权限后重试。");
    } finally {
      setBusy(false);
    }
  }

  function handleCancel() {
    setDraft(null);
    setError(null);
    appendAgent("已取消，这次没有写入。");
  }

  function handleNavigate(id: NonNullable<AgentReply["navigate"]>) {
    onNavigate(id);
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="agent-panel"
        className={[
          "no-print bg-ink text-paper fixed right-4 z-[80] inline-flex min-h-12 items-center gap-2 rounded-full px-4 text-sm shadow-lg transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:outline-none sm:right-6",
          raised ? "bottom-24 lg:bottom-6" : "bottom-4 sm:bottom-6",
        ].join(" ")}
      >
        <span
          aria-hidden="true"
          className="border-paper/35 flex h-6 w-6 items-center justify-center rounded-full border font-serif text-[13px]"
        >
          记
        </span>
        记录官
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
            <header className="border-rule flex items-start justify-between gap-3 border-b px-4 py-3.5">
              <div className="min-w-0">
                <p className="text-accent-ink font-mono text-[9px] tracking-[0.18em]">
                  记录官 / 本地规则
                </p>
                <h2
                  id="agent-title"
                  className="mt-1 font-serif text-xl tracking-tight"
                >
                  记录官
                </h2>
                <p className="mt-1 text-[10px] leading-5 text-ink/45">
                  建档、写账、查账、解读。写入前先给你草稿；不闲聊、不编造、不联网。
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="关闭记录官"
                className="hover:bg-ink/[0.04] -mt-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg text-ink/35"
              >
                ×
              </button>
            </header>

            <div
              ref={listRef}
              className="flex-1 overflow-y-auto overscroll-contain px-4 py-4"
            >
              {messages.length === 0 ? (
                <div className="border-rule bg-paper/40 rounded-xl border p-4">
                  <p className="font-serif text-lg tracking-tight">
                    我是记录官。
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-ink/55">
                    先告诉我你在读什么、想往哪走，或者把今天推进的一件事丢给我。写入前我会先给你草稿。
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => startMode("profile")}
                      className={BTN_SECONDARY}
                    >
                      帮我建档
                    </button>
                    <button
                      type="button"
                      onClick={() => startMode("experience")}
                      className={BTN_SECONDARY}
                    >
                      记一条经历
                    </button>
                  </div>
                </div>
              ) : (
                <ul className="space-y-3">
                  {messages.slice(-40).map((message) => (
                    <MessageBubble key={message.id} message={message} />
                  ))}
                </ul>
              )}

              {draft && (
                <div className="mt-4">
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

              {navigateTarget && (
                <button
                  type="button"
                  onClick={() => handleNavigate(navigateTarget)}
                  className={`${BTN_SECONDARY} mt-3 w-full`}
                >
                  {navigateLabel(navigateTarget)} →
                </button>
              )}

              {error && !draft && (
                <p
                  role="alert"
                  className="border-amber/50 bg-amber/[0.06] mt-3 rounded-lg border-l-2 px-3 py-2 text-[11px] leading-5 text-ink/70"
                >
                  {error}
                </p>
              )}
            </div>

            <footer className="border-rule border-t px-4 py-3">
              <div className="flex flex-wrap gap-1.5">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => runQuick(action.id)}
                    className="border-rule hover:bg-ink/[0.03] inline-flex min-h-11 items-center rounded-full border bg-surface px-3 text-[10px] text-ink/55"
                  >
                    {action.label}
                  </button>
                ))}
              </div>

              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="font-mono text-[9px] text-ink/35">
                  {mode === "auto"
                    ? "自由提问"
                    : `正在${MODE_LABELS[mode]}`}
                </p>
                {mode !== "auto" && (
                  <button
                    type="button"
                    onClick={() => setMode("auto")}
                    className="text-[10px] text-ink/40 underline underline-offset-2 hover:text-ink"
                  >
                    退出当前模式
                  </button>
                )}
              </div>

              <div className="mt-1.5 flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(event) => setInput(event.target.value.slice(0, 1000))}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      send(input);
                    }
                  }}
                  rows={2}
                  placeholder={PLACEHOLDERS[mode]}
                  className="border-rule focus:border-ink/35 focus:ring-accent/25 min-h-12 flex-1 resize-none rounded-lg border bg-surface px-3 py-2 text-xs leading-5 text-ink outline-none placeholder:text-ink/25 focus:ring-2"
                />
                <button
                  type="button"
                  onClick={() => send(input)}
                  disabled={!input.trim() || busy}
                  className={BTN_PRIMARY}
                >
                  发送
                </button>
              </div>

              <p className="mt-2 text-[9px] leading-4 text-ink/30">
                记录官只处理建档、写账、查账和解读；写入前必须确认。
              </p>
            </footer>
          </section>
        </>
      )}
    </>
  );
}

function MessageBubble({ message }: { message: AgentMessage }) {
  const isUser = message.role === "user";
  return (
    <li className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div
        className={[
          "max-w-[92%] whitespace-pre-wrap",
          isUser
            ? "bg-ink text-paper rounded-2xl rounded-br-md px-3 py-2 text-[12px] leading-5"
            : "border-rule bg-paper/50 rounded-2xl rounded-bl-md border px-3 py-2 text-[12px] leading-5 text-ink/75",
        ].join(" ")}
      >
        {!isUser && (
          <p className="mb-1 font-mono text-[8px] tracking-[0.12em] text-ink/30">
            记录官
          </p>
        )}
        {message.text}
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
    <div className="border-accent/30 bg-accent/[0.04] rounded-xl border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium">档案草稿</p>
        <span className="font-mono text-[9px] text-ink/35">写入前确认</span>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className="text-[10px] text-ink/45">
          年级
          <select
            value={data.grade}
            onChange={(event) =>
              set("grade", event.target.value as AgentProfileDraft["grade"])
            }
            className={FIELD}
          >
            <option value="">未填</option>
            {RESUME_GRADES.map((grade) => (
              <option key={grade} value={grade}>
                {grade}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[10px] text-ink/45">
          专业
          <input
            value={data.major}
            onChange={(event) => set("major", event.target.value.slice(0, 60))}
            maxLength={60}
            className={FIELD}
          />
        </label>
        <label className="text-[10px] text-ink/45">
          方向
          <select
            value={data.goal}
            onChange={(event) =>
              set("goal", event.target.value as AgentProfileDraft["goal"])
            }
            className={FIELD}
          >
            {GOALS.map((goal) => (
              <option key={goal} value={goal}>
                {GOAL_LABELS[goal]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[10px] text-ink/45">
          目标岗位
          <input
            value={targetText}
            onChange={(event) => {
              setTargetText(event.target.value);
              set("targetRoles", splitList(event.target.value, 20));
            }}
            placeholder="算法工程师，数据分析师"
            className={FIELD}
          />
        </label>
      </div>

      <label className="mt-2 block text-[10px] text-ink/45">
        技能
        <input
          value={skillsText}
          onChange={(event) => {
            setSkillsText(event.target.value);
            set("skills", splitList(event.target.value, 30));
          }}
          placeholder="Python，SQL"
          className={FIELD}
        />
      </label>

      <p className="mt-2 text-[9px] leading-4 text-ink/35">
        只写年级、专业、方向和技能，不写姓名学号。
      </p>
      {error && (
        <p role="alert" className="mt-2 text-[10px] text-red-800">
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
  placeholder: string;
}[] = [
  { key: "problem", label: "问题", placeholder: "解决什么问题、原来哪里不行" },
  { key: "method", label: "方法", placeholder: "用了什么方法、工具或步骤" },
  { key: "contribution", label: "贡献", placeholder: "你负责哪一部分" },
  { key: "result", label: "结果", placeholder: "产生了什么可验证的结果" },
];

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
  const [skillsText, setSkillsText] = useState(data.skills.join("，"));

  function set<K extends keyof AgentExperienceDraft>(
    key: K,
    value: AgentExperienceDraft[K],
  ) {
    onChange({ ...data, [key]: value });
  }

  return (
    <div className="border-accent/30 bg-accent/[0.04] rounded-xl border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium">经历草稿</p>
        <span
          className={[
            "rounded-full border px-2 py-0.5 font-mono text-[9px]",
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

      <div className="mt-3 grid gap-2">
        <label className="text-[10px] text-ink/45">
          标题
          <input
            value={data.title}
            onChange={(event) => set("title", event.target.value.slice(0, 120))}
            maxLength={120}
            className={FIELD}
          />
        </label>
        <label className="text-[10px] text-ink/45">
          类型
          <select
            value={data.kind}
            onChange={(event) =>
              set("kind", event.target.value as ExperienceKind)
            }
            className={FIELD}
          >
            {EXPERIENCE_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {EXPERIENCE_KIND_META[kind].label}
              </option>
            ))}
          </select>
        </label>

        {EXPERIENCE_PARTS.map((part) => (
          <label key={part.key} className="text-[10px] text-ink/45">
            {part.label}
            <textarea
              value={data[part.key]}
              onChange={(event) =>
                set(part.key, event.target.value.slice(0, 2000))
              }
              rows={2}
              maxLength={2000}
              placeholder={part.placeholder}
              className={`${FIELD} resize-y py-2 leading-5`}
            />
          </label>
        ))}

        <label className="text-[10px] text-ink/45">
          技能
          <input
            value={skillsText}
            onChange={(event) => {
              setSkillsText(event.target.value);
              set("skills", splitList(event.target.value, 30));
            }}
            placeholder="Python，MySQL"
            className={FIELD}
          />
        </label>
      </div>

      <p className="mt-2 text-[9px] leading-4 text-ink/35">
        确认后写入账本；四段不全会标为待确认，不会自动进简历。
      </p>
      {error && (
        <p role="alert" className="mt-2 text-[10px] text-red-800">
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
          {busy ? "正在写入…" : "确认写入账本"}
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
    <div className="border-rule bg-paper/40 rounded-xl border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium">记录草稿</p>
        <span className="font-mono text-[9px] text-ink/35">写入前确认</span>
      </div>
      <textarea
        value={text}
        onChange={(event) => onChange(event.target.value.slice(0, 1000))}
        rows={3}
        maxLength={1000}
        className={`${FIELD} resize-y py-2 leading-5`}
      />
      <p className="mt-2 text-[9px] leading-4 text-ink/35">
        确认后记进账本；不会当作完整经历。
      </p>
      {error && (
        <p role="alert" className="mt-2 text-[10px] text-red-800">
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
          {busy ? "正在写入…" : "确认记下"}
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
