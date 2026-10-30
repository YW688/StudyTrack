export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type Confidence = "high" | "low";

export interface CourseSession {
  day: DayOfWeek;
  startPeriod: number;
  endPeriod: number;
  weeks: number[];
}

export interface Course {
  id: string;
  name: string;
  teacher?: string;
  location?: string;
  sessions: CourseSession[];
  color?: string;
  confidence: Confidence;
  source: "excel" | "sample" | "manual";
}

export interface Semester {
  name?: string;
  startDate?: string;
  totalWeeks: number;
}

export interface TimetableData {
  courses: Course[];
  semester: Semester;
  updatedAt: string;
  sourceLabel?: string;
}

export interface GridMerge {
  s: { r: number; c: number };
  e: { r: number; c: number };
}

export interface RawSheet {
  name: string;
  rows: (string | null)[][];
  merges: GridMerge[];
  headerRow: number;
  dayCols: Record<number, number>;
}

export interface TimetableParseResult {
  courses: Course[];
  semester: Semester;
  sheets: RawSheet[];
  warnings: string[];
  sourceLabel: string;
}

export const DAY_LABELS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

export const COURSE_COLORS = ["clay", "blue", "moss", "plum", "sand", "slate"] as const;

export type CourseColor = (typeof COURSE_COLORS)[number];
