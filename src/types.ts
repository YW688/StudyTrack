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

export type AssignmentStatus = "todo" | "doing" | "done";

export type AssignmentKind = "homework" | "contest" | "internship" | "other";

export type AssignmentSource = "ocr" | "paste" | "manual" | "sample";

export interface Assignment {
  id: string;
  courseId?: string;
  courseName?: string;
  title: string;
  detail?: string;
  due: string | null;
  status: AssignmentStatus;
  kind: AssignmentKind;
  source: AssignmentSource;
  confidence: Confidence;
  createdAt: string;
}

export interface AssignmentData {
  items: Assignment[];
  updatedAt: string;
  sourceLabel?: string;
}

export const ASSIGNMENT_KIND_LABELS: Record<AssignmentKind, string> = {
  homework: "作业",
  contest: "竞赛",
  internship: "实习",
  other: "待办",
};

export const ASSIGNMENT_SOURCE_LABELS: Record<AssignmentSource, string> = {
  ocr: "截图",
  paste: "粘贴",
  manual: "手动",
  sample: "示例",
};

export type ExperienceKind =
  | "course"
  | "contest"
  | "research"
  | "intern"
  | "design"
  | "volunteer"
  | "other";

export type ExperienceSource = "manual" | "sample" | "ai";

export interface ExperienceMetric {
  label: string;
  value: string;
}

export interface ExperienceEvidence {
  label: string;
  url?: string;
}

export interface Experience {
  id: string;
  kind: ExperienceKind;
  kindLabel?: string;
  title: string;
  org?: string;
  start?: string;
  end?: string;
  problem: string;
  method: string;
  contribution: string;
  result: string;
  metrics: ExperienceMetric[];
  evidence: ExperienceEvidence[];
  skills: string[];
  tags: string[];
  confidence: Confidence;
  source: ExperienceSource;
  createdAt: string;
  updatedAt: string;
}

export interface ExperienceData {
  experiences: Experience[];
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
