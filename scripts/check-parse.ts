import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as XLSX from "xlsx";
import { parseTimetableBuffer } from "../src/parse/xlsx";
import { formatWeeksLabel } from "../src/parse/schedule";
import { DAY_LABELS } from "../src/types";

function show(label: string, result: Awaited<ReturnType<typeof parseTimetableBuffer>>) {
  console.log(`\n===== ${label}`);
  console.log(
    "semester:",
    JSON.stringify(result.semester),
    "| courses:",
    result.courses.length,
    "| sheets:",
    result.sheets.length,
  );
  for (const course of result.courses) {
    console.log(
      `- ${course.name} | ${course.teacher ?? "?"} | ${course.confidence} | ${course.sessions.length} 段`,
    );
    for (const s of course.sessions) {
      console.log(
        `    ${DAY_LABELS[s.day - 1]} ${s.startPeriod}-${s.endPeriod}节  ${formatWeeksLabel(s.weeks)}`,
      );
    }
  }
  console.log("warnings:", result.warnings);
}

async function checkFile(file: string) {
  const buffer = readFileSync(resolve(file));
  const result = await parseTimetableBuffer(
    buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
    file,
  );
  show(file, result);
}

function toBuffer(workbook: XLSX.WorkBook): ArrayBuffer {
  const data = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  return data as ArrayBuffer;
}

function buildTwoColumn(): ArrayBuffer {
  const rows = [
    ["课程名称", "上课时间"],
    ["高等数学", "周一 3-4节, 1-16周 教学楼AA101"],
    ["线性代数", "周三 5-6节, 2-16周(双)"],
    ["大学英语", "周五 1-2节, 1-15周(单)"],
  ];
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "两列式");
  return toBuffer(workbook);
}

function buildMerged(): ArrayBuffer {
  const rows = [
    ["节次", "星期一", "星期二", "星期三"],
    ["1-4节", "程序设计/(1-4节)1-8周/教学楼B/王老师", null, null],
    [null, null, null, null],
    ["5-6节", null, "数据库/(5-6节)2-10周(双)/实验楼/李老师", null],
  ];
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!merges"] = [{ s: { r: 1, c: 1 }, e: { r: 2, c: 2 } }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "合并单元格");
  return toBuffer(workbook);
}

function buildMultiSheet(): ArrayBuffer {
  const workbook = XLSX.utils.book_new();
  const sheetA = XLSX.utils.aoa_to_sheet([
    ["节次", "星期一", "星期二"],
    ["1-2节", "Python/(1-2节)1-16周/A楼/张老师", null],
  ]);
  const sheetB = XLSX.utils.aoa_to_sheet([
    ["节次", "星期三", "星期四"],
    ["3-4节", null, "算法/(3-4节)1-16周/B楼/赵老师"],
  ]);
  XLSX.utils.book_append_sheet(workbook, sheetA, "第1学期");
  XLSX.utils.book_append_sheet(workbook, sheetB, "第2学期");
  return toBuffer(workbook);
}

await checkFile("docs/fixtures/timetable-2026-fall.xls");
await checkFile("docs/fixtures/timetable-2025-fall.xls");
show("两列式（内存生成）", await parseTimetableBuffer(buildTwoColumn(), "two-column.xlsx"));
show("合并单元格（内存生成）", await parseTimetableBuffer(buildMerged(), "merged.xlsx"));
show("多工作表（内存生成）", await parseTimetableBuffer(buildMultiSheet(), "multi.xlsx"));
