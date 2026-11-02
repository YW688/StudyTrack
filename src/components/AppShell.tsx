import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import BrandMark from "./BrandMark";
import DataBackup from "./DataBackup";
import PanelIcon from "./PanelIcon";
import Topbar from "./Topbar";
import type { CommandItem } from "./CommandPalette";
import { THEMES, nextTheme, type ThemeId } from "../lib/theme";

const NAV = [
  {
    id: "today",
    no: "01",
    label: "今日",
    short: "今",
    tone: "#d4ece4",
    ink: "#2f6b60",
  },
  {
    id: "experiences",
    no: "02",
    label: "账本",
    short: "账",
    tone: "#dde6f5",
    ink: "#3d5478",
  },
  {
    id: "opportunities",
    no: "03",
    label: "悬赏",
    short: "悬",
    tone: "#f7dce7",
    ink: "#7c3b58",
  },
  {
    id: "toolbox",
    no: "04",
    label: "工具箱",
    short: "箱",
    tone: "#f5e7cd",
    ink: "#6f5323",
  },
] as const;

type NavId = (typeof NAV)[number]["id"];

export type ShellWindowId =
  | "timetable"
  | "assignments"
  | "experiences"
  | "opportunities"
  | "resume"
  | "calendar";

const RAIL_KEY = "studytrack:rail";
const STATUS_KEY = "studytrack:statusbar";

function readRailCollapsed(): boolean {
  try {
    return window.localStorage.getItem(RAIL_KEY) === "1";
  } catch {
    return false;
  }
}

function readStatusCollapsed(): boolean {
  try {
    return window.localStorage.getItem(STATUS_KEY) === "1";
  } catch {
    return false;
  }
}

interface AppShellProps {
  active: NavId;
  routeKey: string;
  theme: ThemeId;
  onThemeChange: (theme: ThemeId) => void;
  hasData: boolean;
  counts: Record<NavId, number>;
  demoMode: boolean;
  onClear: () => Promise<void>;
  onExport: () => Promise<void>;
  onImport: (text: string) => Promise<{ ok: boolean; message: string }>;
  onHome: () => void;
  onNavigate: (id: NavId) => void;
  onOpenWindow: (id: ShellWindowId) => void;
  onOpenAgent: () => void;
  scope: string;
  recents: { id: string; title: string; meta: string }[];
  weekLine: string;
  week: string;
  dock?: ReactNode;
  dockWidth: number;
  children: ReactNode;
}

export default function AppShell({
  active,
  routeKey,
  theme,
  onThemeChange,
  hasData,
  counts,
  demoMode,
  onClear,
  onExport,
  onImport,
  onHome,
  onNavigate,
  onOpenWindow,
  onOpenAgent,
  scope,
  recents,
  weekLine,
  week,
  dock,
  dockWidth,
  children,
}: AppShellProps) {
  const [collapsed, setCollapsed] = useState(readRailCollapsed);
  const [statusCollapsed, setStatusCollapsed] = useState(readStatusCollapsed);
  const currentTheme = THEMES.find((item) => item.id === theme) ?? THEMES[0];
  const upcomingTheme =
    THEMES.find((item) => item.id === nextTheme(theme)) ?? THEMES[0];
  const activeItem = NAV.find((item) => item.id === active) ?? NAV[0];
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    sheetRef.current?.scrollTo({ top: 0 });
  }, [routeKey]);

  useEffect(() => {
    try {
      window.localStorage.setItem(RAIL_KEY, collapsed ? "1" : "0");
    } catch {
      // Layout preference only; storage may be disabled.
    }
  }, [collapsed]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STATUS_KEY, statusCollapsed ? "1" : "0");
    } catch {
      // Layout preference only; storage may be disabled.
    }
  }, [statusCollapsed]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "[" || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target?.isContentEditable
      ) {
        return;
      }
      event.preventDefault();
      setCollapsed((value) => !value);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const commands: CommandItem[] = [
    ...NAV.map((item) => ({
      id: `page-${item.id}`,
      label: item.label,
      group: "页面",
      run: () => onNavigate(item.id),
    })),
    {
      id: "tool-timetable",
      label: "课表",
      meta: "Excel 导入 · 周视图",
      group: "工具",
      run: () => onOpenWindow("timetable"),
    },
    {
      id: "tool-assignments",
      label: "作业",
      meta: "DDL 与完成状态",
      group: "工具",
      run: () => onOpenWindow("assignments"),
    },
    {
      id: "tool-resume",
      label: "简历工作台",
      meta: "勾选经历 · A4 打印",
      group: "工具",
      run: () => onOpenWindow("resume"),
    },
    {
      id: "tool-calendar",
      label: "日历",
      meta: "竞赛 · 考试 · 校内节点",
      group: "工具",
      run: () => onOpenWindow("calendar"),
    },
    {
      id: "agent",
      label: "打开记录官",
      meta: "建档 · 写账 · 查账",
      group: "助手",
      run: onOpenAgent,
    },
    {
      id: "theme",
      label: "切换配色",
      meta: `下一套：${upcomingTheme.name}`,
      group: "设置",
      run: () => onThemeChange(nextTheme(theme)),
    },
    {
      id: "export",
      label: "导出本机备份",
      meta: "JSON",
      group: "设置",
      run: () => void onExport(),
    },
  ];

  return (
    <div
      className={[
        "app-shell",
        collapsed ? "is-rail-collapsed" : "",
      ].join(" ")}
      style={
        {
          "--rail": collapsed ? "72px" : "232px",
          "--dock": `${dockWidth}px`,
        } as CSSProperties
      }
    >
      <aside className="app-sidebar">
        <div className="app-brand-row">
          <button
            type="button"
            onClick={onHome}
            className="app-brand"
            aria-label="返回首页"
          >
            <span className="app-brand-mark">
              <BrandMark size={30} />
            </span>
            <span className="app-brand-text">
              <span className="app-brand-name">学径</span>
              <span className="app-brand-sub">学习与经历工作台</span>
            </span>
          </button>

          <button
            type="button"
            className="app-sidebar-toggle"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? "展开侧边栏" : "收起侧边栏"}
            title={collapsed ? "展开侧边栏（快捷键 [）" : "收起侧边栏（快捷键 [）"}
          >
            <PanelIcon collapsed={collapsed} />
          </button>

          <button
            type="button"
            className="app-sidebar-theme"
            onClick={() => onThemeChange(nextTheme(theme))}
            aria-label={`切换配色 当前${currentTheme.name}`}
            title={`切换到${upcomingTheme.name}`}
          >
            <span
              aria-hidden="true"
              className="app-sidebar-theme-dot"
              style={{ backgroundImage: currentTheme.swatch }}
            />
            <span>{currentTheme.name}</span>
          </button>
        </div>

        {!collapsed && (
          <div className="app-scope">
            <span aria-hidden="true" className="app-scope-dot" />
            <strong>{scope}</strong>
          </div>
        )}

        <nav className="app-nav" aria-label="四个面导航">
          {NAV.map((item) => {
            const isActive = item.id === active;
            const count = counts[item.id] ?? 0;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                aria-current={isActive ? "page" : undefined}
                title={item.label}
                className={[
                  "app-nav-item",
                  isActive ? "is-active" : "",
                ].join(" ")}
              >
                <span
                  aria-hidden="true"
                  className="app-nav-char"
                  style={{
                    background: item.tone,
                    color: item.ink,
                    borderColor: `color-mix(in srgb, ${item.ink} 18%, transparent)`,
                  }}
                >
                  {item.short}
                </span>
                <span className="app-nav-label">
                  {item.label}
                  <span className="app-nav-no">{item.no}</span>
                </span>
                {count > 0 && (
                  <span
                    className="app-nav-count"
                    aria-label={`${count} 项待处理`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <details className="app-mobile-data lg:hidden">
          <summary>
            数据与备份
            <span aria-hidden="true">+</span>
          </summary>
          <div className="app-mobile-data-body">
            <DataBackup
              hasData={hasData}
              onExport={onExport}
              onImport={onImport}
              onClear={onClear}
            />
          </div>
        </details>

        {!collapsed && (
          <div className="app-sidebar-recents">
            <div className="app-sidebar-section-head">
              <span>最近战绩</span>
              <button
                type="button"
                onClick={() => onOpenWindow("experiences")}
              >
                全部
              </button>
            </div>
            {recents.length > 0 ? (
              <ul className="app-recent-list">
                {recents.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="app-recent"
                      onClick={() => onOpenWindow("experiences")}
                    >
                      <span className="app-recent-title">{item.title}</span>
                      <span className="app-recent-meta">{item.meta}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="app-recent-empty">
                还没有战绩。今天在今日页记一条，会出现在这里。
              </p>
            )}
            <p className="app-sidebar-week">{weekLine}</p>
          </div>
        )}

        <div className="app-sidebar-foot">
          {collapsed ? (
            <span className="app-sidebar-mini">
              <span aria-hidden="true" className="app-sidebar-mini-dot" />
              本机
            </span>
          ) : (
            <>
              <div>
                <p className="app-sidebar-label">界面配色</p>
                <div
                  role="group"
                  aria-label="界面配色"
                  className="app-theme-grid"
                >
                  {THEMES.map((item) => {
                    const selected = item.id === theme;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => onThemeChange(item.id)}
                        className={selected ? "is-active" : ""}
                      >
                        <span
                          aria-hidden="true"
                          className="app-theme-dot"
                          style={{ backgroundImage: item.swatch }}
                        />
                        {item.name}
                      </button>
                    );
                  })}
                </div>
              </div>
              <p className="app-sidebar-note">
                <span aria-hidden="true" />
                数据只存在你的浏览器
              </p>
              <div className="app-sidebar-backup">
                <DataBackup
                  hasData={hasData}
                  onExport={onExport}
                  onImport={onImport}
                  onClear={onClear}
                />
              </div>
            </>
          )}
        </div>
      </aside>

      <div className="app-main">
        <Topbar
          crumb={activeItem.label}
          week={week}
          todo={counts.today}
          demoMode={demoMode}
          collapsed={statusCollapsed}
          commands={commands}
          onToggle={() => setStatusCollapsed((value) => !value)}
          onHome={onHome}
          onOpenAgent={onOpenAgent}
        />
        <div className="app-sheet" ref={sheetRef}>
          {children}
        </div>
      </div>

      {dock && <aside className="app-dock">{dock}</aside>}
    </div>
  );
}
