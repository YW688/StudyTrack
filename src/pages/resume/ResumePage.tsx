import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  Experience,
  ExperienceData,
  ExperienceKind,
  ResumeBasics,
  ResumeBullet,
  ResumeBulletCache,
  ResumeData,
  ResumeSnapshot,
} from "../../types";
import ExperiencePool, {
  type PoolFilter,
} from "../../components/ExperiencePool";
import ResumePaper, {
  type ResumePaperEntry,
} from "../../components/ResumePaper";
import ResumeBasicsForm from "../../components/ResumeBasicsForm";
import BulletManager from "../../components/BulletManager";
import PortfolioDialog from "../../components/PortfolioDialog";
import SnapshotMenu from "./SnapshotMenu";
import { generateResumeBullets } from "../../ai/tasks/resume";
import {
  formatSnapshotTime,
  pickSelectedExperiences,
  relativeTimeLabel,
} from "../../lib/resume";
import {
  addResumeSnapshot,
  loadSnapshots,
  toBulletCache,
} from "../../store/resume";

interface ResumePageProps {
  experiences: ExperienceData | null;
  resume: ResumeData;
  onSaveResume: (data: ResumeData) => void;
  onNavigateExperiences: () => void;
  onNavigateOpportunities: () => void;
}

const BTN_PRIMARY =
  "bg-ink text-paper inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-xs font-medium disabled:cursor-not-allowed disabled:bg-ink/10 disabled:text-ink/40";
const BTN_SECONDARY =
  "border-rule hover:bg-ink/[0.03] inline-flex min-h-11 items-center justify-center rounded-lg border bg-surface px-3 text-xs disabled:cursor-not-allowed disabled:opacity-40";

export default function ResumePage({
  experiences,
  resume,
  onSaveResume,
  onNavigateExperiences,
  onNavigateOpportunities,
}: ResumePageProps) {
  const items = useMemo(
    () => experiences?.experiences ?? [],
    [experiences],
  );

  const [poolFilter, setPoolFilter] = useState<PoolFilter>("all");
  const [kindFilter, setKindFilter] = useState<ExperienceKind[]>([]);
  const [view, setView] = useState<"pool" | "paper">("pool");
  const [basicsOpen, setBasicsOpen] = useState(true);
  const [managerOpen, setManagerOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<ResumeSnapshot[]>([]);
  const [snapshotPanelOpen, setSnapshotPanelOpen] = useState(false);
  const [previewSnapshot, setPreviewSnapshot] =
    useState<ResumeSnapshot | null>(null);
  const [portfolioOpen, setPortfolioOpen] = useState(false);
  const [overflow, setOverflow] = useState(false);

  const paperFrameRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const resumeRef = useRef(resume);

  useEffect(() => {
    resumeRef.current = resume;
  }, [resume]);

  useEffect(() => {
    let alive = true;
    void loadSnapshots().then((list) => {
      if (alive) setSnapshots(list);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 6000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const experienceMap = useMemo(
    () => new Map(items.map((item) => [item.id, item])),
    [items],
  );
  const validSelectedIds = useMemo(
    () =>
      resume.selectedExperienceIds.filter((id) => experienceMap.has(id)),
    [resume.selectedExperienceIds, experienceMap],
  );
  const selectedExperiences = useMemo(
    () => pickSelectedExperiences(items, validSelectedIds),
    [items, validSelectedIds],
  );
  const validConciseIds = useMemo(() => {
    const selected = new Set(validSelectedIds);
    return resume.conciseIds.filter((id) => selected.has(id));
  }, [resume.conciseIds, validSelectedIds]);

  const entries = useMemo<ResumePaperEntry[]>(
    () =>
      selectedExperiences.map((experience) => ({
        experience,
        concise: validConciseIds.includes(experience.id),
        cache: resume.bullets[experience.id],
      })),
    [selectedExperiences, validConciseIds, resume.bullets],
  );

  const previewEntries = useMemo<ResumePaperEntry[]>(() => {
    if (!previewSnapshot) return [];
    const map = new Map(
      previewSnapshot.experiences.map((item) => [item.id, item]),
    );
    return previewSnapshot.selectedExperienceIds
      .map((id) => map.get(id))
      .filter((item): item is Experience => Boolean(item))
      .map((experience) => ({
        experience,
        concise: previewSnapshot.conciseIds.includes(experience.id),
        cache: toBulletCache(previewSnapshot, experience.id),
      }));
  }, [previewSnapshot]);

  const displayedEntries = previewSnapshot ? previewEntries : entries;
  const displayedBasics = previewSnapshot
    ? previewSnapshot.basics
    : resume.basics;

  const measure = useCallback(() => {
    const frame = paperFrameRef.current;
    const paper = paperRef.current;
    if (!frame || !paper) {
      setOverflow(false);
      return;
    }
    const width = frame.clientWidth;
    if (width <= 0) {
      setOverflow(false);
      return;
    }
    const limit = (width * 297) / 210;
    setOverflow(paper.getBoundingClientRect().height > limit + 4);
  }, []);

  useLayoutEffect(() => {
    measure();
    const frame = paperFrameRef.current;
    if (!frame || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    if (paperRef.current) observer.observe(paperRef.current);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure, displayedEntries, displayedBasics]);

  function commit(next: ResumeData) {
    onSaveResume({ ...next, updatedAt: new Date().toISOString() });
  }

  function patchBasics(patch: Partial<ResumeBasics>) {
    commit({
      ...resume,
      basics: { ...resume.basics, ...patch },
    });
  }

  function toggleSelect(id: string) {
    const selected = validSelectedIds;
    if (selected.includes(id)) {
      commit({
        ...resume,
        selectedExperienceIds: selected.filter((item) => item !== id),
        conciseIds: resume.conciseIds.filter((item) => item !== id),
      });
      setNotice("已从简历移除。");
    } else {
      commit({
        ...resume,
        selectedExperienceIds: [...selected, id],
      });
      setNotice("已加入简历，顺序可在经历池中调整。");
    }
    setError(null);
  }

  function moveSelected(id: string, direction: -1 | 1) {
    const list = [...validSelectedIds];
    const index = list.indexOf(id);
    const next = index + direction;
    if (index < 0 || next < 0 || next >= list.length) return;
    [list[index], list[next]] = [list[next], list[index]];
    commit({ ...resume, selectedExperienceIds: list });
  }

  function toggleConcise(id: string) {
    const set = new Set(resume.conciseIds);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    commit({
      ...resume,
      conciseIds: validSelectedIds.filter((item) => set.has(item)),
    });
  }

  function clearSelected() {
    commit({
      ...resume,
      selectedExperienceIds: [],
      conciseIds: [],
    });
    setNotice("已清空简历中的经历。");
    setError(null);
  }

  function toggleKind(kind: ExperienceKind) {
    setKindFilter((prev) =>
      prev.includes(kind)
        ? prev.filter((item) => item !== kind)
        : [...prev, kind],
    );
  }

  function resetFilters() {
    setPoolFilter("all");
    setKindFilter([]);
  }

  function snapshotInput(): Omit<
    ResumeSnapshot,
    "id" | "version" | "createdAt"
  > {
    const bulletsSnapshot: Record<string, ResumeBullet[]> = {};
    for (const experience of selectedExperiences) {
      const cache = resume.bullets[experience.id];
      if (cache && cache.bullets.length > 0) {
        bulletsSnapshot[experience.id] = cache.bullets;
      }
    }
    return {
      basics: resume.basics,
      selectedExperienceIds: selectedExperiences.map((item) => item.id),
      conciseIds: validConciseIds,
      bulletsSnapshot,
      experiences: selectedExperiences,
    };
  }

  async function handleSaveSnapshot() {
    try {
      const { snapshot, snapshots: next } = await addResumeSnapshot(
        snapshotInput(),
      );
      setSnapshots(next);
      setNotice(`已保存版本 v${snapshot.version}。`);
      setError(null);
    } catch {
      setError("快照保存失败，请检查浏览器存储权限后重试。");
    }
  }

  async function handleGenerate(id: string) {
    const experience = experienceMap.get(id);
    if (!experience) return;
    setGeneratingId(id);
    setError(null);
    try {
      const result = await generateResumeBullets(experience);
      if (result.bullets.length === 0) {
        setNotice(result.note);
        setError("这条经历还没有可提炼的内容，请先去经历页补充四段式。");
        return;
      }
      const cache: ResumeBulletCache = {
        experienceId: id,
        bullets: result.bullets,
        source: result.source,
        status: result.status,
        generatedAt: new Date().toISOString(),
        hiddenCount: result.hiddenCount,
        note: result.note,
      };
      commit({
        ...resumeRef.current,
        bullets: { ...resumeRef.current.bullets, [id]: cache },
      });
      setManagerOpen(true);
      setNotice(result.note);
    } catch {
      setError("生成要点失败，请稍后重试。");
    } finally {
      setGeneratingId(null);
    }
  }

  function handleDeleteBullet(experienceId: string, bulletId: string) {
    const cache = resume.bullets[experienceId];
    if (!cache) return;
    const bullets = cache.bullets.filter((bullet) => bullet.id !== bulletId);
    const nextBullets = { ...resume.bullets };
    if (bullets.length === 0) {
      delete nextBullets[experienceId];
    } else {
      nextBullets[experienceId] = { ...cache, bullets };
    }
    commit({ ...resume, bullets: nextBullets });
    setNotice("已删除该条要点。");
  }

  async function handleRegenerateBullet(
    experienceId: string,
    bulletId: string,
  ) {
    const experience = experienceMap.get(experienceId);
    const cache = resume.bullets[experienceId];
    if (!experience || !cache) return;
    const targetIndex = cache.bullets.findIndex(
      (bullet) => bullet.id === bulletId,
    );
    if (targetIndex < 0) return;

    setGeneratingId(experienceId);
    setError(null);
    try {
      const excludeTexts = cache.bullets
        .filter((bullet) => bullet.id !== bulletId)
        .map((bullet) => bullet.text);
      const result = await generateResumeBullets(experience, {
        excludeTexts,
      });
      const replacement = result.bullets[0];
      if (!replacement) {
        setNotice("没有找到可替换的新要点，已保留原条目。");
        return;
      }
      const latest = resumeRef.current;
      const latestCache = latest.bullets[experienceId] ?? cache;
      const latestIndex = latestCache.bullets.findIndex(
        (bullet) => bullet.id === bulletId,
      );
      if (latestIndex < 0) {
        setNotice("该条要点已被删除，已保留当前内容。");
        return;
      }
      const bullets = latestCache.bullets.map((bullet, index) =>
        index === latestIndex ? replacement : bullet,
      );
      commit({
        ...latest,
        bullets: {
          ...latest.bullets,
          [experienceId]: {
            ...latestCache,
            bullets,
            source: result.source,
            status: result.status,
            generatedAt: new Date().toISOString(),
            hiddenCount: result.hiddenCount,
            note: result.note,
          },
        },
      });
      setNotice("已重写这条要点。");
    } catch {
      setError("重写失败，已保留原条目。");
    } finally {
      setGeneratingId(null);
    }
  }

  function handlePreviewSnapshot(snapshot: ResumeSnapshot) {
    setPreviewSnapshot(snapshot);
    setSnapshotPanelOpen(false);
    setView("paper");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleRestoreSnapshot(snapshot: ResumeSnapshot) {
    if (!window.confirm("恢复将覆盖当前简历，是否继续？")) return;
    const existing = new Set(items.map((item) => item.id));
    const keptIds = snapshot.selectedExperienceIds.filter((id) =>
      existing.has(id),
    );
    const skipped = snapshot.selectedExperienceIds.length - keptIds.length;
    const bullets: Record<string, ResumeBulletCache> = {};
    for (const id of keptIds) {
      const cache = toBulletCache(snapshot, id);
      if (cache) bullets[id] = cache;
    }
    commit({
      ...resume,
      basics: snapshot.basics,
      selectedExperienceIds: keptIds,
      conciseIds: snapshot.conciseIds.filter((id) => keptIds.includes(id)),
      bullets,
    });
    setPreviewSnapshot(null);
    setSnapshotPanelOpen(false);
    setNotice(
      skipped > 0
        ? `已恢复 v${snapshot.version}；${skipped} 条经历已不存在，已跳过。`
        : `已恢复到 v${snapshot.version}。`,
    );
    setError(null);
  }

  async function handlePrint() {
    if (displayedEntries.length === 0) {
      setError("先从左侧选择经历，再打印。");
      return;
    }
    if (
      overflow &&
      !window.confirm(
        "内容可能超过一页 A4，建议精简或减少条目。仍要继续打印吗？",
      )
    ) {
      return;
    }

    setError(null);
    if (!previewSnapshot) {
      try {
        const { snapshot, snapshots: next } = await addResumeSnapshot(
          snapshotInput(),
        );
        setSnapshots(next);
        setNotice(`打印前已保存版本 v${snapshot.version}。`);
      } catch {
        setNotice("快照保存失败，已继续打印。");
      }
    }

    const previousTitle = document.title;
    const name = displayedBasics.name.trim() || "简历";
    const target = displayedBasics.target.trim();
    document.title = target ? `${name}-${target}` : name;
    const restore = () => {
      document.title = previousTitle;
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
    window.print();
  }

  function openNameField() {
    setView("paper");
    setBasicsOpen(true);
    window.setTimeout(() => {
      document
        .getElementById("resume-basics")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }

  const nameMissing = !displayedBasics.name.trim();
  const selectedCount = displayedEntries.length;
  const latestSnapshot = snapshots[0] ?? null;

  return (
    <div className="resume-page px-4 pb-24 sm:px-6 lg:px-8 lg:pb-10">
      <div className="mx-auto w-full max-w-[1440px]">
        <header className="resume-page-header border-rule flex flex-col gap-4 border-b py-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-[10px] tracking-[0.2em] text-ink/40">
              M3 · 简历 / 05
            </p>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1 className="font-serif text-2xl tracking-tight sm:text-3xl">
                简历工作台
              </h1>
              <span className="bg-ink/[0.05] rounded-full px-2 py-0.5 font-mono text-[10px] text-ink/55">
                已选 {entries.length} 条
              </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-ink/55">
              勾选经历 → 核对要点 → 打印 A4。内容只在本机，作品集分享靠链接本身。
            </p>
            {latestSnapshot && (
              <p className="mt-1 font-mono text-[10px] tabular-nums text-ink/35">
                共 {snapshots.length} 个版本 · 最近一次{" "}
                {relativeTimeLabel(latestSnapshot.createdAt)}
              </p>
            )}
          </div>

          {!previewSnapshot && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void handleSaveSnapshot()}
                className={BTN_SECONDARY}
              >
                保存快照
              </button>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setSnapshotPanelOpen((open) => !open)}
                  aria-expanded={snapshotPanelOpen}
                  className={BTN_SECONDARY}
                >
                  版本 {snapshots.length > 0 ? `(${snapshots.length})` : ""}
                </button>
                <SnapshotMenu
                  open={snapshotPanelOpen}
                  snapshots={snapshots}
                  onClose={() => setSnapshotPanelOpen(false)}
                  onPreview={handlePreviewSnapshot}
                  onRestore={handleRestoreSnapshot}
                />
              </div>
              <button
                type="button"
                onClick={() => setPortfolioOpen(true)}
                className={BTN_SECONDARY}
              >
                生成作品集
              </button>
              <button
                type="button"
                onClick={onNavigateOpportunities}
                className={BTN_SECONDARY}
              >
                按简历找机会
              </button>
              <button
                type="button"
                onClick={() => void handlePrint()}
                disabled={entries.length === 0}
                className={`${BTN_PRIMARY} max-lg:hidden`}
              >
                打印 / 存为 PDF
              </button>
            </div>
          )}
        </header>

        {notice && (
          <p
            role="status"
            className="resume-banner border-rule mt-4 flex items-center gap-2 rounded-lg border bg-surface px-3 py-2 text-xs text-ink/60"
          >
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
            />
            {notice}
          </p>
        )}

        {error && (
          <p
            role="alert"
            className="resume-banner border-amber/50 bg-amber/[0.07] mt-4 rounded-lg border-l-2 px-3 py-2 text-xs leading-5 text-ink/75"
          >
            {error}
          </p>
        )}

        {nameMissing && !previewSnapshot && (
          <div className="resume-banner border-amber/50 bg-amber/[0.07] mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border-l-2 px-3 py-2">
            <p className="text-xs leading-5 text-ink/75">
              填写姓名后导出的简历更完整。
            </p>
            <button
              type="button"
              onClick={openNameField}
              className="text-amber inline-flex min-h-11 items-center text-xs font-medium underline underline-offset-2 sm:min-h-8"
            >
              去填写
            </button>
          </div>
        )}

        {previewSnapshot ? (
          <div className="mt-4">
            <div className="resume-banner border-rule flex flex-col gap-3 rounded-xl border bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">
                  正在预览 v{previewSnapshot.version}
                  <span className="ml-2 font-mono text-[10px] font-normal text-ink/40">
                    只读 · {formatSnapshotTime(previewSnapshot.createdAt)} ·{" "}
                    {previewEntries.length} 条经历
                  </span>
                </p>
                <p className="mt-1 text-[11px] leading-5 text-ink/45">
                  预览不会修改当前简历。
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewSnapshot(null)}
                  className={BTN_SECONDARY}
                >
                  退出预览
                </button>
                <button
                  type="button"
                  onClick={() => handleRestoreSnapshot(previewSnapshot)}
                  className={BTN_PRIMARY}
                >
                  恢复到此版本
                </button>
                <button
                  type="button"
                  onClick={() => void handlePrint()}
                  disabled={previewEntries.length === 0}
                  className={BTN_SECONDARY}
                >
                  打印此版本
                </button>
              </div>
            </div>

            {overflow && (
              <p className="resume-banner border-amber/50 bg-amber/[0.07] mt-3 rounded-lg border-l-2 px-3 py-2 text-xs leading-5 text-ink/75">
                内容超过一页 A4，建议精简或减少条目。仍可继续打印。
              </p>
            )}

            <div className="mx-auto mt-4 w-full max-w-3xl">
              <ResumePaper
                basics={displayedBasics}
                entries={previewEntries}
                frameRef={paperFrameRef}
                paperRef={paperRef}
              />
            </div>
          </div>
        ) : (
          <>
            <div className="resume-toolbar mt-4 flex items-center justify-between gap-3 lg:hidden">
              <div
                className="border-rule inline-flex rounded-lg border bg-surface p-0.5"
                aria-label="切换经历池与预览"
              >
                <button
                  type="button"
                  aria-pressed={view === "pool"}
                  onClick={() => setView("pool")}
                  className={[
                    "min-h-10 rounded-md px-3 text-xs",
                    view === "pool"
                      ? "bg-ink text-paper"
                      : "text-ink/55",
                  ].join(" ")}
                >
                  经历池
                </button>
                <button
                  type="button"
                  aria-pressed={view === "paper"}
                  onClick={() => setView("paper")}
                  className={[
                    "min-h-10 rounded-md px-3 text-xs",
                    view === "paper"
                      ? "bg-ink text-paper"
                      : "text-ink/55",
                  ].join(" ")}
                >
                  预览
                </button>
              </div>
              <span className="font-mono text-[10px] tabular-nums text-ink/40">
                已选 {entries.length} 条
              </span>
            </div>

            <div className="resume-page-grid mt-4 grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start">
              <div
                className={[
                  "resume-pool-pane",
                  view === "pool" ? "" : "hidden lg:block",
                ].join(" ")}
              >
                <ExperiencePool
                  experiences={items}
                  selectedIds={validSelectedIds}
                  conciseIds={validConciseIds}
                  bullets={resume.bullets}
                  filter={poolFilter}
                  kindFilter={kindFilter}
                  onFilterChange={setPoolFilter}
                  onToggleKind={toggleKind}
                  onResetFilters={resetFilters}
                  onToggleSelect={toggleSelect}
                  onMove={moveSelected}
                  onToggleConcise={toggleConcise}
                  onClear={clearSelected}
                  onGenerate={(id) => void handleGenerate(id)}
                  generatingId={generatingId}
                  onNavigateExperiences={onNavigateExperiences}
                />
              </div>

              <div
                className={[
                  "resume-preview-pane",
                  view === "paper" ? "" : "hidden lg:block",
                ].join(" ")}
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="font-mono text-[10px] tabular-nums text-ink/40">
                    已选 {entries.length} 条 ·{" "}
                    {overflow ? "预计超过 1 页" : "1 页内"}
                  </p>
                  <p className="text-[10px] text-ink/35">
                    移动端为缩略预览，打印以 A4 为准
                  </p>
                </div>

                {overflow && (
                  <p className="resume-banner border-amber/50 bg-amber/[0.07] mb-3 rounded-lg border-l-2 px-3 py-2 text-xs leading-5 text-ink/75">
                    内容超过一页 A4，建议精简或减少条目。仍可继续打印。
                  </p>
                )}

                <ResumeBasicsForm
                  basics={resume.basics}
                  open={basicsOpen}
                  onToggle={() => setBasicsOpen((open) => !open)}
                  onChange={patchBasics}
                />

                <div className="mt-3">
                  <ResumePaper
                    basics={resume.basics}
                    entries={entries}
                    frameRef={paperFrameRef}
                    paperRef={paperRef}
                  />
                </div>

                <BulletManager
                  entries={entries}
                  open={managerOpen}
                  onToggle={() => setManagerOpen((open) => !open)}
                  generatingId={generatingId}
                  onGenerate={(id) => void handleGenerate(id)}
                  onDeleteBullet={handleDeleteBullet}
                  onRegenerateBullet={(experienceId, bulletId) =>
                    void handleRegenerateBullet(experienceId, bulletId)
                  }
                />
              </div>
            </div>
          </>
        )}
      </div>

      <div className="resume-mobile-bar no-print border-rule fixed inset-x-0 bottom-0 z-30 border-t bg-paper px-4 py-3 lg:hidden">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <span className="shrink-0 font-mono text-[10px] tabular-nums text-ink/45">
            {selectedCount} 条
          </span>
          <button
            type="button"
            onClick={() => void handlePrint()}
            disabled={selectedCount === 0}
            className={`${BTN_PRIMARY} flex-1`}
          >
            打印 / 存为 PDF
          </button>
        </div>
      </div>

      {portfolioOpen && (
        <PortfolioDialog
          open={portfolioOpen}
          basics={resume.basics}
          experiences={selectedExperiences}
          onClose={() => setPortfolioOpen(false)}
        />
      )}
    </div>
  );
}
