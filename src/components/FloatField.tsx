interface FloatFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  rows?: number;
  type?: "text" | "password" | "month" | "url" | "number";
  maxLength?: number;
  hint?: string;
  warn?: boolean;
  required?: boolean;
  id?: string;
  inputClassName?: string;
  inputRef?: (node: HTMLInputElement | null) => void;
  onBlur?: () => void;
}

/**
 * 浮动标签：空态时标签停在框内文字位置，聚焦或已有内容后缩到框上沿并常驻。
 * 占位符固定为一个空格，只为让 :placeholder-shown 能判断空值，不承担说明文字。
 */
export function FloatField({
  label,
  value,
  onChange,
  multiline = false,
  rows = 2,
  type = "text",
  maxLength,
  hint,
  warn = false,
  required = false,
  id,
  inputClassName = "",
  inputRef,
  onBlur,
}: FloatFieldProps) {
  const classes = ["float-control", inputClassName].join(" ");

  return (
    <label
      htmlFor={id}
      className={[
        "float-field",
        multiline ? "is-multiline" : "",
        warn ? "is-lowconf" : "",
      ].join(" ")}
    >
      {multiline ? (
        <textarea
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          rows={rows}
          maxLength={maxLength}
          placeholder=" "
          className={`${classes} resize-y leading-5`}
        />
      ) : (
        <input
          id={id}
          ref={inputRef}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          maxLength={maxLength}
          placeholder=" "
          className={classes}
        />
      )}
      <span className="float-label">
        {label}
        {required && <span className="text-amber-ink"> *</span>}
      </span>
      {hint && (
        <span className="text-ink-4 mt-1 block text-micro leading-4">
          {hint}
        </span>
      )}
    </label>
  );
}

interface FloatSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
  id?: string;
}

export function FloatSelect({
  label,
  value,
  onChange,
  options,
  required = false,
  id,
}: FloatSelectProps) {
  return (
    <label htmlFor={id} className="float-field is-always">
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="float-control cursor-pointer"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span className="float-label">
        {label}
        {required && <span className="text-amber-ink"> *</span>}
      </span>
    </label>
  );
}
