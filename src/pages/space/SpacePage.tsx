import { useMemo, useState } from "react";
import dayjs from "dayjs";
import StarrySky from "../../components/StarrySky";
import { buildSky, type SkyStar } from "../../lib/sky";
import { pickEcho, pickEchoQueue } from "../../lib/today";
import type { ThemeId } from "../../lib/theme";
import type { Experience, LedgerEvent } from "../../types";

interface SpacePageProps {
  theme: ThemeId;
  ledger: LedgerEvent[];
  experiences: Experience[];
  onGoToday?: () => void;
}

function SkyDayDetail({
  star,
  onPrev,
  onNext,
}: {
  star: SkyStar | null;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <section
      aria-live="polite"
      className="sky-detail-sheet border-rule flex min-h-0 flex-1 flex-col overflow-hidden border px-4 pt-3 pb-2"
    >
      {star ? (
        <>
          <div className="flex shrink-0 items-center justify-between gap-2">
            <p className="font-mono text-[13px] tracking-[0.1em] text-accent-ink">
              {star.label}
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onPrev}
                className="text-ink-3 hover:text-ink inline-flex min-h-11 items-center rounded-full px-3 text-[13px] underline underline-offset-2"
              >
                前一天
              </button>
              <button
                type="button"
                onClick={onNext}
                className="text-ink-3 hover:text-ink inline-flex min-h-11 items-center rounded-full px-3 text-[13px] underline underline-offset-2"
              >
                后一天
              </button>
            </div>
          </div>
          <p className="mt-1.5 flex shrink-0 items-baseline gap-2">
            {star.isToday && (
              <span className="sky-today-chip font-mono text-[10px] tracking-[0.1em]">
                今天
              </span>
            )}
            <span className="font-mono text-[20px] leading-none tabular-nums">
              {star.count}
            </span>
            <span className="text-ink-3 text-[12px]">条留痕</span>
          </p>
          <ul
            tabIndex={0}
            aria-label={`${star.label} 的留痕`}
            className="sky-detail-scroll focus-visible:outline-accent mt-2.5 min-h-0 flex-1 space-y-2 pr-1 focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {star.events.map((event) => (
              <li
                key={event.id}
                className="text-ink-3 flex min-w-0 items-baseline gap-2 text-[13px] leading-[1.65]"
              >
                <span className="text-accent-ink shrink-0 text-[12px]">
                  {event.typeLabel}
                </span>
                <span className="min-w-0 break-words">
                  {event.title}
                  {event.detail ? ` · ${event.detail}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-[12px] leading-5 text-ink-3">
          点一颗星 看那天留下了什么
        </p>
      )}
    </section>
  );
}

export default function SpacePage({
  theme,
  ledger,
  experiences,
  onGoToday,
}: SpacePageProps) {
  const now = dayjs();
  const sky = useMemo(() => buildSky(ledger, now), [ledger]);
  const echo = useMemo(() => pickEcho(experiences, now), [experiences]);
  const echoes = useMemo(
    () => pickEchoQueue(experiences, now),
    [experiences],
  );
  const todayLit = sky.stars.some((star) => star.isToday);
  const [picked, setPicked] = useState<string | null>(null);

  const defaultKey = useMemo(() => {
    const today = sky.stars.find((star) => star.isToday);
    return (today ?? sky.stars[sky.stars.length - 1])?.key ?? null;
  }, [sky]);
  const selected =
    picked && sky.stars.some((star) => star.key === picked)
      ? picked
      : defaultKey;
  const selectedStar =
    sky.stars.find((star) => star.key === selected) ?? null;
  const selectedIndex = selectedStar
    ? sky.stars.findIndex((star) => star.key === selectedStar.key)
    : -1;
  const recent = sky.stars.slice(-4).reverse();

  function stepDay(direction: number) {
    if (sky.stars.length === 0) return;
    const base =
      selectedIndex === -1 ? sky.stars.length - 1 : selectedIndex;
    const next =
      (base + direction + sky.stars.length) % sky.stars.length;
    setPicked(sky.stars[next].key);
  }

  return (
    <div className="px-4 pt-4 pb-8 sm:px-6 sm:pt-5 lg:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="min-w-0">
            <p className="font-mono text-micro tracking-[0.2em] text-accent-ink">
              留痕星图
            </p>
            <h1 className="mt-1 font-serif text-2xl tracking-tight">
              学径空间
            </h1>
            <p className="mt-1 text-xs leading-5 text-ink-3">
              每天第一次留下结果 就点亮一颗星 最近的回声会化作流星
            </p>
          </div>
          {todayLit ? (
            <p className="text-ink-4 flex items-center gap-2 font-mono text-micro">
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 rounded-full bg-[#7fae90]"
              />
              今天已点亮
            </p>
          ) : (
            onGoToday && (
              <button
                type="button"
                onClick={onGoToday}
                className="border-rule hover:bg-ink/[0.03] inline-flex min-h-11 items-center justify-center rounded-lg border bg-surface px-4 text-sm"
              >
                去今日留痕
              </button>
            )
          )}
        </header>

        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <StarrySky
            theme={theme}
            stars={sky.stars}
            echoes={echoes}
            todayLit={todayLit}
            selected={selected}
            onSelect={setPicked}
            onGoToday={onGoToday}
          />

          <aside
            aria-label="最近点亮与当天留痕"
            className="flex h-[460px] flex-col gap-3 sm:h-[500px] lg:h-[520px]"
          >
            <section className="sky-panel shrink-0 px-4 py-3.5">
              <h2 className="font-mono text-micro tracking-[0.16em] text-ink-4">
                最近点亮
              </h2>
              {recent.length > 0 ? (
                <ul className="mt-2 space-y-0.5">
                  {recent.map((star) => {
                    const active = star.key === selected;
                    return (
                      <li key={star.key}>
                        <button
                          type="button"
                          onClick={() => setPicked(star.key)}
                          aria-pressed={active}
                          className={`sky-recent-item flex min-h-[52px] items-center justify-between gap-3 ${
                            active ? "is-active" : ""
                          }`}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <span
                              className={`font-mono text-[14px] tabular-nums ${
                                active ? "text-ink" : "text-ink-2"
                              }`}
                            >
                              {star.label}
                            </span>
                            {star.isToday && (
                              <span className="sky-today-chip font-mono text-[10px] tracking-[0.1em]">
                                今天
                              </span>
                            )}
                          </span>
                          <span className="flex shrink-0 items-baseline gap-1">
                            <span className="font-mono text-[17px] leading-none tabular-nums">
                              {star.count}
                            </span>
                            <span className="text-ink-3 text-[11px]">条</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-ink-3 mt-2 text-[12px] leading-5">
                  还没有点亮的星 先去今日留一条痕
                </p>
              )}
            </section>

            <SkyDayDetail
              star={selectedStar}
              onPrev={() => stepDay(-1)}
              onNext={() => stepDay(1)}
            />
          </aside>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <section className="sky-panel px-4 py-3">
            <h2 className="font-mono text-micro tracking-[0.16em] text-ink-4">
              本机星况
            </h2>
            <dl className="mt-1.5 flex flex-wrap items-baseline gap-x-7 gap-y-2">
              <div className="flex items-baseline gap-1.5">
                <dt className="text-[12px] text-ink-3">点亮</dt>
                <dd className="flex items-baseline gap-1">
                  <span className="font-serif text-lg leading-none tabular-nums">
                    {sky.stars.length}
                  </span>
                  <span className="text-ink-4 text-micro">天</span>
                </dd>
              </div>
              <div className="flex items-baseline gap-1.5">
                <dt className="text-[12px] text-ink-3">留痕</dt>
                <dd className="flex items-baseline gap-1">
                  <span className="font-serif text-lg leading-none tabular-nums">
                    {sky.totalEvents}
                  </span>
                  <span className="text-ink-4 text-micro">条</span>
                </dd>
              </div>
              <div className="flex items-baseline gap-2">
                <dt className="text-[12px] text-ink-3">最近回声</dt>
                <dd className="text-[13px]">
                  {echo ? echo.label : "还没有"}
                </dd>
              </div>
            </dl>
          </section>

          <section className="sky-panel px-4 py-3">
            <h2 className="font-mono text-micro tracking-[0.16em] text-ink-4">
              点亮规则
            </h2>
            <ul className="text-ink-3 mt-1.5 grid gap-x-5 gap-y-1 text-[12px] leading-5 sm:grid-cols-2">
              <li>完成委托 写下战绩 补充证据 生成简历</li>
              <li>每天只点亮一次</li>
              <li>回声化作流星 攒够了下场流星雨</li>
              <li>数据只在本机</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
