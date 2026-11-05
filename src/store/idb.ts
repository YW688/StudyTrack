import { del, get, set } from "idb-keyval";
import { z } from "zod";
import type { TimetableData } from "../types";
import { ASSIGNMENTS_KEY } from "./assignments";
import { EXPERIENCES_KEY } from "./experiences";
import { RESUME_KEY, RESUME_SNAPSHOTS_KEY } from "./resume";
import { PROFILE_KEY } from "./profile";
import { LEDGER_KEY } from "./ledger";
import { NOTES_KEY } from "./notes";
import { AGENT_KEY } from "./agent";
import { AVATAR_KEY } from "./avatar";
import { CUSTOM_JOBS_KEY } from "./customJobs";

export const TIMETABLE_KEY = "studytrack:v1:timetable";

const daySchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
  z.literal(7),
]);

const sessionSchema = z.object({
  day: daySchema,
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

export const timetableSchema = z.object({
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
    const value = await get(TIMETABLE_KEY);
    if (!value) return null;
    const parsed = timetableSchema.safeParse(value);
    return parsed.success ? (parsed.data as TimetableData) : null;
  } catch {
    return null;
  }
}

export async function saveTimetable(data: TimetableData): Promise<void> {
  await set(TIMETABLE_KEY, timetableSchema.parse(data));
}

export async function clearLocalData(): Promise<void> {
  await Promise.all([
    del(TIMETABLE_KEY),
    del(ASSIGNMENTS_KEY),
    del(EXPERIENCES_KEY),
    del(RESUME_KEY),
    del(RESUME_SNAPSHOTS_KEY),
    del(PROFILE_KEY),
    del(LEDGER_KEY),
    del(NOTES_KEY),
    del(AGENT_KEY),
    del(AVATAR_KEY),
    del(CUSTOM_JOBS_KEY),
  ]);
}
