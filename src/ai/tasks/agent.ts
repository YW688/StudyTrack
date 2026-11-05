import dayjs from "dayjs";
import type {
  Confidence,
  Experience,
  ExperienceEvidence,
  ExperienceKind,
  ExperienceMetric,
  Goal,
  Grade,
  JobPosting,
  LedgerEvent,
  Note,
  Profile,
  ResumeData,
} from "../../types";
import { GOAL_LABELS, MATCH_TIER_LABELS } from "../../types";
import {
  experienceKindLabel,
  formatExperienceRange,
  resumeReadiness,
} from "../../lib/experience";
import {
  computeReadiness,
  streakInfo,
  studyDateKey,
  weekGreenDayCount,
} from "../../lib/ledger";
import {
  buildMatchContext,
  detectSkills,
  matchJob,
  parsePastedJd,
  PASTED_JD_PLACEHOLDER,
  QUALIFICATION_LABELS,
  qualifyJob,
  rankJobs,
} from "../../search";
import {
  ARCHIVE_FIELD_LABELS,
  createArchiveIndex,
  searchArchive,
} from "../../search/archive";
import { tokenize } from "../../search/bm25";
import {
  explicitCursor,
  explicitTheme,
  findSiteGuide,
  looksLikeGuideQuestion,
  themeName,
  type SiteGuide,
} from "../siteGuide";
import type { ThemeId } from "../../lib/theme";
import { nextTheme } from "../../lib/theme";
import { structureExperience } from "./experience";
import { judgeIntent } from "./intent";
import { isAiMockMode } from "../client";

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
  org: string;
  problem: string;
  method: string;
  contribution: string;
  result: string;
  metrics: ExperienceMetric[];
  evidence: ExperienceEvidence[];
  skills: string[];
  confidence: Confidence;
  raw: string;
}

export interface AgentJobDraft {
  job: JobPosting;
  score: number;
  tierLabel: string;
  qualLabel: string;
  hits: number;
  total: number;
  gaps: string[];
  warnings: string[];
}

export type AgentDraft =
  | { kind: "profile"; data: AgentProfileDraft }
  | { kind: "experience"; data: AgentExperienceDraft }
  | { kind: "note"; text: string }
  | { kind: "job"; data: AgentJobDraft };

export type AgentNavigate =
  | "today"
  | "experiences"
  | "opportunities"
  | "toolbox"
  | "space"
  | "resume";

export type AgentWindow =
  | "timetable"
  | "assignments"
  | "resume"
  | "calendar";

export type AgentAction =
  | { kind: "theme"; theme: ThemeId; label: string }
  | { kind: "cursor"; on: boolean; label: string }
  | { kind: "open"; window: AgentWindow; label: string };

export interface AgentReply {
  text: string;
  draft?: AgentDraft;
  navigate?: AgentNavigate;
  action?: AgentAction;
}

export interface AgentContext {
  profile: Profile | null;
  experiences: Experience[];
  ledger: LedgerEvent[];
  notes: Note[];
  resume: ResumeData;
  jobs: JobPosting[];
  theme: ThemeId;
  cursorOn: boolean;
}

/** 打开记录官时的问候：随时段与今日留痕、碎片数量变化 */
export function agentGreeting(
  context: Pick<AgentContext, "profile" | "ledger" | "notes">,
): string {
  const hour = new Date().getHours();
  const hello =
    hour < 5
      ? "夜深了"
      : hour < 11
        ? "早上好"
        : hour < 14
          ? "中午好"
          : hour < 18
            ? "下午好"
            : "晚上好";
  const today = studyDateKey();
  const todayCount = context.ledger.filter(
    (event) => !event.revokedAt && event.date === today,
  ).length;
  const streak = streakInfo(context.ledger, dayjs(today)).days;
  const inbox = context.notes.filter((note) => note.status === "inbox").length;

  const lines = [`${hello} 我是记录官`];
  if (context.profile) {
    const major = context.profile.major || "专业未填";
    lines.push(
      `${context.profile.grade} ${major} ${GOAL_LABELS[context.profile.goal]}`,
    );
  } else {
    lines.push("档案还没建 先说一句年级 专业和目标 我给你补齐");
  }
  lines.push(
    todayCount > 0
      ? `今天已经留下 ${todayCount} 条记录${streak > 1 ? ` 连续 ${streak} 天` : ""}`
      : "今天还没有留痕 一句话也算",
  );
  if (inbox > 0) lines.push(`碎片收件箱还有 ${inbox} 条待转战绩`);
  if (!isAiMockMode()) {
    lines.push("模型已接入 长段材料我先判类别再整理 原文不改写");
  }
  lines.push("想提交碎片就直接说 提交一条碎片 或者把内容打给我");
  return lines.join("\n");
}

/** 快捷命令直接摊开的空白草稿 不编内容 只给骨架 */
export function emptyExperienceDraft(): AgentExperienceDraft {
  return {
    kind: "other",
    title: "",
    org: "",
    problem: "",
    method: "",
    contribution: "",
    result: "",
    metrics: [],
    evidence: [],
    skills: [],
    confidence: "low",
    raw: "",
  };
}

export function profileDraftFrom(profile: Profile | null): AgentProfileDraft {
  return {
    grade: profile?.grade ?? "",
    major: profile?.major ?? "",
    goal: profile?.goal ?? "undecided",
    targetRoles: profile?.targetRoles ?? [],
    skills: profile?.skills ?? [],
  };
}

type PartKey = "problem" | "method" | "contribution" | "result";

const PART_ORDER: PartKey[] = ["problem", "method", "contribution", "result"];

/**
 * 四段线索词。方法段是兜底段（线索最泛），并列时让更具体的段胜出，
 * 否则「我用 Figma 画了原型并做了 18 人访谈」这类句子会被方法抢走。
 */
const PART_ANCHORS: { key: PartKey; weight: number; re: RegExp }[] = [
  {
    key: "result",
    weight: 2,
    re:
      /结果|通过|获得|荣获|获奖|验收|答辩|上线|发布|交付|提升|下降|降低|降到|降至|减少|增长|录用|转正|名次|排名|达标|一等奖|二等奖|三等奖|优秀|试用|复用|跑通|无超选|稳定/g,
  },
  {
    key: "contribution",
    weight: 2,
    re: /我负责|负责|独立|主导|承担|参与|组织|主讲|配合|推进|完成/g,
  },
  {
    key: "problem",
    weight: 2,
    re:
      /问题|痛点|难点|背景|原来|以往|过去|导致|超额|超出|缺少|缺乏|无法|不足|混乱|太慢|容易|常常|经常|流失|浪费|对不上|找不到|不会/g,
  },
  {
    key: "method",
    weight: 1,
    re:
      /用|采用|基于|借助|实现|搭建|建立|建模|分析|优化|重构|测试|设计|开发|访谈|问卷|原型|清洗|规范|算法|模型|接口|写|做|画|拆/g,
  },
];

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

function extractTitle(text: string, clauses: string[]): string {
  const labeled = text.match(
    /(?:标题|项目名称|名称)[：:]\s*([^。；;\n]{2,60})/,
  );
  if (labeled) return clean(labeled[1], 30);
  // 口述里最常见的专名提示：做了个项目 叫学径经历账本
  const named = text.match(
    /(?:叫|名为|取名|称作)\s*[：:]?\s*([^，。；;、\n\s]{2,30})/,
  );
  const quoted = text.match(/[「《"']([^」》"']{4,40})[」》"']/);
  // 空格是分隔符 不在这里停手就会把后半句话一起当成标题
  // 「我负责中断初始化」里的动词是贡献 不是项目名 前面有人称代词就不当标题
  const action = [...text.matchAll(/(^|[\s，。；;、])(?:做了|完成|参加|参与|开发|设计|搭建|实现|负责|组织|开展)(?:一个|一项|一次|一场)?\s*([^，。；;、\n\s用写做并把并且和与]{2,24})/g)]
    .find((match) => !/^(?:我|我们|他|她|他们|自己|本人)$/.test(match[1]));
  const raw =
    labeled?.[1] ?? named?.[1] ?? quoted?.[1] ?? action?.[2] ?? "";
  if (raw) {
    return clean(raw.replace(/^(?:一个|一项|一次|一场|[个种项款]\s*)/, ""), 30);
  }
  const first = (clauses[0] ?? text).split(CJK_SPACE_SPLIT)[0];
  return clean(first.replace(/^(?:我|我们)?(?:当时|之前|后来|现在)?/, ""), 30);
}

/** 机构名只接受看起来像专名的短串 拿不准就留空让用户自己填 */
const ORG_SUFFIXES =
  "(?:有限责任公司|有限公司|集团|研究院|研究所|实验室|学院|大学|工作室|事业部|社团|协会|中心|部门|团队)";
const ORG_REJECT = /[的了到从很也都在把被和与及为是等内后前拿做写用通过验收最后以内一]/;

function extractOrg(text: string): string {
  const labeled = text.match(
    /(?:组织|单位|公司|团队|课程|赛事)[：:]\s*([^，。；;\n]{2,40})/,
  );
  if (labeled) return clean(labeled[1], 80);
  const match = text.match(
    new RegExp(
      `([\\u4e00-\\u9fffA-Za-z0-9（）()·]{2,14}${ORG_SUFFIXES})`,
    ),
  );
  const value = match?.[1] ?? "";
  if (!value || value.length > 18) return "";
  const stem = value.replace(new RegExp(`${ORG_SUFFIXES}$`), "");
  if (ORG_REJECT.test(stem)) return "";
  return clean(value.replace(/^(?:在|于|来自|进入|入职)/, ""), 80);
}

const LABEL_STOP = [
  "下降约",
  "提升约",
  "减少约",
  "增加约",
  "下降到",
  "提升到",
  "降低到",
  "优化到",
  "大约",
  "超过",
  "达到",
  "输出",
  "支持",
  "覆盖",
  "实现",
  "完成",
  "下降",
  "提升",
  "减少",
  "增加",
  "增长",
  "降低",
  "提高",
  "一共",
  "累计",
  "发布",
  "试用",
  "上线",
  "优化",
  "降到",
  "升到",
  "拿到",
  "稳定",
];

const GENERIC_LABELS = ["项目", "这个", "那个", "一次", "一块", "一共"];

/** 量词单独出现在标签头部时没有信息量 例如「个班级」收成「班级」 */
const LEADING_MEASURES = /[个种次项张台份条篇位名类件道题门课页场回轮]*/;

const LABEL_EDGE_CHARS =
  "的了是在从为把被和与就都还又也很更让使当于对到等共由以及因为以并且以内将该对着每";

const VERB_LABEL_HEADS = [
  "画",
  "做",
  "用",
  "写",
  "建",
  "改",
  "测",
  "跑",
  "讲",
  "教",
  "组织",
  "负责",
  "参与",
  "开发",
  "设计",
  "搭建",
  "访谈",
];

function trimLabel(raw: string): string {
  let value = raw.trim().slice(-10);
  let changed = true;
  while (changed) {
    changed = false;
    for (const stop of LABEL_STOP) {
      if (value.endsWith(stop)) {
        value = value.slice(0, -stop.length);
        changed = true;
      }
      if (value.startsWith(stop)) {
        value = value.slice(stop.length);
        changed = true;
      }
    }
    while (value && LABEL_EDGE_CHARS.includes(value[0])) {
      value = value.slice(1);
      changed = true;
    }
    while (value && LABEL_EDGE_CHARS.includes(value[value.length - 1])) {
      value = value.slice(0, -1);
      changed = true;
    }
    const stripped = value.replace(LEADING_MEASURES, "");
    if (stripped !== value) {
      value = stripped;
      changed = true;
    }
  }
  return value;
}

/** 取紧邻数字前/后的中文短串做标签 取不到就丢弃这条数字 不编造标签 */
function labelAround(text: string, numberIndex: number, unitEnd: number): string {
  const before = text.slice(0, numberIndex);
  const after = text.slice(unitEnd);
  const preRun = trimLabel(before.match(/([\u4e00-\u9fff]{2,10})\s*$/)?.[1] ?? "");
  const postRun = trimLabel(after.match(/^\s*([\u4e00-\u9fff]{2,8})/)?.[1] ?? "");
  const preIsVerb = VERB_LABEL_HEADS.some((head) => preRun.startsWith(head));
  const preIsGeneric = GENERIC_LABELS.includes(preRun);
  if (preRun.length >= 2 && !preIsVerb && !preIsGeneric) {
    return preRun.slice(-6);
  }
  if (postRun.length >= 2) return postRun.slice(0, 6);
  if (preRun.length >= 2) return preRun.slice(-6);
  return "";
}

const NUM_UNITS =
  "%|％|‰|人次|毫秒|分钟|秒|天|周月|周|月|年|元|万元|人|位|名|个|张|页|场|次|篇|项|条|组|轮|门|课|题|本|份|台|款|版|级|倍|度|强";
const NUMBER_RE = new RegExp(`(\\d+(?:[.,]\\d+)?)\\s*(${NUM_UNITS})`, "g");
const FROM_TO_RE = new RegExp(
  `从\\s*(\\d+(?:\\.\\d+)?)\\s*(${NUM_UNITS})\\s*(?:下降到|降到|降至|降低到|减少到|提升到|上升到|提高到|优化到|到)\\s*(\\d+(?:\\.\\d+)?)\\s*(${NUM_UNITS})`,
);

function extractMetrics(text: string): ExperienceMetric[] {
  const metrics: ExperienceMetric[] = [];
  const consumed: [number, number][] = [];

  const fromTo = text.match(FROM_TO_RE);
  if (fromTo && fromTo.index !== undefined) {
    const label = labelAround(text, fromTo.index, fromTo.index);
    metrics.push({
      label: label || "前后对比",
      value: clean(`${fromTo[1]} ${fromTo[2]} → ${fromTo[3]} ${fromTo[4]}`, 40),
    });
    consumed.push([fromTo.index, fromTo.index + fromTo[0].length]);
  }

  for (const match of text.matchAll(NUMBER_RE)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    if (consumed.some(([from, to]) => start < to && end > from)) continue;
    if (metrics.length >= 3) break;
    const unit = match[2];
    const value = clean(
      /[%％‰]/.test(unit) ? `${match[1]}${unit}` : `${match[1]} ${unit}`,
      40,
    );
    const label = labelAround(text, start, end);
    if (!label) continue;
    if (/^(?:20|19)\d\d$/.test(match[1]) && label.length < 3) continue;
    metrics.push({ label, value });
  }

  const seen = new Set<string>();
  return metrics.filter((metric) => {
    const key = `${metric.label}${metric.value}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const URL_RE = /https?:\/\/[^\s，。；;"'）)】]+/g;
const LABELED_EVIDENCE_RE =
  /(?:证据|附件|材料|证明|报告|截图|链接|文档|仓库|演示)[：:]\s*([^，。；;\n]{2,40})/g;

function extractEvidence(text: string): ExperienceEvidence[] {
  const items: ExperienceEvidence[] = [];
  for (const match of text.matchAll(URL_RE)) {
    const start = match.index ?? 0;
    const label = labelAround(text, start, start) || "链接";
    items.push({ label: label.slice(0, 40), url: match[0].slice(0, 300) });
    if (items.length >= 2) break;
  }
  for (const match of text.matchAll(LABELED_EVIDENCE_RE)) {
    const label = clean(match[1], 40);
    if (!label) continue;
    if (items.some((item) => item.label === label)) continue;
    items.push({ label });
    if (items.length >= 3) break;
  }
  return items.slice(0, 3);
}

/** 没有标点的一整口气，按承接词再切一刀，否则长句只会落进一个段 */
const TRANSITION_SPLIT = /(?=(?:并且|然后|接着|最后|同时|另外|因此|所以|于是|最终|拿到|结果|后来|之后))/;

/** 空格后面接中文时，空格就是分隔符；数字两侧的空格不算，否则「18 人」会被切碎 */
// 只在两侧都是汉字时按空格断句 「用 C 语言」「每 200 毫秒」的空格是词内空格 劈开就把句子拆碎了
const CJK_SPACE_SPLIT = /(?<=[\u4e00-\u9fff])\s+(?=[\u4e00-\u9fff])/;

/** 以连接词开头的碎片不是新的一句 「React 和 IndexedDB」不该被空格劈成两截
 *  只收 TRANSITION_SPLIT 不管的词 否则会把承接边界又粘回去 */
const LEADING_CONJUNCTION =
  /^(?:和|与|及|或|并|而|但|也|都|就|还|又|跟|让|把|被|以及)/;

function segmentClauses(body: string): string[] {
  const pieces: string[] = [];
  for (const sentence of body.split(/[。！？；;!?]+/)) {
    for (const piece of sentence.split(/[，,\n]+/)) {
      const value = piece.trim();
      if (!value) continue;
      if (value.length <= 28) {
        pieces.push(value);
        continue;
      }
      for (const item of value
        .split(TRANSITION_SPLIT)
        .flatMap((part) => part.split(CJK_SPACE_SPLIT))) {
        const trimmed = item.trim();
        if (!trimmed) continue;
        if (pieces.length > 0 && LEADING_CONJUNCTION.test(trimmed)) {
          pieces[pieces.length - 1] = `${pieces[pieces.length - 1]} ${trimmed}`;
          continue;
        }
        pieces.push(trimmed);
      }
    }
  }
  // 太短的碎片并进后一句：「实验报告」是「最后评为优秀」的主语 不是上一句的尾巴
  const clauses: string[] = [];
  for (let index = 0; index < pieces.length; index += 1) {
    const value = pieces[index];
    if (value.length >= 6) {
      clauses.push(value);
    } else if (index + 1 < pieces.length) {
      pieces[index + 1] = `${value} ${pieces[index + 1]}`;
    } else if (clauses.length > 0) {
      clauses[clauses.length - 1] = `${clauses[clauses.length - 1]} ${value}`;
    } else {
      clauses.push(value);
    }
  }
  return clauses;
}

function scoreClause(clause: string): { key: PartKey; score: number } {
  let best: PartKey = "method";
  let bestScore = 0;
  for (const anchor of PART_ANCHORS) {
    const hits = clause.match(anchor.re);
    const score = new Set(hits ?? []).size * anchor.weight;
    if (score > bestScore) {
      best = anchor.key;
      bestScore = score;
    }
  }
  return { key: best, score: bestScore };
}

function parseExperience(text: string): AgentExperienceDraft {
  const body =
    text
      .replace(/^(?:帮我)?记(?:一条|下)?(?:经历|记录|战绩)?[：:，,\s]\s*/, "")
      .trim() || text;
  // 「叫学径经历账本」这类纯起名碎片已经进了标题 不再占一个段
  // 「地址是 https://…」已经进了证据 也不该留在四段正文里
  const clauses = segmentClauses(body).filter(
    (clause) =>
      !/^(?:叫|名为|取名|称作)[：:]?[^\s，。；]{2,20}$/.test(clause) &&
      !/^(?:地址|链接|网址|官网)[是为：:]?\s*(?:https?:\/\/|www\.)\S+$/.test(
        clause,
      ),
  );
  const title = extractTitle(body, clauses);
  // 标题取自开头那句时 那句不再占一个段 否则会被当成 loose 补进方法里
  const head = clauses[0]?.replace(/^(?:标题|项目名称|名称)[：:]\s*/, "");
  const parts =
    head && title && (head === title || head.startsWith(title))
      ? clauses.slice(1)
      : clauses;
  const buckets: Record<PartKey, string[]> = {
    problem: [],
    method: [],
    contribution: [],
    result: [],
  };
  const anchored: Record<PartKey, boolean> = {
    problem: false,
    method: false,
    contribution: false,
    result: false,
  };
  const loose: string[] = [];

  for (const clause of parts) {
    const { key, score } = scoreClause(clause);
    if (score === 0) {
      loose.push(clause);
      continue;
    }
    buckets[key].push(clause);
    anchored[key] = true;
  }

  // 没有线索词的句子按四段顺序补空位 补进去的不算自动识别成功 置信仍为待确认
  for (const clause of loose) {
    const empty = PART_ORDER.find((key) => buckets[key].length === 0);
    if (empty) buckets[empty].push(clause);
    else buckets.method.push(clause);
  }

  // 一段里连读用逗号 分号会让四段读起来像清单
  const part = (key: PartKey) => clean(buckets[key].join("，"), 2000);
  const problem = part("problem");
  const method = part("method");
  const contribution = part("contribution");
  const result = part("result");
  const filled = [problem, method, contribution, result].filter(Boolean).length;
  const anchorCount = PART_ORDER.filter((key) => anchored[key] && buckets[key].length > 0)
    .length;

  return {
    kind: inferKind(body),
    title,
    org: extractOrg(body),
    problem,
    method,
    contribution,
    result,
    metrics: extractMetrics(body),
    evidence: extractEvidence(body),
    skills: detectSkills(body),
    confidence: filled === 4 && anchorCount >= 3 ? "high" : "low",
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

/** 数据铁律 7：四段齐 + 有数字或证据 + 高置信，三者缺一就不算简历就绪 */
export function readinessGaps(draft: AgentExperienceDraft): string[] {
  const gaps: string[] = [];
  const missing = missingExperienceParts(draft).length;
  if (missing > 0) gaps.push(`四段式还差 ${missing} 段`);
  if (draft.metrics.length === 0 && draft.evidence.length === 0) {
    gaps.push("证据或量化数据");
  }
  if (draft.confidence === "low") gaps.push("低置信待确认");
  return gaps;
}

const DRAFT_JOB_ID = "agent-draft";

function draftExperience(draft: AgentExperienceDraft): Experience {
  const now = new Date().toISOString();
  return {
    id: DRAFT_JOB_ID,
    kind: draft.kind,
    title: draft.title || "这条草稿",
    org: draft.org || undefined,
    problem: draft.problem,
    method: draft.method,
    contribution: draft.contribution,
    result: draft.result,
    metrics: draft.metrics,
    evidence: draft.evidence,
    skills: draft.skills,
    tags: [],
    confidence: draft.confidence,
    source: "ai",
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * 只让这条草稿参与匹配（简历勾选位空出来给草稿本身），
 * 这样列出的缺口是「这条经历没写到」，而不是整本档案没覆盖。
 */
function jobGapLines(
  draft: AgentExperienceDraft,
  context: AgentContext,
): string[] {
  if (context.jobs.length === 0) return [];
  const experience = draftExperience(draft);
  const draftResume: ResumeData = {
    ...context.resume,
    selectedExperienceIds: [experience.id],
  };
  const matches = rankJobs(
    context.jobs,
    buildMatchContext(draftResume, [experience], context.jobs),
  );
  const top = matches[0];
  const job = top && context.jobs.find((item) => item.id === top.jobId);
  if (!top || !job) return [];

  const head = `对照「${job.company} ${job.title}」`;
  if (top.gaps.length > 0) {
    return [
      `${head}这条还差 ${top.gaps.length} 项要求`,
      ...top.gaps
        .slice(0, 2)
        .map((gap) => `- ${gap.requirement.slice(0, 40)} 这条里没写到`),
    ];
  }
  if (top.missingSkills.length > 0) {
    return [`${head}这条还没体现 ${top.missingSkills.slice(0, 3).join(" ")}`];
  }
  return [`${head}这条已覆盖全部可匹配要求`];
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

async function experienceReply(
  text: string,
  context: AgentContext,
): Promise<AgentReply> {
  if (text.length < 8) {
    return {
      text: "再多说一点 一句话也行 做了什么 怎么做的 你负责哪块 最后怎样",
    };
  }
  const { draft, note } = await structureExperience(
    text,
    parseExperience(text),
  );
  const missing = missingExperienceParts(draft);
  const lines: string[] = [];
  const counts = [
    draft.metrics.length > 0 ? `${draft.metrics.length} 条数字` : "",
    draft.evidence.length > 0 ? `${draft.evidence.length} 条证据` : "",
  ].filter(Boolean);

  lines.push(
    missing.length === 0
      ? `已自动分成四段 类型 ${experienceKindLabel(draft.kind)}`
      : `已自动分成四段 还缺 ${missing.join(" ")} 可以直接在下面补`,
  );
  if (note) lines.push(note);
  if (counts.length > 0) lines.push(`顺带抽出 ${counts.join(" ")}`);
  if (draft.confidence === "low") {
    lines.push("有几段没抓到明确线索 标为待确认 确认后才会进简历");
  }
  lines.push(...jobGapLines(draft, context));

  const gaps = readinessGaps(draft);
  if (gaps.length > 0) {
    lines.push(`离简历就绪还差 ${gaps.join(" ")}`);
  } else {
    lines.push("四段与数字都齐 确认后即为简历就绪 自动进简历草稿");
  }

  return {
    text: lines.join("\n"),
    draft: { kind: "experience", data: draft },
  };
}

/** 「提交一条碎片」「新增碎片」这类说法 直接出碎片草稿 不绕去收件箱指路 */
function looksLikeFragmentCreation(text: string): boolean {
  if (/[?？]|怎么|如何|在哪|哪里|步骤/.test(text)) return false;
  return (
    /(提交|投递|新增|添加|加|写|记|来|提)\s*(一条|一个|条)?\s*(新的?)?\s*碎片/.test(
      text,
    ) || /^碎片\s*[：:，,]/.test(text)
  );
}

/** 只取「碎片」后面的正文 命令词不进记录 */
function fragmentText(text: string): string {
  return text
    .replace(
      /^(我想|我要|帮我|麻烦|请)?\s*(提交|投递|新增|添加|加|写|记|来|提)?\s*(一条|一个)?\s*(新的?)?\s*碎片\s*[：:，,。．.\-—]?\s*/u,
      "",
    )
    .trim()
    .slice(0, 1000);
}

function noteReply(text: string): AgentReply {
  const body = fragmentText(text);
  return {
    text: body
      ? "好 这条我按碎片记下了 确认后进征途碎片收件箱\n之后想把它变成战绩 说一声 我带你转"
      : "好 这条按碎片记 直接把内容写进下面就行\n碎片先落在收件箱 不算完整经历 之后再转成战绩",
    draft: { kind: "note", text: body },
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
  const today = dayjs(todayKey);
  const greenDays = weekGreenDayCount(context.ledger, today);
  const streak = streakInfo(context.ledger, today).days;

  if (events.length === 0) {
    return {
      text: `这周还没留下带结果的记录\n本周 ${greenDays} 天有结果 连续 ${streak} 天\n今天补一条就够 绿格只记产生结果的动作`,
      navigate: "today",
    };
  }

  const shown = events.slice(-6).map(
    (event) => `- ${dayjs(event.date).format("M月D日")} ${event.title}`,
  );
  return {
    text: `翻了翻这周的账 留下 ${events.length} 条记录 ${greenDays} 天有结果\n${shown.join(
      "\n",
    )}${events.length > 6 ? "\n……" : ""}\n连续 ${streak} 天 今天再推进一步就能续上`,
    navigate: "today",
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

const ARCHIVE_NOISE = [
  "我有哪些",
  "有哪些",
  "帮我查",
  "查一下",
  "查账",
  "征途里",
  "征途",
  "账本里",
  "经历库",
  "做过什么",
  "做了什么",
  "有没有",
  "关于",
  "的记录",
  "的经历",
  "的事情",
  "一下",
];

function hasSearchTerm(query: string): boolean {
  if (/[\u4e00-\u9fff]{2,}/.test(query)) return true;
  return /[a-z0-9+#.]{2,}/i.test(query);
}

function archiveQuery(text: string): string {
  let value = text;
  for (const noise of ARCHIVE_NOISE) {
    value = value.split(noise).join(" ");
  }
  return value
    .replace(/[?？!！。，,、;；:：]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** 战绩里没写到的，再翻一遍碎片收件箱，只回用户自己写下的原句 */
function searchNotes(
  notes: Note[],
  query: string,
  limit = 3,
): { note: Note; hits: number }[] {
  const terms = [...new Set(tokenize(query))];
  if (terms.length === 0) return [];
  const need = Math.min(2, terms.length);
  return notes
    .filter((note) => note.status !== "archived")
    .map((note) => {
      const lower = note.text.toLowerCase();
      const hits = terms.filter((term) => lower.includes(term)).length;
      return { note, hits };
    })
    .filter((item) => item.hits >= need)
    .sort(
      (a, b) =>
        b.hits - a.hits || b.note.createdAt.localeCompare(a.note.createdAt),
    )
    .slice(0, limit);
}

function archiveReply(text: string, context: AgentContext): AgentReply {
  if (context.experiences.length === 0) return experienceListReply(context);

  const query = archiveQuery(text);
  if (query.length < 2 || !hasSearchTerm(query)) {
    return experienceListReply(context);
  }

  const hits = searchArchive(createArchiveIndex(context.experiences), query, 4);
  const notes = searchNotes(context.notes, query);
  // 碎片只作补充 不能顶替战绩原文 但可以告诉用户这条还躺在收件箱里
  const noteLines = notes.map(
    (item) => `- 碎片「${item.note.text.replace(/\s+/g, " ").slice(0, 80)}」`,
  );

  if (hits.length === 0) {
    return {
      text:
        noteLines.length > 0
          ? `战绩里没有和「${query}」对得上的原文\n收件箱里有 ${noteLines.length} 条相关碎片\n${noteLines.join(
              "\n",
            )}\n去征途把碎片转成战绩再补四段`
          : `战绩里没有和「${query}」对得上的原文\n换一种说法再问 或去征途翻全部 ${context.experiences.length} 条`,
      navigate: "experiences",
    };
  }

  const lines = hits.map(
    (hit) =>
      `- ${hit.title}（${ARCHIVE_FIELD_LABELS[hit.field]}）「${hit.quote}」${
        hit.confidence === "low" ? " 低置信 确认后才进简历" : ""
      }`,
  );
  return {
    text: `从 ${context.experiences.length} 条战绩里找到 ${hits.length} 条与「${query}」相关\n${lines.join(
      "\n",
    )}${
      noteLines.length > 0
        ? `\n收件箱里还有 ${noteLines.length} 条相关碎片 去征途可以转成战绩`
        : ""
    }\n引用的是你写下的原文 要改去征途页`,
    navigate: "experiences",
  };
}

function poolLabel(context: AgentContext): string {
  return context.jobs.some((job) => job.custom)
    ? "本机岗位库与演示卡"
    : "演示岗位卡";
}

function readinessReply(context: AgentContext): AgentReply {
  const { profile } = context;
  if (!profile) {
    return {
      text: "还没有档案 先说一句 大二 人工智能 想找算法实习 我就能判断差什么",
    };
  }
  const readiness = computeReadiness(profile, context.experiences);
  if (context.experiences.length === 0) {
    return {
      text: `档案厚度 ${readiness.score}/100（${readiness.label}）\n下一步 ${readiness.next}\n征途还没有战绩 先记一条再判断岗位差距`,
      navigate: "experiences",
    };
  }
  const jobs = context.jobs;
  const matches = rankJobs(
    jobs,
    buildMatchContext(context.resume, context.experiences, jobs),
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
        ? `对照${poolLabel(context)} 常见缺口 ${missing.join(" ")}`
        : `对照${poolLabel(context)} 暂无明显技能缺口`
    }\n去征召按岗位逐条对照 想把差距补掉就再记一条战绩`,
    navigate: "opportunities",
  };
}

function jobReply(context: AgentContext): AgentReply {
  const jobs = context.jobs;
  if (jobs.length === 0) {
    return {
      text: "岗位库是空的 粘一段岗位原文给我 确认后就能存进本机岗位库",
      navigate: "opportunities",
    };
  }
  const customCount = jobs.filter((job) => job.custom).length;
  const poolLine = customCount > 0
    ? `其中 ${customCount} 张是你粘贴进本机岗位库的 JD`
    : "征召页粘贴 JD 会存进本机岗位库 一起参与排序";

  if (context.experiences.length === 0) {
    const lines = jobs.slice(0, 3).map((job) => {
      const city = job.city ? ` ${job.city}` : "";
      return `- ${job.company} ${job.title}${city} ${job.requirements.length} 条要求`;
    });
    return {
      text: `岗位库里这几张先看\n${lines.join(
        "\n",
      )}\n记一条战绩后这里会给匹配分与缺口\n${poolLine}`,
      navigate: "opportunities",
    };
  }

  const matches = rankJobs(
    jobs,
    buildMatchContext(context.resume, context.experiences, jobs),
  );
  const lines = matches
    .slice(0, 3)
    .map((match) => {
      const job = jobs.find((item) => item.id === match.jobId);
      if (!job) return "";
      const gaps = match.missingSkills.slice(0, 2);
      return `- ${job.company} ${job.title} ${match.score} 分（${
        MATCH_TIER_LABELS[match.tier]
      }）${gaps.length > 0 ? ` 缺口 ${gaps.join(" ")}` : ""}`;
    })
    .filter(Boolean);
  return {
    text: `按你现在的战绩排了下 先看这 ${lines.length} 张${
      customCount > 0 ? "本机与演示岗位卡" : "演示岗位卡"
    }\n${lines.join("\n")}\n${poolLine}\n详情在征召页 命中会指回经历原文`,
    navigate: "opportunities",
  };
}

const JD_HEADINGS =
  /(任职要求|任职资格|岗位职责|工作职责|岗位要求|职位描述|加分项|你将负责|我们希望你|福利待遇|薪资)/;
const JD_BULLET = /^[-·•●－]|^\d+[.、)]/;
const FIRST_PERSON = /(我负责|我做了|我参与|我独立|我们团队|我用|我写)/;

/** 岗位原文与口述都塞满「负责」「设计」 本机只靠小标题、条目式短句和主语把它们分开 */
function looksLikeJd(text: string): boolean {
  if (text.length < 40) return false;
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const bullets = lines.filter((line) => JD_BULLET.test(line)).length;
  if (!JD_HEADINGS.test(text) && bullets < 3) return false;
  return !FIRST_PERSON.test(text);
}

/** 一段 JD → 本机解析加匹配摘要；写入仍等用户确认 */
function pastedJdReply(text: string, context: AgentContext): AgentReply {
  const parsed = parsePastedJd({
    raw: text,
    title: "",
    company: "",
    city: "",
    type: /实习/.test(text) ? "intern" : "campus",
  });
  if (!parsed.job) {
    return { text: parsed.warnings[0] ?? "这段 JD 太短 至少粘 20 个字" };
  }
  const job = parsed.job;
  const match = matchJob(
    job,
    buildMatchContext(context.resume, context.experiences, [...context.jobs, job]),
  );
  const readyIds = new Set(
    context.experiences
      .filter((experience) => resumeReadiness(experience).ready)
      .map((experience) => experience.id),
  );
  const qualification = qualifyJob(match, readyIds);
  const total = match.hits.length + match.gaps.length;
  const companyLine =
    job.company === PASTED_JD_PLACEHOLDER.company
      ? "公司未填"
      : `公司 ${job.company}`;
  const titleLine =
    job.title === PASTED_JD_PLACEHOLDER.title
      ? "岗位名未填"
      : `岗位 ${job.title}`;

  const lines = [
    `已按岗位 JD 处理 ${companyLine} ${titleLine}`,
    `拆出 ${job.requirements.length} 条要求 识别 ${job.skills.length} 个技能`,
  ];
  if (total > 0) {
    const selected = context.resume.selectedExperienceIds.length;
    lines.push(
      `对照选进简历的 ${selected} 条战绩 ${match.score} 分 ${MATCH_TIER_LABELS[match.tier]} 命中 ${match.hits.length}/${total} ${QUALIFICATION_LABELS[qualification.tier]}`,
    );
  }
  for (const gap of match.gaps.slice(0, 2)) {
    lines.push(`缺口 ${gap.requirement.slice(0, 40)}`);
  }
  if (parsed.warnings.length > 0) lines.push(parsed.warnings[0]);
  lines.push("确认后存进本机岗位库 之后一起参与排序");

  return {
    text: lines.join("\n"),
    draft: {
      kind: "job",
      data: {
        job,
        score: match.score,
        tierLabel: MATCH_TIER_LABELS[match.tier],
        qualLabel: QUALIFICATION_LABELS[qualification.tier],
        hits: match.hits.length,
        total,
        gaps: match.gaps.slice(0, 3).map((gap) => gap.requirement.slice(0, 60)),
        warnings: parsed.warnings,
      },
    },
  };
}

const WINDOW_ACTION_LABELS: Record<
  NonNullable<SiteGuide["window"]>,
  string
> = {
  timetable: "打开课表",
  assignments: "打开作业",
  resume: "打开简历",
  calendar: "打开日历",
};

const SITE_MAP_LINES = [
  "站内一共五个面",
  "- 今日 简报 委托 节奏 情报",
  "- 征途 战绩 四段式 证据 碎片收件箱",
  "- 征召 官方入口 岗位卡 粘贴 JD 匹配",
  "- 工具箱 课表 作业 简历 日历",
  "- 学径空间 留痕星图",
  "设置都在顶栏 右上角 <配色> 按钮与中间存档胶囊",
];

function siteMapReply(): AgentReply {
  return {
    text: `${SITE_MAP_LINES.join(
      "\n",
    )}\n直接问 怎么换主题 怎么导课表 怎么填 Key 我告诉你点哪里`,
  };
}

/** 每张功能卡的开场句 让回答像在对话 而不是念说明书 */
const GUIDE_OPENERS: Record<string, string> = {
  theme: "换主题很快",
  cursor: "主题光标在顶栏的存档胶囊里",
  model: "接自己的模型 先把 Key 准备好",
  backup: "换设备前先导一份备份",
  clear: "清本机数据从存档胶囊里走",
  jobLibrary: "岗位原文直接粘给我就行",
  inbox: "碎片统一在征途里收",
  experiences: "记战绩在征途 我也可以直接帮你收",
  opportunities: "找岗位去征召",
  resume: "简历在工具箱 我帮你打开",
  timetable: "导入课表 我帮你打开",
  assignments: "作业和 DDL 在工具箱",
  calendar: "竞赛与考试的日历在工具箱",
  space: "星图在学径空间",
  today: "回今日看今天的简报",
  profile: "改档案 我直接给你一份草稿",
  command: "搜索用 Ctrl K",
  agent: "我在 随时喊我",
  archive: "查账直接问我就行",
  guide: "站内五个面 我带你走一遍",
};

/** 站内指路只念功能卡上的真实按钮 能代劳的直接给一个动作按钮 */
function guideReply(text: string, context: AgentContext): AgentReply {
  const guide = findSiteGuide(text);
  if (!guide) return siteMapReply();

  const lines = [GUIDE_OPENERS[guide.id] ?? guide.title, ...guide.steps];
  const reply: AgentReply = { text: "" };

  if (guide.route) reply.navigate = guide.route;
  if (guide.window) {
    reply.action = {
      kind: "open",
      window: guide.window,
      label: WINDOW_ACTION_LABELS[guide.window],
    };
    lines.push(`点下面的 <${WINDOW_ACTION_LABELS[guide.window]}> 我替你开`);
  }

  if (guide.id === "theme") {
    const named = explicitTheme(text);
    const target = named ?? nextTheme(context.theme);
    const targetName = themeName(target);
    if (named) lines[0] = `想换到${targetName} 我直接来`;
    if (target === context.theme) {
      lines[0] = `现在就是${targetName}`;
      const other = nextTheme(context.theme);
      const otherName = themeName(other);
      lines.push(`点下面的按钮可以换到${otherName}`);
      reply.action = {
        kind: "theme",
        theme: other,
        label: `切到${otherName}`,
      };
    } else {
      lines.push(`点下面的 <切到${targetName}> 我直接换过去`);
      reply.action = { kind: "theme", theme: target, label: `切到${targetName}` };
    }
  } else if (guide.id === "cursor") {
    const on = explicitCursor(text) ?? !context.cursorOn;
    const label = on ? "开启主题光标" : "关闭主题光标";
    lines.push(`点下面的 <${label}> 我直接改`);
    reply.action = { kind: "cursor", on, label };
  }

  reply.text = lines.join("\n");
  return reply;
}

function unsupportedReply(): AgentReply {
  return {
    text: "这句我还没完全接住\n我能做的是 写账 查账 收 JD 和站内指路\n- 想提交碎片 就说 提交一条碎片 或者把内容直接写给我\n- 想记战绩 说一句 今天做了什么\n- 想看看机会 说 看 3 个岗位\n- 想换主题 说 换到庄园 我直接切",
  };
}

export async function runAgent(
  input: string,
  context: AgentContext,
  mode: AgentMode = "auto",
): Promise<AgentReply> {
  const text = input.trim();
  if (!text) return { text: "写一句你想让我处理的事" };

  if (mode === "profile") return profileReply(text);
  if (mode === "experience") return experienceReply(text, context);
  if (mode === "note") return noteReply(text);

  // 单纯打招呼就回一句问候 顺带报今天的留痕与碎片
  if (
    /^(记录官)?\s*(你好|您好|嗨|hi|hello|在吗|在不在|早上好|中午好|下午好|晚上好)[\s!！。.?？]*$/i.test(
      text,
    )
  ) {
    return { text: agentGreeting(context) };
  }

  // 一段长文本先让模型判断这是什么：岗位原文和口述都塞满「负责」「设计」，本机关键词分不开。
  // 没接模型、超时或它自己拿不准时返回 null，落到下面的本机规则链。
  if (text.length >= 40) {
    const intent = await judgeIntent(text);
    if (intent === "job") return pastedJdReply(text, context);
    if (intent === "experience") return experienceReply(text, context);
    if (intent === "note") return noteReply(text);
    if (intent === "profile") return profileReply(text);
    if (intent === "week") return weekReply(context);
    if (intent === "archive") return archiveReply(text, context);
    if (intent === "readiness") return readinessReply(context);
    if (intent === "jobs") return jobReply(context);
    if (intent === "guide") return guideReply(text, context);
    if (intent === "unsupported") return unsupportedReply();
  }

  if (looksLikeJd(text)) return pastedJdReply(text, context);

  if (/(这周|本周|最近.*做|最近.*记录)/.test(text)) {
    return weekReply(context);
  }
  if (/(差什么|差距|离实习|准备得|还缺|下一步)/.test(text)) {
    return readinessReply(context);
  }
  // 用户想把新碎片交进来 就直接出草稿 别再念收件箱的操作步骤
  if (looksLikeFragmentCreation(text)) return noteReply(text);

  // 指路放在查账和找岗位前面：问「怎么查」「在哪填」时要先答方法 而不是直接给结果
  const switchesTheme =
    explicitTheme(text) !== null &&
    /(主题|配色|皮肤|界面|换|切|改成|改用|想|要)/.test(text);
  if (switchesTheme || explicitCursor(text) !== null) {
    return guideReply(text, context);
  }
  if (looksLikeGuideQuestion(text)) {
    return guideReply(text, context);
  }

  if (/(看|推荐|列出|给我|有什么|哪些).{0,8}(岗位|机会)|征召|投递|匹配/.test(text)) {
    return jobReply(context);
  }
  if (
    /(我有哪些|查.*经历|战绩|征途里|账本里|经历库|做过什么|做了什么)/.test(text)
  ) {
    return archiveReply(text, context);
  }
  // 建档声明都是短句；一整段口述里出现「大四」「想找」不能把它抢去建档，它是要记的战绩
  if (
    text.length < 40 &&
    /(建档|我的档案|我是|专业是|专业：|读.*专业|大[一二三四]|研究生|想找|求职)/.test(
      text,
    )
  ) {
    return profileReply(text);
  }
  if (
    /(记一条|记下|记一下|留一句).{0,3}(备注|想法|待办|提醒)|备忘|提醒我/.test(
      text,
    )
  ) {
    return noteReply(text);
  }
  if (
    /(记一条|记录|记下|经历|项目|比赛|实习|做了|完成|负责|搭建|开发|设计)/.test(
      text,
    )
  ) {
    return experienceReply(text, context);
  }
  if (/(备忘|想法|提醒)/.test(text)) {
    return noteReply(text);
  }
  // 短句里只有一个站内名词时 当作在问这一项怎么用 例如 主题 简历 课表
  if (findSiteGuide(text)) {
    return guideReply(text, context);
  }
  // 一整段话没有被上面任何意图接住时，按最可能的用途处理：它是一条战绩
  if (text.length >= 40) return experienceReply(text, context);
  // 短句本机没接住时再问一次模型属于哪类（只判类别 不改写内容）
  const intent = await judgeIntent(text);
  if (intent === "note") return noteReply(text);
  if (intent === "profile") return profileReply(text);
  if (intent === "experience") return experienceReply(text, context);
  if (intent === "guide") return guideReply(text, context);
  if (intent === "jobs") return jobReply(context);
  if (intent === "week") return weekReply(context);
  if (intent === "archive") return archiveReply(text, context);
  if (intent === "readiness") return readinessReply(context);
  return unsupportedReply();
}
