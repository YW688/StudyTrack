#!/usr/bin/env node
/*
 * 学径 StudyTrack · 记录官 MCP Server（stdio）
 *
 * 只读一份本机导出的备份 JSON（工具箱 → 本机数据 → 导出备份），不联网、不调模型、不写任何存储。
 * 写账与建档只返回草稿，用户仍要在页面里确认后才会落库。
 *
 *   node mcp/server.ts --backup ./studytrack-backup-20261104-1057.json
 *   node mcp/server.ts --latest ./            # 取目录里最新的一份
 *
 * 挂进 MCP 客户端（Qoder 设置 → MCP → 添加）用的配置：
 *   {
 *     "mcpServers": {
 *       "studytrack-agent": {
 *         "command": "node",
 *         "args": ["E:/StudyTrack/mcp/server.ts", "--latest", "C:/Users/你/Downloads"],
 *         "cwd": "E:/StudyTrack"
 *       }
 *     }
 *   }
 */
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import MiniSearch from "minisearch";
import { tokenize } from "../src/search/bm25.ts";
import {
  GOALS,
  GREEN_EVENT_TYPES,
  MATCH_TIER_LABELS,
} from "../src/types.ts";
import { matchTier } from "../src/lib/opportunities.ts";

type Json = Record<string, unknown>;
type Hit = { id: string | number; score: number };
type Experience = {
  id: string;
  title: string;
  kind?: string;
  problem?: string;
  method?: string;
  contribution?: string;
  result?: string;
  metrics?: { label: string; value: string }[];
  evidence?: { label: string; url?: string }[];
  skills?: string[];
  tags?: string[];
  confidence?: string;
};
type LedgerEvent = { id: string; date: string; type: string; title?: string; revokedAt?: string | null };
type Profile = { grade?: string; major?: string; school?: string; goal?: string; targetRoles?: string[]; skills?: string[] };

const GREEN_TYPES = GREEN_EVENT_TYPES as readonly string[];
const SEGMENTS = ["problem", "method", "contribution", "result"] as const;

function isRecord(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fail(message: string): { isError: true; content: { type: "text"; text: string }[] } {
  return { isError: true, content: [{ type: "text", text: message }] };
}

function ok(payload: unknown): { content: { type: "text"; text: string }[] } {
  return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] };
}

/* ---------- 备份读取 ---------- */

function newestBackup(dir: string): string {
  const picks = readdirSync(dir)
    .filter((name) => /^studytrack-backup-\d{8}-\d{4}\.json$/.test(name))
    .map((name) => ({ name, mtime: statSync(join(dir, name)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  if (picks.length === 0) throw new Error(`目录 ${dir} 里没有 studytrack-backup-*.json`);
  return join(dir, picks[0].name);
}

function readBackup(argv: string[]): { path: string; data: Json } {
  const flagIndex = argv.findIndex((arg) => arg === "--backup" || arg === "--latest");
  if (flagIndex === -1) throw new Error("用法：node mcp/server.ts --backup <备份文件> 或 --latest <目录>");
  const value = argv[flagIndex + 1];
  if (!value) throw new Error("缺少备份路径");
  const path = argv[flagIndex] === "--latest" ? newestBackup(resolve(value)) : resolve(value);
  if (!existsSync(path)) throw new Error(`读不到备份文件 ${path}`);
  const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
  if (!isRecord(parsed) || parsed.app !== "studytrack" || parsed.version !== 1) {
    throw new Error("这不是学径导出的备份文件（缺 app/version）");
  }
  return { path, data: parsed };
}

/* ---------- 口径 ---------- */

function segmentsDone(item: Experience): number {
  return SEGMENTS.reduce((n, key) => n + (String(item[key] ?? "").trim() ? 1 : 0), 0);
}

function isReady(item: Experience): boolean {
  const hasProof = (item.metrics ?? []).length > 0 || (item.evidence ?? []).length > 0;
  return segmentsDone(item) === 4 && hasProof && item.confidence === "high";
}

function litDays(ledger: LedgerEvent[]): { days: number; events: number } {
  const green = ledger.filter((e) => GREEN_TYPES.includes(e.type) && !e.revokedAt);
  return { days: new Set(green.map((e) => e.date)).size, events: green.length };
}

/* ---------- 检索 ---------- */

function buildIndex(experiences: Experience[]): MiniSearch<Record<string, unknown>> {
  const index = new MiniSearch<Record<string, unknown>>({
    fields: ["title", "problem", "method", "contribution", "result", "skills", "tags"],
    storeFields: ["title"],
    tokenize,
    searchOptions: { boost: { title: 2.4, skills: 2, result: 1.4 }, fuzzy: false },
  });
  index.addAll(
    experiences.map((item) => ({
      id: item.id,
      title: item.title,
      problem: item.problem ?? "",
      method: item.method ?? "",
      contribution: item.contribution ?? "",
      result: item.result ?? "",
      skills: (item.skills ?? []).join(" "),
      tags: (item.tags ?? []).join(" "),
    })),
  );
  return index;
}

function search(index: MiniSearch<Record<string, unknown>>, query: string): Hit[] {
  const trimmed = query.trim();
  if (!trimmed) return [];
  return index.search(trimmed) as unknown as Hit[];
}

function quoteFor(item: Experience, needle: string): string {
  const tokens = tokenize(needle);
  for (const key of ["result", "contribution", "method", "problem", "title"] as const) {
    const text = String(item[key] ?? "");
    const sentence = text
      .split(/[。；;\n]/)
      .find((part) => tokens.some((token) => part.toLowerCase().includes(token)));
    if (sentence) return sentence.trim().slice(0, 120);
  }
  return "";
}

/* ---------- 写账草稿（纯规则，不调模型） ---------- */

const RESULT_MARK = /(完成|通过|获得|获奖| award|提交|上线|发表|交付|中标|拿到|实现|名次)/i;
const METHOD_MARK = /(用|采用|基于|借助|使用|搭建|设计|实现|编写|开发)/;
const CONTRIB_MARK = /(负责|主导|独立|牵头|承担|参与)/;
const PROBLEM_MARK = /(问题|需求|为了|因为|目标|难点|冲突|痛点|由于)/;
const METRIC_MARK = /(\d+(?:\.\d+)?\s?(?:%|人|页|次|天|小时|周|月|个|条|名|元|分|奖|篇|项|ms|s|MB|GB|行|张|轮|队|校|省|国|单|款|位|倍))/g;

function splitSentences(text: string): string[] {
  return text
    .split(/[。；;\n，,]/)
    .map((part) => part.trim())
    .filter((part) => part.length > 1);
}

type Segment = (typeof SEGMENTS)[number];

/* 一句只进一段 分不进就不填 缺的段留给用户在页面补 不用同一句凑数 */
function pickSegment(sentence: string, position: number, total: number): Segment {
  const isLast = position === total - 1;
  if (isLast && (RESULT_MARK.test(sentence) || METRIC_MARK.test(sentence))) return "result";
  if (position === 0 && PROBLEM_MARK.test(sentence)) return "problem";
  if (METHOD_MARK.test(sentence)) return "method";
  if (CONTRIB_MARK.test(sentence)) return "contribution";
  if (PROBLEM_MARK.test(sentence)) return "problem";
  return isLast ? "result" : "method";
}

function draftExperience(text: string): Json {
  const sentences = splitSentences(text);
  const buckets: Record<Segment, string[]> = { problem: [], method: [], contribution: [], result: [] };
  sentences.forEach((sentence, position) => {
    buckets[pickSegment(sentence, position, sentences.length)].push(sentence);
  });

  const metrics = (text.match(METRIC_MARK) ?? []).map((value, i) => ({ label: `量化数据 ${i + 1}`, value: value.trim() }));
  const evidence = (text.match(/https?:\/\/\S+/g) ?? []).map((url, i) => ({ label: `证据链接 ${i + 1}`, url }));
  const filled = SEGMENTS.filter((key) => buckets[key].length > 0);
  const hasProof = metrics.length > 0 || evidence.length > 0;

  return {
    title: sentences[0]?.slice(0, 24) ?? "",
    problem: buckets.problem.join(" "),
    method: buckets.method.join(" "),
    contribution: buckets.contribution.join(" "),
    result: buckets.result.join(" "),
    metrics,
    metricsNote: metrics.length === 0 ? "原文未提供量化数据" : "",
    evidence,
    confidence: "low",
    confidenceReason: "本地规则拆出的草稿 需你在页面确认后才算高置信",
    source: "本地规则解析（记录官 MCP）",
    segmentsDone: `${filled.length}/4`,
    missingSegments: SEGMENTS.filter((key) => buckets[key].length === 0),
    wouldBeReadyIfConfirmed: filled.length === 4 && hasProof,
    note: "这是草稿 需在页面确认后才会写入本机存档 低置信不会自动进简历",
  };
}

function draftProfile(input: Json): Json {
  const grade = String(input.grade ?? "").trim();
  const major = String(input.major ?? "").trim();
  const goal = String(input.goal ?? "").trim();
  const roles = Array.isArray(input.targetRoles) ? input.targetRoles.map(String) : [];
  const missing = [
    ...(!grade ? ["年级"] : []),
    ...(!major ? ["专业"] : []),
    ...(!goal ? ["目标方向"] : []),
    ...(goal === "intern" && roles.length === 0 ? ["至少 1 个目标岗位"] : []),
  ];
  return {
    grade,
    major,
    goal,
    targetRoles: roles.slice(0, 6),
    onboardedAt: null,
    missing,
    confidence: "low",
    confidenceReason: "建档草稿 需在页面走完 4 步确认后才写入本机存档",
    source: "本地规则建档（记录官 MCP）",
    note: "建档草稿 需在页面走完 4 步后才会开启五个面",
    feedback:
      missing.length === 0
        ? "这 4 项会生成等级与就绪度 并作为征召资格判定依据"
        : "补齐缺项才能进下一步",
  };
}

/* ---------- 解读：按就绪战绩判资格 ---------- */

function matchRequirements(experiences: Experience[], requirements: string[]): Json {
  const index = buildIndex(experiences);
  const ready = experiences.filter(isReady);
  const hits: Json[] = [];
  const gaps: Json[] = [];

  for (const requirement of requirements) {
    const found = search(index, requirement);
    const target = found
      .map((entry) => experiences.find((item) => item.id === String(entry.id)))
      .find((item) => item !== undefined && isReady(item));
    const quote = target ? quoteFor(target, requirement) : "";
    if (target && quote) {
      hits.push({ requirement, experienceId: target.id, title: target.title, quote });
    } else {
      gaps.push({
        requirement,
        advice: target
          ? "这条战绩还没就绪 补四段式与证据或量化数据"
          : found.length > 0
            ? "有相关战绩但未就绪 或原文给不出引用"
            : "本机没有相关战绩 记一条并补上证据",
      });
    }
  }

  const covered = hits.length / Math.max(requirements.length, 1);
  const score = ready.length === 0 ? 0 : Math.round(covered * 100);
  const tier = matchTier(score);

  return {
    verdict: MATCH_TIER_LABELS[tier],
    score,
    thresholds: "≥75 高匹配 55–74 可尝试 <55 缺口较大",
    readyExperiences: ready.length,
    covered: `${hits.length}/${requirements.length}`,
    hits,
    gaps,
    rule: "只有四段式 4/4、有证据或量化数据、置信为 high 的战绩参与判定 每条命中回指原文",
    source: "本机备份检索（BM25 本地计算）",
  };
}

/* ---------- 工具表 ---------- */

const TOOLS = [
  {
    name: "read_archive",
    description: "查账·概览 读本机备份里的档案 战绩就绪度与留痕天数",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "search_experiences",
    description: "查账·检索 用 BM25 在本机战绩里找相关条目 带就绪判定",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string", description: "关键词 如 数据库 事务 并发" } },
      required: ["query"],
      additionalProperties: false,
    },
  },
  {
    name: "query_ledger",
    description: "查账·留痕 按日期或动作类型列留痕 返回点亮天数",
    inputSchema: {
      type: "object",
      properties: {
        from: { type: "string", description: "起始日期 YYYY-MM-DD" },
        to: { type: "string", description: "结束日期 YYYY-MM-DD" },
        type: { type: "string", description: "动作类型 如 experience_added" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "draft_experience",
    description: "写账·草稿 把一段口语描述拆成四段式战绩草稿 只返回草稿且置信为 low 需在页面确认后才落库",
    inputSchema: {
      type: "object",
      properties: { text: { type: "string", description: "原始描述 一到三句话" } },
      required: ["text"],
      additionalProperties: false,
    },
  },
  {
    name: "draft_profile",
    description: "建档·草稿 按年级专业目标方向生成建档草稿并指出缺项 置信为 low 需在页面走完 4 步",
    inputSchema: {
      type: "object",
      properties: {
        grade: { type: "string", description: "如 大二" },
        major: { type: "string", description: "专业" },
        goal: { type: "string", enum: GOALS, description: "目标方向" },
        targetRoles: { type: "array", items: { type: "string" }, description: "目标岗位 找实习时至少一个" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "match_requirements",
    description: "解读·资格 用就绪战绩给一份 JD 要求打分 按页面同口径出 高匹配 可尝试 缺口较大 命中回指原文",
    inputSchema: {
      type: "object",
      properties: { requirements: { type: "array", items: { type: "string" }, description: "岗位要求逐条列出" } },
      required: ["requirements"],
      additionalProperties: false,
    },
  },
];

/* ---------- 启动 ---------- */

const argv = process.argv.slice(2);
let archive: { path: string; data: Json };
try {
  archive = readBackup(argv);
} catch (error) {
  process.stderr.write(`${String(error)}\n`);
  process.exit(1);
}

const experiences: Experience[] = isRecord(archive.data.experiences) && Array.isArray(archive.data.experiences.experiences)
  ? (archive.data.experiences.experiences as Experience[])
  : [];
const ledger: LedgerEvent[] = Array.isArray(archive.data.ledger) ? (archive.data.ledger as LedgerEvent[]) : [];
const notes: Json[] = Array.isArray(archive.data.notes) ? (archive.data.notes as Json[]) : [];
const profile: Profile = isRecord(archive.data.profile) ? (archive.data.profile as Profile) : {};

const server = new Server(
  { name: "studytrack-agent", version: "0.1.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const args = isRecord(request.params.arguments) ? request.params.arguments : {};
  try {
    switch (request.params.name) {
      case "read_archive": {
        const ready = experiences.filter(isReady);
        const level = ready.length + 1;
        const nearest = experiences
          .map((item) => ({ item, done: segmentsDone(item), proof: (item.metrics ?? []).length + (item.evidence ?? []).length }))
          .sort((a, b) => b.done - a.done || b.proof - a.proof)[0];
        return ok({
          backup: archive.path,
          profile: { grade: profile.grade, major: profile.major, school: profile.school, goal: profile.goal, targetRoles: profile.targetRoles ?? [] },
          experiences: experiences.length,
          readyForResume: ready.length,
          level,
          nextLevelGap: nearest ? `「${nearest.item.title}」四段式 ${nearest.done}/4 证据与量化 ${nearest.proof} 项` : "还没有战绩",
          notes: notes.length,
          lit: litDays(ledger),
        });
      }
      case "search_experiences": {
        const query = String(args.query ?? "").trim();
        if (!query) return fail("query 不能为空");
        if (experiences.length === 0) return fail("备份里没有战绩 先在页面记一条再导出");
        const found = search(buildIndex(experiences), query);
        return ok({
          query,
          hits: found.slice(0, 5).map((entry) => {
            const item = experiences.find((each) => each.id === String(entry.id));
            if (!item) return { id: String(entry.id), title: "读不到原文" };
            return {
              id: item.id,
              title: item.title,
              score: Number(entry.score.toFixed(2)),
              segmentsDone: `${segmentsDone(item)}/4`,
              metrics: item.metrics ?? [],
              metricsNote: (item.metrics ?? []).length === 0 ? "原文未提供量化数据" : "",
              evidence: item.evidence ?? [],
              confidence: item.confidence ?? "low",
              readyForResume: isReady(item),
              quote: quoteFor(item, query),
            };
          }),
          source: "本机备份检索（BM25 本地计算）",
        });
      }
      case "query_ledger": {
        const from = args.from ? String(args.from) : "";
        const to = args.to ? String(args.to) : "";
        const type = args.type ? String(args.type) : "";
        const rows = ledger
          .filter((event) => (!from || event.date >= from) && (!to || event.date <= to) && (!type || event.type === type))
          .sort((a, b) => (a.date < b.date ? 1 : -1));
        return ok({
          total: rows.length,
          lit: litDays(rows),
          greenOnly: GREEN_TYPES,
          byType: rows.reduce<Record<string, number>>((acc, event) => {
            acc[event.type] = (acc[event.type] ?? 0) + 1;
            return acc;
          }, {}),
          rows: rows.slice(0, 30).map((event) => ({ date: event.date, type: event.type, title: event.title ?? "" })),
        });
      }
      case "draft_experience": {
        const text = String(args.text ?? "").trim();
        if (!text) return fail("text 不能为空");
        return ok(draftExperience(text));
      }
      case "draft_profile":
        return ok(draftProfile(args));
      case "match_requirements": {
        const requirements = Array.isArray(args.requirements) ? args.requirements.map(String).filter(Boolean) : [];
        if (requirements.length === 0) return fail("requirements 至少一条");
        if (experiences.length === 0) return fail("备份里没有战绩 先在页面记一条再导出");
        return ok(matchRequirements(experiences, requirements));
      }
      default:
        return fail(`没有这个工具：${request.params.name}`);
    }
  } catch (error) {
    return fail(`记录官这次没做成 原因 ${String(error)} 可以回页面用手动填写或示例数据继续`);
  }
});

await server.connect(new StdioServerTransport());
process.stderr.write(`学径记录官 MCP 已就绪 ${archive.path} 战绩 ${experiences.length} 条 留痕 ${ledger.length} 条\n`);
