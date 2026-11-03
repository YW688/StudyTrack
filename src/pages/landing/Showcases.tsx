const WEEK_DAYS = ["一", "二", "三", "四", "五"];
const WEEK_PERIODS = ["1-2 节", "3-4 节", "5-6 节", "7-8 节"];

interface WeekBlock {
  day: number;
  row: number;
  name: string;
  room: string;
  tone: string;
  biweekly?: boolean;
}

const WEEK_BLOCKS: WeekBlock[] = [
  { day: 0, row: 1, name: "智能机器人", room: "教学楼A 2-109", tone: "tone-1" },
  { day: 1, row: 0, name: "Python 开发", room: "机房 B-204", tone: "tone-4" },
  { day: 1, row: 1, name: "Python 开发", room: "机房 B-204", tone: "tone-4" },
  {
    day: 2,
    row: 0,
    name: "大学英语",
    room: "文科楼 105",
    tone: "tone-5",
    biweekly: true,
  },
  { day: 2, row: 2, name: "智能机器人", room: "教学楼A 2-109", tone: "tone-1" },
  { day: 3, row: 1, name: "形势与政策", room: "教学楼 301", tone: "tone-2" },
  { day: 4, row: 2, name: "数据结构", room: "教学楼A 1-101", tone: "tone-6" },
];

export function WeekShowcase() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span className="shot-lg font-serif leading-none">第 2 周</span>
          <span className="shot-xs lp-faint">周一至周五</span>
        </div>
        <span className="shot-xs lp-soft rounded-full border lp-hairline px-2 py-0.5">
          单双周已展开
        </span>
      </div>

      <div className="shot-week mt-2">
        <span aria-hidden="true" />
        {WEEK_DAYS.map((day, index) => (
          <span
            key={day}
            className={`shot-day ${index === 2 ? "is-today" : "lp-faint"}`}
          >
            {day}
          </span>
        ))}

        {WEEK_PERIODS.map((period, index) => (
          <span
            key={period}
            className="shot-period"
            style={{ gridColumn: 1, gridRow: index + 2 }}
          >
            {period}
          </span>
        ))}

        {WEEK_DAYS.map((day, index) => (
          <div
            key={`lane-${day}`}
            aria-hidden="true"
            className={`shot-lane ${index === 2 ? "is-today" : ""}`}
            style={{ gridColumn: index + 2, gridRow: "2 / 6" }}
          />
        ))}

        {WEEK_BLOCKS.map((block) => (
          <div
            key={`${block.day}-${block.name}-${block.row}`}
            className={`shot-course ${block.tone}`}
            style={{ gridColumn: block.day + 2, gridRow: block.row + 2 }}
          >
            <p
              className={`shot-sm truncate leading-[1.25] font-medium ${block.biweekly ? "pr-3" : ""}`}
            >
              {block.name}
            </p>
            <p className="shot-xs shot-room shot-hide-narrow truncate leading-[1.3]">
              {block.room}
            </p>
            {block.biweekly ? (
              <span className="shot-biweekly">双</span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

const EXPERIENCE_PARTS = [
  { label: "问题", text: "选课高峰易超选" },
  { label: "方法", text: "E-R 建模 · 事务" },
  { label: "贡献", text: "12 张表 · 6 个页面" },
  { label: "结果", text: "200 人并发无超选" },
];

const EXPERIENCE_SKILLS = ["MySQL", "Java", "事务"];

export function ExperienceShowcase() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="shot-xs lp-soft inline-flex rounded-full border lp-hairline px-2 py-0.5">
            课程设计
          </span>
          <p className="shot-lg mt-2 truncate font-serif leading-[1.25]">
            校园选课系统
          </p>
          <p className="shot-xs lp-faint mt-1 truncate">
            数据库原理 2026 年 6 月 个人项目
          </p>
        </div>
        <span className="shot-xs lp-soft flex shrink-0 items-center gap-1">
          <span className="h-1 w-1 rounded-full bg-[color:var(--lp-accent)]" />
          已确认
        </span>
      </div>

      <div className="mt-3 grid flex-1 grid-cols-2 overflow-hidden rounded-lg border lp-hairline">
        {EXPERIENCE_PARTS.map((part, index) => (
          <div
            key={part.label}
            className={[
              "flex min-h-0 flex-col justify-center px-2.5 py-2",
              index < 2 ? "border-b lp-hairline" : "",
              index % 2 === 0 ? "border-r lp-hairline" : "",
            ].join(" ")}
          >
            <p className="shot-xs lp-faint">{part.label}</p>
            <p className="shot-sm mt-1 leading-[1.4]">{part.text}</p>
          </div>
        ))}
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {EXPERIENCE_SKILLS.map((skill) => (
            <span
              key={skill}
              className="shot-xs lp-soft lp-fill rounded-[3px] px-1.5 py-0.5"
            >
              {skill}
            </span>
          ))}
        </div>
        <span className="shot-xs lp-faint shrink-0">证据 2 量化 3</span>
      </div>
    </div>
  );
}

export function ResumeShowcase() {
  return (
    <div className="relative flex h-full items-center justify-center">
      <div
        aria-hidden="true"
        className="absolute h-[84%] w-[42%] translate-x-[7%] translate-y-[3%] rotate-[1.8deg] rounded-[3px] border lp-hairline"
        style={{
          backgroundColor:
            "color-mix(in srgb, var(--lp-surface), #fff 22%)",
        }}
      />

      <div
        className="resume-sheet relative flex h-[96%] flex-col overflow-hidden rounded-[3px] border lp-hairline bg-[#fffdf9] px-[6.5%] py-[4%] shadow-[0_36px_54px_-42px_rgba(60,45,35,0.7)]"
        style={{ aspectRatio: "210 / 297" }}
      >
        <div className="flex items-baseline justify-between gap-2">
          <p className="shot-md font-serif leading-none">示例同学</p>
          <p className="shot-xs lp-faint shrink-0">v3</p>
        </div>
        <p className="shot-xs lp-soft mt-1 leading-[1.4]">
          计算机学院 · 2027 届
        </p>

        <div className="lp-hairline mt-1.5 border-t pt-1">
          <p className="shot-xs lp-soft leading-[1.4] font-medium">教育经历</p>
          <p className="shot-xs lp-soft leading-[1.45]">
            某大学 · 计算机专业
          </p>
          <p className="shot-xs lp-faint leading-[1.45]">2023 – 2027</p>
          <p className="shot-wide-only shot-xs lp-faint leading-[1.45]">
            主修：数据结构 · 数据库
          </p>
        </div>

        <div className="lp-hairline mt-1 border-t pt-1">
          <p className="shot-xs lp-soft leading-[1.4] font-medium">项目经历</p>
          <p className="shot-xs leading-[1.45] font-medium">
            数学建模校赛 · 二等奖
          </p>
          <p className="shot-xs lp-soft leading-[1.45]">
            Python 模型 · 22 页论文
          </p>
          <p className="shot-xs mt-1 rounded-[2px] bg-[#f6e7b0] px-1 leading-[1.6]">
            选课系统 · 200 人并发
          </p>
        </div>

        <div className="shot-wide-only lp-hairline mt-1 border-t pt-1">
          <p className="shot-xs lp-soft leading-[1.4] font-medium">荣誉</p>
          <p className="shot-xs lp-soft leading-[1.45]">
            校二等奖学金 · 2025
          </p>
        </div>

        <div className="lp-hairline mt-1 border-t pt-1">
          <p className="shot-xs lp-soft leading-[1.4] font-medium">技能</p>
          <p className="shot-xs lp-soft leading-[1.45]">
            Python · SQL · Java
          </p>
        </div>
      </div>

      <p className="shot-xs shot-hide-narrow absolute bottom-0 left-0 flex items-center gap-1 text-[#8a6a22]">
        <span className="h-1.5 w-1.5 rounded-[1px] bg-[#e8c86a]" />
        低置信标黄 待确认
      </p>
      <span className="shot-xs lp-faint shot-hide-narrow absolute right-0 bottom-0 rounded-full border lp-hairline px-2 py-0.5">
        快照 v3 10 月 30 日
      </span>
    </div>
  );
}

const MATCH_JOBS = [
  { title: "数据分析实习生", city: "杭州", cohort: "2027 届", score: 86 },
  { title: "数据运营实习生", city: "上海", cohort: "2027 届", score: 78 },
  { title: "后端开发实习生", city: "杭州", cohort: "2027 届", score: 71 },
];

const MATCH_HITS = [
  {
    requirement: "Python 数据分析",
    quote: "数学建模校赛 · 22 页论文",
  },
  {
    requirement: "MySQL 数据库设计",
    quote: "选课系统 · 12 张表",
  },
];

export function MatchShowcase() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 rounded-full border lp-hairline px-2.5 py-1.5">
        <div className="shot-xs flex min-w-0 items-center gap-1.5">
          <span className="lp-faint shrink-0">检索</span>
          <span className="shot-sm truncate">
            数据分析 杭州 2027 届
          </span>
        </div>
        <span className="shot-xs lp-faint shrink-0">42 条</span>
      </div>

      <div className="shot-match mt-2">
        <div className="shot-match-aside flex min-h-0 flex-col">
          <ul className="flex min-h-0 flex-col gap-1">
            {MATCH_JOBS.map((job, index) => (
              <li
                key={job.title}
                className={`shot-job flex items-center justify-between gap-2 ${index === 0 ? "is-active" : ""}`}
              >
                <span className="min-w-0">
                  <span className="shot-sm block truncate leading-[1.3]">
                    {job.title}
                  </span>
                  <span className="shot-xs lp-faint block truncate leading-[1.3]">
                    {job.city} {job.cohort}
                  </span>
                </span>
                <span
                  className={`shot-sm shrink-0 font-serif ${index === 0 ? "text-[color:var(--lp-accent)]" : "lp-faint"}`}
                >
                  {job.score}
                </span>
              </li>
            ))}
          </ul>
          <p className="shot-xs lp-faint mt-auto pt-2">岗位库 42 条 人工整理</p>
        </div>

        <div className="flex min-h-0 flex-col rounded-lg border lp-hairline p-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="shot-sm truncate leading-[1.3] font-medium">
                数据分析实习生
              </p>
              <p className="shot-xs lp-faint mt-0.5">杭州 2027 届</p>
            </div>
            <p className="shrink-0 text-right">
              <span className="shot-xl font-serif leading-none text-[color:var(--lp-accent)]">
                86
              </span>
              <span className="shot-xs lp-faint ml-1">匹配</span>
            </p>
          </div>

          <div className="lp-fill mt-1.5 h-1 overflow-hidden rounded-full">
            <span className="lp-accent-fill block h-full w-[86%] rounded-full" />
          </div>

          <div className="mt-2 space-y-1.5">
            {MATCH_HITS.map((hit) => (
              <div key={hit.requirement} className="flex gap-1.5">
                <span className="shot-xs lp-faint mt-px w-[2.2em] shrink-0">
                  命中
                </span>
                <div className="min-w-0">
                  <p className="shot-sm truncate leading-[1.3]">
                    {hit.requirement}
                  </p>
                  <p className="shot-xs lp-faint truncate leading-[1.3]">
                    {hit.quote}
                  </p>
                </div>
              </div>
            ))}
            <div className="flex gap-1.5">
              <span className="shot-xs lp-alert mt-px w-[2.2em] shrink-0">
                缺口
              </span>
              <div className="min-w-0">
                <p className="shot-sm truncate leading-[1.3]">SQL 窗口函数</p>
                <p className="shot-xs lp-faint truncate leading-[1.3]">
                  下学期补
                </p>
              </div>
            </div>
          </div>

          <p className="shot-xs lp-faint mt-auto pt-2">
            每条命中都指回经历原文
          </p>
        </div>
      </div>
    </div>
  );
}
