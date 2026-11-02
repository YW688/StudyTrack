import { useEffect, useRef, type ReactNode } from "react";
import ArchiveCard from "./ArchiveCard";
import DataBackup from "./DataBackup";
import type { GreenMatrix } from "../lib/ledger";
import type { Goal } from "../types";

export interface IslandNavItem {
  id: string;
  label: string;
  count: number;
  tone: string;
  ink: string;
}

interface TopbarIslandProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  level: number;
  progress: number;
  grade: string;
  goal: Goal | null;
  avatar: string | null;
  onAvatarChange: (next: string | null) => Promise<void>;
  ready: number;
  total: number;
  comboDays: number;
  checkin: GreenMatrix;
  recentTitle: string | null;
  archiveTitle: string;
  weekLabel: string;
  weekLine: string;
  nav: IslandNavItem[];
  activeId: string;
  locked: boolean;
  onNavigate: (id: string) => void;
  agentHidden: boolean;
  onOpenAgent: () => void;
  themeName: string;
  onNextTheme: () => void;
  hasData: boolean;
  onExport: () => Promise<void>;
  onImport: (text: string) => Promise<{ ok: boolean; message: string }>;
  onClear: () => Promise<void>;
  children?: ReactNode;
}

export default function TopbarIsland({
  open,
  onOpenChange,
  level,
  progress,
  grade,
  goal,
  avatar,
  onAvatarChange,
  ready,
  total,
  comboDays,
  checkin,
  recentTitle,
  archiveTitle,
  weekLabel,
  weekLine,
  nav,
  activeId,
  locked,
  onNavigate,
  agentHidden,
  onOpenAgent,
  themeName,
  onNextTheme,
  hasData,
  onExport,
  onImport,
  onClear,
}: TopbarIslandProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        onOpenChange(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onOpenChange]);

  return (
    <div ref={rootRef} className="app-island-slot">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="app-island"
      >
        <span aria-hidden="true" className="app-island-sigil" />
        <span className="font-mono text-micro tabular-nums">
          Lv.{level}
        </span>
        {comboDays > 0 && (
          <span className="app-island-combo">连击 {comboDays} 天</span>
        )}
        <span
          aria-hidden="true"
          className={["app-island-chev", open ? "is-open" : ""].join(" ")}
        />
        <span className="sr-only">展开快捷面板</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="快捷面板"
          className="app-island-panel"
        >
          <ArchiveCard
            level={level}
            progress={progress}
            grade={grade}
            goal={goal}
            avatar={avatar}
            onAvatarChange={onAvatarChange}
            ready={ready}
            total={total}
            comboDays={comboDays}
            checkin={checkin}
            recentTitle={recentTitle}
            title={archiveTitle}
            weekLabel={weekLabel}
          />

          {!locked && (
            <nav aria-label="四个面快捷导航" className="app-island-nav lg:hidden">
              {nav.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onNavigate(item.id);
                    onOpenChange(false);
                  }}
                  aria-current={item.id === activeId ? "page" : undefined}
                  className={[
                    "app-island-nav-item",
                    item.id === activeId ? "is-active" : "",
                  ].join(" ")}
                >
                  <span>{item.label}</span>
                  {item.count > 0 && (
                    <span
                      aria-hidden="true"
                      className="app-island-nav-count"
                      style={{ background: item.ink, color: item.tone }}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          )}

          <div className="app-island-actions">
            {!agentHidden && (
              <button
                type="button"
                onClick={() => {
                  onOpenAgent();
                  onOpenChange(false);
                }}
              >
                记录官
              </button>
            )}
            <button type="button" onClick={onNextTheme}>
              配色 {themeName}
            </button>
          </div>

          <details className="app-island-backup">
            <summary>
              本机数据
              <span aria-hidden="true">+</span>
            </summary>
            <div className="app-island-backup-body">
              <DataBackup
                hasData={hasData}
                onExport={onExport}
                onImport={onImport}
                onClear={onClear}
              />
            </div>
          </details>

          <p className="app-island-week">{weekLine}</p>
        </div>
      )}
    </div>
  );
}
