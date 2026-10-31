import { get, set } from "idb-keyval";
import { z } from "zod";
import {
  NOTE_SOURCES,
  NOTE_STATUSES,
  type Confidence,
  type Note,
  type NoteSource,
} from "../types";
import { newId } from "../lib/id";

export const NOTES_KEY = "studytrack:v1:notes";

export const noteSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1).max(1000),
  createdAt: z.string(),
  source: z.enum(NOTE_SOURCES),
  status: z.enum(NOTE_STATUSES),
  linkedExperienceId: z.string().optional(),
  tags: z.array(z.string().max(30)).max(20),
  confidence: z.enum(["high", "low"]),
});

const notesSchema = z.array(noteSchema).max(2000);

export async function loadNotes(): Promise<Note[]> {
  try {
    const value = await get(NOTES_KEY);
    if (!value) return [];
    const parsed = notesSchema.safeParse(value);
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

export async function saveNotes(notes: Note[]): Promise<void> {
  await set(NOTES_KEY, notesSchema.parse(notes.slice(-2000)));
}

export interface NewNoteInput {
  text: string;
  source?: NoteSource;
  confidence?: Confidence;
  tags?: string[];
  linkedExperienceId?: string;
}

export function createNote(input: NewNoteInput): Note {
  return {
    id: newId("note"),
    text: input.text.trim(),
    createdAt: new Date().toISOString(),
    source: input.source ?? "text",
    status: "inbox",
    linkedExperienceId: input.linkedExperienceId,
    tags: input.tags ?? [],
    confidence: input.confidence ?? "high",
  };
}
