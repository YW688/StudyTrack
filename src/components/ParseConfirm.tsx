import { useMemo, useState } from "react";
import type {
  Course,
  CourseSession,
  DayOfWeek,
  RawSheet,
  Semester,
  TimetableParseResult,
} from "../types";
import { DAY_LABELS } from "../types";
import { expandWeeksText, formatWeeksLabel } from "../parse/schedule";

interface DraftSession extends CourseSession {
  uid: string;
}

interface DraftCourse extends Omit<Course, "sessions"> {
  sessions: DraftSession[];
}

interface ParseConfirmProps {
  result: TimetableParseResult;
  onCancel: () => void;
  onConfirm: (courses: Course[], semester: Semester) => Promise<void>;
}

function makeUid(): string {
  return Math.random().toString(36).slice(2);
}

function toDraft(courses: Course[]): DraftCourse[] {
  return courses.map((course) => ({
    ...course,
    sessions: course.sessions.map((session) => ({
      ...session,
      uid: makeUid(),
    })),
  }));
}

function WeeksInput({
  value,
  onChange,
}: {
  value: number[];
  onChange: (weeks: number[]) => void;
}) {
  const [text, setText] = useState(value.length ? formatWeeksLabel(value) : "");
  const [invalid, setInvalid] = useState(false);

  return (
    <label className="block">
      <span className="sr-only">周次</span>
      <input
        value={text}
        onChange={(event) => {
          const next = event.target.value;
          setText(next);
          const weeks = expandWeeksText(next);
          setInvalid(!weeks);
          if (weeks) onChange(weeks);
        }}
        onBlur={() => {
          if (!text.trim()) {
            setInvalid(true);
            return;
          }
          const weeks = expandWeeksText(text);
          if (weeks) {
            setInvalid(false);
            onChange(weeks);
            setText(formatWeeksLabel(weeks));
          } else {
            setInvalid(true);
          }
        }}
        placeholder="如 1-16 或 2-16双"
        aria-invalid={invalid}
        className={[
          "h-8 w-full rounded-md border bg-white px-2 font-mono text-[11px] outline-none",
          invalid
            ? "border-amber bg-amber/[0.04] text-ink"
            : "border-rule focus:border-ink/40",
        ].join(" ")}
      />
      {invalid && (
        <span className="mt-0.5 block text-[10px] text-amber">
          周次写法无法识别，如「1-16」「1-8,10-16」「2-16双」
        </span>
      )}
    </label>
  );
}

export default function ParseConfirm({
  result,
  onCancel,
  onConfirm,
}: ParseConfirmProps) {
  const [draft, setDraft] = useState<DraftCourse[]>(() =>
    toDraft(result.courses),
  );
  const [sheetIndex, setSheetIndex] = useState(0);
  const [saving, setSaving] = useState(false);

  const sheet = result.sheets[sheetIndex];
  const sessionCount = useMemo(
    () => draft.reduce((sum, course) => sum + course.sessions.length, 0),
    [draft],
  );
  const invalidCount = useMemo(
    () =>
      draft.reduce(
        (sum, course) =>
          sum +
          course.sessions.filter(
            (session) =>
              !session.weeks.length || session.endPeriod < session.startPeriod,
          ).length,
        0,
      ),
    [draft],
  );

  function updateCourse(id: string, patch: Partial<DraftCourse>) {
    setDraft((current) =>
      current.map((course) => (course.id === id ? { ...course, ...patch } : course)),
    );
  }

  function updateSession(
    courseId: string,
    uid: string,
    patch: Partial<DraftSession>,
  ) {
    setDraft((current) =>
      current.map((course) =>
        course.id === courseId
          ? {
              ...course,
              sessions: course.sessions.map((session) =>
                session.uid === uid ? { ...session, ...patch } : session,
              ),
            }
          : course,
      ),
    );
  }

  function removeSession(courseId: string, uid: string) {
    setDraft((current) =>
      current.map((course) =>
        course.id === courseId
          ? {
              ...course,
              sessions: course.sessions.filter((session) => session.uid !== uid),
            }
          : course,
      ),
    );
  }

  function addSession(courseId: string) {
    setDraft((current) =>
      current.map((course) =>
        course.id === courseId
          ? {
              ...course,
              sessions: [
                ...course.sessions,
                {
                  uid: makeUid(),
                  day: 1,
                  startPeriod: 1,
                  endPeriod: 2,
                  weeks: [],
                },
              ],
            }
          : course,
      ),
    );
  }

  function removeCourse(id: string) {
    setDraft((current) => current.filter((course) => course.id !== id));
  }

  async function handleConfirm() {
    const cleaned: Course[] = draft
      .map((course): Course => ({
        ...course,
        name: course.name.trim(),
        teacher: course.teacher?.trim() || undefined,
        location: course.location?.trim() || undefined,
        sessions: course.sessions
          .filter(
            (session) =>
              session.weeks.length > 0 && session.endPeriod >= session.startPeriod,
          )
          .map(({ day, startPeriod, endPeriod, weeks }) => ({
            day,
            startPeriod,
            endPeriod,
            weeks,
          })),
        confidence:
          course.sessions.every(
            (session) =>
              session.weeks.length > 0 && session.endPeriod >= session.startPeriod,
          ) && course.name.trim()
            ? "high"
            : "low",
      }))
      .filter((course) => course.name && course.sessions.length);

    if (!cleaned.length) return;
    setSaving(true);
    try {
      await onConfirm(cleaned, result.semester);
    } finally {
      setSaving(false);
    }
  }

  const canConfirm =
    draft.length > 0 && invalidCount === 0 && draft.every((c) => c.name.trim());

  return (
    <div className="bg-paper fixed inset-0 z-50 flex flex-col">
      <header className="border-rule bg-paper/95 sticky top-0 z-10 border-b backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-mono text-[10px] tracking-[0.18em] text-ink/40">
              导入课表 · 第 2 步 / 共 3 步
            </p>
            <h1 className="mt-1 text-lg font-medium tracking-tight">
              核对解析结果
            </h1>
            <p className="mt-1 text-xs text-ink/55">
              {result.semester.name ?? "未识别学期"} · 共读取 {draft.length} 门课、
              {sessionCount} 个时段
              {result.semester.startDate
                ? ` · ${result.semester.startDate} 开学`
                : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="border-rule hover:bg-ink/[0.03] inline-flex min-h-10 items-center rounded-lg border px-4 text-sm"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!canConfirm || saving}
              className="bg-ink text-paper inline-flex min-h-10 items-center rounded-lg px-5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? "写入中…" : `确认导入 ${draft.length} 门课`}
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-2">
          <section aria-labelledby="raw-title">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 id="raw-title" className="text-sm font-medium">
                原始表格
              </h2>
              <span className="font-mono text-[10px] text-ink/35">只作对照</span>
            </div>

            {result.sheets.length > 1 && (
              <div className="mb-2 flex flex-wrap gap-1">
                {result.sheets.map((item, index) => (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => setSheetIndex(index)}
                    className={[
                      "rounded-md border px-2.5 py-1 text-[11px]",
                      index === sheetIndex
                        ? "border-ink/30 bg-ink/[0.06]"
                        : "border-rule text-ink/50",
                    ].join(" ")}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            )}

            {sheet ? (
              <RawTable sheet={sheet} />
            ) : (
              <p className="border-rule rounded-lg border p-4 text-sm text-ink/55">
                原始表格不可用，请以右侧结构化结果为准。
              </p>
            )}

            {result.warnings.length > 0 && (
              <ul className="border-amber/50 bg-amber/[0.06] mt-4 space-y-1 rounded-lg border-l-2 px-3 py-2 text-xs leading-5 text-ink/70">
                {result.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="parsed-title">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 id="parsed-title" className="text-sm font-medium">
                结构化结果
              </h2>
              <span className="font-mono text-[10px] text-ink/35">
                {invalidCount > 0 ? `${invalidCount} 个时段待修正` : "全部可识别"}
              </span>
            </div>

            <div className="space-y-3">
              {draft.map((course) => (
                <article
                  key={course.id}
                  className={[
                    "rounded-xl border bg-white p-3",
                    course.confidence === "low"
                      ? "border-amber/50 bg-amber/[0.03]"
                      : "border-rule",
                  ].join(" ")}
                >
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <label className="block">
                        <span className="mb-1 block font-mono text-[9px] tracking-[0.12em] text-ink/35">
                          课程名
                        </span>
                        <input
                          value={course.name}
                          onChange={(event) =>
                            updateCourse(course.id, { name: event.target.value })
                          }
                          className="border-rule focus:border-ink/40 h-9 w-full rounded-md border bg-white px-2 text-sm font-medium outline-none"
                        />
                      </label>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <label className="block">
                          <span className="mb-1 block font-mono text-[9px] tracking-[0.12em] text-ink/35">
                            教师
                          </span>
                          <input
                            value={course.teacher ?? ""}
                            onChange={(event) =>
                              updateCourse(course.id, {
                                teacher: event.target.value,
                              })
                            }
                            className="border-rule focus:border-ink/40 h-8 w-full rounded-md border bg-white px-2 text-xs outline-none"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1 block font-mono text-[9px] tracking-[0.12em] text-ink/35">
                            地点
                          </span>
                          <input
                            value={course.location ?? ""}
                            onChange={(event) =>
                              updateCourse(course.id, {
                                location: event.target.value,
                              })
                            }
                            className="border-rule focus:border-ink/40 h-8 w-full rounded-md border bg-white px-2 text-xs outline-none"
                          />
                        </label>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <span
                        className={[
                          "rounded-full px-2 py-0.5 font-mono text-[9px]",
                          course.confidence === "low"
                            ? "bg-amber/15 text-ink"
                            : "bg-ink/[0.06] text-ink/50",
                        ].join(" ")}
                      >
                        {course.confidence === "low" ? "待核对" : "已识别"}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeCourse(course.id)}
                        className="text-[11px] text-ink/40 underline underline-offset-2 hover:text-red-800"
                      >
                        删除整门
                      </button>
                    </div>
                  </div>

                  <div className="border-rule mt-3 border-t pt-2">
                    <div className="space-y-2">
                      {course.sessions.map((session) => {
                        const invalid =
                          !session.weeks.length ||
                          session.endPeriod < session.startPeriod;
                        return (
                          <div
                            key={session.uid}
                            className="grid grid-cols-[56px_38px_12px_38px_minmax(0,1fr)_24px] items-start gap-1.5"
                          >
                            <label>
                              <span className="sr-only">星期</span>
                              <select
                                value={session.day}
                                onChange={(event) =>
                                  updateSession(course.id, session.uid, {
                                    day: Number(event.target.value) as DayOfWeek,
                                  })
                                }
                                className="border-rule h-8 w-full rounded-md border bg-white px-1 text-[11px] outline-none"
                              >
                                {DAY_LABELS.map((label, index) => (
                                  <option key={label} value={index + 1}>
                                    {label}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label>
                              <span className="sr-only">起始节</span>
                              <input
                                type="number"
                                min={1}
                                max={12}
                                value={session.startPeriod}
                                onChange={(event) => {
                                  const start = Number(event.target.value) || 1;
                                  updateSession(course.id, session.uid, {
                                    startPeriod: start,
                                    endPeriod: Math.max(start, session.endPeriod),
                                  });
                                }}
                                className="border-rule h-8 w-full rounded-md border bg-white px-1 text-center font-mono text-[11px] outline-none"
                              />
                            </label>
                            <span className="pt-1.5 text-center text-[10px] text-ink/30">
                              –
                            </span>
                            <label>
                              <span className="sr-only">结束节</span>
                              <input
                                type="number"
                                min={1}
                                max={12}
                                value={session.endPeriod}
                                onChange={(event) =>
                                  updateSession(course.id, session.uid, {
                                    endPeriod: Number(event.target.value) || 1,
                                  })
                                }
                                className={[
                                  "h-8 w-full rounded-md border bg-white px-1 text-center font-mono text-[11px] outline-none",
                                  invalid ? "border-amber" : "border-rule",
                                ].join(" ")}
                              />
                            </label>
                            <WeeksInput
                              value={session.weeks}
                              onChange={(weeks) =>
                                updateSession(course.id, session.uid, { weeks })
                              }
                            />
                            <button
                              type="button"
                              onClick={() => removeSession(course.id, session.uid)}
                              aria-label="删除该时段"
                              className="mt-1 flex h-6 w-6 items-center justify-center rounded text-ink/35 hover:bg-ink/[0.05] hover:text-ink/70"
                            >
                              ×
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={() => addSession(course.id)}
                      className="mt-2 text-[11px] text-ink/45 underline underline-offset-2 hover:text-ink/75"
                    >
                      ＋ 添加时段
                    </button>
                  </div>
                </article>
              ))}

              {draft.length === 0 && (
                <p className="border-rule rounded-lg border p-4 text-sm text-ink/55">
                  没有可导入的课程。返回后可改用手动建课表。
                </p>
              )}
            </div>

            <p className="mt-4 text-[11px] leading-5 text-ink/40">
              确认后写入本机 IndexedDB，刷新不丢；随时可重新导入或清除。
              标黄的课程请核对周次与节次。
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

function RawTable({ sheet }: { sheet: RawSheet }) {
  const covered = new Set<string>();
  const spans = new Map<string, { rowSpan: number; colSpan: number }>();
  for (const merge of sheet.merges) {
    spans.set(`${merge.s.r}-${merge.s.c}`, {
      rowSpan: merge.e.r - merge.s.r + 1,
      colSpan: merge.e.c - merge.s.c + 1,
    });
    for (let r = merge.s.r; r <= merge.e.r; r += 1) {
      for (let c = merge.s.c; c <= merge.e.c; c += 1) {
        if (r !== merge.s.r || c !== merge.s.c) covered.add(`${r}-${c}`);
      }
    }
  }

  return (
    <div className="border-rule max-h-[60vh] overflow-auto rounded-lg border bg-white">
      <table className="w-max min-w-full border-collapse text-[10px]">
        <tbody>
          {sheet.rows.map((row, r) => {
            if (row.every((cell) => !cell)) return null;
            return (
              <tr key={r}>
                {row.map((cell, c) => {
                  if (covered.has(`${r}-${c}`)) return null;
                  const span = spans.get(`${r}-${c}`);
                  const isHeader = r === sheet.headerRow;
                  return (
                    <td
                      key={c}
                      rowSpan={span?.rowSpan}
                      colSpan={span?.colSpan}
                      className={[
                        "border-rule max-w-[220px] border px-1.5 py-1 align-top",
                        isHeader
                          ? "bg-ink/[0.04] text-center font-medium"
                          : "text-ink/70",
                      ].join(" ")}
                    >
                      <span className="line-clamp-6 whitespace-pre-wrap">
                        {cell ?? ""}
                      </span>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
