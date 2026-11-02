import type { ResumeTemplateId } from "../types";

interface ResumeTemplatesProps {
  value: ResumeTemplateId;
  onChange: (template: ResumeTemplateId) => void;
}

export const RESUME_TEMPLATE_OPTIONS: {
  id: ResumeTemplateId;
  name: string;
  note: string;
}[] = [
  { id: "classic", name: "经典单栏", note: "通用稳妥" },
  { id: "photo", name: "证件照", note: "照片醒目" },
  { id: "split", name: "双栏分区", note: "教育技能靠左" },
  { id: "timeline", name: "时间年表", note: "日期独立成列" },
  { id: "labels", name: "栏签", note: "栏目名靠左" },
  { id: "compact", name: "紧凑一页", note: "经历多更耐装" },
];

export default function ResumeTemplates({
  value,
  onChange,
}: ResumeTemplatesProps) {
  return (
    <section
      aria-labelledby="resume-template-title"
      className="resume-templates border-rule bg-surface mt-3 rounded-xl border"
    >
      <div className="border-rule flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
        <div className="flex items-baseline gap-2">
          <h2 id="resume-template-title" className="text-sm font-medium">
            版式
          </h2>
          <span className="font-mono text-micro text-ink-3">6 套</span>
        </div>
        <p className="text-micro text-ink-4">点一下即时换 打印仍是 A4</p>
      </div>

      <div
        role="group"
        aria-label="简历版式"
        className="grid grid-cols-3 gap-2 p-3 sm:grid-cols-6"
      >
        {RESUME_TEMPLATE_OPTIONS.map((option) => {
          const active = value === option.id;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option.id)}
              className={[
                "flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-lg border px-1.5 py-2 text-center transition-colors focus-visible:ring-2 focus-visible:ring-accent/45 focus-visible:outline-none",
                active
                  ? "border-accent-ink bg-accent/[0.06]"
                  : "border-rule hover:bg-ink/[0.02]",
              ].join(" ")}
            >
              <span
                aria-hidden="true"
                className="resume-template-thumb"
                data-template={option.id}
              >
                <span className="rtt-photo" />
                <span className="rtt-name" />
                <span className="rtt-line rtt-line--1" />
                <span className="rtt-line rtt-line--2" />
                <span className="rtt-line rtt-line--3" />
              </span>
              <span className="flex flex-col gap-0.5">
                <span
                  className={[
                    "text-[11px] font-medium leading-4",
                    active ? "text-ink" : "text-ink-2",
                  ].join(" ")}
                >
                  {option.name}
                </span>
                <span className="text-[10px] leading-3 text-ink-4">
                  {option.note}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
