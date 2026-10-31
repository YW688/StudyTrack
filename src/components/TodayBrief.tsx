import dayjs, { type Dayjs } from "dayjs";
import { GOAL_LABELS, type LedgerEvent, type Profile } from "../types";
import type { TodayJudgment } from "../lib/today";
import {
  previousStudyDateKey,
  settleDay,
  streakInfo,
} from "../lib/ledger";

interface TodayBriefProps {
  now: Dayjs;
  profile: Profile | null;
  judgment: TodayJudgment;
  ledger: LedgerEvent[];
}

export default function TodayBrief({
  now,
  profile,
  judgment,
  ledger,
}: TodayBriefProps) {
  const yesterdayKey = previousStudyDateKey(now);
  const settlement = settleDay(ledger, yesterdayKey);
  const streak = streakInfo(ledger, now);
  const counts = [
    { label: "完成作业", value: settlement.counts.assignment_done },
    { label: "新增战绩", value: settlement.counts.experience_added },
    { label: "补充证据", value: settlement.counts.evidence_added },
    { label: "留下记录", value: settlement.counts.note_added },
  ];

  return (
    <section
      aria-label="今日判词与昨日结算"
      className="border-rule mt-5 overflow-hidden rounded-xl border bg-surface"
    >
      <div className="grid lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <div className="px-5 py-6 sm:px-7 sm:py-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-[10px] tracking-[0.18em] text-accent-ink">
              01 · 今日判词
            </p>
            {profile ? (
              <p className="border-rule bg-paper/70 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-full border px-3 py-1 font-mono text-[10px] text-ink/50">
                <span>{profile.grade || "年级未填"}</span>
                <span aria-hidden="true" className="text-ink/20">
                  /
                </span>
                <span>{profile.major || "专业未填"}</span>
                <span aria-hidden="true" className="text-ink/20">
                  /
                </span>
                <span>{GOAL_LABELS[profile.goal]}</span>
              </p>
            ) : (
              <p className="font-mono text-[10px] text-ink/35">未建档</p>
            )}
          </div>

          <h2 className="mt-4 max-w-2xl font-serif text-[clamp(1.65rem,3.7vw,2.5rem)] leading-[1.28] tracking-[0.01em]">
            {judgment.line}
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-7 text-ink/60">
            {judgment.detail}
          </p>
        </div>

        <div className="border-rule bg-ink/[0.018] px-5 py-5 sm:px-6 lg:border-l">
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-mono text-[10px] tracking-[0.18em] text-ink/40">
              02 · 昨日结算
            </p>
            <p className="font-mono text-[10px] tabular-nums text-ink/35">
              {dayjs(yesterdayKey).format("M月D日")}
            </p>
          </div>

          {settlement.empty ? (
            <p className="mt-3 text-[12px] leading-6 text-ink/55">
              昨天没有产生结果的动作。空一天不算断，今天补一条就接上。
            </p>
          ) : (
            <>
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5">
                {counts.map((item) => (
                  <div key={item.label} className="flex items-baseline justify-between gap-2">
                    <span className="text-[11px] text-ink/50">{item.label}</span>
                    <span
                      className={[
                        "font-serif text-lg leading-none tabular-nums",
                        item.value > 0 ? "text-ink" : "text-ink/25",
                      ].join(" ")}
                    >
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
              <p className="border-rule mt-3 border-t pt-2.5 font-mono text-[10px] text-ink/40">
                产生结果 {settlement.greenUnits} 件
              </p>
            </>
          )}

          <p className="mt-3 flex items-center gap-2 text-[11px] leading-5 text-ink/45">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full bg-[#6f8f6a]"
            />
            {streak.days > 0
              ? `连续 ${streak.days} 天有结果${streak.includesToday ? "，今天已接上" : "，今天还差一条"}`
              : "绿格从今天的第一条记录开始"}
          </p>
        </div>
      </div>
    </section>
  );
}
