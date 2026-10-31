import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AssignmentData,
  ExperienceData,
  ResumeData,
  TimetableData,
} from "./types";
import AppShell from "./components/AppShell";
import EntryRitual, { type RitualTheme } from "./components/EntryRitual";
import LandingPage from "./pages/landing/LandingPage";
import TodayPage from "./pages/today/TodayPage";
import TimetablePage from "./pages/timetable/TimetablePage";
import AssignmentsPage from "./pages/assignments/AssignmentsPage";
import ExperiencesPage from "./pages/experiences/ExperiencesPage";
import ResumePage from "./pages/resume/ResumePage";
import PortfolioPage from "./pages/portfolio/PortfolioPage";
import OpportunitiesPage from "./pages/opportunities/OpportunitiesPage";
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
import { createSampleTimetable } from "./store/fixtures/timetable";
import { createSampleAssignments } from "./store/fixtures/assignments";
import { createSampleExperiences } from "./store/fixtures/experiences";
import { resumeHasContent } from "./lib/resume";

type Route =
  | "landing"
  | "today"
  | "timetable"
  | "assignments"
  | "experiences"
  | "resume"
  | "opportunities"
  | "portfolio";

const LANDING_THEME_KEY = "studytrack:landing-theme";

function readRitualTheme(): RitualTheme {
  try {
    const saved = localStorage.getItem(LANDING_THEME_KEY);
    if (saved === "sprout" || saved === "sunset") return saved;
  } catch {
    /* 主题读不到时按默认霞光处理 */
  }
  return "dawn";
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
  const [loading, setLoading] = useState(true);
  const [ritual, setRitual] = useState<{ theme: RitualTheme } | null>(null);
  const [ritualReady, setRitualReady] = useState(false);
  const resumeWriteRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let alive = true;
    void Promise.all([
      loadTimetable(),
      loadAssignments(),
      loadExperiences(),
      loadResume(),
    ]).then(
      ([storedTimetable, storedAssignments, storedExperiences, storedResume]) => {
        if (!alive) return;
        setTimetable(storedTimetable);
        setAssignments(storedAssignments);
        setExperiences(storedExperiences);
        setResume(storedResume ?? createEmptyResume());
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
    window.scrollTo({ top: 0 });
  }, []);

  const handleSaveResume = useCallback((next: ResumeData) => {
    setResume(next);
    resumeWriteRef.current = resumeWriteRef.current
      .then(() => saveResume(next))
      .catch(() => undefined);
  }, []);

  const dismissRitual = useCallback(() => setRitual(null), []);

  async function handleStart() {
    const playRitual = shouldPlayEntryRitual();
    if (playRitual) {
      setRitualReady(false);
      setRitual({ theme: readRitualTheme() });
    }

    try {
      const [storedTimetable, storedAssignments, storedExperiences] =
        await Promise.all([
          timetable ?? loadTimetable(),
          assignments ?? loadAssignments(),
          experiences ?? loadExperiences(),
        ]);

      let nextTimetable = storedTimetable;
      if (!nextTimetable) {
        nextTimetable = createSampleTimetable();
        await saveTimetable(nextTimetable);
      }

      let nextAssignments = storedAssignments;
      if (!nextAssignments) {
        nextAssignments = createSampleAssignments();
        await saveAssignments(nextAssignments);
      }

      let nextExperiences = storedExperiences;
      if (!nextExperiences) {
        nextExperiences = createSampleExperiences();
        await saveExperiences(nextExperiences);
      }

      setTimetable(nextTimetable);
      setAssignments(nextAssignments);
      setExperiences(nextExperiences);
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

  async function handleUseSampleTimetable() {
    const sample = createSampleTimetable();
    await saveTimetable(sample);
    setTimetable(sample);
  }

  async function handleUseSample(
    destination: "today" | "opportunities" = "today",
  ) {
    let nextTimetable = timetable;
    if (!nextTimetable) {
      nextTimetable = createSampleTimetable();
      await saveTimetable(nextTimetable);
    }

    let nextAssignments = assignments;
    if (!nextAssignments) {
      nextAssignments = createSampleAssignments();
      await saveAssignments(nextAssignments);
    }

    let nextExperiences = experiences;
    if (!nextExperiences || nextExperiences.experiences.length === 0) {
      nextExperiences = createSampleExperiences();
      await saveExperiences(nextExperiences);
    }

    setTimetable(nextTimetable);
    setAssignments(nextAssignments);
    setExperiences(nextExperiences);
    navigate(destination);
  }

  async function handleClear() {
    await resumeWriteRef.current.catch(() => undefined);
    await clearLocalData();
    setTimetable(null);
    setAssignments(null);
    setExperiences(null);
    setResume(createEmptyResume());
    navigate("landing");
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
        <PortfolioPage key={hash} hash={hash} />
        {ritualOverlay}
      </>
    );
  }

  if (route === "landing") {
    return (
      <>
        <LandingPage onStart={handleStart} />
        {ritualOverlay}
      </>
    );
  }

  const active = route;
  const assignmentCount =
    assignments?.items.filter((item) => item.status !== "done").length ?? 0;

  return (
    <>
      <AppShell
        active={active}
        hasData={
          timetable !== null ||
          assignments !== null ||
          experiences !== null ||
          resumeHasContent(resume)
        }
        assignmentCount={assignmentCount}
        onClear={handleClear}
        onHome={() => navigate("landing")}
        onNavigate={(id) => navigate(id)}
      >
        {loading ? (
          <LoadingState module={active} />
        ) : route === "today" ? (
          <TodayPage
            timetable={timetable}
            assignments={assignments}
            experiences={experiences}
            onSaveAssignments={handleSaveAssignments}
            onUseSample={() => handleUseSample()}
            onNavigate={(id) => navigate(id)}
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
        ) : (
          <TimetablePage
            data={timetable}
            onSave={handleSaveTimetable}
            onUseSample={handleUseSampleTimetable}
          />
        )}
      </AppShell>
      {ritualOverlay}
    </>
  );
}

function LoadingState({
  module,
}: {
  module:
    | "today"
    | "timetable"
    | "assignments"
    | "experiences"
    | "resume"
    | "opportunities";
}) {
  const meta = {
    today: { code: "M1 · 今日 / 01", title: "今天" },
    timetable: { code: "M1 · 课表 / 02", title: "课表" },
    assignments: { code: "M1 · 作业 / 03", title: "作业与待办" },
    experiences: { code: "M2 · 经历 / 04", title: "经历库" },
    resume: { code: "M3 · 简历 / 05", title: "简历工作台" },
    opportunities: { code: "M4 · 机会 / 06", title: "机会仪表盘" },
  }[module];
  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <div className="mx-auto w-full max-w-3xl">
        <p className="font-mono text-[10px] tracking-[0.2em] text-ink/40">
          {meta.code}
        </p>
        <h1 className="mt-2 font-serif text-2xl tracking-tight sm:text-3xl">
          {meta.title}
        </h1>
        <p
          role="status"
          className="mt-3 flex items-center gap-2 text-sm text-ink/55"
        >
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber" />
          正在读取本机数据…
        </p>
      </div>
    </div>
  );
}
