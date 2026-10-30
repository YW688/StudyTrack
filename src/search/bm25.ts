import MiniSearch from "minisearch";
import type { JobPosting } from "../types";

const STOP_BIGRAMS = new Set([
  "熟悉",
  "掌握",
  "了解",
  "具备",
  "优先",
  "能力",
  "经验",
  "相关",
  "以上",
  "能够",
  "可以",
  "完成",
  "工作",
  "要求",
  "岗位",
  "进行",
  "以及",
  "或者",
  "我们",
  "你的",
  "同学",
  "负责",
  "参与",
  "良好",
  "基础",
  "常用",
  "使用",
  "独立",
  "每周",
  "到岗",
  "学历",
  "本科",
  "硕士",
  "项目",
  "课程",
  "一个",
  "方向",
  "城市",
  "年级",
  "简历",
  "经历",
]);

export function tokenize(text: string): string[] {
  const value = text.toLowerCase();
  const tokens: string[] = [];

  for (const token of value.match(/[a-z0-9][a-z0-9+#.]*/g) ?? []) {
    if (token.length >= 2) tokens.push(token);
  }

  for (const run of value.match(/[\u4e00-\u9fff]+/g) ?? []) {
    if (run.length === 1) {
      tokens.push(run);
      continue;
    }
    for (let index = 0; index < run.length - 1; index += 1) {
      const bigram = run.slice(index, index + 2);
      if (!STOP_BIGRAMS.has(bigram)) tokens.push(bigram);
    }
  }

  return tokens;
}

export function createJobIndex(jobs: JobPosting[]): MiniSearch<JobPosting> {
  const index = new MiniSearch<JobPosting>({
    fields: [
      "title",
      "company",
      "family",
      "track",
      "city",
      "cohort",
      "requirements",
      "skills",
    ],
    storeFields: ["id"],
    tokenize,
    searchOptions: {
      boost: {
        title: 2.4,
        skills: 2,
        track: 1.8,
        requirements: 1.2,
        company: 1,
        family: 0.8,
        city: 0.6,
        cohort: 0.4,
      },
      prefix: true,
    },
  });

  index.addAll(jobs);
  return index;
}

export function searchJobScores(
  index: MiniSearch<JobPosting>,
  query: string,
): Map<string, number> {
  const trimmed = query.trim();
  if (!trimmed) return new Map();
  const results = index.search(trimmed);
  return new Map(results.map((result) => [String(result.id), result.score]));
}
