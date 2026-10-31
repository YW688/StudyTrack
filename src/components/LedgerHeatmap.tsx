import dayjs, { type Dayjs } from "dayjs";
import type { LedgerEvent } from "../types";
import {
  streakInfo,
  weekGreenCells,
  weekGreenDayCount,
  weekRangeLabel,
  type ArchiveStats,
  type GreenLevel,
  type Readiness,
} from "../lib/ledger";

interface LedgerHeatmapProps {
  now: Dayjs;
  ledger: LedgerEvent[];
  stats: ArchiveStats;
  readiness: Readiness;
  onOpenExperiences: () => void;
  onOpenResume: () => void;
}

const LEVEL_BG: Record<GreenLevel, string> = {
  0: "border-rule bg-ink/[0.025]",
  1: "border-[#9db799]/70 bg-[#9db799]/30",
  2: "border-[#7f9e7a]/70 bg-[#7f9e7a]/60",
  3: "border-[#5c7d57] bg-[#5c7d57]",
};

const LEVEL_TEXT: Record<GreenLevel, string> = {
  0: "text-ink/30",
  1: "text-ink/55",
  2: "text-ink",
  3: "text-white",
};

export default function LedgerHeatmap({
  now,
  ledger,
  stats,
  readiness,
  onOpenExperiences,
  onOpenResume,
}: LedgerHeatmapProps) {
  const cells = weekGreenCells(ledger, now);
  const activeDays = weekGreenDayCount(ledger, now);
  const streak = streakInfo(ledger, now);

  return (
    <section
      aria-label="本周绿格与档案厚度"
      className="border-rule mt-4 overflow-hidden rounded-xl border bg-surface"
    >
      <header className="border-rule flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2 sm:px-5">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[10px] tracking-[0.12em] text-accent-ink">
            07
          </span>
          <h2 className="text-sm font-medium">本周绿格</h2>
        </div>
        <p className="font-mono text-[10px] tabular-nums text-ink/35">
          {weekRangeLabel(now)}
        </p>
      </header>

      <div className="grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="border-rule px-4 py-4 sm:px-5 lg:border-r">
          <ul className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {cells.map((cell) => (
              <li key={cell.dateKey}>
                <p className="text-center font-mono text-[9px] text-ink/35">
                  {cell.label.slice(1)}
                </p>
                <div
                  aria-label={`${cell.label} ${dayjs(cell.dateKey).format("M月D日")}，${
                    cell.level > 0 ? `${cell.level} 格记录` : "没有记录"
                  }${cell.isToday ? "，今天" : ""}`}
                  title={`${cell.dateKey} · ${cell.level > 0 ? `${cell.level} 格` : "空"}`}
                  className={[
                    "mt-1 flex aspect-square items-center justify-center rounded-md border font-mono text-[10px] tabular-nums transition-colors",
                    LEVEL_BG[cell.level],
                    LEVEL_TEXT[cell.level],
                    cell.isFuture ? "opacity-35" : "",
                    cell.isToday
                      ? "ring-accent/45 ring-offset-surface ring-2 ring-offset-2"
                      : "",
                  ].join(" ")}
                >
                  {dayjs(cell.dateKey).format("D")}
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <p className="text-[11px] leading-5 text-ink/55">
              本周 <span className="font-mono tabular-nums">{activeDays}/7</span>{" "}
              天留下结果
              {streak.days > 0 ? ` · 连续 ${streak.days} 天` : ""}
            </p>
            <p className="font-mono text-[9px] text-ink/30">
              每天 1–3 格，只记产生结果的动作
            </p>
          </div>

          <dl className="border-rule mt-4 grid grid-cols-4 gap-2 border-t pt-3">
            {[
              { label: "战绩", value: stats.experiences, unit: "条" },
              { label: "证据", value: stats.evidence, unit: "份" },
              { label: "记录", value: stats.notes, unit: "条" },
              { label: "活跃", value: stats.activeDays, unit: "天" },
            ].map((item) => (
              <div key={item.label}>
                <dt className="font-mono text-[9px] tracking-[0.08em] text-ink/35">
                  {item.label}
                </dt>
                <dd className="mt-0.5 flex items-baseline gap-1">
                  <span className="font-serif text-xl leading-none tabular-nums">
                    {item.value}
                  </span>
                  <span className="text-[9px] text-ink/30">{item.unit}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <p className="font-mono text-[10px] tracking-[0.08em] text-ink/40">
                档案就绪度
              </p>
              <p className="mt-1 flex items-baseline gap-1.5">
                <span className="font-serif text-3xl leading-none tabular-nums">
                  {readiness.score}
                </span>
                <span className="font-mono text-[10px] text-ink/35">/100</span>
                <span className="bg-accent/10 text-accent-ink ml-1 rounded-full px-2 py-0.5 font-mono text-[9px]">
                  {readiness.label}
                </span>
              </p>
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={onOpenExperiences}
                className="border-rule hover:bg-ink/[0.03] inline-flex min-h-11 items-center rounded-lg border px-3 text-[11px]"
              >
                去账本
              </button>
              <button
                type="button"
                onClick={onOpenResume}
                className="border-rule hover:bg-ink/[0.03] inline-flex min-h-11 items-center rounded-lg border px-3 text-[11px]"
              >
                看简历
              </button>
            </div>
          </div>

          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={readiness.score}
            aria-label="档案就绪度"
            className="bg-ink/10 mt-3 h-1.5 overflow-hidden rounded-full"
          >
            <div
              className="h-full rounded-full bg-[#6f8f6a] transition-[width] duration-500"
              style={{ width: `${readiness.score}%` }}
            />
          </div>

          <p className="mt-2 text-[11px] leading-5 text-ink/55">
            <span className="text-ink/35">下一步 · </span>
            {readiness.next}
          </p>

          <details className="group border-rule mt-3 border-t pt-2.5">
            <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between text-[10px] text-ink/40">
              四段构成
              <span
                aria-hidden="true"
                className="font-mono text-ink/30 transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <ul className="mt-1 space-y-2.5 pb-1">
              {readiness.items.map((item) => (
                <li key={item.key}>
                  <div className="flex items-baseline justify-between gap-2 text-[10px]">
                    <span className="text-ink/60">{item.label}</span>
                    <span className="font-mono tabular-nums text-ink/35">
                      {Math.round(item.earned)}/{item.weight}
                    </span>
                  </div>
                  <div className="bg-ink/10 mt-1 h-1 overflow-hidden rounded-full">
                    <div
                      className="h-full rounded-full bg-[#6f8f6a]"
                      style={{
                        width: `${Math.min(100, (item.earned / item.weight) * 100)}%`,
                      }}
                    />
                  </div>
                  {item.earned < item.weight && (
                    <p className="mt-0.5 text-[9px] leading-4 text-ink/35">
                      {item.hint}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </details>
        </div>
      </div>
    </section>
  );
}
