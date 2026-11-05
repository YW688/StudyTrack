import type { ExperienceKind, ExperienceMetric } from "../../types";
import { isAiMockMode, requestTextJson, TextTaskError } from "../client";
import { EXPERIENCE_STRUCTURE_SYSTEM_PROMPT } from "../rules";
import { aiExperienceDraftSchema } from "../schema";
import type { AgentExperienceDraft } from "./agent";

export interface StructureExperienceResult {
  draft: AgentExperienceDraft;
  source: "ai" | "local";
  status: "ready" | "fallback";
  usedFallback: boolean;
  note: string;
}

const DIGIT_TOKEN = /\d+(?:\.\d+)?/g;

/** 比对口径：去掉空白与大小写，原文里的「18 人」和模型写的「18人」算同一个词 */
function fold(value: string): string {
  return value.toLowerCase().replace(/\s+/g, "");
}

function digitsOf(value: string): string[] {
  return value.match(DIGIT_TOKEN) ?? [];
}

/** 原文里出现过的数字才算有据 阿拉伯数字对不上就是编造 */
function digitsGrounded(value: string, source: string): boolean {
  const folded = source;
  return digitsOf(value).every((token) => folded.includes(token));
}

/** 三到四个连续汉字能在原文里找到 就认为这个词是从原文抄来的 */
function sharesPhrase(value: string, source: string): boolean {
  const phrase = fold(value);
  if (!phrase) return true;
  if (phrase.length <= 3) return source.includes(phrase);
  for (let index = 0; index + 4 <= phrase.length; index += 1) {
    if (source.includes(phrase.slice(index, index + 4))) return true;
  }
  return false;
}

function clean(value: string, max: number): string {
  const trimmed = value.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
}

function dedupeMetrics(metrics: ExperienceMetric[]): ExperienceMetric[] {
  const seen = new Set<string>();
  const kept: ExperienceMetric[] = [];
  for (const metric of metrics) {
    const key = `${metric.label}=${metric.value}`;
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push(metric);
  }
  return kept.slice(0, 6);
}

function buildInput(text: string): Record<string, unknown> {
  return { 用户口述的原文: text };
}

/**
 * 口述一段话 → 四段式战绩草稿。
 * 模型只负责分拣原文，任何对不上原文的数字或链接一律丢弃；
 * 未接入模型或模型不可用时，交回调用方已有的本机拆分结果。
 */
export async function structureExperience(
  text: string,
  local: AgentExperienceDraft,
): Promise<StructureExperienceResult> {
  const source = fold(text);

  if (isAiMockMode()) {
    return {
      draft: local,
      source: "local",
      status: "ready",
      usedFallback: false,
      note: "未接入模型 已按本机规则拆成四段",
    };
  }

  try {
    const raw = await requestTextJson({
      task: "experience-structure",
      system: EXPERIENCE_STRUCTURE_SYSTEM_PROMPT,
      input: buildInput(text),
    });
    const parsed = aiExperienceDraftSchema.safeParse(raw);
    if (!parsed.success) {
      throw new TextTaskError("invalid", "模型输出字段不完整");
    }
    const data = parsed.data;

    const parts = [
      clean(data.problem, 2000),
      clean(data.method, 2000),
      clean(data.contribution, 2000),
      clean(data.result, 2000),
    ];
    if (parts.every((part) => !part)) {
      throw new TextTaskError("invalid", "模型没有拆出任何一段");
    }
    // 四段里混进了原文没有的数字 整条不可信 退回本机拆分
    if (!parts.every((part) => digitsGrounded(part, source))) {
      throw new TextTaskError("invalid", "模型给出的数字对不上原文");
    }

    const metrics: ExperienceMetric[] = [];
    let droppedMetrics = 0;
    for (const metric of data.metrics) {
      const label = clean(metric.label, 40);
      const value = clean(metric.value, 40);
      if (!label || !value) continue;
      if (!digitsOf(`${label} ${value}`).every((token) => source.includes(token))) {
        droppedMetrics += 1;
        continue;
      }
      metrics.push({ label, value });
    }

    const evidence: AgentExperienceDraft["evidence"] = [];
    let droppedEvidence = 0;
    for (const item of data.evidence) {
      const label = clean(item.label, 40);
      const url = clean(item.url ?? "", 500);
      if (!label) continue;
      if (url && !source.includes(fold(url))) {
        droppedEvidence += 1;
        continue;
      }
      if (!url && !sharesPhrase(label, source)) {
        droppedEvidence += 1;
        continue;
      }
      if (evidence.some((kept) => kept.label === label)) continue;
      evidence.push(url ? { label, url } : { label });
    }

    const skills = data.skills
      .map((skill) => clean(skill, 20))
      .filter(
        (skill) =>
          skill.length > 0 &&
          (source.includes(fold(skill)) ||
            local.skills.some((kept) => fold(kept) === fold(skill))),
      )
      .slice(0, 8);

    const filled = parts.filter(Boolean).length;
    const untrusted =
      droppedMetrics > 0 ||
      droppedEvidence > 0 ||
      !sharesPhrase(data.title, source) ||
      !sharesPhrase(data.org, source);

    const draft: AgentExperienceDraft = {
      kind: data.kind as ExperienceKind,
      title: sharesPhrase(data.title, source)
        ? clean(data.title, 60) || local.title
        : local.title,
      org: sharesPhrase(data.org, source)
        ? clean(data.org, 60)
        : local.org,
      problem: parts[0],
      method: parts[1],
      contribution: parts[2],
      result: parts[3],
      metrics: dedupeMetrics(
        metrics.length > 0 ? metrics : local.metrics,
      ),
      evidence: evidence.length > 0 ? evidence : local.evidence,
      skills: skills.length > 0 ? skills : local.skills,
      confidence:
        filled === 4 && data.confidence === "high" && !untrusted
          ? "high"
          : "low",
      raw: text,
    };

    const extras: string[] = [];
    if (droppedMetrics > 0) {
      extras.push(`${droppedMetrics} 条数字对不上原文已丢弃`);
    }
    if (droppedEvidence > 0) {
      extras.push(`${droppedEvidence} 条证据链接对不上原文已丢弃`);
    }
    if (untrusted && droppedMetrics === 0 && droppedEvidence === 0) {
      extras.push("标题或组织在原文里找不到 已用本机拆分的那一版 标为待确认");
    }

    return {
      draft,
      source: "ai",
      status: "ready",
      usedFallback: false,
      note: extras.join(" "),
    };
  } catch (error) {
    const reason =
      error instanceof TextTaskError ? error.message : "模型暂不可用";
    return {
      draft: local,
      source: "local",
      status: "fallback",
      usedFallback: true,
      note: `${reason} 已用本机规则拆成四段`,
    };
  }
}
