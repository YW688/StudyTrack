import type {
  Course,
  CourseSession,
  DayOfWeek,
  GridMerge,
  RawSheet,
  TimetableParseResult,
} from "../types";
import { COURSE_COLORS } from "../types";
import {
  buildGrid,
  detectDayHeader,
  extractSemester,
  fallbackPeriodsFromLabel,
  makeRawSheet,
  normalizeCell,
  parseCourseBlock,
  splitCellBlocks,
} from "./heuristics";
import { expandWeeksText } from "./schedule";

type XlsxModule = typeof import("xlsx");

export async function parseTimetableFile(
  file: File,
): Promise<TimetableParseResult> {
  const buffer = await file.arrayBuffer();
  return parseTimetableBuffer(buffer, file.name);
}

export async function parseTimetableBuffer(
  buffer: ArrayBuffer,
  sourceLabel: string,
): Promise<TimetableParseResult> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(buffer, {
    type: "array",
    cellStyles: true,
    cellDates: true,
  });
  return parseWorkbook(XLSX, workbook, sourceLabel);
}

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `course-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function colorFor(name: string): string {
  let hash = 0;
  for (const char of name) hash = (hash + char.charCodeAt(0)) % 997;
  return COURSE_COLORS[hash % COURSE_COLORS.length];
}

function readSheet(
  XLSX: XlsxModule,
  worksheet: import("xlsx").WorkSheet,
): { grid: (string | null)[][]; merges: GridMerge[]; texts: string[] } {
  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(worksheet, {
    header: 1,
    raw: false,
    defval: "",
  });
  const grid = rows.map((row) =>
    row.map((cell) => {
      const value = normalizeCell(cell === null ? "" : String(cell));
      return value ? value : null;
    }),
  );
  const merges: GridMerge[] = (worksheet["!merges"] ?? []).map((merge) => ({
    s: { r: merge.s.r, c: merge.s.c },
    e: { r: merge.e.r, c: merge.e.c },
  }));
  const texts = grid.flat().filter((cell): cell is string => Boolean(cell));
  return { grid: buildGrid(grid, merges), merges, texts };
}

function addSession(course: Course, session: CourseSession): void {
  const exists = course.sessions.some(
    (existing) =>
      existing.day === session.day &&
      existing.startPeriod === session.startPeriod &&
      existing.endPeriod === session.endPeriod &&
      existing.weeks.join(",") === session.weeks.join(","),
  );
  if (!exists) course.sessions.push(session);
}

export function parseWorkbook(
  XLSX: XlsxModule,
  workbook: import("xlsx").WorkBook,
  sourceLabel: string,
): TimetableParseResult {
  const warnings: string[] = [];
  const sheets: RawSheet[] = [];
  const courses = new Map<string, Course>();
  const allTexts: string[] = [];
  let unidentifiedCells = 0;
  let parsedCells = 0;

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) continue;
    const { grid, merges, texts } = readSheet(XLSX, worksheet);
    allTexts.push(...texts);

    let headerRow = -1;
    let dayCols: Record<number, number> = {};
    const headerLimit = Math.min(grid.length, 20);
    for (let r = 0; r < headerLimit; r += 1) {
      const found = detectDayHeader(grid[r] ?? []);
      if (found.length >= 2) {
        headerRow = r;
        dayCols = Object.fromEntries(found.map((item) => [item.day, item.col]));
        break;
      }
    }

    if (headerRow === -1) {
      const inlineCourses = parseInlineSheet(grid);
      if (inlineCourses.length) {
        inlineCourses.forEach((course) => {
          const key = `${course.name}::${course.teacher ?? ""}`;
          const target = courses.get(key) ?? course;
          if (!courses.has(key)) courses.set(key, target);
          course.sessions.forEach((session) => addSession(target, session));
        });
        sheets.push(
          makeRawSheet(sheetName, grid, merges, 0, {}),
        );
      }
      continue;
    }

    const firstDayCol = Math.min(...Object.values(dayCols));
    const sheetStartCourseCount = courses.size;

    for (let r = headerRow + 1; r < grid.length; r += 1) {
      const row = grid[r] ?? [];
      const fallback = fallbackPeriodsFromLabel(
        row.slice(0, firstDayCol).filter((cell): cell is string => Boolean(cell)),
      );

      for (const [dayKey, col] of Object.entries(dayCols)) {
        const day = Number(dayKey) as DayOfWeek;
        const cellText = row[col];
        if (!cellText) continue;

        const blocks = splitCellBlocks(cellText);
        for (const block of blocks) {
          const parsed = parseCourseBlock(block, day, fallback);
          if (!parsed) {
            unidentifiedCells += 1;
            continue;
          }
          parsedCells += 1;
          const weeks = parsed.weeksText
            ? expandWeeksText(parsed.weeksText)
            : null;

          const key = `${parsed.name}::${parsed.teacher ?? ""}`;
          let course = courses.get(key);
          if (!course) {
            course = {
              id: makeId(),
              name: parsed.name,
              teacher: parsed.teacher,
              location: parsed.location,
              sessions: [],
              color: colorFor(parsed.name),
              confidence: "high",
              source: "excel",
            };
            courses.set(key, course);
          }
          if (!course.location && parsed.location) course.location = parsed.location;
          if (!course.teacher && parsed.teacher) course.teacher = parsed.teacher;
          if (parsed.confidence === "low" || !weeks) course.confidence = "low";

          addSession(course, {
            day,
            startPeriod: parsed.startPeriod,
            endPeriod: parsed.endPeriod,
            weeks: weeks ?? [],
          });
        }
      }
    }

    if (courses.size > sheetStartCourseCount) {
      sheets.push(makeRawSheet(sheetName, grid, merges, headerRow, dayCols));
    }
  }

  const semester = extractSemester(allTexts);
  const maxWeek = Math.max(
    0,
    ...[...courses.values()].flatMap((course) =>
      course.sessions.flatMap((session) => session.weeks),
    ),
  );
  const totalWeeks = Math.max(
    semester.totalWeeks || 0,
    maxWeek,
    maxWeek > 0 ? 16 : 0,
  );
  semester.totalWeeks = totalWeeks || 20;

  // 没写周次的课按整学期处理 否则导入后在任何一周都看不到
  let filledWeeks = 0;
  for (const course of courses.values()) {
    if (course.sessions.some((session) => session.weeks.length)) continue;
    filledWeeks += 1;
    course.sessions.forEach((session) => {
      session.weeks = Array.from(
        { length: semester.totalWeeks },
        (_, index) => index + 1,
      );
    });
    course.confidence = "low";
  }

  const lowConfidence = [...courses.values()].filter(
    (course) => course.confidence === "low",
  ).length;

  if (!courses.size) {
    warnings.push(
      "没有从这份文件里识别出课程。可以改用「手动建课表」，或换一份带「星期 / 节次」表头的 Excel。",
    );
  }
  if (lowConfidence) {
    warnings.push(
      `${lowConfidence} 门课程的周次或节次没有完全识别，已标黄，请在确认前补全。`,
    );
  }
  if (filledWeeks) {
    warnings.push(
      `${filledWeeks} 门课程没写周次，已按整学期 1-${semester.totalWeeks} 周处理，请在确认时核对。`,
    );
  }
  if (parsedCells === 0 && unidentifiedCells > 0) {
    warnings.push("表格格式与常见课表差异较大，建议改用「手动建课表」。");
  }
  if (!semester.startDate && courses.size) {
    warnings.push("没有找到开学日期，周次仍按导入结果展示，当前周标记可能不准确。");
  }
  if (!semester.name && courses.size) {
    warnings.push("没有找到学期名称，已省略学期标题。");
  }
  if (sheets.length > 1) {
    warnings.push(`读取了 ${sheets.length} 个工作表，已合并为一份课表。`);
  }

  return {
    courses: [...courses.values()],
    semester,
    sheets,
    warnings,
    sourceLabel,
  };
}

function parseInlineSheet(grid: (string | null)[][]): Course[] {
  const courses = new Map<string, Course>();
  const pattern =
    /(.*?)\s*周([一二三四五六日天])\s*[，,]?\s*(\d+)\s*[-–~至]\s*(\d+)\s*节\s*[，,]?\s*([\d,、\-–~至]+周(?:\s*[（(]\s*[单双]\s*[)）])?)/g;

  for (const row of grid) {
    const cells = row.map((cell) => normalizeCell(cell)).filter(Boolean);
    if (!cells.length) continue;
    const joined = cells.join("  ");
    for (const match of joined.matchAll(pattern)) {
      const name = match[1].trim().replace(/^[|｜,，;；]+/, "");
      if (!name || name.length < 2 || /^(节次|星期|周次|课程)$/.test(name)) {
        continue;
      }
      const day = DAY_FROM_CHAR[match[2]];
      if (!day) continue;
      const weeks = expandWeeksText(match[5]) ?? [];
      const key = `${name}::`;
      let course = courses.get(key);
      if (!course) {
        course = {
          id: makeId(),
          name,
          sessions: [],
          color: colorFor(name),
          confidence: weeks.length ? "high" : "low",
          source: "excel",
        };
        courses.set(key, course);
      }
      addSession(course, {
        day,
        startPeriod: Number(match[3]),
        endPeriod: Number(match[4]),
        weeks,
      });
    }
  }
  return [...courses.values()];
}

const DAY_FROM_CHAR: Record<string, DayOfWeek> = {
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  日: 7,
  天: 7,
};
