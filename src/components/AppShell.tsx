import type { ReactNode } from "react";
import BrandMark from "./BrandMark";
import DataBackup from "./DataBackup";
import { THEMES, nextTheme, type ThemeId } from "../lib/theme";

const NAV = [
  { id: "today", no: "01", label: "今日" },
  { id: "experiences", no: "02", label: "账本" },
  { id: "opportunities", no: "03", label: "悬赏" },
  { id: "toolbox", no: "04", label: "工具箱" },
] as const;

type NavId = (typeof NAV)[number]["id"];

interface AppShellProps {
  active: NavId;
  theme: ThemeId;
  onThemeChange: (theme: ThemeId) => void;
  hasData: boolean;
  assignmentCount: number;
  demoMode: boolean;
  onExitDemo: () => void;
  onClear: () => Promise<void>;
  onExport: () => Promise<void>;
  onImport: (text: string) => Promise<{ ok: boolean; message: string }>;
  onHome: () => void;
  onNavigate: (id: NavId) => void;
  children: ReactNode;
}

export default function AppShell({
  active,
  theme,
  onThemeChange,
  hasData,
  assignmentCount,
  demoMode,
  onExitDemo,
  onClear,
  onExport,
  onImport,
  onHome,
  onNavigate,
  children,
}: AppShellProps) {
  const activeNo = String(NAV.findIndex((item) => item.id === active) + 1).padStart(
    2,
    "0",
  );
  const currentTheme = THEMES.find((item) => item.id === theme) ?? THEMES[0];
  const upcomingTheme =
    THEMES.find((item) => item.id === nextTheme(theme)) ?? THEMES[0];

  return (
    <div className="app-shell min-h-dvh bg-paper lg:grid lg:grid-cols-[224px_minmax(0,1fr)]">
      <aside className="app-sidebar border-rule lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:border-r">
        <div className="flex h-16 items-center justify-between px-5 lg:px-6">
          <button
            type="button"
            onClick={onHome}
            className="-mx-2 flex min-h-11 items-center rounded-md px-2 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
            aria-label="返回首页"
          >
            <span className="flex items-center gap-2.5">
              <span
                data-brand-mark="true"
                className="app-brand-mark inline-flex h-[30px] w-[30px] shrink-0"
              >
                <BrandMark size={30} />
              </span>
              <span className="flex items-baseline gap-2">
                <span className="font-serif text-xl leading-none tracking-[0.02em]">
                  学径
                </span>
                <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink/45">
                  StudyTrack
                </span>
              </span>
            </span>
          </button>
          <div className="flex items-center gap-3 lg:hidden">
            <span className="hidden font-mono text-[10px] tracking-[0.16em] text-ink/35 min-[420px]:inline">
              档案 {activeNo}
            </span>
            <button
              type="button"
              onClick={() => onThemeChange(nextTheme(theme))}
              aria-label={`切换配色 当前${currentTheme.name} 下一套${upcomingTheme.name}`}
              title={`切换到${upcomingTheme.name}`}
              className="border-rule bg-surface inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-full border px-3.5 text-[12px] transition-colors hover:bg-ink/[0.03] focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
            >
              <span
                aria-hidden="true"
                className="ring-ink/10 h-3 w-3 rounded-full ring-1"
                style={{ backgroundImage: currentTheme.swatch }}
              />
              <span className="hidden min-[360px]:inline">
                {currentTheme.name}
              </span>
            </button>
          </div>
        </div>

        <nav
          aria-label="四个面导航"
          className="border-rule flex gap-1 overflow-x-auto border-y px-3 py-2 lg:flex-col lg:gap-0 lg:border-y-0 lg:px-3 lg:py-4"
        >
          {NAV.map((item) => {
            const isActive = item.id === active;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                aria-current={isActive ? "page" : undefined}
                className={[
                  "flex min-h-11 shrink-0 items-center gap-3 rounded-lg px-3 text-sm whitespace-nowrap transition-colors lg:w-full",
                  isActive
                    ? "bg-accent/[0.10] text-ink"
                    : "text-ink/70 hover:bg-ink/[0.04]",
                ].join(" ")}
              >
                <span
                  className={[
                    "font-mono text-[10px] tabular-nums",
                    isActive ? "text-accent-ink" : "text-ink/30",
                  ].join(" ")}
                >
                  {item.no}
                </span>
                <span>{item.label}</span>
                {item.id === "toolbox" && assignmentCount > 0 && (
                  <span
                    aria-label={`未完成 ${assignmentCount} 项`}
                    className="bg-accent/15 text-accent-ink ml-auto rounded-full px-1.5 py-0.5 font-mono text-[9px] tabular-nums"
                  >
                    {assignmentCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <details className="border-rule group border-b px-3 py-1 lg:hidden">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-md px-3 text-xs text-ink/55 [&::-webkit-details-marker]:hidden">
            数据与备份
            <span
              aria-hidden="true"
              className="font-mono text-ink/30 transition-transform group-open:rotate-45"
            >
              +
            </span>
          </summary>
          <div className="px-3 pt-1 pb-3">
            <DataBackup
              hasData={hasData}
              onExport={onExport}
              onImport={onImport}
              onClear={onClear}
            />
          </div>
        </details>

        <div className="mt-auto hidden px-6 pt-6 pb-6 lg:block">
          <div className="mb-5">
            <p className="font-mono text-[9px] tracking-[0.2em] text-ink/30">
              界面配色
            </p>
            <div
              role="group"
              aria-label="界面配色"
              className="border-rule bg-surface mt-2 grid grid-cols-3 gap-0.5 rounded-lg border p-0.5"
            >
              {THEMES.map((item) => {
                const selected = item.id === theme;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onThemeChange(item.id)}
                    className={[
                      "flex min-h-11 flex-col items-center justify-center gap-1.5 rounded-md text-[10px] transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none",
                      selected
                        ? "bg-accent/[0.12] text-ink"
                        : "text-ink/45 hover:bg-ink/[0.04] hover:text-ink/70",
                    ].join(" ")}
                  >
                    <span
                      aria-hidden="true"
                      className="ring-ink/10 h-3 w-3 rounded-full ring-1"
                      style={{ backgroundImage: item.swatch }}
                    />
                    {item.name}
                  </button>
                );
              })}
            </div>
          </div>
          <p className="flex items-center gap-2 text-[11px] leading-5 text-ink/45">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-accent" />
            数据只存在你的浏览器
          </p>
          <div className="border-rule mt-3 border-t pt-3">
            <DataBackup
              hasData={hasData}
              onExport={onExport}
              onImport={onImport}
              onClear={onClear}
            />
          </div>
        </div>
      </aside>

      <main className="app-main min-w-0">
        {demoMode && (
          <div
            aria-label="演示模式"
            className="no-print border-amber/40 bg-amber/[0.06] border-b px-4 py-2 sm:px-6 lg:px-8"
          >
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] leading-5 text-ink/60">
                <span className="text-amber-ink font-mono text-[9px] tracking-[0.12em]">
                  演示模式
                </span>{" "}
                当前是本机示例数据，不会上传；可随时清除。
              </p>
              <button
                type="button"
                onClick={onExitDemo}
                className="border-amber/40 text-amber-ink hover:bg-amber/[0.08] inline-flex min-h-11 items-center rounded-md border bg-surface px-3 text-[10px]"
              >
                清除示例并退出
              </button>
            </div>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
