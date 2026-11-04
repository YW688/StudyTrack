import { useState } from "react";
import dayjs, { type Dayjs } from "dayjs";
import type { CalendarCategory, CalendarItem } from "../../types";
import {
  CALENDAR_CATEGORIES,
  CALENDAR_CATEGORY_LABELS,
} from "../../types";
import {
  calendarItemStart,
  calendarScheduleLines,
  calendarScheduleValue,
  formatCalendarDate,
  isCalendarItemPast,
  isCalendarItemToday,
} from "../../lib/calendar";
import SourceCheckBadge from "../../components/SourceCheckBadge";
import {
  SOURCE_CHECKS,
  SOURCE_CHECK_POLICY,
  getSourceCheck,
} from "../../store/sourceChecks";

type CalendarFilter = "all" | CalendarCategory;

interface CalendarPageProps {
  items: CalendarItem[];
  updatedAt: string | null;
  issue: string | null;
  onNavigate: (id: "today" | "toolbox") => void;
}

const FILTERS: { id: CalendarFilter; label: string }[] = [
  { id: "all", label: "全部" },
  ...CALENDAR_CATEGORIES.map((category) => ({
    id: category,
    label: CALENDAR_CATEGORY_LABELS[category],
  })),
];

const CATEGORY_CHIP: Record<CalendarCategory, string> = {
  contest: "bg-accent/10 text-accent-ink",
  exam: "bg-amber/15 text-amber-ink",
  campus: "bg-ink/[0.06] text-ink-3",
};

const BTN_SECONDARY =
  "border-rule hover:bg-ink/[0.03] inline-flex min-h-11 items-center justify-center rounded-lg border bg-surface px-4 text-sm";

export default function CalendarPage({
  items,
  updatedAt,
  issue,
  onNavigate,
}: CalendarPageProps) {
  const [filter, setFilter] = useState<CalendarFilter>("all");
  const now = dayjs();

  const counts: Record<CalendarCategory, number> = {
    contest: 0,
    exam: 0,
    campus: 0,
  };
  for (const item of items) counts[item.category] += 1;

  const officialCount = items.filter(
    (item) => item.sourceType === "official",
  ).length;
  const sampleCount = items.filter((item) => item.sourceType === "sample").length;
  const calendarChecks = SOURCE_CHECKS.filter(
    (check) => check.kind === "calendar",
  );

  const filtered =
    filter === "all"
      ? items
      : items.filter((item) => item.category === filter);
  const dated = filtered.filter((item) => calendarItemStart(item) !== null);
  const upcoming = dated
    .filter((item) => !isCalendarItemPast(item, now))
    .sort((a, b) => calendarScheduleValue(a) - calendarScheduleValue(b));
  const tbd = filtered.filter((item) => calendarItemStart(item) === null);
  const past = dated
    .filter((item) => isCalendarItemPast(item, now))
    .sort((a, b) => calendarScheduleValue(b) - calendarScheduleValue(a));

  const groups: { key: string; items: CalendarItem[] }[] = [];
  for (const item of upcoming) {
    const date = calendarItemStart(item);
    const key = date ? date.format("YYYY年M月") : "待公布";
    const last = groups[groups.length - 1];
    if (last?.key === key) last.items.push(item);
    else groups.push({ key, items: [item] });
  }

  return (
    <div className="px-4 pb-12 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <header className="border-rule flex flex-col gap-4 border-b py-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-micro tracking-[0.2em] text-ink-3">
              工具箱
            </p>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1 className="font-serif text-2xl tracking-tight sm:text-3xl">
                日历
              </h1>
              <span className="bg-ink/[0.05] rounded-full px-2 py-0.5 font-mono text-micro text-ink-3">
                {items.length} 条
              </span>
            </div>
            <p className="mt-2 max-w-2xl text-xs leading-5 text-ink-3">
              竞赛 考试报名 校内节点
            </p>
            <p className="mt-1 font-mono text-micro leading-5 text-ink-4">
              {updatedAt
                ? `更新于 ${formatCalendarDate(updatedAt)}`
                : "更新日期待补"}{" "}
              官方 {officialCount} 条 示例 {sampleCount} 条
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onNavigate("today")}
              className={BTN_SECONDARY}
            >
              回到今日
            </button>
            <button
              type="button"
              onClick={() => onNavigate("toolbox")}
              className={BTN_SECONDARY}
            >
              返回工具箱
            </button>
          </div>
        </header>

        <div
          role="group"
          aria-label="日历分类"
          className="border-rule flex flex-wrap items-center gap-1.5 border-b py-3"
        >
          {FILTERS.map((entry) => {
            const count =
              entry.id === "all" ? items.length : counts[entry.id];
            const selected = filter === entry.id;
            return (
              <button
                key={entry.id}
                type="button"
                aria-pressed={selected}
                onClick={() => setFilter(entry.id)}
                className={[
                  "inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-xs transition-colors",
                  selected
                    ? "bg-ink text-paper"
                    : "border-rule text-ink-3 hover:bg-ink/[0.03] border",
                ].join(" ")}
              >
                {entry.label}
                <span
                  className={[
                    "font-mono text-micro tabular-nums",
                    selected ? "text-paper/55" : "text-ink-4",
                  ].join(" ")}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {issue && (
          <p
            role="alert"
            className="border-amber/50 bg-amber/[0.06] mt-4 rounded-lg border-l-2 px-3 py-2 text-xs leading-5 text-ink-2"
          >
            {issue}
          </p>
        )}

        {items.length === 0 ? (
          <div className="border-rule mt-6 rounded-xl border bg-surface px-5 py-6">
            <p className="text-sm text-ink-3">日历数据还没读进来</p>
            <p className="mt-1 text-[11px] leading-5 text-ink-3">
              检查 data/calendar.json 格式 或回工具箱重新生成示例
            </p>
          </div>
        ) : (
          <>
            {upcoming.length > 0 ? (
              <section className="mt-2" aria-labelledby="calendar-upcoming">
                <div className="flex items-baseline justify-between gap-3 pt-5 pb-2">
                  <h2
                    id="calendar-upcoming"
                    className="text-sm font-medium"
                  >
                    接下来
                  </h2>
                  <span className="font-mono text-micro text-ink-4">
                    {upcoming.length} 条
                  </span>
                </div>
                <div className="space-y-5">
                  {groups.map((group) => (
                    <div key={group.key}>
                      <p
                        data-calendar-month={group.key}
                        className="font-mono text-micro tracking-[0.12em] text-ink-4"
                      >
                        {group.key}
                      </p>
                      <ul className="border-rule mt-2 overflow-hidden rounded-xl border bg-surface">
                        {group.items.map((item) => (
                          <CalendarRow key={item.id} item={item} now={now} />
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            ) : (
              <div className="border-rule mt-5 rounded-xl border bg-surface px-5 py-5">
                <p className="text-sm text-ink-3">近期没有已公布日期的条目</p>
              </div>
            )}

            {tbd.length > 0 && (
              <section className="mt-8" aria-labelledby="calendar-tbd">
                <div className="flex items-baseline justify-between gap-3 pb-2">
                  <h2 id="calendar-tbd" className="text-sm font-medium">
                    日期待定
                  </h2>
                  <span className="font-mono text-micro text-ink-4">
                    {tbd.length} 条
                  </span>
                </div>
                <ul className="border-rule overflow-hidden rounded-xl border bg-surface">
                  {tbd.map((item) => (
                    <CalendarRow key={item.id} item={item} now={now} />
                  ))}
                </ul>
              </section>
            )}

            {past.length > 0 && (
              <details className="border-rule group mt-8 rounded-xl border bg-surface">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 text-xs text-ink-3 [&::-webkit-details-marker]:hidden sm:px-5">
                  已结束 {past.length} 条
                  <span className="font-mono text-micro text-ink-4 group-open:hidden">
                    展开
                  </span>
                  <span className="hidden font-mono text-micro text-ink-4 group-open:inline">
                    收起
                  </span>
                </summary>
                <ul className="border-rule border-t">
                  {past.map((item) => (
                    <CalendarRow key={item.id} item={item} now={now} past />
                  ))}
                </ul>
              </details>
            )}
          </>
        )}

        {calendarChecks.length > 0 && (
          <details className="border-rule group mt-8 rounded-xl border bg-surface">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 text-xs text-ink-3 [&::-webkit-details-marker]:hidden sm:px-5">
              来源核验明细 {calendarChecks.length} 条
              <span className="font-mono text-micro text-ink-4 group-open:hidden">
                展开
              </span>
              <span className="hidden font-mono text-micro text-ink-4 group-open:inline">
                收起
              </span>
            </summary>
            <div className="border-rule border-t px-4 py-3 sm:px-5">
              <p className="text-micro leading-5 text-ink-3">
                {SOURCE_CHECK_POLICY}
              </p>
              <ul className="mt-3 space-y-3">
                {calendarChecks.map((check) => (
                  <li
                    key={check.id}
                    className="border-rule border-t pt-3 first:border-t-0 first:pt-0"
                  >
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="min-w-0 text-[11px] leading-5 font-medium text-ink-3">
                        {check.label}
                      </span>
                      <SourceCheckBadge check={check} compact />
                      <span className="font-mono text-micro text-ink-4">
                        {dayjs(check.checkedAt).format("M月D日 HH:mm")}
                      </span>
                      <a
                        href={check.url}
                        target="_blank"
                        rel="noreferrer"
                        className="app-text-link"
                      >
                        来源
                      </a>
                    </div>
                    {check.title && (
                      <p className="mt-1 text-micro leading-5 text-ink-3">
                        页面标题：{check.title}
                      </p>
                    )}
                    {check.excerpt && (
                      <p className="mt-1 text-micro leading-5 text-ink-3">
                        「{check.excerpt}」
                      </p>
                    )}
                    {check.note && (
                      <p className="mt-0.5 text-micro leading-4 text-ink-4">
                        {check.note}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </details>
        )}

        <div className="border-rule mt-8 border-t pt-4">
          <p className="text-[11px] leading-5 text-ink-3">
            日期以官方公告为准 构建期只核验入口可达性 运行时不抓取 不代报名
          </p>
        </div>
      </div>
    </div>
  );
}

function CalendarRow({
  item,
  now,
  past = false,
}: {
  item: CalendarItem;
  now: Dayjs;
  past?: boolean;
}) {
  const today = isCalendarItemToday(item, now);
  const schedule = calendarScheduleLines(item);
  const official = item.sourceType === "official";
  const sourceCheck = getSourceCheck(item.id);
  const meta = [
    item.organizer,
    official ? item.sourceName : "示例大学节点",
  ]
    .filter(Boolean)
    .filter((value, index, list) => list.indexOf(value) === index)
    .join(" ");

  return (
    <li
      data-calendar-row="true"
      data-calendar-category={item.category}
      className={[
        "border-rule border-t px-4 py-3.5 first:border-t-0 sm:px-5",
        past ? "opacity-60" : "",
      ].join(" ")}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={[
                "rounded-full px-1.5 py-0.5 font-mono text-micro",
                CATEGORY_CHIP[item.category],
              ].join(" ")}
            >
              {CALENDAR_CATEGORY_LABELS[item.category]}
            </span>
            <span
              className={[
                "rounded-full px-1.5 py-0.5 font-mono text-micro",
                official
                  ? "bg-ink/[0.05] text-ink-3"
                  : "bg-ink/[0.04] text-ink-3",
              ].join(" ")}
            >
              {official ? "官方" : "示例"}
            </span>
            {today && (
              <span className="bg-accent/15 text-accent-ink rounded-full px-1.5 py-0.5 font-mono text-micro">
                今天
              </span>
            )}
          </div>
          <p className="mt-1.5 text-sm leading-5 font-medium break-words">
            {item.title}
          </p>
          <p className="mt-0.5 text-micro leading-5 text-ink-3">{meta}</p>
          {item.note && (
            <p className="mt-1 text-[11px] leading-5 text-ink-3">
              {item.note}
            </p>
          )}
        </div>

        <div className="shrink-0 sm:text-right">
          {schedule.map((line) => (
            <p
              key={line}
              className="font-mono text-micro leading-5 tabular-nums text-ink-3"
            >
              {line}
            </p>
          ))}
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 sm:justify-end">
            {item.sourceUrl ? (
              <a
                href={item.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="app-text-link"
              >
                来源
              </a>
            ) : schedule.includes("以本校通知为准") ? null : (
              <span className="text-micro text-ink-4">
                以本校通知为准
              </span>
            )}
            {official && <SourceCheckBadge check={sourceCheck} compact />}
            {official && item.verifiedAt && (
              <span className="font-mono text-micro text-ink-4">
                核对于 {formatCalendarDate(item.verifiedAt)}
              </span>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}
