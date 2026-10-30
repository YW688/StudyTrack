import type { Experience, ResumeBullet } from "../../types";
import {
  isAiMockMode,
  requestTextJson,
  TextTaskError,
} from "../client";
import { RESUME_BULLET_SYSTEM_PROMPT } from "../rules";
import { aiBulletResponseSchema } from "../schema";
import { buildLocalBullets, validateAiBullets } from "../../lib/resume";

export interface GenerateBulletsOptions {
  excludeTexts?: string[];
}

export interface GenerateBulletsResult {
  bullets: ResumeBullet[];
  source: "ai" | "local";
  status: "ready" | "fallback";
  hiddenCount: number;
  note: string;
  usedFallback: boolean;
}

function buildInput(
  experience: Experience,
  excludeTexts: string[],
): Record<string, unknown> {
  return {
    problem: experience.problem,
    method: experience.method,
    contribution: experience.contribution,
    result: experience.result,
    metrics: experience.metrics.map((metric) => ({
      label: metric.label,
      value: metric.value,
    })),
    skills: experience.skills,
    existingBullets: excludeTexts,
  };
}

export async function generateResumeBullets(
  experience: Experience,
  options: GenerateBulletsOptions = {},
): Promise<GenerateBulletsResult> {
  const excludeTexts = options.excludeTexts ?? [];
  const local = buildLocalBullets(experience, excludeTexts);

  if (isAiMockMode()) {
    return {
      bullets: local,
      source: "local",
      status: "ready",
      hiddenCount: 0,
      note:
        local.length > 0
          ? "未配置模型代理，已按原文提炼本地草稿。"
          : "四段式还没有可提炼的内容，请先去经历页补充。",
      usedFallback: false,
    };
  }

  let dropped = 0;

  try {
    const raw = await requestTextJson({
      task: "resume-bullets",
      system: RESUME_BULLET_SYSTEM_PROMPT,
      input: buildInput(experience, excludeTexts),
    });
    const parsed = aiBulletResponseSchema.safeParse(raw);
    if (!parsed.success) {
      throw new TextTaskError("invalid", "模型输出字段不完整。");
    }

    const validated = validateAiBullets(
      parsed.data.bullets,
      experience,
      excludeTexts,
    );
    dropped = validated.dropped;
    if (validated.bullets.length === 0) {
      throw new TextTaskError("invalid", "模型输出缺少原文依据。");
    }

    return {
      bullets: validated.bullets,
      source: "ai",
      status: "ready",
      hiddenCount: validated.dropped,
      note:
        validated.dropped > 0
          ? `有 ${validated.dropped} 条因缺少依据或重复被过滤。`
          : "AI 依据原文提炼。",
      usedFallback: false,
    };
  } catch (error) {
    const reason =
      error instanceof TextTaskError ? error.message : "AI 暂不可用。";
    const filtered =
      dropped > 0 ? `有 ${dropped} 条因缺少依据或重复被过滤。` : "";
    return {
      bullets: local,
      source: "local",
      status: "fallback",
      hiddenCount: dropped,
      note:
        local.length > 0
          ? `${reason}${filtered} 已使用原文兜底。`
          : `${reason}${filtered} 四段式还没有可提炼的内容。`,
      usedFallback: true,
    };
  }
}
