import type { Course, CourseSession, TimetableData } from "../../types";

function session(
  day: CourseSession["day"],
  startPeriod: number,
  endPeriod: number,
  weeks: number[],
): CourseSession {
  return { day, startPeriod, endPeriod, weeks };
}

const week9 = [9];
const days = [1, 2, 3, 4, 5] as const;

const courses: Course[] = [
  {
    id: "sample-python",
    name: "Python 智能系统开发",
    teacher: "示例教师 A",
    location: "教学楼A 101",
    color: "blue",
    confidence: "high",
    source: "sample",
    sessions: [
      session(2, 1, 2, [1, 2, 3, 4, 5, 6, 7, 8]),
      session(2, 3, 4, [2, 4, 6, 8]),
      session(2, 5, 6, [1, 2, 3, 4]),
    ],
  },
  {
    id: "sample-robot",
    name: "智能机器人",
    teacher: "示例教师 B",
    location: "教学楼A 105",
    color: "clay",
    confidence: "high",
    source: "sample",
    sessions: [
      session(1, 3, 4, [1, 2, 3, 4, 5, 6, 7, 8]),
      session(1, 5, 6, [3, 4, 5, 6, 7, 8]),
      session(3, 3, 4, [1, 2]),
    ],
  },
  {
    id: "sample-policy",
    name: "形势与政策",
    teacher: "示例教师 C",
    location: "教学楼B 203",
    color: "moss",
    confidence: "high",
    source: "sample",
    sessions: [session(4, 3, 4, [1, 3, 5, 7])],
  },
  {
    id: "sample-embedded",
    name: "嵌入式系统综合设计实训",
    teacher: "示例教师 D",
    location: "实验中心C 301（综合实训室）",
    color: "plum",
    confidence: "high",
    source: "sample",
    sessions: days.flatMap((day) => [
      session(day, 1, 2, week9),
      session(day, 3, 4, week9),
    ]),
  },
  {
    id: "sample-ai-practice",
    name: "人工智能综合设计实训",
    teacher: "示例教师 E",
    location: "实验中心C 305（设计实训室）",
    color: "sand",
    confidence: "high",
    source: "sample",
    sessions: days.flatMap((day) => [
      session(day, 5, 6, week9),
      session(day, 7, 8, week9),
    ]),
  },
];

export function createSampleTimetable(): TimetableData {
  return {
    courses,
    semester: {
      name: "2026-2027 年第 1 学期",
      startDate: "2026-09-07",
      totalWeeks: 17,
    },
    updatedAt: new Date().toISOString(),
    sourceLabel: "示例课表",
  };
}
