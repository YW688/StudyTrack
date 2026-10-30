import dayjs from "dayjs";
import type {
  Experience,
  ResumeBasics,
  ResumeBullet,
  ResumeBulletCache,
} from "../types";
import { isSafeHttpUrl } from "./experience";

export const ANY_DIGIT_RE = /\d/;
const NUMERIC_TOKEN_RE = /\d+(?:[.,]\d+)?/g;
const RANK_RE = /(?:特等|一等|二等|三等|金|银|铜)奖|冠军|亚军|季军|优秀奖/g;

export function makeBulletId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `bullet-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function experienceSourceText(experience: Experience): string {
  return normalizeText(
    [
      experience.problem,
      experience.method,
      experience.contribution,
      experience.result,
      ...experience.metrics.map((metric) => `${metric.label}：${metric.value}`),
      ...experience.skills,
    ].join("\n"),
  );
}

function splitSentences(text: string): string[] {
  return text
    .split(/[。！？；;!?\n]+/)
    .map(normalizeText)
    .filter(Boolean);
}

function extractNumbers(text: string): string[] {
  return text.match(NUMERIC_TOKEN_RE) ?? [];
}

function localCandidates(experience: Experience): string[] {
  const fields = [
    experience.contribution,
    experience.result,
    experience.method,
    experience.problem,
  ];
  const candidates: string[] = [];
  const seen = new Set<string>();

  for (const field of fields) {
    const trimmed = normalizeText(field);
    if (!trimmed) continue;
    const sentences = splitSentences(trimmed);
    const usable = sentences.filter(
      (sentence) => sentence.length >= 6 && sentence.length <= 80,
    );
    const pool = usable.length > 0 ? usable : [trimmed.slice(0, 80)];

    for (const sentence of pool) {
      if (seen.has(sentence)) continue;
      if (experience.metrics.length === 0 && ANY_DIGIT_RE.test(sentence)) {
        continue;
      }
      seen.add(sentence);
      candidates.push(sentence);
    }
  }

  return candidates;
}

export function buildLocalBullets(
  experience: Experience,
  excludeTexts: string[] = [],
): ResumeBullet[] {
  const excluded = new Set(excludeTexts.map(normalizeText));
  const bullets: ResumeBullet[] = [];

  for (const text of localCandidates(experience)) {
    if (excluded.has(text)) continue;
    bullets.push({
      id: makeBulletId(),
      text,
      evidence: [text],
      source: "local",
    });
    if (bullets.length >= 3) break;
  }

  return bullets;
}

export function rawDisplayBullets(experience: Experience): ResumeBullet[] {
  const fields = [
    experience.result,
    experience.contribution,
    experience.method,
    experience.problem,
  ];
  const bullets: ResumeBullet[] = [];

  for (const field of fields) {
    const text = normalizeText(field);
    if (!text) continue;
    bullets.push({
      id: `raw-${experience.id}-${bullets.length}`,
      text,
      evidence: [text],
      source: "local",
    });
    if (bullets.length >= 2) break;
  }

  return bullets;
}

export interface RawAiBullet {
  text: string;
  usedEvidence: string[];
}

export interface ValidatedBullets {
  bullets: ResumeBullet[];
  dropped: number;
}

export function validateAiBullets(
  raw: RawAiBullet[],
  experience: Experience,
  excludeTexts: string[] = [],
): ValidatedBullets {
  const source = experienceSourceText(experience);
  const metricsText = normalizeText(
    experience.metrics
      .map((metric) => `${metric.label}：${metric.value}`)
      .join(" "),
  );
  const metricDigits = new Set(extractNumbers(metricsText));
  const excluded = new Set(excludeTexts.map(normalizeText));
  const seen = new Set<string>();
  const bullets: ResumeBullet[] = [];
  let dropped = 0;

  for (const item of raw) {
    const text = normalizeText(item.text);
    if (!text || text.length > 60) {
      dropped += 1;
      continue;
    }

    const evidence = item.usedEvidence
      .map(normalizeText)
      .filter((quote) => quote.length >= 4 && source.includes(quote));
    if (evidence.length === 0) {
      dropped += 1;
      continue;
    }

    const evidenceText = evidence.join(" ");
    if (experience.metrics.length === 0 && ANY_DIGIT_RE.test(text)) {
      dropped += 1;
      continue;
    }

    const numbers = extractNumbers(text);
    if (
      numbers.some(
        (number) =>
          !evidenceText.includes(number) && !metricDigits.has(number),
      )
    ) {
      dropped += 1;
      continue;
    }

    const ranks = text.match(RANK_RE) ?? [];
    if (ranks.some((rank) => !evidenceText.includes(rank))) {
      dropped += 1;
      continue;
    }

    if (excluded.has(text) || seen.has(text)) {
      dropped += 1;
      continue;
    }

    seen.add(text);
    bullets.push({
      id: makeBulletId(),
      text,
      evidence,
      source: "ai",
    });
    if (bullets.length >= 3) break;
  }

  return { bullets, dropped };
}

export function sortByEndDesc(items: Experience[]): Experience[] {
  return [...items].sort((a, b) => {
    const aKey = a.end ?? a.start ?? "";
    const bKey = b.end ?? b.start ?? "";
    if (aKey !== bKey) {
      if (!aKey) return 1;
      if (!bKey) return -1;
      return bKey.localeCompare(aKey);
    }
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export function pickSelectedExperiences(
  items: Experience[],
  ids: string[],
): Experience[] {
  const map = new Map(items.map((item) => [item.id, item]));
  return ids
    .map((id) => map.get(id))
    .filter((item): item is Experience => Boolean(item));
}

export function collectSkills(
  entries: Experience[],
  limit = 16,
): string[] {
  const seen = new Set<string>();
  const skills: string[] = [];
  for (const entry of entries) {
    for (const skill of entry.skills) {
      const text = skill.trim();
      if (!text || seen.has(text)) continue;
      seen.add(text);
      skills.push(text);
      if (skills.length >= limit) return skills;
    }
  }
  return skills;
}

export interface ResumeLink {
  label: string;
  url: string;
}

export function collectLinks(
  entries: Experience[],
  limit = 4,
): ResumeLink[] {
  const seen = new Set<string>();
  const links: ResumeLink[] = [];
  for (const entry of entries) {
    for (const item of entry.evidence) {
      if (!item.url || !isSafeHttpUrl(item.url) || seen.has(item.url)) {
        continue;
      }
      seen.add(item.url);
      links.push({ label: item.label, url: item.url });
      if (links.length >= limit) return links;
    }
  }
  return links;
}

export function contactParts(basics: ResumeBasics): string[] {
  return [basics.city, basics.phone, basics.email]
    .map((value) => value.trim())
    .filter(Boolean);
}

export function educationParts(basics: ResumeBasics): string[] {
  return [basics.school, basics.major, basics.grade]
    .map((value) => value.trim())
    .filter(Boolean);
}

export function resumeHasContent(resume: {
  basics: ResumeBasics;
  selectedExperienceIds: string[];
}): boolean {
  if (resume.selectedExperienceIds.length > 0) return true;
  return Object.values(resume.basics).some((value) => value.trim().length > 0);
}

export function bulletCacheNote(cache: ResumeBulletCache): string {
  if (cache.note) return cache.note;
  if (cache.source === "ai") return "AI 依据原文提炼";
  if (cache.status === "fallback") return "原文兜底";
  return "本地规则提炼，未调用模型";
}

export function formatSnapshotTime(iso: string): string {
  const value = dayjs(iso);
  return value.isValid() ? value.format("MM-DD HH:mm") : "时间未知";
}

export function relativeTimeLabel(iso: string): string {
  const value = dayjs(iso);
  if (!value.isValid()) return "时间未知";
  const days = dayjs().startOf("day").diff(value.startOf("day"), "day");
  if (days <= 0) return "今天";
  if (days === 1) return "昨天";
  return `${days} 天前`;
}
