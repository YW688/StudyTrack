import {
  useRef,
  type CSSProperties,
  type KeyboardEvent,
} from "react";

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
    char: "账",
    name: "账本",
    hint: "课程设计 比赛 实习",
    tone: "var(--lp-tone-4)",
  },
  {
    id: "bounty",
    no: "03",
    char: "悬",
    name: "悬赏",
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
        <p className="demo-titlebar-title">学径 · 第 8 周 · 周日</p>
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
            <p className="demo-crumb">
              {activeFace.name} / {activeFace.no}
            </p>
            <div className="flex items-center gap-2">
              <span className="demo-agent">记录官</span>
              <span className="demo-meta">2026 年 11 月 1 日</span>
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
    title: "外部中断指示灯 · 实验报告",
    meta: "实验课 · 明天 23:59",
    tag: "待交",
    done: false,
    alert: true,
  },
  {
    title: "智能机器人 · 第 3 次实验预习",
    meta: "课程 · 今天 18:00",
    tag: "在做",
    done: false,
    alert: false,
  },
  {
    title: "大学英语 · 作文二稿",
    meta: "已提交 · 昨天 22:14",
    tag: "完成",
    done: true,
    alert: false,
  },
];

const SETTLEMENT = [
  { label: "完成作业", value: 2 },
  { label: "新增战绩", value: 1 },
  { label: "补充证据", value: 3 },
  { label: "留下记录", value: 1 },
];

const WEEK_CELLS = [
  { day: "一", on: true, today: false },
  { day: "二", on: true, today: false },
  { day: "三", on: true, today: false },
  { day: "四", on: true, today: false },
  { day: "五", on: true, today: false },
  { day: "六", on: false, today: false },
  { day: "日", on: false, today: true },
];

function TodayPanel() {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
      <div className="min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <p className="demo-label">01 · 今日判词</p>
          <p className="demo-label">11 月 1 日 · 周日</p>
        </div>
        <p className="mt-2 max-w-[26rem] font-serif text-[clamp(1.1rem,2.1vw,1.5rem)] leading-[1.45]">
          今天只差一件事：把外部中断指示灯的实验报告写完。
        </p>
        <p className="lp-soft mt-1.5 max-w-[27rem] text-[12px] leading-6">
          上午两节智能机器人，下午空出来写报告。写完，这一周就算收好了。
        </p>

        <div className="lp-hairline mt-3 flex items-baseline justify-between border-t pt-2">
          <p className="demo-label">02 · 今日委托</p>
          <span className="demo-label">3 项</span>
        </div>

        <ul className="mt-0.5">
          {TODAY_TASKS.map((task) => (
            <li
              key={task.title}
              className="lp-hairline-soft flex items-start gap-2.5 border-b py-2 last:border-b-0"
            >
              <span
                aria-hidden="true"
                className={`demo-square ${task.done ? "is-done" : ""}`}
              />
              <span className="min-w-0 flex-1">
                <span
                  className={`block text-[12.5px] leading-5 ${task.done ? "lp-faint line-through" : ""}`}
                >
                  {task.title}
                </span>
                <span className="lp-faint mt-0.5 block text-[10.5px] leading-4">
                  {task.meta}
                </span>
              </span>
              <span
                className={`demo-tag shrink-0 ${task.alert ? "demo-tag--alert" : ""}`}
              >
                {task.tag}
              </span>
            </li>
          ))}
        </ul>

        <div className="demo-capture mt-3">
          <span aria-hidden="true" className="demo-capture-dot" />
          <p className="lp-faint min-w-0 flex-1 truncate text-[12px]">
            今天做了什么？一句话也行
          </p>
          <span className="demo-capture-key">Enter 记一条</span>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <section className="demo-subpanel">
          <div className="flex items-baseline justify-between gap-2">
            <p className="demo-label">03 · 昨日结算</p>
            <p className="demo-label">10 月 31 日</p>
          </div>
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
          <p className="demo-meta mt-2">产生结果 5 件 · 连续 6 天</p>
        </section>

        <section className="demo-subpanel">
          <div className="flex items-baseline justify-between gap-2">
            <p className="demo-label">本周绿格</p>
            <p className="demo-label">5 / 7</p>
          </div>
          <div className="mt-2 flex gap-1.5">
            {WEEK_CELLS.map((cell) => (
              <span
                key={cell.day}
                aria-hidden="true"
                className={`demo-weekcell ${cell.on ? "is-on" : ""} ${cell.today ? "is-today" : ""}`}
              >
                {cell.day}
              </span>
            ))}
          </div>
          <p className="demo-meta mt-2">只算产生结果的动作</p>
        </section>

        <section className="demo-subpanel">
          <p className="demo-label">回声</p>
          <p className="mt-1.5 font-serif text-[13px] leading-6">
            去年今天 · 数学建模校赛
          </p>
          <p className="lp-faint mt-0.5 text-[11px] leading-5">
            “22 页论文，3 人队，校赛二等奖。”
          </p>
        </section>
      </div>
    </div>
  );
}

const LEDGER_PARTS = [
  { label: "问题", text: "选课高峰易超选" },
  { label: "方法", text: "E-R 建模 · 事务控制" },
  { label: "贡献", text: "12 张表 · 6 个页面" },
  { label: "结果", text: "200 人并发无超选" },
];

const LEDGER_SKILLS = ["MySQL", "Java", "事务"];

const TIMELINE = [
  { date: "2026.10", title: "数学建模校赛 · 校二等奖", kind: "竞赛" },
  { date: "2026.06", title: "校园选课系统 · 课程设计", kind: "课程" },
  { date: "2025.09", title: "院学生会技术组 · 现场组", kind: "志愿" },
];

const HEAT = [
  0, 1, 0, 2, 1, 1, 0, 2, 1, 1, 0, 0,
  1, 2, 0, 1, 2, 1, 0, 1, 0, 1, 1, 2,
  1, 0, 1, 2, 1, 0, 2, 1, 1, 0, 1, 1,
  2, 1, 0, 1, 1, 2, 0, 1, 2, 1, 0, 1,
  1, 2, 1, 0, 1, 1, 2, 1, 0, 1, 1, 1,
];

function LedgerPanel() {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
      <article className="demo-subpanel flex min-w-0 flex-col">
        <div className="flex items-start justify-between gap-2">
          <span className="demo-tag">课程设计 · 2026 年 6 月</span>
          <span className="demo-meta flex shrink-0 items-center gap-1.5">
            <span aria-hidden="true" className="demo-capture-dot" />
            已确认
          </span>
        </div>
        <h3 className="mt-2 font-serif text-[20px] leading-tight">
          校园选课系统
        </h3>
        <p className="lp-faint mt-0.5 text-[11px] leading-5">
          数据库原理 · 个人项目 · 12 张表
        </p>

        <dl className="lp-hairline mt-3 grid grid-cols-2 overflow-hidden rounded-lg border">
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

        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1">
            {LEDGER_SKILLS.map((skill) => (
              <span
                key={skill}
                className="lp-soft lp-fill rounded-[4px] px-1.5 py-0.5 text-[10px]"
              >
                {skill}
              </span>
            ))}
          </div>
          <span className="demo-meta">证据 2 · 量化 3</span>
        </div>

        <p className="lp-faint mt-auto border-t border-[color:var(--lp-line-soft)] pt-3 text-[10.5px] leading-5">
          想改哪一段就点开哪一段，原文和证据都留在这一条里。
        </p>
      </article>

      <div className="flex flex-col gap-2.5">
        <section className="demo-subpanel">
          <div className="flex items-baseline justify-between gap-2">
            <p className="demo-label">时间线</p>
            <p className="demo-label">8 条</p>
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
                    {item.date} · {item.kind}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="demo-subpanel">
          <div className="flex items-baseline justify-between gap-2">
            <p className="demo-label">留痕</p>
            <p className="demo-label">近 12 周</p>
          </div>
          <div className="demo-heat mt-2" aria-hidden="true">
            {HEAT.map((level, index) => (
              <span
                key={index}
                className="demo-heat-cell"
                data-level={level}
              />
            ))}
          </div>
          <p className="demo-meta mt-2">有结果的日子才有格</p>
        </section>

        <section className="demo-subpanel">
          <div className="flex items-baseline justify-between gap-2">
            <p className="demo-label">简历就绪度</p>
            <p className="font-serif text-[15px] leading-none tabular-nums">72%</p>
          </div>
          <div className="lp-fill mt-2 h-1 overflow-hidden rounded-full">
            <span className="lp-accent-fill block h-full w-[72%] rounded-full" />
          </div>
          <p className="demo-meta mt-2">还差 2 个技能标签</p>
        </section>
      </div>
    </div>
  );
}

const JOBS = [
  { title: "数据分析实习生", meta: "杭州 · 2027 届", score: 86 },
  { title: "数据运营实习生", meta: "上海 · 2027 届", score: 78 },
  { title: "后端开发实习生", meta: "杭州 · 2027 届", score: 71 },
];

const MATCH_HITS = [
  { requirement: "Python 数据分析", quote: "数学建模校赛 · 22 页论文" },
  { requirement: "MySQL 数据库设计", quote: "选课系统 · 12 张表" },
];

function BountyPanel() {
  return (
    <div>
      <div className="lp-hairline flex flex-wrap items-center gap-2 rounded-full border px-3 py-1.5">
        <span className="demo-label shrink-0">检索</span>
        <span className="text-[12px] leading-5 font-medium">
          数据分析 · 杭州 · 2027 届
        </span>
        <span className="demo-meta ml-auto shrink-0">42 条</span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {["全部", "数据", "后端", "产品"].map((filter, index) => (
          <span
            key={filter}
            className={`demo-chip ${index === 0 ? "is-on" : ""}`}
          >
            {filter}
          </span>
        ))}
        <span className="demo-chip ml-auto">粘贴 JD 匹配</span>
      </div>

      <div className="mt-2.5 grid gap-3 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <ul className="space-y-1">
          {JOBS.map((job, index) => (
            <li
              key={job.title}
              className={`demo-job flex items-center justify-between gap-2 ${index === 0 ? "is-on" : ""}`}
            >
              <span className="min-w-0">
                <span className="block truncate text-[12px] leading-5 font-medium">
                  {job.title}
                </span>
                <span className="lp-faint block truncate text-[10px] leading-4">
                  {job.meta}
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
              <p className="truncate text-[13px] leading-5 font-medium">
                数据分析实习生
              </p>
              <p className="lp-faint text-[10.5px] leading-4">
                杭州 · 2027 届 · 官方校招入口
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
                  下学期补 · 匹配依据指回经历原文
                </p>
              </div>
            </div>
          </div>

          <p className="demo-meta mt-auto border-t border-[color:var(--lp-line-soft)] pt-2">
            来源人工核对 · 不代投 · 每条命中指回原文
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
    hint: "Excel 导入 · 单双周展开",
    meta: "12 门课",
    tone: "var(--lp-tone-2)",
  },
  {
    no: "02",
    name: "作业",
    hint: "截图、粘贴或手动录入",
    meta: "3 项待交",
    tone: "var(--lp-tone-3)",
  },
  {
    no: "03",
    name: "简历",
    hint: "勾选经历 · 浏览器打印 A4",
    meta: "快照 v3",
    tone: "var(--lp-tone-5)",
  },
  {
    no: "04",
    name: "日历",
    hint: "竞赛 · 考试 · 校内节点",
    meta: "15 条",
    tone: "var(--lp-tone-1)",
  },
];

const WEEK_SUMMARY = [
  { label: "本周课程", value: "8 节" },
  { label: "待交作业", value: "3 项" },
  { label: "日历条目", value: "15 条" },
];

function ToolboxPanel() {
  return (
    <div>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="grid grid-cols-2 gap-2.5">
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

        <div className="flex flex-col gap-2.5">
          <section className="demo-subpanel">
            <p className="demo-label">本周</p>
            <div className="mt-2 space-y-1.5">
              {WEEK_SUMMARY.map((row) => (
                <p
                  key={row.label}
                  className="flex items-baseline justify-between gap-2 text-[11.5px] leading-5"
                >
                  <span className="lp-soft">{row.label}</span>
                  <span className="font-mono text-[10.5px] tabular-nums">
                    {row.value}
                  </span>
                </p>
              ))}
            </div>
          </section>

          <section className="demo-subpanel">
            <p className="demo-label">最近截止</p>
            <p className="mt-1.5 text-[12px] leading-5">
              外部中断指示灯 · 实验报告
            </p>
            <p className="lp-alert mt-0.5 font-mono text-[10px]">
              明天 23:59 · 待交
            </p>
          </section>

          <section className="demo-subpanel">
            <p className="demo-label">数据与备份</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="demo-chip">导出 JSON</span>
              <span className="demo-chip">导入</span>
              <span className="demo-chip">清除本机数据</span>
            </div>
            <p className="demo-meta mt-2">只存在这台设备</p>
          </section>
        </div>
      </div>

      <p className="lp-faint mt-3 text-[10.5px] leading-5">
        课表、作业、简历、日历都不占今日的注意力，需要时再打开。
      </p>
    </div>
  );
}
