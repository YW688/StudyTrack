import { z } from "zod";
import type { Experience, ResumeBasics } from "../types";
import {
  experienceKindLabel,
  formatExperienceRange,
  isSafeHttpUrl,
} from "./experience";
import { collectSkills, contactParts } from "./resume";

export interface PortfolioMetric {
  label: string;
  value: string;
}

export interface PortfolioEvidence {
  label: string;
  url?: string;
}

export interface PortfolioItem {
  title: string;
  kind: string;
  org?: string;
  range?: string;
  problem?: string;
  method?: string;
  contribution?: string;
  result?: string;
  metrics: PortfolioMetric[];
  evidence: PortfolioEvidence[];
}

export interface PortfolioPayload {
  title: string;
  tagline: string;
  name?: string;
  grade?: string;
  major?: string;
  contact?: string;
  skills: string[];
  items: PortfolioItem[];
  createdAt: string;
}

const metricSchema = z.tuple([
  z.string().min(1).max(40),
  z.string().min(1).max(80),
]);

const evidenceSchema = z.tuple([
  z.string().min(1).max(60),
  z.string().max(500),
]);

const compactItemSchema = z.object({
  t: z.string().min(1).max(120),
  k: z.string().min(1).max(20),
  o: z.string().max(80).optional(),
  r: z.string().max(40).optional(),
  p: z.string().max(600).optional(),
  me: z.string().max(600).optional(),
  co: z.string().max(600).optional(),
  re: z.string().max(600).optional(),
  mt: z.array(metricSchema).max(8).optional(),
  ev: z.array(evidenceSchema).max(8).optional(),
});

const compactPortfolioSchema = z.object({
  v: z.literal(1),
  t: z.string().min(1).max(120),
  g: z.string().max(200).optional(),
  n: z.string().max(40).optional(),
  gr: z.string().max(20).optional(),
  m: z.string().max(60).optional(),
  c: z.string().max(160).optional(),
  s: z.array(z.string().max(40)).max(20).optional(),
  i: z.array(compactItemSchema).min(1).max(6),
  d: z.string().max(40).optional(),
});

function clean(value: string | undefined): string | undefined {
  const text = value?.trim();
  return text ? text : undefined;
}

export function buildPortfolioPayload(input: {
  basics: ResumeBasics;
  experiences: Experience[];
  title: string;
  tagline: string;
}): PortfolioPayload {
  const { basics, experiences } = input;
  const items: PortfolioItem[] = experiences.map((experience) => ({
    title: experience.title,
    kind: experienceKindLabel(experience.kind, experience.kindLabel),
    org: clean(experience.org),
    range: formatExperienceRange(experience.start, experience.end),
    problem: clean(experience.problem),
    method: clean(experience.method),
    contribution: clean(experience.contribution),
    result: clean(experience.result),
    metrics: experience.metrics.map((metric) => ({
      label: metric.label,
      value: metric.value,
    })),
    evidence: experience.evidence.map((item) => ({
      label: item.label,
      url:
        item.url && isSafeHttpUrl(item.url) ? item.url : undefined,
    })),
  }));

  return {
    title: input.title.trim() || "作品集",
    tagline: input.tagline.trim(),
    name: clean(basics.name),
    grade: clean(basics.grade),
    major: clean(basics.major),
    contact: clean(contactParts(basics).join(" · ")),
    skills: collectSkills(experiences, 12),
    items,
    createdAt: new Date().toISOString(),
  };
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlToBytes(input: string): Uint8Array | null {
  try {
    const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  } catch {
    return null;
  }
}

export function encodePortfolio(payload: PortfolioPayload): string {
  const compact = {
    v: 1,
    t: payload.title,
    g: payload.tagline || undefined,
    n: payload.name,
    gr: payload.grade,
    m: payload.major,
    c: payload.contact,
    s: payload.skills,
    i: payload.items.map((item) => ({
      t: item.title,
      k: item.kind,
      o: item.org,
      r: item.range,
      p: item.problem,
      me: item.method,
      co: item.contribution,
      re: item.result,
      mt: item.metrics.map((metric) => [metric.label, metric.value]),
      ev: item.evidence.map((evidence) => [
        evidence.label,
        evidence.url ?? "",
      ]),
    })),
    d: payload.createdAt,
  };
  return bytesToBase64Url(
    new TextEncoder().encode(JSON.stringify(compact)),
  );
}

export function decodePortfolio(id: string): PortfolioPayload | null {
  if (!id || id.length > 20_000) return null;
  const bytes = base64UrlToBytes(id);
  if (!bytes) return null;

  let raw: unknown;
  try {
    raw = JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  } catch {
    return null;
  }

  const parsed = compactPortfolioSchema.safeParse(raw);
  if (!parsed.success) return null;
  const data = parsed.data;

  const items: PortfolioItem[] = data.i.map((item) => ({
    title: item.t,
    kind: item.k,
    org: clean(item.o),
    range: clean(item.r),
    problem: clean(item.p),
    method: clean(item.me),
    contribution: clean(item.co),
    result: clean(item.re),
    metrics: (item.mt ?? []).map(([label, value]) => ({ label, value })),
    evidence: (item.ev ?? []).map(([label, url]) => ({
      label,
      url: url && isSafeHttpUrl(url) ? url : undefined,
    })),
  }));

  return {
    title: data.t,
    tagline: data.g ?? "",
    name: clean(data.n),
    grade: clean(data.gr),
    major: clean(data.m),
    contact: clean(data.c),
    skills: data.s ?? [],
    items,
    createdAt: data.d ?? "",
  };
}

export function portfolioIdFromHash(hash: string): string | null {
  const match = hash.match(/^#\/?p\/(.+)$/);
  return match ? match[1] : null;
}

export function portfolioLink(id: string): string {
  return `${window.location.origin}${window.location.pathname}#/p/${id}`;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the textarea fallback.
  }

  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.top = "0";
    area.style.left = "0";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.focus();
    area.select();
    const copied = document.execCommand("copy");
    document.body.removeChild(area);
    return copied;
  } catch {
    return false;
  }
}
