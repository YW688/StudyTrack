import type { Experience } from "../types";
import type { ExperienceTermGroup } from "../lib/experience";
import { EXPERIENCE_KIND_META } from "../lib/experience";
import ExperienceCard from "./ExperienceCard";

interface TimelineProps {
  groups: ExperienceTermGroup[];
  undated: Experience[];
  onEdit: (experience: Experience) => void;
  onDelete: (id: string) => Promise<void>;
  onConfirm: (id: string) => void;
}

export default function Timeline({
  groups,
  undated,
  onEdit,
  onDelete,
  onConfirm,
}: TimelineProps) {
  return (
    <div className="mt-5">
      {groups.map((group) => (
        <section
          key={group.term.key}
          aria-label={`${group.term.label} 学期`}
          className="mt-5 first:mt-0"
        >
          <header className="flex items-center gap-3">
            <p className="font-mono text-[11px] tracking-[0.08em] text-ink-3">
              {group.term.label}
            </p>
            <span aria-hidden="true" className="h-px flex-1 bg-rule" />
            <p className="font-mono text-micro tabular-nums text-ink-4">
              {group.items.length} 段
            </p>
          </header>

          <ol className="relative mt-2.5 ml-1.5 border-l border-rule pl-4 sm:pl-5">
            {group.items.map((experience) => (
              <li key={experience.id} className="relative pb-3 last:pb-0">
                <span
                  aria-hidden="true"
                  className="absolute top-4 -left-[22px] h-2.5 w-2.5 rounded-full ring-4 ring-paper sm:-left-[26px]"
                  style={{ backgroundColor: EXPERIENCE_KIND_META[experience.kind].color }}
                />
                <ExperienceCard
                  experience={experience}
                  onEdit={() => onEdit(experience)}
                  onDelete={() => onDelete(experience.id)}
                  onConfirm={() => onConfirm(experience.id)}
                />
              </li>
            ))}
          </ol>
        </section>
      ))}

      {undated.length > 0 && (
        <section aria-label="未标时间的经历" className="mt-5">
          <header className="flex items-center gap-3">
            <p className="font-mono text-[11px] tracking-[0.08em] text-ink-3">
              未标时间
            </p>
            <span aria-hidden="true" className="h-px flex-1 bg-rule" />
            <p className="font-mono text-micro tabular-nums text-ink-4">
              {undated.length} 段
            </p>
          </header>

          <ol className="relative mt-2.5 ml-1.5 border-l border-rule pl-4 sm:pl-5">
            {undated.map((experience) => (
              <li key={experience.id} className="relative pb-3 last:pb-0">
                <span
                  aria-hidden="true"
                  className="bg-ink/25 absolute top-4 -left-[22px] h-2.5 w-2.5 rounded-full ring-4 ring-paper sm:-left-[26px]"
                />
                <ExperienceCard
                  experience={experience}
                  onEdit={() => onEdit(experience)}
                  onDelete={() => onDelete(experience.id)}
                  onConfirm={() => onConfirm(experience.id)}
                />
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
