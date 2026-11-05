/** 规则文档口径：单次输入截断 12k 字符 */
export const MAX_INPUT_CHARS = 12_000;

/** 短字段不削：技能名、指标标签这类一旦被切成「Fig…」就是给模型喂错信息 */
const MIN_LEAF_CHARS = 48;

/** 均摊比例最多迭代这么多轮：每轮按新的长度重算，收敛到上限以内 */
const MAX_ROUNDS = 6;

export function serializedSize(value: unknown): number {
  try {
    return JSON.stringify(value)?.length ?? 0;
  } catch {
    return 0;
  }
}

function stringBytes(value: unknown): number {
  if (typeof value === "string") return value.length;
  if (Array.isArray(value)) {
    return value.reduce((total, item) => total + stringBytes(item), 0);
  }
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).reduce<number>(
      (total, item) => total + stringBytes(item),
      0,
    );
  }
  return 0;
}

function roomFor(length: number, ratio: number): number {
  if (length <= MIN_LEAF_CHARS) return length;
  return Math.max(MIN_LEAF_CHARS, Math.floor(length * ratio));
}

function scaleStrings(value: unknown, ratio: number): unknown {
  if (typeof value === "string") {
    const room = roomFor(value.length, ratio);
    if (room >= value.length) return value;
    return `${value.slice(0, room - 1)}…`;
  }
  if (Array.isArray(value)) {
    return value.map((item) => scaleStrings(item, ratio));
  }
  if (value && typeof value === "object") {
    const next: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      next[key] = scaleStrings(item, ratio);
    }
    return next;
  }
  return value;
}

/**
 * 超限时按比例均摊削所有长字段，而不是把最长那条一路清零：
 * 四段式里砍空 problem 与 method，模型就以为用户没写这两段。
 * 键名与括号本身已经超 12k 时保留原文，本项目没有这种输入形态。
 */
export function clampInput(input: unknown): unknown {
  let next = input;
  for (let round = 0; round < MAX_ROUNDS; round++) {
    const size = serializedSize(next);
    if (size <= MAX_INPUT_CHARS) return next;
    const bytes = stringBytes(next);
    const allowed = MAX_INPUT_CHARS - (size - bytes);
    if (bytes <= 0 || allowed <= 0) return next;
    next = scaleStrings(next, Math.min(1, allowed / bytes));
    if (serializedSize(next) >= size) return next;
  }
  return next;
}
