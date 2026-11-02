import { useState } from "react";
import dayjs from "dayjs";
import type { Experience } from "../types";
import { relativeDaysLabel, resumeReadiness } from "../lib/experience";
import ExperienceCard from "./ExperienceCard";

interface ActivityFeedProps {
  experiences: Experience[];
  onEdit: (experience: Experience) => void;
  onDelete: (id: string) => Promise<void>;
  onConfirm: (id: string) => void;
}

function recordedDaysAgo(createdAt: string): number | null {
  const created = dayjs(createdAt);
  if (!created.isValid()) return null;
  return Math.max(
    0,
    dayjs().startOf("day").diff(created.startOf("day"), "day"),
  );
}

export default function ActivityFeed({
  experiences,
  onEdit,
  onDelete,
  onConfirm,
}: ActivityFeedProps) {
  const [limit, setLimit] = useState(12);

  const ordered = [...experiences].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
  const visible = ordered.slice(0, limit);
  const hidden = ordered.length - visible.length;

  return (
    <div>
      <ol className="mt-3 space-y-4">
        {visible.map((item) => {
          const readiness = resumeReadiness(item);
          return (
            <li
              key={item.id}
              className="before:bg-rule/70 relative pl-5 before:absolute before:top-2 before:bottom-0 before:left-[5px] before:w-px last:before:bottom-2"
            >
              <span
                aria-hidden="true"
                className="bg-accent absolute top-3 left-0 h-[11px] w-[11px] rounded-full border-2 border-paper"
              />
              <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 pl-1">
                <span className="text-micro text-ink-3">
                  记于 {relativeDaysLabel(recordedDaysAgo(item.createdAt))}
                </span>
                <span className="border-rule text-micro inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-ink-4">
                  <span
                    aria-hidden="true"
                    className="h-1 w-1 rounded-full bg-[#6f8f6a]"
                  />
                  本机可见
                </span>
                <span
                  className={[
                    "ml-auto font-mono text-micro",
                    readiness.ready ? "text-[color:var(--tone-ok-ink)]" : "text-amber-ink",
                  ].join(" ")}
                >
                  {readiness.ready
                    ? "简历就绪"
                    : `差 ${readiness.missing.slice(0, 2).join(" ")}`}
                </span>
              </div>
              <ExperienceCard
                experience={item}
                onEdit={() => onEdit(item)}
                onDelete={() => onDelete(item.id)}
                onConfirm={() => onConfirm(item.id)}
              />
            </li>
          );
        })}
      </ol>

      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setLimit((value) => value + 12)}
          className="border-rule hover:bg-ink/[0.03] mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-dashed text-xs text-ink-3"
        >
          再看 {Math.min(12, hidden)} 条更早的动态
        </button>
      )}
    </div>
  );
}
