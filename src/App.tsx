import { useCallback, useEffect, useState } from "react";
import type { TimetableData } from "./types";
import AppShell from "./components/AppShell";
import LandingPage from "./pages/landing/LandingPage";
import TimetablePage from "./pages/timetable/TimetablePage";
import { clearLocalData, loadTimetable, saveTimetable } from "./store/idb";
import { createSampleTimetable } from "./store/fixtures/timetable";

type Route = "landing" | "timetable";

function readRoute(): Route {
  return window.location.hash.replace(/^#\/?/, "") === "timetable"
    ? "timetable"
    : "landing";
}

export default function App() {
  const [route, setRoute] = useState<Route>(readRoute);
  const [data, setData] = useState<TimetableData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    void loadTimetable().then((stored) => {
      if (!alive) return;
      setData(stored);
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
    const hash = next === "timetable" ? "#/timetable" : "#/";
    if (window.location.hash !== hash) {
      window.history.pushState(null, "", hash);
    }
    setRoute(next);
    window.scrollTo({ top: 0 });
  }, []);

  async function handleStart() {
    const stored = data ?? (await loadTimetable());
    if (stored) {
      setData(stored);
    } else {
      const sample = createSampleTimetable();
      await saveTimetable(sample);
      setData(sample);
    }
    navigate("timetable");
  }

  async function handleSave(next: TimetableData) {
    await saveTimetable(next);
    setData(next);
  }

  async function handleUseSample() {
    const sample = createSampleTimetable();
    await saveTimetable(sample);
    setData(sample);
  }

  async function handleClear() {
    await clearLocalData();
    setData(null);
  }

  if (route === "landing") {
    return <LandingPage onStart={handleStart} />;
  }

  return (
    <AppShell
      active="timetable"
      hasData={data !== null}
      onClear={handleClear}
      onHome={() => navigate("landing")}
    >
      {loading ? (
        <LoadingState />
      ) : (
        <TimetablePage
          data={data}
          onSave={handleSave}
          onUseSample={handleUseSample}
        />
      )}
    </AppShell>
  );
}

function LoadingState() {
  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <div className="mx-auto w-full max-w-3xl">
        <p className="font-mono text-[10px] tracking-[0.2em] text-ink/40">
          M1 · 课表 / 02
        </p>
        <h1 className="mt-2 font-serif text-2xl tracking-tight sm:text-3xl">
          课表
        </h1>
        <p
          role="status"
          className="mt-3 flex items-center gap-2 text-sm text-ink/55"
        >
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber" />
          正在读取本机课表…
        </p>
      </div>
    </div>
  );
}
