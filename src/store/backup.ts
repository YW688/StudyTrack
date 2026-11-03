import { del } from "idb-keyval";
import { z } from "zod";
import type {
  AgentMessage,
  AssignmentData,
  ExperienceData,
  LedgerEvent,
  Note,
  Profile,
  ResumeData,
  ResumeSnapshot,
  TimetableData,
} from "../types";
import {
  RESUME_KEY,
  RESUME_SNAPSHOTS_KEY,
  loadResume,
  loadSnapshots,
  saveResume,
  saveSnapshots,
  resumeSchema,
  snapshotSchema,
} from "./resume";
import {
  ASSIGNMENTS_KEY,
  loadAssignments,
  saveAssignments,
  assignmentDataSchema,
} from "./assignments";
import {
  EXPERIENCES_KEY,
  loadExperiences,
  saveExperiences,
  experienceDataSchema,
} from "./experiences";
import {
  TIMETABLE_KEY,
  loadTimetable,
  saveTimetable,
  timetableSchema,
} from "./idb";
import {
  PROFILE_KEY,
  loadProfile,
  saveProfile,
  profileSchema,
} from "./profile";
import {
  LEDGER_KEY,
  loadLedger,
  saveLedger,
  ledgerEventSchema,
} from "./ledger";
import {
  NOTES_KEY,
  loadNotes,
  saveNotes,
  noteSchema,
} from "./notes";
import {
  AGENT_KEY,
  loadAgentMessages,
  saveAgentMessages,
  agentMessageSchema,
} from "./agent";
import {
  AVATAR_KEY,
  loadAvatar,
  saveAvatar,
  avatarSchema,
} from "./avatar";

export const BACKUP_APP = "studytrack";
export const BACKUP_VERSION = 1;

const backupSchema = z.object({
  app: z.literal(BACKUP_APP),
  version: z.literal(BACKUP_VERSION),
  exportedAt: z.string(),
  profile: profileSchema.nullable().optional(),
  timetable: timetableSchema.nullable().optional(),
  assignments: assignmentDataSchema.nullable().optional(),
  experiences: experienceDataSchema.nullable().optional(),
  resume: resumeSchema.nullable().optional(),
  snapshots: z.array(snapshotSchema).optional(),
  ledger: z.array(ledgerEventSchema).optional(),
  notes: z.array(noteSchema).optional(),
  agentMessages: z.array(agentMessageSchema).optional(),
  avatar: avatarSchema.nullable().optional(),
});

export type BackupFile = z.infer<typeof backupSchema>;

export interface BackupSnapshot {
  profile: Profile | null;
  timetable: TimetableData | null;
  assignments: AssignmentData | null;
  experiences: ExperienceData | null;
  resume: ResumeData | null;
  snapshots: ResumeSnapshot[];
  ledger: LedgerEvent[];
  notes: Note[];
  agentMessages: AgentMessage[];
  avatar: string | null;
}

export async function collectBackup(): Promise<BackupFile> {
  const [
    profile,
    timetable,
    assignments,
    experiences,
    resume,
    snapshots,
    ledger,
    notes,
    agentMessages,
    avatar,
  ] = await Promise.all([
    loadProfile(),
    loadTimetable(),
    loadAssignments(),
    loadExperiences(),
    loadResume(),
    loadSnapshots(),
    loadLedger(),
    loadNotes(),
    loadAgentMessages(),
    loadAvatar(),
  ]);

  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    profile,
    timetable,
    assignments,
    experiences,
    resume,
    snapshots,
    ledger,
    notes,
    agentMessages,
    avatar,
  };
}

export type ParseBackupResult =
  | { ok: true; backup: BackupFile }
  | { ok: false; message: string };

export function parseBackupText(text: string): ParseBackupResult {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return {
      ok: false,
      message: "文件不是有效的 JSON 请选择学径导出的备份文件",
    };
  }

  const parsed = backupSchema.safeParse(value);
  if (!parsed.success) {
    return {
      ok: false,
      message: "备份结构校验失败 未写入任何数据",
    };
  }
  return { ok: true, backup: parsed.data };
}

export async function applyBackup(
  backup: BackupFile,
): Promise<BackupSnapshot> {
  await Promise.all([
    backup.profile
      ? saveProfile(backup.profile)
      : del(PROFILE_KEY),
    backup.timetable
      ? saveTimetable(backup.timetable)
      : del(TIMETABLE_KEY),
    backup.assignments
      ? saveAssignments(backup.assignments)
      : del(ASSIGNMENTS_KEY),
    backup.experiences
      ? saveExperiences(backup.experiences)
      : del(EXPERIENCES_KEY),
    backup.resume ? saveResume(backup.resume) : del(RESUME_KEY),
    backup.snapshots
      ? saveSnapshots(backup.snapshots)
      : del(RESUME_SNAPSHOTS_KEY),
    backup.ledger ? saveLedger(backup.ledger) : del(LEDGER_KEY),
    backup.notes ? saveNotes(backup.notes) : del(NOTES_KEY),
    backup.agentMessages
      ? saveAgentMessages(backup.agentMessages)
      : del(AGENT_KEY),
    backup.avatar ? saveAvatar(backup.avatar) : del(AVATAR_KEY),
  ]);

  return {
    profile: backup.profile ?? null,
    timetable: backup.timetable ?? null,
    assignments: backup.assignments ?? null,
    experiences: backup.experiences ?? null,
    resume: backup.resume ?? null,
    snapshots: backup.snapshots ?? [],
    ledger: backup.ledger ?? [],
    notes: backup.notes ?? [],
    agentMessages: backup.agentMessages ?? [],
    avatar: backup.avatar ?? null,
  };
}
