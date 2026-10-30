import { useEffect, useMemo, useState } from "react";
import type { PortfolioItem } from "../../lib/portfolio";
import {
  copyText,
  decodePortfolio,
  portfolioIdFromHash,
} from "../../lib/portfolio";

interface PortfolioPageProps {
  hash: string;
}

const SECTIONS: {
  key: "problem" | "method" | "contribution" | "result";
  label: string;
}[] = [
  { key: "problem", label: "问题" },
  { key: "method", label: "方法" },
  { key: "contribution", label: "我的贡献" },
  { key: "result", label: "结果" },
];

const BTN =
  "border-rule hover:bg-ink/[0.03] inline-flex min-h-11 items-center justify-center rounded-lg border bg-white px-3 text-xs text-ink/70";
const BTN_PRIMARY =
  "bg-ink text-paper inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-xs font-medium";

export default function PortfolioPage({ hash }: PortfolioPageProps) {
  const id = portfolioIdFromHash(hash);
  const payload = useMemo(
    () => (id ? decodePortfolio(id) : null),
    [id],
  );
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  useEffect(() => {
    const previous = document.title;
    document.title = payload
      ? `${payload.title} · 学径`
      : "作品集链接无效 · 学径";
    return () => {
      document.title = previous;
    };
  }, [payload]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2500);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function handleCopy() {
    const ok = await copyText(window.location.href);
    setCopied(ok);
    setCopyError(ok ? null : "自动复制失败，请从地址栏复制。");
  }

  if (!payload) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-4">
        <div className="max-w-md text-center">
          <p className="font-mono text-[10px] tracking-[0.2em] text-ink/40">
            作品集 · 链接
          </p>
          <h1 className="mt-3 font-serif text-3xl tracking-tight">
            链接无效或数据已损坏
          </h1>
          <p className="mt-3 text-sm leading-6 text-ink/55">
            作品集内容全部编码在这条链接里。如果链接被聊天工具截断，就会打不开。
            可以回到学径重新生成一条。
          </p>
          <a
            href="#/"
            className={`${BTN_PRIMARY} mt-6`}
          >
            返回学径首页
          </a>
        </div>
      </div>
    );
  }

  const year = yearOf(payload.createdAt);
  const identity = [payload.name, payload.major, payload.grade]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="portfolio-page min-h-dvh bg-paper pb-16">
      <div className="portfolio-actions border-rule sticky top-0 z-20 border-b bg-paper">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-6">
          <a
            href="#/"
            className="hover:text-ink inline-flex min-h-11 items-center gap-2 text-xs text-ink/55"
          >
            <span aria-hidden="true">←</span>
            学径
          </a>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => void handleCopy()} className={BTN}>
              {copied ? "已复制" : "复制链接"}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className={BTN}
            >
              打印 / 存为 PDF
            </button>
          </div>
        </div>
      </div>

      <header className="portfolio-cover mx-auto max-w-4xl px-4 pt-10 sm:px-6 sm:pt-16">
        <p className="font-mono text-[10px] tracking-[0.2em] text-ink/40">
          作品集 · {year}
        </p>
        <h1 className="mt-4 font-serif text-[clamp(2rem,6vw,3.5rem)] leading-[1.2] tracking-tight">
          {payload.title}
        </h1>
        {payload.tagline && (
          <p className="mt-4 max-w-2xl text-[15px] leading-7 text-ink/65">
            {payload.tagline}
          </p>
        )}
        <div className="border-rule mt-8 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 border-t pt-4">
          <p className="text-xs text-ink/55">
            {identity || "未填写姓名"}
          </p>
          {payload.contact && (
            <p className="font-mono text-[10px] text-ink/40">
              {payload.contact}
            </p>
          )}
        </div>
        <p className="mt-2 font-mono text-[9px] tracking-[0.08em] text-ink/30">
          {payload.items.length} 个项目 · 内容在链接里，不上传服务器
        </p>
      </header>

      <main className="mx-auto mt-8 max-w-4xl px-4 sm:px-6">
        <ol className="space-y-4">
          {payload.items.map((item, index) => (
            <PortfolioCard
              key={`${item.title}-${index}`}
              item={item}
              index={index}
            />
          ))}
        </ol>

        {payload.skills.length > 0 && (
          <section className="border-rule mt-6 border-t pt-5">
            <h2 className="font-mono text-[9px] tracking-[0.18em] text-ink/40">
              技能
            </h2>
            <p className="mt-2 text-sm leading-6 text-ink/65">
              {payload.skills.join(" · ")}
            </p>
          </section>
        )}

        {copyError && (
          <p role="alert" className="text-amber mt-4 text-xs leading-5">
            {copyError}
          </p>
        )}

        <footer className="border-rule mt-8 flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-[10px] tracking-[0.12em] text-ink/35">
            由学径 StudyTrack 生成
          </p>
          <p className="text-[10px] text-ink/35">
            数据只在这条链接里，不会上传服务器
          </p>
        </footer>
      </main>
    </div>
  );
}

function PortfolioCard({
  item,
  index,
}: {
  item: PortfolioItem;
  index: number;
}) {
  return (
    <li className="portfolio-card border-rule rounded-xl border bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-mono text-[10px] tabular-nums text-ink/30">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="bg-ink/[0.05] rounded-full px-2 py-0.5 font-mono text-[9px] text-ink/55">
          {item.kind}
        </span>
        {item.range && (
          <span className="font-mono text-[10px] tabular-nums text-ink/40">
            {item.range}
          </span>
        )}
      </div>

      <h2 className="mt-2 font-serif text-xl leading-7 tracking-tight break-words">
        {item.title}
      </h2>
      {item.org && (
        <p className="mt-1 text-[11px] leading-5 text-ink/45">{item.org}</p>
      )}

      <div className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {SECTIONS.map((section) => {
          const text = item[section.key];
          if (!text) return null;
          return (
            <div key={section.key}>
              <p className="font-mono text-[9px] tracking-[0.14em] text-ink/35">
                {section.label}
              </p>
              <p className="mt-1 text-xs leading-6 whitespace-pre-line text-ink/70">
                {text}
              </p>
            </div>
          );
        })}
      </div>

      {item.metrics.length > 0 && (
        <dl className="mt-3 flex flex-wrap gap-1.5">
          {item.metrics.map((metric) => (
            <div
              key={`${metric.label}-${metric.value}`}
              className="border-rule inline-flex items-baseline gap-1.5 rounded-full border px-2 py-0.5"
            >
              <dt className="text-[9px] text-ink/40">{metric.label}</dt>
              <dd className="font-mono text-[10px] tabular-nums text-ink/70">
                {metric.value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {item.evidence.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {item.evidence.map((evidence, evidenceIndex) =>
            evidence.url ? (
              <li key={`${evidence.label}-${evidenceIndex}`}>
                <a
                  href={evidence.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="border-rule hover:bg-ink/[0.03] inline-flex min-h-9 items-center gap-1 rounded-md border px-2 text-[10px] text-ink/60"
                >
                  {evidence.label}
                  <span aria-hidden="true" className="text-ink/30">
                    ↗
                  </span>
                </a>
              </li>
            ) : (
              <li
                key={`${evidence.label}-${evidenceIndex}`}
                className="border-rule inline-flex min-h-9 items-center rounded-md border px-2 text-[10px] text-ink/50"
              >
                {evidence.label}
              </li>
            ),
          )}
        </ul>
      )}
    </li>
  );
}

function yearOf(createdAt: string): number {
  const date = new Date(createdAt);
  return Number.isFinite(date.getTime())
    ? date.getFullYear()
    : new Date().getFullYear();
}
