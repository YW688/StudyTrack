import type { ResumePaperEntry } from "./ResumePaper";
import { bulletCacheNote } from "../lib/resume";

interface BulletManagerProps {
  entries: ResumePaperEntry[];
  open: boolean;
  onToggle: () => void;
  generatingId: string | null;
  onGenerate: (id: string) => void;
  onDeleteBullet: (experienceId: string, bulletId: string) => void;
  onRegenerateBullet: (experienceId: string, bulletId: string) => void;
}

const BTN =
  "border-rule hover:bg-ink/[0.03] inline-flex min-h-11 items-center justify-center rounded-md border bg-surface px-2.5 text-micro text-ink-3 disabled:cursor-wait disabled:opacity-40 sm:min-h-8";
const BTN_TEXT =
  "hover:text-ink inline-flex min-h-11 items-center text-micro text-ink-3 underline-offset-2 hover:underline sm:min-h-8";

export default function BulletManager({
  entries,
  open,
  onToggle,
  generatingId,
  onGenerate,
  onDeleteBullet,
  onRegenerateBullet,
}: BulletManagerProps) {
  const withBullets = entries.filter(
    (entry) => entry.cache && entry.cache.bullets.length > 0,
  ).length;

  return (
    <section className="resume-bullet-manager screen-only border-rule mt-3 rounded-xl border bg-surface">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex min-h-12 w-full items-center justify-between gap-3 px-4 text-left"
      >
        <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-sm font-medium">要点与依据</span>
          <span className="font-mono text-micro tabular-nums text-ink-3">
            {withBullets}/{entries.length} 条已生成
          </span>
        </span>
        <span className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className={[
              "text-ink-3 transition-transform",
              open ? "rotate-180" : "",
            ].join(" ")}
          >
            ⌄
          </span>
        </span>
      </button>

      {open && (
        <div className="border-rule border-t px-4 py-3">
          {entries.length === 0 ? (
            <p className="text-[11px] leading-5 text-ink-3">
              先从左侧选经历加入简历 再生成要点
            </p>
          ) : (
            <ul className="space-y-4">
              {entries.map((entry) => {
                const experience = entry.experience;
                const cache = entry.cache;
                const hiddenCount = cache?.hiddenCount ?? 0;
                const generating = generatingId === experience.id;
                return (
                  <li key={experience.id}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[12px] leading-5 font-medium break-words">
                          {experience.title}
                        </p>
                        <p className="mt-0.5 text-micro leading-4 text-ink-3">
                          {cache
                            ? bulletCacheNote(cache)
                            : "当前显示原文 生成后可逐条核对"}
                          {hiddenCount > 0
                            ? ` 已过滤 ${hiddenCount} 条无依据要点。`
                            : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onGenerate(experience.id)}
                        disabled={generating}
                        className={BTN}
                      >
                        {generating
                          ? "生成中…"
                          : cache
                            ? "重新生成全部"
                            : "生成要点"}
                      </button>
                    </div>

                    {cache && cache.bullets.length > 0 ? (
                      <ul className="mt-2 space-y-2">
                        {cache.bullets.map((bullet) => (
                          <li
                            key={bullet.id}
                            className="bg-paper border-rule rounded-lg border px-3 py-2"
                          >
                            <p className="text-[11px] leading-5 text-ink-2">
                              {bullet.text}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                              <details className="min-w-0 flex-1">
                                <summary className="hover:text-ink inline-flex min-h-8 cursor-pointer items-center text-micro text-ink-3">
                                  依据：原文片段
                                </summary>
                                <ul className="mt-1 space-y-1 border-l border-rule pl-2">
                                  {bullet.evidence.map((quote, index) => (
                                    <li
                                      key={`${bullet.id}-${index}`}
                                      className="text-micro leading-4 text-ink-3"
                                    >
                                      {quote}
                                    </li>
                                  ))}
                                </ul>
                              </details>
                              <button
                                type="button"
                                onClick={() =>
                                  onRegenerateBullet(experience.id, bullet.id)
                                }
                                disabled={generating}
                                className={BTN_TEXT}
                              >
                                重写这条
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  onDeleteBullet(experience.id, bullet.id)
                                }
                                className="inline-flex min-h-11 items-center text-micro text-ink-3 underline-offset-2 hover:text-red-800 hover:underline sm:min-h-8"
                              >
                                删除
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-micro leading-5 text-ink-3">
                        {experience.problem.trim() ||
                        experience.method.trim() ||
                        experience.contribution.trim() ||
                        experience.result.trim()
                          ? "还没有生成要点 草稿直接用原文结果与贡献"
                          : "四段式为空 请先去经历页补充"}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-3 text-micro leading-5 text-ink-4">
            要点只从原文提炼 数字必须有出处
          </p>
        </div>
      )}
    </section>
  );
}
