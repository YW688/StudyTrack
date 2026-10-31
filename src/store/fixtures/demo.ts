import dayjs from "dayjs";
import type {
  AssignmentData,
  ExperienceData,
  LedgerEvent,
  Note,
  Profile,
  ResumeData,
  TimetableData,
} from "../../types";
import { createSampleTimetable } from "./timetable";
import { createSampleAssignments } from "./assignments";
import { createSampleExperiences } from "./experiences";
import { createEmptyResume } from "../resume";
import { createLedgerEvent } from "../ledger";
import { createNote } from "../notes";

export interface DemoSeed {
  timetable: TimetableData;
  assignments: AssignmentData;
  experiences: ExperienceData;
  profile: Profile;
  resume: ResumeData;
  ledger: LedgerEvent[];
  notes: Note[];
}

export function createDemoSeed(): DemoSeed {
  const now = dayjs();
  const nowIso = now.toISOString();
  const timetable = createSampleTimetable();
  const baseAssignments = createSampleAssignments();
  const doneAssignment = baseAssignments.items[0];
  const assignments: AssignmentData = {
    ...baseAssignments,
    items: baseAssignments.items.map((item) =>
      item.id === doneAssignment?.id ? { ...item, status: "done" } : item,
    ),
    updatedAt: nowIso,
  };
  const experiences = createSampleExperiences();

  const profile: Profile = {
    id: "me",
    grade: "大三",
    major: "人工智能",
    school: "示例大学",
    goal: "intern",
    targetRoles: ["算法工程师", "数据分析师"],
    skills: ["Python", "SQL", "PyTorch", "数学建模"],
    interests: ["AI 产品", "开源"],
    onboardedAt: nowIso,
    updatedAt: nowIso,
  };

  const selectedExperienceIds = experiences.experiences
    .slice(0, 2)
    .map((experience) => experience.id);
  const resume: ResumeData = {
    ...createEmptyResume(),
    basics: {
      name: "示例同学",
      grade: "大三",
      major: "人工智能",
      school: "示例大学",
      city: "杭州",
      phone: "",
      email: "",
      target: "算法工程师",
    },
    selectedExperienceIds,
    updatedAt: nowIso,
  };

  const noteSeeds = [
    {
      text: "记录：选课系统并发测试跑通，200 人无超选。",
      tags: ["课程"],
      source: "agent" as const,
    },
    {
      text: "复盘：数学建模论文的模型检验部分还要补一张残差图。",
      tags: ["竞赛"],
      source: "text" as const,
    },
    {
      text: "想法：把校园地图改版整理成作品集案例。",
      tags: ["作品"],
      source: "text" as const,
    },
  ];
  const notes: Note[] = noteSeeds.map((seed, index) => {
    const note = createNote({
      text: seed.text,
      tags: seed.tags,
      source: seed.source,
    });
    return {
      ...note,
      createdAt: now.subtract(index + 1, "day").toISOString(),
    };
  });

  const ledger: LedgerEvent[] = [
    createLedgerEvent({
      type: "experience_added",
      title: "记下「数据库课程设计：校园选课系统」",
      refId: experiences.experiences[0]?.id,
      now: now.subtract(3, "day"),
    }),
    createLedgerEvent({
      type: "experience_added",
      title: "记下「全国大学生数学建模竞赛 · 校赛」",
      refId: experiences.experiences[1]?.id,
      now: now.subtract(2, "day"),
    }),
    createLedgerEvent({
      type: "note_added",
      title: "留下一条记录",
      detail: notes[0]?.text.slice(0, 80),
      refId: notes[0]?.id,
      now: now.subtract(1, "day"),
    }),
    createLedgerEvent({
      type: "assignment_done",
      title: `完成「${doneAssignment?.title ?? "实验三 数据库操作"}」`,
      refId: doneAssignment?.id,
      now,
    }),
    createLedgerEvent({
      type: "resume_generated",
      title: "生成简历 v1",
      now,
    }),
    createLedgerEvent({
      type: "match_run",
      title: "对照 3 张演示岗位卡",
      now,
    }),
  ];

  return {
    timetable,
    assignments,
    experiences,
    profile,
    resume,
    ledger,
    notes,
  };
}
