import { get, set } from "idb-keyval";
import { z } from "zod";
import type { ExperienceData } from "../types";

export const EXPERIENCES_KEY = "studytrack:v1:experiences";

const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

const metricSchema = z.object({
  label: z.string().min(1).max(40),
  value: z.string().min(1).max(80),
});

const evidenceSchema = z.object({
  label: z.string().min(1).max(60),
  url: z.string().max(500).optional(),
});

const experienceSchema = z.object({
  id: z.string().min(1),
  kind: z.enum([
    "course",
    "contest",
    "research",
    "intern",
    "design",
    "volunteer",
  ]),
  title: z.string().min(1).max(120),
  org: z.string().max(80).optional(),
  start: monthSchema.optional(),
  end: monthSchema.optional(),
  problem: z.string().max(2000),
  method: z.string().max(2000),
  contribution: z.string().max(2000),
  result: z.string().max(2000),
  metrics: z.array(metricSchema).max(20),
  evidence: z.array(evidenceSchema).max(20),
  skills: z.array(z.string().max(40)).max(30),
  tags: z.array(z.string().max(40)).max(30),
  confidence: z.enum(["high", "low"]),
  source: z.enum(["manual", "sample", "ai"]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const experienceDataSchema = z.object({
  experiences: z.array(experienceSchema),
  updatedAt: z.string(),
  sourceLabel: z.string().optional(),
});

export async function loadExperiences(): Promise<ExperienceData | null> {
  try {
    const value = await get(EXPERIENCES_KEY);
    if (!value) return null;
    const parsed = experienceDataSchema.safeParse(value);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function saveExperiences(data: ExperienceData): Promise<void> {
  await set(EXPERIENCES_KEY, experienceDataSchema.parse(data));
}
