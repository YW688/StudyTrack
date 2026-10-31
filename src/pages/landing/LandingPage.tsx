import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

type StartState = "idle" | "loading" | "error";

const THEME_KEY = "studytrack:landing-theme";

const THEMES = [
  {
    id: "warm",
    name: "暖沙",
    swatch: "linear-gradient(135deg,#f5ebe1,#d7bdb0)",
  },
  {
    id: "cool",
    name: "雾白",
    swatch: "linear-gradient(135deg,#fafaff,#daddd8)",
  },
  {
    id: "dawn",
    name: "霞光",
    swatch: "linear-gradient(135deg,#ccfbff,#ef96c5)",
  },
  {
    id: "sprout",
    name: "新芽",
    swatch: "linear-gradient(135deg,#f8fff5,#c6e6b3 45%,#688f40)",
  },
] as const;

type LandingTheme = (typeof THEMES)[number]["id"];

interface Module {
  char: string;
  name: string;
  hint: string;
  tone: string;
  preview: ReactNode;
}

const FAN_POSITIONS = [
  { ty: 36, z: 6 },
  { ty: 14, z: 5 },
  { ty: 0, z: 4 },
  { ty: 0, z: 3 },
  { ty: 14, z: 2 },
  { ty: 36, z: 1 },
];

const MODULES: Module[] = [
  {
    char: "今",
    name: "今日",
    hint: "今天上什么 交什么",
    tone: "var(--lp-tone-1)",
    preview: <TodayPreview />,
  },
  {
    char: "课",
    name: "课表",
    hint: "单双周 节次 教室",
    tone: "var(--lp-tone-2)",
    preview: <TimetablePreview />,
  },
  {
    char: "作",
    name: "作业",
    hint: "截止时间与完成状态",
    tone: "var(--lp-tone-3)",
    preview: <AssignmentPreview />,
  },
  {
    char: "经",
    name: "经历",
    hint: "课程设计 比赛 实习",
    tone: "var(--lp-tone-4)",
    preview: <ExperiencePreview />,
  },
  {
    char: "简",
    name: "简历",
    hint: "勾选经历 导出 A4",
    tone: "var(--lp-tone-5)",
    preview: <ResumePreview />,
  },
  {
    char: "机",
    name: "机会",
    hint: "按经历找实习",
    tone: "var(--lp-tone-6)",
    preview: <MatchPreview />,
  },
];

const STAGES = [
  {
    year: "大一",
    title: "先不漏",
    tone: "tone-2",
    artifact: "课表文件 周视图",
    body: [
      "把课表和作业放进来",
      "知道每天上什么 交什么",
      "截止时间按 24 小时 72 小时分级",
      "红色只留给真正紧急的事",
    ],
    preview: <WeekArtifact />,
  },
  {
    year: "大二",
    title: "开始攒",
    tone: "tone-4",
    artifact: "课程设计 经历卡",
    body: [
      "比赛 科研 志愿 实习都能记",
      "四段式写清问题 方法 贡献 结果",
      "没有真实数字就留空 不编",
    ],
    preview: <ExperienceArtifact />,
  },
  {
    year: "大三",
    title: "拿出证据",
    tone: "tone-3",
    artifact: "经历 A4 一页",
    body: [
      "勾选经历自动排版",
      "低置信内容标黄 确认后才进简历",
      "版本存快照 投不同岗位不用重写",
    ],
    preview: <ResumeArtifact />,
  },
  {
    year: "大四",
    title: "找对机会",
    tone: "tone-5",
    artifact: "JD 命中与缺口",
    body: [
      "按技能 年级 城市检索岗位库",
      "每条命中都指回经历原文",
      "缺口写成下一学期的计划",
    ],
    preview: <MatchArtifact />,
  },
];

interface LandingPageProps {
  onStart: () => Promise<void>;
}

function readTheme(): LandingTheme {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    const match = THEMES.find((item) => item.id === saved);
    return match ? match.id : "warm";
  } catch {
    return "warm";
  }
}

function nextTheme(current: LandingTheme): LandingTheme {
  const index = THEMES.findIndex((item) => item.id === current);
  return THEMES[(index + 1) % THEMES.length]?.id ?? "warm";
}

export default function LandingPage({ onStart }: LandingPageProps) {
  const [state, setState] = useState<StartState>("idle");
  const [theme, setTheme] = useState<LandingTheme>(readTheme);

  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* 主题偏好只是锦上添花 存不了也不影响使用 */
    }
  }, [theme]);

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
    <div className="landing-theme" data-theme={theme}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-[#fffdf9] focus:px-4 focus:py-2 focus:text-[13px] focus:text-[color:var(--lp-ink)]"
      >
        跳到主要内容
      </a>

      <main id="main">
        <section className="landing-hero flex min-h-dvh flex-col overflow-hidden px-4 sm:px-8">
          <div aria-hidden="true" className="landing-noise" />

          <header className="landing-glass-nav relative z-20 mx-auto mt-4 flex w-full max-w-[1120px] items-center justify-between gap-2 rounded-full py-2 pr-2 pl-2 sm:mt-6 sm:gap-3 sm:pl-3">
            <div className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--lp-line)] bg-white/55 font-serif text-[15px] leading-none"
              >
                径
              </span>
              <span className="flex items-baseline gap-2">
                <span className="font-serif text-[19px] tracking-[0.04em]">
                  学径
                </span>
                <span className="lp-faint hidden text-[11px] tracking-[0.16em] sm:inline">
                  StudyTrack
                </span>
              </span>
            </div>
            <nav aria-label="页面导航" className="flex items-center gap-1">
              <a
                href="#path"
                className="lp-soft hidden min-h-11 items-center rounded-full px-3.5 text-[13px] transition-colors hover:text-[color:var(--lp-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--lp-accent)] sm:inline-flex"
              >
                四个年级
              </a>
              <a
                href="#privacy"
                className="lp-soft hidden min-h-11 items-center rounded-full px-3.5 text-[13px] transition-colors hover:text-[color:var(--lp-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--lp-accent)] sm:inline-flex"
              >
                数据说明
              </a>
              <ThemeToggle
                theme={theme}
                onToggle={() => setTheme((current) => nextTheme(current))}
              />
              <StartButton
                state={state}
                size="sm"
                onClick={() => void handleStart()}
              />
            </nav>
          </header>

          <div className="relative z-10 mx-auto flex w-full max-w-[1120px] flex-1 flex-col">
            <div className="flex flex-1 flex-col items-center justify-center pt-7 pb-6 text-center sm:pt-9">
              <span className="landing-chip landing-enter">
                给本科生的学习与经历工作台
              </span>

              <h1 className="mt-6 font-serif text-[clamp(3.25rem,8.2vw,6rem)] leading-[1.02] tracking-[0.03em]">
                <span className="block overflow-hidden py-[0.04em]">
                  <span className="landing-line block">记录</span>
                </span>
                <span className="lp-soft mt-1 block overflow-hidden py-[0.1em] sm:mt-2">
                  <span className="landing-line block text-[clamp(1.9rem,5.3vw,3.9rem)] leading-[1.15] tracking-[0.07em] [animation-delay:130ms]">
                    大学的点点滴滴
                  </span>
                </span>
              </h1>

              <ul
                aria-label="六个模块"
                className="landing-enter mt-5 flex max-w-[34rem] flex-wrap items-center justify-center gap-x-5 gap-y-2 [animation-delay:260ms]"
              >
                {MODULES.map((module) => (
                  <li
                    key={module.name}
                    className="lp-soft flex items-center gap-2 text-[13px]"
                  >
                    <span
                      aria-hidden="true"
                      className="h-1.5 w-1.5 rounded-full border border-[color:var(--lp-line)]"
                      style={{ backgroundColor: module.tone }}
                    />
                    {module.name}
                  </li>
                ))}
              </ul>

              <div className="landing-enter mt-6 [animation-delay:340ms]">
                <StartButton
                  state={state}
                  size="lg"
                  onClick={() => void handleStart()}
                />
              </div>

              <div className="landing-enter mt-4 flex flex-wrap items-center justify-center gap-2 [animation-delay:420ms]">
                <span className="landing-chip">无需注册</span>
                <span className="landing-chip">数据只存本机</span>
                <span className="landing-chip">示例预览</span>
              </div>

              <p
                aria-live="polite"
                className="lp-alert mt-2 min-h-5 text-[12px] leading-5"
              >
                {state === "error"
                  ? "本机存储不可用 请检查浏览器隐私设置后重试"
                  : ""}
              </p>
            </div>

            <div className="mt-auto pb-10 sm:pb-12 lg:pb-20">
              <ul className="fan" data-ui aria-label="六个模块的示例预览">
                {MODULES.map((module, index) => (
                  <ModuleCard key={module.name} module={module} index={index} />
                ))}
              </ul>
            </div>
          </div>
        </section>

        <div aria-hidden="true" className="h-px w-full bg-[color:var(--lp-line)]" />

        <section
          id="path"
          className="landing-band px-4 py-24 sm:px-8 lg:py-32"
        >
          <div className="mx-auto grid w-full max-w-[1120px] gap-16 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] lg:gap-16">
            <div className="lg:sticky lg:top-16 lg:self-start">
              <Reveal>
                <h2 className="font-serif text-[clamp(2rem,4.4vw,3.5rem)] leading-[1.2] tracking-[0.01em]">
                  一条径
                  <br />
                  四个年级
                </h2>
              </Reveal>
              <Reveal delay={80}>
                <p className="lp-soft mt-5 max-w-[30rem] text-[16px] leading-8">
                  <span className="block">不用等到大四才整理</span>
                  <span className="block">
                    每一次课程设计 比赛 实习 做完就记一条
                  </span>
                  <span className="block">
                    到需要简历的那天 你已经有材料了
                  </span>
                </p>
              </Reveal>
              <Reveal delay={160}>
                <div className="mt-14 max-w-[24rem] border-l-[3px] border-[color:var(--lp-accent)] pl-5">
                  <p className="font-serif text-[clamp(1.45rem,2.2vw,1.85rem)] leading-[1.8]">
                    <span className="block">径不是捷径</span>
                    <span className="block">是把每一天收进同一条路</span>
                  </p>
                  <p className="lp-faint mt-4 text-[15px] leading-7">
                    <span className="block">
                      每天上的课 交过的作业 做过的项目
                    </span>
                    <span className="block">回头看得到 往前走得动</span>
                  </p>
                </div>
              </Reveal>
            </div>

            <ol className="flex flex-col gap-12 lg:gap-10">
              {STAGES.map((stage, index) => (
                <li key={stage.year}>
                  <Reveal delay={index * 80}>
                    <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_300px] xl:items-start xl:gap-7">
                      <div>
                        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                          <span
                            className={`inline-flex h-9 w-14 -rotate-1 items-center justify-center rounded-[10px] border border-[color:var(--lp-line)] font-serif text-[13px] ${stage.tone}`}
                          >
                            {stage.year}
                          </span>
                          <h3 className="font-serif text-[clamp(1.6rem,2.8vw,2rem)] leading-[1.2]">
                            {stage.title}
                          </h3>
                        </div>
                        <p className="lp-soft mt-4 max-w-[26rem] text-[16px] leading-8 xl:max-w-none">
                          {stage.body.map((line) => (
                            <span key={line} className="block">
                              {line}
                            </span>
                          ))}
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

        <div aria-hidden="true" className="h-px w-full bg-[color:var(--lp-line)]" />

        <section className="px-4 py-24 sm:px-8 lg:py-28">
          <div className="mx-auto w-full max-w-[1120px]">
            <Reveal>
              <div className="landing-panel grid gap-10 rounded-[32px] p-8 sm:p-12 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div>
                  <h2 className="font-serif text-[clamp(2.2rem,5vw,3.5rem)] leading-[1.16]">
                    从今天的课表开始
                  </h2>
                  <p className="lp-soft mt-5 max-w-md text-[15px] leading-8">
                    <span className="block">先看示例 再换成你自己的</span>
                    <span className="block">
                      所有数据只存在这台设备上 随时可以一键清除
                    </span>
                  </p>
                </div>
                <StartButton
                  state={state}
                  size="lg"
                  onClick={() => void handleStart()}
                />
              </div>
            </Reveal>
            <Reveal delay={120}>
              <p className="lp-faint mt-6 text-center text-[12px] tracking-[0.08em] lg:text-left">
                今日 课表 作业 经历 简历 机会 六个模块并列 不排队 随时切换
              </p>
            </Reveal>
          </div>
        </section>
      </main>

      <footer id="privacy" className="px-4 pb-16 sm:px-8">
        <div className="mx-auto w-full max-w-[1120px] border-t border-[color:var(--lp-line)] pt-12">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-8">
              <div>
                <p className="font-serif text-[clamp(2.5rem,5vw,3.5rem)] leading-none">
                  学径
                </p>
                <p className="lp-faint mt-3 text-[12px] tracking-[0.14em]">
                  StudyTrack 2026
                </p>
              </div>
              <span
                aria-hidden="true"
                className="tone-3 inline-flex h-14 w-14 -rotate-3 flex-col items-center justify-center rounded-[14px] border border-[color:var(--lp-line)] font-serif text-[15px] leading-[1.2] text-[color:var(--lp-ink)] shadow-[0_14px_24px_-18px_var(--lp-shadow)]"
              >
                学
                <br />
                径
              </span>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <div className="mt-12 max-w-[34rem]">
              <h2 className="text-[13px] font-medium tracking-[0.08em]">
                数据说明
              </h2>
              <dl className="mt-5 grid gap-x-6 gap-y-3 text-[14px] leading-6 sm:grid-cols-[88px_minmax(0,1fr)]">
                <dt className="lp-faint">保存位置</dt>
                <dd className="lp-soft">浏览器 IndexedDB</dd>
                <dt className="lp-faint">上传服务器</dt>
                <dd className="lp-soft">不会</dd>
                <dt className="lp-faint">清除方式</dt>
                <dd className="lp-soft">
                  侧栏 清除本机数据 或浏览器设置清除本站数据
                </dd>
                <dt className="lp-faint">示例数据</dt>
                <dd className="lp-soft">只用于演示</dd>
              </dl>
            </div>
          </Reveal>

          <Reveal delay={160}>
            <div className="lp-faint mt-10 flex flex-wrap items-center justify-between gap-3 text-[12px] tracking-[0.04em]">
              <span>面向本科生 四年可用</span>
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
      { rootMargin: "0px 0px -5% 0px" },
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

function ThemeToggle({
  theme,
  onToggle,
}: {
  theme: LandingTheme;
  onToggle: () => void;
}) {
  const current = THEMES.find((item) => item.id === theme) ?? THEMES[0];
  const next = THEMES.find((item) => item.id === nextTheme(theme)) ?? THEMES[0];
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={`切换配色 当前${current.name} 下一套${next.name}`}
      title={`切换到${next.name}`}
      className="lp-theme-toggle inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full px-3 text-[12px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--lp-accent)] sm:px-3.5"
    >
      <span
        aria-hidden="true"
        className="h-3 w-3 rounded-full border border-black/10"
        style={{ backgroundImage: current.swatch }}
      />
      <span className="hidden sm:inline">{current.name}</span>
    </button>
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
          "--z": position.z,
          "--tone": module.tone,
        } as CSSProperties
      }
    >
      <div className="flex items-start gap-2.5">
        <span aria-hidden="true" className="module-chip">
          {module.char}
        </span>
        <div className="min-w-0">
          <p className="font-serif text-[18px] leading-none">{module.name}</p>
          <p className="lp-soft mt-1.5 text-[11px] leading-4">
            {module.hint}
          </p>
        </div>
      </div>
      <div className="fan-detail mt-3">
        <div className="fan-panel" aria-hidden="true">
          {module.preview}
        </div>
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
        "start-button inline-flex items-center justify-center gap-2 rounded-full font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--lp-cta)] disabled:cursor-wait",
        size === "lg" ? "min-h-12 px-7 text-[15px]" : "min-h-11 px-4 text-[13px]",
      ].join(" ")}
    >
      {state === "loading" ? "正在准备示例" : "用示例体验"}
      <span aria-hidden="true" className="text-[12px]">
        →
      </span>
    </button>
  );
}

function TodayPreview() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-baseline justify-between gap-2">
        <span className="lp-faint text-[9px] tracking-[0.08em]">第 8 周</span>
        <span className="lp-fill lp-soft rounded-full px-1.5 py-0.5 text-[8px]">
          3 项待办
        </span>
      </div>
      <div className="mt-2 space-y-1.5">
        {["3-4 节 教学楼A 2-109", "5-6 节 教学楼A 2-109"].map((meta) => (
          <div
            key={meta}
            className="lp-fill lp-hairline-soft rounded-lg border px-2 py-1.5"
          >
            <p className="text-[10px] leading-4 font-medium">智能机器人</p>
            <p className="lp-faint text-[8px] leading-3">{meta}</p>
          </div>
        ))}
      </div>
      <div className="lp-hairline mt-auto border-t pt-1.5">
        <p className="lp-faint text-[8px]">最近截止</p>
        <p className="lp-soft mt-0.5 flex items-baseline justify-between gap-2 text-[9px]">
          <span className="truncate">外部中断指示灯</span>
          <span className="lp-alert shrink-0 text-[8px]">11 月 2 日</span>
        </p>
      </div>
    </div>
  );
}

const TT_DAYS = ["一", "二", "三", "四", "五"];
const TT_COLUMNS = [
  [
    { h: 26, tone: "tone-1" },
    { h: 16, tone: "tone-1" },
  ],
  [{ h: 20, tone: "tone-2" }],
  [],
  [{ h: 26, tone: "tone-4" }],
  [{ h: 18, tone: "tone-5" }],
];

function TimetablePreview() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-baseline justify-between">
        <span className="lp-faint text-[9px] tracking-[0.08em]">第 8 周</span>
        <span className="lp-faint text-[8px]">周一到周五</span>
      </div>
      <div className="mt-2 grid flex-1 grid-cols-5 gap-1">
        {TT_DAYS.map((day, index) => (
          <div key={day} className="flex flex-col gap-1">
            <span className="lp-faint text-center text-[8px]">{day}</span>
            <div className="lp-fill flex flex-1 flex-col gap-1 rounded-[5px] p-0.5">
              {TT_COLUMNS[index].map((block, blockIndex) => (
                <span
                  key={blockIndex}
                  className={`lp-hairline-soft block w-full rounded-[3px] border ${block.tone}`}
                  style={{ height: block.h }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="lp-faint mt-2 flex items-baseline justify-between text-[8px]">
        <span>单双周已展开</span>
        <span>冲突会标出</span>
      </div>
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
    <div className="flex h-full flex-col">
      <p className="lp-faint text-[9px] tracking-[0.08em]">本周待办</p>
      <ul className="mt-2.5 space-y-2">
        {SAMPLE_ASSIGNMENTS.map((item) => (
          <li key={item.title} className="flex items-start gap-1.5">
            <span className="lp-hairline mt-0.5 h-2.5 w-2.5 shrink-0 rounded-[3px] border" />
            <span className="min-w-0">
              <span className="block truncate text-[10px] leading-4">
                {item.title}
              </span>
              <span
                className={
                  item.urgent
                    ? "lp-alert block text-[8px] leading-3"
                    : "lp-faint block text-[8px] leading-3"
                }
              >
                {item.due}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <p className="lp-hairline lp-faint mt-auto border-t pt-1.5 text-[8px]">
        24 小时红色 72 小时琥珀
      </p>
    </div>
  );
}

function ExperiencePreview() {
  return (
    <div className="flex h-full flex-col">
      <p className="text-[10px] leading-4 font-medium">数学建模竞赛 校赛</p>
      <p className="lp-faint mt-0.5 text-[8px]">教务处 2026 年 9 月</p>
      <div className="mt-2 grid grid-cols-4 gap-1">
        {["问题", "方法", "贡献", "结果"].map((label) => (
          <span
            key={label}
            className="lp-fill lp-soft rounded-[5px] py-1 text-center text-[8px]"
          >
            {label}
          </span>
        ))}
      </div>
      <p className="lp-soft mt-2 text-[8px] leading-3">
        <span className="block">22 页论文 3 人队</span>
        <span className="block">校赛二等奖</span>
      </p>
      <p className="lp-faint mt-auto text-[8px]">四条证据 可回看</p>
    </div>
  );
}

function ResumePreview() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col rounded-[7px] border border-[color:var(--lp-line-soft)] bg-[#fffdf9] px-2.5 py-2 shadow-[0_18px_30px_-24px_rgba(60,45,35,0.45)]">
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-serif text-[11px] leading-4">示例同学</p>
          <p className="lp-faint text-[7px]">A4 一页</p>
        </div>
        <p className="lp-soft text-[7px] leading-3">计算机学院 2027 届</p>
        <div className="lp-hairline mt-1 border-t pt-1">
          <p className="lp-soft text-[7px] leading-3 font-medium">教育经历</p>
          <p className="lp-soft text-[7px] leading-3">
            某大学 计算机科学与技术
          </p>
        </div>
        <div className="lp-hairline mt-1 border-t pt-1">
          <p className="lp-soft text-[7px] leading-3 font-medium">项目经历</p>
          <p className="lp-soft text-[7px] leading-3">
            校园选课系统 数据库设计
          </p>
          <p className="lp-soft text-[7px] leading-3">
            数学建模校赛 二等奖
          </p>
        </div>
      </div>
      <p className="lp-faint mt-2 text-center text-[8px]">勾选即排版</p>
    </div>
  );
}

function MatchPreview() {
  return (
    <div className="flex h-full flex-col">
      <p className="text-[10px] leading-4 font-medium">数据分析实习生</p>
      <p className="lp-faint mt-0.5 text-[8px]">杭州 2027 届 示例岗位</p>
      <div className="mt-2 flex items-center gap-2">
        <span className="font-serif text-[20px] leading-none">86</span>
        <span className="lp-fill h-1 flex-1 overflow-hidden rounded-full">
          <span className="lp-accent-fill block h-full w-[86%] rounded-full" />
        </span>
      </div>
      <div className="lp-soft mt-2 space-y-1 text-[8px] leading-3">
        <p className="flex justify-between gap-2">
          <span className="lp-faint">命中</span>
          <span className="text-right">Python 数学建模</span>
        </p>
        <p className="flex justify-between gap-2">
          <span className="lp-faint">缺口</span>
          <span className="text-right">SQL 窗口函数</span>
        </p>
      </div>
      <p className="lp-faint mt-auto text-[8px]">每条命中指回原文</p>
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
      className="landing-artifact mt-6 w-full max-w-[420px] overflow-hidden rounded-xl xl:mt-0 xl:w-[300px] xl:max-w-none xl:shrink-0"
    >
      <div className="lp-hairline flex h-8 items-center justify-between border-b px-3.5">
        <span className="lp-soft text-[11px]">{label}</span>
        <span className="lp-faint text-[9px]">示例</span>
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
        tone: "tone-2",
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
        tone: "tone-4",
      },
      {
        top: "34%",
        label: "Python 开发",
        detail: "3-4 节",
        tone: "tone-4",
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
        tone: "tone-1",
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
        tone: "tone-5",
      },
    ],
  },
  { day: "五", blocks: [] },
];

function WeekArtifact() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[10px] font-medium">第 2 周 周一至周五</p>
        <p className="lp-faint text-[8px]">单双周已展开</p>
      </div>
      <div className="mt-2 grid flex-1 grid-cols-5 gap-1.5">
        {WEEK_COLUMNS.map((column) => (
          <div key={column.day} className="flex min-w-0 flex-col gap-1">
            <span className="lp-faint text-center text-[8px]">
              {column.day}
            </span>
            <div className="lp-fill relative flex-1 rounded-[3px]">
              {column.blocks.map((block) => (
                <span
                  key={block.top}
                  className={`lp-hairline-soft absolute inset-x-0 rounded-[2px] border px-1 py-0.5 ${block.tone}`}
                  style={{ top: block.top, height: "30%" }}
                >
                  <span className="block truncate text-[8px] leading-[1.3] font-medium">
                    {block.label}
                  </span>
                  <span className="lp-soft block text-[7.5px] leading-[1.3]">
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
  ["贡献", "12 张表 6 个页面"],
  ["结果", "200 人并发无超选"],
];

function ExperienceArtifact() {
  return (
    <div className="flex h-full flex-col">
      <p className="text-[12px] leading-5 font-medium">
        数据库课程设计 校园选课系统
      </p>
      <p className="lp-faint mt-0.5 text-[8.5px]">
        数据库原理 课程设计 2026 年 6 月
      </p>
      <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-2">
        {EXPERIENCE_PARTS.map(([label, text]) => (
          <div key={label}>
            <p className="lp-faint text-[8px]">{label}</p>
            <p className="lp-soft mt-0.5 text-[9.5px] leading-[1.45]">
              {text}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-auto flex flex-wrap gap-1 pt-2">
        {["MySQL", "Java", "事务"].map((skill) => (
          <span
            key={skill}
            className="lp-fill lp-soft rounded-[3px] px-1.5 py-0.5 text-[8px]"
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
    <div className="mx-auto flex h-full w-[88%] flex-col rounded-[3px] border border-[color:var(--lp-line)] bg-[#fffdf9] px-3 py-2.5">
      <div className="flex items-baseline justify-between">
        <p className="font-serif text-[12px] leading-4">示例同学</p>
        <p className="lp-faint text-[7.5px]">A4 一页</p>
      </div>
      <p className="lp-soft text-[7.5px]">
        计算机学院 2027 届 求职方向 数据分析
      </p>
      <div className="lp-hairline mt-1.5 border-t pt-1">
        <p className="lp-soft text-[7.5px] font-medium">教育经历</p>
        <p className="lp-soft text-[8px]">
          某大学 计算机科学与技术 2023 至 2027
        </p>
      </div>
      <div className="lp-hairline mt-1 border-t pt-1">
        <p className="lp-soft text-[7.5px] font-medium">项目经历</p>
        <p className="lp-soft text-[8px] leading-[1.45]">
          数学建模校赛 二等奖 Python 预测与调度模型 22 页论文
        </p>
        <p className="lp-soft text-[8px] leading-[1.45]">
          数据库课程设计 12 张表 200 人并发选课无超选
        </p>
      </div>
      <div className="lp-hairline mt-1 border-t pt-1">
        <p className="lp-soft text-[7.5px] font-medium">技能</p>
        <p className="lp-soft text-[8px]">Python SQL Java Figma</p>
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
          <p className="lp-faint mt-0.5 text-[8.5px]">杭州 2027 届</p>
        </div>
        <p className="shrink-0 text-right">
          <span className="font-serif text-[22px] leading-none">86</span>
          <span className="lp-faint ml-1 text-[8px]">匹配</span>
        </p>
      </div>
      <div className="lp-fill mt-2 h-1 overflow-hidden rounded-full">
        <span className="lp-accent-fill block h-full w-[86%] rounded-full" />
      </div>
      <div className="mt-2.5 space-y-1.5">
        <div className="flex gap-2">
          <span className="lp-faint w-7 shrink-0 text-[8px]">命中</span>
          <p className="lp-soft text-[9px] leading-[1.45]">
            Python 数学建模校赛
            <span className="lp-faint block text-[8px]">
              用 Python 完成全部计算与图表
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <span className="lp-faint w-7 shrink-0 text-[8px]">命中</span>
          <p className="lp-soft text-[9px] leading-[1.45]">
            MySQL 数据库课程设计
            <span className="lp-faint block text-[8px]">
              12 张表 200 人并发无超选
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <span className="lp-faint w-7 shrink-0 text-[8px]">缺口</span>
          <p className="lp-soft text-[9px] leading-[1.45]">
            SQL 窗口函数
            <span className="lp-alert"> 下学期补</span>
          </p>
        </div>
      </div>
      <p className="lp-faint mt-auto text-[8px]">每条命中都指回经历原文</p>
    </div>
  );
}
