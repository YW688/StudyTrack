import dayjs from "dayjs";
import type { AssignmentKind, Confidence } from "../types";

export interface ParsedAssignment {
  title: string;
  courseName?: string;
  due: string | null;
  kind: AssignmentKind;
  confidence: Confidence;
  detail?: string;
}

export interface AssignmentParseResult {
  items: ParsedAssignment[];
  warnings: string[];
}

const MAX_ITEMS = 50;

const DATE_SOURCE =
  "(?:(\\d{4})\\s*[-/.年]\\s*(\\d{1,2})\\s*[-/.月]\\s*(\\d{1,2})\\s*日?|(\\d{1,2})\\s*[-/.月]\\s*(\\d{1,2})\\s*日?)(?:\\s*[T ]?\\s*(\\d{1,2})\\s*[:：.]\\s*(\\d{2}))?";

const DATE_GLOBAL = new RegExp(DATE_SOURCE, "g");

const META_LINE =
  /^(?:\d+[.、)）]\s*)?(?:题量|满分|作答时间|截止|附件|课程|科目|发布|题型)|^[一二三四五六七八九十]+[.、]|共\s*\d+\s*题/;

const SECTION_HEADER = /^[一二三四五六七八九十]+[.、]/;

interface DueCandidate {
  due: string;
  hasTime: boolean;
  text: string;
}

function toHalfWidth(input: string): string {
  return input
    .replace(/[０-９]/g, (char) =>
      String.fromCharCode(char.charCodeAt(0) - 0xfee0),
    )
    .replace(/：/g, ":")
    .replace(/／/g, "/")
    .replace(/[－—]/g, "-");
}

function collectDates(input: string): DueCandidate[] {
  const text = toHalfWidth(input);
  const candidates: DueCandidate[] = [];
  for (const match of text.matchAll(DATE_GLOBAL)) {
    const isFull = Boolean(match[1]);
    const month = Number(isFull ? match[2] : match[4]);
    const day = Number(isFull ? match[3] : match[5]);
    const hasTime = Boolean(match[6]);
    const hour = hasTime ? Number(match[6]) : 23;
    const minute = hasTime ? Number(match[7]) : 59;
    if (month < 1 || month > 12 || day < 1 || day > 31) continue;
    if (hour > 23 || minute > 59) continue;
    if (
      !isFull &&
      !hasTime &&
      !/截止|ddl|due|日/i.test(text) &&
      !/日/.test(match[0])
    ) {
      continue;
    }

    let date = dayjs(
      new Date(Number(isFull ? match[1] : dayjs().year()), month - 1, day, hour, minute, 0),
    );
    if (!isFull && date.isBefore(dayjs().subtract(180, "day"))) {
      date = date.add(1, "year");
    }
    candidates.push({
      due: date.toISOString(),
      hasTime,
      text: match[0],
    });
  }
  return candidates;
}

function stripDates(input: string): string {
  return toHalfWidth(input).replace(DATE_GLOBAL, " ");
}

function cleanTitle(input: string): string {
  let text = stripDates(input);
  text = text
    .replace(/作答时间|截止时间|截止日期|截止于|截止|ddl|due|满分\s*\d+\s*分?|题量\s*\d+|共\s*\d+\s*题/gi, " ")
    .replace(/[至~～]\s*$/g, " ")
    .replace(/^\s*(?:\d+[.、)）]|（\d+）|\(\d+\))\s*/, "")
    .replace(/^[\s|·:：,，;；\-–—]+|[\s|·:：,，;；\-–—]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text;
}

function extractCourse(input: string): {
  rest: string;
  courseName?: string;
} {
  let rest = input;
  let courseName: string | undefined;

  const labeled = rest.match(/(?:课程|科目)\s*[:：]\s*([^\s|,，;；。]{1,30})/);
  if (labeled) {
    courseName = labeled[1].trim();
    rest = rest.replace(labeled[0], " ");
  }
  if (!courseName) {
    const bracket = rest.match(/[【\[]([^】\]]{2,24})[】\]]/);
    if (bracket) {
      courseName = bracket[1].trim();
      rest = rest.replace(bracket[0], " ");
    }
  }
  if (!courseName) {
    const book = rest.match(/《([^》]{2,30})》/);
    if (book) {
      courseName = book[1].trim();
      rest = rest.replace(book[0], " ");
    }
  }
  return { rest, courseName };
}

function splitRecords(raw: string): string[][] {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const records: string[][] = [];
  let buffer: string[] = [];
  let pendingCourse: string | null = null;

  const flush = () => {
    if (!buffer.length) return;
    records.push(pendingCourse ? [pendingCourse, ...buffer] : buffer);
    buffer = [];
    pendingCourse = null;
  };

  for (const line of lines) {
    if (/^(课程|科目)\s*[:：]/.test(line)) {
      if (buffer.length) {
        buffer.push(line);
      } else if (records.length) {
        records[records.length - 1].push(line);
      } else {
        pendingCourse = line;
      }
      continue;
    }
    buffer.push(line);
    if (collectDates(line).length) flush();
  }
  flush();
  return records;
}

function pickTitleLine(lines: string[], fallback: string): string {
  const eligible = lines
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !collectDates(line).length)
    .filter((line) => !META_LINE.test(line));
  return eligible[0] ?? fallback;
}

function detectKind(text: string): AssignmentKind {
  if (/竞赛|比赛|大赛|报名|初赛|决赛|选拔/.test(text)) return "contest";
  if (/实习|招聘|网申|投递|简历|面试|申请/.test(text)) return "internship";
  if (/作业|实验|报告|习题|简答|编程|课程设计|论文|测验|考试/.test(text)) {
    return "homework";
  }
  return "other";
}

export function parseAssignmentsText(raw: string): AssignmentParseResult {
  const warnings: string[] = [];
  const records = splitRecords(raw);
  const items: ParsedAssignment[] = [];
  let missingDue = 0;
  let missingTime = 0;
  let missingTitle = 0;

  for (const lines of records) {
    const joined = lines.join(" ");
    const dates = collectDates(joined);
    if (!dates.length && lines.some((line) => SECTION_HEADER.test(line))) {
      continue;
    }
    const dueInfo = dates.length ? dates[dates.length - 1] : null;
    const { rest, courseName } = extractCourse(joined);

    let title = cleanTitle(pickTitleLine(lines, rest));
    if (!title) {
      title = "待补充标题";
      missingTitle += 1;
    }

    const due = dueInfo?.due ?? null;
    if (!due) missingDue += 1;
    else if (!dueInfo?.hasTime) missingTime += 1;

    items.push({
      title,
      courseName,
      due,
      kind: detectKind(joined),
      confidence: due && title !== "待补充标题" ? "high" : "low",
    });

    if (items.length >= MAX_ITEMS) break;
  }

  if (records.length > MAX_ITEMS) {
    warnings.push(`一次最多导入 ${MAX_ITEMS} 条 其余已忽略`);
  }
  if (!items.length) {
    warnings.push(
      "没有识别到待办 每行写「标题 + 截止时间」 例如 实验三 数据库操作 2026-11-08 23:55",
    );
  } else {
    if (missingDue) {
      warnings.push(`${missingDue} 条没有识别到截止时间 导入后可手动补`);
    }
    if (missingTime) {
      warnings.push(`${missingTime} 条只识别到日期 按当日 23:59 计`);
    }
    if (missingTitle) {
      warnings.push(`${missingTitle} 条没有标题 已标为待补充`);
    }
  }

  return { items, warnings };
}

export function normalizeDueText(input: string | null | undefined): {
  due: string | null;
  hasTime: boolean;
} {
  if (!input) return { due: null, hasTime: false };
  const value = input.trim();

  if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const parsed = dayjs(value);
    if (parsed.isValid()) {
      return { due: parsed.toISOString(), hasTime: true };
    }
  }

  const candidates = collectDates(value);
  if (candidates.length) {
    const last = candidates[candidates.length - 1];
    return { due: last.due, hasTime: last.hasTime };
  }

  const parsed = dayjs(value);
  if (parsed.isValid()) {
    return { due: parsed.toISOString(), hasTime: /[:T]\d{2}/.test(value) };
  }
  return { due: null, hasTime: false };
}

export function toLocalInputValue(due: string | null): string {
  if (!due) return "";
  const parsed = dayjs(due);
  return parsed.isValid() ? parsed.format("YYYY-MM-DDTHH:mm") : "";
}

export function fromLocalInputValue(value: string): string | null {
  if (!value) return null;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.toISOString() : null;
}
