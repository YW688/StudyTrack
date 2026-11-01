import { z } from "zod";
import {
  CALENDAR_CATEGORIES,
  type CalendarItem,
} from "../types";
import rawCalendar from "../../data/calendar.json";

export const calendarItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(120),
  category: z.enum(CALENDAR_CATEGORIES),
  organizer: z.string().max(80).optional(),
  fitGrades: z.array(z.number().int().min(1).max(6)).min(1),
  fitMajors: z.array(z.string().max(40)).max(30).optional(),
  start: z.string().optional(),
  end: z.string().optional(),
  deadline: z.string().optional(),
  sourceName: z.string().min(1).max(80),
  sourceUrl: z.string().max(500).optional(),
  sourceDateTerms: z.array(z.string().max(80)).max(10).optional(),
  sourceType: z.enum(["official", "sample", "personal"]),
  verifiedAt: z.string().optional(),
  note: z.string().max(300).optional(),
});

const calendarFileSchema = z.object({
  version: z.literal(1),
  updatedAt: z.string(),
  items: z.array(calendarItemSchema).max(120),
});

const parsed = calendarFileSchema.safeParse(rawCalendar);

export const CALENDAR_ITEMS: CalendarItem[] = parsed.success
  ? parsed.data.items
  : [];

export const CALENDAR_UPDATED_AT: string | null = parsed.success
  ? parsed.data.updatedAt
  : null;

export const CALENDAR_ISSUE: string | null = parsed.success
  ? null
  : "日历数据格式有误，已暂时隐藏情报。请检查 data/calendar.json。";
