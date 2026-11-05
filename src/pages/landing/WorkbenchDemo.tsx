import {
  useEffect,
  useRef,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import {
  DEMO,
  FEATURED_EXPERIENCE,
  TOOL_ROWS,
} from "./demoData";

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
  {
    id: "space",
    no: "05",
    char: "星",
    name: "学径空间",
    hint: "点亮的每一天",
    tone: "var(--lp-tone-3)",
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
  const railRef = useRef<HTMLElement | null>(null);
  const activeFace = DEMO_FACES.find((face) => face.id === active) ?? DEMO_FACES[0];

  // 窄屏 rail 变成横向滚动条，只滚 rail 自己，把当前面带到视野里
  useEffect(() => {
    const rail = railRef.current;
    const index = DEMO_FACES.findIndex((face) => face.id === active);
    const tab = tabRefs.current[index];
    if (!rail || !tab) return;
    const max = rail.scrollWidth - rail.clientWidth;
    if (max <= 0) return;
    const left = tab.offsetLeft - (rail.clientWidth - tab.clientWidth) / 2;
    rail.scrollTo({ left: Math.max(0, Math.min(left, max)), behavior: "smooth" });
  }, [active]);

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
        <p className="demo-titlebar-title">
          学径 {DEMO.weekLabel} {DEMO.dayLabel}
        </p>
        <span className="demo-titlebar-chip">示例数据</span>
      </div>

      <div className="demo-window-body">
        <aside ref={railRef} className="demo-rail">
          <div className="demo-rail-brand" aria-hidden="true">
            <span className="font-serif text-[15px] tracking-[0.06em]">学径</span>
            <span className="lp-faint font-mono text-[8px] tracking-[0.16em]">
              STUDYTRACK
            </span>
          </div>
          <p className="demo-rail-label">五个面</p>

          <div
            role="tablist"
            aria-label="工作台五个面"
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
              <span className="demo-meta">{DEMO.dateLabel}</span>
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
            ) : active === "space" ? (
              <SpacePanel />
            ) : (
              <ToolboxPanel />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TodayPanel() {
  const segment = DEMO.briefing;
  const echo = DEMO.echo;
  return (
    <div className="demo-panel grid gap-3 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] lg:gap-4">
      <div className="flex min-w-0 flex-col gap-2">
        <section className="demo-subpanel demo-subpanel--parchment">
          <div className="flex items-baseline justify-between gap-2">
            <p className="demo-label">{segment}</p>
            <p className="demo-label">
              {DEMO.shortDateLabel} {DEMO.dayLabel}
            </p>
          </div>
          <p className="mt-2 max-w-[26rem] font-serif text-[clamp(1.1rem,2.1vw,1.5rem)] leading-[1.45]">
            {DEMO.judgment.line}
          </p>
          <div className="lp-soft mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[11.5px] leading-5">
            {DEMO.todaySessions.length > 0 ? (
              DEMO.todaySessions.map((item) => (
                <span key={`${item.periods}-${item.name}`}>
                  <span className="lp-faint font-mono">{item.periods}</span>{" "}
                  {item.name}
                </span>
              ))
            ) : (
              <span>{DEMO.weekLabel} 今天没有课</span>
            )}
            <span className="demo-link">课表</span>
          </div>
          {DEMO.judgment.detail && (
            <p className="lp-faint mt-1 text-[11px] leading-5">
              {DEMO.judgment.detail}
            </p>
          )}
          {DEMO.aside && (
            <p className="mt-1 text-[11px] leading-5 text-[color:var(--lp-accent)]">
              {DEMO.aside} 顺手记进今日
            </p>
          )}

          <div className="lp-hairline mt-2.5 flex items-baseline justify-between border-t pt-1.5">
            <p className="demo-label">留痕</p>
            <span className="demo-label">今天 {DEMO.captureCount} 条</span>
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
          <p className="demo-meta mt-1.5">{DEMO.levelUp}</p>
        </section>

        <section className="demo-subpanel">
          <div className="lp-hairline-soft flex items-baseline justify-between border-b pb-2">
            <p className="demo-label">委托</p>
            <span className="demo-label">{DEMO.pendingCount} 项未完成</span>
          </div>
          <ul className="mt-0.5">
            {DEMO.pendingRows.map((task, index) => (
              <li
                key={`${task.title}-${task.dueLabel}`}
                className="lp-hairline-soft flex items-start gap-2.5 border-b py-1.5 last:border-b-0 lg:py-2"
              >
                <span aria-hidden="true" className="demo-square" />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-1.5">
                    <span className="text-[12.5px] leading-5">
                      {task.title}
                    </span>
                    {index === 0 && <span className="demo-chip">先做这件</span>}
                  </span>
                  <span className="lp-faint mt-0.5 block text-[10.5px] leading-4">
                    {task.kindLabel}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="lp-alert block font-mono text-[9.5px] leading-4">
                    {task.dueLabel}
                  </span>
                  {task.tierText && (
                    <span className="lp-alert block font-mono text-[9.5px] leading-4">
                      {task.tierText}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
          <div className="lp-fill mt-2 rounded-lg px-2.5 py-2">
            <p className="demo-label">今天已划掉 {DEMO.doneToday.length}</p>
            {DEMO.doneToday.slice(0, 2).map((item) => (
              <p
                key={item.id}
                className="mt-1 flex items-center gap-1.5 text-[11px]"
              >
                <span aria-hidden="true" className="lp-accent">
                  ✓
                </span>
                <span className="lp-faint min-w-0 flex-1 truncate line-through">
                  {item.title}
                </span>
                <span className="lp-faint shrink-0 underline underline-offset-2">
                  撤销
                </span>
              </p>
            ))}
          </div>
        </section>
      </div>

      <div className="demo-aux">
        <section className="demo-subpanel">
          <p className="demo-label">节奏</p>
          <p className="demo-label mt-2">昨日结算</p>
          <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1.5">
            {DEMO.settlement.map((item) => (
              <div
                key={item.label}
                className="flex items-baseline justify-between gap-2"
              >
                <span className="lp-soft text-[11px]">{item.label}</span>
                <span
                  className={`font-serif text-[17px] leading-none tabular-nums ${
                    item.value > 0 ? "" : "lp-faint"
                  }`}
                >
                  {item.value}
                </span>
              </div>
            ))}
          </div>
          {DEMO.settlementEmpty && (
            <p className="demo-meta mt-1.5">昨天没有留痕 今天补一条</p>
          )}
          <p className="demo-meta mt-2 leading-5">
            {DEMO.weekLine} {DEMO.streakLine}
          </p>
          <div className="lp-hairline mt-2 flex items-center gap-2 border-t pt-2">
            <div className="min-w-0 flex-1">
              <p className="lp-soft text-[10.5px]">
                档案就绪度 {DEMO.readinessScore}/100 {DEMO.readinessLabel}
              </p>
              <div className="lp-fill mt-1 h-1 overflow-hidden rounded-full">
                <span
                  className="lp-accent-fill block h-full rounded-full"
                  style={{ width: `${DEMO.readinessScore}%` }}
                />
              </div>
            </div>
            <span className="demo-link shrink-0">征途</span>
            <span className="demo-link shrink-0">简历</span>
          </div>
        </section>

        <section className="demo-subpanel">
          <div className="flex items-baseline justify-between gap-2">
            <p className="demo-label">回声</p>
            <span className="demo-link">经历库</span>
          </div>
          {!echo ? (
            <p className="mt-3 text-[11.5px] leading-5 text-[color:var(--lp-ink-soft)]">
              今天写下第一条战绩
            </p>
          ) : (
            <div className="mt-1.5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="demo-tag">{echo.kindLabel}</span>
                <span className="demo-meta">{echo.label}</span>
                <span className="demo-meta">{echo.range}</span>
              </div>
              <p className="mt-1.5 font-serif text-[13px] leading-6">
                {echo.title}
              </p>
              {echo.quote ? (
                <p className="lp-faint mt-0.5 line-clamp-2 text-[11px] leading-5">
                  “{echo.quote}”
                </p>
              ) : (
                <p className="lp-alert mt-0.5 text-[11px] leading-5">
                  结果还没写
                </p>
              )}
              <div className="mt-1.5 flex items-center gap-2">
                <span aria-hidden="true" className="flex gap-1">
                  {[0, 1, 2, 3].map((index) => (
                    <span
                      key={index}
                      className={`h-1.5 w-1.5 rotate-45 rounded-[1px] ${
                        index < echo.stars
                          ? "lp-accent-fill"
                          : "border lp-hairline"
                      }`}
                    />
                  ))}
                </span>
                <span className="demo-meta">{echo.tierText}</span>
              </div>
              <p className="demo-link mt-1.5">看看原文</p>
            </div>
          )}
        </section>

        <section className="demo-subpanel">
          <div className="flex items-baseline justify-between gap-2">
            <p className="demo-label">情报</p>
            <span className="demo-link">日历</span>
          </div>
          {!DEMO.intel[0] ? (
            <p className="lp-soft mt-2 text-[11.5px] leading-5">
              近期没有已公布日期的情报
            </p>
          ) : (
            <div className="mt-1">
              <div className="flex items-center gap-2">
                <span className="demo-tag">{DEMO.intel[0].categoryLabel}</span>
                <span className="demo-meta ml-auto">{DEMO.intel[0].timing}</span>
              </div>
              <p className="mt-1 text-[12px] leading-5 font-medium">
                {DEMO.intel[0].title}
              </p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="lp-faint min-w-0 truncate text-[10px]">
                  {DEMO.intel[0].organizer}
                </span>
                <span className="demo-chip shrink-0">记下</span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span aria-hidden="true" className="flex items-center gap-1">
                  {DEMO.intel.map((item, index) => (
                    <span
                      key={item.title}
                      className={`demo-intel-dot ${index === 0 ? "is-on" : ""}`}
                    />
                  ))}
                </span>
                <span className="demo-meta">
                  1 / {DEMO.intel.length}
                </span>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function QualityPips({ units }: { units: number }) {
  return (
    <span aria-hidden="true" className="flex gap-1">
      {[0, 1, 2, 3].map((index) => (
        <span
          key={index}
          className={`h-1.5 w-1.5 rotate-45 rounded-[1px] ${
            index < units ? "lp-accent-fill" : "border lp-hairline"
          }`}
        />
      ))}
    </span>
  );
}

function LedgerPanel() {
  const featured = FEATURED_EXPERIENCE;
  const featuredFeed = DEMO.feed.find((row) => row.id === featured?.id);
  return (
    <div className="demo-panel grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-4">
      <div className="flex min-w-0 flex-col gap-2">
        <section className="demo-subpanel">
          <div className="flex items-baseline justify-between gap-2">
            <p className="demo-label">征途碎片收件箱</p>
            <span className="demo-chip">{DEMO.inbox.length} 条</span>
          </div>
          {DEMO.inbox.map((note) => (
            <div key={note.text} className="demo-inbox-row">
              <p className="demo-inbox-text lp-soft text-[11.5px] leading-5">
                {note.text}
              </p>
              <p className="lp-faint shrink-0 font-mono text-[9.5px]">
                {note.time}
              </p>
              <span className="lp-faint shrink-0 text-[10px] underline underline-offset-2">
                丢弃
              </span>
              <span className="demo-chip shrink-0">转成战绩</span>
            </div>
          ))}
        </section>

        <div className="demo-chip-row">
          {DEMO.kindFilters.map((filter, index) => (
            <span
              key={filter.label}
              className={`demo-chip ${index === 0 ? "is-on" : ""}`}
            >
              {filter.label} {filter.count}
            </span>
          ))}
          <span className="demo-meta ml-auto">
            {DEMO.totalExperiences} 条 {DEMO.readyCount} 条简历就绪
          </span>
        </div>

        {!featured ? (
          <section className="demo-subpanel">
            <p className="demo-label">还没有战绩</p>
            <p className="lp-soft mt-1.5 text-[11.5px] leading-5">
              把上面一条碎片转成战绩 四段式写满就能进简历
            </p>
          </section>
        ) : (
        <article className="demo-subpanel demo-subpanel--parchment">
          <div className="flex items-baseline justify-between gap-2">
            <p className="demo-meta font-mono">
              {featuredFeed?.recordedAt ?? "记于本机"}
            </p>
            <span className="demo-meta flex shrink-0 items-center gap-1.5">
              <span aria-hidden="true" className="demo-capture-dot" />
              本机可见
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="demo-tag">{featured.kindLabel}</span>
            <span className="demo-meta font-mono">{featured.range}</span>
            {featured.ready && (
              <span className="lp-accent ml-auto font-mono text-[9.5px]">
                简历就绪
              </span>
            )}
          </div>
          <h3 className="mt-1.5 font-serif text-[18px] leading-tight">
            {featured.title}
          </h3>
          {featured.org && (
            <p className="lp-faint mt-0.5 text-[11px] leading-5">
              {featured.org}
            </p>
          )}

          <dl className="lp-hairline mt-2 grid grid-cols-2 overflow-hidden rounded-lg border">
            {featured.parts.map((part, index) => (
              <div
                key={part.label}
                className={[
                  "min-w-0 px-2.5 py-1.5",
                  index < 2 ? "lp-hairline border-b" : "",
                  index % 2 === 0 ? "lp-hairline border-r" : "",
                ].join(" ")}
              >
                <dt className="demo-label">{part.label}</dt>
                <dd className="mt-1 line-clamp-1 text-[11.5px] leading-5 lg:line-clamp-2">
                  {part.text.trim() || "原文未提供"}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1">
              {featured.skills.slice(0, 3).map((skill) => (
                <span
                  key={skill}
                  className="lp-soft lp-fill rounded-full px-1.5 py-0.5 text-[10px]"
                >
                  {skill}
                </span>
              ))}
            </div>
            <span className="demo-meta">
              证据 {featured.evidence.length} 量化 {featured.metrics.length}
            </span>
          </div>

          <div className="lp-hairline mt-1.5 flex items-center justify-between gap-2 border-t pt-1">
            <span className="lp-faint text-[10px] underline underline-offset-2">
              编辑
            </span>
            <span className="flex items-center gap-2">
              <QualityPips units={featured.stars} />
              <span className="demo-meta">{featured.tierText}</span>
            </span>
          </div>
        </article>
        )}
      </div>

      <div className="demo-aux">
        <section className="demo-subpanel">
          <div className="flex items-baseline justify-between gap-2">
            <p className="demo-label">学期轴</p>
            <p className="demo-label">四年经历分布</p>
          </div>
          <div className="mt-2 grid grid-cols-4 gap-1.5 lg:grid-cols-5">
            {DEMO.terms.map((term) => (
              <div
                key={term.label}
                className={[
                  "flex min-h-12 flex-col justify-between gap-1.5 rounded-lg border px-2 py-1.5",
                  term.count === 0
                    ? "lp-hairline border-dashed bg-[color:var(--lp-surface)]"
                    : "lp-hairline",
                ].join(" ")}
              >
                <p className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-1.5">
                  <span className="lp-faint shrink-0 whitespace-nowrap font-mono text-[9px]">
                    {term.label}
                  </span>
                  <span className="flex items-baseline gap-1">
                    <span
                      className={[
                        "font-serif text-[15px] leading-none tabular-nums",
                        term.count === 0 ? "lp-faint" : "",
                      ].join(" ")}
                    >
                      {term.count}
                    </span>
                    <span className="lp-faint text-[9px]">条</span>
                  </span>
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
            {DEMO.timeline.slice(0, 4).map((item) => (
              <li key={`${item.range}-${item.title}`} className="flex items-start gap-2">
                <span
                  aria-hidden="true"
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full border border-[color:var(--lp-line)] bg-[color:var(--lp-surface)]"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11.5px] leading-4">
                    {item.title}
                  </span>
                  <span className="lp-faint block font-mono text-[9.5px] leading-4">
                    {item.range} {item.kindLabel}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <div className="flex flex-col gap-1">
          {DEMO.feed.slice(0, 3).map((row) => (
            <div
              key={row.id}
              className="lp-hairline-soft flex items-baseline justify-between gap-2 border-b pb-1.5 last:border-b-0"
            >
              <span className="min-w-0 truncate text-[11.5px] leading-5">
                {row.title}
              </span>
              <span className="lp-faint shrink-0 font-mono text-[9.5px]">
                {row.recordedAt} {row.readyLine}
              </span>
            </div>
          ))}
          <p className="demo-meta">动态只在本机生成</p>
        </div>
      </div>
    </div>
  );
}

function BountyPanel() {
  const jobs = DEMO.jobs;
  const featured = jobs[0];
  const farCount = jobs.length - DEMO.qualifiedCount - DEMO.nearCount;
  const qualChips = [
    { label: "全部", count: jobs.length },
    { label: "够格", count: DEMO.qualifiedCount },
    { label: "差一步", count: DEMO.nearCount },
    { label: "差得多", count: farCount },
  ];
  const matchable = featured
    ? featured.hits.length + featured.gaps.length
    : 0;

  return (
    <div className="demo-panel flex flex-col">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {DEMO.bountyStats.map((stat) => (
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
        <span className="lp-faint text-[12px] leading-5">
          {DEMO.jobSearchHint}
        </span>
        <span className="demo-meta ml-auto shrink-0">
          {jobs.length} / {DEMO.jobLibraryCount} 条
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="demo-label">应聘资格</span>
        {qualChips.map((chip, index) => (
          <span
            key={chip.label}
            className={`demo-chip ${index === 0 ? "is-on" : ""}`}
          >
            {chip.label} {chip.count}
          </span>
        ))}
        <span className="demo-chip ml-auto">粘贴 JD 匹配</span>
      </div>

      <div className="mt-2.5 grid gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <ul className="min-w-0 space-y-1">
          {jobs.map((job, index) => (
            <li
              key={job.id}
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
                  {job.typeLabel} {job.city} {job.gradeFit}
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

        <div className="demo-subpanel flex min-w-0 flex-col">
          {!featured ? (
            <p className="lp-soft text-[11.5px] leading-5">
              岗位库暂不可用 可粘贴一份 JD 对照经历
            </p>
          ) : (
            <>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="lp-faint font-mono text-[9.5px]">
                    {featured.company} {featured.cohort}
                  </p>
                  <p className="truncate text-[13px] leading-5 font-medium">
                    {featured.title}
                  </p>
                  <p className="lp-faint text-[10.5px] leading-4">
                    {featured.typeLabel} {featured.city} {featured.gradeFit}{" "}
                    {featured.qual}
                  </p>
                </div>
                <p className="shrink-0 text-right">
                  <span className="font-serif text-[26px] leading-none text-[color:var(--lp-accent)] tabular-nums">
                    {featured.score}
                  </span>
                  <span className="demo-label ml-1">/100</span>
                  <span className="demo-tag mt-1 block w-fit">
                    {featured.tierLabel}
                  </span>
                </p>
              </div>

              <div className="lp-fill mt-2 h-1 overflow-hidden rounded-full">
                <span
                  className="lp-accent-fill block h-full rounded-full"
                  style={{ width: `${featured.score}%` }}
                />
              </div>

              <div className="mt-2.5 flex items-baseline justify-between gap-2">
                <p className="demo-label">要求对照</p>
                <p className="demo-meta">
                  {matchable > 0
                    ? `命中 ${featured.hits.length}/${matchable} 待补 ${featured.gaps.length}`
                    : "无可匹配要求"}
                </p>
              </div>

              <div className="mt-1.5 space-y-2">
                {featured.hits.slice(0, 2).map((hit) => (
                  <div key={hit.requirement} className="flex gap-2">
                    <span className="lp-soft mt-0.5 w-[2.4em] shrink-0 font-mono text-[9.5px] tracking-[0.16em]">
                      命中
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11.5px] leading-4">
                        {hit.requirement}
                      </p>
                      <p className="lp-faint truncate text-[10px] leading-4">
                        「{hit.quote}」{hit.title}
                      </p>
                    </div>
                  </div>
                ))}
                {featured.gaps.slice(0, 1).map((gap) => (
                  <div key={gap.requirement} className="flex gap-2">
                    <span className="lp-alert mt-0.5 w-[2.4em] shrink-0 font-mono text-[9.5px] tracking-[0.16em]">
                      待补
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11.5px] leading-4">
                        {gap.requirement}
                      </p>
                      <p className="lp-faint truncate text-[10px] leading-4">
                        {gap.advice}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <p className="demo-meta mt-auto border-t border-[color:var(--lp-line-soft)] pt-2">
                按 {DEMO.readyForMatchCount} 条简历就绪的战绩判定 检索与匹配都在本机
                {DEMO.jobLibraryNote}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ToolboxPanel() {
  return (
    <div className="demo-panel flex flex-col">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="demo-label">工具箱</p>
          <p className="mt-1.5 font-serif text-[19px] leading-none">四件常用工具</p>
          <p className="lp-soft mt-1.5 text-[11px] leading-5">数据都在这台机器</p>
        </div>
        <span className="demo-link">先看日历</span>
      </div>

      <div className="demo-sheet-stack">
        <div className="demo-sheet">
          <div className="demo-sheet-head">
            <div>
              <p className="demo-label">工具抽屉</p>
              <p className="demo-tool-title mt-1">工具册</p>
            </div>
            <p className="demo-label">课表 作业 简历 日历</p>
          </div>

          {TOOL_ROWS.map((tool) => (
            <div key={tool.no} className="demo-tool">
              <span className="demo-tool-no">{tool.no}</span>
              <span className="min-w-0 flex-1">
                <span className="demo-tool-title">{tool.label}</span>
                <span className="lp-soft mt-0.5 block text-[10.5px] leading-4">
                  {tool.hint}
                </span>
              </span>
              <span className="demo-tool-side">
                <span className="lp-faint text-[9.5px] leading-4">
                  {tool.meta}
                </span>
                <span aria-hidden="true" className="demo-tool-pull" />
              </span>
            </div>
          ))}
        </div>

        <section className="demo-subpanel px-3 py-2">
          <p className="text-[11px] leading-5 font-medium">数据与备份</p>
          <p className="lp-soft mt-0.5 text-[10.5px] leading-4">
            数据只在本机 换设备前先导出
          </p>
        </section>
      </div>
    </div>
  );
}

const SKY_RULES = [
  "完成委托 写下战绩 补充证据 生成简历",
  "每天只点亮一次",
  "回声化作流星 攒够了下场流星雨",
  "数据只在本机",
];

function SpacePanel() {
  const space = DEMO.space;
  const todayStar = space.points.find((point) => point.isToday) ?? null;
  return (
    <div className="demo-panel flex flex-col">
      <div className="flex flex-wrap items-end justify-between gap-x-5 gap-y-2">
        <div className="min-w-0">
          <p className="demo-label">留痕星图</p>
          <p className="mt-1 font-serif text-[19px] leading-none">学径空间</p>
          <p className="lp-soft mt-1.5 text-[11px] leading-5">
            每天第一次留下结果 就点亮一颗星 最近的回声会化作流星
          </p>
        </div>
        {space.todayLit ? (
          <p className="demo-meta flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full bg-[#7fae90]"
            />
            今天已点亮
          </p>
        ) : (
          <span className="demo-link">去今日留痕</span>
        )}
      </div>

      <div className="mt-2.5 grid flex-1 gap-2.5 lg:grid-cols-[minmax(0,1fr)_236px]">
        <div aria-hidden="true" className="demo-sky">
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
          {space.constellation.points.map((node, index) => (
            <span
              key={`node-${index}`}
              className="demo-sky-node"
              style={{ left: `${node.x * 100}%`, top: `${node.y * 100}%` }}
            />
          ))}
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
                  "--r": `${4.4 + Math.min(point.count, 3) * 1.3}px`,
                } as CSSProperties
              }
            />
          ))}
          {todayStar && (
            <span
              className="demo-sky-today"
              style={{ left: `${todayStar.x}%`, top: `${todayStar.y}%` }}
            >
              今日
            </span>
          )}
          {Array.from({ length: Math.min(space.meteorCount, 3) }, (_, index) => (
            <span
              key={`meteor-${index}`}
              className="demo-sky-meteor"
              style={
                {
                  left: `${58 - index * 16}%`,
                  top: `${12 + index * 15}%`,
                } as CSSProperties
              }
            />
          ))}
          <p className="demo-sky-name">{space.constellation.name}</p>
        </div>

        <aside className="flex min-w-0 flex-col gap-2.5">
          <section className="demo-subpanel px-3 py-2.5">
            <p className="demo-label">最近点亮</p>
            <ul className="mt-1.5 space-y-0.5">
              {space.recent.map((star, index) => (
                <li
                  key={star.key}
                  className={`demo-sky-recent flex min-h-[30px] items-center justify-between gap-2 px-2 ${
                    index === 0 ? "is-on" : ""
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate font-mono text-[11.5px]">
                      {star.label}
                    </span>
                    {star.isToday && <span className="demo-tag">今天</span>}
                  </span>
                  <span className="flex shrink-0 items-baseline gap-1">
                    <span className="font-mono text-[14px] leading-none tabular-nums">
                      {star.count}
                    </span>
                    <span className="lp-faint text-[9.5px]">条</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="demo-subpanel flex min-h-0 flex-1 flex-col px-3 py-2.5">
            {space.selected ? (
              <>
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-mono text-[11.5px] tracking-[0.08em] text-[color:var(--lp-accent)]">
                    {space.selected.label}
                  </p>
                  <span className="demo-meta">前一天 后一天</span>
                </div>
                <p className="mt-1 flex items-baseline gap-1.5">
                  {space.selected.isToday && (
                    <span className="demo-tag">今天</span>
                  )}
                  <span className="font-mono text-[17px] leading-none tabular-nums">
                    {space.selected.count}
                  </span>
                  <span className="lp-faint text-[10.5px]">条留痕</span>
                </p>
                <ul className="mt-1.5 space-y-1.5">
                  {space.selected.events.map((event, index) => (
                    <li
                      key={`${event.typeLabel}-${index}`}
                      className="lp-soft flex min-w-0 items-baseline gap-1.5 text-[10.5px] leading-4"
                    >
                      <span className="shrink-0 text-[color:var(--lp-accent)]">
                        {event.typeLabel}
                      </span>
                      <span className="min-w-0 break-words">
                        {event.title}
                        {event.detail ? ` ${event.detail}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="lp-faint text-[10.5px] leading-5">
                还没有点亮的星 先去今日留一条痕
              </p>
            )}
          </section>
        </aside>
      </div>

      <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
        <section className="demo-subpanel px-3 py-2.5">
          <p className="demo-label">本机星况</p>
          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-5 gap-y-1">
            <span className="flex items-baseline gap-1.5">
              <span className="lp-faint text-[10.5px]">点亮</span>
              <span className="font-serif text-[15px] leading-none tabular-nums">
                {space.litCount}
              </span>
              <span className="demo-label">天</span>
            </span>
            <span className="flex items-baseline gap-1.5">
              <span className="lp-faint text-[10.5px]">留痕</span>
              <span className="font-serif text-[15px] leading-none tabular-nums">
                {space.totalEvents}
              </span>
              <span className="demo-label">条</span>
            </span>
            <span className="flex items-baseline gap-1.5">
              <span className="lp-faint text-[10.5px]">最近回声</span>
              <span className="text-[11.5px]">{space.echoLabel}</span>
            </span>
          </div>
        </section>

        <section className="demo-subpanel px-3 py-2.5">
          <p className="demo-label">点亮规则</p>
          <ul className="lp-soft mt-1.5 grid gap-x-4 gap-y-0.5 text-[10.5px] leading-5 sm:grid-cols-2">
            {SKY_RULES.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
