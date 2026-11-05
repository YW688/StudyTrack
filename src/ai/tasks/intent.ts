import { isAiMockMode, requestTextJson } from "../client";
import { AGENT_INTENT_SYSTEM_PROMPT } from "../rules";
import { aiAgentIntentSchema, type AiAgentIntent } from "../schema";

export type AgentIntent = AiAgentIntent["intent"];

/**
 * 模型只回答「这是什么」，不产出任何内容：
 * 岗位要求与结构化仍然交给本机 parsePastedJd / parseExperience，避免模型改写用户的原文。
 * 没接模型、超时、输出不合 schema 或自己也不确定时返回 null，交回调用方的本机规则链。
 */
export async function judgeIntent(text: string): Promise<AgentIntent | null> {
  if (isAiMockMode()) return null;
  try {
    const raw = await requestTextJson({
      task: "agent-intent",
      system: AGENT_INTENT_SYSTEM_PROMPT,
      input: { 用户这句话: text.slice(0, 2000) },
    });
    const parsed = aiAgentIntentSchema.safeParse(raw);
    if (!parsed.success) return null;
    if (parsed.data.confidence !== "high") return null;
    return parsed.data.intent;
  } catch {
    return null;
  }
}
