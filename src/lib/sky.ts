import dayjs, { type Dayjs } from "dayjs";
import {
  LEDGER_EVENT_LABELS,
  type LedgerEvent,
  type LedgerEventType,
} from "../types";
import { isGreenEvent, studyDateKey } from "./ledger";

export interface SkyEvent {
  id: string;
  type: LedgerEventType;
  typeLabel: string;
  title: string;
  detail: string;
}

export interface SkyStar {
  key: string;
  label: string;
  month: number;
  day: number;
  count: number;
  isToday: boolean;
  seed: number;
  eventType: LedgerEventType;
  events: SkyEvent[];
}

export interface SkyModel {
  stars: SkyStar[];
  totalEvents: number;
  todayKey: string;
}

export function buildSky(
  ledger: LedgerEvent[],
  now: Dayjs = dayjs(),
): SkyModel {
  const todayKey = studyDateKey(now);
  const byDay = new Map<string, LedgerEvent[]>();
  for (const event of ledger) {
    if (!isGreenEvent(event)) continue;
    const list = byDay.get(event.date);
    if (list) list.push(event);
    else byDay.set(event.date, [event]);
  }

  const stars = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, dayEvents]) => {
      const sorted = [...dayEvents].sort((a, b) =>
        a.createdAt.localeCompare(b.createdAt),
      );
      const date = dayjs(key);
      return {
        key,
        label: `${date.month() + 1}月${date.date()}日`,
        month: date.month() + 1,
        day: date.date(),
        count: sorted.length,
        isToday: key === todayKey,
        seed: hashString(key),
        eventType: sorted[0].type,
        events: sorted.map((event) => ({
          id: event.id,
          type: event.type,
          typeLabel: LEDGER_EVENT_LABELS[event.type],
          title: event.title,
          detail: event.detail ?? "",
        })),
      };
    });

  return {
    stars,
    totalEvents: stars.reduce((sum, star) => sum + star.count, 0),
    todayKey,
  };
}

export function hashString(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/* 分格播种：同一天的星位置稳定，不同天分散开，避免堆在中心 */
export function starPoint(
  seed: number,
  width: number,
  height: number,
): { x: number; y: number } {
  const random = seededRandom(seed);
  const columns = 7;
  const rows = 5;
  const column = seed % columns;
  const row = Math.floor(seed / columns) % rows;
  const x = ((column + 0.16 + random() * 0.68) / columns) * width;
  const y =
    (0.09 + ((row + 0.16 + random() * 0.68) / rows) * 0.7) * height;
  return { x, y };
}

export const SKY_TYPE_COLORS: Record<LedgerEventType, string> = {
  assignment_done: "#cfe2ff",
  experience_added: "#ffe7c2",
  experience_updated: "#f4d7b0",
  evidence_added: "#bfe8d9",
  note_added: "#f2d49a",
  resume_generated: "#dfc6ff",
  match_run: "#c9d6e8",
};
