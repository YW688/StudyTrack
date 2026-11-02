import { useEffect, useState } from "react";
import CommandPalette, { type CommandItem } from "./CommandPalette";

interface TopbarProps {
  crumb: string;
  week: string;
  todo: number;
  demoMode: boolean;
  collapsed: boolean;
  commands: CommandItem[];
  onToggle: () => void;
  onHome: () => void;
  onOpenAgent: () => void;
}

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      className="shrink-0"
    >
      <circle cx="9" cy="9" r="5.2" />
      <path d="m13 13 4 4" />
    </svg>
  );
}

function BarChevron({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      {collapsed ? (
        <path d="m5 8 5 5 5-5" />
      ) : (
        <path d="m5 12 5-5 5 5" />
      )}
    </svg>
  );
}

export default function Topbar({
  crumb,
  week,
  todo,
  demoMode,
  collapsed,
  commands,
  onToggle,
  onHome,
  onOpenAgent,
}: TopbarProps) {
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <header className="app-topbar" data-collapsed={collapsed}>
        <div className="app-topbar-left">
          <button type="button" className="app-topbar-home" onClick={onHome}>
            学径
          </button>
          <span aria-hidden="true" className="app-topbar-slash">
            /
          </span>
          <strong className="app-topbar-crumb">{crumb}</strong>
        </div>

        {!collapsed && (
          <button
            type="button"
            className="app-topbar-search"
            onClick={() => setPaletteOpen(true)}
            aria-label="搜索页面、工具或动作"
          >
            <SearchIcon />
            <span className="app-topbar-search-text">
              搜索页面、工具或动作
            </span>
            <kbd>⌘K</kbd>
          </button>
        )}

        <div className="app-topbar-actions">
          {!collapsed && (
            <>
              <span className="app-topbar-chip">{week}</span>
              {todo > 0 && (
                <span className="app-topbar-chip">待办 {todo}</span>
              )}
              {demoMode && (
                <span className="app-topbar-chip is-demo">示例</span>
              )}
              <button
                type="button"
                className="app-topbar-agent"
                onClick={onOpenAgent}
                aria-label="打开记录官"
              >
                <span aria-hidden="true" className="app-topbar-agent-mark">
                  记
                </span>
                <span className="app-topbar-agent-label">记录官</span>
              </button>
            </>
          )}
          <button
            type="button"
            className="app-topbar-toggle"
            onClick={onToggle}
            aria-label={collapsed ? "展开状态栏" : "收起状态栏"}
            aria-expanded={!collapsed}
            title={collapsed ? "展开状态栏" : "收起状态栏"}
          >
            <BarChevron collapsed={collapsed} />
          </button>
        </div>
      </header>

      <CommandPalette
        open={paletteOpen}
        items={commands}
        onClose={() => setPaletteOpen(false)}
      />
    </>
  );
}
