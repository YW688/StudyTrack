import { useEffect, useMemo, useRef, useState } from "react";

export interface CommandItem {
  id: string;
  label: string;
  meta?: string;
  group: string;
  run: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  items: CommandItem[];
  onClose: () => void;
}

export default function CommandPalette({
  open,
  items,
  onClose,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setIndex(0);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 10);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return items.slice(0, 12);
    return items
      .filter((item) =>
        `${item.label} ${item.meta ?? ""} ${item.group}`
          .toLowerCase()
          .includes(value),
      )
      .slice(0, 14);
  }, [items, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, CommandItem[]>();
    filtered.forEach((item) => {
      const list = map.get(item.group) ?? [];
      list.push(item);
      map.set(item.group, list);
    });
    return [...map.entries()];
  }, [filtered]);

  if (!open) return null;

  function run(item: CommandItem) {
    onClose();
    item.run();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIndex((value) =>
        filtered.length ? (value + 1) % filtered.length : 0,
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setIndex((value) =>
        filtered.length
          ? (value - 1 + filtered.length) % filtered.length
          : 0,
      );
    } else if (event.key === "Enter") {
      event.preventDefault();
      const item = filtered[index];
      if (item) run(item);
    }
  }

  return (
    <div
      className="app-cmdk-backdrop"
      onMouseDown={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="搜索页面、工具或动作"
        className="app-cmdk"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="app-cmdk-input-row">
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          >
            <circle cx="9" cy="9" r="5.2" />
            <path d="m13 13 4 4" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="搜索页面、工具或动作"
            aria-label="搜索页面、工具或动作"
          />
          <kbd>Esc</kbd>
        </div>

        <div className="app-cmdk-list" role="listbox">
          {filtered.length === 0 ? (
            <p className="app-cmdk-empty">没有匹配项</p>
          ) : (
            grouped.map(([group, groupItems]) => (
              <div key={group}>
                <p className="app-cmdk-group">{group}</p>
                {groupItems.map((item) => {
                  const active = filtered.indexOf(item) === index;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="option"
                      aria-selected={active}
                      onMouseEnter={() => setIndex(filtered.indexOf(item))}
                      onClick={() => run(item)}
                      className={[
                        "app-cmdk-item",
                        active ? "is-active" : "",
                      ].join(" ")}
                    >
                      <span className="app-cmdk-item-label">{item.label}</span>
                      {item.meta && (
                        <span className="app-cmdk-item-meta">{item.meta}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
