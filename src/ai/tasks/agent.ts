import dayjs from "dayjs";
import type {
  Confidence,
  Experience,
  ExperienceKind,
  Goal,
  Grade,
  LedgerEvent,
  Note,
  Profile,
  ResumeData,
} from "../../types";
import { GOAL_LABELS, MATCH_TIER_LABELS } from "../../types";
import {
  experienceKindLabel,
  formatExperienceRange,
} from "../../lib/experience";
import { computeReadiness, studyDateKey } from "../../lib/ledger";
import {
  JOB_POSTINGS,
  buildMatchContext,
  detectSkills,
  rankJobs,
} from "../../search";

export type AgentMode = "auto" | "profile" | "experience" | "note";

export interface AgentProfileDraft {
  grade: Grade | "";
  major: string;
  goal: Goal;
  targetRoles: string[];
  skills: string[];
}

export interface AgentExperienceDraft {
  kind: ExperienceKind;
  title: string;
  problem: string;
  method: string;
  contribution: string;
  result: string;
  skills: string[];
  confidence: Confidence;
  raw: string;
}

export type AgentDraft =
  | { kind: "profile"; data: AgentProfileDraft }
  | { kind: "experience"; data: AgentExperienceDraft }
  | { kind: "note"; text: string };

export interface AgentReply {
  text: string;
  draft?: AgentDraft;
  navigate?: "experiences" | "opportunities" | "resume" | "today";
}

export interface AgentContext {
  profile: Profile | null;
  experiences: Experience[];
  ledger: LedgerEvent[];
  notes: Note[];
  resume: ResumeData;
}

const RESULT_RE =
  /结果|获|获奖|提升|下降|减少|上线|优秀|成功|达到|增长|降低|测试通过|验收通过|审核通过|答辩通过|通过率|录用|转正/;
const CONTRIBUTION_RE = /负责|我|参与|主导|独立|承担|完成/;
const METHOD_RE =
  /做|用|通过|采用|实现|搭建|设计|写|建|开发|优化|重构|测试|建模|分析|完成/;
const PROBLEM_RE =
  /问题|痛点|难点|需求|背景|原来|导致|超选|缺少|无法|不足|希望/;

const MAJORS = [
  "计算机科学与技术",
  "数据科学与大数据技术",
  "人工智能",
  "软件工程",
  "数据科学",
  "大数据",
  "电子信息",
  "自动化",
  "统计学",
  "数学",
  "经济学",
  "金融",
  "工业设计",
  "视觉传达",
  "设计",
  "新闻",
  "法学",
  "医学",
  "英语",
  "机械",
  "计算机",
];

const ROLE_RULES: { re: RegExp; role: string }[] = [
  { re: /算法|机器学习|深度学习|AI\b/i, role: "算法工程师" },
  { re: /数据分析|商业分析|数据科学|数据挖掘/, role: "数据分析师" },
  { re: /后端|服务端|后台/, role: "后端开发" },
  { re: /前端|React|Vue|Web/i, role: "前端开发" },
  { re: /全栈/, role: "全栈开发" },
  { re: /产品经理|产品策划|产品/, role: "产品经理" },
  { re: /视觉|UI|交互|设计/i, role: "设计师" },
  { re: /运营|内容|新媒体/, role: "运营" },
  { re: /测试/, role: "测试工程师" },
  { re: /嵌入式|硬件/, role: "嵌入式工程师" },
  { re: /游戏/, role: "游戏开发" },
  { re: /科研|研究/, role: "科研" },
  { re: /安全|渗透/, role: "安全工程师" },
];

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function clean(value: string, max = 2000): string {
  return value.trim().replace(/\s+/g, " ").slice(0, max);
}

function inferGrade(text: string): Grade | "" {
  const match = text.match(/(大一|大二|大三|大四|研究生|其他)/);
  return match ? (match[1] as Grade) : "";
}

function inferMajor(text: string): string {
  const labeled = text.match(
    /(?:专业是|专业：|专业:|读的是|读|学的是|主修)\s*([^\s，。；,;、]{2,20})/,
  );
  if (labeled) {
    return clean(labeled[1].replace(/专业$/, ""), 60);
  }
  return MAJORS.find((major) => text.includes(major)) ?? "";
}

function inferGoal(text: string): Goal {
  if (/考研|研究生考试/.test(text)) return "postgrad";
  if (/出国|留学|申请海外/.test(text)) return "abroad";
  if (/考公|考编|公务员|事业单位/.test(text)) return "civil";
  if (/实习|就业|找工作|求职|校招|社招/.test(text)) return "intern";
  return "undecided";
}

function inferRoles(text: string): string[] {
  const roles: string[] = [];
  for (const rule of ROLE_RULES) {
    if (rule.re.test(text)) roles.push(rule.role);
  }
  if (roles.length === 0) {
    const explicit = text.match(
      /(?:目标岗位|求职意向|方向|想找|想做)[：:]?\s*([^。；;\n]{2,40})/,
    );
    if (explicit) {
      roles.push(
        ...explicit[1]
          .split(/[、,，/;；\s]+/)
          .map((value) => value.replace(/实习|岗位|工作/g, "").trim())
          .filter((value) => value.length >= 2),
      );
    }
  }
  return unique(roles).slice(0, 3);
}

function parseProfile(text: string): AgentProfileDraft | null {
  const grade = inferGrade(text);
  const major = inferMajor(text);
  const goal = inferGoal(text);
  const targetRoles = inferRoles(text);
  const skills = detectSkills(text).filter(
    (skill) =>
      !major.includes(skill) &&
      !targetRoles.some((role) => role.includes(skill)),
  );
  if (!grade && !major && targetRoles.length === 0 && goal === "undecided") {
    return null;
  }
  return { grade, major, goal, targetRoles, skills };
}

function inferKind(text: string): ExperienceKind {
  if (/课程|课设|实验|作业|大创/.test(text)) return "course";
  if (/竞赛|比赛|校赛|国赛|大赛|挑战杯|蓝桥|数学建模/.test(text)) {
    return "contest";
  }
  if (/实习|公司|岗位|入职/.test(text)) return "intern";
  if (/科研|论文|实验室|课题|专利/.test(text)) return "research";
  if (/志愿|支教|社区|公益/.test(text)) return "volunteer";
  if (/设计|作品集|Figma|视觉|UI|交互/.test(text)) return "design";
  return "other";
}

function extractTitle(text: string, sentences: string[]): string {
  const labeled = text.match(
    /(?:标题|项目名称|名称)[：:]\s*([^。；;\n]{2,60})/,
  );
  if (labeled) return clean(labeled[1], 60);
  const action = text.match(
    /(?:做了|完成|参加|参与|开发|设计|搭建|实现|负责|组织|开展)(?:一个|一项|一次|一场)?\s*([^，。；;\n]{2,40})/,
  );
  if (action) return clean(action[1], 60);
  return clean(sentences[0] ?? text, 60);
}

function parseExperience(text: string): AgentExperienceDraft {
  const body =
    text
      .replace(/^(?:帮我)?记(?:一条|下)?(?:经历|记录)?\s*[：:，,]\s*/, "")
      .trim() || text;
  const sentences = body
    .split(/[。！？；;!?\n]+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const buckets = {
    problem: [] as string[],
    method: [] as string[],
    contribution: [] as string[],
    result: [] as string[],
  };

  for (const sentence of sentences) {
    if (RESULT_RE.test(sentence)) buckets.result.push(sentence);
    else if (CONTRIBUTION_RE.test(sentence)) buckets.contribution.push(sentence);
    else if (METHOD_RE.test(sentence)) buckets.method.push(sentence);
    else if (PROBLEM_RE.test(sentence)) buckets.problem.push(sentence);
    else buckets.problem.push(sentence);
  }

  const join = (values: string[]) => clean(values.join("；"), 2000);
  const problem = join(buckets.problem);
  const method = join(buckets.method);
  const contribution = join(buckets.contribution);
  const result = join(buckets.result);
  const filled = [problem, method, contribution, result].filter(Boolean).length;

  return {
    kind: inferKind(body),
    title: extractTitle(body, sentences),
    problem,
    method,
    contribution,
    result,
    skills: detectSkills(body),
    confidence: filled >= 4 ? "high" : "low",
    raw: text,
  };
}

export function missingExperienceParts(
  draft: AgentExperienceDraft,
): string[] {
  const missing: string[] = [];
  if (!draft.problem.trim()) missing.push("问题");
  if (!draft.method.trim()) missing.push("方法");
  if (!draft.contribution.trim()) missing.push("贡献");
  if (!draft.result.trim()) missing.push("结果");
  return missing;
}

function profileReply(text: string): AgentReply {
  const draft = parseProfile(text);
  if (!draft) {
    return {
      text: "说清年级 专业 想去的方向 例如 大二 人工智能 想找算法实习",
    };
  }
  const summary = [
    draft.grade || "年级未填",
    draft.major || "专业未填",
    GOAL_LABELS[draft.goal],
  ].join(" ");
  return {
    text: `档案草稿 ${summary} 确认前可以改`,
    draft: { kind: "profile", data: draft },
  };
}

function experienceReply(text: string): AgentReply {
  if (text.length < 8) {
    return {
      text: "再多说一点 做了什么 怎么做的 你负责什么 结果怎样 四段不用一次写全",
    };
  }
  const draft = parseExperience(text);
  const missing = missingExperienceParts(draft);
  return {
    text:
      missing.length === 0
        ? "四段都齐了 确认后写入征途 之后可以再补证据和数字"
        : `先填了能识别的部分 还缺 ${missing.join(" ")} 可以直接在下面补`,
    draft: { kind: "experience", data: draft },
  };
}

function noteReply(text: string): AgentReply {
  return {
    text: "这条更像一条记录 确认后记进征途 不算完整经历",
    draft: { kind: "note", text: text.slice(0, 1000) },
  };
}

function weekReply(context: AgentContext): AgentReply {
  const todayKey = studyDateKey();
  const startKey = dayjs(todayKey)
    .subtract(6, "day")
    .format("YYYY-MM-DD");
  const events = context.ledger
    .filter(
      (event) =>
        !event.revokedAt &&
        event.date >= startKey &&
        event.date <= todayKey,
    )
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  if (events.length === 0) {
    return {
      text: "这周还没有产生结果的记录 今天补一条就够 绿格只记产生结果的动作",
    };
  }

  const shown = events.slice(-6).map(
    (event) => `- ${dayjs(event.date).format("M月D日")} ${event.title}`,
  );
  return {
    text: `这周有 ${events.length} 条记录\n${shown.join("\n")}${
      events.length > 6 ? "\n……" : ""
    }`,
  };
}

function experienceListReply(context: AgentContext): AgentReply {
  if (context.experiences.length === 0) {
    return {
      text: "征途还是空的 先记一条课程设计 比赛或实习 四段不用一次写全",
    };
  }
  const shown = context.experiences.slice(0, 5).map((experience) => {
    const range = formatExperienceRange(experience.start, experience.end);
    return `- ${experience.title}（${experienceKindLabel(
      experience.kind,
      experience.kindLabel,
    )} ${range}）`;
  });
  return {
    text: `征途里有 ${context.experiences.length} 条战绩\n${shown.join("\n")}${
      context.experiences.length > 5 ? "\n……" : ""
    }\n补证据或改四段式 去征途页`,
    navigate: "experiences",
  };
}

function readinessReply(context: AgentContext): AgentReply {
  const { profile } = context;
  if (!profile) {
    return {
      text: "还没有档案 先建档 再判断离实习差什么",
    };
  }
  const readiness = computeReadiness(profile, context.experiences);
  if (context.experiences.length === 0) {
    return {
      text: `档案厚度 ${readiness.score}/100（${readiness.label}）\n下一步 ${readiness.next}\n征途还没有战绩 先记一条再判断岗位差距`,
    };
  }
  const matches = rankJobs(
    JOB_POSTINGS,
    buildMatchContext(context.resume, context.experiences, JOB_POSTINGS),
  );
  const missing = unique(
    matches.slice(0, 3).flatMap((match) => match.missingSkills),
  ).slice(0, 4);
  const target =
    profile.targetRoles.length > 0
      ? profile.targetRoles.join("、")
      : "还没写目标岗位";
  return {
    text: `档案厚度 ${readiness.score}/100（${readiness.label}）\n下一步 ${readiness.next}\n目标 ${target}\n${
      missing.length > 0
        ? `对照演示岗位 常见缺口 ${missing.join(" ")}`
        : "对照演示岗位 暂无明显技能缺口"
    }`,
    navigate: "opportunities",
  };
}

function jobReply(context: AgentContext): AgentReply {
  if (JOB_POSTINGS.length === 0) {
    return {
      text: "岗位库暂时不可用 可到征召页粘贴 JD 本地对照",
    };
  }
  if (context.experiences.length === 0) {
    return {
      text: "还没有经历 匹配只能看岗位要求 先记一条再回来对照",
      navigate: "opportunities",
    };
  }
  const matches = rankJobs(
    JOB_POSTINGS,
    buildMatchContext(context.resume, context.experiences, JOB_POSTINGS),
  );
  const lines = matches
    .slice(0, 3)
    .map((match) => {
      const job = JOB_POSTINGS.find((item) => item.id === match.jobId);
      if (!job) return "";
      const gaps = match.missingSkills.slice(0, 2);
      return `- ${job.company} ${job.title} ${match.score} 分（${
        MATCH_TIER_LABELS[match.tier]
      }）${gaps.length > 0 ? ` 缺口 ${gaps.join(" ")}` : ""}`;
    })
    .filter(Boolean);
  return {
    text: `先看这 ${lines.length} 张演示岗位卡\n${lines.join(
      "\n",
    )}\n详情在征召页 命中会指回经历原文`,
    navigate: "opportunities",
  };
}

function unsupportedReply(): AgentReply {
  return {
    text: "记录官只处理建档 写账 查账和解读\n- 帮我建档 大二 人工智能 想找算法实习\n- 记一条经历 做了什么 怎么做的 结果怎样\n- 这周做了什么\n- 离实习还差什么",
  };
}

export function runAgent(
  input: string,
  context: AgentContext,
  mode: AgentMode = "auto",
): AgentReply {
  const text = input.trim();
  if (!text) return { text: "写一句你想让我处理的事" };

  if (mode === "profile") return profileReply(text);
  if (mode === "experience") return experienceReply(text);
  if (mode === "note") return noteReply(text);

  if (/(这周|本周|最近.*做|最近.*记录)/.test(text)) {
    return weekReply(context);
  }
  if (
    /(我有哪些|查.*经历|战绩|征途里|账本里|经历库|做过什么|做了什么)/.test(text)
  ) {
    return experienceListReply(context);
  }
  if (/(差什么|差距|离实习|准备得|还缺|下一步)/.test(text)) {
    return readinessReply(context);
  }
  if (/(岗位|机会|征召|悬赏|匹配|投递)/.test(text)) {
    return jobReply(context);
  }
  if (
    /(建档|我的档案|我是|专业是|专业：|读.*专业|大[一二三四]|研究生|想找|求职)/.test(
      text,
    )
  ) {
    return profileReply(text);
  }
  if (
    /(记一条|记录|记下|经历|项目|比赛|实习|做了|完成|负责|搭建|开发|设计)/.test(
      text,
    )
  ) {
    return experienceReply(text);
  }
  if (/(备忘|想法|提醒|记一下)/.test(text)) {
    return noteReply(text);
  }
  return unsupportedReply();
}
