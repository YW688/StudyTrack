import type { Assignment, AssignmentData } from "../../types";

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `assignment-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createSampleAssignments(): AssignmentData {
  const createdAt = new Date().toISOString();
  const items: Assignment[] = [
    {
      id: makeId(),
      title: "实验三 数据库操作",
      detail: "题量 1 · 满分 100 · 附件：实验三.docx 13.82K",
      courseName: undefined,
      due: "2026-11-08T23:55:00+08:00",
      status: "todo",
      kind: "homework",
      source: "sample",
      confidence: "high",
      createdAt,
    },
    {
      id: makeId(),
      title: "实验四 综合实训",
      detail: "题量 1 · 满分 100 · 附件：实验四.docx 11.46K",
      courseName: undefined,
      due: "2026-11-14T23:55:00+08:00",
      status: "todo",
      kind: "homework",
      source: "sample",
      confidence: "high",
      createdAt,
    },
    {
      id: makeId(),
      title: "新建作业2 · 使用外部中断实现指示灯交替闪烁",
      detail: "简答题：上传电路板连接图、代码和运行结果图",
      courseName: undefined,
      due: "2026-11-02T12:29:00+08:00",
      status: "todo",
      kind: "homework",
      source: "sample",
      confidence: "high",
      createdAt,
    },
  ];

  return {
    items,
    updatedAt: createdAt,
    sourceLabel: "示例待办",
  };
}
