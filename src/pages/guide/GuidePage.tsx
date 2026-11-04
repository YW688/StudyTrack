import { useMemo, useState, type FormEvent, type KeyboardEvent } from "react";
import {
  EXPERIENCE_KINDS,
  EXPERIENCE_KIND_META,
} from "../../lib/experience";
import type { ExperienceKind, Goal, Grade } from "../../types";
import { GOALS, GOAL_LABELS, RESUME_GRADES } from "../../types";

export interface GuideValues {
  grade: Grade;
  major: string;
  goal: Goal;
  targetRoles: string[];
  firstRecord: {
    kind: ExperienceKind;
    kindLabel?: string;
    title: string;
    detail: string;
  };
}

interface GuidePageProps {
  onComplete: (values: GuideValues) => Promise<void>;
  onUseDemo: () => Promise<void>;
}

const STEPS = [
  "你在读什么",
  "这四年往哪走",
  "想投哪些岗位",
  "第一条战绩",
] as const;

const ROLE_SUGGESTIONS: Record<Goal, string[]> = {
  intern: ["前端开发", "后端开发", "数据分析", "产品经理", "UI 设计", "内容运营"],
  postgrad: ["算法研究", "系统开发", "数据分析", "科研助理", "嵌入式开发"],
  abroad: ["数据分析", "算法研究", "产品经理", "用户体验研究"],
  civil: ["行政综合", "数据分析", "宣传文案"],
  undecided: ["前端开发", "数据分析", "产品经理", "运营", "设计"],
};

const BTN_PRIMARY =
  "app-pill-primary inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full px-5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40";
const BTN_SECONDARY =
  "app-pill inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm";
const BTN_BACK =
  "inline-flex min-h-11 items-center rounded-full px-4 text-[11px] text-ink-3 underline underline-offset-4 hover:text-ink";
const FIELD =
  "border-rule focus:border-accent/60 focus:ring-accent/25 mt-2 min-h-11 w-full rounded-lg border bg-paper/40 px-3 text-sm outline-none placeholder:text-ink-4 focus:ring-2";
const CHIP =
  "manor-chip inline-flex min-h-11 items-center rounded-lg border px-4 text-xs transition-colors";

export default function GuidePage({ onComplete, onUseDemo }: GuidePageProps) {
  const [step, setStep] = useState(0);
  const [major, setMajor] = useState("");
  const [grade, setGrade] = useState<Grade | "">("");
  const [goal, setGoal] = useState<Goal | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [roleDraft, setRoleDraft] = useState("");
  const [kind, setKind] = useState<ExperienceKind>("course");
  const [kindLabel, setKindLabel] = useState("");
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoBusy, setDemoBusy] = useState(false);

  const roleOptional = goal !== null && goal !== "intern";
  const stepLabels = roleOptional
    ? [STEPS[0], STEPS[1], "就业备选", STEPS[3]]
    : [...STEPS];

  const missing = useMemo(() => {
    if (step === 0) {
      return [
        ...(major.trim() ? [] : ["专业"]),
        ...(grade ? [] : ["年级"]),
      ];
    }
    if (step === 1) return goal ? [] : ["方向"];
    if (step === 2) {
      if (!goal) return [];
      return roleOptional || roles.length > 0 ? [] : ["至少 1 个目标岗位"];
    }
    return [
      ...(title.trim() ? [] : ["战绩标题"]),
      ...(detail.trim() ? [] : ["一句话说明"]),
    ];
  }, [step, major, grade, goal, roles, title, detail]);

  const isLastStep = step === STEPS.length - 1;

  function toggleRole(role: string) {
    setError(null);
    setRoles((prev) =>
      prev.includes(role)
        ? prev.filter((item) => item !== role)
        : [...prev, role].slice(0, 6),
    );
  }

  function addDraftRole(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const value = roleDraft.trim().slice(0, 40);
    if (!value || roles.includes(value)) {
      setRoleDraft("");
      return;
    }
    setRoles((prev) => [...prev, value].slice(0, 6));
    setRoleDraft("");
  }

  function next(event?: FormEvent) {
    event?.preventDefault();
    setError(null);
    if (missing.length > 0) return;
    if (!isLastStep) {
      setStep(step + 1);
      window.scrollTo({ top: 0 });
      return;
    }
    void submit();
  }

  async function submit() {
    if (!grade || !goal) return;
    setSaving(true);
    setError(null);
    try {
      await onComplete({
        grade,
        major: major.trim(),
        goal,
        targetRoles: roles,
        firstRecord: {
          kind,
          kindLabel: kind === "other" ? kindLabel.trim() : undefined,
          title: title.trim(),
          detail: detail.trim(),
        },
      });
    } catch {
      setError("没写进本机 请检查浏览器存储权限后重试");
      setSaving(false);
    }
  }

  async function handleDemo() {
    setDemoBusy(true);
    setError(null);
    try {
      await onUseDemo();
    } catch {
      setError("示例数据写入失败 请检查浏览器存储权限后重试");
    } finally {
      setDemoBusy(false);
    }
  }

  return (
    <div className="px-4 pt-5 pb-12 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-3xl">
        <header className="page-head">
          <div className="page-head-main">
            <h1 className="page-title">建档</h1>
            <p className="page-sub">
              第 {step + 1} / {STEPS.length} 步 填完这四步 四个面同时开启
            </p>
          </div>
        </header>

        <section aria-label="建档进度" className="mt-4 grid grid-cols-4 gap-1.5">
          {stepLabels.map((label, index) => (
            <div key={label}>
              <span
                className={[
                  "block h-0.5 rounded-full",
                  index < step
                    ? "bg-accent"
                    : index === step
                      ? "bg-ink"
                      : "bg-ink/10",
                ].join(" ")}
              />
              <p
                className={[
                  "mt-1.5 font-mono text-micro leading-4",
                  index === step
                    ? "text-ink"
                    : index < step
                      ? "text-accent-ink"
                      : "text-ink-4",
                ].join(" ")}
              >
                {String(index + 1).padStart(2, "0")} {label}
              </p>
            </div>
          ))}
        </section>

        <form
          onSubmit={next}
          aria-label={stepLabels[step]}
          className="app-card mt-4 overflow-hidden"
        >
          <div className="border-rule border-b px-5 py-4 sm:px-6">
            <p className="font-mono text-micro tracking-[0.18em] text-accent-ink">
              建档引导 第 {step + 1} 步
            </p>
            <h2 className="mt-1.5 font-serif text-xl tracking-tight sm:text-2xl">
              {step === 0 && "你在读什么？"}
              {step === 1 && "这四年更想往哪走？"}
              {step === 2 &&
                (goal === "intern" ? "想投哪些岗位？" : "要不要留一条就业后路？")}
              {step === 3 && "先记下第一条战绩"}
            </h2>
            <p className="mt-1 text-[11px] leading-5 text-ink-3">
              {step === 0 &&
                "只用来筛情报和排学期 不写姓名学号 之后随时能改"}
              {step === 1 && "决定征召怎么给你参考 之后可以改"}
              {step === 2 &&
                (goal && goal !== "intern"
                  ? goal === "undecided"
                    ? "还没定就慢慢来 岗位可留空 之后在档案里补"
                    : `主方向是${GOAL_LABELS[goal]} 征召只作为备选 岗位可留空`
                  : "最多 6 个 简历与匹配都以它为锚")}
              {step === 3 &&
                "这条会作为动态出现在征途 四段式和证据可以之后补"}
            </p>
          </div>

          <div className="space-y-5 px-5 py-5 sm:px-6">
            {step === 0 && (
              <>
                <div>
                  <label htmlFor="guide-major" className="text-sm font-medium">
                    专业
                  </label>
                  <input
                    id="guide-major"
                    value={major}
                    autoFocus
                    onChange={(event) =>
                      setMajor(event.target.value.slice(0, 60))
                    }
                    placeholder="如 人工智能"
                    className={`${FIELD} max-w-md`}
                  />
                </div>
                <fieldset>
                  <legend className="text-sm font-medium">年级</legend>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {RESUME_GRADES.map((item) => {
                      const selected = grade === item;
                      return (
                        <button
                          key={item}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => setGrade(selected ? "" : item)}
                          className={[
                            CHIP,
                            selected
                              ? "border-accent/50 bg-accent/10 text-ink"
                              : "border-rule text-ink-3 hover:bg-ink/[0.03]",
                          ].join(" ")}
                        >
                          {item}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              </>
            )}

            {step === 1 && (
              <fieldset>
                <legend className="sr-only">这四年更想往哪走</legend>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {GOALS.map((item) => {
                    const selected = goal === item;
                    return (
                      <button
                        key={item}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => {
                          setGoal(item);
                          setError(null);
                        }}
                        className={[
                          "manor-chip flex min-h-11 items-center justify-between gap-3 rounded-lg border px-4 text-left text-xs transition-colors",
                          selected
                            ? "border-accent/50 bg-accent/10 text-ink"
                            : "border-rule text-ink-3 hover:bg-ink/[0.03]",
                        ].join(" ")}
                      >
                        {GOAL_LABELS[item]}
                        <span
                          aria-hidden="true"
                          className={[
                            "h-2 w-2 rounded-full border",
                            selected ? "border-accent bg-accent" : "border-ink/20",
                          ].join(" ")}
                        />
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            )}

            {step === 2 && goal && (
              <div>
                <p className="text-sm font-medium">
                  {goal === "intern" ? "常见岗位" : "常见就业方向"}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {ROLE_SUGGESTIONS[goal].map((item) => {
                    const selected = roles.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => toggleRole(item)}
                        className={[
                          CHIP,
                          selected
                            ? "border-accent/50 bg-accent/10 text-ink"
                            : "border-rule text-ink-3 hover:bg-ink/[0.03]",
                        ].join(" ")}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>

                <label
                  htmlFor="guide-role"
                  className="mt-5 block text-sm font-medium"
                >
                  自己写一个
                </label>
                <input
                  id="guide-role"
                  value={roleDraft}
                  onChange={(event) => setRoleDraft(event.target.value)}
                  onKeyDown={addDraftRole}
                  placeholder="如 嵌入式软件实习 回车添加"
                  className={FIELD}
                />

                <p className="mt-3 font-mono text-micro text-ink-4">
                  {roles.length > 0
                    ? `已选 ${roles.length} / 6 ${roles.join(" ")}`
                    : goal === "intern"
                      ? "还没选 至少 1 个才能开启四个面"
                      : "可留空 之后在档案里补"}
                </p>
              </div>
            )}

            {step === 3 && (
              <>
                <fieldset>
                  <legend className="text-sm font-medium">类型</legend>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {EXPERIENCE_KINDS.map((item) => {
                      const selected = kind === item;
                      return (
                        <button
                          key={item}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => setKind(item)}
                          className={[
                            CHIP,
                            selected
                              ? "border-accent/50 bg-accent/10 text-ink"
                              : "border-rule text-ink-3 hover:bg-ink/[0.03]",
                          ].join(" ")}
                        >
                          {EXPERIENCE_KIND_META[item].label}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                {kind === "other" && (
                  <div>
                    <label
                      htmlFor="guide-kind-label"
                      className="text-sm font-medium"
                    >
                      类型名称
                    </label>
                    <input
                      id="guide-kind-label"
                      value={kindLabel}
                      onChange={(event) => setKindLabel(event.target.value)}
                      placeholder="如 社团 辅修 交换"
                      className={`${FIELD} max-w-md`}
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="guide-title" className="text-sm font-medium">
                    战绩标题
                  </label>
                  <input
                    id="guide-title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="如 数据库课程设计 选课事务"
                    className={FIELD}
                  />
                </div>

                <div>
                  <label htmlFor="guide-detail" className="text-sm font-medium">
                    一句话说明
                  </label>
                  <textarea
                    id="guide-detail"
                    value={detail}
                    rows={3}
                    onChange={(event) => setDetail(event.target.value.slice(0, 500))}
                    placeholder="如 解决选课并发冲突 用 Spring Boot + MySQL 跑通了下单与回滚"
                    className="border-rule focus:border-accent/60 focus:ring-accent/25 mt-2 min-h-[92px] w-full resize-y rounded-lg border bg-paper/40 px-3 py-2.5 text-sm leading-6 outline-none placeholder:text-ink-4 focus:ring-2"
                  />
                  <p className="mt-1 font-mono text-micro text-ink-4">
                    {detail.length} / 500
                  </p>
                </div>
              </>
            )}

            {error && (
              <p role="alert" className="text-[11px] leading-5 text-red-800">
                {error}
              </p>
            )}
          </div>

          <div className="border-rule flex flex-wrap items-center justify-between gap-2 border-t px-5 py-3 sm:px-6">
            <div className="flex items-center gap-2">
              {step > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setStep(step - 1);
                    setError(null);
                  }}
                  className={BTN_BACK}
                >
                  上一步
                </button>
              )}
              {missing.length > 0 && (
                <span className="font-mono text-micro text-amber-ink">
                  还差 {missing.join(" ")}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!isLastStep && (
                <button
                  type="button"
                  onClick={() => void handleDemo()}
                  disabled={demoBusy || saving}
                  className={BTN_SECONDARY}
                >
                  {demoBusy ? "正在准备示例…" : "先看示例"}
                </button>
              )}
              <button
                type="submit"
                disabled={saving || missing.length > 0}
                className={BTN_PRIMARY}
              >
                {saving
                  ? "正在开启…"
                  : isLastStep
                    ? "完成建档，开启四个面"
                    : "下一步"}
              </button>
            </div>
          </div>
        </form>

        <p className="mt-3 font-mono text-micro leading-5 text-ink-4">
          不写姓名学号 数据只存在你的浏览器 建档后可随时改方向与岗位
        </p>
      </div>
    </div>
  );
}
