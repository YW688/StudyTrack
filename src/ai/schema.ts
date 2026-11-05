import { z } from "zod";

export const aiBulletSchema = z.object({
  text: z.string().min(1).max(200),
  usedEvidence: z.array(z.string().min(1).max(300)).min(1).max(6),
});

export const aiBulletResponseSchema = z.object({
  bullets: z.array(aiBulletSchema).max(6),
});

export type AiBulletResponse = z.infer<typeof aiBulletResponseSchema>;

const kindSchema = z.enum([
  "course",
  "contest",
  "research",
  "intern",
  "design",
  "volunteer",
]);

export const aiExperienceDraftSchema = z.object({
  kind: kindSchema,
  title: z.string().max(80).default(""),
  org: z.string().max(80).default(""),
  problem: z.string().max(2000).default(""),
  method: z.string().max(2000).default(""),
  contribution: z.string().max(2000).default(""),
  result: z.string().max(2000).default(""),
  metrics: z
    .array(
      z.object({
        label: z.string().max(40),
        value: z.string().max(40),
      }),
    )
    .max(6)
    .default([]),
  evidence: z
    .array(
      z.object({
        label: z.string().max(40),
        url: z.string().max(500).optional(),
      }),
    )
    .max(4)
    .default([]),
  skills: z.array(z.string().max(20)).max(8).default([]),
  confidence: z.enum(["high", "low"]).default("low"),
});

export type AiExperienceDraft = z.infer<typeof aiExperienceDraftSchema>;

export const aiAgentIntentSchema = z.object({
  intent: z.enum([
    "profile",
    "experience",
    "job",
    "note",
    "week",
    "archive",
    "readiness",
    "jobs",
    "guide",
    "unsupported",
  ]),
  confidence: z.enum(["high", "low"]).default("low"),
});

export type AiAgentIntent = z.infer<typeof aiAgentIntentSchema>;
