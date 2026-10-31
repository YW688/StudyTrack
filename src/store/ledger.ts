import dayjs, { type Dayjs } from "dayjs";
import { get, set } from "idb-keyval";
import { z } from "zod";
import {
  LEDGER_EVENT_TYPES,
  type LedgerEvent,
  type LedgerEventType,
} from "../types";
import { newId } from "../lib/id";
import { studyDateKey } from "../lib/ledger";

export const LEDGER_KEY = "studytrack:v1:ledger";

export const ledgerEventSchema = z.object({
  id: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.enum(LEDGER_EVENT_TYPES),
  refId: z.string().optional(),
  title: z.string().min(1).max(120),
  detail: z.string().max(300).optional(),
  createdAt: z.string(),
  revokedAt: z.string().optional(),
});

const ledgerSchema = z.array(ledgerEventSchema).max(5000);

export async function loadLedger(): Promise<LedgerEvent[]> {
  try {
    const value = await get(LEDGER_KEY);
    if (!value) return [];
    const parsed = ledgerSchema.safeParse(value);
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

export async function saveLedger(events: LedgerEvent[]): Promise<void> {
  await set(LEDGER_KEY, ledgerSchema.parse(events.slice(-5000)));
}

export interface NewLedgerInput {
  type: LedgerEventType;
  title: string;
  detail?: string;
  refId?: string;
  now?: Dayjs;
}

export function createLedgerEvent(input: NewLedgerInput): LedgerEvent {
  const now = input.now ?? dayjs();
  return {
    id: newId("ledger"),
    date: studyDateKey(now),
    type: input.type,
    title: input.title,
    detail: input.detail,
    refId: input.refId,
    createdAt: now.toISOString(),
  };
}
