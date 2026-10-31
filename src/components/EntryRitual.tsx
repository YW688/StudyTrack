import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import BrandMark from "./BrandMark";

export type RitualTheme = "dawn" | "sprout" | "sunset";

const POEM_LINES = ["书山有路勤为径", "学海无涯苦作舟"];
const POEM_MS = 2200;
const MARK_HOLD_MS = 1500;
const FLY_MS = 800;
const REVEAL_MS = 420;
const POEM_CHAR_START = 0.3;
const POEM_CHAR_STEP = 0.04;
const POEM_LINE_STEP = 0.08;

type Phase = "poem" | "mark" | "handoff" | "exit";

interface EntryRitualProps {
  theme: RitualTheme;
  ready: boolean;
  onDone: () => void;
}

export default function EntryRitual({
  theme,
  ready,
  onDone,
}: EntryRitualProps) {
  const [phase, setPhase] = useState<Phase>("poem");
  const [flight, setFlight] = useState<CSSProperties | null>(null);
  const markRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef(false);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  }, [onDone]);

  const skip = useCallback(() => {
    if (doneRef.current) return;
    if (ready) {
      setPhase((current) =>
        current === "poem" || current === "mark" ? "handoff" : current,
      );
      return;
    }
    setPhase("exit");
  }, [ready]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPhase((current) => (current === "poem" ? "mark" : current));
    }, POEM_MS);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (phase !== "mark" || !ready) return;
    const timer = window.setTimeout(() => setPhase("handoff"), MARK_HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [phase, ready]);

  useEffect(() => {
    if (phase !== "handoff") return;
    let frame = 0;
    let landedTimer = 0;
    const startedAt = performance.now();

    const fly = () => {
      const mark = markRef.current;
      const target = document.querySelector<HTMLElement>("[data-brand-mark]");
      if (!mark || !target) {
        if (performance.now() - startedAt < 1500) {
          frame = window.requestAnimationFrame(fly);
        } else {
          setPhase("exit");
        }
        return;
      }
      const from = mark.getBoundingClientRect();
      const to = target.getBoundingClientRect();
      const scale = to.width / from.width;
      setFlight({
        transform: `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${scale})`,
        transition: `transform ${FLY_MS}ms cubic-bezier(0.22, 0.7, 0.2, 1), opacity 160ms ease`,
      });
      landedTimer = window.setTimeout(() => setPhase("exit"), FLY_MS);
    };

    frame = window.requestAnimationFrame(fly);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(landedTimer);
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== "exit") return;
    const timer = window.setTimeout(finish, REVEAL_MS);
    return () => window.clearTimeout(timer);
  }, [phase, finish]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") skip();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [skip]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  return (
    <div
      className="entry-ritual"
      data-theme={theme}
      data-phase={phase}
      role="presentation"
      onPointerDown={skip}
    >
      <div className="entry-ritual__mist" aria-hidden="true">
        <span className="entry-ritual__plume entry-ritual__plume--a" />
        <span className="entry-ritual__plume entry-ritual__plume--b" />
      </div>
      <div className="entry-ritual__grain" aria-hidden="true" />

      <div className="entry-ritual__poem" aria-hidden="true">
        {POEM_LINES.map((line, lineIndex) => (
          <p key={line}>
            {line.split("").map((char, charIndex) => (
              <span
                key={`${lineIndex}-${charIndex}`}
                style={{
                  animationDelay: `${
                    POEM_CHAR_START +
                    lineIndex * POEM_LINE_STEP +
                    charIndex * POEM_CHAR_STEP
                  }s`,
                }}
              >
                {char}
              </span>
            ))}
          </p>
        ))}
      </div>

      <div className="entry-ritual__mark-wrap">
        <div
          ref={markRef}
          className="entry-ritual__mark"
          style={flight ?? undefined}
          aria-hidden="true"
        >
          <span className="entry-ritual__logo-bob">
            <span className="entry-ritual__logo-in">
              <BrandMark className="entry-ritual__logo" />
            </span>
          </span>
        </div>
        <span className="entry-ritual__caption" aria-hidden="true">
          记录大学的点点滴滴
        </span>
      </div>

      <button
        type="button"
        className="entry-ritual__skip"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={skip}
      >
        跳过
      </button>
    </div>
  );
}
