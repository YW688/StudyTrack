import dayjs from "dayjs";
import type { Course, CourseSession, DayOfWeek, Semester } from "../types";
import { DAY_LABELS } from "../types";
import { dateOfDay, currentWeekOf, formatWeeksLabel } from "../parse/schedule";

const BLOCK_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  blue: { bg: "#E7EDF6", border: "#C5D2E5", text: "#1C3355" },
  clay: { bg: "#F5EAE3", border: "#E4D0C3", text: "#5A3A2B" },
  moss: { bg: "#E8EFE8", border: "#CBDCCB", text: "#2F4A36" },
  plum: { bg: "#EEE9F1", border: "#D8CEDF", text: "#46324F" },
  sand: { bg: "#F3EEE2", border: "#E1D6BE", text: "#4F4128" },
  slate: { bg: "#E9EAEC", border: "#D2D5DA", text: "#333B45" },
};

const DAYS: DayOfWeek[] = [1, 2, 3, 4, 5, 6, 7];

interface VisibleSession {
  course: Course;
  session: CourseSession;
  lane: number;
  lanes: number;
}

interface TimetableGridProps {
  courses: Course[];
  semester: Semester;
  week: number;
}

function laneLayout(courses: Course[], week: number) {
  const byDay = new Map<DayOfWeek, VisibleSession[]>();

  for (const course of courses) {
    for (const session of course.sessions) {
      if (!session.weeks.includes(week)) continue;
      const list = byDay.get(session.day) ?? [];
      list.push({ course, session, lane: 0, lanes: 1 });
      byDay.set(session.day, list);
    }
  }

  for (const [day, list] of byDay) {
    list.sort(
      (a, b) =>
        a.session.startPeriod - b.session.startPeriod ||
        a.session.endPeriod - b.session.endPeriod,
    );

    let cluster: VisibleSession[] = [];
    let clusterEnd = 0;

    const flush = () => {
      const laneEnds: number[] = [];
      for (const item of cluster) {
        let lane = laneEnds.findIndex((end) => end < item.session.startPeriod);
        if (lane === -1) {
          lane = laneEnds.length;
          laneEnds.push(item.session.endPeriod);
        } else {
          laneEnds[lane] = item.session.endPeriod;
        }
        item.lane = lane;
      }
      cluster.forEach((item) => {
        item.lanes = laneEnds.length;
      });
      cluster = [];
      clusterEnd = 0;
    };

    for (const item of list) {
      if (cluster.length && item.session.startPeriod > clusterEnd) flush();
      cluster.push(item);
      clusterEnd = Math.max(clusterEnd, item.session.endPeriod);
    }
    if (cluster.length) flush();
    byDay.set(day, list);
  }

  return byDay;
}

export default function TimetableGrid({
  courses,
  semester,
  week,
}: TimetableGridProps) {
  const maxPeriod = Math.max(
    10,
    ...courses.flatMap((course) =>
      course.sessions.map((session) => session.endPeriod),
    ),
  );
  const periods = Array.from({ length: maxPeriod }, (_, i) => i + 1);
  const byDay = laneLayout(courses, week);
  const currentWeek = currentWeekOf(semester.startDate, semester.totalWeeks);
  const todayDay = ((dayjs().day() + 6) % 7 + 1) as DayOfWeek;
  const isCurrentWeek = currentWeek === week;

  return (
    <>
      <div className="sm:hidden">
        <div className="border-rule overflow-hidden rounded-xl border bg-surface">
          {DAYS.map((day) => {
            const sessions = byDay.get(day) ?? [];
            if (!sessions.length) return null;
            const date = dateOfDay(semester.startDate, week, day);
            const isToday = isCurrentWeek && todayDay === day;
            return (
              <section
                key={day}
                className="border-rule border-b last:border-b-0"
              >
                <div
                  className={[
                    "flex items-baseline justify-between px-3 py-2",
                    isToday ? "bg-accent/[0.10]" : "bg-ink/[0.02]",
                  ].join(" ")}
                >
                  <p className="text-xs font-medium">
                    {DAY_LABELS[day - 1]}
                    {isToday && (
                      <span className="ml-2 font-mono text-micro text-accent-ink">
                        今天
                      </span>
                    )}
                  </p>
                  <p className="font-mono text-micro tabular-nums text-ink-3">
                    {date ?? ""} {sessions.length} 个时段
                  </p>
                </div>
                <ul>
                  {sessions.map(({ course, session }, index) => {
                    const palette =
                      BLOCK_COLORS[course.color ?? "slate"] ??
                      BLOCK_COLORS.slate;
                    return (
                      <li
                        key={`${course.id}-${index}`}
                        className="border-rule flex gap-3 border-t px-3 py-3 first:border-t-0"
                      >
                        <div className="w-14 shrink-0 pt-0.5">
                          <p className="font-mono text-[11px] tabular-nums text-ink-3">
                            {session.startPeriod}-
                            {session.endPeriod} 节
                          </p>
                          <span
                            aria-hidden="true"
                            className="mt-1 block h-[3px] w-8 rounded-full"
                            style={{ backgroundColor: palette.border }}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{course.name}</p>
                          {(course.location || course.teacher) && (
                            <p className="mt-1 text-[11px] leading-5 text-ink-3">
                              {[course.location, course.teacher]
                                .filter(Boolean)
                                .join(" ")}
                            </p>
                          )}
                          <p className="mt-0.5 font-mono text-micro text-ink-4">
                            {formatWeeksLabel(session.weeks)}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
          {byDay.size === 0 && (
            <p className="px-4 py-10 text-center text-sm text-ink-3">
              第 {week} 周没有课程安排。
            </p>
          )}
        </div>
      </div>

      <div className="border-rule hidden overflow-hidden rounded-xl border bg-surface sm:block">
        <div className="tt-grid grid">
        <div className="border-rule border-b" />
        {DAYS.map((day) => {
          const date = dateOfDay(semester.startDate, week, day);
          const isToday = isCurrentWeek && todayDay === day;
          return (
            <div
              key={day}
              className={[
                "border-rule border-b border-l px-1 py-2 text-center sm:px-2",
                day >= 6 ? "bg-ink/[0.02]" : "",
                isToday ? "bg-accent/[0.10]" : "",
              ].join(" ")}
            >
              <p
                className={[
                  "text-[11px] sm:text-xs",
                  isToday ? "font-medium text-accent-ink" : "text-ink-2",
                ].join(" ")}
              >
                {DAY_LABELS[day - 1]}
              </p>
              <p
                className={[
                  "mt-0.5 font-mono text-micro tabular-nums sm:text-micro",
                  isToday ? "text-accent-ink" : "text-ink-4",
                ].join(" ")}
              >
                {isToday ? "今天" : (date ?? "")}
              </p>
            </div>
          );
        })}

        <div className="border-rule bg-ink/[0.015]">
          {periods.map((period) => (
            <div
              key={period}
              className="border-rule flex items-start justify-center border-b pt-2 last:border-b-0"
              style={{ height: "var(--tt-row)" }}
            >
              <span className="font-mono text-micro tabular-nums text-ink-3 sm:text-[11px]">
                {period}
              </span>
            </div>
          ))}
        </div>

        {DAYS.map((day) => {
          const sessions = byDay.get(day) ?? [];
          const isToday = isCurrentWeek && todayDay === day;
          return (
            <div
              key={day}
              className={[
                "border-rule relative border-l",
                isToday
                  ? "bg-accent/[0.035]"
                  : day >= 6
                    ? "bg-ink/[0.015]"
                    : "",
              ].join(" ")}
              style={{ height: "calc(var(--tt-row) * " + maxPeriod + ")" }}
            >
              {periods.map((period) => (
                <div
                  key={period}
                  className="border-rule border-b last:border-b-0"
                  style={{ height: "var(--tt-row)" }}
                />
              ))}

              {sessions.map(({ course, session, lane, lanes }, index) => {
                const palette =
                  BLOCK_COLORS[course.color ?? "slate"] ?? BLOCK_COLORS.slate;
                const span = session.endPeriod - session.startPeriod + 1;
                return (
                  <div
                    key={`${course.id}-${index}`}
                    title={`${course.name}\n${course.location ?? ""}\n${course.teacher ?? ""}\n${formatWeeksLabel(session.weeks)}`}
                    className="absolute overflow-hidden rounded-lg border px-1.5 py-1 sm:px-2"
                    style={{
                      top: `calc(${session.startPeriod - 1} * var(--tt-row) + 3px)`,
                      height: `calc(${span} * var(--tt-row) - 6px)`,
                      left: `calc(${(lane / lanes) * 100}% + 2px)`,
                      width: `calc(${100 / lanes}% - 4px)`,
                      backgroundColor: palette.bg,
                      borderColor: palette.border,
                      color: palette.text,
                    }}
                  >
                    <p className="line-clamp-3 text-micro leading-[1.35] font-medium sm:text-[12px]">
                      {course.name}
                    </p>
                    {span >= 2 && course.location && (
                      <p className="mt-1 line-clamp-2 text-micro leading-[1.3] opacity-65 sm:text-micro">
                        {course.location}
                      </p>
                    )}
                    {span >= 2 && lanes > 1 && (
                      <p className="mt-1 font-mono text-micro opacity-60">
                        {formatWeeksLabel(session.weeks)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
    </>
  );
}
