import dayjs from "dayjs";

type ToolRoute = "timetable" | "assignments" | "resume" | "calendar";

interface ToolboxPageProps {
  calendarCount: number;
  calendarUpdatedAt: string | null;
  onNavigate: (id: ToolRoute) => void;
}

interface Tool {
  id: ToolRoute;
  no: string;
  title: string;
  hint: string;
  meta: string;
}

function calendarUpdatedLabel(value: string | null): string {
  if (!value) return "更新日期待补";
  const date = dayjs(value);
  return date.isValid() ? `更新于 ${date.format("M月D日")}` : `更新于 ${value}`;
}

export default function ToolboxPage({
  calendarCount,
  calendarUpdatedAt,
  onNavigate,
}: ToolboxPageProps) {
  const tools: Tool[] = [
    {
      id: "timetable",
      no: "01",
      title: "课表",
      hint: "Excel 导入、单双周展开、周视图",
      meta: "上课时间与教室",
    },
    {
      id: "assignments",
      no: "02",
      title: "作业",
      hint: "截图、粘贴或手动录入，按 DDL 排",
      meta: "未完成与完成状态",
    },
    {
      id: "resume",
      no: "03",
      title: "简历",
      hint: "勾选经历自动排版，浏览器打印 A4",
      meta: "只导出你确认过的内容",
    },
    {
      id: "calendar",
      no: "04",
      title: "日历",
      hint: "竞赛、考试报名、校内节点",
      meta: `${calendarCount} 条 · ${calendarUpdatedLabel(calendarUpdatedAt)}`,
    },
  ];

  return (
    <div className="px-4 pb-10 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <header className="border-rule flex flex-col gap-4 border-b py-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-micro tracking-[0.2em] text-ink-3">
              工具箱
            </p>
            <h1 className="mt-2 font-serif text-2xl tracking-tight sm:text-3xl">
              工具箱
            </h1>
            <p className="mt-2 max-w-2xl text-xs leading-5 text-ink-3">
              课表、作业、简历、日历。需要时打开，不占今日的注意力。
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate("calendar")}
            className="border-rule hover:bg-ink/[0.03] inline-flex min-h-11 items-center justify-center rounded-lg border bg-surface px-4 text-sm"
          >
            先看日历 →
          </button>
        </header>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {tools.map((tool) => (
            <button
              key={tool.id}
              type="button"
              onClick={() => onNavigate(tool.id)}
              className="border-rule hover:bg-ink/[0.025] group flex min-h-32 flex-col rounded-xl border bg-surface p-4 text-left transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none sm:p-5"
            >
              <span className="font-mono text-micro tracking-[0.14em] text-accent-ink">
                {tool.no}
              </span>
              <span className="mt-2 flex items-baseline justify-between gap-3">
                <span className="font-serif text-xl leading-none">
                  {tool.title}
                </span>
                <span
                  aria-hidden="true"
                  className="text-ink-4 transition-transform group-hover:translate-x-0.5"
                >
                  →
                </span>
              </span>
              <span className="mt-2 text-[13px] leading-6 text-ink-3">
                {tool.hint}
              </span>
              <span className="border-rule mt-auto border-t pt-2.5 text-micro leading-4 text-ink-3">
                {tool.meta}
              </span>
            </button>
          ))}
        </div>

        <section className="border-rule mt-4 rounded-xl border bg-surface px-4 py-3.5 sm:px-5">
          <p className="text-xs font-medium">数据与备份</p>
          <p className="mt-1 text-[11px] leading-5 text-ink-3">
            导出、导入与清除本机数据在左侧导航底部；手机端在「数据与备份」里。所有数据只存在这台设备。
          </p>
        </section>
      </div>
    </div>
  );
}
