import { useEffect, useRef, useState } from "react";
import type { Experience, ResumeBasics } from "../types";
import {
  experienceKindLabel,
  formatExperienceRange,
} from "../lib/experience";
import {
  buildPortfolioPayload,
  copyText,
  encodePortfolio,
  portfolioLink,
} from "../lib/portfolio";

interface PortfolioDialogProps {
  open: boolean;
  basics: ResumeBasics;
  experiences: Experience[];
  onClose: () => void;
}

const FIELD =
  "border-rule focus:border-ink/35 focus:ring-2 focus:ring-accent/25 min-h-11 w-full rounded-lg border bg-surface px-3 text-sm text-ink outline-none transition-colors placeholder:text-ink/25";
const BTN_PRIMARY =
  "bg-ink text-paper inline-flex min-h-11 items-center justify-center rounded-lg px-5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40";
const BTN_SECONDARY =
  "border-rule hover:bg-ink/[0.03] inline-flex min-h-11 items-center justify-center rounded-lg border bg-surface px-4 text-sm disabled:cursor-not-allowed disabled:opacity-40";

export default function PortfolioDialog({
  open,
  basics,
  experiences,
  onClose,
}: PortfolioDialogProps) {
  const [chosenIds, setChosenIds] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [tagline, setTagline] = useState("");
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const initial = experiences
      .slice(0, Math.min(6, experiences.length))
      .map((experience) => experience.id);
    setChosenIds(initial);
    setTitle(
      basics.name.trim() ? `${basics.name.trim()} · 作品集` : "作品集",
    );
    setTagline("");
    setLink("");
    setCopied(false);
    setCopyError(null);
    const timer = window.setTimeout(() => titleRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, [open, experiences, basics.name]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    setLink("");
    setCopied(false);
    setCopyError(null);
  }, [chosenIds, title, tagline]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2500);
    return () => window.clearTimeout(timer);
  }, [copied]);

  if (!open) return null;

  const enoughExperiences = experiences.length >= 3;
  const chosen = experiences.filter((experience) =>
    chosenIds.includes(experience.id),
  );
  const canGenerate =
    enoughExperiences && chosen.length >= 3 && chosen.length <= 6;
  const sizeWarning = link.length > 8000;

  function toggle(id: string) {
    setChosenIds((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id);
      if (prev.length >= 6) return prev;
      return [...prev, id];
    });
  }

  function handleGenerate() {
    if (!canGenerate) return;
    const payload = buildPortfolioPayload({
      basics,
      experiences: chosen,
      title: title.trim() || "作品集",
      tagline,
    });
    const id = encodePortfolio(payload);
    setLink(portfolioLink(id));
    setCopied(false);
    setCopyError(null);
  }

  async function handleCopy() {
    if (!link) return;
    const ok = await copyText(link);
    setCopied(ok);
    setCopyError(ok ? null : "自动复制失败，请手动选择链接复制。");
  }

  return (
    <div
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="bg-ink/35 fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="portfolio-dialog-title"
        className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-surface sm:rounded-xl"
      >
        <header className="border-rule sticky top-0 z-10 flex items-start justify-between gap-3 border-b bg-surface px-4 py-3 sm:px-5">
          <div>
            <p className="font-mono text-[9px] tracking-[0.16em] text-ink/40">
              作品集 · 无后端
            </p>
            <h2
              id="portfolio-dialog-title"
              className="mt-1 text-base font-medium tracking-tight"
            >
              精选 3–6 条经历，生成可分享链接
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭作品集生成"
            className="hover:bg-ink/[0.04] -mr-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-ink/45"
          >
            ×
          </button>
        </header>

        <div className="px-4 py-4 sm:px-5">
          {!enoughExperiences ? (
            <div className="border-amber/50 bg-amber/[0.07] rounded-lg border-l-2 px-3 py-3">
              <p className="text-sm font-medium">还差一点素材</p>
              <p className="mt-1 text-xs leading-5 text-ink/65">
                作品集需要从已加入简历的经历里精选 3–6 条。当前只有{" "}
                {experiences.length} 条，请先在左侧勾选更多经历。
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="portfolio-title"
                    className="mb-1.5 block font-mono text-[9px] tracking-[0.14em] text-ink/40"
                  >
                    封面标题
                  </label>
                  <input
                    id="portfolio-title"
                    ref={titleRef}
                    type="text"
                    value={title}
                    maxLength={120}
                    onChange={(event) => setTitle(event.target.value)}
                    className={FIELD}
                    placeholder="例如：林知夏 · 作品集"
                  />
                </div>
                <div>
                  <label
                    htmlFor="portfolio-tagline"
                    className="mb-1.5 block font-mono text-[9px] tracking-[0.14em] text-ink/40"
                  >
                    一句话介绍（选填）
                  </label>
                  <input
                    id="portfolio-tagline"
                    type="text"
                    value={tagline}
                    maxLength={200}
                    onChange={(event) => setTagline(event.target.value)}
                    className={FIELD}
                    placeholder="例如：关注前端性能与校园工具"
                  />
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-xs font-medium">
                    选择经历
                    <span className="ml-2 font-mono text-[10px] font-normal tabular-nums text-ink/40">
                      已选 {chosen.length} / 6
                    </span>
                  </p>
                  <p className="text-[10px] text-ink/35">
                    至少 3 条，最多 6 条
                  </p>
                </div>

                <ul className="mt-2 space-y-2">
                  {experiences.map((experience) => {
                    const selected = chosenIds.includes(experience.id);
                    return (
                      <li key={experience.id}>
                        <label
                          className={[
                            "flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 transition-colors",
                            selected
                              ? "border-ink/25 bg-paper"
                              : "border-rule bg-surface hover:bg-ink/[0.02]",
                          ].join(" ")}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggle(experience.id)}
                            className="accent-ink mt-1 h-4 w-4 shrink-0"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                              <span className="text-[10px] text-ink/40">
                                {experienceKindLabel(
                                  experience.kind,
                                  experience.kindLabel,
                                )}
                              </span>
                              <span className="font-mono text-[9px] tabular-nums text-ink/35">
                                {formatExperienceRange(
                                  experience.start,
                                  experience.end,
                                )}
                              </span>
                            </span>
                            <span className="mt-0.5 block text-xs leading-5 font-medium break-words">
                              {experience.title}
                            </span>
                            {experience.org && (
                              <span className="mt-0.5 block text-[10px] leading-4 text-ink/40">
                                {experience.org}
                              </span>
                            )}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="max-w-sm text-[10px] leading-5 text-ink/40">
                  链接里会包含姓名、联系方式与所选经历；任何人打开都能看到，不会上传到服务器。
                </p>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={!canGenerate}
                  className={BTN_PRIMARY}
                >
                  生成作品集链接
                </button>
              </div>

              {!canGenerate && chosen.length > 0 && chosen.length < 3 && (
                <p className="text-amber mt-2 text-[10px] leading-5">
                  再选 {3 - chosen.length} 条即可生成。
                </p>
              )}

              {link && (
                <div className="border-rule bg-paper mt-4 rounded-xl border px-3 py-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-xs font-medium">链接已生成</p>
                    <p className="font-mono text-[9px] tabular-nums text-ink/35">
                      {(link.length / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <input
                    type="text"
                    readOnly
                    value={link}
                    onFocus={(event) => event.currentTarget.select()}
                    aria-label="作品集分享链接"
                    className="border-rule mt-2 min-h-11 w-full rounded-lg border bg-surface px-2 font-mono text-[10px] text-ink/60"
                  />
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleCopy()}
                      className={BTN_SECONDARY}
                    >
                      {copied ? "已复制" : "复制链接"}
                    </button>
                    <a
                      href={link}
                      target="_blank"
                      rel="noreferrer noopener"
                      className={BTN_SECONDARY}
                    >
                      打开预览
                    </a>
                  </div>
                  {copyError && (
                    <p className="text-amber mt-2 text-[10px] leading-5">
                      {copyError}
                    </p>
                  )}
                  {sizeWarning && (
                    <p className="text-amber mt-2 text-[10px] leading-5">
                      链接超过 8KB，部分聊天工具可能截断。建议减少条目或缩短介绍。
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
