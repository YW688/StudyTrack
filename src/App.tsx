import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import dayjs from "dayjs";
import { DAY_LABELS } from "./types";
import { currentWeekOf } from "./parse/schedule";
import { experienceKindLabel } from "./lib/experience";
import { streakInfo, weekGreenDayCount } from "./lib/ledger";
import type {
  AgentMessage,
  Assignment,
  AssignmentData,
  Experience,
  ExperienceData,
  Grade,
  LedgerEvent,
  Note,
  Profile,
  ResumeData,
  TimetableData,
} from "./types";
import { GOAL_LABELS, RESUME_GRADES } from "./types";
import AppShell from "./components/AppShell";
import EntryRitual from "./components/EntryRitual";
import WindowLayer from "./components/WindowLayer";
import LandingPage from "./pages/landing/LandingPage";
import TodayPage from "./pages/today/TodayPage";
import type { DockMode } from "./components/AgentPanel";

const AgentPanel = lazy(() => import("./components/AgentPanel"));
const TimetablePage = lazy(() => import("./pages/timetable/TimetablePage"));
const AssignmentsPage = lazy(
  () => import("./pages/assignments/AssignmentsPage"),
);
const ExperiencesPage = lazy(
  () => import("./pages/experiences/ExperiencesPage"),
);
const ResumePage = lazy(() => import("./pages/resume/ResumePage"));
const PortfolioPage = lazy(() => import("./pages/portfolio/PortfolioPage"));
const OpportunitiesPage = lazy(
  () => import("./pages/opportunities/OpportunitiesPage"),
);
const ToolboxPage = lazy(() => import("./pages/toolbox/ToolboxPage"));
const CalendarPage = lazy(() => import("./pages/calendar/CalendarPage"));
import { clearLocalData, loadTimetable, saveTimetable } from "./store/idb";
import {
  loadAssignments,
  saveAssignments,
} from "./store/assignments";
import { loadExperiences, saveExperiences } from "./store/experiences";
import {
  createEmptyResume,
  loadResume,
  saveResume,
} from "./store/resume";
import {
  createOnboardedProfile,
  loadProfile,
  saveProfile,
} from "./store/profile";
import {
  createLedgerEvent,
  loadLedger,
  saveLedger,
} from "./store/ledger";
import { createNote, loadNotes, saveNotes } from "./store/notes";
import { loadAgentMessages, saveAgentMessages } from "./store/agent";
import {
  applyBackup,
  collectBackup,
  parseBackupText,
} from "./store/backup";
import { createSampleTimetable } from "./store/fixtures/timetable";
import { createDemoSeed } from "./store/fixtures/demo";
import {
  CALENDAR_ISSUE,
  CALENDAR_ITEMS,
  CALENDAR_UPDATED_AT,
} from "./store/calendar";
import { resumeHasContent } from "./lib/resume";
import { applyTheme, readStoredTheme, type ThemeId } from "./lib/theme";
import { backupFileName, downloadBackupFile } from "./lib/backup";
import { newId } from "./lib/id";
import { GUIDE_OPPORTUNITIES_KEY } from "./lib/guide";
import type { OnboardingValues } from "./components/TodayOnboarding";
import type {
  AgentExperienceDraft,
  AgentProfileDraft,
} from "./ai/tasks/agent";

type Route =
  | "landing"
  | "today"
  | "timetable"
  | "assignments"
  | "experiences"
  | "resume"
  | "opportunities"
  | "toolbox"
  | "calendar"
  | "portfolio";

type ModuleRoute = Exclude<Route, "landing" | "portfolio">;
type SurfaceId = "today" | "experiences" | "opportunities" | "toolbox";

function navIdForRoute(route: Route): SurfaceId {
  if (route === "today") return "today";
  if (route === "experiences") return "experiences";
  if (route === "opportunities") return "opportunities";
  return "toolbox";
}

const DEMO_KEY = "studytrack:demo";
const DOCK_KEY = "studytrack:dock";

type PageWindowId =
  | "timetable"
  | "assignments"
  | "experiences"
  | "opportunities"
  | "resume"
  | "calendar";

function readDockMode(): DockMode {
  try {
    const stored = window.localStorage.getItem(DOCK_KEY);
    if (stored === "collapsed" || stored === "docked" || stored === "floating") {
      return stored;
    }
  } catch {
    // UI-only preference; storage may be disabled.
  }
  try {
    // 停靠后主栏仍需 ≥900px，否则 1440 屏比 1280 屏更窄
    return window.matchMedia("(min-width: 1680px)").matches
      ? "docked"
      : "collapsed";
  } catch {
    return "collapsed";
  }
}

function readDemoMode(): boolean {
  try {
    return window.localStorage.getItem(DEMO_KEY) === "1";
  } catch {
    return false;
  }
}

function writeDemoMode(value: boolean): void {
  try {
    if (value) window.localStorage.setItem(DEMO_KEY, "1");
    else window.localStorage.removeItem(DEMO_KEY);
  } catch {
    // UI-only preference; storage may be disabled.
  }
}

function shouldPlayEntryRitual(): boolean {
  try {
    return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return true;
  }
}

function readRoute(): Route {
  const hash = window.location.hash.replace(/^#\/?/, "");
  if (hash === "today") return "today";
  if (hash === "timetable") return "timetable";
  if (hash === "assignments") return "assignments";
  if (hash === "experiences") return "experiences";
  if (hash === "resume") return "resume";
  if (hash === "opportunities") return "opportunities";
  if (hash === "toolbox") return "toolbox";
  if (hash === "calendar") return "calendar";
  if (hash.startsWith("p/")) return "portfolio";
  return "landing";
}

export default function App() {
  const [route, setRoute] = useState<Route>(readRoute);
  const [hash, setHash] = useState(() => window.location.hash);
  const [timetable, setTimetable] = useState<TimetableData | null>(null);
  const [assignments, setAssignments] = useState<AssignmentData | null>(null);
  const [experiences, setExperiences] = useState<ExperienceData | null>(null);
  const [resume, setResume] = useState<ResumeData>(() => createEmptyResume());
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ledger, setLedger] = useState<LedgerEvent[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [agentMessages, setAgentMessages] = useState<AgentMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<ThemeId>(readStoredTheme);
  const [demoMode, setDemoMode] = useState(readDemoMode);
  const [dockMode, setDockMode] = useState<DockMode>(readDockMode);
  const [openWindows, setOpenWindows] = useState<PageWindowId[]>([]);
  const [ritual, setRitual] = useState<{ theme: ThemeId } | null>(null);
  const [ritualReady, setRitualReady] = useState(false);
  const resumeWriteRef = useRef<Promise<void>>(Promise.resolve());
  const agentWriteRef = useRef<Promise<void>>(Promise.resolve());
  const loadedRef = useRef(false);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    let alive = true;
    void Promise.all([
      loadTimetable(),
      loadAssignments(),
      loadExperiences(),
      loadResume(),
      loadProfile(),
      loadLedger(),
      loadNotes(),
      loadAgentMessages(),
    ]).then(
      ([
        storedTimetable,
        storedAssignments,
        storedExperiences,
        storedResume,
        storedProfile,
        storedLedger,
        storedNotes,
        storedAgentMessages,
      ]) => {
        if (!alive || loadedRef.current) return;
        loadedRef.current = true;
        setTimetable(storedTimetable);
        setAssignments(storedAssignments);
        setExperiences(storedExperiences);
        setResume(storedResume ?? createEmptyResume());
        setProfile(storedProfile);
        setLedger(storedLedger);
        setNotes(storedNotes);
        setAgentMessages(storedAgentMessages);
        const hasStoredData =
          storedTimetable !== null ||
          storedAssignments !== null ||
          (storedExperiences?.experiences.length ?? 0) > 0 ||
          storedProfile !== null ||
          storedLedger.length > 0 ||
          storedNotes.length > 0 ||
          (storedResume ? resumeHasContent(storedResume) : false);
        const demo = readDemoMode() && hasStoredData;
        setDemoMode(demo);
        if (!demo) writeDemoMode(false);
        setLoading(false);
      },
    );
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const sync = () => {
      setRoute(readRoute());
      setHash(window.location.hash);
    };
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, []);

  const navigate = useCallback((next: Route) => {
    const nextHash = next === "landing" ? "#/" : `#/${next}`;
    if (window.location.hash !== nextHash) {
      window.history.pushState(null, "", nextHash);
    }
    setRoute(next);
    setHash(nextHash);
    setOpenWindows((prev) => prev.filter((id) => id !== next));
    window.scrollTo({ top: 0 });
  }, []);

  const handleDockModeChange = useCallback((mode: DockMode) => {
    setDockMode(mode);
    try {
      window.localStorage.setItem(DOCK_KEY, mode);
    } catch {
      // UI-only preference; storage may be disabled.
    }
  }, []);

  const openWindow = useCallback(
    (id: PageWindowId) => {
      if (window.innerWidth < 640) {
        navigate(id);
        return;
      }
      setOpenWindows((prev) => (prev.includes(id) ? prev : [...prev, id]));
    },
    [navigate],
  );

  const closeWindow = useCallback((id: PageWindowId) => {
    setOpenWindows((prev) => prev.filter((item) => item !== id));
  }, []);

  const handleSaveResume = useCallback((next: ResumeData) => {
    setResume(next);
    resumeWriteRef.current = resumeWriteRef.current
      .then(() => saveResume(next))
      .catch(() => undefined);
  }, []);

  const handleAgentMessages = useCallback((next: AgentMessage[]) => {
    setAgentMessages(next);
    agentWriteRef.current = agentWriteRef.current
      .then(() => saveAgentMessages(next))
      .catch(() => undefined);
  }, []);

  const dismissRitual = useCallback(() => setRitual(null), []);

  async function seedDemoData(): Promise<void> {
    loadedRef.current = true;
    setLoading(false);
    const seed = createDemoSeed();
    const fullDemo =
      timetable === null &&
      assignments === null &&
      (!experiences || experiences.experiences.length === 0) &&
      profile === null &&
      ledger.length === 0 &&
      notes.length === 0 &&
      !resumeHasContent(resume);

    const nextTimetable = timetable ?? seed.timetable;
    const nextAssignments = assignments ?? seed.assignments;
    const nextExperiences =
      experiences && experiences.experiences.length > 0
        ? experiences
        : seed.experiences;
    const nextProfile = fullDemo ? seed.profile : profile;
    const nextResume = fullDemo ? seed.resume : resume;
    const nextLedger = fullDemo ? seed.ledger : ledger;
    const nextNotes = fullDemo ? seed.notes : notes;

    const writes: Promise<void>[] = [];
    if (nextTimetable !== timetable) writes.push(saveTimetable(nextTimetable));
    if (nextAssignments !== assignments) {
      writes.push(saveAssignments(nextAssignments));
    }
    if (nextExperiences !== experiences) {
      writes.push(saveExperiences(nextExperiences));
    }
    if (nextProfile && nextProfile !== profile) {
      writes.push(saveProfile(nextProfile));
    }
    if (nextResume !== resume) writes.push(saveResume(nextResume));
    if (nextLedger !== ledger) writes.push(saveLedger(nextLedger));
    if (nextNotes !== notes) writes.push(saveNotes(nextNotes));
    await Promise.all(writes);

    setTimetable(nextTimetable);
    setAssignments(nextAssignments);
    setExperiences(nextExperiences);
    if (nextProfile) setProfile(nextProfile);
    if (nextResume !== resume) setResume(nextResume);
    if (nextLedger !== ledger) setLedger(nextLedger);
    if (nextNotes !== notes) setNotes(nextNotes);

    if (fullDemo) {
      writeDemoMode(true);
      setDemoMode(true);
    }
  }

  async function handleStart(mode: "fresh" | "demo") {
    const playRitual = shouldPlayEntryRitual();
    if (playRitual) {
      setRitualReady(false);
      setRitual({ theme });
    }

    try {
      if (mode === "demo") {
        await seedDemoData();
      } else {
        try {
          window.sessionStorage.removeItem("studytrack:onboarding-hidden");
        } catch {
          // UI-only preference; storage may be disabled.
        }
      }
      navigate("today");
      if (playRitual) setRitualReady(true);
    } catch (error) {
      if (playRitual) setRitual(null);
      throw error;
    }
  }

  async function handleSaveTimetable(next: TimetableData) {
    await saveTimetable(next);
    setTimetable(next);
  }

  async function handleSaveAssignments(next: AssignmentData) {
    await saveAssignments(next);
    setAssignments(next);
  }

  async function handleSaveExperiences(next: ExperienceData) {
    await saveExperiences(next);
    setExperiences(next);
  }

  async function handleAgentSaveProfile(draft: AgentProfileDraft) {
    const now = new Date().toISOString();
    const resumeGrade = (RESUME_GRADES as readonly string[]).includes(
      resume.basics.grade,
    )
      ? (resume.basics.grade as Grade)
      : "";
    const nextProfile: Profile = {
      id: "me",
      grade: draft.grade || profile?.grade || resumeGrade || "",
      major:
        draft.major.trim() || profile?.major || resume.basics.major || "",
      school: profile?.school,
      goal: draft.goal,
      targetRoles:
        draft.targetRoles.length > 0
          ? draft.targetRoles
          : (profile?.targetRoles ?? []),
      skills:
        draft.skills.length > 0
          ? draft.skills
          : (profile?.skills ?? []),
      interests: profile?.interests ?? [],
      onboardedAt: profile?.onboardedAt ?? now,
      updatedAt: now,
    };
    const nextResume: ResumeData = {
      ...resume,
      basics: {
        ...resume.basics,
        grade: nextProfile.grade || resume.basics.grade,
        major: nextProfile.major || resume.basics.major,
        target:
          nextProfile.targetRoles.slice(0, 2).join(" / ").slice(0, 80) ||
          resume.basics.target,
      },
      updatedAt: now,
    };
    await saveProfile(nextProfile);
    await saveResume(nextResume);
    setProfile(nextProfile);
    setResume(nextResume);
  }

  async function handleAgentSaveExperience(draft: AgentExperienceDraft) {
    const now = new Date().toISOString();
    const experience: Experience = {
      id: newId("experience"),
      kind: draft.kind,
      title: draft.title.trim().slice(0, 120),
      problem: draft.problem.trim().slice(0, 2000),
      method: draft.method.trim().slice(0, 2000),
      contribution: draft.contribution.trim().slice(0, 2000),
      result: draft.result.trim().slice(0, 2000),
      metrics: [],
      evidence: [],
      skills: draft.skills,
      tags: ["记录官"],
      confidence: draft.confidence,
      source: "ai",
      createdAt: now,
      updatedAt: now,
    };
    const nextExperiences: ExperienceData = {
      experiences: [...(experiences?.experiences ?? []), experience],
      updatedAt: now,
      sourceLabel:
        experiences?.sourceLabel === "示例经历"
          ? "示例 + 记录官"
          : experiences?.sourceLabel,
    };
    const nextLedger = [
      ...ledger,
      createLedgerEvent({
        type: "experience_added",
        title: `记下「${experience.title}」`,
        detail: (experience.result || experience.method).slice(0, 80),
        refId: experience.id,
      }),
    ];
    await saveExperiences(nextExperiences);
    await saveLedger(nextLedger);
    setExperiences(nextExperiences);
    setLedger(nextLedger);
  }

  async function handleOnboard(
    values: OnboardingValues,
    recentWork: string,
  ) {
    const nextProfile = createOnboardedProfile(values);
    const now = new Date().toISOString();
    const nextResume: ResumeData = {
      ...resume,
      basics: {
        ...resume.basics,
        grade: resume.basics.grade || nextProfile.grade,
        major: resume.basics.major || nextProfile.major,
      },
      updatedAt: now,
    };
    await saveProfile(nextProfile);
    await saveResume(nextResume);
    setResume(nextResume);

    let nextNotes = notes;
    let nextLedger = ledger;
    const firstRecord = recentWork.trim();
    if (firstRecord) {
      const note = createNote({
        text: firstRecord.slice(0, 1000),
        tags: ["建档"],
      });
      nextNotes = [...notes, note];
      await saveNotes(nextNotes);
      nextLedger = [
        ...ledger,
        createLedgerEvent({
          type: "note_added",
          title: "写下第一条记录",
          detail: firstRecord.slice(0, 80),
          refId: note.id,
        }),
      ];
      await saveLedger(nextLedger);
    }

    setProfile(nextProfile);
    setNotes(nextNotes);
    setLedger(nextLedger);
    try {
      window.sessionStorage.removeItem("studytrack:onboarding-hidden");
    } catch {
      // UI-only preference; storage may be disabled.
    }
  }

  async function handleToggleAssignment(item: Assignment) {
    if (!assignments) return;
    const willComplete = item.status !== "done";
    const nextAssignments: AssignmentData = {
      ...assignments,
      items: assignments.items.map((current) =>
        current.id === item.id
          ? {
              ...current,
              status: willComplete ? "done" : "todo",
            }
          : current,
      ),
      updatedAt: new Date().toISOString(),
    };
    await saveAssignments(nextAssignments);
    setAssignments(nextAssignments);

    let nextLedger = ledger;
    if (willComplete) {
      const exists = ledger.some(
        (event) =>
          !event.revokedAt &&
          event.type === "assignment_done" &&
          event.refId === item.id,
      );
      if (!exists) {
        nextLedger = [
          ...ledger,
          createLedgerEvent({
            type: "assignment_done",
            title: `完成「${item.title}」`,
            refId: item.id,
          }),
        ];
      }
    } else {
      const revokedAt = new Date().toISOString();
      let changed = false;
      const revoked = ledger.map((event) => {
        if (
          !event.revokedAt &&
          event.type === "assignment_done" &&
          event.refId === item.id
        ) {
          changed = true;
          return { ...event, revokedAt };
        }
        return event;
      });
      if (changed) nextLedger = revoked;
    }

    if (nextLedger !== ledger) {
      await saveLedger(nextLedger);
      setLedger(nextLedger);
    }
  }

  async function handleAddNote(text: string, tags?: string[]) {
    const value = text.trim();
    if (!value) return;
    const note = createNote({
      text: value.slice(0, 1000),
      tags,
    });
    const nextNotes = [...notes, note];
    await saveNotes(nextNotes);
    setNotes(nextNotes);

    const nextLedger = [
      ...ledger,
      createLedgerEvent({
        type: "note_added",
        title: "留下一条记录",
        detail: value.slice(0, 80),
        refId: note.id,
      }),
    ];
    await saveLedger(nextLedger);
    setLedger(nextLedger);
  }

  async function handleExport() {
    const backup = await collectBackup();
    downloadBackupFile(backup, backupFileName());
  }

  async function handleImport(
    text: string,
  ): Promise<{ ok: boolean; message: string }> {
    await agentWriteRef.current.catch(() => undefined);
    const parsed = parseBackupText(text);
    if (!parsed.ok) {
      return { ok: false, message: parsed.message };
    }
    try {
      const snapshot = await applyBackup(parsed.backup);
      setProfile(snapshot.profile);
      setTimetable(snapshot.timetable);
      setAssignments(snapshot.assignments);
      setExperiences(snapshot.experiences);
      setResume(snapshot.resume ?? createEmptyResume());
      setLedger(snapshot.ledger);
      setNotes(snapshot.notes);
      setAgentMessages(snapshot.agentMessages);
      writeDemoMode(false);
      setDemoMode(false);
      try {
        window.localStorage.removeItem(GUIDE_OPPORTUNITIES_KEY);
      } catch {
        // UI-only preference; storage may be disabled.
      }
      navigate("today");
      return {
        ok: true,
        message: `已导入 ${snapshot.experiences?.experiences.length ?? 0} 条战绩、${snapshot.ledger.length} 条账本记录、${snapshot.notes.length} 条记录。`,
      };
    } catch {
      return {
        ok: false,
        message: "导入失败，请重试或检查浏览器存储权限。",
      };
    }
  }

  async function handleUseSampleTimetable() {
    const sample = createSampleTimetable();
    await saveTimetable(sample);
    setTimetable(sample);
  }

  async function handleUseSample(
    destination: "today" | "opportunities" = "today",
  ) {
    await seedDemoData();
    navigate(destination);
  }

  async function handleClear() {
    await resumeWriteRef.current.catch(() => undefined);
    await agentWriteRef.current.catch(() => undefined);
    await clearLocalData();
    setTimetable(null);
    setAssignments(null);
    setExperiences(null);
    setResume(createEmptyResume());
    setProfile(null);
    setLedger([]);
    setNotes([]);
    setAgentMessages([]);
    writeDemoMode(false);
    setDemoMode(false);
    try {
      window.localStorage.removeItem(GUIDE_OPPORTUNITIES_KEY);
    } catch {
      // UI-only preference; storage may be disabled.
    }
    try {
      window.sessionStorage.removeItem("studytrack:onboarding-hidden");
    } catch {
      // UI-only preference; storage may be disabled.
    }
    navigate("landing");
  }

  async function handleExitDemo() {
    if (
      !window.confirm("退出演示会清除本机示例数据，继续吗？")
    ) {
      return;
    }
    await handleClear();
  }

  const ritualOverlay = ritual ? (
    <EntryRitual
      theme={ritual.theme}
      ready={ritualReady}
      onDone={dismissRitual}
    />
  ) : null;

  if (route === "portfolio") {
    return (
      <>
        <Suspense fallback={<PageLoading />}>
          <PortfolioPage key={hash} hash={hash} />
        </Suspense>
        {ritualOverlay}
      </>
    );
  }

  if (route === "landing") {
    return (
      <>
        <LandingPage
          theme={theme}
          onThemeChange={setTheme}
          onStart={handleStart}
        />
        {ritualOverlay}
      </>
    );
  }

  const active = navIdForRoute(route);
  const assignmentCount =
    assignments?.items.filter((item) => item.status !== "done").length ?? 0;
  const now = dayjs();
  const weekNumber = timetable
    ? currentWeekOf(
        timetable.semester.startDate,
        timetable.semester.totalWeeks,
        now,
      )
    : null;
  const statusWeek = `${
    weekNumber !== null ? `第 ${weekNumber} 周 · ` : ""
  }${DAY_LABELS[(now.day() + 6) % 7]}`;
  const recentExperiences = [...(experiences?.experiences ?? [])]
    .sort((a, b) =>
      (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt),
    )
    .slice(0, 3)
    .map((item) => ({
      id: item.id,
      title: item.title,
      meta: [
        experienceKindLabel(item.kind, item.kindLabel),
        item.start ? item.start.slice(0, 7) : null,
      ]
        .filter(Boolean)
        .join(" · "),
    }));
  const sidebarScope = profile
    ? `${profile.grade || "年级未填"} · ${
        profile.major || "专业未填"
      } · ${GOAL_LABELS[profile.goal]}`
    : "未建档 · 去今日建档";
  const weekLine = `本周 ${weekGreenDayCount(
    ledger,
    now,
  )} 天有结果 · 连续 ${streakInfo(ledger, now).days} 天`;

  return (
    <>
      <AppShell
        active={active}
        routeKey={route}
        theme={theme}
        onThemeChange={setTheme}
        hasData={
          timetable !== null ||
          assignments !== null ||
          experiences !== null ||
          profile !== null ||
          ledger.length > 0 ||
          notes.length > 0 ||
          resumeHasContent(resume)
        }
        counts={{
          today: assignmentCount,
          experiences: experiences?.experiences.length ?? 0,
          opportunities: 0,
          toolbox: 0,
        }}
        demoMode={demoMode}
        onClear={handleClear}
        onExport={handleExport}
        onImport={handleImport}
        onHome={() => navigate("landing")}
        onNavigate={(id) => navigate(id)}
        onOpenWindow={openWindow}
        onOpenAgent={() => handleDockModeChange("docked")}
        scope={sidebarScope}
        recents={recentExperiences}
        weekLine={weekLine}
        week={statusWeek}
        dockWidth={dockMode === "docked" ? 360 : dockMode === "collapsed" ? 48 : 0}
        dock={
          <Suspense fallback={null}>
            <AgentPanel
              profile={profile}
              experiences={experiences?.experiences ?? []}
              ledger={ledger}
              notes={notes}
              resume={resume}
              messages={agentMessages}
              raised={route === "resume"}
              dockMode={dockMode}
              onDockModeChange={handleDockModeChange}
              onMessagesChange={handleAgentMessages}
              onSaveProfile={handleAgentSaveProfile}
              onSaveExperience={handleAgentSaveExperience}
              onAddNote={handleAddNote}
              onNavigate={(id) => navigate(id)}
            />
          </Suspense>
        }
      >
        <Suspense fallback={<PageLoading />}>
          {loading ? (
            <LoadingState module={route} />
          ) : route === "today" ? (
          <TodayPage
            timetable={timetable}
            assignments={assignments}
            experiences={experiences}
            profile={profile}
            ledger={ledger}
            notes={notes}
            onOnboard={handleOnboard}
            onToggleAssignment={handleToggleAssignment}
            onAddNote={handleAddNote}
            onUseSample={() => handleUseSample()}
            demoMode={demoMode}
            onOpenWindow={openWindow}
            onExitDemo={() => void handleExitDemo()}
          />
        ) : route === "assignments" ? (
          <AssignmentsPage data={assignments} onSave={handleSaveAssignments} />
        ) : route === "experiences" ? (
          <ExperiencesPage data={experiences} onSave={handleSaveExperiences} />
        ) : route === "resume" ? (
          <ResumePage
            experiences={experiences}
            resume={resume}
            onSaveResume={handleSaveResume}
            onNavigateExperiences={() => navigate("experiences")}
            onNavigateOpportunities={() => navigate("opportunities")}
          />
        ) : route === "opportunities" ? (
          <OpportunitiesPage
            experiences={experiences}
            resume={resume}
            onNavigateResume={() => navigate("resume")}
            onNavigateExperiences={() => navigate("experiences")}
            onUseSample={() => handleUseSample("opportunities")}
          />
        ) : route === "toolbox" ? (
          <ToolboxPage
            calendarCount={CALENDAR_ITEMS.length}
            calendarUpdatedAt={CALENDAR_UPDATED_AT}
            onNavigate={(id) => openWindow(id)}
          />
        ) : route === "calendar" ? (
          <CalendarPage
            items={CALENDAR_ITEMS}
            updatedAt={CALENDAR_UPDATED_AT}
            issue={CALENDAR_ISSUE}
            onNavigate={(id) => navigate(id)}
          />
          ) : (
            <TimetablePage
              data={timetable}
              onSave={handleSaveTimetable}
              onUseSample={handleUseSampleTimetable}
            />
          )}
        </Suspense>
      </AppShell>

      {openWindows.includes("timetable") && (
        <Suspense
          fallback={
            <WindowLoading title="课表" onClose={() => closeWindow("timetable")} />
          }
        >
          <WindowLayer
            id="timetable"
            title="课表"
            subtitle="工具箱 · 导入与周视图"
            width={880}
            height={760}
            onClose={() => closeWindow("timetable")}
          >
            <TimetablePage
              data={timetable}
              onSave={handleSaveTimetable}
              onUseSample={handleUseSampleTimetable}
            />
          </WindowLayer>
        </Suspense>
      )}

      {openWindows.includes("assignments") && (
        <Suspense
          fallback={
            <WindowLoading
              title="作业"
              onClose={() => closeWindow("assignments")}
            />
          }
        >
          <WindowLayer
            id="assignments"
            title="作业"
            subtitle="粘贴、截图或手动添加"
            width={640}
            height={720}
            onClose={() => closeWindow("assignments")}
          >
            <AssignmentsPage
              data={assignments}
              onSave={handleSaveAssignments}
            />
          </WindowLayer>
        </Suspense>
      )}

      {openWindows.includes("experiences") && (
        <Suspense
          fallback={
            <WindowLoading
              title="账本"
              onClose={() => closeWindow("experiences")}
            />
          }
        >
          <WindowLayer
            id="experiences"
            title="账本"
            subtitle="战绩 · 证据 · 时间线"
            width={1080}
            height={800}
            onClose={() => closeWindow("experiences")}
          >
            <ExperiencesPage
              data={experiences}
              onSave={handleSaveExperiences}
            />
          </WindowLayer>
        </Suspense>
      )}

      {openWindows.includes("opportunities") && (
        <Suspense
          fallback={
            <WindowLoading
              title="悬赏"
              onClose={() => closeWindow("opportunities")}
            />
          }
        >
          <WindowLayer
            id="opportunities"
            title="悬赏"
            subtitle="岗位入口 · 匹配与缺口"
            width={1120}
            height={820}
            onClose={() => closeWindow("opportunities")}
          >
            <OpportunitiesPage
              experiences={experiences}
              resume={resume}
              onNavigateResume={() => openWindow("resume")}
              onNavigateExperiences={() => openWindow("experiences")}
              onUseSample={async () => {
                await seedDemoData();
              }}
            />
          </WindowLayer>
        </Suspense>
      )}

      {openWindows.includes("resume") && (
        <Suspense
          fallback={
            <WindowLoading
              title="简历"
              onClose={() => closeWindow("resume")}
            />
          }
        >
          <WindowLayer
            id="resume"
            title="简历"
            subtitle="勾选经历 · A4 打印"
            width={1180}
            height={860}
            printable
            onClose={() => closeWindow("resume")}
          >
            <ResumePage
              experiences={experiences}
              resume={resume}
              onSaveResume={handleSaveResume}
              onNavigateExperiences={() => openWindow("experiences")}
              onNavigateOpportunities={() => openWindow("opportunities")}
            />
          </WindowLayer>
        </Suspense>
      )}

      {openWindows.includes("calendar") && (
        <Suspense
          fallback={
            <WindowLoading
              title="日历"
              onClose={() => closeWindow("calendar")}
            />
          }
        >
          <WindowLayer
            id="calendar"
            title="日历"
            subtitle="竞赛 · 考试 · 校内节点"
            width={960}
            height={780}
            onClose={() => closeWindow("calendar")}
          >
            <CalendarPage
              items={CALENDAR_ITEMS}
              updatedAt={CALENDAR_UPDATED_AT}
              issue={CALENDAR_ISSUE}
              onNavigate={(id) => {
                closeWindow("calendar");
                navigate(id);
              }}
            />
          </WindowLayer>
        </Suspense>
      )}

      {ritualOverlay}
    </>
  );
}

function PageLoading() {
  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-3xl">
        <p className="font-mono text-micro tracking-[0.2em] text-ink-3">
          正在打开
        </p>
        <p
          role="status"
          className="mt-3 flex items-center gap-2 text-sm text-ink-3"
        >
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber" />
          正在载入这一页…
        </p>
      </div>
    </div>
  );
}

function WindowLoading({
  title,
  onClose,
}: {
  title: string;
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-label={title}
      className="no-print border-rule bg-surface fixed top-16 left-1/2 z-[70] w-[min(92vw,560px)] -translate-x-1/2 rounded-xl border p-5 shadow-2xl"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">{title}</p>
        <button
          type="button"
          onClick={onClose}
          aria-label={`关闭${title}`}
          className="hover:bg-ink/[0.05] inline-flex h-11 w-11 items-center justify-center rounded-lg text-lg text-ink-3"
        >
          ×
        </button>
      </div>
      <p className="mt-2 font-mono text-micro text-ink-3">正在打开…</p>
    </div>
  );
}

function LoadingState({ module }: { module: ModuleRoute }) {
  const meta = {
    today: { code: "今日 / 01", title: "今天" },
    timetable: { code: "工具箱 · 课表 / 04", title: "课表" },
    assignments: { code: "工具箱 · 作业 / 04", title: "作业与待办" },
    experiences: { code: "账本 / 02", title: "经历库" },
    resume: { code: "工具箱 · 简历 / 04", title: "简历工作台" },
    opportunities: { code: "悬赏 / 03", title: "机会仪表盘" },
    toolbox: { code: "工具箱 / 04", title: "工具箱" },
    calendar: { code: "工具箱 · 日历 / 04", title: "日历" },
  }[module];
  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <div className="mx-auto w-full max-w-3xl">
        <p className="font-mono text-micro tracking-[0.2em] text-ink-3">
          {meta.code}
        </p>
        <h1 className="mt-2 font-serif text-2xl tracking-tight sm:text-3xl">
          {meta.title}
        </h1>
        <p
          role="status"
          className="mt-3 flex items-center gap-2 text-sm text-ink-3"
        >
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber" />
          正在读取本机数据…
        </p>
      </div>
    </div>
  );
}
