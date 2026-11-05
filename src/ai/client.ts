import { z } from "zod";
import type { ParsedAssignment } from "../parse/assignments";
import { normalizeDueText } from "../parse/assignments";
import {
  ASSIGNMENT_OCR_SYSTEM_PROMPT,
} from "./rules";
import { byokConfig, chatCompletionsUrl, type AiConfig } from "./config";

const PROXY_URL = (
  (import.meta.env.VITE_AI_PROXY_URL as string | undefined) ?? ""
)
  .trim()
  .replace(/\/+$/, "");

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const TIMEOUT_MS = 45_000;

export type AiTransport = "byok" | "proxy" | "none";

const CONFIG_HINT =
  "尚未接入模型 在顶栏灵动岛展开「模型接入」填你自己的 Key 或用本机原文兜底";
const VISION_HINT = "视觉解析尚未接入 请改用粘贴文本或手动添加";
const CORS_HINT =
  "浏览器直连被拦或网络中断（45 秒） 请确认地址是 https 且服务商允许跨域 或改用粘贴文本";

/** 内部传输错误，由各个公开入口换成自己的错误类型 */
class TransportError extends Error {
  readonly code: "network" | "invalid" | "server";
  readonly retryable: boolean;

  constructor(
    code: "network" | "invalid" | "server",
    message: string,
    retryable = false,
  ) {
    super(message);
    this.name = "TransportError";
    this.code = code;
    this.retryable = retryable;
  }
}

function isForcedMock(): boolean {
  const flag = (
    (import.meta.env.VITE_AI_MOCK as string | undefined) ?? ""
  )
    .trim()
    .toLowerCase();
  return flag === "1" || flag === "true";
}

export function activeTransport(): AiTransport {
  if (isForcedMock()) return "none";
  if (byokConfig()) return "byok";
  return PROXY_URL ? "proxy" : "none";
}

export function isAiMockMode(): boolean {
  return activeTransport() === "none";
}

export function isTextTaskConfigured(): boolean {
  return activeTransport() !== "none";
}

type VisionTransport =
  | { kind: "byok"; config: AiConfig }
  | { kind: "proxy" };

function visionTransport(): VisionTransport | null {
  if (isForcedMock()) return null;
  const config = byokConfig();
  if (config) {
    return config.visionModel.trim()
      ? { kind: "byok", config }
      : null;
  }
  return PROXY_URL ? { kind: "proxy" } : null;
}

export function isVisionConfigured(): boolean {
  return visionTransport() !== null;
}

export function visionBlockedReason(): string {
  const config = byokConfig();
  if (config && !config.visionModel.trim()) {
    return "这个服务商没有视觉模型 视觉解析请留空或改用粘贴文本与手动添加";
  }
  return VISION_HINT;
}

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

async function readJson(response: Response): Promise<unknown> {
  try {
    return (await response.json()) as unknown;
  } catch {
    throw new TransportError("invalid", "模型返回的不是合法 JSON");
  }
}

async function readErrorDetail(response: Response): Promise<string> {
  try {
    const text = await response.text();
    const parsed = JSON.parse(text) as {
      error?: { message?: unknown };
    };
    const message =
      typeof parsed.error?.message === "string" ? parsed.error.message : "";
    return message.slice(0, 140);
  } catch {
    return "";
  }
}

function providerFailure(
  status: number,
  detail: string,
): { code: "invalid" | "server"; message: string; retryable: boolean } {
  if (status === 401 || status === 403) {
    return {
      code: "invalid",
      message: `服务商拒了这把 Key（${status}） 请到控制台核对 API-KEY 与模型权限`,
      retryable: false,
    };
  }
  if (status === 404) {
    return {
      code: "invalid",
      message: "端点或模型名不存在（404） 请检查接入地址与模型名",
      retryable: false,
    };
  }
  if (status === 429) {
    return {
      code: "server",
      message: "服务商限速或额度已用完（429） 稍后再试",
      retryable: true,
    };
  }
  if (status >= 500) {
    return {
      code: "server",
      message: `服务商返回 ${status} 请稍后重试或改用手动录入`,
      retryable: true,
    };
  }
  return {
    code: "invalid",
    message: `服务商返回 ${status}${detail ? ` ${detail}` : ""}`,
    retryable: false,
  };
}

async function postChat(
  config: AiConfig,
  body: string,
): Promise<unknown> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(chatCompletionsUrl(config.baseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body,
      signal: controller.signal,
    });
    if (!response.ok) {
      const detail = await readErrorDetail(response);
      const failure = providerFailure(response.status, detail);
      throw new TransportError(
        failure.code,
        failure.message,
        failure.retryable,
      );
    }
    return await readJson(response);
  } catch (error) {
    if (error instanceof TransportError) throw error;
    throw new TransportError("network", CORS_HINT, true);
  } finally {
    window.clearTimeout(timer);
  }
}

async function postProxy(body: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new TransportError(
        response.status >= 500 ? "server" : "invalid",
        `解析服务返回 ${response.status} 请稍后重试或改用手动录入`,
        response.status >= 500,
      );
    }
    return await readJson(response);
  } catch (error) {
    if (error instanceof TransportError) throw error;
    throw new TransportError(
      "network",
      "网络中断或解析超时（45 秒） 请重试或改用手动录入",
      true,
    );
  } finally {
    window.clearTimeout(timer);
  }
}

function isRetryable(error: unknown): boolean {
  return (
    error instanceof TransportError &&
    (error.code === "network" || error.retryable)
  );
}

async function withRetry(send: () => Promise<unknown>): Promise<unknown> {
  try {
    return await send();
  } catch (error) {
    if (!isRetryable(error)) throw error;
    await new Promise((resolve) => window.setTimeout(resolve, 800));
    return send();
  }
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
  if (Array.isArray(record.items)) return raw;
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

function chatBody(
  model: string,
  system: string,
  content: unknown,
  jsonMode: boolean,
): string {
  return JSON.stringify({
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content },
    ],
    temperature: 0.2,
    ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
  });
}

function unwrapOrThrow(raw: unknown): unknown {
  try {
    return extractJsonPayload(raw);
  } catch {
    throw new TransportError("invalid", "模型返回内容无法解析为 JSON");
  }
}

export async function extractAssignmentsFromImage(
  file: File,
): Promise<VisionParseResult> {
  const route = visionTransport();
  if (!route) {
    throw new VisionError("unconfigured", visionBlockedReason());
  }
  if (!file.type.startsWith("image/")) {
    throw new VisionError("unsupported", "请上传 PNG / JPG 格式的截图");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new VisionError("too-large", "图片超过 8MB 请压缩后再试");
  }

  const dataUrl = await readAsDataUrl(file);
  const body =
    route.kind === "byok"
      ? chatBody(
          route.config.visionModel.trim(),
          ASSIGNMENT_OCR_SYSTEM_PROMPT,
          [
            { type: "text", text: "把这张学习截图读成待办清单" },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
          false,
        )
      : JSON.stringify({
          task: "assignments-ocr",
          image: dataUrl,
          mimeType: file.type,
        });

  let raw: unknown;
  try {
    raw = await withRetry(() =>
      route.kind === "byok"
        ? postChat(route.config, body)
        : postProxy(body),
    );
    raw = unwrapOrThrow(raw);
  } catch (error) {
    throw toVisionError(error);
  }

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

function toVisionError(error: unknown): VisionError {
  if (error instanceof VisionError) return error;
  const wrapped = new VisionError(
    error instanceof TransportError && error.code === "network"
      ? "network"
      : "invalid",
    error instanceof TransportError
      ? error.message
      : "解析失败 请重试或改用手动录入",
  );
  wrapped.retryable =
    error instanceof TransportError && (error.code === "network" || error.retryable);
  return wrapped;
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

export interface TextTaskRequest {
  task: string;
  system: string;
  input: unknown;
  model?: string;
}

function toTextTaskError(error: unknown): TextTaskError {
  if (error instanceof TextTaskError) return error;
  const wrapped = new TextTaskError(
    error instanceof TransportError ? error.code : "network",
    error instanceof TransportError
      ? error.message
      : "模型暂不可用",
  );
  wrapped.retryable = isRetryable(error);
  return wrapped;
}

export async function requestTextJson(
  request: TextTaskRequest,
): Promise<unknown> {
  const transport = activeTransport();

  if (transport === "byok") {
    const config = byokConfig();
    if (!config) throw new TextTaskError("unconfigured", CONFIG_HINT);
    const model = request.model ?? config.textModel.trim();
    if (!model) {
      throw new TextTaskError(
        "unconfigured",
        "模型名没填 请到「模型接入」补上",
      );
    }
    try {
      const raw = await withRetry(async () => {
        try {
          return await postChat(
            config,
            chatBody(model, request.system, JSON.stringify(request.input), true),
          );
        } catch (error) {
          // 有些兼容端点不认 JSON 模式，退回普通对话再试一次
          if (
            error instanceof TransportError &&
            error.code === "invalid" &&
            /response_format|json_object|json mode/i.test(error.message)
          ) {
            return postChat(
              config,
              chatBody(
                model,
                `${request.system}\n只输出 JSON 对象本身，不要代码围栏。`,
                JSON.stringify(request.input),
                false,
              ),
            );
          }
          throw error;
        }
      });
      return unwrapOrThrow(raw);
    } catch (error) {
      throw toTextTaskError(error);
    }
  }

  if (transport === "proxy") {
    const body = JSON.stringify({
      task: request.task,
      model: request.model ?? "qwen-plus",
      system: request.system,
      input: request.input,
      responseFormat: "json",
    });
    try {
      const raw = await withRetry(() => postProxy(body));
      return unwrapOrThrow(raw);
    } catch (error) {
      throw toTextTaskError(error);
    }
  }

  throw new TextTaskError("unconfigured", CONFIG_HINT);
}

export interface ConnectionTestResult {
  ok: boolean;
  message: string;
}

export async function testConnection(): Promise<ConnectionTestResult> {
  const transport = activeTransport();
  if (transport === "proxy") {
    return { ok: true, message: "构建期已配代理 端点可达 未消耗你的额度" };
  }
  if (transport !== "byok") {
    return { ok: false, message: "还没有可用的 Key 与地址" };
  }
  const config = byokConfig();
  if (!config) return { ok: false, message: "还没有可用的 Key 与地址" };
  const model = config.textModel.trim();
  if (!model) return { ok: false, message: "模型名没填" };
  const startedAt = Date.now();
  try {
    await postChat(
      config,
      chatBody(model, "只回复两个字：已连通", "ping", false),
    );
    return {
      ok: true,
      message: `已连通 ${((Date.now() - startedAt) / 1000).toFixed(1)} 秒`,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof TransportError
          ? error.message
          : "连接失败 请重试或检查地址",
    };
  }
}
