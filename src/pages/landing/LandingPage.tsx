import { useState } from "react";

const MODULES = [
  { no: "01", name: "今日", hint: "今天上什么、交什么" },
  { no: "02", name: "课表", hint: "单双周、节次、教室" },
  { no: "03", name: "作业", hint: "截止时间与完成状态" },
  { no: "04", name: "经历", hint: "课程设计、比赛、实习" },
  { no: "05", name: "简历", hint: "勾选经历，导出 A4" },
  { no: "06", name: "机会", hint: "按经历找实习" },
];

interface LandingPageProps {
  onStart: () => Promise<void>;
}

export default function LandingPage({ onStart }: LandingPageProps) {
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");

  async function handleStart() {
    setState("loading");
    try {
      await onStart();
      setState("idle");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-rule">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-6 sm:px-8">
          <div className="flex shrink-0 items-baseline gap-3 whitespace-nowrap">
            <span className="font-serif text-xl tracking-[0.02em]">学径</span>
            <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink/45">
              StudyTrack
            </span>
          </div>
          <span className="hidden font-mono text-[11px] tracking-[0.18em] text-ink/40 sm:inline">
            本科四年 · 一份档案
          </span>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto w-full max-w-5xl px-6 sm:px-8">
          <section className="grid grid-cols-1 gap-14 border-b border-rule pt-16 pb-16 sm:pt-24 sm:pb-24 lg:grid-cols-[minmax(0,1fr)_224px] lg:gap-14">
            <div>
              <p className="flex items-center gap-3 font-mono text-[11px] tracking-[0.2em] text-ink/55">
                <span aria-hidden="true" className="h-[3px] w-7 bg-amber" />
                学习与经历聚合工作台
              </p>

              <h1 className="mt-8 font-serif text-[clamp(1.85rem,6.6vw,4rem)] leading-[1.22] tracking-[0.01em]">
                <span className="block">你在大学做的每件事，</span>
                <span className="block">都该留下证据。</span>
              </h1>

              <p className="mt-7 max-w-md text-[17px] leading-[1.85] text-ink/65">
                管课表、记作业、存经历、随时出简历。
              </p>

              <button
                type="button"
                onClick={() => void handleStart()}
                disabled={state === "loading"}
                className="mt-9 inline-flex min-h-11 items-center gap-3 rounded-xl bg-ink px-7 text-[15px] font-medium text-paper transition-colors duration-150 hover:bg-[#223452] focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2 focus-visible:ring-offset-paper focus-visible:outline-none active:bg-[#101a2c] disabled:opacity-70"
              >
                {state === "loading" ? "正在准备示例课表…" : "用示例体验"}
                <span aria-hidden="true" className="font-mono text-sm">
                  →
                </span>
              </button>

              <p
                role="status"
                aria-live="polite"
                className="mt-4 min-h-6 font-mono text-[11px] leading-6 tracking-[0.06em] text-ink/40"
              >
                {state === "error" ? (
                  <span className="text-amber">
                    本机存储不可用，请检查浏览器隐私设置后重试。
                  </span>
                ) : (
                  "无需注册 · 无需联网 · 不采集个人信息"
                )}
              </p>
            </div>

            <aside className="hidden lg:block">
              <div className="border-t border-rule pt-4">
                <p className="font-mono text-[10px] tracking-[0.2em] text-ink/40">
                  模块 · 并列，不是向导
                </p>
                <ol className="mt-5">
                  {MODULES.map((m) => (
                    <li
                      key={m.no}
                      className="flex items-baseline gap-4 border-b border-rule py-3"
                    >
                      <span className="font-mono text-[11px] tabular-nums text-ink/35">
                        {m.no}
                      </span>
                      <span className="text-sm text-ink/80">{m.name}</span>
                      <span className="ml-auto text-right text-[11px] leading-4 text-ink/40">
                        {m.hint}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </aside>
          </section>
        </div>
      </main>

      <footer className="border-t border-rule">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-6 pt-6 pb-16 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p className="font-mono text-[11px] tracking-[0.14em] text-ink/40">
            学径 StudyTrack · 2026
          </p>
          <p className="flex items-center gap-2 text-[12px] text-ink/55">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full bg-amber"
            />
            数据只存在你的浏览器
          </p>
        </div>
      </footer>
    </div>
  );
}
