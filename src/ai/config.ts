export type ProviderPresetId = "bailian" | "deepseek" | "moonshot" | "custom";

export interface ProviderPreset {
  id: ProviderPresetId;
  label: string;
  baseUrl: string;
  textModel: string;
  visionModel: string;
  hint: string;
}

export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    id: "bailian",
    label: "阿里云百炼",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    textModel: "qwen-plus",
    visionModel: "qwen-vl-max",
    hint: "控制台建 API-KEY 按量计费 文本与作业截图都能解析",
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    textModel: "deepseek-chat",
    visionModel: "",
    hint: "没有视觉模型 作业截图请改用粘贴文本",
  },
  {
    id: "moonshot",
    label: "Kimi / Moonshot",
    baseUrl: "https://api.moonshot.cn/v1",
    textModel: "kimi-k2.6",
    visionModel: "",
    hint: "模型名以控制台列出的为准 可改",
  },
  {
    id: "custom",
    label: "自定义端点",
    baseUrl: "",
    textModel: "",
    visionModel: "",
    hint: "任何 OpenAI 兼容端点 含本机 Ollama 与自建中转",
  },
];

export interface AiConfig {
  preset: ProviderPresetId;
  baseUrl: string;
  apiKey: string;
  textModel: string;
  visionModel: string;
}

const CONFIG_KEY = "studytrack:ai-config";
const LOCAL_HOSTS = ["localhost", "127.0.0.1", "[::1]"];

export function presetOf(id: ProviderPresetId): ProviderPreset {
  return PROVIDER_PRESETS.find((item) => item.id === id) ?? PROVIDER_PRESETS[3];
}

export function normalizeBaseUrl(raw: string): string | null {
  const value = raw
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/chat\/completions$/i, "")
    .slice(0, 300);
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol === "https:") return value;
  if (url.protocol === "http:" && LOCAL_HOSTS.includes(url.hostname)) {
    return value;
  }
  return null;
}

export function chatCompletionsUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
}

function clamp(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function readStored(): AiConfig | null {
  try {
    const raw = window.localStorage.getItem(CONFIG_KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw) as Record<string, unknown>;
    const baseUrl = normalizeBaseUrl(clamp(stored.baseUrl, 300));
    if (!baseUrl) return null;
    const preset = PROVIDER_PRESETS.some((item) => item.id === stored.preset)
      ? (stored.preset as ProviderPresetId)
      : "custom";
    return {
      preset,
      baseUrl,
      apiKey: clamp(stored.apiKey, 200),
      textModel: clamp(stored.textModel, 80),
      visionModel: clamp(stored.visionModel, 80),
    };
  } catch {
    return null;
  }
}

let current: AiConfig | null = readStored();
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

export function getAiConfig(): AiConfig | null {
  return current;
}

export function subscribeAiConfig(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function saveAiConfig(next: AiConfig): {
  ok: boolean;
  message: string;
} {
  const baseUrl = normalizeBaseUrl(next.baseUrl);
  if (!baseUrl) {
    return {
      ok: false,
      message: "地址不是一个可用的 https 端点 本地 http 只认 localhost",
    };
  }
  const apiKey = next.apiKey.trim().slice(0, 200);
  if (!apiKey) return { ok: false, message: "没有 API-KEY 存不下" };
  const config: AiConfig = {
    preset: PROVIDER_PRESETS.some((item) => item.id === next.preset)
      ? next.preset
      : "custom",
    baseUrl,
    apiKey,
    textModel: next.textModel.trim().slice(0, 80),
    visionModel: next.visionModel.trim().slice(0, 80),
  };
  try {
    window.localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  } catch {
    return { ok: false, message: "浏览器不允许写入本机存储" };
  }
  current = config;
  emit();
  return { ok: true, message: "已存到本机浏览器" };
}

export function clearAiConfig(): void {
  try {
    window.localStorage.removeItem(CONFIG_KEY);
  } catch {
    // 存储不可用时只清内存态
  }
  current = null;
  emit();
}

export function byokConfig(): AiConfig | null {
  if (!current || current.apiKey.trim().length === 0) return null;
  return current;
}
