import { useEffect, useMemo, useRef, useState } from "react";
import type { Course, Semester, TimetableData, TimetableParseResult } from "../../types";
import { DAY_LABELS } from "../../types";
import { parseTimetableFile } from "../../parse/xlsx";
import {
  currentWeekOf,
  findConflicts,
  expandWeeksText,
} from "../../parse/schedule";
import TimetableGrid from "../../components/TimetableGrid";
import ParseConfirm from "../../components/ParseConfirm";

interface TimetablePageProps {
  data: TimetableData | null;
  onSave: (data: TimetableData) => Promise<void>;
  onUseSample: () => Promise<void>;
}

interface ManualForm {
  name: string;
  teacher: string;
  location: string;
  day: number;
  startPeriod: number;
  endPeriod: number;
  weeks: string;
}

const EMPTY_FORM: ManualForm = {
  name: "",
  teacher: "",
  location: "",
  day: 1,
  startPeriod: 1,
  endPeriod: 2,
  weeks: "1-16周",
};

export default function TimetablePage({
  data,
  onSave,
  onUseSample,
}: TimetablePageProps) {
  const [week, setWeek] = useState(1);
  const [parseResult, setParseResult] = useState<TimetableParseResult | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [form, setForm] = useState<ManualForm>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentWeek = data
    ? currentWeekOf(data.semester.startDate, data.semester.totalWeeks)
    : null;

  useEffect(() => {
    if (!data) return;
    setWeek(currentWeekOf(data.semester.startDate, data.semester.totalWeeks) ?? 1);
  }, [data?.updatedAt, data?.semester.startDate, data?.semester.totalWeeks]);

  const conflicts = useMemo(
    () => (data ? findConflicts(data.courses, week) : []),
    [data, week],
  );
  const visibleCount = useMemo(
    () =>
      data
        ? data.courses.filter((course) =>
            course.sessions.some((session) => session.weeks.includes(week)),
          ).length
        : 0,
    [data, week],
  );

  async function handleFile(file: File) {
    setParsing(true);
    setParseError(null);
    setNotice(null);
    try {
      const result = await parseTimetableFile(file);
      if (!result.courses.length) {
        setParseError(
          result.warnings[0] ??
            "没有从这份文件里识别出课程。请换一份带「星期 / 节次」表头的 Excel，或手动建课表。",
        );
        return;
      }
      setParseResult(result);
    } catch {
      setParseError(
        "文件读取失败。请确认是 .xls / .xlsx / .csv 格式的课表文件；也可以手动建课表。",
      );
    } finally {
      setParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleConfirm(courses: Course[], semester: Semester) {
    if (!parseResult) return;
    const next: TimetableData = {
      courses,
      semester,
      updatedAt: new Date().toISOString(),
      sourceLabel: parseResult.sourceLabel,
    };
    try {
      await onSave(next);
      setNotice(`已导入 ${courses.length} 门课 · 共 ${semester.totalWeeks} 周`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "写入本机失败。");
    }
    setParseResult(null);
  }

  async function handleManualSubmit() {
    if (!form.name.trim()) {
      setFormError("请填写课程名。");
      return;
    }
    const weeks = expandWeeksText(form.weeks);
    if (!weeks) {
      setFormError("周次无法识别，示例：1-16、1-8,10-16、2-16双。");
      return;
    }
    if (form.endPeriod < form.startPeriod) {
      setFormError("结束节不能早于起始节。");
      return;
    }

    const maxWeek = Math.max(...weeks);
    const base: TimetableData = data ?? {
      courses: [],
      semester: {
        totalWeeks: Math.max(16, maxWeek),
      },
      updatedAt: new Date().toISOString(),
      sourceLabel: "手动录入",
    };

    const course: Course = {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `manual-${Date.now()}`,
      name: form.name.trim(),
      teacher: form.teacher.trim() || undefined,
      location: form.location.trim() || undefined,
      color: "slate",
      confidence: "high",
      source: "manual",
      sessions: [
        {
          day: form.day as Course["sessions"][number]["day"],
          startPeriod: form.startPeriod,
          endPeriod: form.endPeriod,
          weeks,
        },
      ],
    };

    const next: TimetableData = {
      ...base,
      courses: [...base.courses, course],
      semester: {
        ...base.semester,
        totalWeeks: Math.max(base.semester.totalWeeks, maxWeek),
      },
      updatedAt: new Date().toISOString(),
      sourceLabel: base.sourceLabel ?? "手动录入",
    };

    try {
      await onSave(next);
      setNotice(`已手动添加《${course.name}》`);
      setManualOpen(false);
      setForm(EMPTY_FORM);
      setFormError(null);
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "写入本机失败，请检查浏览器存储权限。",
      );
    }
  }

  if (!data) {
    return (
      <div className="px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="mx-auto w-full max-w-3xl">
          <EmptyHeader />
          <div className="border-rule rounded-xl border bg-surface p-5 sm:p-8">
            <h2 className="text-lg font-medium tracking-tight">
              先把这学期的课表放进来
            </h2>
            <p className="mt-2 max-w-lg text-sm leading-6 text-ink-3">
              解析后先对照原表确认，再写入本机。单双周会自动展开成具体周次，
              之后每周切换只看当周课程。
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={parsing}
                className="bg-ink text-paper inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-6 text-sm font-medium disabled:opacity-60"
              >
                {parsing ? "正在解析…" : "导入 Excel 课表"}
              </button>
              <button
                type="button"
                onClick={() => void onUseSample()}
                className="border-rule hover:bg-ink/[0.03] inline-flex min-h-11 items-center justify-center rounded-xl border px-5 text-sm"
              >
                用示例课表
              </button>
              <button
                type="button"
                onClick={() => setManualOpen(true)}
                className="inline-flex min-h-11 items-center justify-center px-2 text-sm text-ink-3 underline underline-offset-4 hover:text-ink"
              >
                手动建课表
              </button>
            </div>

            {parseError && (
              <p
                role="alert"
                className="border-amber/50 bg-amber/[0.07] mt-4 rounded-lg border-l-2 px-3 py-2 text-xs leading-5 text-ink-2"
              >
                {parseError}
              </p>
            )}

            <div className="border-rule mt-6 border-t pt-4">
              <p className="text-xs leading-5 text-ink-3">
                建议使用 Excel：教务系统导出的 .xls / .xlsx 最完整，支持合并单元格、
                多工作表与单双周。截图导入需要视觉模型，且容易漏掉课程，
                当前版本暂未开放。
              </p>
            </div>
          </div>
          <PageFoot />
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xls,.xlsx,.csv"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
        {manualOpen && (
          <ManualDialog
            form={form}
            error={formError}
            onChange={setForm}
            onCancel={() => {
              setManualOpen(false);
              setFormError(null);
            }}
            onSubmit={handleManualSubmit}
          />
        )}
      </div>
    );
  }

  return (
    <div className="px-4 pb-10 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <header className="border-rule flex flex-col gap-4 border-b py-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-micro tracking-[0.2em] text-ink-3">
              工具箱
            </p>
            <div className="mt-2 flex items-baseline gap-3">
              <h1 className="font-serif text-2xl tracking-tight sm:text-3xl">
                课表
              </h1>
              {currentWeek !== null && (
                <span
                  className={[
                    "rounded-full px-2 py-0.5 font-mono text-micro",
                    week === currentWeek
                      ? "bg-accent/15 text-ink"
                      : "bg-ink/[0.05] text-ink-3",
                  ].join(" ")}
                >
                  {week === currentWeek ? "本周" : "非本周"}
                </span>
              )}
            </div>
            <p className="mt-2 text-xs leading-5 text-ink-3">
              {data.semester.name ?? "未命名学期"} · 共 {data.semester.totalWeeks} 周
              {data.semester.startDate ? ` · ${data.semester.startDate} 开学` : ""}
              {" · "}
              {data.courses.length} 门课
              {data.sourceLabel ? ` · ${data.sourceLabel}` : ""}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="border-rule flex items-center rounded-lg border bg-surface">
              <button
                type="button"
                aria-label="上一周"
                onClick={() => setWeek((value) => Math.max(1, value - 1))}
                disabled={week <= 1}
                className="flex h-10 w-10 items-center justify-center rounded-l-lg text-ink-3 disabled:opacity-30"
              >
                ‹
              </button>
              <label className="border-rule border-x">
                <span className="sr-only">选择周次</span>
                <select
                  value={week}
                  onChange={(event) => setWeek(Number(event.target.value))}
                  className="h-10 bg-transparent px-2 pr-6 text-sm font-medium outline-none"
                >
                  {Array.from(
                    { length: data.semester.totalWeeks },
                    (_, index) => index + 1,
                  ).map((item) => (
                    <option key={item} value={item}>
                      第 {item} 周
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                aria-label="下一周"
                onClick={() =>
                  setWeek((value) =>
                    Math.min(data.semester.totalWeeks, value + 1),
                  )
                }
                disabled={week >= data.semester.totalWeeks}
                className="flex h-10 w-10 items-center justify-center rounded-r-lg text-ink-3 disabled:opacity-30"
              >
                ›
              </button>
            </div>

            {currentWeek !== null && week !== currentWeek && (
              <button
                type="button"
                onClick={() => setWeek(currentWeek)}
                className="border-rule hover:bg-ink/[0.03] inline-flex h-10 items-center rounded-lg border px-3 text-xs"
              >
                回到本周
              </button>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={parsing}
              className="border-rule hover:bg-ink/[0.03] inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-xs disabled:opacity-60"
            >
              {parsing ? "解析中…" : "导入 / 更新"}
            </button>
            <button
              type="button"
              onClick={() => setManualOpen(true)}
              className="hover:bg-ink/[0.04] inline-flex h-10 items-center rounded-lg px-3 text-xs text-ink-3"
            >
              手动添加
            </button>
          </div>
        </header>

        {notice && (
          <p
            role="status"
            className="border-rule mt-4 flex items-center gap-2 rounded-lg border bg-surface px-3 py-2 text-xs text-ink-3"
          >
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-accent" />
            {notice}
          </p>
        )}

        {parseError && (
          <div
            role="alert"
            className="border-amber/50 bg-amber/[0.06] mt-4 rounded-lg border-l-2 px-3 py-2 text-xs leading-5 text-ink-2"
          >
            <p>{parseError}</p>
            <button
              type="button"
              onClick={() => setManualOpen(true)}
              className="mt-1 underline underline-offset-2"
            >
              改用手动建课表
            </button>
          </div>
        )}

        <div className="mt-5">
          <TimetableGrid
            courses={data.courses}
            semester={data.semester}
            week={week}
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-ink-3">
          <p>
            第 {week} 周 · {visibleCount} 门课有安排
            {visibleCount === 0 ? "（本周无课，可切换其他周查看）" : ""}
          </p>
          <p className="font-mono tracking-[0.04em]">
            {data.sourceLabel === "示例课表" ? "示例数据" : "本机数据"}
          </p>
        </div>

        {conflicts.length > 0 && (
          <section className="border-amber/50 bg-amber/[0.05] mt-5 rounded-xl border-l-2 px-4 py-3">
            <h2 className="text-xs font-medium text-ink">
              本周有 {conflicts.length} 处时间重叠（只提示，不阻止）
            </h2>
            <ul className="mt-2 space-y-1 text-xs leading-5 text-ink-3">
              {conflicts.slice(0, 4).map((conflict, index) => (
                <li key={`${conflict.a.id}-${conflict.b.id}-${index}`}>
                  {DAY_LABELS[conflict.day - 1]} 第 {conflict.startPeriod}-
                  {conflict.endPeriod} 节 ·《{conflict.a.name}》×《
                  {conflict.b.name}》
                </li>
              ))}
            </ul>
            {conflicts.length > 4 && (
              <p className="mt-1 text-[11px] text-ink-3">
                还有 {conflicts.length - 4} 处未列出。
              </p>
            )}
          </section>
        )}

        <details className="border-rule group mt-6 rounded-xl border bg-surface/60 px-4 py-3">
          <summary className="cursor-pointer list-none text-xs text-ink-3">
            导入说明 · 支持 .xls / .xlsx / .csv
            <span className="ml-2 font-mono text-micro text-ink-4">
              单双周自动展开
            </span>
          </summary>
          <div className="mt-3 space-y-2 text-xs leading-6 text-ink-3">
            <p>
              推荐从教务系统导出 Excel：能保留合并单元格、多工作表与“单/双周”标注。
              导入前会左右对照原表，低置信的课程标黄，可改周次、节次或整门删除。
            </p>
            <p className="text-ink-3">
              截图导入依赖视觉模型，容易漏掉未出现在截图里的课程，当前版本暂未开放。
              所有课表只保存在本机浏览器，不上传服务器。
            </p>
          </div>
        </details>

        <PageFoot />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xls,.xlsx,.csv"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />

      {parseResult && (
        <ParseConfirm
          result={parseResult}
          onCancel={() => setParseResult(null)}
          onConfirm={handleConfirm}
        />
      )}

      {manualOpen && (
        <ManualDialog
          form={form}
          error={formError}
          onChange={setForm}
          onCancel={() => {
            setManualOpen(false);
            setFormError(null);
          }}
          onSubmit={handleManualSubmit}
        />
      )}
    </div>
  );
}

function EmptyHeader() {
  return (
    <div className="mb-5">
      <p className="font-mono text-micro tracking-[0.2em] text-ink-3">
        工具箱
      </p>
      <h1 className="mt-2 font-serif text-2xl tracking-tight sm:text-3xl">
        课表
      </h1>
      <p className="mt-2 text-sm text-ink-3">
        管好每周上什么，是这份档案的第一块地基。
      </p>
    </div>
  );
}

function PageFoot() {
  return (
    <p className="mt-6 flex items-center gap-2 text-[11px] text-ink-4">
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-accent" />
      数据只存在你的浏览器
    </p>
  );
}

function ManualDialog({
  form,
  error,
  onChange,
  onCancel,
  onSubmit,
}: {
  form: ManualForm;
  error: string | null;
  onChange: (form: ManualForm) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  const field =
    "border-rule focus-visible:border-accent-ink focus-visible:ring-2 focus-visible:ring-accent/45 h-9 w-full rounded-md border bg-surface px-2 text-sm outline-none";
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/30 p-0 sm:items-center sm:p-6">
      <div className="bg-paper max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-2xl p-5 sm:rounded-2xl sm:p-6">
        <div className="flex items-baseline justify-between">
          <h2 className="text-base font-medium">手动添加课程</h2>
          <span className="font-mono text-micro text-ink-4">一次一段</span>
        </div>

        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1 block text-[11px] text-ink-3">课程名</span>
            <input
              value={form.name}
              onChange={(event) => onChange({ ...form, name: event.target.value })}
              className={field}
              placeholder="如 数据结构"
              autoFocus
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-[11px] text-ink-3">教师</span>
              <input
                value={form.teacher}
                onChange={(event) =>
                  onChange({ ...form, teacher: event.target.value })
                }
                className={field}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] text-ink-3">地点</span>
              <input
                value={form.location}
                onChange={(event) =>
                  onChange({ ...form, location: event.target.value })
                }
                className={field}
              />
            </label>
          </div>

          <div className="grid grid-cols-[1fr_72px_16px_72px] items-end gap-2">
            <label className="block">
              <span className="mb-1 block text-[11px] text-ink-3">星期</span>
              <select
                value={form.day}
                onChange={(event) =>
                  onChange({ ...form, day: Number(event.target.value) })
                }
                className={field}
              >
                {DAY_LABELS.map((label, index) => (
                  <option key={label} value={index + 1}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] text-ink-3">起始节</span>
              <input
                type="number"
                min={1}
                max={12}
                value={form.startPeriod}
                onChange={(event) =>
                  onChange({
                    ...form,
                    startPeriod: Number(event.target.value) || 1,
                  })
                }
                className={field}
              />
            </label>
            <span className="pb-2 text-center text-ink-4">–</span>
            <label className="block">
              <span className="mb-1 block text-[11px] text-ink-3">结束节</span>
              <input
                type="number"
                min={1}
                max={12}
                value={form.endPeriod}
                onChange={(event) =>
                  onChange({
                    ...form,
                    endPeriod: Number(event.target.value) || 1,
                  })
                }
                className={field}
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-[11px] text-ink-3">
              周次（单双周请写「2-16双」或「1-15单」）
            </span>
            <input
              value={form.weeks}
              onChange={(event) => onChange({ ...form, weeks: event.target.value })}
              className={field}
              placeholder="1-16"
            />
          </label>

          {error && (
            <p role="alert" className="text-[11px] leading-5 text-amber-ink">
              {error}
            </p>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="border-rule inline-flex min-h-10 items-center rounded-lg border px-4 text-sm"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onSubmit}
            className="bg-ink text-paper inline-flex min-h-10 items-center rounded-lg px-5 text-sm"
          >
            添加到课表
          </button>
        </div>
      </div>
    </div>
  );
}
