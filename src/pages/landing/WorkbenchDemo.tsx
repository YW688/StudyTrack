import {
  useRef,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { briefingSegment } from "../../lib/today";

export const DEMO_FACES = [
  {
    id: "today",
    no: "01",
    char: "今",
    name: "今日",
    hint: "今天上什么 交什么",
    tone: "var(--lp-tone-1)",
  },
  {
    id: "ledger",
    no: "02",
    char: "途",
    name: "征途",
    hint: "课程设计 比赛 实习",
    tone: "var(--lp-tone-4)",
  },
  {
    id: "bounty",
    no: "03",
    char: "征",
    name: "征召",
    hint: "按经历找实习",
    tone: "var(--lp-tone-6)",
  },
  {
    id: "toolbox",
    no: "04",
    char: "箱",
    name: "工具箱",
    hint: "课表 作业 简历 日历",
    tone: "var(--lp-tone-2)",
  },
] as const;

export type FaceId = (typeof DEMO_FACES)[number]["id"];

interface WorkbenchDemoProps {
  active: FaceId;
  onChange: (face: FaceId) => void;
}

export default function WorkbenchDemo({
  active,
  onChange,
}: WorkbenchDemoProps) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeFace = DEMO_FACES.find((face) => face.id === active) ?? DEMO_FACES[0];

  function handleTabKeys(event: KeyboardEvent<HTMLDivElement>) {
    const isNext = event.key === "ArrowDown" || event.key === "ArrowRight";
    const isPrev = event.key === "ArrowUp" || event.key === "ArrowLeft";
    if (!isNext && !isPrev && event.key !== "Home" && event.key !== "End") {
      return;
    }
    event.preventDefault();
    const count = DEMO_FACES.length;
    const current = DEMO_FACES.findIndex((face) => face.id === active);
    let next = current;
    if (event.key === "Home") next = 0;
    else if (event.key === "End") next = count - 1;
    else next = (current + (isNext ? 1 : -1) + count) % count;
    const face = DEMO_FACES[next];
    if (!face) return;
    onChange(face.id);
    tabRefs.current[next]?.focus();
  }

  return (
    <div className="demo-window" id="demo-window">
      <div className="demo-titlebar">
        <span aria-hidden="true" className="demo-dots">
          <span className="demo-dot" style={{ background: "var(--lp-tone-6)" }} />
          <span className="demo-dot" style={{ background: "var(--lp-tone-2)" }} />
          <span className="demo-dot" style={{ background: "var(--lp-tone-4)" }} />
        </span>
        <p className="demo-titlebar-title">学径 第 8 周 周一</p>
        <span className="demo-titlebar-chip">示例数据</span>
      </div>

      <div className="demo-window-body">
        <aside className="demo-rail">
          <div className="demo-rail-brand" aria-hidden="true">
            <span className="font-serif text-[15px] tracking-[0.06em]">学径</span>
            <span className="lp-faint font-mono text-[8px] tracking-[0.16em]">
              STUDYTRACK
            </span>
          </div>
          <p className="demo-rail-label">四个面</p>

          <div
            role="tablist"
            aria-label="工作台四个面"
            className="demo-rail-nav"
            onKeyDown={handleTabKeys}
          >
            {DEMO_FACES.map((face, index) => {
              const selected = face.id === active;
              return (
                <button
                  key={face.id}
                  ref={(node) => {
                    tabRefs.current[index] = node;
                  }}
                  type="button"
                  role="tab"
                  id={`demo-tab-${face.id}`}
                  aria-selected={selected}
                  aria-controls={`demo-panel-${face.id}`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => onChange(face.id)}
                  className="demo-rail-item"
                  style={{ "--tone": face.tone } as CSSProperties}
                >
                  <span aria-hidden="true" className="demo-rail-char">
                    {face.char}
                  </span>
                  <span className="min-w-0 text-left">
                    <span className="block text-[13px] leading-tight font-medium">
                      {face.name}
                    </span>
                    <span className="demo-rail-hint lp-faint block truncate text-[10.5px] leading-tight">
                      {face.hint}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="demo-rail-foot">
            <span>数据存本机</span>
            <span>刚刚保存</span>
          </div>
        </aside>

        <div className="demo-main">
          <div className="demo-toolbar">
            <p className="demo-crumb">{activeFace.name}</p>
            <div className="flex items-center gap-2">
              <span className="demo-agent">记录官</span>
              <span className="demo-meta">2026 年 11 月 2 日</span>
            </div>
          </div>

          <div
            key={active}
            id={`demo-panel-${active}`}
            role="tabpanel"
            aria-labelledby={`demo-tab-${active}`}
            tabIndex={0}
            className="demo-content demo-fade"
          >
            {active === "today" ? (
              <TodayPanel />
            ) : active === "ledger" ? (
              <LedgerPanel />
            ) : active === "bounty" ? (
              <BountyPanel />
            ) : (
              <ToolboxPanel />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const TODAY_TASKS = [
  {
    title: "外部中断指示灯 实验报告",
    meta: "实验课",
    due: "明天 23:59",
    tier: "24 小时内",
    priority: true,
  },
  {
    title: "智能机器人 第 3 次实验预习",
    meta: "课程",
    due: "今天 18:00",
    tier: "",
    priority: false,
  },
];

const DONE_TODAY = "大学英语 作文二稿";

const SETTLEMENT = [
  { label: "完成作业", value: 2 },
  { label: "新增战绩", value: 1 },
  { label: "补充证据", value: 3 },
  { label: "留下记录", value: 1 },
];

const INTEL = [
  {
    category: "考试",
    timing: "截止 11 月 9 日",
    title: "教师资格考试 面试",
    meta: "中小学教师资格考试网 大二可报",
  },
  {
    category: "竞赛",
    timing: "11 月 14 日",
    title: "全国大学生数学竞赛初赛",
    meta: "中国数学会 无年级限制",
  },
];

function TodayPanel() {
  const segment = briefingSegment();
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-2.5">
        <section className="demo-subpanel">
          <div className="flex items-baseline justify-between gap-2">
            <p className="demo-label">{segment}</p>
            <p className="demo-label">11 月 2 日 周一</p>
          </div>
          <p className="mt-2 max-w-[26rem] font-serif text-[clamp(1.1rem,2.1vw,1.5rem)] leading-[1.45]">
            把外部中断指示灯的实验报告写完
          </p>
          <div className="lp-soft mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[11.5px] leading-5">
            <span>
              <span className="lp-faint font-mono">1-2 节</span> 智能机器人
            </span>
            <span>
              <span className="lp-faint font-mono">3-4 节</span> 信号与系统
            </span>
            <span className="demo-link">课表 ↗</span>
          </div>
          <p className="mt-1 text-[11px] leading-5 text-[color:var(--lp-accent)]">
            教师资格面试 截止 11 月 9 日 顺手记进今日
          </p>

          <div className="lp-hairline mt-3 flex items-baseline justify-between border-t pt-2">
            <p className="demo-label">留痕</p>
            <span className="demo-label">今天 0 条</span>
          </div>
          <div className="demo-capture mt-1.5">
            <span aria-hidden="true" className="demo-capture-dot" />
            <p className="lp-faint min-w-0 flex-1 truncate text-[11.5px]">
              今天做了什么 一句话也行
            </p>
            <span className="shrink-0 rounded-[6px] bg-[color:var(--lp-cta)] px-2 py-1 text-[9.5px] font-medium text-[color:var(--lp-cta-ink)]">
              提交征途碎片
            </span>
          </div>
          <p className="demo-meta mt-2">
            下一级：「校园选课系统」再写 1 段四段式
          </p>
        </section>

        <section className="demo-subpanel">
          <div className="lp-hairline-soft flex items-baseline justify-between border-b pb-2">
            <p className="demo-label">委托</p>
            <span className="demo-label">2 项未完成</span>
          </div>
          <ul className="mt-0.5">
            {TODAY_TASKS.map((task) => (
              <li
                key={task.title}
                className="lp-hairline-soft flex items-start gap-2.5 border-b py-2 last:border-b-0"
              >
                <span aria-hidden="true" className="demo-square" />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-1.5">
                    <span className="text-[12.5px] leading-5">
                      {task.title}
                    </span>
                    {task.priority && (
                      <span className="demo-chip">先做这件</span>
                    )}
                  </span>
                  <span className="lp-faint mt-0.5 block text-[10.5px] leading-4">
                    {task.meta}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="lp-alert block font-mono text-[9.5px] leading-4">
                    {task.due}
                  </span>
                  {task.tier && (
                    <span className="lp-alert block font-mono text-[9.5px] leading-4">
                      {task.tier}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
          <div className="lp-fill mt-2 rounded-lg px-2.5 py-2">
            <p className="demo-label">今天已划掉 1</p>
            <p className="mt-1 flex items-center gap-1.5 text-[11px]">
              <span aria-hidden="true" className="lp-accent">
                ✓
              </span>
              <span className="lp-faint min-w-0 flex-1 truncate line-through">
                {DONE_TODAY}
              </span>
              <span className="lp-faint shrink-0 underline underline-offset-2">
                撤销
              </span>
            </p>
          </div>
        </section>
      </div>

      <div className="flex flex-col gap-2.5">
        <section className="demo-subpanel">
          <p className="demo-label">节奏</p>
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5">
            {SETTLEMENT.map((item) => (
              <div
                key={item.label}
                className="flex items-baseline justify-between gap-2"
              >
                <span className="lp-soft text-[11px]">{item.label}</span>
                <span className="font-serif text-[17px] leading-none tabular-nums">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
          <p className="demo-meta mt-2 leading-5">
            本周 5/7 天有记录 比上周同期多 1 天 连击 6 天 今天补一条就续上
          </p>
          <div className="lp-hairline mt-2 flex items-center gap-2 border-t pt-2">
            <div className="min-w-0 flex-1">
              <p className="lp-soft text-[10.5px]">档案就绪度 72/100 可出征</p>
              <div className="lp-fill mt-1 h-1 overflow-hidden rounded-full">
                <span className="lp-accent-fill block h-full w-[72%] rounded-full" />
              </div>
            </div>
            <span className="demo-link shrink-0">征途 ↗</span>
            <span className="demo-link shrink-0">简历 ↗</span>
          </div>
        </section>

        <section className="demo-subpanel">
          <div className="flex items-baseline justify-between gap-2">
            <p className="demo-label">回声</p>
            <span className="demo-link">经历库 ↗</span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="demo-tag">竞赛</span>
            <span className="demo-meta">去年今天</span>
            <span className="demo-meta">2026.09</span>
          </div>
          <p className="mt-1.5 font-serif text-[13px] leading-6">
            数学建模竞赛 校赛
          </p>
          <p className="lp-faint mt-0.5 text-[11px] leading-5">
            “22 页论文 3 人队 校赛二等奖”
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <span aria-hidden="true" className="flex gap-1">
              {[0, 1, 2, 3].map((index) => (
                <span
                  key={index}
                  className="lp-accent-fill h-1.5 w-1.5 rotate-45 rounded-[1px]"
                />
              ))}
            </span>
            <span className="demo-meta">品质 4/4 已就绪 可进简历</span>
          </div>
        </section>

        <section className="demo-subpanel">
          <div className="flex items-baseline justify-between gap-2">
            <p className="demo-label">情报</p>
            <span className="demo-link">日历 ↗</span>
          </div>
          <ul className="mt-1">
            {INTEL.map((item) => (
              <li
                key={item.title}
                className="lp-hairline-soft border-b py-2 first:pt-1 last:border-b-0 last:pb-0"
              >
                <div className="flex items-center gap-2">
                  <span className="demo-tag">{item.category}</span>
                  <span className="demo-meta ml-auto">{item.timing}</span>
                </div>
                <p className="mt-1 text-[12px] leading-5 font-medium">
                  {item.title}
                </p>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="lp-faint min-w-0 truncate text-[10px]">
                    {item.meta}
                  </span>
                  <span className="demo-chip shrink-0">记下</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

const INBOX = [
  { text: "数模国赛这周末线上答辩 记得把 PDF 传上去", time: "今天 14:20" },
];

const LEDGER_FILTERS = [
  { label: "全部", count: 6, on: true },
  { label: "课程", count: 2, on: false },
  { label: "竞赛", count: 2, on: false },
  { label: "实习", count: 1, on: false },
];

const TERMS = [
  { label: "2026 秋", count: 2 },
  { label: "2026 春", count: 3 },
  { label: "2025 秋", count: 1 },
  { label: "2025 春", count: 0 },
];

const LEDGER_PARTS = [
  { label: "问题", text: "选课高峰易超选" },
  { label: "方法", text: "E-R 建模 事务控制" },
  { label: "贡献", text: "12 张表 6 个页面" },
  { label: "结果", text: "200 人并发无超选" },
];

const LEDGER_SKILLS = ["MySQL", "Java", "事务"];

const TIMELINE = [
  { date: "2026.10", title: "数学建模校赛 校二等奖", kind: "竞赛" },
  { date: "2026.06", title: "校园选课系统 课程设计", kind: "课程" },
  { date: "2025.09", title: "院学生会技术组 现场组", kind: "志愿" },
];

function QualityPips() {
  return (
    <span aria-hidden="true" className="flex gap-1">
      {[0, 1, 2, 3].map((index) => (
        <span
          key={index}
          className="lp-accent-fill h-1.5 w-1.5 rotate-45 rounded-[1px]"
        />
      ))}
    </span>
  );
}

function LedgerPanel() {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-2.5">
        <section className="demo-subpanel">
          <div className="flex items-baseline justify-between gap-2">
            <p className="demo-label">征途碎片收件箱</p>
            <span className="demo-chip">1 条</span>
          </div>
          {INBOX.map((note) => (
            <div
              key={note.text}
              className="mt-1.5 flex items-start justify-between gap-2"
            >
              <div className="min-w-0">
                <p className="lp-soft text-[11.5px] leading-5">{note.text}</p>
                <p className="lp-faint mt-0.5 font-mono text-[9.5px]">
                  {note.time}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2 pt-0.5">
                <span className="lp-faint text-[10px] underline underline-offset-2">
                  丢弃
                </span>
                <span className="demo-chip">转成战绩</span>
              </div>
            </div>
          ))}
        </section>

        <div className="flex flex-wrap items-center gap-1.5">
          {LEDGER_FILTERS.map((filter) => (
            <span
              key={filter.label}
              className={`demo-chip ${filter.on ? "is-on" : ""}`}
            >
              {filter.label} {filter.count}
            </span>
          ))}
          <span className="demo-meta ml-auto">6 条 4 条简历就绪</span>
        </div>

        <article className="demo-subpanel">
          <div className="flex items-baseline justify-between gap-2">
            <p className="demo-meta font-mono">记于 10 月 18 日 20:14</p>
            <span className="demo-meta flex shrink-0 items-center gap-1.5">
              <span aria-hidden="true" className="demo-capture-dot" />
              本机可见
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="demo-tag">课程设计</span>
            <span className="demo-meta font-mono">2026.03 – 2026.06</span>
            <span className="lp-accent ml-auto font-mono text-[9.5px]">
              简历就绪
            </span>
          </div>
          <h3 className="mt-1.5 font-serif text-[18px] leading-tight">
            校园选课系统
          </h3>
          <p className="lp-faint mt-0.5 text-[11px] leading-5">
            数据库原理 个人项目 12 张表
          </p>

          <dl className="lp-hairline mt-2.5 grid grid-cols-2 overflow-hidden rounded-lg border">
            {LEDGER_PARTS.map((part, index) => (
              <div
                key={part.label}
                className={[
                  "min-w-0 px-2.5 py-2",
                  index < 2 ? "lp-hairline border-b" : "",
                  index % 2 === 0 ? "lp-hairline border-r" : "",
                ].join(" ")}
              >
                <dt className="demo-label">{part.label}</dt>
                <dd className="mt-1 text-[11.5px] leading-5">{part.text}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1">
              {LEDGER_SKILLS.map((skill) => (
                <span
                  key={skill}
                  className="lp-soft lp-fill rounded-full px-1.5 py-0.5 text-[10px]"
                >
                  {skill}
                </span>
              ))}
            </div>
            <span className="demo-meta">证据 2 量化 3</span>
          </div>

          <div className="lp-hairline mt-2 flex items-center justify-between gap-2 border-t pt-1.5">
            <span className="lp-faint text-[10px] underline underline-offset-2">
              编辑
            </span>
            <span className="flex items-center gap-2">
              <QualityPips />
              <span className="demo-meta">品质 4/4 已就绪</span>
            </span>
          </div>
        </article>

        <p className="demo-meta">动态只在本机生成</p>
      </div>

      <div className="flex flex-col gap-2.5">
        <section className="demo-subpanel">
          <div className="flex items-baseline justify-between gap-2">
            <p className="demo-label">学期轴</p>
            <p className="demo-label">四年经历分布</p>
          </div>
          <div className="mt-2 grid grid-cols-4 gap-1.5">
            {TERMS.map((term) => (
              <div
                key={term.label}
                className={[
                  "rounded-lg border px-2 py-1.5",
                  term.count === 0
                    ? "lp-hairline border-dashed bg-[color:var(--lp-surface)]"
                    : "lp-hairline",
                ].join(" ")}
              >
                <p className="lp-faint font-mono text-[9px]">{term.label}</p>
                <p className="mt-0.5 flex items-baseline gap-1">
                  <span
                    className={[
                      "font-serif text-[15px] leading-none tabular-nums",
                      term.count === 0 ? "lp-faint" : "",
                    ].join(" ")}
                  >
                    {term.count}
                  </span>
                  <span className="lp-faint text-[9px]">条</span>
                </p>
                {term.count === 0 ? (
                  <span className="lp-accent text-[9.5px] underline underline-offset-2">
                    补记
                  </span>
                ) : (
                  <p className="lp-faint text-[9px]">有记录</p>
                )}
              </div>
            ))}
          </div>
          <p className="demo-meta mt-2">秋季 8 月至次年 1 月 春季 2 至 7 月</p>
        </section>

        <section className="demo-subpanel">
          <div className="flex items-baseline justify-between gap-2">
            <p className="demo-label">时间线</p>
            <p className="demo-label">按学期倒序</p>
          </div>
          <ul className="mt-2 space-y-2">
            {TIMELINE.map((item) => (
              <li key={item.title} className="flex items-start gap-2">
                <span
                  aria-hidden="true"
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full border border-[color:var(--lp-line)] bg-[color:var(--lp-surface)]"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11.5px] leading-4">
                    {item.title}
                  </span>
                  <span className="lp-faint block font-mono text-[9.5px] leading-4">
                    {item.date} {item.kind}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

const BOUNTY_STATS = [
  { label: "岗位库", value: 42, note: "12 校招 30 实习" },
  { label: "高匹配", value: 8, note: "≥ 75 分" },
  { label: "可尝试", value: 14, note: "55–74 分" },
  { label: "待补技能", value: 3, note: "常见 SQL 窗口函数" },
];

const QUAL_CHIPS = [
  { label: "全部", count: 42, on: true },
  { label: "够格", count: 8, on: false },
  { label: "差一步", count: 14, on: false },
  { label: "差得多", count: 20, on: false },
];

const JOBS = [
  {
    company: "大疆",
    cohort: "2027 届",
    title: "数据分析实习生",
    meta: "实习 杭州 大二起",
    score: 86,
    qual: "够格",
  },
  {
    company: "字节跳动",
    cohort: "2027 届",
    title: "数据运营实习生",
    meta: "实习 上海 大三起",
    score: 78,
    qual: "差一步",
  },
  {
    company: "华为",
    cohort: "2027 届",
    title: "后端开发实习生",
    meta: "实习 杭州 大三起",
    score: 71,
    qual: "差一步",
  },
];

const MATCH_HITS = [
  { requirement: "Python 数据分析", quote: "数学建模校赛 22 页论文" },
  { requirement: "MySQL 数据库设计", quote: "选课系统 12 张表" },
];

function BountyPanel() {
  return (
    <div>
      <div className="grid grid-cols-4 gap-2">
        {BOUNTY_STATS.map((stat) => (
          <div key={stat.label} className="demo-subpanel px-2.5 py-2">
            <p className="demo-label">{stat.label}</p>
            <p className="mt-0.5 font-serif text-[18px] leading-none tabular-nums">
              {stat.value}
            </p>
            <p className="lp-faint mt-1 truncate text-[9px] leading-4">
              {stat.note}
            </p>
          </div>
        ))}
      </div>

      <div className="lp-hairline mt-2 flex flex-wrap items-center gap-2 rounded-full border px-3 py-1.5">
        <span className="demo-label shrink-0">检索</span>
        <span className="text-[12px] leading-5 font-medium">
          数据分析 杭州 2027 届
        </span>
        <span className="demo-meta ml-auto shrink-0">42 条</span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="demo-label">应聘资格</span>
        {QUAL_CHIPS.map((chip) => (
          <span
            key={chip.label}
            className={`demo-chip ${chip.on ? "is-on" : ""}`}
          >
            {chip.label} {chip.count}
          </span>
        ))}
        <span className="demo-chip ml-auto">粘贴 JD 匹配</span>
      </div>

      <div className="mt-2.5 grid gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <ul className="space-y-1">
          {JOBS.map((job, index) => (
            <li
              key={job.title}
              className={`demo-job flex items-start justify-between gap-2 ${index === 0 ? "is-on" : ""}`}
            >
              <span className="min-w-0">
                <span className="lp-faint block truncate font-mono text-[9.5px] leading-4">
                  {job.company} {job.cohort}
                </span>
                <span className="block truncate text-[12px] leading-5 font-medium">
                  {job.title}
                </span>
                <span className="lp-faint mt-0.5 flex items-center gap-1.5 text-[9.5px] leading-4">
                  {job.meta}
                  <span className="demo-tag">{job.qual}</span>
                </span>
              </span>
              <span
                className={`shrink-0 font-serif text-[16px] leading-none tabular-nums ${index === 0 ? "text-[color:var(--lp-accent)]" : "lp-faint"}`}
              >
                {job.score}
              </span>
            </li>
          ))}
        </ul>

        <div className="demo-subpanel flex flex-col">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="lp-faint font-mono text-[9.5px]">大疆 2027 届</p>
              <p className="truncate text-[13px] leading-5 font-medium">
                数据分析实习生
              </p>
              <p className="lp-faint text-[10.5px] leading-4">
                实习 杭州 大二起 够格
              </p>
            </div>
            <p className="shrink-0 text-right">
              <span className="font-serif text-[26px] leading-none text-[color:var(--lp-accent)] tabular-nums">
                86
              </span>
              <span className="demo-label ml-1">匹配</span>
            </p>
          </div>

          <div className="lp-fill mt-2 h-1 overflow-hidden rounded-full">
            <span className="lp-accent-fill block h-full w-[86%] rounded-full" />
          </div>

          <div className="mt-2.5 space-y-2">
            {MATCH_HITS.map((hit) => (
              <div key={hit.requirement} className="flex gap-2">
                <span className="lp-soft mt-0.5 w-[2.4em] shrink-0 font-mono text-[9.5px] tracking-[0.16em]">
                  命中
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[11.5px] leading-4">
                    {hit.requirement}
                  </p>
                  <p className="lp-faint truncate text-[10px] leading-4">
                    {hit.quote}
                  </p>
                </div>
              </div>
            ))}
            <div className="flex gap-2">
              <span className="lp-alert mt-0.5 w-[2.4em] shrink-0 font-mono text-[9.5px] tracking-[0.16em]">
                缺口
              </span>
              <div className="min-w-0">
                <p className="truncate text-[11.5px] leading-4">SQL 窗口函数</p>
                <p className="lp-faint truncate text-[10px] leading-4">
                  下学期补
                </p>
              </div>
            </div>
          </div>

          <p className="demo-meta mt-auto border-t border-[color:var(--lp-line-soft)] pt-2">
            匹配与检索都在本机完成 岗位方向人工整理 不代投
          </p>
        </div>
      </div>
    </div>
  );
}

const TOOLS = [
  {
    no: "01",
    name: "课表",
    hint: "Excel 导入 单双周展开 周视图",
    meta: "上课时间与教室",
    tone: "var(--lp-tone-2)",
  },
  {
    no: "02",
    name: "作业",
    hint: "截图 粘贴或手动录入 按 DDL 排",
    meta: "未完成与完成状态",
    tone: "var(--lp-tone-3)",
  },
  {
    no: "03",
    name: "简历",
    hint: "勾选经历自动排版 浏览器打印 A4",
    meta: "只导出你确认过的内容",
    tone: "var(--lp-tone-5)",
  },
  {
    no: "04",
    name: "日历",
    hint: "竞赛 考试报名 校内节点",
    meta: "15 条 更新于 10 月 30 日",
    tone: "var(--lp-tone-1)",
  },
];

function ToolboxPanel() {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="demo-label">工具箱</p>
        <span className="demo-link">先看日历 →</span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2.5">
        {TOOLS.map((tool) => (
          <div
            key={tool.no}
            className="demo-tile"
            style={{ "--tone": tool.tone } as CSSProperties}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="demo-label text-[color:var(--lp-ink-soft)]">
                {tool.no}
              </span>
              <span aria-hidden="true" className="lp-faint text-[11px]">
                →
              </span>
            </div>
            <p className="mt-2 font-serif text-[17px] leading-none">
              {tool.name}
            </p>
            <p className="lp-soft mt-2 text-[10.5px] leading-4">{tool.hint}</p>
            <p className="lp-faint mt-auto border-t border-[color:var(--lp-line-soft)] pt-2 text-[9.5px] leading-4">
              {tool.meta}
            </p>
          </div>
        ))}
      </div>
      <p className="demo-meta mt-3">数据只在本机 换设备前先导出</p>
    </div>
  );
}
