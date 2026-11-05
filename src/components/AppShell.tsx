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
import ProfileSigil from "./ProfileSigil";
import Topbar from "./Topbar";
import TopbarIsland from "./TopbarIsland";
import type { CommandItem } from "./CommandPalette";
import { GOAL_LABELS, type Goal } from "../types";
import { THEMES, nextTheme, type ThemeId } from "../lib/theme";
import type { GreenMatrix } from "../lib/ledger";

const NAV = [
  {
    id: "today",
    label: "今日",
    short: "今",
    unit: "项待办",
    tone: "#d4ece4",
    ink: "#2f6b60",
  },
  {
    id: "experiences",
    label: "征途",
    short: "途",
    unit: "条战绩",
    tone: "#dde6f5",
    ink: "#3d5478",
  },
  {
    id: "opportunities",
    label: "征召",
    short: "征",
    unit: "条线索",
    tone: "#f7dce7",
    ink: "#7c3b58",
  },
  {
    id: "toolbox",
    label: "工具箱",
    short: "箱",
    unit: "项",
    tone: "#f5e7cd",
    ink: "#6f5323",
  },
  {
    id: "space",
    label: "学径空间",
    short: "星",
    unit: "天星光",
    tone: "#e7e1f4",
    ink: "#54427f",
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
  cursorOn: boolean;
  onCursorChange: () => void;
  hasData: boolean;
  locked: boolean;
  counts: Record<NavId, number>;
  demoMode: boolean;
  onClear: () => Promise<void>;
  onExport: () => Promise<void>;
  onImport: (text: string) => Promise<{ ok: boolean; message: string }>;
  onHome: () => void;
  onNavigate: (id: NavId) => void;
  onOpenWindow: (id: ShellWindowId) => void;
  onOpenAgent: () => void;
  grade: string;
  major: string;
  goal: Goal | null;
  avatar: string | null;
  onAvatarChange: (next: string | null) => Promise<void>;
  recents: { id: string; title: string; meta: string }[];
  weekLine: string;
  week: string;
  level: number;
  levelPercent: number;
  ready: number;
  total: number;
  comboDays: number;
  checkin: GreenMatrix;
  archiveTitle: string;
  toast: { id: number; text: string } | null;
  dock?: ReactNode;
  dockWidth: number;
  children: ReactNode;
}

export default function AppShell({
  active,
  routeKey,
  theme,
  onThemeChange,
  cursorOn,
  onCursorChange,
  hasData,
  locked,
  counts,
  demoMode,
  onClear,
  onExport,
  onImport,
  onHome,
  onNavigate,
  onOpenWindow,
  onOpenAgent,
  grade,
  major,
  goal,
  avatar,
  onAvatarChange,
  recents,
  weekLine,
  week,
  level,
  levelPercent,
  ready,
  total,
  comboDays,
  checkin,
  archiveTitle,
  toast,
  dock,
  dockWidth,
  children,
}: AppShellProps) {
  const [collapsed, setCollapsed] = useState(readRailCollapsed);
  const [statusCollapsed, setStatusCollapsed] = useState(readStatusCollapsed);
  const [islandOpen, setIslandOpen] = useState(false);
  const currentTheme = THEMES.find((item) => item.id === theme) ?? THEMES[0];
  const upcomingTheme =
    THEMES.find((item) => item.id === nextTheme(theme)) ?? THEMES[0];
  const activeItem = NAV.find((item) => item.id === active) ?? NAV[0];
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    sheetRef.current?.scrollTo({ top: 0 });
    setIslandOpen(false);
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

  const allCommands: CommandItem[] = [
    ...NAV.map((item) => ({
      id: `page-${item.id}`,
      label: item.label,
      group: "页面",
      run: () => onNavigate(item.id),
    })),
    {
      id: "tool-timetable",
      label: "课表",
      meta: "Excel 导入 周视图",
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
      meta: "勾选经历 A4 打印",
      group: "工具",
      run: () => onOpenWindow("resume"),
    },
    {
      id: "tool-calendar",
      label: "日历",
      meta: "竞赛 考试 校内节点",
      group: "工具",
      run: () => onOpenWindow("calendar"),
    },
    {
      id: "agent",
      label: "打开记录官",
      meta: "建档 写账 查账",
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
      id: "cursor",
      label: cursorOn ? "关闭主题光标" : "开启主题光标",
      meta: cursorOn ? "恢复系统指针" : "跟随当前配色",
      group: "设置",
      run: onCursorChange,
    },
    {
      id: "export",
      label: "导出本机备份",
      meta: "JSON",
      group: "设置",
      run: () => void onExport(),
    },
  ];
  const commands = locked
    ? allCommands.filter((item) => item.group === "设置")
    : allCommands;

  return (
    <div
      className={[
        "app-shell",
        collapsed ? "is-rail-collapsed" : "",
      ].join(" ")}
      style={
        {
          "--rail": collapsed ? "96px" : "232px",
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
        </div>

        <button
          type="button"
          onClick={() => setIslandOpen((value) => !value)}
          data-island-trigger
          aria-expanded={islandOpen}
          aria-haspopup="dialog"
          aria-label={islandOpen ? "收起本机存档卡" : "打开本机存档卡"}
          title={islandOpen ? "收起本机存档卡" : "打开本机存档卡"}
          className="app-profile"
        >
          <ProfileSigil
            grade={locked ? "" : grade}
            level={level}
            progress={levelPercent}
            goal={goal}
            avatar={locked ? null : avatar}
            size={42}
          />
          <span className="app-profile-text">
            <span className="app-profile-name">
              {locked ? "待建档" : major || "专业未填"}
            </span>
            <span className="app-profile-meta">
              {locked
                ? "填完 4 步开启主栏目"
                : goal
                  ? GOAL_LABELS[goal]
                  : "目标未填"}
            </span>
          </span>
          <span aria-hidden="true" className="app-profile-chev" />
        </button>

        <nav className="app-nav" aria-label="主导航">
          {NAV.map((item, index) => {
            const isActive = !locked && item.id === active;
            const count = locked ? 0 : (counts[item.id] ?? 0);
            return (
              <button
                key={item.id}
                type="button"
                disabled={locked}
                onClick={() => onNavigate(item.id)}
                aria-current={isActive ? "page" : undefined}
                title={locked ? `${item.label} 完成建档后开启` : item.label}
                className={[
                  "app-nav-item",
                  isActive ? "is-active" : "",
                  locked ? "is-locked" : "",
                ].join(" ")}
                style={{ "--nav-ink": item.ink } as CSSProperties}
              >
                <span aria-hidden="true" className="app-nav-index">
                  {String(index + 1).padStart(2, "0")}
                </span>
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
                <span className="app-nav-label">{item.label}</span>
                {count > 0 && (
                  <span
                    className="app-nav-badge"
                    style={{ background: item.ink, color: item.tone }}
                    aria-label={`${count} ${item.unit}`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {locked && !collapsed && (
          <p className="app-nav-lock-note">
            <span aria-hidden="true" className="app-nav-lock-dot" />
            主栏目在建档完成后开启
          </p>
        )}

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

        <div className="app-sidebar-foot">
          <div className="app-sidebar-footer-row">
            <p className="app-sidebar-saved">
              <span
                aria-hidden="true"
                className="app-sidebar-saved-dot"
              />
              <span className="app-sidebar-saved-text">本机 已保存</span>
            </p>
          </div>
        </div>
      </aside>

      <div className="app-main">
        <Topbar
          crumb={locked ? "建档" : activeItem.label}
          week={week}
          todo={locked ? 0 : counts.today}
          demoMode={demoMode}
          collapsed={statusCollapsed}
          commands={commands}
          agentHidden={locked}
          island={
            <TopbarIsland
              open={islandOpen}
              onOpenChange={setIslandOpen}
              level={level}
              progress={levelPercent}
              grade={locked ? "" : grade}
              goal={goal}
              avatar={locked ? null : avatar}
              onAvatarChange={onAvatarChange}
              ready={ready}
              total={total}
              comboDays={comboDays}
              checkin={checkin}
              recentTitle={recents[0]?.title ?? null}
              archiveTitle={archiveTitle}
              toast={toast}
              weekLabel={week}
              weekLine={weekLine}
              nav={NAV.map((item) => ({
                id: item.id,
                label: item.label,
                count: locked ? 0 : (counts[item.id] ?? 0),
                tone: item.tone,
                ink: item.ink,
              }))}
              activeId={active}
              locked={locked}
              onNavigate={(id) => onNavigate(id as NavId)}
              agentHidden={locked}
              onOpenAgent={onOpenAgent}
              themeName={currentTheme.name}
              onNextTheme={() => onThemeChange(nextTheme(theme))}
              cursorOn={cursorOn}
              onCursorChange={onCursorChange}
              hasData={hasData}
              onExport={onExport}
              onImport={onImport}
              onClear={onClear}
            />
          }
          onToggle={() => setStatusCollapsed((value) => !value)}
          onHome={onHome}
          onOpenAgent={onOpenAgent}
          themeName={currentTheme.name}
          themeSwatch={currentTheme.swatch}
          onNextTheme={() => onThemeChange(nextTheme(theme))}
        />
        <div className="app-sheet" ref={sheetRef}>
          {children}
        </div>
      </div>

      {dock && <aside className="app-dock">{dock}</aside>}
    </div>
  );
}
