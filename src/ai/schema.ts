import { z } from "zod";

export const aiBulletSchema = z.object({
  text: z.string().min(1).max(200),
  usedEvidence: z.array(z.string().min(1).max(300)).min(1).max(6),
});

export const aiBulletResponseSchema = z.object({
  bullets: z.array(aiBulletSchema).max(6),
});

export type AiBulletResponse = z.infer<typeof aiBulletResponseSchema>;
