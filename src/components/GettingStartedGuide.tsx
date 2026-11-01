import type { Experience, Note, Profile } from "../types";

interface GettingStartedGuideProps {
  profile: Profile | null;
  notes: Note[];
  experiences: Experience[];
  demoMode: boolean;
  sampleBusy: boolean;
  sampleError: string | null;
  opportunitiesVisited: boolean;
  onStartOnboarding: () => void;
  onWrite: () => void;
  onUseSample: () => void;
  onNavigate: (id: "experiences" | "opportunities" | "resume") => void;
  onVisitOpportunities: () => void;
}

const BTN_PRIMARY =
  "bg-ink text-paper inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50";
const BTN_SECONDARY =
  "border-rule hover:bg-ink/[0.03] inline-flex min-h-11 items-center justify-center rounded-lg border bg-surface px-4 text-sm disabled:cursor-not-allowed disabled:opacity-50";

export default function GettingStartedGuide({
  profile,
  notes,
  experiences,
  demoMode,
  sampleBusy,
  sampleError,
  opportunitiesVisited,
  onStartOnboarding,
  onWrite,
  onUseSample,
  onNavigate,
  onVisitOpportunities,
}: GettingStartedGuideProps) {
  if (demoMode) {
    return (
      <section className="border-amber/35 bg-amber/[0.05] mt-4 overflow-hidden rounded-xl border">
        <div className="px-4 py-4 sm:px-5">
          <p className="text-amber-ink font-mono text-[10px] tracking-[0.14em]">
            示例路径
          </p>
          <h2 className="mt-1 font-serif text-xl tracking-tight sm:text-2xl">
            示例档案已经准备好了
          </h2>
          <p className="mt-1 max-w-2xl text-[11px] leading-5 text-ink/55">
            先去账本看四段式，再去悬赏看匹配。要开始自己的档案，点上方「清除示例并退出」。
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onNavigate("experiences")}
              className={BTN_PRIMARY}
            >
              看账本
            </button>
            <button
              type="button"
              onClick={() => onNavigate("opportunities")}
              className={BTN_SECONDARY}
            >
              看悬赏
            </button>
          </div>
        </div>
      </section>
    );
  }

  const hasRecord = notes.length > 0 || experiences.length > 0;
  const hasExperience = experiences.length > 0;
  const step = profile === null ? 1 : !hasRecord ? 2 : 3;
  const done = hasExperience && opportunitiesVisited;
  const steps = [
    { no: 1, label: "建档", done: profile !== null },
    { no: 2, label: "记一条", done: hasRecord },
    {
      no: 3,
      label: hasExperience ? "看匹配" : "补经历",
      done: done,
    },
  ];

  if (done) {
    return (
      <section className="border-rule bg-surface mt-4 rounded-xl border px-4 py-3.5 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-accent-ink font-mono text-[10px] tracking-[0.14em]">
              开始使用 · 已完成
            </p>
            <p className="mt-1 text-sm font-medium">
              入门完成，接下来是日常循环
            </p>
            <p className="mt-0.5 text-[11px] leading-5 text-ink/50">
              每天记一条，周末去账本补证据，投递前生成简历。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onWrite} className={BTN_PRIMARY}>
              今日再记一条
            </button>
            <button
              type="button"
              onClick={() => onNavigate("experiences")}
              className={BTN_SECONDARY}
            >
              去账本
            </button>
            <button
              type="button"
              onClick={() => onNavigate("resume")}
              className={BTN_SECONDARY}
            >
              生成简历
            </button>
          </div>
        </div>
      </section>
    );
  }

  const content =
    step === 1
      ? {
          title: "先花 30 秒建档",
          description:
            "只问年级、专业和想去哪；不写姓名学号，每一步都能跳过。",
          primary: "开始建档",
          primaryAction: onStartOnboarding,
          secondary: sampleBusy ? "正在准备示例…" : "用示例体验",
          secondaryAction: onUseSample,
          secondaryDisabled: sampleBusy,
        }
      : step === 2
        ? {
            title: "写下今天推进的一件事",
            description:
              "一句话就够，会进账本；之后写简历时能回来找。",
            primary: "写一条",
            primaryAction: onWrite,
            secondary: "去账本记一条经历",
            secondaryAction: () => onNavigate("experiences"),
            secondaryDisabled: false,
          }
        : !hasExperience
          ? {
              title: "把记录补成一条经历",
              description:
                "经历要有问题、方法、贡献、结果；悬赏才能按原文匹配。",
              primary: "打开账本",
              primaryAction: () => onNavigate("experiences"),
              secondary: "先去悬赏看看",
              secondaryAction: () => onNavigate("opportunities"),
              secondaryDisabled: false,
            }
          : {
              title: "去悬赏看看你能对上哪些岗位",
              description:
                "看看命中哪几条、还缺什么；命中会指回你的经历原文。",
              primary: "打开悬赏",
              primaryAction: onVisitOpportunities,
              secondary: "去账本补证据",
              secondaryAction: () => onNavigate("experiences"),
              secondaryDisabled: false,
            };

  return (
    <section className="border-accent/25 bg-accent/[0.035] mt-4 overflow-hidden rounded-xl border">
      <div className="border-accent/20 flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5 sm:px-5">
        <p className="text-accent-ink font-mono text-[10px] tracking-[0.14em]">
          开始使用
        </p>
        <ol
          aria-label="开始使用进度"
          className="flex flex-wrap items-center gap-x-2 gap-y-1"
        >
          {steps.map((item, index) => {
            const active = item.no === step;
            return (
              <li
                key={item.no}
                aria-current={active ? "step" : undefined}
                className="flex items-center gap-1"
              >
                <span
                  aria-hidden="true"
                  className={[
                    "inline-flex h-4 w-4 items-center justify-center rounded-full border font-mono text-[8px]",
                    item.done
                      ? "border-accent bg-accent text-paper"
                      : active
                        ? "border-accent text-accent-ink"
                        : "border-rule text-ink/30",
                  ].join(" ")}
                >
                  {item.done ? "✓" : item.no}
                </span>
                <span
                  className={[
                    "font-mono text-[9px]",
                    active ? "text-ink/65" : "text-ink/35",
                  ].join(" ")}
                >
                  {item.label}
                </span>
                {index < steps.length - 1 && (
                  <span aria-hidden="true" className="mx-0.5 text-ink/20">
                    —
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      <div className="px-4 py-4 sm:px-5">
        <h2 className="font-serif text-xl tracking-tight sm:text-2xl">
          {content.title}
        </h2>
        <p className="mt-1 max-w-2xl text-[11px] leading-5 text-ink/55">
          {content.description}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={content.primaryAction}
            className={BTN_PRIMARY}
          >
            {content.primary}
          </button>
          <button
            type="button"
            onClick={content.secondaryAction}
            disabled={content.secondaryDisabled}
            className={BTN_SECONDARY}
          >
            {content.secondary}
          </button>
        </div>
        {sampleError && (
          <p role="alert" className="mt-2 text-[11px] leading-5 text-red-800">
            {sampleError}
          </p>
        )}
      </div>
    </section>
  );
}
