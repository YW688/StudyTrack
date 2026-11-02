import dayjs from "dayjs";
import type { DayOfWeek, GridMerge, RawSheet, Semester } from "../types";
import { parsePeriodRange } from "./schedule";

const DAY_CHARS: Record<string, DayOfWeek> = {
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  日: 7,
  天: 7,
};

const CN_NUMBERS: Record<string, number> = {
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
  十: 10,
};

export function normalizeCell(value: string | null | undefined): string {
  return (value ?? "").replace(/\u00a0/g, " ").replace(/\r\n?/g, "\n").trim();
}

export function detectDayHeader(
  row: (string | null)[],
): { day: DayOfWeek; col: number }[] {
  const found: { day: DayOfWeek; col: number }[] = [];
  row.forEach((cell, col) => {
    const text = normalizeCell(cell);
    const match =
      text.match(/^星期([一二三四五六日天])$/) ??
      text.match(/^周([一二三四五六日天])$/) ??
      text.match(/^([一二三四五六日天])$/);
    if (!match) return;
    const day = DAY_CHARS[match[1]];
    if (day) found.push({ day, col });
  });
  return found;
}

export function splitCellBlocks(text: string): string[] {
  // 空行才是另一门课 其余换行属于同一门课的名称/周次/教室/教师
  return normalizeCell(text)
    .split(/\n\s*\n+/)
    .map((block) =>
      block
        .split(/\n+/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && line !== "无" && line !== "—")
        .join("\n"),
    )
    .filter((block) => block.length > 0);
}

export function fallbackPeriodsFromLabel(
  labels: string[],
): [number, number] | null {
  const joined = labels.map((l) => normalizeCell(l)).join(" ");
  if (!joined) return null;

  // 「1-2节」「第 3 节」这类节次列直接按节次解析
  const direct = parsePeriodRange(joined);
  if (direct) return direct;

  // 「1-2」「第1~2」省略了「节」
  const range = joined.match(/(\d{1,2})\s*[-–~至]\s*(\d{1,2})(?!\d)/);
  if (range) {
    const start = Number(range[1]);
    const end = Number(range[2]);
    if (start >= 1 && end >= start && end <= 20) return [start, end];
  }

  // 「第一大节」「第六节」按中文数字换算 大节各占两节
  const cn = joined.match(/([一二三四五六七八九十])\s*(?:大\s*)?节?\s*$/);
  if (cn) {
    const index = CN_NUMBERS[cn[1]];
    if (index >= 1 && index <= 5) return [index * 2 - 1, index * 2];
    if (index >= 6) return [index, index];
  }
  const arabic = joined.match(/(\d{1,2})\s*$/);
  if (arabic) {
    const period = Number(arabic[1]);
    if (period >= 1 && period <= 12) return [period, period];
  }
  return null;
}

export interface ParsedBlock {
  name: string;
  day: DayOfWeek;
  startPeriod: number;
  endPeriod: number;
  weeksText: string | null;
  location?: string;
  teacher?: string;
  confidence: "high" | "low";
  raw: string;
}

function cleanName(name: string): string {
  return name
    .replace(/[（(]\s*(单|双)\s*[)）]\s*$/, "")
    .replace(/[（(]\s*\d+\s*[-–~]?\s*\d*\s*节\s*[)）].*$/, "")
    .replace(/\s*[单双]\s*周?\s*$/, "")
    .trim();
}

function cleanLocation(text: string): string | undefined {
  const value = text
    .replace(/^@/, "")
    .trim();
  if (!value) return undefined;
  if (/^\d+(\.\d+)?$/.test(value)) return undefined;
  if (/^(理论|实践)[:：]/.test(value)) return undefined;
  return value.length > 40 ? value.slice(0, 40) : value;
}

function cleanTeacher(text: string): string | undefined {
  const value = text.replace(/^@/, "").trim();
  if (!value || value.length > 12 || /[\d:：/]/.test(value)) return undefined;
  return value;
}

/** 「单周 / 双周 / (单)」写法都算 同时出现视为不固定 */
function parityOf(text: string): "odd" | "even" | null {
  const compact = text.replace(/\s+/g, "");
  const odd = /单周|[（(]单[)）]/.test(compact);
  const even = /双周|[（(]双[)）]/.test(compact);
  if (odd === even) return null;
  return odd ? "odd" : "even";
}

/** 把一格内容切成课程名与其后的周次/教室/教师 */
function splitNameAndMeta(text: string): { name: string; meta: string } {
  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length > 1) {
    return { name: lines[0], meta: lines.slice(1).join(" ") };
  }
  const segments = text.split(/[\/／]/);
  if (segments.length > 1) {
    return { name: segments[0], meta: segments.slice(1).join(" ") };
  }
  // 单行里课程名后面直接跟周次/节次/教室时 从这里切开
  const cut = text.search(
    /\s+(?=\d+\s*[-–~至]\s*\d+\s*周|\d+\s*[-–~至]\s*\d+\s*节|教\d|周[一二三四五六日天]|[\u4e00-\u9fa5]{0,4}(?:楼|室|馆|场|厅|房))/,
  );
  if (cut > 0) {
    return { name: text.slice(0, cut), meta: text.slice(cut).trim() };
  }
  return { name: text, meta: "" };
}

function pickMeta(parts: string[]): { location?: string; teacher?: string } {
  const usable = parts.filter((part) => part && !/周|节|星期/.test(part));
  const location = usable.find((part) =>
    /@|楼|室|馆|场|厅|房|教\d/.test(part),
  );
  const teacher = usable.find(
    (part) => !/@|楼|室|馆|场|厅|房/.test(part) && /^[\u4e00-\u9fa5·]{2,4}$/.test(part),
  );
  return {
    location: location ? cleanLocation(location) : undefined,
    teacher: teacher ? cleanTeacher(teacher) : undefined,
  };
}

export function parseCourseBlock(
  raw: string,
  day: DayOfWeek,
  fallbackPeriods: [number, number] | null,
): ParsedBlock | null {
  const text = normalizeCell(raw);
  if (!text) return null;
  if (/^(节次|上午|下午|晚上|备注|注[-—])/.test(text)) return null;

  const { name: rawName, meta } = splitNameAndMeta(text);
  const name = cleanName(rawName);
  if (!name || name.length < 2) return null;
  // 整格只写了周次/节次/教室时不当课程名
  if (/^[\d,、\-–~至]+(周|节)?$/.test(name)) return null;
  if (/^(星期|周)[一二三四五六日天]/.test(name)) return null;

  const periods =
    parsePeriodRange(meta) ?? parsePeriodRange(text) ?? fallbackPeriods;
  if (!periods) return null;

  const weekMatches = (source: string) =>
    [...source.matchAll(/[\d,、\-–~至]+周(?:\s*[（(]\s*[单双]\s*[)）])?/g)].map(
      (match) => match[0],
    );
  const weeksText =
    [meta, text]
      .flatMap(weekMatches)
      .filter((value, index, list) => list.indexOf(value) === index)
      .join(",") || null;
  const parity = parityOf(text);
  const weeks = weeksText
    ? (() => {
        const base = weeksText;
        if (parity === "odd" && !/单/.test(base)) return `${base}(单)`;
        if (parity === "even" && !/双/.test(base)) return `${base}(双)`;
        return base;
      })()
    : null;

  const { location, teacher } = meta
    ? pickMeta(meta.split(/[\s,，;；\/／]+/))
    : { location: undefined, teacher: undefined };
  const confidence: "high" | "low" = weeks ? "high" : "low";

  return {
    name,
    day,
    startPeriod: periods[0],
    endPeriod: periods[1],
    weeksText: weeks,
    location,
    teacher,
    confidence,
    raw: text,
  };
}

export interface InlineBlock {
  name: string;
  day: DayOfWeek;
  startPeriod: number;
  endPeriod: number;
  weeksText: string;
}

export function parseInlineSchedule(text: string): InlineBlock | null {
  const normalized = normalizeCell(text);
  const match = normalized.match(
    /^(.*?)[\s,，;；]*周([一二三四五六日天])\s*[，,]?\s*(\d+)\s*[-–~至]\s*(\d+)\s*节\s*[，,]?\s*([\d,、\-–~至]+周(?:[（(]\s*[单双]\s*[)）])?)/,
  );
  if (!match) return null;
  const name = cleanName(match[1] ?? "");
  if (!name) return null;
  const day = DAY_CHARS[match[2]];
  if (!day) return null;
  return {
    name,
    day,
    startPeriod: Number(match[3]),
    endPeriod: Number(match[4]),
    weeksText: match[5],
  };
}

const FULL_DATE = /(\d{4})[-/年.](\d{1,2})[-/月.](\d{1,2})日?/g;
const MONTH_DAY = /(\d{1,2})月(\d{1,2})日/g;
const DATE_CONTEXT = /开学|开课|上课|报到|学期开始|起止/g;

/** 优先取「开学 / 报到」附近的日期 没有年份的「9月7日」按学期年份补齐 */
function pickStartDate(text: string): string | undefined {
  const anchors = [...text.matchAll(DATE_CONTEXT)].map((match) => match.index ?? 0);
  const candidates: { date: string; index: number; loose: number }[] = [];

  const push = (year: number, month: number, day: number, index: number) => {
    if (year < 2000 || year > 2100) return;
    if (month < 1 || month > 12 || day < 1 || day > 31) return;
    const value = dayjs(
      `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    );
    if (!value.isValid() || value.month() + 1 !== month || value.date() !== day) {
      return;
    }
    const near = anchors.some((at) => Math.abs(at - index) <= 12);
    candidates.push({
      date: value.format("YYYY-MM-DD"),
      index,
      loose: near ? 0 : 1,
    });
  };

  let masked = text;
  for (const match of text.matchAll(FULL_DATE)) {
    const index = match.index ?? 0;
    push(Number(match[1]), Number(match[2]), Number(match[3]), index);
    masked =
      masked.slice(0, index) +
      " ".repeat(match[0].length) +
      masked.slice(index + match[0].length);
  }

  const yearHint =
    text.match(/(20\d{2})\s*[-—~至]\s*20\d{2}/) ?? text.match(/(20\d{2})/);
  for (const match of masked.matchAll(MONTH_DAY)) {
    const month = Number(match[1]);
    const day = Number(match[2]);
    let year = yearHint ? Number(yearHint[1]) : dayjs().year();
    let value = dayjs(
      `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    );
    if (
      !yearHint &&
      value.isValid() &&
      value.diff(dayjs().startOf("day"), "day") > 120
    ) {
      value = value.subtract(1, "year");
      year = value.year();
    }
    push(year, month, day, match.index ?? 0);
  }

  candidates.sort((a, b) => a.loose - b.loose || a.index - b.index);
  return candidates[0]?.date;
}

export function extractSemester(texts: string[]): Semester {
  const joined = texts.join("\n");
  const totalMatch = joined.match(/共\s*(\d{1,3})\s*周/);
  const nameMatch = joined.match(/(\d{4}\s*[-—]\s*\d{4})\s*年第\s*([一二三四1-4])\s*学期/);

  const startDate = pickStartDate(joined);

  const cnSemester: Record<string, string> = {
    一: "1",
    二: "2",
    三: "3",
    四: "4",
  };

  return {
    name: nameMatch
      ? `${nameMatch[1].replace(/\s/g, "")} 年第 ${cnSemester[nameMatch[2]] ?? nameMatch[2]} 学期`
      : undefined,
    startDate,
    totalWeeks: totalMatch ? Number(totalMatch[1]) : 0,
  };
}

export function buildGrid(
  rows: (string | null)[][],
  merges: GridMerge[],
): (string | null)[][] {
  const grid = rows.map((row) => [...row]);
  for (const merge of merges) {
    const source = normalizeCell(rows[merge.s.r]?.[merge.s.c]);
    for (let r = merge.s.r; r <= merge.e.r; r += 1) {
      for (let c = merge.s.c; c <= merge.e.c; c += 1) {
        if (!grid[r]) grid[r] = [];
        grid[r][c] = source;
      }
    }
  }
  return grid;
}

export function makeRawSheet(
  name: string,
  rows: (string | null)[][],
  merges: GridMerge[],
  headerRow: number,
  dayCols: Record<number, number>,
): RawSheet {
  return { name, rows, merges, headerRow, dayCols };
}
