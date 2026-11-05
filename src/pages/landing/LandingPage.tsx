import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  ExperienceShowcase,
  MatchShowcase,
  ResumeShowcase,
  WeekShowcase,
} from "./Showcases";
import WorkbenchDemo, { DEMO_FACES, type FaceId } from "./WorkbenchDemo";
import BrandMark from "../../components/BrandMark";
import { DEMO, FEATURED_EXPERIENCE, TOOL_ROWS } from "./demoData";
import { THEMES, nextTheme, type ThemeId } from "../../lib/theme";

type StartState = "idle" | "loading" | "error";

const MODULE_PREVIEWS: Record<FaceId, ReactNode> = {
  today: <TodayPreview />,
  ledger: <ExperiencePreview />,
  bounty: <MatchPreview />,
  toolbox: <ToolboxPreview />,
  space: <SpacePreview />,
};

interface Stage {
  year: string;
  title: string;
  hint: string;
  label: string;
  tone: string;
  preview: ReactNode;
}

const STAGES: Stage[] = [
  {
    year: "大一",
    title: "先不漏",
    hint: "课表 作业 DDL 一眼看完今天",
    label: "工具箱 课表",
    tone: "tone-2",
    preview: <WeekShowcase />,
  },
  {
    year: "大二",
    title: "开始攒",
    hint: "课程设计 比赛 实习 做完就记一条",
    label: "征途 经历",
    tone: "tone-4",
    preview: <ExperienceShowcase />,
  },
  {
    year: "大三",
    title: "拿出证据",
    hint: "勾选经历自动排版 低置信标黄再确认",
    label: "工具箱 简历",
    tone: "tone-5",
    preview: <ResumeShowcase />,
  },
  {
    year: "大四",
    title: "找对机会",
    hint: "按经历检索岗位 命中与待补都指回原文",
    label: "征召 岗位匹配",
    tone: "tone-1",
    preview: <MatchShowcase />,
  },
];

const PRIVACY_FACTS = [
  {
    title: "存在哪",
    text: "浏览器 IndexedDB 刷新重开都还在 清除站点数据会丢 先导出备份",
  },
  {
    title: "发给模型什么",
    text: "只发当前这一步的文本或截图 不发整份档案 不填 Key 就在本机原文兜底",
  },
  {
    title: "怎么带走",
    text: "导出得到一份 JSON 换设备用导入接着记 清除本机数据一键删干净",
  },
];

const FAQS = [
  {
    q: "需要注册或登录吗？",
    a: "不需要 打开就能用 数据只存在这台设备",
  },
  {
    q: "数据会丢吗？",
    a: "换浏览器 清除站点数据或换电脑会丢 侧栏导出 JSON 导入后接着记",
  },
  {
    q: "要自己准备模型 Key 吗？",
    a: "不填也能走完全部流程 只是 AI 提炼换成本机原文兜底 想接真模型就在顶栏灵动岛展开「模型接入」填自己的 Key 只存这台浏览器 不进导出备份 清除本机数据会一起删掉",
  },
  {
    q: "记录官会替我编经历吗？",
    a: "不会 只做整理和提问 写入前先给草稿 原文没有的数字奖项名次不生成",
  },
  {
    q: "课表能直接从教务系统导入吗？",
    a: "不登录学习通 也不调它的接口 支持 Excel CSV 导入 单双周展开成具体周次 解析不准可以逐条改",
  },
  {
    q: "岗位是爬来的吗？",
    a: "不是 只放官方招聘入口 人工整理的演示岗位和你粘贴的 JD 检索在浏览器本地完成",
  },
];

const STEPS = [
  { no: "01", title: "建档", text: "年级 专业 目标 30 秒" },
  { no: "02", title: "记一条", text: "截图 粘贴或一句话 落进征途" },
  { no: "03", title: "看匹配", text: "命中指回原文 缺口给下一步" },
];

const FOOTER_LINKS = [
  { href: "#demo", label: "产品预览" },
  { href: "#path", label: "四个年级" },
  { href: "#privacy", label: "数据说明" },
  { href: "#faq", label: "常见问题" },
];

interface LandingPageProps {
  theme: ThemeId;
  onThemeChange: (theme: ThemeId) => void;
  onStart: (mode: "fresh" | "demo") => Promise<void>;
}

export default function LandingPage({
  theme,
  onThemeChange,
  onStart,
}: LandingPageProps) {
  const [state, setState] = useState<StartState>("idle");
  const [pending, setPending] = useState<"fresh" | "demo" | null>(null);
  const [face, setFace] = useState<FaceId>("today");
  const activeFace = DEMO_FACES.find((item) => item.id === face) ?? DEMO_FACES[0];

  async function handleStart(mode: "fresh" | "demo") {
    setPending(mode);
    setState("loading");
    try {
      await onStart(mode);
      setState("idle");
    } catch {
      setState("error");
    } finally {
      setPending(null);
    }
  }

  function openFace(next: FaceId) {
    setFace(next);
    const windowEl = document.getElementById("demo-window");
    if (!windowEl) return;
    const reduce =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fits = windowEl.getBoundingClientRect().height <= window.innerHeight - 96;
    windowEl.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: fits ? "center" : "start",
    });
    window.requestAnimationFrame(() => {
      document
        .getElementById(`demo-tab-${next}`)
        ?.focus({ preventScroll: true });
    });
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

          <header className="landing-glass-nav relative z-20 mx-auto mt-4 grid w-full max-w-[1240px] grid-cols-[auto_1fr_auto] items-center gap-4 rounded-full px-3 py-2 sm:mt-5 sm:px-5 lg:gap-10 lg:px-7 lg:py-2.5">
            <div className="flex shrink-0 items-center gap-3 sm:gap-3.5">
              <BrandMark
                size={32}
                className="landing-brand-mark h-8 w-8 shrink-0 sm:h-9 sm:w-9"
              />
              <span className="flex items-baseline gap-2">
                <span className="font-serif text-[19px] tracking-[0.04em]">
                  学径
                </span>
                <span className="lp-faint hidden text-[10px] tracking-[0.12em] sm:inline">
                  StudyTrack
                </span>
              </span>
            </div>

            <nav
              aria-label="页面导航"
              className="mx-auto hidden w-full max-w-[820px] grid-cols-4 items-center justify-items-center lg:grid"
            >
              <a
                href="#demo"
                className="lp-soft inline-flex min-h-11 items-center px-1 text-[13.5px] tracking-[0.02em] transition-colors hover:text-[color:var(--lp-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--lp-accent)]"
              >
                产品预览
              </a>
              <a
                href="#path"
                className="lp-soft inline-flex min-h-11 items-center px-1 text-[13.5px] tracking-[0.02em] transition-colors hover:text-[color:var(--lp-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--lp-accent)]"
              >
                四个年级
              </a>
              <a
                href="#privacy"
                className="lp-soft inline-flex min-h-11 items-center px-1 text-[13.5px] tracking-[0.02em] transition-colors hover:text-[color:var(--lp-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--lp-accent)]"
              >
                数据说明
              </a>
              <a
                href="#faq"
                className="lp-soft inline-flex min-h-11 items-center px-1 text-[13.5px] tracking-[0.02em] transition-colors hover:text-[color:var(--lp-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--lp-accent)]"
              >
                常见问题
              </a>
            </nav>

            <div className="flex items-center justify-self-end gap-2.5 md:gap-4 lg:gap-6">
              <ThemeToggle
                theme={theme}
                onToggle={() => onThemeChange(nextTheme(theme))}
              />
              <StartButton
                state={state}
                pending={pending}
                mode="fresh"
                variant="primary"
                size="lg"
                onClick={() => void handleStart("fresh")}
              />
            </div>
          </header>

          <div className="relative z-10 mx-auto flex w-full max-w-[1240px] flex-1 flex-col">
            <div className="flex flex-1 flex-col items-center justify-center pt-6 pb-5 text-center sm:pt-8">
              <span className="landing-chip landing-enter">
                给本科生的学习与经历工作台
              </span>

              <h1 className="mt-6 font-serif text-[clamp(3rem,7.4vw,5.2rem)] leading-[1.02] tracking-[0.01em]">
                <span className="block overflow-hidden py-[0.04em]">
                  <span className="landing-line block">记录</span>
                </span>
                <span className="lp-soft mt-1 block overflow-hidden py-[0.1em] sm:mt-1.5">
                  <span className="landing-line block text-[clamp(1.75rem,4.6vw,3.3rem)] leading-[1.15] tracking-[0.05em] [animation-delay:60ms]">
                    大学的点点滴滴
                  </span>
                </span>
              </h1>

              <p className="landing-enter lp-soft mt-5 max-w-[31rem] text-[14px] leading-7 [animation-delay:100ms] sm:text-[15px]">
                每天 30 秒 把课表 作业 经历和机会收进同一份本机档案
                <br className="hidden sm:block" />
                四年后它是一份可验证的履历
              </p>

              <div className="landing-enter mt-6 flex flex-wrap items-center justify-center gap-2 [animation-delay:160ms]">
                <StartButton
                  state={state}
                  pending={pending}
                  mode="fresh"
                  variant="primary"
                  size="lg"
                  onClick={() => void handleStart("fresh")}
                />
                <StartButton
                  state={state}
                  pending={pending}
                  mode="demo"
                  variant="secondary"
                  size="lg"
                  onClick={() => void handleStart("demo")}
                />
              </div>

              <div className="landing-enter mt-3 flex flex-wrap items-center justify-center gap-2 [animation-delay:200ms]">
                <span className="landing-chip">无需注册</span>
                <span className="landing-chip">数据只存本机</span>
                <span className="landing-chip">记录官随叫随到</span>
              </div>

              <p
                aria-live="polite"
                className="lp-alert mt-1 text-[12px] leading-5"
              >
                {state === "error"
                  ? "没能打开今日页 请重试或检查浏览器存储权限"
                  : ""}
              </p>
            </div>

            <div className="hero-stage">
              <div aria-hidden="true" className="hero-stage-glow" />

              <div aria-hidden="true" className="hero-float hero-float--a">
                <span className="hero-float-label">今日</span>
                <strong className="hero-float-value">{DEMO.pendingCount}</strong>
                <span className="hero-float-unit">件待办</span>
              </div>
              <div aria-hidden="true" className="hero-float hero-float--b">
                <span className="hero-float-label">征途</span>
                <strong className="hero-float-value">
                  {DEMO.totalExperiences}
                </strong>
                <span className="hero-float-unit">条战绩</span>
              </div>
              <div aria-hidden="true" className="hero-float hero-float--c">
                <span className="hero-float-label">本周</span>
                <strong className="hero-float-value">
                  {DEMO.weekGreen.thisWeek}
                  <span className="text-[12px]">/{DEMO.weekGreen.elapsed}</span>
                </strong>
                <span className="hero-float-unit">绿格</span>
              </div>

              <div className="hero-workbench">
                <div className="hero-workbench-bar">
                  <span>
                    学径 {DEMO.weekLabel} {DEMO.dayLabel}
                  </span>
                  <span>{activeFace.name} 示例</span>
                </div>
                <div
                  className="hero-workbench-body"
                  data-ui
                  aria-hidden="true"
                >
                  {MODULE_PREVIEWS[face]}
                </div>
              </div>

              <div className="hero-faces" aria-label="五个面的示例预览">
                {DEMO_FACES.map((module) => (
                  <button
                    key={module.id}
                    type="button"
                    className={`hero-face ${module.id === face ? "is-active" : ""}`}
                    onClick={() => openFace(module.id)}
                    aria-label={`查看${module.name}示例`}
                  >
                    <span aria-hidden="true" className="hero-face-char">
                      {module.char}
                    </span>
                    <span>{module.name}</span>
                  </button>
                ))}
              </div>
              <p className="lp-faint mt-3 text-center font-mono text-[10px] tracking-[0.14em]">
                五个面并列 点开任意一面看工作台预览
              </p>
            </div>
          </div>
        </section>

        <div aria-hidden="true" className="h-px w-full bg-[color:var(--lp-line)]" />

        <section
          id="demo"
          className="landing-band scroll-mt-6 px-4 py-20 sm:px-8 lg:py-24"
        >
          <div className="mx-auto w-full max-w-[1240px]">
            <Reveal>
              <div className="landing-section-head">
                <p className="landing-eyebrow">工作台 五个面并列</p>
                <h2 className="mx-auto mt-3 max-w-[40rem] font-serif text-[clamp(2rem,4.4vw,3.25rem)] leading-[1.16] tracking-[0.01em]">
                  五个面，一张工作台
                </h2>
                <p className="lp-soft mx-auto mt-4 max-w-[32rem] text-[14px] leading-7">
                  点开任意一面 示例数据只在预览里 不会写进你的档案
                </p>
              </div>
            </Reveal>

            <Reveal delay={90} className="relative mt-12">
              <p aria-hidden="true" className="demo-hint">
                <span>点一下就换面</span>
                <svg viewBox="0 0 40 28" fill="none">
                  <path
                    d="M5 4c9 2.5 16 8.5 19 19"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                  <path
                    d="m24 23-5.4-3.4M24 23l1.4-6.2"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </p>
              <WorkbenchDemo active={face} onChange={setFace} />
              <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
                <p className="lp-faint font-mono text-[10.5px] tracking-[0.06em]">
                  示例数据 五个面共享同一份档案
                </p>
                <a
                  href="#path"
                  className="lp-soft inline-flex min-h-11 items-center gap-2 text-[12.5px] underline underline-offset-4 hover:text-[color:var(--lp-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--lp-accent)]"
                >
                  再看四个年级怎么用
                  <span aria-hidden="true">↓</span>
                </a>
              </div>
            </Reveal>
          </div>
        </section>

        <section
          id="path"
          className="scroll-mt-6 px-4 py-20 sm:px-8 lg:py-28"
        >
          <div className="mx-auto w-full max-w-[1120px]">
            <Reveal>
              <div className="landing-section-head">
                <p className="landing-eyebrow">一条径 四个年级</p>
                <h2 className="mx-auto mt-3 font-serif text-[clamp(2rem,4.4vw,3.25rem)] leading-[1.16] tracking-[0.01em]">
                  一条径，四个年级
                </h2>
                <p className="lp-soft mx-auto mt-4 max-w-[26rem] text-[14px] leading-7">
                  径不是捷径 是把每一天收进同一条路
                </p>
              </div>
            </Reveal>

            <div className="mx-auto mt-12 grid w-full max-w-[720px] gap-10">
              {STAGES.map((stage, index) => (
                <Reveal key={stage.year} delay={index * 60}>
                  <article>
                    <div className="stage-shot" data-ui>
                      <div className="stage-bar">
                        <span className="flex items-center gap-2">
                          <span
                            aria-hidden="true"
                            className={`h-1.5 w-1.5 rounded-full border border-[color:var(--lp-line)] ${stage.tone}`}
                          />
                          <span className="lp-soft text-[11px] tracking-[0.04em]">
                            {stage.label}
                          </span>
                        </span>
                        <span className="lp-faint text-[10px] tracking-[0.08em]">
                          示例数据
                        </span>
                      </div>
                      <div className="stage-canvas" aria-hidden="true">
                        {stage.preview}
                      </div>
                    </div>
                    <div className="mt-4 flex flex-col gap-1.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-x-5">
                      <h3 className="flex items-baseline gap-2.5 font-serif text-[clamp(1.35rem,2.3vw,1.65rem)] leading-tight">
                        <span className={`stage-year ${stage.tone}`}>
                          {stage.year}
                        </span>
                        {stage.title}
                      </h3>
                      <p className="lp-soft text-[13px] leading-6">
                        {stage.hint}
                      </p>
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section
          id="privacy"
          className="landing-band scroll-mt-6 px-4 py-24 sm:px-8 lg:py-28"
        >
          <div className="mx-auto w-full max-w-[780px]">
            <Reveal>
              <div className="landing-section-head">
                <p className="landing-eyebrow">关于数据 写在前面</p>
                <h2 className="mx-auto mt-4 font-serif text-[clamp(2.2rem,4.8vw,3.4rem)] leading-[1.2] tracking-[0.01em]">
                  你的档案 只留在这台电脑
                </h2>
                <p className="lp-soft mx-auto mt-5 max-w-[38rem] text-[14.5px] leading-8">
                  没有账号 没有云端数据库 也没有后台攒数据 内容停在浏览器 IndexedDB 只有你主动粘贴或上传的那段材料会在需要时递给模型
                </p>
                <p className="lp-faint mt-6 font-mono text-[10.5px] tracking-[0.08em]">
                  —— 学径，给本科生的四年档案
                </p>
              </div>
            </Reveal>

            <Reveal delay={100}>
              <dl className="mt-10 grid gap-3">
                {PRIVACY_FACTS.map((fact, index) => (
                  <div
                    key={fact.title}
                    className="lp-glass rounded-2xl px-5 py-5 sm:px-6"
                  >
                    <dt className="flex items-baseline gap-3">
                      <span className="lp-faint font-mono text-[10px] tracking-[0.16em]">
                        0{index + 1}
                      </span>
                      <span className="text-[13px] leading-5 font-medium">
                        {fact.title}
                      </span>
                    </dt>
                    <dd className="lp-soft mt-2 text-[13px] leading-6">
                      {fact.text}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="lp-faint mt-4 text-center text-[11px] leading-5">
                本页数字与截图均为示例数据 真实数据只在你的浏览器里
              </p>
            </Reveal>
          </div>
        </section>

        <section
          id="faq"
          className="scroll-mt-6 px-4 py-24 sm:px-8 lg:py-28"
        >
          <div className="mx-auto w-full max-w-[780px]">
            <Reveal>
              <div className="landing-section-head">
                <p className="landing-eyebrow">常见问题</p>
                <h2 className="mx-auto mt-3 font-serif text-[clamp(2rem,4vw,3rem)] leading-[1.2]">
                  先把疑问说清楚
                </h2>
                <p className="lp-soft mx-auto mt-4 max-w-[26rem] text-[13.5px] leading-7">
                  没有注册 没有后台 也不替你编经历
                </p>
              </div>
            </Reveal>

            <Reveal delay={90}>
              <div className="mt-10 grid gap-2.5">
                {FAQS.map((item) => (
                  <details key={item.q} className="faq-item lp-glass rounded-2xl">
                    <summary>
                      <span>{item.q}</span>
                      <span aria-hidden="true" className="faq-mark">
                        +
                      </span>
                    </summary>
                    <p>{item.a}</p>
                  </details>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        <section className="landing-close px-4 py-24 sm:px-8 lg:py-28">
          <div className="mx-auto w-full max-w-[780px] text-center">
            <Reveal>
              <p className="landing-eyebrow">开始 不用等开学</p>
              <h2 className="mx-auto mt-4 max-w-[36rem] font-serif text-[clamp(2.4rem,6vw,4.2rem)] leading-[1.12] tracking-[0.01em]">
                从今天开始，
                <br />
                留下第一条记录
              </h2>
              <p className="close-soft mx-auto mt-5 max-w-[30rem] text-[14px] leading-8">
                不用先填完课表 也不要求注册 先看示例再换成你自己的
              </p>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
                <StartButton
                  state={state}
                  pending={pending}
                  mode="fresh"
                  variant="close"
                  size="lg"
                  onClick={() => void handleStart("fresh")}
                />
                <StartButton
                  state={state}
                  pending={pending}
                  mode="demo"
                  variant="close-quiet"
                  size="lg"
                  onClick={() => void handleStart("demo")}
                />
              </div>
              <p className="close-soft mt-3 font-mono text-[10.5px] tracking-[0.06em]">
                无需注册 数据只存本机 随时可清除
              </p>
            </Reveal>

            <Reveal delay={100}>
              <ol className="landing-close-steps landing-close-steps--stack">
                {STEPS.map((step) => (
                  <li
                    key={step.no}
                    className="landing-close-step lp-glass text-left"
                  >
                    <p className="close-soft font-mono text-[10px] tracking-[0.18em]">
                      {step.no}
                    </p>
                    <p className="mt-2 font-serif text-[18px] leading-none">
                      {step.title}
                    </p>
                    <p className="close-soft mt-1.5 text-[12px] leading-6">
                      {step.text}
                    </p>
                  </li>
                ))}
              </ol>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="px-4 pt-16 pb-14 sm:px-8">
        <div className="mx-auto flex w-full max-w-[780px] flex-col items-center gap-8 border-t border-[color:var(--lp-line)] pt-10 text-center">
          <div>
            <div className="flex items-center justify-center gap-3">
              <BrandMark size={36} className="landing-brand-mark shrink-0" />
              <span className="flex items-baseline gap-2">
                <span className="font-serif text-[22px] leading-none tracking-[0.02em]">
                  学径
                </span>
                <span className="lp-faint font-mono text-[9px] tracking-[0.18em]">
                  STUDYTRACK
                </span>
              </span>
            </div>
            <p className="lp-soft mx-auto mt-4 max-w-[30rem] text-[13px] leading-7 text-pretty">
              每天 30 秒 把大学四年变成一份可验证的履历 数据只存在你的浏览器
            </p>
          </div>

          <nav
            aria-label="页脚导航"
            className="flex flex-wrap justify-center gap-2"
          >
            {FOOTER_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="lp-glass lp-soft inline-flex min-h-11 items-center rounded-full px-4 text-[13px] underline-offset-4 hover:text-[color:var(--lp-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--lp-accent)]"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="lp-faint flex w-full flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-[color:var(--lp-line)] pt-5 text-[11px]">
            <span className="font-mono tracking-[0.06em]">学径 StudyTrack 2026</span>
            <span>无账号 无云端数据库 无第三方追踪</span>
            <a
              href="#main"
              className="inline-flex min-h-11 items-center underline-offset-4 hover:text-[color:var(--lp-ink)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--lp-accent)]"
            >
              回到顶部 ↑
            </a>
          </div>
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
  theme: ThemeId;
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
      className="lp-theme-toggle inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full px-4 text-[12.5px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--lp-accent)] lg:min-h-12 lg:px-5"
    >
      <span
        aria-hidden="true"
        className="h-3 w-3 rounded-full border border-black/10"
        style={{ backgroundImage: current.swatch }}
      />
      <span className="hidden min-[360px]:inline">{current.name}</span>
    </button>
  );
}

function StartButton({
  state,
  pending,
  mode,
  variant,
  size,
  onClick,
}: {
  state: StartState;
  pending: "fresh" | "demo" | null;
  mode: "fresh" | "demo";
  variant: "primary" | "secondary" | "close" | "close-quiet";
  size: "sm" | "lg";
  onClick: () => void;
}) {
  const loading = state === "loading" && pending === mode;
  const label = mode === "demo" ? "先看示例" : "开始使用";
  const loadingLabel = mode === "demo" ? "正在准备示例" : "正在打开";
  const variantClass = {
    primary: "start-button",
    secondary: "lp-theme-toggle",
    close: "close-primary",
    "close-quiet": "close-secondary",
  }[variant];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={state === "loading"}
      className={[
        "inline-flex items-center justify-center rounded-full font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--lp-accent)] disabled:cursor-wait disabled:opacity-60",
        variantClass,
        size === "lg" ? "min-h-12 px-7 text-[15px]" : "min-h-11 px-5 text-[14px]",
      ].join(" ")}
    >
      {loading ? loadingLabel : label}
    </button>
  );
}

function TodayPreview() {
  const [firstTask] = DEMO.pendingRows;
  const sessions = DEMO.todaySessions.slice(0, 3);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-baseline justify-between gap-2">
        <span className="lp-faint text-[9px] tracking-[0.08em]">
          {DEMO.briefing}
        </span>
        <span className="lp-fill lp-soft rounded-full px-1.5 py-0.5 text-[8px]">
          {DEMO.pendingCount} 项待办
        </span>
      </div>

      <p className="mt-2 truncate text-[11px] leading-4 font-medium">
        {DEMO.judgment.line}
      </p>
      {DEMO.judgment.detail && (
        <p className="lp-soft mt-0.5 truncate text-[8.5px] leading-3">
          {DEMO.judgment.detail}
        </p>
      )}

      <div className="mt-2 space-y-1.5">
        {sessions.length > 0 ? (
          sessions.map((item) => (
            <div
              key={`${item.name}-${item.periods}`}
              className="lp-fill lp-hairline-soft rounded-lg border px-2 py-1.5"
            >
              <p className="text-[10px] leading-4 font-medium">{item.name}</p>
              <p className="lp-faint truncate text-[8px] leading-3">
                {item.periods} {item.location}
              </p>
            </div>
          ))
        ) : (
          <p className="lp-faint text-[9px] leading-4">
            {DEMO.weekLabel} 今天没有课
          </p>
        )}
      </div>

      {firstTask && (
        <div className="lp-hairline mt-auto border-t pt-1.5">
          <p className="lp-faint flex items-baseline justify-between gap-2 text-[8px]">
            <span>先做这件</span>
            <span className={firstTask.tierText ? "lp-alert" : ""}>
              {firstTask.tierText || firstTask.kindLabel}
            </span>
          </p>
          <p className="lp-soft mt-0.5 flex items-baseline justify-between gap-2 text-[9px]">
            <span className="truncate">{firstTask.title}</span>
            <span className="lp-faint shrink-0 text-[8px]">
              {firstTask.dueLabel || "未填截止"}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}

function ExperiencePreview() {
  const record = FEATURED_EXPERIENCE;
  if (!record) {
    return (
      <div className="flex h-full items-center">
        <p className="lp-faint text-[10px]">还没有战绩 先到征途记一条</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="lp-faint text-[8px] leading-3">
            {record.kindLabel} {record.range}
          </p>
          <p className="mt-0.5 truncate text-[11px] leading-4 font-medium">
            {record.title}
          </p>
          {record.org && (
            <p className="lp-faint mt-0.5 truncate text-[8px] leading-3">
              {record.org}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span aria-hidden="true" className="flex items-center gap-1">
            {[0, 1, 2, 3].map((index) => (
              <span
                key={index}
                className={`shot-pip ${index < record.stars ? "is-on" : ""}`}
              />
            ))}
          </span>
          <span className="lp-faint text-[8px]">{record.tierText}</span>
        </div>
      </div>

      <div className="mt-2 grid flex-1 grid-cols-2 gap-1.5">
        {record.parts.map((part) => (
          <div
            key={part.label}
            className="lp-fill lp-hairline-soft min-w-0 rounded-md border px-1.5 py-1"
          >
            <p className="lp-faint text-[7.5px] leading-3">{part.label}</p>
            <p className="lp-soft mt-0.5 truncate text-[8.5px] leading-3">
              {part.text.trim() || "未填"}
            </p>
          </div>
        ))}
      </div>

      <div className="lp-hairline mt-2 flex items-baseline justify-between gap-2 border-t pt-1.5">
        <span className="lp-faint min-w-0 truncate text-[8px]">
          证据 {record.evidence.length} 条{" "}
          {record.metrics.length > 0
            ? `量化 ${record.metrics.length} 项`
            : "原文未提供量化数据"}
        </span>
        <span
          className={`shrink-0 text-[8px] ${record.ready ? "lp-soft" : "lp-alert"}`}
        >
          {record.ready
            ? "简历就绪"
            : `差 ${record.missing.slice(0, 2).join(" ")}`}
        </span>
      </div>
    </div>
  );
}

function ToolboxPreview() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-baseline justify-between">
        <span className="lp-faint text-[9px] tracking-[0.08em]">
          {TOOL_ROWS.length} 件工具
        </span>
        <span className="lp-faint text-[8px]">需要时打开</span>
      </div>
      <ul className="mt-2 grid flex-1 grid-rows-4 gap-1.5">
        {TOOL_ROWS.map((tool) => (
          <li
            key={tool.no}
            className="lp-fill lp-hairline-soft flex items-center gap-1.5 rounded-md border px-1.5"
          >
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
              style={{ backgroundColor: tool.tone }}
            />
            <span className="text-[9px] leading-3 font-medium">
              {tool.label}
            </span>
            <span className="lp-faint ml-auto min-w-0 truncate text-[7px] leading-3">
              {tool.hint}
            </span>
          </li>
        ))}
      </ul>
      <p className="lp-hairline lp-faint mt-2 border-t pt-1.5 text-[8px]">
        数据只在本机 换设备前先导出
      </p>
    </div>
  );
}

function MatchPreview() {
  const job = DEMO.jobs[0];
  if (!job) {
    return (
      <div className="flex h-full items-center">
        <p className="lp-faint text-[10px]">岗位库为空 到征召粘贴一份 JD</p>
      </div>
    );
  }

  const [hit] = job.hits;
  const [gap] = job.gaps;

  return (
    <div className="flex h-full flex-col">
      <p className="lp-faint font-mono text-[8px] tracking-[0.08em]">
        {job.company} {job.cohort}
      </p>
      <p className="mt-0.5 truncate text-[11px] leading-4 font-medium">
        {job.title}
      </p>
      <p className="lp-faint mt-0.5 truncate text-[8px] leading-3">
        {job.typeLabel} {job.city} {job.gradeFit} {job.qual}
      </p>

      <div className="mt-2 flex items-center gap-2">
        <span className="font-serif text-[20px] leading-none tabular-nums">
          {job.score}
        </span>
        <span className="lp-fill h-1 flex-1 overflow-hidden rounded-full">
          <span
            className="lp-accent-fill block h-full rounded-full"
            style={{ width: `${job.score}%` }}
          />
        </span>
        <span className="lp-faint shrink-0 text-[8px]">{job.tierLabel}</span>
      </div>

      <div className="lp-soft mt-2 space-y-1 text-[8px] leading-3">
        {hit && (
          <p className="flex gap-2">
            <span className="lp-faint shrink-0">命中</span>
            <span className="min-w-0 truncate">
              {hit.requirement} 「{hit.quote}」
            </span>
          </p>
        )}
        {gap && (
          <p className="flex gap-2">
            <span className="lp-alert shrink-0">待补</span>
            <span className="min-w-0 truncate">
              {gap.requirement} {gap.advice}
            </span>
          </p>
        )}
      </div>

      <p className="lp-hairline lp-faint mt-auto border-t pt-1.5 text-[8px]">
        按 {DEMO.readyForMatchCount} 条简历就绪的战绩判定 命中指回原文
      </p>
    </div>
  );
}

function SpacePreview() {
  const space = DEMO.space;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-baseline justify-between gap-2">
        <span className="lp-faint text-[9px] tracking-[0.08em]">留痕星图</span>
        <span className="lp-fill lp-soft rounded-full px-1.5 py-0.5 text-[8px]">
          {space.todayLit ? "今天已点亮" : "今天还没点亮"}
        </span>
      </div>

      <div className="demo-sky demo-sky--mini mt-2 flex-1">
        <svg className="demo-sky-lines" viewBox="0 0 100 100" preserveAspectRatio="none">
          {space.constellation.lines.map(([from, to], index) => {
            const a = space.constellation.points[from];
            const b = space.constellation.points[to];
            return (
              <line
                key={index}
                x1={a.x * 100}
                y1={a.y * 100}
                x2={b.x * 100}
                y2={b.y * 100}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>
        <span className="demo-sky-rose" />
        {space.points.map((point) => (
          <span
            key={point.key}
            className={`demo-sky-star ${point.isToday ? "is-today" : ""}`}
            style={
              {
                left: `${point.x}%`,
                top: `${point.y}%`,
                "--c": point.color,
                "--r": `${3.4 + Math.min(point.count, 3) * 0.9}px`,
              } as CSSProperties
            }
          />
        ))}
        {space.meteorCount > 0 && (
          <span className="demo-sky-meteor" style={{ left: "54%", top: "18%" }} />
        )}
        <p className="demo-sky-name">{space.constellation.name}</p>
      </div>

      <ul className="mt-2 space-y-0.5">
        {space.recent.slice(0, 2).map((star, index) => (
          <li
            key={star.key}
            className={`demo-sky-recent flex items-baseline justify-between gap-2 px-1.5 text-[8px] ${
              index === 0 ? "is-on" : ""
            }`}
          >
            <span className="lp-soft truncate font-mono">
              {star.label} {star.isToday ? "今天" : ""}
            </span>
            <span className="lp-faint shrink-0 tabular-nums">{star.count} 条</span>
          </li>
        ))}
      </ul>

      <p className="lp-hairline lp-faint mt-auto border-t pt-1.5 text-[8px]">
        点亮 {space.litCount} 天 留痕 {space.totalEvents} 条 每天只点亮一次
      </p>
    </div>
  );
}
