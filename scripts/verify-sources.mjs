import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "data");
const OUTPUT = path.join(DATA_DIR, "source-checks.json");
const UA = "StudyTrackSourceCheck/0.1 (+https://studytrack-wjeu32t1uvp.qoder.zone)";
const FORCE = process.argv.includes("--force");
const CACHE_MS = 24 * 60 * 60 * 1000;

const SOURCE_ALLOWLIST = new Set([
  "cet.neea.edu.cn",
  "ntce.neea.edu.cn",
  "www.moe.gov.cn",
  "www.cmathc.cn",
  "dasai.lanqiao.cn",
  "comap.org",
  "www.china-cssc.org",
  "www.mcm.edu.cn",
  "jsjds.blcu.edu.cn",
  "join.qq.com",
  "jobs.bytedance.com",
  "talent.alibaba.com",
  "career.huawei.com",
  "careers.dji.com",
  "www.tesla.cn",
]);

const POLICY =
  "构建期来源核验：仅访问白名单官方公开页面；已检查 robots.txt；HEAD/Range 仅作可达性检查；GET 仅取页面标题与条目相关短片段；不登录、不保存 Cookie、不绕反爬；不抓取学习通、BOSS 直聘、招聘平台或校招官网后台接口。";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function decodeEntities(text) {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCharCode(parseInt(code, 16)),
    );
}

function stripTags(html) {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function extractTitle(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? stripTags(match[1]).slice(0, 160) : null;
}

function dateVariants(value) {
  if (!value) return [];
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return [value];
  const [, year, month, day] = match;
  return [
    value,
    `${year}年${Number(month)}月${Number(day)}日`,
    `${year}/${Number(month)}/${Number(day)}`,
    `${Number(month)}月${Number(day)}日`,
  ];
}

function excerptAround(text, variants) {
  const indexes = variants
    .map((value) => text.indexOf(value))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b);
  const start = indexes.length > 0 ? Math.max(0, indexes[0] - 110) : 0;
  return text.slice(start, start + 280).trim();
}

function matchPattern(pathname, pattern) {
  let source = pattern
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*");
  if (source.endsWith("\\$")) source = `${source.slice(0, -2)}$`;
  try {
    return new RegExp(`^${source}`).test(pathname);
  } catch {
    return pathname.startsWith(pattern);
  }
}

function parseRobots(text) {
  const groups = [];
  let current = null;
  let lastWasAgent = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();

    if (key === "user-agent") {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [], delay: 0 };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }

    lastWasAgent = false;
    if (!current) continue;
    if (key === "allow" || key === "disallow") {
      current.rules.push({ allow: key === "allow", path: value });
    } else if (key === "crawl-delay") {
      current.delay = Number(value) || 0;
    }
  }

  const specific = groups.filter((group) =>
    group.agents.includes("studytracksourcecheck"),
  );
  const wildcard = groups.filter((group) => group.agents.includes("*"));
  const selected = specific.length > 0 ? specific : wildcard;
  return {
    rules: selected.flatMap((group) => group.rules),
    delay: Math.max(0, ...selected.map((group) => group.delay)),
  };
}

function isAllowed(pathname, rules) {
  let best = null;
  for (const rule of rules) {
    if (!rule.path) continue;
    if (!matchPattern(pathname, rule.path)) continue;
    const length = rule.path.length;
    if (
      !best ||
      length > best.length ||
      (length === best.length && rule.allow)
    ) {
      best = { length, allow: rule.allow };
    }
  }
  return best ? best.allow : true;
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      redirect: "follow",
    });
  } finally {
    clearTimeout(timer);
  }
}

const robotsCache = new Map();
const lastRequestAt = new Map();

async function waitForOrigin(origin, delaySeconds) {
  const last = lastRequestAt.get(origin) ?? 0;
  const wait = Math.max(0, last + delaySeconds * 1000 - Date.now());
  if (wait > 0) await sleep(wait);
  lastRequestAt.set(origin, Date.now());
}

async function readBodyWithTimeout(response, timeoutMs) {
  return Promise.race([
    response.text(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("body timeout")), timeoutMs),
    ),
  ]);
}

async function getRobots(origin) {
  if (robotsCache.has(origin)) return robotsCache.get(origin);
  const robotsUrl = `${origin}/robots.txt`;
  let result;
  try {
    await waitForOrigin(origin, 0.4);
    const response = await fetchWithTimeout(
      robotsUrl,
      {
        method: "GET",
        headers: {
          "User-Agent": UA,
          Accept: "text/plain,text/html;q=0.5,*/*;q=0.1",
        },
      },
      12000,
    );

    if (response.status === 404) {
      result = {
        state: "unknown",
        rules: [],
        delay: 0,
        httpStatus: response.status,
        note: "robots 404，仅做可达性检查",
      };
    } else if (response.status === 403 || response.status >= 500) {
      result = {
        state: "unreachable",
        rules: [],
        delay: 0,
        httpStatus: response.status,
        note: `robots 无法确认（HTTP ${response.status}），未请求正文`,
      };
    } else {
      const text = await readBodyWithTimeout(response, 8000);
      const contentType = response.headers.get("content-type") ?? "";
      const looksLikeRobots =
        response.status === 200 &&
        !text.trimStart().startsWith("<") &&
        (contentType.includes("text/plain") ||
          /^(?:#|User-agent|Sitemap|Allow|Disallow|Crawl-delay)\b/i.test(
            text.trim(),
          ));

      if (looksLikeRobots) {
        const parsed = parseRobots(text);
        result = {
          state: "allowed",
          rules: parsed.rules,
          delay: parsed.delay,
          httpStatus: response.status,
          note:
            parsed.delay > 0
              ? `robots Crawl-delay ${parsed.delay}s`
              : "robots 已读取",
        };
      } else {
        result = {
          state: "unknown",
          rules: [],
          delay: 0,
          httpStatus: response.status,
          note: "robots 非标准文本，仅做可达性检查",
        };
      }
    }
  } catch (error) {
    result = {
      state: "unreachable",
      rules: [],
      delay: 0,
      httpStatus: null,
      note: `robots 读取失败（${error?.name ?? "network"}），未请求正文`,
    };
  }
  robotsCache.set(origin, result);
  return result;
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(path.join(DATA_DIR, file), "utf8"));
}

function buildSources(calendar, channels, jobs) {
  const sources = [];
  for (const item of calendar.items ?? []) {
    if (!item.sourceUrl) continue;
    sources.push({
      id: item.id,
      kind: "calendar",
      label: item.title,
      url: item.sourceUrl,
      preferFetch: true,
      dateValues: [item.start, item.end, item.deadline].filter(Boolean),
      dateTerms: item.sourceDateTerms ?? [],
    });
  }
  for (const item of channels) {
    sources.push({
      id: item.id,
      kind: "channel",
      label: item.name,
      url: item.entryUrl,
      preferFetch: false,
      dateValues: [],
      dateTerms: [],
    });
  }
  for (const item of jobs) {
    if (!item.sourceUrl) continue;
    sources.push({
      id: item.id,
      kind: "job",
      label: `${item.company} · ${item.title}`,
      url: item.sourceUrl,
      preferFetch: false,
      dateValues: [],
      dateTerms: [],
    });
  }
  return sources;
}

async function rangeProbe(url, origin, delay) {
  await waitForOrigin(origin, delay);
  const response = await fetchWithTimeout(
    url,
    {
      method: "GET",
      headers: {
        "User-Agent": UA,
        Accept: "text/html",
        Range: "bytes=0-0",
      },
    },
    15000,
  );
  const reader = response.body?.getReader();
  if (reader) {
    try {
      await reader.read();
    } finally {
      await reader.cancel().catch(() => undefined);
    }
  }
  return response;
}

async function inspectUrl(url, preferFetch, robots, origin) {
  const parsed = new URL(url);
  const pathname = `${parsed.pathname}${parsed.search}`;
  const allowed = isAllowed(pathname, robots.rules);
  const base = {
    mode: "skip",
    robots: robots.state,
    status: "skipped",
    httpStatus: null,
    finalUrl: null,
    checkedAt: new Date().toISOString(),
    note: "",
  };

  if (robots.state === "unreachable") {
    return { ...base, note: robots.note };
  }
  if (robots.state === "allowed" && !allowed) {
    return { ...base, robots: "disallowed", note: "robots 明确禁止该路径，未请求" };
  }

  const mode = robots.state === "allowed" && preferFetch ? "fetch" : "head";
  const delay = robots.delay || 1.2;
  let response;
  let probeUsed = false;
  try {
    await waitForOrigin(origin, delay);
    response = await fetchWithTimeout(
      url,
      {
        method: mode === "fetch" ? "GET" : "HEAD",
        headers: {
          "User-Agent": UA,
          Accept:
            mode === "fetch"
              ? "text/html,application/xhtml+xml,text/plain;q=0.8,*/*;q=0.5"
              : "*/*",
        },
      },
      15000,
    );
    if (mode === "head" && !response.ok) {
      const probe = await rangeProbe(url, origin, delay).catch(() => null);
      if (probe) {
        response = probe;
        probeUsed = true;
      }
    }
  } catch (error) {
    if (mode === "head") {
      const probe = await rangeProbe(url, origin, delay).catch(() => null);
      if (probe) {
        response = probe;
        probeUsed = true;
      } else {
        return {
          ...base,
          mode,
          status: "unreachable",
          note: `请求失败（${error?.name ?? "network"}）`,
        };
      }
    } else {
      return {
        ...base,
        mode,
        status: "unreachable",
        note: `请求失败（${error?.name ?? "network"}）`,
      };
    }
  }

  const result = {
    ...base,
    mode,
    status: response.ok ? "ok" : "unreachable",
    httpStatus: response.status,
    finalUrl: response.url,
    note:
      mode === "head"
        ? probeUsed
          ? "HEAD 不可用，Range 可达性探测（未抓正文）"
          : "仅检查来源入口可达性，未抓取正文"
        : "",
  };
  if (!response.ok) {
    result.note = probeUsed
      ? `HEAD 不可用，Range 探测返回 HTTP ${response.status}，未抓取正文`
      : `来源返回 HTTP ${response.status}，未抓取正文`;
    return result;
  }
  if (mode === "head") return result;

    const contentType = response.headers.get("content-type") ?? "";
    if (!/html|text/i.test(contentType)) {
      return {
        ...result,
        status: "skipped",
        note: `非 HTML 正文（${contentType || "未知类型"}），未抓取`,
      };
    }
    const html = (await response.text()).slice(0, 900_000);
    const title = extractTitle(html);
    const text = stripTags(html);
    return {
      ...result,
      title,
      text,
      excerpt: excerptAround(text, []),
      contentHash: crypto.createHash("sha256").update(text).digest("hex").slice(0, 16),
      note: "已读取公开页面标题与短片段",
    };
}

async function main() {
  const [calendar, channels, jobs] = await Promise.all([
    readJson("calendar.json"),
    readJson("channels.json"),
    readJson("jobs.json"),
  ]);
  const sources = buildSources(calendar, channels, jobs);
  const existing = await fs
    .readFile(OUTPUT, "utf8")
    .then((text) => JSON.parse(text))
    .catch(() => null);
  const existingById = new Map(
    (existing?.items ?? []).map((item) => [item.id, item]),
  );

  const groups = new Map();
  for (const source of sources) {
    const key = source.url;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(source);
  }

  const results = [];
  for (const [url, group] of groups) {
    const allCached =
      !FORCE &&
      group.every((source) => {
        const cached = existingById.get(source.id);
        return (
          cached &&
          cached.url === url &&
          cached.checkedAt &&
          Date.now() - Date.parse(cached.checkedAt) < CACHE_MS
        );
      });

    if (allCached) {
      for (const source of group) {
        const cached = existingById.get(source.id);
        results.push({ ...cached, kind: source.kind, label: source.label });
      }
      console.log(`cached  ${url}`);
      continue;
    }

    const origin = new URL(url).origin;
    const host = new URL(url).hostname;
    if (!SOURCE_ALLOWLIST.has(host)) {
      for (const source of group) {
        results.push({
          id: source.id,
          kind: source.kind,
          label: source.label,
          url,
          mode: "skip",
          robots: "unknown",
          status: "skipped",
          httpStatus: null,
          finalUrl: null,
          checkedAt: new Date().toISOString(),
          note: "不在来源白名单，未请求",
        });
      }
      console.log(`skip    ${url} (not allowlisted)`);
      continue;
    }

    const robots = await getRobots(origin);
    const preferFetch = group.some((source) => source.preferFetch);
    const raw = await inspectUrl(url, preferFetch, robots, origin);
    const text = raw.text ?? "";
    const canMatch = raw.mode === "fetch" && raw.status === "ok" && text.length > 0;
    for (const source of group) {
      const variants = [
        ...source.dateValues.flatMap(dateVariants),
        ...(source.dateTerms ?? []),
      ];
      const dateMatched =
        canMatch && variants.length > 0
          ? variants.some((value) => text.includes(value))
          : null;
      const item = {
        id: source.id,
        kind: source.kind,
        label: source.label,
        url,
        mode: raw.mode,
        robots: raw.robots,
        status: raw.status,
        httpStatus: raw.httpStatus,
        finalUrl: raw.finalUrl,
        checkedAt: raw.checkedAt,
        title: raw.title ?? undefined,
        excerpt: canMatch ? excerptAround(text, variants) : undefined,
        dateMatched: dateMatched ?? undefined,
        contentHash: raw.contentHash ?? undefined,
        note:
          canMatch && dateMatched === false
            ? "来源可访问，但未在正文中匹配到条目日期，请人工复核"
            : canMatch && dateMatched === true
              ? "来源可访问，正文包含条目日期"
              : raw.note,
      };
      results.push(item);
    }
    console.log(`${raw.status.padEnd(7)} ${url} (${raw.mode}, ${raw.robots})`);
  }

  const latestCheckedAt = results.reduce(
    (latest, item) => (item.checkedAt > latest ? item.checkedAt : latest),
    "",
  );
  const output = {
    version: 1,
    checkedAt: latestCheckedAt || new Date().toISOString(),
    policy: POLICY,
    items: results,
  };
  await fs.writeFile(OUTPUT, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  const counts = {
    total: results.length,
    ok: results.filter((item) => item.status === "ok").length,
    fetched: results.filter((item) => item.mode === "fetch" && item.status === "ok").length,
    dateMatched: results.filter((item) => item.dateMatched === true).length,
    skipped: results.filter((item) => item.status === "skipped").length,
    unreachable: results.filter((item) => item.status === "unreachable").length,
  };
  console.log(JSON.stringify(counts, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
