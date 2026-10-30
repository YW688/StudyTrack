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
  return normalizeCell(text)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && line !== "无" && line !== "—");
}

export function fallbackPeriodsFromLabel(
  labels: string[],
): [number, number] | null {
  const joined = labels.map((l) => normalizeCell(l)).join(" ");
  const cn = joined.match(/([一二三四五六七八九十])\s*$/);
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

function parityFromName(name: string): "odd" | "even" | null {
  const match = name.match(/[（(]\s*(单|双)\s*[)）]/);
  if (!match) return null;
  return match[1] === "单" ? "odd" : "even";
}

export function parseCourseBlock(
  raw: string,
  day: DayOfWeek,
  fallbackPeriods: [number, number] | null,
): ParsedBlock | null {
  const text = normalizeCell(raw);
  if (!text) return null;
  if (/^(节次|上午|下午|晚上|备注|注[-—])/.test(text)) return null;

  const segments = text.split(/[\/／]/);
  const name = cleanName(segments[0] ?? "");
  if (!name || name.length < 2) return null;

  const meta =
    segments.slice(1).find((part) => /节|周/.test(part)) ?? text;
  const periods = parsePeriodRange(meta) ?? fallbackPeriods;
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
  const parity = parityFromName(segments[0] ?? "");
  const weeks = weeksText
    ? (() => {
        const base = weeksText;
        if (parity === "odd" && !/单/.test(base)) return `${base}(单)`;
        if (parity === "even" && !/双/.test(base)) return `${base}(双)`;
        return base;
      })()
    : null;

  const location = cleanLocation(segments[2] ?? "");
  const teacher = cleanTeacher(segments[3] ?? "");
  const confidence: "high" | "low" =
    weeks && parsePeriodRange(meta) ? "high" : "low";

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

export function extractSemester(texts: string[]): Semester {
  const joined = texts.join("\n");
  const totalMatch = joined.match(/共\s*(\d{1,3})\s*周/);
  const nameMatch = joined.match(/(\d{4}\s*[-—]\s*\d{4})\s*年第\s*([一二三四1-4])\s*学期/);

  let startDate: string | undefined;
  const dateMatches = [
    ...joined.matchAll(/(\d{4})[-/年.](\d{1,2})[-/月.](\d{1,2})日?/g),
  ];
  for (const match of dateMatches) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const date = Number(match[3]);
    if (year < 2000 || year > 2100) continue;
    if (month < 1 || month > 12 || date < 1 || date > 31) continue;
    startDate = `${year}-${String(month).padStart(2, "0")}-${String(date).padStart(2, "0")}`;
    break;
  }

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
