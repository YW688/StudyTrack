import type { CSSProperties } from "react";
import type { Goal } from "../types";

const GOAL_SIGIL: Record<Goal, { face: string; text: string }> = {
  intern: { face: "#3d5478", text: "#dde6f5" },
  postgrad: { face: "#2f6b60", text: "#d4ece4" },
  abroad: { face: "#7c3b58", text: "#f7dce7" },
  civil: { face: "#6f5323", text: "#f5e7cd" },
  undecided: { face: "#3f4a58", text: "#e6ebf0" },
};

const FALLBACK_SIGIL = { face: "#3f4a58", text: "#e6ebf0" };

interface ProfileSigilProps {
  grade: string;
  level: number;
  progress: number;
  goal: Goal | null;
  avatar?: string | null;
  size?: number;
}

export default function ProfileSigil({
  grade,
  level,
  progress,
  goal,
  avatar = null,
  size = 44,
}: ProfileSigilProps) {
  const tone = goal ? GOAL_SIGIL[goal] : FALLBACK_SIGIL;
  const angle = Math.min(100, Math.max(0, progress)) * 3.6;
  return (
    <span
      role="img"
      aria-label={`${grade || "新存档"} 等级 ${level}`}
      className="app-sigil"
      style={
        {
          width: size,
          height: size,
          "--sigil-angle": `${angle}deg`,
          "--sigil-face": tone.face,
          "--sigil-text": tone.text,
        } as CSSProperties
      }
    >
      <span
        aria-hidden="true"
        className={avatar ? "app-sigil-face is-photo" : "app-sigil-face"}
        style={{ fontSize: Math.round(size * 0.3) }}
      >
        {avatar ? (
          <img src={avatar} alt="" className="app-sigil-photo" />
        ) : (
          grade || "新"
        )}
      </span>
      <span
        aria-hidden="true"
        className="app-sigil-level"
        style={{ fontSize: Math.max(8, Math.round(size * 0.18)) }}
      >
        Lv.{level}
      </span>
    </span>
  );
}
