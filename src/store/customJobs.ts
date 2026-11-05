import { del, get, set } from "idb-keyval";
import { z } from "zod";
import type { JobPosting } from "../types";

export const CUSTOM_JOBS_KEY = "studytrack:v1:custom-jobs";

export const CUSTOM_JOBS_LIMIT = 60;

const ruleSchema = z.object({
  all: z.array(z.string().min(1).max(30)).max(5).optional(),
  any: z.array(z.string().min(1).max(30)).max(5).optional(),
});

export const customJobSchema = z
  .object({
    id: z.string().min(1).max(80),
    company: z.string().min(1).max(60),
    title: z.string().min(1).max(120),
    city: z.string().min(1).max(30),
    type: z.enum(["campus", "intern"]),
    cohort: z.string().min(1).max(40),
    family: z.enum([
      "技术",
      "数据",
      "产品",
      "设计",
      "运营",
      "研究",
      "职能",
      "其他",
    ]),
    track: z.string().min(1).max(40),
    requirements: z.array(z.string().min(2).max(180)).min(1).max(8),
    requirementSkills: z.array(ruleSchema).min(1).max(8),
    skills: z.array(z.string().min(1).max(30)).max(12),
    gradeFit: z.array(z.number().int().min(1).max(5)).min(1).max(5),
    collectedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    sourceName: z.string().min(1).max(60),
    sourceUrl: z.string().url().max(220).optional(),
    sourceKind: z.enum(["official", "custom"]),
    verifiedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    custom: z.boolean().optional(),
  })
  .refine((job) => job.requirements.length === job.requirementSkills.length, {
    message: "岗位要求与技能规则数量不一致",
  })
  .refine((job) => job.sourceKind === "custom" && job.custom === true, {
    message: "本机岗位库只收用户自己粘贴的 JD",
  });

/** 岗位名称与公司都选填，留空时落到占位值 只比这两项会把两份不同的 JD 判成同一条重贴
 *  要求清单一起进键：同一段 JD 再贴一次仍然替换 换一份内容就各留一张 */
function dedupeKey(job: JobPosting): string {
  const label = `${job.company} ${job.title}`.replace(/\s+/g, " ").trim().toLowerCase();
  const content = job.requirements
    .map((line) => line.replace(/\s+/g, "").toLowerCase())
    .join("|");
  return `${label}::${content}`;
}

export async function loadCustomJobs(): Promise<JobPosting[]> {
  try {
    const value = await get(CUSTOM_JOBS_KEY);
    if (!Array.isArray(value)) return [];
    return value
      .map((item) => customJobSchema.safeParse(item))
      .filter((result) => result.success)
      .map((result) => result.data as JobPosting);
  } catch {
    return [];
  }
}

export async function saveCustomJobs(jobs: JobPosting[]): Promise<void> {
  await set(CUSTOM_JOBS_KEY, jobs.map((job) => customJobSchema.parse(job)));
}

/** 公司、岗位名与要求清单三项都相同才视为重贴，用新的替换旧的，避免一次误粘贴把候选池挤满。 */
export function mergeCustomJob(jobs: JobPosting[], job: JobPosting): JobPosting[] {
  const key = dedupeKey(job);
  return [job, ...jobs.filter((item) => dedupeKey(item) !== key)].slice(
    0,
    CUSTOM_JOBS_LIMIT,
  );
}

export async function addCustomJob(job: JobPosting): Promise<JobPosting[]> {
  const next = mergeCustomJob(await loadCustomJobs(), job);
  await saveCustomJobs(next);
  return next;
}

export async function removeCustomJob(id: string): Promise<JobPosting[]> {
  const next = (await loadCustomJobs()).filter((job) => job.id !== id);
  if (next.length === 0) {
    await del(CUSTOM_JOBS_KEY);
    return next;
  }
  await saveCustomJobs(next);
  return next;
}
