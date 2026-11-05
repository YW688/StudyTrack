import type { CSSProperties } from "react";
import {
  DEMO,
  FEATURED_EXPERIENCE,
  RESUME_SHOT,
  TIMETABLE_SHOT,
} from "./demoData";

const COURSE_TONES: Record<string, string> = {
  blue: "tone-2",
  clay: "tone-5",
  moss: "tone-1",
  plum: "tone-4",
  sand: "tone-3",
  slate: "tone-6",
};

function Pips({ units }: { units: number }) {
  return (
    <span aria-hidden="true" className="flex shrink-0 items-center gap-1">
      {[0, 1, 2, 3].map((index) => (
        <span key={index} className={`shot-pip ${index < units ? "is-on" : ""}`} />
      ))}
    </span>
  );
}

export function WeekShowcase() {
  const days = TIMETABLE_SHOT.days;
  const sessionCount = days.reduce((sum, day) => sum + day.sessions.length, 0);
  const periods = Array.from(
    { length: TIMETABLE_SHOT.periodCount },
    (_, index) => index + 1,
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span className="shot-lg font-serif leading-none">
            {TIMETABLE_SHOT.weekLabel}
          </span>
          <span className="shot-xs lp-faint">{TIMETABLE_SHOT.semesterName}</span>
        </div>
        <span className="shot-xs lp-soft shrink-0 rounded-full border lp-hairline px-2 py-0.5">
          {sessionCount} 个时段
        </span>
      </div>

      <div
        className="shot-week mt-2"
        style={
          {
            "--shot-rows": TIMETABLE_SHOT.periodCount,
          } as CSSProperties
        }
      >
        <span aria-hidden="true" />
        {days.map((day, index) => (
          <span
            key={day.label}
            className={[
              "shot-day",
              day.isToday ? "is-today" : "",
              index >= 5 ? "shot-quiet" : "",
            ].join(" ")}
          >
            <span className="shot-name">{day.label}</span>
            <span className={day.isToday ? "shot-date" : "shot-date shot-hide-narrow"}>
              {day.isToday ? "今天" : day.date}
            </span>
          </span>
        ))}

        {periods.map((period) => (
          <span
            key={period}
            className="shot-period"
            style={{ gridColumn: 1, gridRow: period + 1 }}
          >
            {period}
          </span>
        ))}

        {days.map((day, index) => (
          <div
            key={`lane-${day.label}`}
            aria-hidden="true"
            className={[
              "shot-lane",
              day.isToday ? "is-today" : "",
              index >= 5 ? "shot-quiet" : "",
            ].join(" ")}
            style={{
              gridColumn: index + 2,
              gridRow: `2 / ${TIMETABLE_SHOT.periodCount + 2}`,
            }}
          />
        ))}

        {days.map((day, index) =>
          day.sessions.map((session, slot) => (
            <div
              key={`${day.label}-${session.name}-${session.start}-${slot}`}
              className={`shot-course ${COURSE_TONES[session.color] ?? "tone-6"}`}
              style={{
                gridColumn: index + 2,
                gridRow: `${session.start + 1} / span ${
                  session.end - session.start + 1
                }`,
              }}
            >
              <p className="shot-sm truncate leading-[1.25] font-medium">
                {session.name}
              </p>
              <p className="shot-room shot-wide-only shot-xs truncate leading-[1.3]">
                {session.location}
              </p>
              <span className="shot-weeks shot-wide-only shot-xs">
                {session.weeksLabel}
              </span>
            </div>
          )),
        )}
      </div>
    </div>
  );
}

export function ExperienceShowcase() {
  const experience = FEATURED_EXPERIENCE;
  if (!experience) return null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="shot-xs lp-soft inline-flex shrink-0 items-center gap-1 rounded-full border lp-hairline px-2 py-0.5">
            {experience.kindLabel}
            <span className="lp-faint">{experience.range}</span>
          </span>
          <p className="shot-lg mt-2 truncate font-serif leading-[1.25]">
            {experience.title}
          </p>
          {experience.org && (
            <p className="shot-xs lp-faint mt-1 truncate">{experience.org}</p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <Pips units={experience.stars} />
          <span className="shot-xs lp-faint">{experience.tierText}</span>
        </div>
      </div>

      <div className="mt-3 grid flex-1 grid-cols-2 overflow-hidden rounded-lg border lp-hairline">
        {experience.parts.map((part, index) => (
          <div
            key={part.label}
            className={[
              "flex min-h-0 flex-col justify-center px-2.5 py-2",
              index < 2 ? "border-b lp-hairline" : "",
              index % 2 === 0 ? "border-r lp-hairline" : "",
            ].join(" ")}
          >
            <p className="shot-xs lp-faint">{part.label}</p>
            <p className="shot-sm mt-1 line-clamp-2 leading-[1.4]">
              {part.text.trim() || "原文未提供"}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-2 grid flex-none grid-cols-2 gap-3 border-t lp-hairline pt-2">
        <div className="min-w-0">
          <p className="shot-xs lp-faint">量化数据</p>
          {experience.metrics.length > 0 ? (
            <ul className="mt-1 space-y-0.5">
              {experience.metrics.slice(0, 3).map((metric) => (
                <li
                  key={metric.label}
                  className="shot-sm flex items-baseline justify-between gap-2"
                >
                  <span className="truncate lp-soft">{metric.label}</span>
                  <span className="shrink-0 font-serif tabular-nums">
                    {metric.value}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="shot-xs lp-soft mt-1">原文未提供量化数据</p>
          )}
        </div>
        <div className="min-w-0">
          <p className="shot-xs lp-faint">证据</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {experience.evidence.length > 0 ? (
              experience.evidence.slice(0, 3).map((label) => (
                <span
                  key={label}
                  className="shot-xs lp-soft lp-fill rounded-[3px] px-1.5 py-0.5"
                >
                  {label}
                </span>
              ))
            ) : (
              <span className="shot-xs lp-soft">暂无证据 可补报告 截图或链接</span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-1.5 flex flex-wrap gap-1">
        {experience.skills.slice(0, 4).map((skill) => (
          <span
            key={skill}
            className="shot-xs shot-wide-only lp-faint rounded-[3px] border lp-hairline px-1.5 py-0.5"
          >
            {skill}
          </span>
        ))}
      </div>
    </div>
  );
}

export function ResumeShowcase() {
  return (
    <div className="relative flex h-full items-center justify-center">
      <div
        aria-hidden="true"
        className="absolute h-[84%] w-[42%] translate-x-[7%] translate-y-[3%] rotate-[1.8deg] rounded-[3px] border lp-hairline"
        style={{
          backgroundColor:
            "color-mix(in srgb, var(--lp-surface), #fff 22%)",
        }}
      />

      <div
        className="resume-sheet relative flex h-[96%] flex-col overflow-hidden rounded-[3px] border lp-hairline bg-[#fffdf9] px-[6.5%] py-[4%] shadow-[0_36px_54px_-42px_rgba(60,45,35,0.7)]"
        style={{ aspectRatio: "210 / 297" }}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="shot-md font-serif leading-none">
            {RESUME_SHOT.name || "个人简历"}
          </p>
          <p className="shot-xs lp-soft shrink-0 text-right leading-[1.4]">
            {RESUME_SHOT.contact}
          </p>
        </div>
        {RESUME_SHOT.target && (
          <p className="shot-xs lp-soft mt-1 leading-[1.4]">
            求职意向：{RESUME_SHOT.target}
          </p>
        )}

        <div className="lp-hairline mt-1.5 border-t pt-1">
          <p className="shot-xs lp-soft leading-[1.4] font-medium">教育</p>
          <p className="shot-xs lp-soft leading-[1.45]">
            {RESUME_SHOT.education}
          </p>
        </div>

        <div className="lp-hairline mt-1 min-h-0 border-t pt-1">
          <p className="shot-xs lp-soft leading-[1.4] font-medium">经历</p>
          <ul className="mt-1 space-y-1.5">
            {RESUME_SHOT.entries.map((entry) => (
              <li key={entry.title}>
                <div className="flex items-baseline justify-between gap-2">
                  <p className="shot-xs truncate leading-[1.45] font-medium">
                    {entry.title}
                  </p>
                  <p className="shot-xs lp-faint shrink-0 tabular-nums leading-[1.45]">
                    {entry.range}
                  </p>
                </div>
                {entry.org && (
                  <p className="shot-xs lp-faint leading-[1.45]">{entry.org}</p>
                )}
                {entry.bullets.slice(0, 2).map((bullet) => (
                  <p
                    key={bullet}
                    className="shot-xs lp-soft mt-0.5 line-clamp-2 leading-[1.45]"
                  >
                    {bullet}
                  </p>
                ))}
              </li>
            ))}
          </ul>
        </div>

        <div className="lp-hairline mt-auto border-t pt-1">
          <p className="shot-xs lp-soft leading-[1.4] font-medium">技能</p>
          <p className="shot-xs lp-soft leading-[1.45]">
            {RESUME_SHOT.skills || "勾选经历后自动汇总"}
          </p>
        </div>
      </div>

      <span className="shot-xs lp-faint shot-hide-narrow absolute right-0 bottom-0 rounded-full border lp-hairline px-2 py-0.5">
        A4 浏览器打印
      </span>
    </div>
  );
}

export function MatchShowcase() {
  const jobs = DEMO.jobs;
  const featured = jobs[0];
  if (!featured) return null;

  const matchable = featured.hits.length + featured.gaps.length;
  const filled = Math.max(0, Math.min(10, Math.round(featured.score / 10)));

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 rounded-full border lp-hairline px-2.5 py-1.5">
        <div className="shot-xs flex min-w-0 items-center gap-1.5">
          <span className="lp-faint shrink-0">检索</span>
          <span className="shot-sm truncate lp-soft">{DEMO.jobSearchHint}</span>
        </div>
        <span className="shot-xs lp-faint shrink-0 tabular-nums">
          {jobs.length} / {DEMO.jobLibraryCount}
        </span>
      </div>

      <div className="shot-match mt-2">
        <div className="shot-match-aside flex min-h-0 flex-col">
          <ul className="flex min-h-0 flex-col gap-1">
            {jobs.map((job, index) => (
              <li
                key={job.id}
                className={`shot-job flex items-center justify-between gap-2 ${
                  index === 0 ? "is-active" : ""
                }`}
              >
                <span className="min-w-0">
                  <span className="shot-xs lp-faint block truncate leading-[1.3]">
                    {job.company} {job.cohort}
                  </span>
                  <span className="shot-sm block truncate leading-[1.3]">
                    {job.title}
                  </span>
                  <span className="shot-xs lp-faint block truncate leading-[1.3]">
                    {job.city} {job.qual}
                  </span>
                </span>
                <span
                  className={`shot-sm shrink-0 font-serif tabular-nums ${
                    index === 0 ? "text-[color:var(--lp-accent)]" : "lp-faint"
                  }`}
                >
                  {job.score}
                </span>
              </li>
            ))}
          </ul>
          <p className="shot-xs lp-faint mt-auto pt-2">{DEMO.jobLibraryNote}</p>
        </div>

        <div className="flex min-h-0 flex-col rounded-lg border lp-hairline p-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="shot-xs lp-faint truncate leading-[1.3]">
                {featured.company} {featured.cohort}
              </p>
              <p className="shot-sm truncate leading-[1.35] font-medium">
                {featured.title}
              </p>
              <p className="shot-xs lp-faint mt-0.5 truncate">
                {featured.typeLabel} {featured.city} {featured.gradeFit}
              </p>
            </div>
            <p className="shrink-0 text-right">
              <span className="shot-xl font-serif leading-none tabular-nums text-[color:var(--lp-accent)]">
                {featured.score}
              </span>
              <span className="shot-xs lp-faint ml-1">/100</span>
              <span className="shot-xs lp-soft mt-1 block rounded-full border lp-hairline px-1.5 py-0.5 leading-[1.3]">
                {featured.tierLabel}
              </span>
            </p>
          </div>

          <div className="mt-1.5 flex items-center gap-1.5">
            <span className="lp-fill flex flex-1 gap-0.5" aria-hidden="true">
              {Array.from({ length: 10 }, (_, index) => (
                <span
                  key={index}
                  className={`h-1 flex-1 rounded-[1px] ${
                    index < filled ? "lp-accent-fill" : ""
                  }`}
                />
              ))}
            </span>
            <span className="shot-xs lp-faint shrink-0 tabular-nums">
              {matchable > 0
                ? `命中 ${featured.hits.length}/${matchable}`
                : "待对照"}
            </span>
          </div>

          <div className="mt-2 space-y-1.5">
            {featured.hits.slice(0, 2).map((hit) => (
              <div key={hit.requirement} className="flex gap-1.5">
                <span className="shot-xs lp-faint mt-px w-[2.4em] shrink-0">
                  命中
                </span>
                <div className="min-w-0">
                  <p className="shot-sm truncate leading-[1.3]">
                    {hit.requirement}
                  </p>
                  <p className="shot-xs lp-faint truncate leading-[1.3]">
                    「{hit.quote}」{hit.title}
                  </p>
                </div>
              </div>
            ))}
            {featured.gaps.slice(0, 1).map((gap) => (
              <div key={gap.requirement} className="flex gap-1.5">
                <span className="shot-xs lp-alert mt-px w-[2.4em] shrink-0">
                  待补
                </span>
                <div className="min-w-0">
                  <p className="shot-sm truncate leading-[1.3]">
                    {gap.requirement}
                  </p>
                  <p className="shot-xs lp-faint truncate leading-[1.3]">
                    {gap.advice}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <p className="shot-xs lp-faint mt-auto pt-2">
            按 {DEMO.readyForMatchCount} 条简历就绪的战绩判定
          </p>
        </div>
      </div>
    </div>
  );
}
