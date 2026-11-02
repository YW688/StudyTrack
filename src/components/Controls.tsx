import type { ReactNode } from "react";

export interface SegmentedOption<T extends string> {
  id: T;
  label: string;
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={["ctl-group", className].filter(Boolean).join(" ")}
    >
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={value === option.id}
          onClick={() => onChange(option.id)}
          className="ctl-seg"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export interface StepperItem {
  value: number;
  label: string;
}

export function Stepper({
  label,
  items,
  value,
  onChange,
}: {
  label: string;
  items: StepperItem[];
  value: number;
  onChange: (value: number) => void;
}) {
  const index = items.findIndex((item) => item.value === value);
  const prev = index > 0 ? items[index - 1] : undefined;
  const next = index >= 0 ? items[index + 1] : undefined;

  return (
    <div role="group" aria-label={label} className="ctl-group">
      <button
        type="button"
        aria-label="上一项"
        disabled={!prev}
        onClick={() => prev && onChange(prev.value)}
        className="ctl-icon"
      >
        <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M9.5 4 5.5 8l4 4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <span className="ctl-select-wrap">
        <label htmlFor={`stepper-${label}`} className="sr-only">
          {label}
        </label>
        <select
          id={`stepper-${label}`}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="ctl-select"
        >
          {items.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <svg
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
          className="ctl-select-caret"
        >
          <path
            d="M4 6.5 8 10.5 12 6.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <button
        type="button"
        aria-label="下一项"
        disabled={!next}
        onClick={() => next && onChange(next.value)}
        className="ctl-icon"
      >
        <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M6.5 4l4 4-4 4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}

export function ToolbarButton({
  children,
  onClick,
  disabled,
  ariaLabel,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled}
      className="ctl-btn"
    >
      {children}
    </button>
  );
}
