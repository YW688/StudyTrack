import { del, get, set } from "idb-keyval";
import { z } from "zod";
import {
  GOALS,
  RESUME_GRADES,
  type Goal,
  type Grade,
  type Profile,
} from "../types";

export const PROFILE_KEY = "studytrack:v1:profile";

export const profileSchema = z.object({
  id: z.literal("me"),
  grade: z.enum(RESUME_GRADES).or(z.literal("")),
  major: z.string().max(60),
  school: z.string().max(80).optional(),
  goal: z.enum(GOALS),
  targetRoles: z.array(z.string().min(1).max(40)).max(20),
  skills: z.array(z.string().min(1).max(40)).max(60),
  interests: z.array(z.string().min(1).max(40)).max(30),
  onboardedAt: z.string().optional(),
  lastExportedAt: z.string().optional(),
  updatedAt: z.string(),
});

export async function loadProfile(): Promise<Profile | null> {
  try {
    const value = await get(PROFILE_KEY);
    if (!value) return null;
    const parsed = profileSchema.safeParse(value);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function saveProfile(profile: Profile): Promise<void> {
  await set(PROFILE_KEY, profileSchema.parse(profile));
}

export async function deleteProfile(): Promise<void> {
  await del(PROFILE_KEY);
}

export interface OnboardingInput {
  grade?: Grade;
  major?: string;
  goal?: Goal;
  school?: string;
}

export function createOnboardedProfile(input: OnboardingInput): Profile {
  const now = new Date().toISOString();
  return {
    id: "me",
    grade: input.grade ?? "",
    major: input.major?.trim() ?? "",
    school: input.school?.trim() || undefined,
    goal: input.goal ?? "undecided",
    targetRoles: [],
    skills: [],
    interests: [],
    onboardedAt: now,
    updatedAt: now,
  };
}

export function isOnboarded(profile: Profile | null): boolean {
  return profile !== null;
}
