import dayjs from "dayjs";
import CompassRose from "../../components/CompassRose";
import WaxSeal from "../../components/WaxSeal";
import ApertureMark from "../../components/ApertureMark";
import StarMark from "../../components/StarMark";
import { DraftingRose, ObservatoryRose } from "../../components/ThemeRose";

type ToolRoute =
  | "timetable"
  | "assignments"
  | "resume"
  | "calendar";

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
      hint: "Excel 导入 单双周展开 周视图",
      meta: "上课时间与教室",
    },
    {
      id: "assignments",
      no: "02",
      title: "作业",
      hint: "截图 粘贴或手动录入 按 DDL 排",
      meta: "未完成与完成状态",
    },
    {
      id: "resume",
      no: "03",
      title: "简历",
      hint: "勾选经历自动排版 浏览器打印 A4",
      meta: "只导出你确认过的内容",
    },
    {
      id: "calendar",
      no: "04",
      title: "日历",
      hint: "竞赛 考试报名 校内节点",
      meta: `${calendarCount} 条 ${calendarUpdatedLabel(calendarUpdatedAt)}`,
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
            <p className="mt-2 text-xs leading-5 text-ink-3">
              四件常用工具 数据都在这台机器
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate("calendar")}
            className="border-rule hover:bg-ink/[0.03] inline-flex min-h-11 items-center justify-center rounded-lg border bg-surface px-4 text-sm"
          >
            先看日历
          </button>
        </header>

        <section
          aria-labelledby="tool-chest-heading"
          className="tool-chest tool-sheet border-rule mt-5 overflow-hidden rounded-xl border bg-surface"
        >
          <CompassRose className="tool-sheet-rose" />
          <DraftingRose className="tool-sheet-rose-drafting" />
          <ObservatoryRose className="tool-sheet-rose-observatory" />

          <span className="tool-sheet-seal" aria-hidden="true">
            <WaxSeal units={4} total={4} ready size={48} className="tool-sheet-wax" />
            <ApertureMark size={46} className="tool-sheet-aperture" />
            <StarMark size={46} className="tool-sheet-star" />
            <span className="tool-sheet-seal-label">工具册</span>
          </span>

          <header className="tool-chest-head border-rule flex items-end justify-between gap-3 border-b px-4 py-3 sm:px-5">
            <div>
              <p className="font-mono text-micro tracking-[0.16em] text-ink-4">
                工具抽屉
              </p>
              <h2
                id="tool-chest-heading"
                className="mt-0.5 font-serif text-base tracking-tight"
              >
                四件常用工具
              </h2>
            </div>
            <p className="text-micro text-ink-4">课表 作业 简历 日历</p>
          </header>

          <div className="tool-drawer-stack divide-rule divide-y">
            {tools.map((tool) => (
              <button
                key={tool.id}
                type="button"
                onClick={() => onNavigate(tool.id)}
                className="tool-drawer hover:bg-ink/[0.025] focus-visible:ring-accent group flex w-full flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-3.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:outline-none sm:px-5"
              >
                <span className="tool-drawer-no font-mono text-micro tracking-[0.14em] text-accent-ink">
                  {tool.no}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="tool-drawer-title block font-serif text-lg leading-tight">
                    {tool.title}
                  </span>
                  <span className="mt-1 block text-[12px] leading-5 text-ink-3">
                    {tool.hint}
                  </span>
                </span>
                <span className="tool-drawer-side ml-auto flex w-full items-center gap-3 sm:w-auto">
                  <span className="text-micro leading-4 text-ink-4">
                    {tool.meta}
                  </span>
                  <span aria-hidden="true" className="tool-drawer-pull" />
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="tool-backup border-rule mt-4 rounded-xl border bg-surface px-4 py-3.5 sm:px-5 lg:hidden">
          <p className="text-xs font-medium">数据与备份</p>
          <p className="mt-1 text-[11px] leading-5 text-ink-3">
            数据只在本机 换设备前先导出
          </p>
        </section>
      </div>
    </div>
  );
}
