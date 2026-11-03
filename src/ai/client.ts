import { z } from "zod";
import type { ParsedAssignment } from "../parse/assignments";
import { normalizeDueText } from "../parse/assignments";

const PROXY_URL = (
  (import.meta.env.VITE_AI_PROXY_URL as string | undefined) ?? ""
)
  .trim()
  .replace(/\/+$/, "");

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export type VisionErrorCode =
  | "unconfigured"
  | "unsupported"
  | "too-large"
  | "network"
  | "invalid";

export class VisionError extends Error {
  readonly code: VisionErrorCode;
  retryable = false;

  constructor(code: VisionErrorCode, message: string) {
    super(message);
    this.name = "VisionError";
    this.code = code;
  }
}

export function isVisionConfigured(): boolean {
  return Boolean(PROXY_URL);
}

const responseSchema = z.object({
  items: z
    .array(
      z.object({
        title: z.string().min(1).max(120),
        courseName: z.string().max(60).nullish(),
        due: z.string().max(60).nullish(),
        detail: z.string().max(300).nullish(),
        kind: z
          .enum(["homework", "contest", "internship", "other"])
          .optional(),
        confidence: z.enum(["high", "low"]).optional(),
      }),
    )
    .max(50),
  warnings: z.array(z.string().max(200)).optional(),
});

export interface VisionParseResult {
  items: ParsedAssignment[];
  warnings: string[];
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () =>
      reject(new VisionError("unsupported", "图片读取失败 请换一张截图"));
    reader.readAsDataURL(file);
  });
}

async function requestOnce(body: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch(PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: controller.signal,
    });
    if (!response.ok) {
      const error = new VisionError(
        "invalid",
        `解析服务返回 ${response.status} 请稍后重试或改用手动录入`,
      );
      error.retryable = response.status >= 500;
      throw error;
    }
    return (await response.json()) as unknown;
  } catch (error) {
    if (error instanceof VisionError) throw error;
    const wrapped = new VisionError(
      "network",
      "网络中断或解析超时（45 秒） 请重试或改用手动录入",
    );
    throw wrapped;
  } finally {
    window.clearTimeout(timer);
  }
}

async function requestWithRetry(body: string): Promise<unknown> {
  try {
    return await requestOnce(body);
  } catch (error) {
    const retryable =
      error instanceof VisionError &&
      (error.code === "network" || error.retryable === true);
    if (!retryable) throw error;
    await new Promise((resolve) => window.setTimeout(resolve, 800));
    return requestOnce(body);
  }
}

export async function extractAssignmentsFromImage(
  file: File,
): Promise<VisionParseResult> {
  if (!PROXY_URL) {
    throw new VisionError(
      "unconfigured",
      "视觉解析尚未配置 请改用粘贴文本或手动添加",
    );
  }
  if (!file.type.startsWith("image/")) {
    throw new VisionError("unsupported", "请上传 PNG / JPG 格式的截图");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new VisionError("too-large", "图片超过 8MB 请压缩后再试");
  }

  const dataUrl = await readAsDataUrl(file);
  const payload = JSON.stringify({
    task: "assignments-ocr",
    image: dataUrl,
    mimeType: file.type,
  });

  const raw = await requestWithRetry(payload);
  const parsed = responseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new VisionError(
      "invalid",
      "解析结果不完整 请重试或改用手动录入",
    );
  }

  const warnings = [...(parsed.data.warnings ?? [])];
  const items: ParsedAssignment[] = parsed.data.items.map((item) => {
    const { due } = normalizeDueText(item.due);
    const title = item.title.trim();
    const confidence =
      item.confidence ?? (due && title ? "high" : "low");
    return {
      title: title || "待补充标题",
      courseName: item.courseName?.trim() || undefined,
      due,
      kind: item.kind ?? "other",
      confidence: title ? confidence : "low",
      detail: item.detail?.trim() || undefined,
    };
  });

  if (items.some((item) => !item.due)) {
    warnings.push("有截图内容没有读到截止时间 请在确认页补全");
  }

  return { items, warnings };
}

export type TextTaskErrorCode =
  | "unconfigured"
  | "network"
  | "invalid"
  | "server";

export class TextTaskError extends Error {
  readonly code: TextTaskErrorCode;
  retryable = false;

  constructor(code: TextTaskErrorCode, message: string) {
    super(message);
    this.name = "TextTaskError";
    this.code = code;
  }
}

export function isTextTaskConfigured(): boolean {
  return Boolean(PROXY_URL);
}

export function isAiMockMode(): boolean {
  const flag = (
    (import.meta.env.VITE_AI_MOCK as string | undefined) ?? ""
  )
    .trim()
    .toLowerCase();
  return !PROXY_URL || flag === "1" || flag === "true";
}

export interface TextTaskRequest {
  task: string;
  system: string;
  input: unknown;
  model?: string;
}

function parseJsonContent(value: string): unknown {
  const trimmed = value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  return JSON.parse(trimmed) as unknown;
}

function extractJsonPayload(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const record = raw as Record<string, unknown>;

  if (Array.isArray(record.bullets)) return raw;
  if (typeof record.content === "string") {
    return parseJsonContent(record.content);
  }
  if (Array.isArray(record.choices)) {
    const first = record.choices[0] as
      | { message?: { content?: unknown } }
      | undefined;
    if (typeof first?.message?.content === "string") {
      return parseJsonContent(first.message.content);
    }
  }
  if (record.data && typeof record.data === "object") {
    return record.data;
  }
  if (typeof record.result === "string") {
    return parseJsonContent(record.result);
  }
  return raw;
}

async function postTextTask(body: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 45_000);

  try {
    const response = await fetch(PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: controller.signal,
    });
    if (!response.ok) {
      const error = new TextTaskError(
        response.status >= 500 ? "server" : "invalid",
        `模型服务返回 ${response.status}。`,
      );
      error.retryable = response.status >= 500;
      throw error;
    }

    let raw: unknown;
    try {
      raw = (await response.json()) as unknown;
    } catch {
      throw new TextTaskError("invalid", "模型返回的不是合法 JSON");
    }

    try {
      return extractJsonPayload(raw);
    } catch {
      throw new TextTaskError("invalid", "模型返回内容无法解析为 JSON");
    }
  } catch (error) {
    if (error instanceof TextTaskError) throw error;
    throw new TextTaskError("network", "网络中断或模型超时（45 秒）");
  } finally {
    window.clearTimeout(timer);
  }
}

export async function requestTextJson(
  request: TextTaskRequest,
): Promise<unknown> {
  if (!PROXY_URL) {
    throw new TextTaskError("unconfigured", "尚未配置模型代理");
  }

  const body = JSON.stringify({
    task: request.task,
    model: request.model ?? "qwen-plus",
    system: request.system,
    input: request.input,
    responseFormat: "json",
  });

  try {
    return await postTextTask(body);
  } catch (error) {
    const retryable =
      error instanceof TextTaskError &&
      (error.code === "network" || error.retryable);
    if (!retryable) throw error;
    await new Promise((resolve) => window.setTimeout(resolve, 800));
    return postTextTask(body);
  }
}
