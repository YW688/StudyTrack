import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

type StartState = "idle" | "loading" | "error";

interface Module {
  char: string;
  name: string;
  hint: string;
  tint: string;
  deep: string;
  preview: ReactNode;
}

const FAN_POSITIONS = [
  { ty: 58, rot: -13, z: 1 },
  { ty: 22, rot: -8, z: 2 },
  { ty: 0, rot: -3, z: 3 },
  { ty: 0, rot: 3, z: 3 },
  { ty: 22, rot: 8, z: 2 },
  { ty: 58, rot: 13, z: 1 },
];

const MODULES: Module[] = [
  {
    char: "今",
    name: "今日",
    hint: "今天上什么、交什么",
    tint: "#E7EDF6",
    deep: "#1C3355",
    preview: <TodayPreview />,
  },
  {
    char: "课",
    name: "课表",
    hint: "单双周、节次、教室",
    tint: "#E8EFE8",
    deep: "#2F4A36",
    preview: <TimetablePreview />,
  },
  {
    char: "作",
    name: "作业",
    hint: "截止时间与完成状态",
    tint: "#F5EAE3",
    deep: "#5A3A2B",
    preview: <AssignmentPreview />,
  },
  {
    char: "经",
    name: "经历",
    hint: "课程设计、比赛、实习",
    tint: "#EEE9F1",
    deep: "#46324F",
    preview: <ExperiencePreview />,
  },
  {
    char: "简",
    name: "简历",
    hint: "勾选经历，导出 A4",
    tint: "#F3EEE2",
    deep: "#4F4128",
    preview: <ResumePreview />,
  },
  {
    char: "机",
    name: "机会",
    hint: "按经历找实习",
    tint: "#E9EAEC",
    deep: "#333B45",
    preview: <MatchPreview />,
  },
];

const STAGES = [
  {
    year: "大一",
    title: "先不漏",
    artifact: "课表.xlsx → 周视图",
    body: "把课表和作业放进来，知道每天上什么、交什么。截止时间按 24 小时、72 小时分级，红色只留给真正紧急的事。",
    preview: <WeekArtifact />,
  },
  {
    year: "大二",
    title: "开始攒",
    artifact: "课程设计 → 经历卡",
    body: "比赛、科研、志愿、实习都能记。四段式写清问题、方法、贡献、结果；没有真实数字就留空，不编。",
    preview: <ExperienceArtifact />,
  },
  {
    year: "大三",
    title: "拿出证据",
    artifact: "经历 → A4 一页",
    body: "勾选经历自动排版。低置信内容标黄，确认后才进简历；版本存快照，投不同岗位不用重写。",
    preview: <ResumeArtifact />,
  },
  {
    year: "大四",
    title: "找对机会",
    artifact: "JD → 命中与缺口",
    body: "按技能、年级、城市检索岗位库，每条命中都指回经历原文；缺口写成下一学期的计划。",
    preview: <MatchArtifact />,
  },
];

interface LandingPageProps {
  onStart: () => Promise<void>;
}

export default function LandingPage({ onStart }: LandingPageProps) {
  const [state, setState] = useState<StartState>("idle");

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
    <div className="bg-paper text-ink">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-paper focus:px-4 focus:py-2 focus:text-[13px] focus:text-ink"
      >
        跳到主要内容
      </a>

      <main id="main">
        <section className="landing-hero relative flex min-h-dvh flex-col overflow-hidden px-4 text-paper sm:px-8">
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 hidden h-full w-full lg:block"
            viewBox="0 0 1440 900"
            preserveAspectRatio="xMidYMid slice"
            fill="none"
          >
            <path
              className="landing-path"
              d="M96 906C188 812 286 826 366 746C462 650 508 632 602 654C712 680 742 574 792 496C838 424 872 390 860 328"
              stroke="#FAFAF8"
              strokeOpacity="0.14"
              strokeWidth="1"
              strokeDasharray="2 9"
              vectorEffect="non-scaling-stroke"
            />
            <circle cx="366" cy="746" r="2.5" fill="#FAFAF8" fillOpacity="0.22" />
            <circle cx="602" cy="654" r="2.5" fill="#FAFAF8" fillOpacity="0.22" />
            <circle cx="792" cy="496" r="2.5" fill="#FAFAF8" fillOpacity="0.22" />
          </svg>

          <p
            aria-hidden="true"
            className="landing-couplet absolute top-1/2 left-8 hidden -translate-y-1/2 font-serif text-[14px] leading-[2.1] tracking-[0.42em] text-paper/50 min-[700px]:block"
          >
            书山有路勤为径
          </p>
          <p
            aria-hidden="true"
            className="landing-couplet absolute top-1/2 right-8 hidden -translate-y-1/2 font-serif text-[14px] leading-[2.1] tracking-[0.42em] text-paper/50 min-[700px]:block"
          >
            学海无涯苦作舟
          </p>

          <header className="relative z-20 mx-auto flex h-16 w-full max-w-[1120px] items-center justify-between sm:h-20">
            <div className="flex items-baseline gap-2.5">
              <span className="font-serif text-[21px] tracking-[0.04em]">学径</span>
              <span className="text-[12px] tracking-[0.12em] text-paper/55">
                StudyTrack
              </span>
            </div>
            <nav aria-label="页面导航" className="flex items-center gap-1">
              <a
                href="#path"
                className="hidden min-h-11 items-center rounded-lg px-3 text-[13px] text-paper/60 transition-colors hover:text-paper focus-visible:ring-2 focus-visible:ring-paper/70 focus-visible:outline-none sm:inline-flex"
              >
                四年一条径
              </a>
              <a
                href="#privacy"
                className="hidden min-h-11 items-center rounded-lg px-3 text-[13px] text-paper/60 transition-colors hover:text-paper focus-visible:ring-2 focus-visible:ring-paper/70 focus-visible:outline-none sm:inline-flex"
              >
                数据说明
              </a>
              <StartButton
                state={state}
                size="sm"
                onClick={() => void handleStart()}
              />
            </nav>
          </header>

          <div className="relative z-10 mx-auto flex w-full max-w-[1120px] flex-1 flex-col">
            <div className="flex flex-1 flex-col items-center justify-center py-6 text-center">
              <h1 className="font-serif text-[clamp(2.85rem,10vw,9rem)] leading-[1.12] tracking-[0.015em]">
                <span className="block overflow-hidden py-[0.05em]">
                  <span className="landing-line block">把大学四年，</span>
                </span>
                <span className="block overflow-hidden py-[0.05em]">
                  <span className="landing-line block [animation-delay:130ms]">
                    走成一条径。
                  </span>
                </span>
              </h1>

              <p className="landing-enter mt-6 max-w-[34rem] whitespace-pre-line text-[18px] leading-[1.9] text-paper/70 [animation-delay:260ms]">
                {"课表、作业、经历、简历、机会。\n给本科生的学习与经历工作台，一处记录，四年可用。"}
              </p>

              <div className="landing-enter mt-8 [animation-delay:340ms]">
                <StartButton
                  state={state}
                  size="lg"
                  onClick={() => void handleStart()}
                />
              </div>

              <p
                aria-live="polite"
                className="landing-enter mt-3 min-h-5 text-[13px] leading-5 text-paper/60 [animation-delay:420ms]"
              >
                {state === "error" ? (
                  <span className="text-[#F0B37A]">
                    本机存储不可用，请检查浏览器隐私设置后重试。
                  </span>
                ) : state === "loading" ? (
                  "正在准备示例数据…"
                ) : (
                  "无需注册 · 数据只存本机 · 下方为示例预览"
                )}
              </p>
            </div>

            <div className="mt-auto pb-10 lg:pb-0">
              <ul className="fan" data-ui aria-label="六个模块的示例预览">
                {MODULES.map((module, index) => (
                  <ModuleCard key={module.name} module={module} index={index} />
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section id="path" className="bg-paper px-4 py-24 sm:px-8 lg:py-32">
          <div className="mx-auto grid w-full max-w-[1120px] gap-16 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] lg:gap-16">
            <div className="lg:sticky lg:top-16 lg:self-start">
              <Reveal>
                <h2 className="font-serif text-[clamp(2rem,4.4vw,3.5rem)] leading-[1.2] tracking-[0.01em]">
                  一条径，
                  <br />
                  四个年级
                </h2>
              </Reveal>
              <Reveal delay={80}>
                <p className="mt-5 max-w-[30rem] text-[16px] leading-8 text-ink/65">
                  不用等到大四才整理。每一次课程设计、比赛、实习，做完就记一条；到需要简历的那天，你已经有材料了。
                </p>
              </Reveal>
              <Reveal delay={160}>
                <blockquote className="mt-14 max-w-[24rem] border-l-[3px] border-amber pl-5">
                  <p className="font-serif text-[clamp(1.35rem,2.2vw,1.75rem)] leading-[1.7]">
                    书山有路勤为径，
                    <br />
                    学海无涯记作舟。
                  </p>
                  <footer className="mt-3 text-[13px] text-ink/65">
                    改自《增广贤文》
                  </footer>
                </blockquote>
              </Reveal>
              <Reveal delay={220}>
                <p className="mt-12 max-w-[24rem] text-[16px] leading-8 text-ink/60">
                  「径」不是捷径。把每天上的课、交的作业、做过的项目，收在同一条路上；回头看得到，往前走得动。
                </p>
              </Reveal>
            </div>

            <ol className="flex flex-col gap-12 lg:gap-10">
              {STAGES.map((stage, index) => (
                <li key={stage.year}>
                  <Reveal delay={index * 80}>
                    <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_300px] xl:items-start xl:gap-7">
                      <div>
                        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                          <span className="inline-flex h-9 w-14 -rotate-1 items-center justify-center rounded-[4px] bg-[#F0E3CC] font-serif text-[13px] text-amber-ink">
                            {stage.year}
                          </span>
                          <h3 className="font-serif text-[clamp(1.6rem,2.8vw,2rem)] leading-[1.2]">
                            {stage.title}
                          </h3>
                        </div>
                        <p className="mt-4 max-w-[26rem] text-[16px] leading-8 text-ink/65 xl:max-w-none">
                          {stage.body}
                        </p>
                      </div>
                      <ArtifactFrame label={stage.artifact}>
                        {stage.preview}
                      </ArtifactFrame>
                    </div>
                  </Reveal>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="bg-ink px-4 pt-24 pb-20 text-paper sm:px-8 lg:pt-32">
          <div className="mx-auto w-full max-w-[1120px]">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div>
                <Reveal>
                  <h2 className="font-serif text-[clamp(2.2rem,5vw,3.5rem)] leading-[1.16]">
                    从今天的课表开始。
                  </h2>
                </Reveal>
                <Reveal delay={80}>
                  <p className="mt-5 max-w-md text-[16px] leading-8 text-paper/65">
                    先看示例，再换成你自己的。所有数据只存在这台设备上，随时可以一键清除。
                  </p>
                </Reveal>
              </div>
              <Reveal delay={160}>
                <StartButton
                  state={state}
                  size="lg"
                  onClick={() => void handleStart()}
                />
              </Reveal>
            </div>
            <Reveal delay={240}>
              <p className="mt-16 max-w-[34rem] text-[13px] leading-6 text-paper/55">
                今日、课表、作业、经历、简历、机会：六个模块并列，不排队，随时切换。
              </p>
            </Reveal>
          </div>
        </section>
      </main>

      <footer id="privacy" className="bg-ink px-4 pb-16 text-paper sm:px-8">
        <div className="mx-auto w-full max-w-[1120px] border-t border-paper/15 pt-12">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-8">
              <div>
                <p className="font-serif text-[clamp(2.5rem,5vw,3.5rem)] leading-none">
                  学径
                </p>
                <p className="mt-3 text-[13px] text-paper/55">StudyTrack · 2026</p>
              </div>
              <span
                aria-hidden="true"
                className="inline-flex h-14 w-14 -rotate-3 flex-col items-center justify-center rounded-[4px] bg-amber text-[15px] leading-[1.2] text-ink"
              >
                学
                <br />
                径
              </span>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <p className="mt-10 max-w-[32rem] text-[16px] leading-8 text-paper/60">
              数据说明：学径没有账号系统。课表、作业、经历和简历都保存在浏览器的
              IndexedDB 中，不会上传到服务器。在应用侧栏点「清除本机数据」，或在浏览器设置中清除本站数据，即可全部删除。示例数据只用于演示。
            </p>
          </Reveal>

          <Reveal delay={160}>
            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 text-[13px] text-paper/55">
              <span>面向本科生 · 四年可用</span>
              <span>数据只存在你的浏览器</span>
            </div>
          </Reveal>
        </div>
      </footer>
    </div>
  );
}

function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${visible ? "is-visible" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function ModuleCard({ module, index }: { module: Module; index: number }) {
  const position = FAN_POSITIONS[index];
  return (
    <li
      data-ui
      className="fan-card"
      style={
        {
          "--ty": `${position.ty}px`,
          "--rot": `${position.rot}deg`,
          "--z": position.z,
        } as CSSProperties
      }
    >
      <div className="flex items-start gap-2.5">
        <span
          aria-hidden="true"
          className="mt-0.5 inline-flex h-7 w-7 shrink-0 -rotate-2 items-center justify-center rounded-[6px] font-serif text-[15px]"
          style={{ backgroundColor: module.tint, color: module.deep }}
        >
          {module.char}
        </span>
        <div className="min-w-0">
          <p className="font-serif text-[18px] leading-none">{module.name}</p>
          <p className="mt-1 text-[12px] leading-4 text-ink/60">{module.hint}</p>
        </div>
      </div>
      <div className="fan-detail mt-3 border-t border-ink/10 pt-2.5">
        <div aria-hidden="true">{module.preview}</div>
      </div>
    </li>
  );
}

function StartButton({
  state,
  size,
  onClick,
}: {
  state: StartState;
  size: "sm" | "lg";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={state === "loading"}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-xl bg-amber font-medium text-ink transition-[background-color,transform] duration-200 hover:-translate-y-px hover:bg-[#d18f34] focus-visible:ring-2 focus-visible:ring-paper focus-visible:ring-offset-2 focus-visible:ring-offset-ink focus-visible:outline-none active:translate-y-0 active:bg-[#bb7a24] disabled:translate-y-0 disabled:opacity-70",
        size === "lg" ? "min-h-12 px-7 text-[16px]" : "min-h-11 px-4 text-[14px]",
      ].join(" ")}
    >
      {state === "loading" ? "正在准备示例…" : "用示例体验"}
      <span aria-hidden="true" className="text-[13px]">
        →
      </span>
    </button>
  );
}

function TodayPreview() {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[9px] text-ink/45">第 8 周 · 周一</span>
        <span className="rounded-[3px] bg-amber/15 px-1 py-0.5 text-[8px] text-amber-ink">
          3 项待办
        </span>
      </div>
      <div className="mt-2 space-y-1">
        {["3-4 节", "5-6 节"].map((period) => (
          <div
            key={period}
            className="rounded-md px-2 py-1.5"
            style={{ backgroundColor: "#E7EDF6" }}
          >
            <p className="text-[10px] leading-4 font-medium text-[#1C3355]">
              智能机器人
            </p>
            <p className="text-[8px] leading-3 text-[#1C3355]/70">
              {period} · 教学楼A2-109
            </p>
          </div>
        ))}
      </div>
      <div className="mt-2 border-t border-ink/10 pt-1.5">
        <p className="text-[8px] text-ink/40">最近截止</p>
        <p className="mt-0.5 flex items-baseline justify-between gap-2 text-[9px] text-ink/75">
          <span className="truncate">外部中断指示灯</span>
          <span className="shrink-0 text-[8px] text-amber-ink">11-02</span>
        </p>
      </div>
    </div>
  );
}

const TT_DAYS = ["一", "二", "三", "四", "五"];
const TT_COLUMNS = [
  [
    { h: 30, color: "#E7EDF6" },
    { h: 20, color: "#E7EDF6" },
  ],
  [{ h: 22, color: "#EEE9F1" }],
  [],
  [{ h: 26, color: "#E8EFE8" }],
  [{ h: 18, color: "#F3EEE2" }],
];

function TimetablePreview() {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[9px] text-ink/45">第 8 周</span>
        <span className="text-[8px] text-ink/35">周一 — 周五</span>
      </div>
      <div className="mt-2 grid grid-cols-5 gap-1">
        {TT_DAYS.map((day, index) => (
          <div key={day} className="flex flex-col gap-1">
            <span className="text-center text-[8px] text-ink/35">{day}</span>
            {TT_COLUMNS[index].map((block, blockIndex) => (
              <span
                key={blockIndex}
                className="block w-full rounded-[3px]"
                style={{ height: block.h, backgroundColor: block.color }}
              />
            ))}
          </div>
        ))}
      </div>
      <p className="mt-2 text-[8px] text-ink/35">单双周已展开 · 冲突会标出</p>
    </div>
  );
}

const SAMPLE_ASSIGNMENTS = [
  { title: "实验三 数据库操作", due: "11 月 8 日", urgent: false },
  { title: "外部中断指示灯", due: "11 月 2 日", urgent: true },
  { title: "实验四 综合实训", due: "11 月 14 日", urgent: false },
];

function AssignmentPreview() {
  return (
    <div>
      <p className="text-[9px] text-ink/45">本周待办</p>
      <ul className="mt-2 space-y-2">
        {SAMPLE_ASSIGNMENTS.map((item) => (
          <li key={item.title} className="flex items-start gap-1.5">
            <span className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-[2px] border border-ink/25" />
            <span className="min-w-0">
              <span className="block truncate text-[10px] leading-4 text-ink/80">
                {item.title}
              </span>
              <span
                className={
                  item.urgent
                    ? "block text-[8px] leading-3 text-amber-ink"
                    : "block text-[8px] leading-3 text-ink/40"
                }
              >
                {item.due}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ExperiencePreview() {
  return (
    <div>
      <p className="text-[10px] leading-4 font-medium">数学建模竞赛 · 校赛</p>
      <p className="mt-0.5 text-[8px] text-ink/40">教务处 · 2026.09</p>
      <div className="mt-2 grid grid-cols-4 gap-1">
        {["问题", "方法", "贡献", "结果"].map((label) => (
          <span
            key={label}
            className="rounded-[3px] bg-ink/[0.05] py-1 text-center text-[8px] text-ink/55"
          >
            {label}
          </span>
        ))}
      </div>
      <p className="mt-2 text-[8px] leading-3 text-ink/50">
        22 页论文 · 3 人队
        <br />
        校赛二等奖
      </p>
    </div>
  );
}

function ResumePreview() {
  return (
    <div>
      <div className="mx-auto w-[92%] rounded-[3px] border border-ink/10 bg-white px-2.5 py-2">
        <p className="font-serif text-[11px] leading-4">示例同学</p>
        <p className="text-[7px] leading-3 text-ink/45">计算机学院 · 2027 届</p>
        <div className="mt-1.5 border-t border-ink/15 pt-1">
          <p className="text-[7px] leading-3 font-medium text-ink/60">教育经历</p>
          <p className="text-[7px] leading-3 text-ink/50">
            某大学 · 计算机科学与技术
          </p>
        </div>
        <div className="mt-1 border-t border-ink/15 pt-1">
          <p className="text-[7px] leading-3 font-medium text-ink/60">项目经历</p>
          <p className="text-[7px] leading-3 text-ink/50">
            校园选课系统 · 数据库设计
          </p>
          <p className="text-[7px] leading-3 text-ink/50">
            数学建模校赛 · 二等奖
          </p>
        </div>
      </div>
      <p className="mt-1.5 text-center text-[8px] text-ink/35">A4 · 一页</p>
    </div>
  );
}

function MatchPreview() {
  return (
    <div>
      <p className="text-[10px] leading-4 font-medium">数据分析实习生</p>
      <p className="mt-0.5 text-[8px] text-ink/40">杭州 · 2027 届 · 示例岗位</p>
      <div className="mt-2 flex items-center gap-2">
        <span className="font-serif text-[20px] leading-none text-amber-ink">
          86
        </span>
        <span className="h-1 flex-1 overflow-hidden rounded-full bg-ink/10">
          <span className="block h-full w-[86%] rounded-full bg-amber" />
        </span>
      </div>
      <div className="mt-2 space-y-1 text-[8px] leading-3">
        <p className="flex justify-between gap-2">
          <span className="text-ink/40">命中</span>
          <span className="text-right text-ink/70">Python · 数学建模</span>
        </p>
        <p className="flex justify-between gap-2">
          <span className="text-ink/40">缺口</span>
          <span className="text-right text-ink/55">SQL 窗口函数</span>
        </p>
      </div>
      <p className="mt-2 text-[8px] text-ink/35">岗位库整理中</p>
    </div>
  );
}

function ArtifactFrame({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div
      data-ui
      className="mt-6 w-full max-w-[420px] overflow-hidden rounded-xl border border-ink/10 bg-white xl:mt-0 xl:w-[300px] xl:max-w-none xl:shrink-0"
    >
      <div className="flex h-8 items-center justify-between border-b border-ink/10 px-3.5">
        <span className="text-[11px] text-ink/50">{label}</span>
        <span className="text-[9px] text-ink/30">示例</span>
      </div>
      <div className="h-[200px] p-4">{children}</div>
    </div>
  );
}

const WEEK_COLUMNS = [
  {
    day: "一",
    blocks: [
      {
        top: "34%",
        label: "智能机器人",
        detail: "3-4 节",
        bg: "#E7EDF6",
        fg: "#1C3355",
      },
    ],
  },
  {
    day: "二",
    blocks: [
      {
        top: "0%",
        label: "Python 开发",
        detail: "1-2 节",
        bg: "#E8EFE8",
        fg: "#2F4A36",
      },
      {
        top: "34%",
        label: "Python 开发",
        detail: "3-4 节",
        bg: "#E8EFE8",
        fg: "#2F4A36",
      },
    ],
  },
  {
    day: "三",
    blocks: [
      {
        top: "34%",
        label: "智能机器人",
        detail: "3-4 节",
        bg: "#F5EAE3",
        fg: "#5A3A2B",
      },
    ],
  },
  {
    day: "四",
    blocks: [
      {
        top: "34%",
        label: "形势与政策",
        detail: "3-4 节",
        bg: "#EEE9F1",
        fg: "#46324F",
      },
    ],
  },
  { day: "五", blocks: [] },
];

function WeekArtifact() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[10px] font-medium">第 2 周 · 周一至周五</p>
        <p className="text-[8px] text-ink/35">单双周已展开</p>
      </div>
      <div className="mt-2 grid flex-1 grid-cols-5 gap-1.5">
        {WEEK_COLUMNS.map((column) => (
          <div key={column.day} className="flex min-w-0 flex-col gap-1">
            <span className="text-center text-[8px] text-ink/35">
              {column.day}
            </span>
            <div className="relative flex-1 rounded-[3px] bg-ink/[0.035]">
              {column.blocks.map((block) => (
                <span
                  key={block.top}
                  className="absolute inset-x-0 rounded-[2px] px-1 py-0.5"
                  style={{
                    top: block.top,
                    height: "30%",
                    backgroundColor: block.bg,
                    color: block.fg,
                  }}
                >
                  <span className="block truncate text-[8px] leading-[1.3] font-medium">
                    {block.label}
                  </span>
                  <span className="block text-[7.5px] leading-[1.3] opacity-70">
                    {block.detail}
                  </span>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const EXPERIENCE_PARTS = [
  ["问题", "选课高峰易超选"],
  ["方法", "E-R 建模 + 事务"],
  ["贡献", "12 张表、6 个页面"],
  ["结果", "200 人并发无超选"],
];

function ExperienceArtifact() {
  return (
    <div className="flex h-full flex-col">
      <p className="text-[12px] leading-5 font-medium">
        数据库课程设计：校园选课系统
      </p>
      <p className="mt-0.5 text-[8.5px] text-ink/45">
        《数据库原理》· 课程设计 · 2026.06
      </p>
      <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-2">
        {EXPERIENCE_PARTS.map(([label, text]) => (
          <div key={label}>
            <p className="text-[8px] text-ink/40">{label}</p>
            <p className="mt-0.5 text-[9.5px] leading-[1.45] text-ink/75">
              {text}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-auto flex flex-wrap gap-1 pt-2">
        {["MySQL", "Java", "事务"].map((skill) => (
          <span
            key={skill}
            className="rounded-[3px] bg-ink/[0.05] px-1.5 py-0.5 text-[8px] text-ink/55"
          >
            {skill}
          </span>
        ))}
      </div>
    </div>
  );
}

function ResumeArtifact() {
  return (
    <div className="mx-auto flex h-full w-[88%] flex-col rounded-[3px] border border-ink/10 bg-paper px-3 py-2.5">
      <div className="flex items-baseline justify-between">
        <p className="font-serif text-[12px] leading-4">示例同学</p>
        <p className="text-[7.5px] text-ink/35">A4 · 一页</p>
      </div>
      <p className="text-[7.5px] text-ink/45">
        计算机学院 · 2027 届 · 求职方向：数据分析
      </p>
      <div className="mt-1.5 border-t border-ink/15 pt-1">
        <p className="text-[7.5px] font-medium text-ink/55">教育经历</p>
        <p className="text-[8px] text-ink/65">
          某大学 · 计算机科学与技术 · 2023—2027
        </p>
      </div>
      <div className="mt-1 border-t border-ink/15 pt-1">
        <p className="text-[7.5px] font-medium text-ink/55">项目经历</p>
        <p className="text-[8px] leading-[1.45] text-ink/65">
          数学建模校赛 · 二等奖：Python 预测与调度模型，22 页论文
        </p>
        <p className="text-[8px] leading-[1.45] text-ink/65">
          数据库课程设计：12 张表，200 人并发选课无超选
        </p>
      </div>
      <div className="mt-1 border-t border-ink/15 pt-1">
        <p className="text-[7.5px] font-medium text-ink/55">技能</p>
        <p className="text-[8px] text-ink/65">Python · SQL · Java · Figma</p>
      </div>
    </div>
  );
}

function MatchArtifact() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[12px] leading-5 font-medium">数据分析实习生</p>
          <p className="mt-0.5 text-[8.5px] text-ink/45">
            杭州 · 2027 届 · 示例岗位
          </p>
        </div>
        <p className="shrink-0 text-right">
          <span className="font-serif text-[22px] leading-none text-amber-ink">
            86
          </span>
          <span className="ml-1 text-[8px] text-ink/40">匹配</span>
        </p>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-ink/10">
        <span className="block h-full w-[86%] rounded-full bg-amber" />
      </div>
      <div className="mt-2.5 space-y-1.5">
        <div className="flex gap-2">
          <span className="w-7 shrink-0 text-[8px] text-ink/40">命中</span>
          <p className="text-[9px] leading-[1.45] text-ink/70">
            Python · 数学建模校赛
            <span className="block text-[8px] text-ink/45">
              “用 Python 完成全部计算与图表”
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <span className="w-7 shrink-0 text-[8px] text-ink/40">命中</span>
          <p className="text-[9px] leading-[1.45] text-ink/70">
            MySQL · 数据库课程设计
            <span className="block text-[8px] text-ink/45">
              “12 张表，200 人并发无超选”
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <span className="w-7 shrink-0 text-[8px] text-ink/40">缺口</span>
          <p className="text-[9px] leading-[1.45] text-ink/70">
            SQL 窗口函数
            <span className="text-amber-ink"> · 下学期补</span>
          </p>
        </div>
      </div>
      <p className="mt-auto text-[8px] text-ink/35">
        每条命中都指回经历原文
      </p>
    </div>
  );
}
