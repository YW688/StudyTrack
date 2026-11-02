import type { ResumeBasics } from "../types";
import { RESUME_GRADES } from "../types";

interface ResumeBasicsFormProps {
  basics: ResumeBasics;
  open: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<ResumeBasics>) => void;
}

const FIELD =
  "border-rule focus-visible:border-accent-ink focus:ring-2 focus:ring-accent/45 min-h-11 w-full rounded-lg border bg-surface px-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-4";
const LABEL =
  "mb-1.5 block font-mono text-micro tracking-[0.14em] text-ink-3";

export default function ResumeBasicsForm({
  basics,
  open,
  onToggle,
  onChange,
}: ResumeBasicsFormProps) {
  const filled = Object.values(basics).filter(
    (value) => value.trim().length > 0,
  ).length;

  return (
    <section
      id="resume-basics"
      className="resume-basics border-rule rounded-xl border bg-surface"
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls="resume-basics-fields"
        className="flex min-h-12 w-full items-center justify-between gap-3 px-4 text-left sm:px-5"
      >
        <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-sm font-medium">基本信息</span>
          <span className="font-mono text-micro tabular-nums text-ink-3">
            {filled}/8 已填
          </span>
        </span>
        <span className="flex items-center gap-3">
          <span className="hidden text-micro text-ink-4 sm:inline">
            全部可留空，空字段不打印
          </span>
          <span
            aria-hidden="true"
            className={[
              "text-ink-3 transition-transform",
              open ? "rotate-180" : "",
            ].join(" ")}
          >
            ⌄
          </span>
        </span>
      </button>

      {open && (
        <div
          id="resume-basics-fields"
          className="border-rule border-t px-4 py-4 sm:px-5"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="resume-name" className={LABEL}>
                姓名
              </label>
              <input
                id="resume-name"
                type="text"
                value={basics.name}
                onChange={(event) => onChange({ name: event.target.value })}
                autoComplete="name"
                placeholder="例如：林知夏"
                className={FIELD}
              />
            </div>
            <div>
              <label htmlFor="resume-grade" className={LABEL}>
                年级
              </label>
              <select
                id="resume-grade"
                value={basics.grade}
                onChange={(event) => onChange({ grade: event.target.value })}
                className={FIELD}
              >
                <option value="">未填写</option>
                {RESUME_GRADES.map((grade) => (
                  <option key={grade} value={grade}>
                    {grade}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="resume-school" className={LABEL}>
                学校
              </label>
              <input
                id="resume-school"
                type="text"
                value={basics.school}
                onChange={(event) => onChange({ school: event.target.value })}
                autoComplete="organization"
                placeholder="例如：某某大学"
                className={FIELD}
              />
            </div>
            <div>
              <label htmlFor="resume-major" className={LABEL}>
                专业
              </label>
              <input
                id="resume-major"
                type="text"
                value={basics.major}
                onChange={(event) => onChange({ major: event.target.value })}
                placeholder="例如：计算机科学与技术"
                className={FIELD}
              />
            </div>
            <div>
              <label htmlFor="resume-city" className={LABEL}>
                城市
              </label>
              <input
                id="resume-city"
                type="text"
                value={basics.city}
                onChange={(event) => onChange({ city: event.target.value })}
                autoComplete="address-level2"
                placeholder="例如：杭州"
                className={FIELD}
              />
            </div>
            <div>
              <label htmlFor="resume-target" className={LABEL}>
                求职意向
              </label>
              <input
                id="resume-target"
                type="text"
                value={basics.target}
                onChange={(event) => onChange({ target: event.target.value })}
                placeholder="例如：前端开发实习生"
                className={FIELD}
              />
            </div>
            <div>
              <label htmlFor="resume-phone" className={LABEL}>
                手机
              </label>
              <input
                id="resume-phone"
                type="tel"
                value={basics.phone}
                onChange={(event) => onChange({ phone: event.target.value })}
                autoComplete="tel"
                placeholder="选填"
                className={FIELD}
              />
            </div>
            <div>
              <label htmlFor="resume-email" className={LABEL}>
                邮箱
              </label>
              <input
                id="resume-email"
                type="email"
                value={basics.email}
                onChange={(event) => onChange({ email: event.target.value })}
                autoComplete="email"
                placeholder="选填"
                className={FIELD}
              />
            </div>
          </div>

          <p className="mt-3 text-micro leading-5 text-ink-4">
            技能由所选经历的标签自动汇总；作品集链接会包含你填写的姓名与联系方式，分享前请确认。
          </p>
        </div>
      )}
    </section>
  );
}
