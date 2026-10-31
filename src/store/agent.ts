import { get, set } from "idb-keyval";
import { z } from "zod";
import {
  AGENT_ACTION_STATUSES,
  AGENT_ACTION_TYPES,
  type AgentMessage,
} from "../types";

export const AGENT_KEY = "studytrack:v1:agent";

export const agentActionSchema = z.object({
  id: z.string().min(1),
  type: z.enum(AGENT_ACTION_TYPES),
  status: z.enum(AGENT_ACTION_STATUSES),
  refId: z.string().optional(),
});

export const agentMessageSchema = z.object({
  id: z.string().min(1),
  role: z.enum(["user", "agent"]),
  text: z.string().min(1).max(4000),
  createdAt: z.string(),
  actions: z.array(agentActionSchema).max(8).optional(),
  linkedRecordIds: z.array(z.string()).max(20).optional(),
});

const agentSchema = z.array(agentMessageSchema).max(500);

export async function loadAgentMessages(): Promise<AgentMessage[]> {
  try {
    const value = await get(AGENT_KEY);
    if (!value) return [];
    const parsed = agentSchema.safeParse(value);
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

export async function saveAgentMessages(messages: AgentMessage[]): Promise<void> {
  await set(AGENT_KEY, agentSchema.parse(messages.slice(-500)));
}
