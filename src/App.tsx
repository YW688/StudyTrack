import { useCallback, useEffect, useState } from "react";
import type { AssignmentData, TimetableData } from "./types";
import AppShell from "./components/AppShell";
import LandingPage from "./pages/landing/LandingPage";
import TimetablePage from "./pages/timetable/TimetablePage";
import AssignmentsPage from "./pages/assignments/AssignmentsPage";
import { clearLocalData, loadTimetable, saveTimetable } from "./store/idb";
import {
  loadAssignments,
  saveAssignments,
} from "./store/assignments";
import { createSampleTimetable } from "./store/fixtures/timetable";
import { createSampleAssignments } from "./store/fixtures/assignments";

type Route = "landing" | "timetable" | "assignments";

function readRoute(): Route {
  const hash = window.location.hash.replace(/^#\/?/, "");
  if (hash === "timetable") return "timetable";
  if (hash === "assignments") return "assignments";
  return "landing";
}

export default function App() {
  const [route, setRoute] = useState<Route>(readRoute);
  const [timetable, setTimetable] = useState<TimetableData | null>(null);
  const [assignments, setAssignments] = useState<AssignmentData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    void Promise.all([loadTimetable(), loadAssignments()]).then(
      ([storedTimetable, storedAssignments]) => {
        if (!alive) return;
        setTimetable(storedTimetable);
        setAssignments(storedAssignments);
        setLoading(false);
      },
    );
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
    const hash =
      next === "timetable"
        ? "#/timetable"
        : next === "assignments"
          ? "#/assignments"
          : "#/";
    if (window.location.hash !== hash) {
      window.history.pushState(null, "", hash);
    }
    setRoute(next);
    window.scrollTo({ top: 0 });
  }, []);

  async function handleStart() {
    const [storedTimetable, storedAssignments] = await Promise.all([
      timetable ?? loadTimetable(),
      assignments ?? loadAssignments(),
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

    setTimetable(nextTimetable);
    setAssignments(nextAssignments);
    navigate("timetable");
  }

  async function handleSaveTimetable(next: TimetableData) {
    await saveTimetable(next);
    setTimetable(next);
  }

  async function handleSaveAssignments(next: AssignmentData) {
    await saveAssignments(next);
    setAssignments(next);
  }

  async function handleUseSampleTimetable() {
    const sample = createSampleTimetable();
    await saveTimetable(sample);
    setTimetable(sample);
  }

  async function handleClear() {
    await clearLocalData();
    setTimetable(null);
    setAssignments(null);
  }

  if (route === "landing") {
    return <LandingPage onStart={handleStart} />;
  }

  const active = route === "assignments" ? "assignments" : "timetable";
  const assignmentCount =
    assignments?.items.filter((item) => item.status !== "done").length ?? 0;

  return (
    <AppShell
      active={active}
      hasData={timetable !== null || assignments !== null}
      assignmentCount={assignmentCount}
      onClear={handleClear}
      onHome={() => navigate("landing")}
      onNavigate={(id) => {
        if (id === "timetable" || id === "assignments") navigate(id);
      }}
    >
      {loading ? (
        <LoadingState module={active} />
      ) : route === "assignments" ? (
        <AssignmentsPage data={assignments} onSave={handleSaveAssignments} />
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

function LoadingState({ module }: { module: "timetable" | "assignments" }) {
  const isAssignments = module === "assignments";
  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <div className="mx-auto w-full max-w-3xl">
        <p className="font-mono text-[10px] tracking-[0.2em] text-ink/40">
          {isAssignments ? "M1 · 作业 / 03" : "M1 · 课表 / 02"}
        </p>
        <h1 className="mt-2 font-serif text-2xl tracking-tight sm:text-3xl">
          {isAssignments ? "作业与待办" : "课表"}
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
