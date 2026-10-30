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

export const RESUME_GRADES = [
  "大一",
  "大二",
  "大三",
  "大四",
  "研究生",
  "其他",
] as const;

export interface ResumeBasics {
  name: string;
  grade: string;
  major: string;
  school: string;
  city: string;
  phone: string;
  email: string;
  target: string;
}

export type ResumeBulletSource = "ai" | "local";

export interface ResumeBullet {
  id: string;
  text: string;
  evidence: string[];
  source: ResumeBulletSource;
}

export interface ResumeBulletCache {
  experienceId: string;
  bullets: ResumeBullet[];
  source: ResumeBulletSource;
  status: "ready" | "fallback";
  generatedAt: string;
  hiddenCount?: number;
  note?: string;
}

export interface ResumeData {
  basics: ResumeBasics;
  selectedExperienceIds: string[];
  conciseIds: string[];
  bullets: Record<string, ResumeBulletCache>;
  updatedAt: string;
}

export interface ResumeSnapshot {
  id: string;
  version: number;
  createdAt: string;
  basics: ResumeBasics;
  selectedExperienceIds: string[];
  conciseIds: string[];
  bulletsSnapshot: Record<string, ResumeBullet[]>;
  experiences: Experience[];
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

export type JobType = "campus" | "intern";

export type JobFamily =
  | "技术"
  | "数据"
  | "产品"
  | "设计"
  | "运营"
  | "研究"
  | "职能"
  | "其他";

export interface RequirementSkillRule {
  all?: string[];
  any?: string[];
}

export interface JobPosting {
  id: string;
  company: string;
  title: string;
  city: string;
  type: JobType;
  cohort: string;
  family: JobFamily;
  track: string;
  requirements: string[];
  requirementSkills: RequirementSkillRule[];
  skills: string[];
  gradeFit: number[];
  collectedAt: string;
  custom?: boolean;
}

export type ChannelType = "campus" | "platform" | "public";

export interface Channel {
  id: string;
  name: string;
  type: ChannelType;
  entryUrl: string;
  openMonths: number[];
  fitGrade: number[];
  note?: string;
}

export type MatchTier = "high" | "medium" | "low";

export type MatchEvidenceSource = "text" | "bullet" | "tag";

export interface MatchHit {
  index: number;
  requirement: string;
  experienceId: string;
  quote: string;
  skills: string[];
  source: MatchEvidenceSource;
}

export interface MatchGap {
  index: number;
  requirement: string;
  advice: string;
  archiveExperienceId?: string;
  archiveQuote?: string;
}

export interface MatchEligibility {
  index: number;
  requirement: string;
  note: string;
}

export interface JobMatch {
  jobId: string;
  score: number;
  tier: MatchTier;
  hits: MatchHit[];
  gaps: MatchGap[];
  eligibility: MatchEligibility[];
  matchedSkills: string[];
  missingSkills: string[];
  reasons: string[];
  warnings: string[];
  coverage: number;
}

export interface OpportunityProfile {
  grade: string;
  gradeNumber: number;
  major: string;
  city: string;
  target: string;
  skills: string[];
  experienceCount: number;
  selectedCount: number;
  usesSelected: boolean;
  completeness: {
    label: string;
    done: boolean;
    action: string;
    target: "resume" | "experiences";
  }[];
}

export const JOB_TYPE_LABELS: Record<JobType, string> = {
  campus: "校招",
  intern: "实习",
};

export const CHANNEL_TYPE_LABELS: Record<ChannelType, string> = {
  campus: "校招官网",
  platform: "招聘平台",
  public: "公共服务",
};

export const MATCH_TIER_LABELS: Record<MatchTier, string> = {
  high: "高匹配",
  medium: "可尝试",
  low: "缺口较大",
};
