import { useState } from "react";
import {
  GOALS,
  GOAL_LABELS,
  RESUME_GRADES,
  type Goal,
  type Grade,
} from "../types";

export interface OnboardingValues {
  grade?: Grade;
  major: string;
  goal: Goal;
}

interface TodayOnboardingProps {
  onComplete: (
    values: OnboardingValues,
    recentWork: string,
  ) => Promise<void>;
  onDismiss: () => void;
}

const STEPS = ["专业与年级", "方向", "最近在做什么"];

export default function TodayOnboarding({
  onComplete,
  onDismiss,
}: TodayOnboardingProps) {
  const [step, setStep] = useState(0);
  const [grade, setGrade] = useState<Grade | "">("");
  const [major, setMajor] = useState("");
  const [goal, setGoal] = useState<Goal>("undecided");
  const [recent, setRecent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function next() {
    setError(null);
    if (step < 2) {
      setStep(step + 1);
      return;
    }
    void submit();
  }

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      await onComplete(
        { grade: grade || undefined, major, goal },
        recent,
      );
    } catch {
      setError("建档没写进本机，请检查浏览器存储权限后重试。");
      setSaving(false);
    }
  }

  return (
    <section
      aria-label="三步建档"
      className="border-rule bg-surface mt-4 overflow-hidden rounded-xl border"
    >
      <div className="border-rule border-b px-5 py-4 sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-micro tracking-[0.18em] text-accent-ink">
              建档 · {String(step + 1).padStart(2, "0")} / 03
            </p>
            <h2 className="mt-1.5 font-serif text-xl tracking-tight sm:text-2xl">
              只问三件事，随时能跳过。
            </h2>
            <p className="mt-1 text-[11px] leading-5 text-ink-3">
              只用来筛情报和找方向，不写姓名学号；每一步都能跳过。
            </p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="暂时不建档"
            className="hover:bg-ink/[0.04] -mt-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg text-ink-4"
          >
            ×
          </button>
        </div>

        <ol className="mt-4 flex gap-1.5" aria-label="建档进度">
          {STEPS.map((label, index) => (
            <li key={label} className="flex-1">
              <span
                className={[
                  "block h-0.5 rounded-full",
                  index <= step ? "bg-accent" : "bg-ink/10",
                ].join(" ")}
              />
              <span
                className={[
                  "mt-1 block font-mono text-micro",
                  index === step ? "text-ink-3" : "text-ink-4",
                ].join(" ")}
              >
                {label}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className="px-5 py-5 sm:px-6">
        {step === 0 && (
          <div>
            <label
              htmlFor="onboard-major"
              className="text-sm font-medium"
            >
              你在读什么专业？
            </label>
            <input
              id="onboard-major"
              value={major}
              onChange={(event) => setMajor(event.target.value.slice(0, 60))}
              placeholder="如：人工智能"
              className="border-rule focus:border-accent/60 focus:ring-accent/15 mt-2 min-h-11 w-full max-w-md rounded-lg border bg-paper/40 px-3 text-sm outline-none placeholder:text-ink-4 focus:ring-2"
            />
            <p className="mt-1 text-micro leading-5 text-ink-4">
              不知道写什么也可以空着，之后随时能改。
            </p>

            <fieldset className="mt-5">
              <legend className="text-sm font-medium">现在是哪一年？</legend>
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
                        "inline-flex min-h-11 items-center rounded-lg border px-4 text-xs transition-colors",
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
          </div>
        )}

        {step === 1 && (
          <fieldset>
            <legend className="text-sm font-medium">
              这四年更想往哪走？
            </legend>
            <p className="mt-1 text-micro leading-5 text-ink-4">
              只影响情报筛选和之后的匹配，不决定任何事。
            </p>
            <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
              {GOALS.map((item) => {
                const selected = goal === item;
                return (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setGoal(item)}
                    className={[
                      "flex min-h-11 items-center justify-between gap-3 rounded-lg border px-4 text-left text-xs transition-colors",
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
                        selected
                          ? "border-accent bg-accent"
                          : "border-ink/20",
                      ].join(" ")}
                    />
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        {step === 2 && (
          <div>
            <label
              htmlFor="onboard-recent"
              className="text-sm font-medium"
            >
              最近在做什么？
            </label>
            <p className="mt-1 text-micro leading-5 text-ink-4">
              一节课、一个项目、一件正在推进的事都行。会作为第一条记录进入账本。
            </p>
            <textarea
              id="onboard-recent"
              value={recent}
              onChange={(event) => setRecent(event.target.value.slice(0, 500))}
              rows={3}
              placeholder="如：在做数据库课程设计，刚把选课事务跑通。"
              className="border-rule focus:border-accent/60 focus:ring-accent/15 mt-2 min-h-[92px] w-full resize-y rounded-lg border bg-paper/40 px-3 py-2.5 text-sm leading-6 outline-none placeholder:text-ink-4 focus:ring-2"
            />
            <p className="mt-2 font-mono text-micro text-ink-4">
              {[major || "专业未填", grade || "年级未填", GOAL_LABELS[goal]].join(
                " · ",
              )}
            </p>
          </div>
        )}

        {error && (
          <p role="alert" className="mt-3 text-[11px] leading-5 text-red-800">
            {error}
          </p>
        )}
      </div>

      <div className="border-rule flex flex-wrap items-center justify-between gap-2 border-t px-5 py-3 sm:px-6">
        <button
          type="button"
          onClick={step === 2 ? onDismiss : next}
          className="inline-flex min-h-11 items-center text-[11px] text-ink-3 underline underline-offset-4 hover:text-ink"
        >
          {step === 2 ? "先不建档" : "跳过这步"}
        </button>
        <button
          type="button"
          onClick={() => void next()}
          disabled={saving}
          className="bg-ink text-paper inline-flex min-h-11 items-center justify-center rounded-lg px-5 text-sm font-medium disabled:opacity-50"
        >
          {saving ? "正在建档…" : step === 2 ? "建档并留痕" : "下一步"}
        </button>
      </div>
    </section>
  );
}
