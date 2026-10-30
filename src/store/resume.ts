import { get, set } from "idb-keyval";
import { z } from "zod";
import type {
  ResumeBasics,
  ResumeBullet,
  ResumeBulletCache,
  ResumeData,
  ResumeSnapshot,
} from "../types";
import { experienceSchema } from "./experiences";

export const RESUME_KEY = "studytrack:v1:resume";
export const RESUME_SNAPSHOTS_KEY = "studytrack:v1:resume-snapshots";
export const MAX_RESUME_SNAPSHOTS = 20;

const basicsSchema = z.object({
  name: z.string().max(40),
  grade: z.string().max(20),
  major: z.string().max(60),
  school: z.string().max(80),
  city: z.string().max(40),
  phone: z.string().max(40),
  email: z.string().max(80),
  target: z.string().max(80),
});

const bulletSchema = z.object({
  id: z.string().min(1).max(80),
  text: z.string().min(1).max(200),
  evidence: z.array(z.string().max(500)).max(8),
  source: z.enum(["ai", "local"]),
});

const bulletCacheSchema = z.object({
  experienceId: z.string().min(1),
  bullets: z.array(bulletSchema).max(6),
  source: z.enum(["ai", "local"]),
  status: z.enum(["ready", "fallback"]),
  generatedAt: z.string(),
  hiddenCount: z.number().int().min(0).max(20).optional(),
  note: z.string().max(200).optional(),
});

const resumeSchema = z.object({
  basics: basicsSchema,
  selectedExperienceIds: z.array(z.string()).max(60),
  conciseIds: z.array(z.string()).max(60),
  bullets: z.record(z.string(), bulletCacheSchema),
  updatedAt: z.string(),
});

const snapshotSchema = z.object({
  id: z.string().min(1),
  version: z.number().int().min(1),
  createdAt: z.string(),
  basics: basicsSchema,
  selectedExperienceIds: z.array(z.string()).max(60),
  conciseIds: z.array(z.string()).max(60),
  bulletsSnapshot: z.record(z.string(), z.array(bulletSchema).max(6)),
  experiences: z.array(experienceSchema).max(20),
});

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `resume-snapshot-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function loadResume(): Promise<ResumeData | null> {
  try {
    const value = await get(RESUME_KEY);
    if (!value) return null;
    const parsed = resumeSchema.safeParse(value);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function saveResume(data: ResumeData): Promise<void> {
  await set(RESUME_KEY, resumeSchema.parse(data));
}

export async function loadSnapshots(): Promise<ResumeSnapshot[]> {
  try {
    const value = await get(RESUME_SNAPSHOTS_KEY);
    if (!value) return [];
    const parsed = z.array(snapshotSchema).safeParse(value);
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

export async function saveSnapshots(list: ResumeSnapshot[]): Promise<void> {
  await set(
    RESUME_SNAPSHOTS_KEY,
    z.array(snapshotSchema).parse(list.slice(0, MAX_RESUME_SNAPSHOTS)),
  );
}

export async function addResumeSnapshot(
  input: Omit<ResumeSnapshot, "id" | "version" | "createdAt">,
): Promise<{ snapshot: ResumeSnapshot; snapshots: ResumeSnapshot[] }> {
  const existing = await loadSnapshots();
  const version =
    existing.reduce((max, item) => Math.max(max, item.version), 0) + 1;
  const snapshot: ResumeSnapshot = {
    ...input,
    id: makeId(),
    version,
    createdAt: new Date().toISOString(),
  };
  const snapshots = [snapshot, ...existing].slice(0, MAX_RESUME_SNAPSHOTS);
  await saveSnapshots(snapshots);
  return { snapshot, snapshots };
}

export function emptyBasics(): ResumeBasics {
  return {
    name: "",
    grade: "",
    major: "",
    school: "",
    city: "",
    phone: "",
    email: "",
    target: "",
  };
}

export function createEmptyResume(): ResumeData {
  return {
    basics: emptyBasics(),
    selectedExperienceIds: [],
    conciseIds: [],
    bullets: {},
    updatedAt: new Date().toISOString(),
  };
}

export function snapshotBullets(
  snapshot: ResumeSnapshot,
  experienceId: string,
): ResumeBullet[] {
  return snapshot.bulletsSnapshot[experienceId] ?? [];
}

export function toBulletCache(
  snapshot: ResumeSnapshot,
  experienceId: string,
): ResumeBulletCache | undefined {
  const bullets = snapshotBullets(snapshot, experienceId);
  if (bullets.length === 0) return undefined;
  return {
    experienceId,
    bullets,
    source: bullets.some((bullet) => bullet.source === "ai") ? "ai" : "local",
    status: "ready",
    generatedAt: snapshot.createdAt,
  };
}
