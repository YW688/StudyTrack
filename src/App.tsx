import { useCallback, useEffect, useState } from "react";
import type {
  AssignmentData,
  ExperienceData,
  TimetableData,
} from "./types";
import AppShell from "./components/AppShell";
import LandingPage from "./pages/landing/LandingPage";
import TodayPage from "./pages/today/TodayPage";
import TimetablePage from "./pages/timetable/TimetablePage";
import AssignmentsPage from "./pages/assignments/AssignmentsPage";
import ExperiencesPage from "./pages/experiences/ExperiencesPage";
import { clearLocalData, loadTimetable, saveTimetable } from "./store/idb";
import {
  loadAssignments,
  saveAssignments,
} from "./store/assignments";
import { loadExperiences, saveExperiences } from "./store/experiences";
import { createSampleTimetable } from "./store/fixtures/timetable";
import { createSampleAssignments } from "./store/fixtures/assignments";
import { createSampleExperiences } from "./store/fixtures/experiences";

type Route =
  | "landing"
  | "today"
  | "timetable"
  | "assignments"
  | "experiences";

function readRoute(): Route {
  const hash = window.location.hash.replace(/^#\/?/, "");
  if (hash === "today") return "today";
  if (hash === "timetable") return "timetable";
  if (hash === "assignments") return "assignments";
  if (hash === "experiences") return "experiences";
  return "landing";
}

export default function App() {
  const [route, setRoute] = useState<Route>(readRoute);
  const [timetable, setTimetable] = useState<TimetableData | null>(null);
  const [assignments, setAssignments] = useState<AssignmentData | null>(null);
  const [experiences, setExperiences] = useState<ExperienceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    void Promise.all([
      loadTimetable(),
      loadAssignments(),
      loadExperiences(),
    ]).then(([storedTimetable, storedAssignments, storedExperiences]) => {
      if (!alive) return;
      setTimetable(storedTimetable);
      setAssignments(storedAssignments);
      setExperiences(storedExperiences);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const sync = () => setRoute(readRoute());
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, []);

  const navigate = useCallback((next: Route) => {
    const hash = next === "landing" ? "#/" : `#/${next}`;
    if (window.location.hash !== hash) {
      window.history.pushState(null, "", hash);
    }
    setRoute(next);
    window.scrollTo({ top: 0 });
  }, []);

  async function handleStart() {
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

  async function handleUseSample() {
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
    if (!nextExperiences) {
      nextExperiences = createSampleExperiences();
      await saveExperiences(nextExperiences);
    }

    setTimetable(nextTimetable);
    setAssignments(nextAssignments);
    setExperiences(nextExperiences);
    navigate("today");
  }

  async function handleClear() {
    await clearLocalData();
    setTimetable(null);
    setAssignments(null);
    setExperiences(null);
  }

  if (route === "landing") {
    return <LandingPage onStart={handleStart} />;
  }

  const active =
    route === "today"
      ? "today"
      : route === "assignments"
        ? "assignments"
        : route === "experiences"
          ? "experiences"
          : "timetable";
  const assignmentCount =
    assignments?.items.filter((item) => item.status !== "done").length ?? 0;

  return (
    <AppShell
      active={active}
      hasData={
        timetable !== null || assignments !== null || experiences !== null
      }
      assignmentCount={assignmentCount}
      onClear={handleClear}
      onHome={() => navigate("landing")}
      onNavigate={(id) => {
        if (
          id === "today" ||
          id === "timetable" ||
          id === "assignments" ||
          id === "experiences"
        ) {
          navigate(id);
        }
      }}
    >
      {loading ? (
        <LoadingState module={active} />
      ) : route === "today" ? (
        <TodayPage
          timetable={timetable}
          assignments={assignments}
          experiences={experiences}
          onSaveAssignments={handleSaveAssignments}
          onUseSample={handleUseSample}
          onNavigate={(id) => navigate(id)}
        />
      ) : route === "assignments" ? (
        <AssignmentsPage data={assignments} onSave={handleSaveAssignments} />
      ) : route === "experiences" ? (
        <ExperiencesPage data={experiences} onSave={handleSaveExperiences} />
      ) : (
        <TimetablePage
          data={timetable}
          onSave={handleSaveTimetable}
          onUseSample={handleUseSampleTimetable}
        />
      )}
    </AppShell>
  );
}

function LoadingState({
  module,
}: {
  module: "today" | "timetable" | "assignments" | "experiences";
}) {
  const meta = {
    today: { code: "M1 · 今日 / 01", title: "今天" },
    timetable: { code: "M1 · 课表 / 02", title: "课表" },
    assignments: { code: "M1 · 作业 / 03", title: "作业与待办" },
    experiences: { code: "M2 · 经历 / 04", title: "经历库" },
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
