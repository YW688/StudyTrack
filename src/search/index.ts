import { z } from "zod";
import jobsRaw from "../../data/jobs.json";
import channelsRaw from "../../data/channels.json";
import type {
  Channel,
  Experience,
  JobFamily,
  JobMatch,
  JobPosting,
  JobType,
  MatchEligibility,
  MatchEvidenceSource,
  MatchGap,
  MatchHit,
  OpportunityProfile,
  RequirementSkillRule,
  ResumeBullet,
  ResumeBulletCache,
  ResumeData,
} from "../types";
import {
  formatGradeFit,
  gradeNumberFromLabel,
  matchTier,
} from "../lib/opportunities";
import { createJobIndex, searchJobScores } from "./bm25";


const ruleSchema = z.object({
  all: z.array(z.string().min(1).max(30)).max(5).optional(),
  any: z.array(z.string().min(1).max(30)).max(5).optional(),
});

const jobSchema = z
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
    requirements: z.array(z.string().min(2).max(180)).min(3).max(8),
    requirementSkills: z.array(ruleSchema).min(3).max(8),
    skills: z.array(z.string().min(1).max(30)).min(1).max(12),
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
  .refine(
    (job) => job.sourceKind !== "official" || Boolean(job.sourceUrl),
    { message: "官方岗位缺少来源链接" },
  );

const channelSchema = z.object({
  id: z.string().min(1).max(60),
  name: z.string().min(1).max(80),
  type: z.enum(["campus", "platform", "public"]),
  entryUrl: z.string().regex(/^https?:\/\//).max(200),
  openMonths: z.array(z.number().int().min(1).max(12)).min(1).max(12),
  fitGrade: z.array(z.number().int().min(1).max(5)).min(1).max(5),
  note: z.string().max(120).optional(),
});

const jobsParsed = z.array(jobSchema).safeParse(jobsRaw);
const channelsParsed = z.array(channelSchema).safeParse(channelsRaw);

export const JOB_POSTINGS: JobPosting[] = jobsParsed.success
  ? (jobsParsed.data as JobPosting[])
  : [];

export const CHANNELS: Channel[] = channelsParsed.success
  ? (channelsParsed.data as Channel[])
  : [];

export const JOB_LIBRARY_NOTE = `${JOB_POSTINGS.length} 张演示岗位卡：人工整理自企业官方招聘方向，只用于本地对照；具体在招职位、城市与截止时间以官网为准。`;

export const CHANNEL_LIBRARY_NOTE = `${CHANNELS.length} 个官方入口：只做链接，不抓取站内职位；开放月份与具体岗位以官网为准。`;

export const JOB_LIBRARY_ISSUE = jobsParsed.success
  ? null
  : `岗位库加载失败：${jobsParsed.error.issues[0]?.message ?? "数据格式有误"}`;

export const CHANNEL_LIBRARY_ISSUE = channelsParsed.success
  ? null
  : `渠道库加载失败：${channelsParsed.error.issues[0]?.message ?? "数据格式有误"}`;

const SKILL_GROUPS: { canonical: string; aliases: string[] }[] = [
  { canonical: "JavaScript", aliases: ["JS"] },
  { canonical: "TypeScript", aliases: ["TS"] },
  { canonical: "React", aliases: ["React.js", "ReactJS"] },
  { canonical: "Vue", aliases: ["Vue.js", "VueJS"] },
  { canonical: "Node.js", aliases: ["Node", "NodeJS"] },
  { canonical: "Spring Boot", aliases: ["SpringBoot"] },
  { canonical: "Python", aliases: ["Py"] },
  { canonical: "Java", aliases: [] },
  { canonical: "Go", aliases: ["Golang"] },
  { canonical: "C++", aliases: ["cpp"] },
  { canonical: "C#", aliases: ["csharp"] },
  { canonical: "C", aliases: [] },
  { canonical: "SQL", aliases: [] },
  { canonical: "MySQL", aliases: [] },
  { canonical: "Redis", aliases: [] },
  { canonical: "Linux", aliases: [] },
  { canonical: "Git", aliases: [] },
  { canonical: "Docker", aliases: [] },
  { canonical: "Kubernetes", aliases: ["K8s"] },
  { canonical: "PyTorch", aliases: [] },
  { canonical: "Unity", aliases: [] },
  { canonical: "Android", aliases: [] },
  { canonical: "Kotlin", aliases: [] },
  { canonical: "Figma", aliases: [] },
  { canonical: "Photoshop", aliases: ["PS"] },
  { canonical: "Illustrator", aliases: [] },
  { canonical: "Excel", aliases: ["Microsoft Excel"] },
  { canonical: "数学建模", aliases: ["数理建模"] },
  { canonical: "机器学习", aliases: ["ML"] },
  { canonical: "深度学习", aliases: ["DL"] },
  { canonical: "自然语言处理", aliases: ["NLP"] },
  { canonical: "人工智能", aliases: ["AI"] },
  { canonical: "产品需求文档", aliases: ["PRD"] },
  { canonical: "用户访谈", aliases: ["用户调研"] },
  { canonical: "用户体验", aliases: ["UX"] },
  { canonical: "数据可视化", aliases: ["可视化"] },
  { canonical: "统计分析", aliases: ["统计"] },
  { canonical: "团队协作", aliases: ["团队合作"] },
  { canonical: "沟通", aliases: ["沟通能力"] },
  { canonical: "活动组织", aliases: ["活动执行"] },
];

const ALIAS_BY_CANONICAL = new Map(
  SKILL_GROUPS.map((group) => [group.canonical, group.aliases]),
);

const EXTRA_SKILLS = [
  "数据结构",
  "算法",
  "图形学",
  "计算机图形学",
  "分布式",
  "脚本",
  "CI/CD",
  "自动化测试",
  "测试",
  "浏览器原理",
  "前端工程化",
  "组件化",
  "微信小程序",
  "渗透测试",
  "CTF",
  "Web安全",
  "网络安全",
  "嵌入式",
  "电路设计",
  "硬件调试",
  "硬件",
  "AB测试",
  "业务分析",
  "商业分析",
  "问卷设计",
  "可用性测试",
  "用户研究",
  "原型设计",
  "设计规范",
  "组件规范",
  "交互设计",
  "视觉设计",
  "品牌设计",
  "排版",
  "文案",
  "游戏UI",
  "短视频",
  "内容运营",
  "用户运营",
  "社群运营",
  "市场推广",
  "活动策划",
  "项目管理",
  "招聘",
  "财务分析",
  "英语",
  "教育",
  "课程设计",
  "内容写作",
  "大模型",
  "提示词",
  "推荐系统",
  "AI 产品",
  "Android",
  "性能优化",
  "需求分析",
  "数据分析",
  "数据清洗",
  "数据库设计",
  "事务",
  "论文写作",
  "TensorFlow",
  "Shell",
  "科研",
  "产品设计",
  "CSS",
  "HTML",
  "响应式布局",
];

const ALL_SKILL_CANDIDATES = [
  ...new Set([
    ...SKILL_GROUPS.flatMap((group) => [group.canonical, ...group.aliases]),
    ...JOB_POSTINGS.flatMap((job) => job.skills),
    ...EXTRA_SKILLS,
  ]),
].sort((a, b) => b.length - a.length);

function canonicalSkill(raw: string): string {
  const value = raw.trim().replace(/\s+/g, " ");
  if (!value) return "";
  const lower = value.toLowerCase();
  for (const group of SKILL_GROUPS) {
    if (group.canonical.toLowerCase() === lower) return group.canonical;
    if (group.aliases.some((alias) => alias.toLowerCase() === lower)) {
      return group.canonical;
    }
  }
  return value;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsLiteral(text: string, literal: string): boolean {
  const value = literal.trim();
  if (!value) return false;
  if (/^[\x00-\x7F]+$/.test(value)) {
    const core = value.replace(/[^A-Za-z0-9]/g, "");
    if (core.length === 0) return false;
    if (
      core.length < 2 &&
      !/[+#]/.test(value) &&
      value.toUpperCase() !== "C"
    ) {
      return false;
    }
    const pattern = new RegExp(
      `(^|[^A-Za-z0-9])${escapeRegExp(value).replace(/\s+/g, "\\s+")}([^A-Za-z0-9]|$)`,
      "i",
    );
    return pattern.test(text);
  }
  return text.includes(value);
}

function skillAlternatives(skill: string): string[] {
  const canonical = canonicalSkill(skill);
  return [canonical, ...(ALIAS_BY_CANONICAL.get(canonical) ?? [])];
}

export function detectSkills(text: string): string[] {
  const found: string[] = [];
  const seen = new Set<string>();
  for (const candidate of ALL_SKILL_CANDIDATES) {
    if (!containsLiteral(text, candidate)) continue;
    const canonical = canonicalSkill(candidate);
    const key = canonical.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    found.push(canonical);
    if (found.length >= 5) break;
  }
  return found;
}

function normalizeSpace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function splitSentences(value: string): string[] {
  return value
    .split(/[。！？；;!?\n]+/)
    .map(normalizeSpace)
    .filter(Boolean);
}

interface EvidenceField {
  key: "result" | "contribution" | "method" | "problem" | "metrics";
  text: string;
  sentences: string[];
}

interface EvidenceUnit {
  experience: Experience;
  inResume: boolean;
  skillNames: string[];
  skillKeys: Set<string>;
  text: string;
  fields: EvidenceField[];
  bullets: ResumeBullet[];
}

function buildUnit(
  experience: Experience,
  inResume: boolean,
  cache?: ResumeBulletCache,
): EvidenceUnit {
  const skillNames = unique(
    [...experience.skills, ...experience.tags]
      .map(canonicalSkill)
      .filter(Boolean),
  );
  const metricsText = experience.metrics
    .map((metric) => `${metric.label}：${metric.value}`)
    .join("；");
  const rawFields: EvidenceField[] = [
    {
      key: "result",
      text: normalizeSpace(experience.result),
      sentences: splitSentences(experience.result),
    },
    {
      key: "contribution",
      text: normalizeSpace(experience.contribution),
      sentences: splitSentences(experience.contribution),
    },
    {
      key: "method",
      text: normalizeSpace(experience.method),
      sentences: splitSentences(experience.method),
    },
    {
      key: "problem",
      text: normalizeSpace(experience.problem),
      sentences: splitSentences(experience.problem),
    },
    {
      key: "metrics",
      text: metricsText,
      sentences: experience.metrics.map(
        (metric) => `${metric.label}：${metric.value}`,
      ),
    },
  ];
  const fields = rawFields.filter((field) => field.text.length > 0);
  const bullets = cache?.bullets ?? [];
  const text = normalizeSpace(
    [
      ...fields.map((field) => field.text),
      ...skillNames,
      ...bullets.map((bullet) => bullet.text),
    ].join("\n"),
  );

  return {
    experience,
    inResume,
    skillNames,
    skillKeys: new Set(skillNames.map((skill) => skill.toLowerCase())),
    text,
    fields,
    bullets,
  };
}

function unitSupports(unit: EvidenceUnit, skill: string): boolean {
  const canonical = canonicalSkill(skill);
  if (!canonical) return false;
  if (unit.skillKeys.has(canonical.toLowerCase())) return true;
  return skillAlternatives(canonical).some((alternative) =>
    containsLiteral(unit.text, alternative),
  );
}

function ruleHasSkills(rule: RequirementSkillRule): boolean {
  return Boolean(rule.all?.length || rule.any?.length);
}

function unitMatchesRule(unit: EvidenceUnit, rule: RequirementSkillRule): boolean {
  if (rule.all?.length && !rule.all.every((skill) => unitSupports(unit, skill))) {
    return false;
  }
  if (rule.any?.length && !rule.any.some((skill) => unitSupports(unit, skill))) {
    return false;
  }
  return true;
}

function limitQuote(value: string, limit = 150): string {
  const text = normalizeSpace(value);
  return text.length > limit ? `${text.slice(0, limit)}…` : text;
}

function quoteFor(
  unit: EvidenceUnit,
  rule: RequirementSkillRule,
): { quote: string; source: MatchEvidenceSource; skills: string[] } {
  const skills = unique(
    [...(rule.all ?? []), ...(rule.any ?? [])]
      .map(canonicalSkill)
      .filter(Boolean),
  );
  const matched = skills.filter((skill) => unitSupports(unit, skill));
  const effective = matched.length > 0 ? matched : skills;
  const order: EvidenceField["key"][] = [
    "result",
    "contribution",
    "method",
    "problem",
    "metrics",
  ];

  for (const key of order) {
    const field = unit.fields.find((item) => item.key === key);
    if (!field) continue;
    for (const sentence of field.sentences) {
      if (
        effective.some((skill) =>
          skillAlternatives(skill).some((alternative) =>
            containsLiteral(sentence, alternative),
          ),
        )
      ) {
        return { quote: limitQuote(sentence), source: "text", skills: effective };
      }
    }
  }

  for (const bullet of unit.bullets) {
    if (
      effective.some((skill) =>
        skillAlternatives(skill).some((alternative) =>
          containsLiteral(bullet.text, alternative),
        ),
      )
    ) {
      return { quote: limitQuote(bullet.text), source: "bullet", skills: effective };
    }
  }

  return {
    quote: `技能标签：${effective.join("、")}`,
    source: "tag",
    skills: effective,
  };
}

const ADVICE_GROUPS: { skills: string[]; advice: string }[] = [
  {
    skills: [
      "React",
      "Vue",
      "JavaScript",
      "TypeScript",
      "前端工程化",
      "性能优化",
      "微信小程序",
      "组件化",
      "Git",
      "CSS",
      "HTML",
      "响应式布局",
    ],
    advice:
      "做一个可复现的前端作品，写清你解决的页面问题、采用的方案和可验证的结果，把代码仓库或演示链接写进经历证据。",
  },
  {
    skills: [
      "Figma",
      "视觉设计",
      "交互设计",
      "组件规范",
      "设计规范",
      "原型设计",
      "Photoshop",
      "Illustrator",
      "排版",
      "品牌设计",
      "游戏UI",
    ],
    advice:
      "把一次真实的界面改版整理成案例：问题、目标、方案、上线结果，附上 Figma 链接与关键页面。",
  },
  {
    skills: [
      "用户访谈",
      "需求分析",
      "产品需求文档",
      "用户研究",
      "问卷设计",
      "可用性测试",
      "产品设计",
    ],
    advice:
      "为现有项目补一份访谈纪要、需求清单或 PRD，把用户原话与设计决策对应起来，作为经历证据。",
  },
  {
    skills: [
      "Python",
      "SQL",
      "Excel",
      "数据分析",
      "数据清洗",
      "数据可视化",
      "统计分析",
      "商业分析",
      "AB测试",
      "机器学习",
      "深度学习",
      "PyTorch",
      "数学建模",
      "自然语言处理",
      "推荐系统",
      "算法",
    ],
    advice:
      "用一份公开数据完成清洗、分析、图表和结论，写清指标定义与结果；不要只写“会使用工具”。",
  },
  {
    skills: ["沟通", "团队协作", "项目管理", "活动组织", "活动策划", "招聘", "课程设计"],
    advice:
      "在课程、社团或志愿活动里承担一次组织角色，记录协作对象、推进节点与最终结果。",
  },
  {
    skills: ["内容运营", "文案", "短视频", "用户运营", "社群运营", "市场推广"],
    advice:
      "选一个你运营过的账号或活动，写清选题、发布节奏、数据反馈和你的调整动作。",
  },
  {
    skills: [
      "嵌入式",
      "电路设计",
      "硬件调试",
      "C",
      "C++",
      "Linux",
      "网络安全",
      "渗透测试",
      "CTF",
      "测试",
      "自动化测试",
      "CI/CD",
      "脚本",
    ],
    advice:
      "在课程实验或比赛中留下可验证的过程材料：设计文档、测试记录、代码或演示视频。",
  },
];

function buildAdvice(
  rule: RequirementSkillRule,
  missing?: string[],
): string {
  const skills = unique(
    [...(rule.all ?? []), ...(rule.any ?? [])]
      .map(canonicalSkill)
      .filter(Boolean),
  );
  if (skills.length === 0) return "补一条能验证这项要求的真实经历。";
  if (missing && missing.length === 0) {
    return "这项要求的技能分散在多条经历里，建议合并成一条完整经历，或补一条能覆盖全部要求的项目证据。";
  }
  const focus = missing && missing.length > 0 ? missing : skills;
  const group = ADVICE_GROUPS.find((item) =>
    skills.some((skill) => item.skills.includes(skill)),
  );
  const tail =
    group?.advice ??
    "补一条课程设计、比赛或实习经历，写清问题、你的做法和结果；没有真实项目就从课程作业开始。";
  if (rule.any?.length && !rule.all?.length) {
    return `这项要求至少需要一项可验证证据（${focus.join("、")}）。${tail}`;
  }
  return `这项要求还缺少可验证证据（${focus.join("、")}）。${tail}`;
}

const TARGET_FAMILY_RULES: { family: JobFamily; re: RegExp }[] = [
  { family: "数据", re: /数据|分析|算法|机器学习|人工智能|nlp|商业/i },
  { family: "设计", re: /设计|ui|ux|视觉|交互|品牌/i },
  { family: "产品", re: /产品|pm/i },
  { family: "运营", re: /运营|市场|内容|新媒体|推广|增长|校园大使/i },
  { family: "研究", re: /研究|科研|教研|课程/i },
  { family: "职能", re: /人力|招聘|hr|财务|会计|行政/i },
  { family: "技术", re: /前端|后端|开发|软件|客户端|测试|安全|嵌入式|运维|全栈|游戏/i },
];

const GENERIC_TARGET_TOKENS = new Set([
  "开发",
  "工程",
  "程师",
  "实习",
  "校招",
  "岗位",
  "方向",
  "意向",
  "求职",
  "工作",
  "经理",
  "助理",
  "专员",
  "品经",
  "端开",
  "计师",
  "一份",
  "寻找",
  "想找",
  "同学",
  "相关",
  "专业",
]);

function targetTokens(target: string): string[] {
  const tokens = new Set<string>();
  for (const run of target.match(/[\u4e00-\u9fff]+/g) ?? []) {
    if (run.length === 1) continue;
    for (let index = 0; index < run.length - 1; index += 1) {
      tokens.add(run.slice(index, index + 2));
    }
  }
  for (const token of target.match(/[a-z0-9+#.]+/gi) ?? []) {
    if (token.length >= 2) tokens.add(token.toLowerCase());
  }
  return [...tokens].filter((token) => !GENERIC_TARGET_TOKENS.has(token));
}

function targetFamily(target: string): JobFamily | null {
  for (const rule of TARGET_FAMILY_RULES) {
    if (rule.re.test(target)) return rule.family;
  }
  return null;
}

function computeTargetFit(job: JobPosting, profile: OpportunityProfile): number {
  const target = profile.target.trim();
  if (!target) return 0.5;
  const tokens = targetTokens(target);
  if (tokens.length === 0) return 0.5;
  if (
    tokens.some(
      (token) =>
        job.title.toLowerCase().includes(token.toLowerCase()) ||
        job.track.toLowerCase().includes(token.toLowerCase()),
    )
  ) {
    return 1;
  }
  const family = targetFamily(target);
  if (family && family === job.family) return 0.75;
  return 0.2;
}

function computeCityFit(job: JobPosting, profile: OpportunityProfile): number {
  if (!profile.city) return 0.5;
  if (job.city === "远程") return 0.8;
  if (job.city === "未填写" || job.city === "不限") return 0.5;
  if (job.city.includes(profile.city) || profile.city.includes(job.city)) {
    return 1;
  }
  return 0.3;
}

function computeGradeFit(job: JobPosting, profile: OpportunityProfile): number {
  if (!profile.gradeNumber) return 0.5;
  return job.gradeFit.includes(profile.gradeNumber) ? 1 : 0;
}

function sortUnits(units: EvidenceUnit[]): EvidenceUnit[] {
  return [...units].sort((a, b) => {
    if (a.inResume !== b.inResume) return a.inResume ? -1 : 1;
    return b.experience.updatedAt.localeCompare(a.experience.updatedAt);
  });
}

export interface MatchContext {
  profile: OpportunityProfile;
  units: EvidenceUnit[];
  archiveUnits: EvidenceUnit[];
  relevance: Map<string, number>;
}

function buildProfile(
  resume: ResumeData,
  all: Experience[],
  validSelectedIds: string[],
): OpportunityProfile {
  const usesSelected = validSelectedIds.length > 0;
  const selectedSet = new Set(validSelectedIds);
  const primary = usesSelected
    ? all.filter((experience) => selectedSet.has(experience.id))
    : all;
  const skills = unique(
    primary
      .flatMap((experience) => [...experience.skills, ...experience.tags])
      .map(canonicalSkill)
      .filter(Boolean),
  ).slice(0, 24);
  const grade = resume.basics.grade.trim();
  const major = resume.basics.major.trim();
  const city = resume.basics.city.trim();
  const target = resume.basics.target.trim();

  return {
    grade,
    gradeNumber: gradeNumberFromLabel(grade),
    major,
    city,
    target,
    skills,
    experienceCount: all.length,
    selectedCount: validSelectedIds.length,
    usesSelected,
    completeness: [
      {
        label: "求职意向",
        done: target.length > 0,
        action: "填写目标岗位后，匹配会更聚焦",
        target: "resume",
      },
      {
        label: "年级与专业",
        done: grade.length > 0 && major.length > 0,
        action: "补全年级与专业，便于判断届别",
        target: "resume",
      },
      {
        label: "意向城市",
        done: city.length > 0,
        action: "填写城市后，异地岗位会单独提示",
        target: "resume",
      },
      {
        label: "简历经历",
        done: usesSelected,
        action: "在简历页勾选经历，命中只依据这份简历",
        target: "resume",
      },
    ],
  };
}

export function buildMatchContext(
  resume: ResumeData,
  allExperiences: Experience[],
  jobs: JobPosting[],
): MatchContext {
  const allIds = new Set(allExperiences.map((experience) => experience.id));
  const validSelectedIds = resume.selectedExperienceIds.filter((id) =>
    allIds.has(id),
  );
  const usesSelected = validSelectedIds.length > 0;
  const selectedSet = new Set(validSelectedIds);
  const profile = buildProfile(resume, allExperiences, validSelectedIds);
  const primary = usesSelected
    ? allExperiences.filter((experience) => selectedSet.has(experience.id))
    : allExperiences;
  const archive = usesSelected
    ? allExperiences.filter((experience) => !selectedSet.has(experience.id))
    : [];

  const units = sortUnits(
    primary.map((experience) =>
      buildUnit(experience, usesSelected, resume.bullets[experience.id]),
    ),
  );
  const archiveUnits = sortUnits(
    archive.map((experience) =>
      buildUnit(experience, false, resume.bullets[experience.id]),
    ),
  );

  const query = [profile.target, ...profile.skills.slice(0, 16)]
    .filter(Boolean)
    .join(" ");
  const relevance = new Map<string, number>();
  if (query && jobs.length > 0) {
    const index = createJobIndex(jobs);
    const scores = searchJobScores(index, query);
    const max = Math.max(0, ...scores.values());
    if (max > 0) {
      for (const [id, score] of scores) relevance.set(id, score / max);
    }
  }

  return { profile, units, archiveUnits, relevance };
}

function findBestUnit(
  rule: RequirementSkillRule,
  units: EvidenceUnit[],
): EvidenceUnit | null {
  for (const unit of units) {
    if (unitMatchesRule(unit, rule)) return unit;
  }
  return null;
}

export function matchJob(job: JobPosting, context: MatchContext): JobMatch {
  const hits: MatchHit[] = [];
  const gaps: MatchGap[] = [];
  const eligibility: MatchEligibility[] = [];
  let matchable = 0;

  job.requirements.forEach((requirement, index) => {
    const rule: RequirementSkillRule = job.requirementSkills[index] ?? {};
    if (!ruleHasSkills(rule)) {
      eligibility.push({
        index,
        requirement,
        note: "资格条件（学历、届别、到岗时间等），投递前请以企业官网为准。",
      });
      return;
    }
    matchable += 1;
    const unit = findBestUnit(rule, context.units);
    if (unit) {
      const evidence = quoteFor(unit, rule);
      hits.push({
        index,
        requirement,
        experienceId: unit.experience.id,
        quote: evidence.quote,
        skills: evidence.skills,
        source: evidence.source,
      });
      return;
    }
    const archiveUnit = context.archiveUnits.length
      ? findBestUnit(rule, context.archiveUnits)
      : null;
    const ruleSkills = unique(
      [...(rule.all ?? []), ...(rule.any ?? [])]
        .map(canonicalSkill)
        .filter(Boolean),
    );
    const unsupported = ruleSkills.filter(
      (skill) =>
        !context.units.some((unit) => unitSupports(unit, skill)),
    );
    const gap: MatchGap = {
      index,
      requirement,
      advice: buildAdvice(rule, unsupported),
    };
    if (archiveUnit) {
      const evidence = quoteFor(archiveUnit, rule);
      gap.archiveExperienceId = archiveUnit.experience.id;
      gap.archiveQuote = evidence.quote;
    }
    gaps.push(gap);
  });

  const jobSkills = unique(job.skills.map(canonicalSkill).filter(Boolean));
  const matchedSkills = jobSkills.filter((skill) =>
    context.units.some((unit) => unitSupports(unit, skill)),
  );
  const missingSkills = jobSkills.filter(
    (skill) => !matchedSkills.includes(skill),
  );

  const coverage = matchable === 0 ? 0.5 : hits.length / matchable;
  const skillCoverage =
    jobSkills.length === 0
      ? 0.5
      : matchedSkills.length / jobSkills.length;
  const targetFit = computeTargetFit(job, context.profile);
  const cityFit = computeCityFit(job, context.profile);
  const gradeFit = computeGradeFit(job, context.profile);
  const relevance = context.relevance.get(job.id) ?? 0;
  const score = Math.round(
    100 *
      (0.56 * coverage +
        0.2 * skillCoverage +
        0.08 * targetFit +
        0.06 * cityFit +
        0.06 * gradeFit +
        0.04 * relevance),
  );

  const reasons: string[] = [];
  if (matchable > 0) {
    reasons.push(`命中 ${hits.length}/${matchable} 项可匹配要求`);
  }
  if (jobSkills.length > 0) {
    reasons.push(`技能覆盖 ${matchedSkills.length}/${jobSkills.length}`);
  }
  if (targetFit >= 0.75 && context.profile.target) {
    reasons.push(`与求职意向「${context.profile.target}」方向一致`);
  }
  if (cityFit === 1) reasons.push(`城市匹配：${job.city}`);
  if (gradeFit === 1 && context.profile.grade) {
    reasons.push(`年级范围适合${context.profile.grade}`);
  }
  if (context.profile.usesSelected && hits.length > 0) {
    reasons.push(
      `命中依据来自简历已选 ${context.profile.selectedCount} 条经历`,
    );
  }

  const warnings: string[] = [];
  if (!context.profile.target) {
    warnings.push("未填写求职意向，当前主要按经历与技能排序。");
  }
  if (
    context.profile.grade &&
    gradeFit === 0 &&
    job.gradeFit.length > 0
  ) {
    warnings.push(
      `该岗位通常面向${formatGradeFit(job.gradeFit)}，你填写的是${context.profile.grade}。`,
    );
  }
  if (
    context.profile.city &&
    cityFit < 0.5 &&
    job.city !== "远程" &&
    job.city !== "未填写" &&
    job.city !== "不限"
  ) {
    warnings.push(
      `岗位在${job.city}，你填写的意向城市是${context.profile.city}。`,
    );
  }
  if (context.profile.target && targetFit < 0.5) {
    warnings.push(`与求职意向「${context.profile.target}」方向不同。`);
  }
  if (context.units.length === 0) {
    warnings.push("还没有可用于匹配的经历，补齐后命中项才有原文依据。");
  }
  if (matchable === 0) {
    warnings.push("这条 JD 没有识别出可匹配的技能要求，请手动对照任职要求。");
  }
  if (context.profile.experienceCount > 0 && !context.profile.usesSelected) {
    warnings.push(
      "简历尚未选入经历，当前按全部经历评估；勾选后匹配更聚焦。",
    );
  }

  return {
    jobId: job.id,
    score,
    tier: matchTier(score),
    hits,
    gaps,
    eligibility,
    matchedSkills,
    missingSkills,
    reasons: reasons.slice(0, 4),
    warnings: warnings.slice(0, 4),
    coverage,
  };
}

export function rankJobs(
  jobs: JobPosting[],
  context: MatchContext,
): JobMatch[] {
  return jobs
    .map((job) => matchJob(job, context))
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.hits.length - a.hits.length ||
        b.matchedSkills.length - a.matchedSkills.length,
    );
}

export type QualificationTier = "qualified" | "near" | "far";

export const QUALIFICATION_LABELS: Record<QualificationTier, string> = {
  qualified: "够格",
  near: "差一步",
  far: "差得多",
};

export interface JobQualification {
  tier: QualificationTier;
  readyHits: number;
  blockers: string[];
}

/**
 * 资格判定只认「简历就绪」的经历命中的要求：
 * 全部可匹配要求都由就绪经历命中 = 够格；只差 1 项 = 差一步；其余 = 差得多。
 */
export function qualifyJob(
  match: JobMatch,
  readyIds: Set<string>,
): JobQualification {
  const readyHits = match.hits.filter((hit) =>
    readyIds.has(hit.experienceId),
  ).length;
  const blockers: string[] = [];

  if (readyHits === 0) {
    blockers.push("没有简历就绪的经历对上要求");
  }
  for (const gap of match.gaps.slice(0, 2)) {
    blockers.push(gap.requirement.slice(0, 40));
  }
  if (match.gaps.length > 2) {
    blockers.push(`另有 ${match.gaps.length - 2} 项要求`);
  }

  const tier: QualificationTier =
    readyHits === 0
      ? "far"
      : match.gaps.length === 0
        ? "qualified"
        : match.gaps.length === 1
          ? "near"
          : "far";

  return { tier, readyHits, blockers };
}

export interface PastedJdInput {
  raw: string;
  title: string;
  company: string;
  city: string;
  type: JobType;
}

export interface ParsedJdResult {
  job: JobPosting | null;
  warnings: string[];
}

const REQUIREMENT_HEADER =
  /^(任职要求|岗位要求|任职资格|任职条件|我们希望你|要求)[：:]?$/;
const DUTY_HEADER =
  /^(岗位职责|工作职责|职位描述|岗位描述|工作内容|你将负责|工作范围)[：:]?$/;
const OTHER_HEADER =
  /^(福利待遇|公司介绍|团队介绍|关于我们|薪资待遇)[：:]?$/;
const META_LINE =
  /^(岗位|职位|公司|工作地点|地点|薪资|待遇|福利|联系方式|简历投递|投递方式|发布日期)\s*[：:]/;

type JdSection = "req" | "duty" | "other" | "unknown";

function extractRequirements(lines: string[], raw: string): string[] {
  const candidates: { text: string; section: JdSection }[] = [];
  let section: JdSection = "unknown";

  for (const line of lines) {
    const value = line
      .replace(/^(?:[-*•·—–]|\d{1,2}[.、)）])\s*/, "")
      .trim();
    if (!value) continue;
    if (REQUIREMENT_HEADER.test(value)) {
      section = "req";
      continue;
    }
    if (DUTY_HEADER.test(value)) {
      section = "duty";
      continue;
    }
    if (OTHER_HEADER.test(value)) {
      section = "other";
      continue;
    }
    if (META_LINE.test(value)) continue;
    if (/^[^：:]{1,12}[：:]$/.test(value)) continue;

    const pieces =
      value.length > 160
        ? value
            .split(/[。；;]/)
            .map(normalizeSpace)
            .filter((piece) => piece.length >= 6)
        : [value];
    for (const piece of pieces) {
      if (piece.length < 6) continue;
      candidates.push({ text: piece, section });
    }
  }

  const requirementLines = candidates
    .filter((candidate) => candidate.section === "req")
    .map((candidate) => candidate.text);
  const preferred = requirementLines.length
    ? requirementLines
    : candidates
        .filter(
          (candidate) =>
            candidate.section !== "duty" && candidate.section !== "other",
        )
        .map((candidate) => candidate.text);

  const clean = (values: string[]) =>
    unique(values).filter(
      (line) =>
        !/^(薪资|福利|地点|时间|联系方式|简历投递|投递方式)/.test(line),
    );

  let result = clean(preferred);
  if (result.length < 2) {
    const withSkills = candidates
      .filter((candidate) => detectSkills(candidate.text).length > 0)
      .map((candidate) => candidate.text);
    result = clean([...result, ...withSkills]);
  }
  if (result.length < 2) {
    result = clean(
      raw
        .split(/[。；;\n]/)
        .map(normalizeSpace)
        .filter((line) => line.length >= 6 && line.length <= 160),
    );
  }

  return result.slice(0, 8);
}

function ruleForRequirement(requirement: string): RequirementSkillRule {
  const skills = detectSkills(requirement);
  if (skills.length === 0) return {};
  if (/至少|任一|或|\//.test(requirement)) {
    return { any: skills.slice(0, 5) };
  }
  if (/与|和|、|及/.test(requirement)) {
    return { all: skills.slice(0, 5) };
  }
  return { any: skills.slice(0, 5) };
}

function inferJobFamily(text: string): JobFamily {
  return targetFamily(text) ?? "其他";
}

export function parsePastedJd(input: PastedJdInput): ParsedJdResult {
  const raw = input.raw.trim();
  if (raw.length < 20) {
    return { job: null, warnings: ["JD 太短，至少粘贴 20 个字。"] };
  }

  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  let title = input.title.trim();
  let bodyLines = lines;

  if (!title && lines.length > 0) {
    const first = lines[0].replace(/^(岗位|职位)[：:]\s*/, "").trim();
    if (first.length >= 4 && first.length <= 30) {
      title = first;
      bodyLines = lines.slice(1);
    }
  }

  let requirements = extractRequirements(bodyLines, raw);
  if (requirements.length === 0) {
    requirements = ["阅读完整 JD，对照经历逐条判断"];
  }
  const requirementSkills = requirements.map(ruleForRequirement);
  const skills = unique(
    requirementSkills.flatMap((rule) => [
      ...(rule.all ?? []),
      ...(rule.any ?? []),
    ]),
  ).slice(0, 12);
  const family = inferJobFamily(`${title} ${raw}`);

  const warnings: string[] = [];
  if (skills.length === 0) {
    warnings.push("没有识别到技能关键词，匹配将只展示要求清单。");
  }
  if (requirements.length < 2) {
    warnings.push("JD 可拆分的条目较少，建议把职责与要求分行粘贴。");
  }

  const job: JobPosting = {
    id: `custom-${Date.now()}`,
    company: input.company.trim() || "自定义 JD",
    title: title || "粘贴的岗位",
    city: input.city.trim() || "未填写",
    type: input.type,
    cohort: "粘贴 JD",
    family,
    track: "自定义",
    requirements,
    requirementSkills,
    skills,
    gradeFit: [1, 2, 3, 4, 5],
    collectedAt: new Date().toISOString().slice(0, 10),
    sourceName: "粘贴的 JD",
    sourceKind: "custom",
    verifiedAt: new Date().toISOString().slice(0, 10),
    custom: true,
  };

  return { job, warnings };
}
