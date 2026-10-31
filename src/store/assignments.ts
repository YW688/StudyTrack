import { get, set } from "idb-keyval";
import { z } from "zod";
import type { AssignmentData } from "../types";

export const ASSIGNMENTS_KEY = "studytrack:v1:assignments";

const assignmentSchema = z.object({
  id: z.string().min(1),
  courseId: z.string().optional(),
  courseName: z.string().optional(),
  title: z.string().min(1),
  detail: z.string().optional(),
  due: z.string().nullable(),
  status: z.enum(["todo", "doing", "done"]),
  kind: z.enum(["homework", "contest", "internship", "other"]),
  source: z.enum(["ocr", "paste", "manual", "sample"]),
  confidence: z.enum(["high", "low"]),
  createdAt: z.string(),
});

export const assignmentDataSchema = z.object({
  items: z.array(assignmentSchema),
  updatedAt: z.string(),
  sourceLabel: z.string().optional(),
});

export async function loadAssignments(): Promise<AssignmentData | null> {
  try {
    const value = await get(ASSIGNMENTS_KEY);
    if (!value) return null;
    const parsed = assignmentDataSchema.safeParse(value);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function saveAssignments(data: AssignmentData): Promise<void> {
  await set(ASSIGNMENTS_KEY, assignmentDataSchema.parse(data));
}
