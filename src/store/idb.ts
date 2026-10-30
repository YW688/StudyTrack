import { del, get, set } from "idb-keyval";
import { z } from "zod";
import type { TimetableData } from "../types";
import { ASSIGNMENTS_KEY } from "./assignments";
import { EXPERIENCES_KEY } from "./experiences";

const KEY = "studytrack:v1:timetable";

const sessionSchema = z.object({
  day: z.number().int().min(1).max(7),
  startPeriod: z.number().int().min(1).max(20),
  endPeriod: z.number().int().min(1).max(20),
  weeks: z.array(z.number().int().min(1).max(40)),
});

const courseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  teacher: z.string().optional(),
  location: z.string().optional(),
  sessions: z.array(sessionSchema),
  color: z.string().optional(),
  confidence: z.enum(["high", "low"]),
  source: z.enum(["excel", "sample", "manual"]),
});

const timetableSchema = z.object({
  courses: z.array(courseSchema),
  semester: z.object({
    name: z.string().optional(),
    startDate: z.string().optional(),
    totalWeeks: z.number().int().min(1).max(40),
  }),
  updatedAt: z.string(),
  sourceLabel: z.string().optional(),
});

export async function loadTimetable(): Promise<TimetableData | null> {
  try {
    const value = await get(KEY);
    if (!value) return null;
    const parsed = timetableSchema.safeParse(value);
    return parsed.success ? (parsed.data as TimetableData) : null;
  } catch {
    return null;
  }
}

export async function saveTimetable(data: TimetableData): Promise<void> {
  await set(KEY, timetableSchema.parse(data));
}

export async function clearLocalData(): Promise<void> {
  await del(KEY);
  await del(ASSIGNMENTS_KEY);
  await del(EXPERIENCES_KEY);
}
