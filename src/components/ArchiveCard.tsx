import { useState, type ChangeEvent } from "react";
import type { GreenMatrix } from "../lib/ledger";
import { createAvatarFromFile } from "../lib/avatar";
import type { Goal } from "../types";
import ApertureMark from "./ApertureMark";
import StarMark from "./StarMark";
import CheckinGrid from "./CheckinGrid";
import ProfileSigil from "./ProfileSigil";
import WaxSeal from "./WaxSeal";

interface ArchiveCardProps {
  level: number;
  progress: number;
  grade: string;
  goal: Goal | null;
  avatar: string | null;
  onAvatarChange: (next: string | null) => Promise<void>;
  ready: number;
  total: number;
  comboDays: number;
  checkin: GreenMatrix;
  recentTitle: string | null;
  title: string;
  weekLabel: string;
}

export default function ArchiveCard({
  level,
  progress,
  grade,
  goal,
  avatar,
  onAvatarChange,
  ready,
  total,
  comboDays,
  checkin,
  recentTitle,
  title,
  weekLabel,
}: ArchiveCardProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    setError(null);
    const result = await createAvatarFromFile(file);
    if (!result.ok) {
      setError(result.message);
      setBusy(false);
      return;
    }
    try {
      await onAvatarChange(result.dataUrl);
    } catch {
      setError("头像没有存进本机 再试一次");
    }
    setBusy(false);
  }

  async function handleReset() {
    setBusy(true);
    setError(null);
    try {
      await onAvatarChange(null);
    } catch {
      setError("没有恢复成功 再试一次");
    }
    setBusy(false);
  }

  return (
    <section aria-label="本机存档卡" className="app-archive">
      <ApertureMark size={46} className="app-archive-aperture" />
      <StarMark size={44} className="app-archive-star" />
      <WaxSeal
        units={total}
        total={total}
        ready
        size={46}
        className="app-archive-seal"
      />
      <div className="app-archive-head">
        <div className="app-archive-portrait">
          <ProfileSigil
            grade={grade}
            level={level}
            progress={progress}
            goal={goal}
            avatar={avatar}
            size={46}
          />
          <label
            className="app-archive-portrait-edit"
            title="换一张本机图片"
          >
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="sr-only"
              disabled={busy}
              onChange={handleFile}
            />
            <span aria-hidden="true">{busy ? "…" : "换"}</span>
            <span className="sr-only">更换头像</span>
          </label>
        </div>
        <div className="app-archive-identity">
          <p className="app-archive-kicker">本机存档 {weekLabel}</p>
          <p className="app-archive-name">{title}</p>
          <p className="app-archive-live">
            <span aria-hidden="true" className="app-archive-live-dot" />
            就绪 {ready}/{total} 条 可进简历
          </p>
        </div>
      </div>

      {(avatar || error) && (
        <p
          role={error ? "alert" : undefined}
          className={[
            "app-archive-portrait-note",
            error ? "is-error" : "",
          ].join(" ")}
        >
          <span>{error ?? "头像只存本机"}</span>
          {avatar && (
            <button
              type="button"
              onClick={() => void handleReset()}
              disabled={busy}
            >
              恢复字标
            </button>
          )}
        </p>
      )}

      <div className="app-archive-stats">
        <div className="app-archive-stat">
          <p className="app-archive-label">荣誉</p>
          <p className="app-archive-stat-num">
            {ready}
            <span>/{total}</span>
          </p>
          <p className="app-archive-stat-cap">就绪战绩</p>
        </div>
        <div className="app-archive-stat">
          <p className="app-archive-label">战绩</p>
          <p className="app-archive-stat-num">{total}</p>
          <p className="app-archive-stat-cap">累计记录</p>
        </div>
      </div>

      <div className="app-archive-checkin">
        <div className="app-archive-block-head">
          <p className="app-archive-label">打卡</p>
          <span className="app-archive-combo">
            {comboDays > 0
              ? `连击 ${comboDays} 天`
              : "从今天第一条开始"}
          </span>
        </div>
        <CheckinGrid matrix={checkin} variant="compact" />
        <p className="app-archive-checkin-cap">
          近 {checkin.weeks.length} 周 {checkin.activeDays} 天有结果
        </p>
      </div>

      <p className="app-archive-about">
        <span className="app-archive-label">近况</span>
        <span className="app-archive-about-text">
          {recentTitle ?? "第一条战绩还在路上"}
        </span>
      </p>
    </section>
  );
}
