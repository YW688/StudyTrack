import { z } from "zod";
import raw from "../../data/source-checks.json";

export const sourceCheckSchema = z.object({
  id: z.string().min(1).max(120),
  kind: z.enum(["calendar", "channel", "job"]),
  label: z.string().min(1).max(200),
  url: z.string().min(1).max(500),
  mode: z.enum(["fetch", "head", "skip"]),
  robots: z.enum(["allowed", "disallowed", "unknown", "unreachable"]),
  status: z.enum(["ok", "unreachable", "skipped", "blocked"]),
  httpStatus: z.number().int().nullable(),
  finalUrl: z.string().max(500).nullable(),
  checkedAt: z.string(),
  title: z.string().max(200).optional(),
  excerpt: z.string().max(500).optional(),
  dateMatched: z.boolean().optional(),
  contentHash: z.string().max(64).optional(),
  note: z.string().max(300).optional(),
});

export type SourceCheck = z.infer<typeof sourceCheckSchema>;

const sourceCheckFileSchema = z.object({
  version: z.literal(1),
  checkedAt: z.string(),
  policy: z.string().max(1000),
  items: z.array(sourceCheckSchema).max(200),
});

const parsed = sourceCheckFileSchema.safeParse(raw);

export const SOURCE_CHECKS: SourceCheck[] = parsed.success
  ? parsed.data.items
  : [];

export const SOURCE_CHECKED_AT: string | null = parsed.success
  ? parsed.data.checkedAt
  : null;

export const SOURCE_CHECK_POLICY: string = parsed.success
  ? parsed.data.policy
  : "来源核验数据格式有误 请重新运行 npm run verify:sources";

export const SOURCE_CHECK_ISSUE: string | null = parsed.success
  ? null
  : "来源核验数据格式有误 已隐藏核验明细";

export function getSourceCheck(id: string): SourceCheck | undefined {
  return SOURCE_CHECKS.find((check) => check.id === id);
}
