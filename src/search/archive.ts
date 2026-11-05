import MiniSearch from "minisearch";
import type { Confidence, Experience, ExperienceKind } from "../types";
import { tokenize } from "./bm25";
import { buildUnit, type EvidenceField } from "./index";

export type ArchiveFieldKey = EvidenceField["key"];

export const ARCHIVE_FIELD_LABELS: Record<ArchiveFieldKey, string> = {
  result: "结果",
  contribution: "贡献",
  method: "做法",
  problem: "问题",
  metrics: "量化数据",
};

const QUOTE_LIMIT = 150;

const FIELD_ORDER: ArchiveFieldKey[] = [
  "result",
  "contribution",
  "method",
  "problem",
  "metrics",
];

interface ArchiveDoc {
  id: string;
  title: string;
  org: string;
  kind: ExperienceKind;
  kindLabel?: string;
  confidence: Confidence;
  problem: string;
  method: string;
  contribution: string;
  result: string;
  metrics: string;
  skills: string;
  fields: EvidenceField[];
}

export interface ArchiveHit {
  experienceId: string;
  title: string;
  kind: ExperienceKind;
  kindLabel?: string;
  confidence: Confidence;
  field: ArchiveFieldKey;
  quote: string;
  /** false = 词只在标题、技能或单位对上 四段原文里没有这句话 不拿整段冒充引用 */
  exact: boolean;
  /** 非精确命中时，词实际出现在哪里，例如「标题 单位」 */
  matchedIn: string;
  score: number;
}

function limitQuote(value: string): string {
  const text = value.replace(/\s+/g, " ").trim();
  return text.length > QUOTE_LIMIT ? `${text.slice(0, QUOTE_LIMIT)}…` : text;
}

/**
 * 简历文案（bullets）不进索引也不作引用：检索增强的出处必须是用户亲手写下的原文，
 * 回指模型自己生成的句子等于自证，违反「命中必须带来源」。
 */
export function createArchiveIndex(
  experiences: Experience[],
): MiniSearch<ArchiveDoc> {
  const docs = experiences.map<ArchiveDoc>((experience) => {
    const unit = buildUnit(experience, false);
    const fieldText = (key: ArchiveFieldKey) =>
      unit.fields.find((field) => field.key === key)?.text ?? "";
    return {
      id: experience.id,
      title: experience.title,
      org: experience.org ?? "",
      kind: experience.kind,
      kindLabel: experience.kindLabel,
      confidence: experience.confidence,
      problem: fieldText("problem"),
      method: fieldText("method"),
      contribution: fieldText("contribution"),
      result: fieldText("result"),
      metrics: fieldText("metrics"),
      skills: unit.skillNames.join(" "),
      fields: unit.fields,
    };
  });

  const index = new MiniSearch<ArchiveDoc>({
    fields: [
      "title",
      "org",
      "result",
      "contribution",
      "method",
      "problem",
      "metrics",
      "skills",
    ],
    storeFields: [
      "id",
      "title",
      "org",
      "kind",
      "kindLabel",
      "confidence",
      "skills",
      "fields",
    ],
    tokenize,
    searchOptions: {
      boost: {
        title: 2.2,
        skills: 1.8,
        result: 1.4,
        contribution: 1.3,
        metrics: 1.2,
        method: 1.1,
        problem: 1,
        org: 0.8,
      },
      prefix: true,
      combineWith: "OR",
    },
  });

  index.addAll(docs);
  return index;
}

function bestSentence(
  fields: EvidenceField[],
  terms: string[],
): { field: ArchiveFieldKey; quote: string; exact: boolean } | null {
  let best: { field: ArchiveFieldKey; quote: string; hits: number } | null =
    null;

  for (const key of FIELD_ORDER) {
    const field = fields.find((item) => item.key === key);
    if (!field) continue;
    for (const sentence of field.sentences) {
      const lower = sentence.toLowerCase();
      let hits = 0;
      for (const term of terms) {
        if (lower.includes(term)) hits += 1;
      }
      if (hits === 0) continue;
      if (!best || hits > best.hits) {
        best = { field: key, quote: limitQuote(sentence), hits };
      }
    }
  }

  if (best) return { field: best.field, quote: best.quote, exact: true };

  // 原文里对不上词，只指出该去哪一段看，不把无关句子包装成出处
  const pointer = FIELD_ORDER.map((key) => ({
    key,
    field: fields.find((item) => item.key === key),
  })).find((item) => Boolean(item.field?.text));

  return pointer && pointer.field
    ? { field: pointer.key, quote: "", exact: false }
    : null;
}

function matchedIn(doc: ArchiveDoc, terms: string[]): string {
  const places: string[] = [];
  if (terms.some((term) => (doc.title ?? "").toLowerCase().includes(term))) {
    places.push("标题");
  }
  if (terms.some((term) => (doc.skills ?? "").toLowerCase().includes(term))) {
    places.push("技能");
  }
  if (terms.some((term) => (doc.org ?? "").toLowerCase().includes(term))) {
    places.push("单位");
  }
  return places.join(" ") || "标题";
}

export function searchArchive(
  index: MiniSearch<ArchiveDoc>,
  query: string,
  limit = 5,
): ArchiveHit[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const terms = [...new Set(tokenize(trimmed))];
  if (terms.length === 0) return [];

  return index
    .search(trimmed)
    .slice(0, Math.max(1, limit))
    .flatMap((result) => {
      const doc = result as unknown as ArchiveDoc;
      const quote = bestSentence(doc.fields ?? [], terms);
      if (!quote) return [];
      return [
        {
          experienceId: String(doc.id),
          title: doc.title,
          kind: doc.kind,
          kindLabel: doc.kindLabel,
          confidence: doc.confidence,
          field: quote.field,
          quote: quote.quote,
          exact: quote.exact,
          matchedIn: quote.exact ? "" : matchedIn(doc, terms),
          score: result.score,
        },
      ];
    });
}
