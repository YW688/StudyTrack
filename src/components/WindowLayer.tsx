import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

const STORAGE_PREFIX = "studytrack:window:";
const HEADER_HEIGHT = 44;
const EDGE = 8;
const NAV_SPLIT = 1024;

let nextZ = 70;

function measureViewport() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  let navRight = 0;
  if (width >= NAV_SPLIT) {
    const rail = document.querySelector(".app-sidebar");
    if (rail) navRight = rail.getBoundingClientRect().right + 12;
  }
  return { width, height, navRight };
}

interface WindowLayerProps {
  id: string;
  title: string;
  subtitle?: string;
  width?: number;
  height?: number;
  printable?: boolean;
  actions?: ReactNode;
  onClose: () => void;
  children: ReactNode;
}

function readPosition(id: string): { x: number; y: number } | null {
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${id}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { x?: unknown; y?: unknown };
    if (typeof parsed.x !== "number" || typeof parsed.y !== "number") {
      return null;
    }
    return { x: parsed.x, y: parsed.y };
  } catch {
    return null;
  }
}

function savePosition(id: string, position: { x: number; y: number }): void {
  try {
    window.localStorage.setItem(
      `${STORAGE_PREFIX}${id}`,
      JSON.stringify(position),
    );
  } catch {
    // Position is a UI preference; storage may be disabled.
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

export default function WindowLayer({
  id,
  title,
  subtitle,
  width = 560,
  height = 680,
  printable = false,
  actions,
  onClose,
  children,
}: WindowLayerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const positionRef = useRef<{ x: number; y: number } | null>(
    readPosition(id),
  );
  const [position, setPosition] = useState(positionRef.current);
  const [dragging, setDragging] = useState(false);
  const [zIndex, setZIndex] = useState(70);
  const [viewport, setViewport] = useState(measureViewport);

  useEffect(() => {
    const sync = () => setViewport(measureViewport());
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  useEffect(() => {
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    rootRef.current?.focus({ preventScroll: true });
    return () => {
      const back = returnFocusRef.current;
      if (back && document.contains(back)) back.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (rootRef.current?.contains(document.activeElement)) {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const desktop = viewport.width >= 640;
  const insetLeft = desktop ? viewport.navRight : 0;
  const frameWidth = Math.min(width, viewport.width - insetLeft - EDGE * 2);
  const frameHeight = Math.min(height, viewport.height - 96);
  const yMax = viewport.height - frameHeight - EDGE;
  const resolved = position ?? {
    x:
      frameWidth <= 520
        ? Math.max(insetLeft, viewport.width - frameWidth - 24)
        : Math.max(
            insetLeft,
            Math.round((viewport.width - EDGE + insetLeft - frameWidth) / 2),
          ),
    y: 64,
  };
  const x = clamp(
    resolved.x,
    EDGE,
    Math.max(EDGE, viewport.width - frameWidth - EDGE),
  );
  const y = clamp(resolved.y, EDGE, Math.max(EDGE, yMax));

  const raise = useCallback(() => {
    nextZ += 1;
    setZIndex(nextZ);
  }, []);

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    raise();
    if (!desktop) return;
    if (
      (event.target as HTMLElement).closest(
        "button, a, input, textarea, select",
      )
    ) {
      return;
    }
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragRef.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;
    const next = {
      x: clamp(
        event.clientX - dragRef.current.x,
        EDGE,
        Math.max(EDGE, viewport.width - frameWidth - EDGE),
      ),
      y: clamp(
        event.clientY - dragRef.current.y,
        EDGE,
        Math.max(EDGE, yMax),
      ),
    };
    positionRef.current = next;
    setPosition(next);
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;
    dragRef.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (positionRef.current) savePosition(id, positionRef.current);
  }

  const style: CSSProperties = desktop
    ? {
        left: x,
        top: y,
        width: frameWidth,
        height: frameHeight,
        zIndex,
      }
    : { zIndex };

  return (
    <div
      ref={rootRef}
      role="dialog"
      tabIndex={-1}
      aria-label={title}
      data-printable={printable ? "true" : undefined}
      onPointerDown={raise}
      style={style}
      className={[
        "window-layer border-rule bg-surface fixed flex flex-col overflow-hidden shadow-2xl",
        printable ? "" : "no-print",
        desktop
          ? "rounded-xl border"
          : "inset-x-0 bottom-0 h-[88dvh] rounded-t-2xl border-t",
      ].join(" ")}
    >
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={[
          "window-header border-rule bg-surface flex shrink-0 items-center gap-2 border-b pr-1 pl-3",
          desktop ? "cursor-grab touch-none select-none" : "",
          dragging ? "cursor-grabbing" : "",
        ].join(" ")}
        style={{ minHeight: HEADER_HEIGHT }}
      >
        <div className="min-w-0 flex-1 py-1.5">
          <p className="truncate text-[12px] leading-4 font-medium">{title}</p>
          {subtitle && (
            <p className="truncate font-mono text-micro leading-4 text-ink-4">
              {subtitle}
            </p>
          )}
        </div>
        {actions}
        <button
          type="button"
          onClick={onClose}
          aria-label={`关闭${title}`}
          className="hover:bg-ink/[0.05] inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-lg leading-none text-ink-3 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
        >
          ×
        </button>
      </div>
      <div className="window-body min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {children}
      </div>
    </div>
  );
}
