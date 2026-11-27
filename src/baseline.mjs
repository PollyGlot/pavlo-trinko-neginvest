const REDIRECT_CODES = new Set([301, 302, 303, 307, 308]);

const decode = (text) =>
  text
    ?.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .trim() ?? null;

const first = (pattern, html) => decode(html.match(pattern)?.[1] ?? null) || null;

export function readPage(html) {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  return {
    canonical: first(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/i, html),
    title: first(/<title>([\s\S]*?)<\/title>/i, html),
    h1: h1 ? decode(h1.replace(/<[^>]+>/g, "")) || null : null,
    robots: first(/<meta[^>]+name="robots"[^>]+content="([^"]+)"/i, html),
    description: first(/<meta[^>]+name="description"[^>]+content="([^"]*)"/i, html),
    hreflang: [...html.matchAll(/hreflang="([^"]+)"/g)].map((m) => m[1]),
    jsonld_types: [...html.matchAll(/"@type"\s*:\s*"([^"]+)"/g)].map((m) => m[1]).slice(0, 12),
  };
}

export async function snapshot(url, { fetchImpl = fetch, maxHops = 5 } = {}) {
  const chain = [];
  let current = url;
  for (let hop = 0; hop < maxHops; hop++) {
    const response = await fetchImpl(current, { redirect: "manual", headers: { "user-agent": "prestashop-medusa-migration" } });
    chain.push([current, response.status]);
    const location = response.headers.get("location");
    if (REDIRECT_CODES.has(response.status) && location) {
      current = new URL(location, current).href;
      continue;
    }
    const html = response.status === 200 ? await response.text() : "";
    return { url, chain, status: response.status, ...readPage(html) };
  }
  return { url, chain, status: "too-many-redirects" };
}

export function findings(records) {
  const out = [];
  const seen = (key) => {
    const groups = new Map();
    for (const r of records) {
      const value = r[key];
      if (!value || r.status !== 200) continue;
      groups.set(value, [...(groups.get(value) ?? []), r.url]);
    }
    return [...groups].filter(([, urls]) => urls.length > 1);
  };
  for (const r of records) {
    const path = new URL(r.url).pathname;
    if (r.status !== 200) out.push({ kind: "not-200", path, detail: r.chain.map(([u, s]) => `${s} ${new URL(u).pathname}`).join(" -> ") });
    else {
      if (!r.canonical) out.push({ kind: "no-canonical", path });
      else if (new URL(r.canonical, r.url).href !== r.url) out.push({ kind: "canonical-elsewhere", path, detail: r.canonical });
      if (!r.h1) out.push({ kind: "no-h1", path });
      if (r.robots && /noindex/i.test(r.robots)) out.push({ kind: "noindex-in-sitemap", path });
      if (!r.description) out.push({ kind: "no-description", path });
    }
  }
  for (const [title, urls] of seen("title")) out.push({ kind: "duplicate-title", path: urls.map((u) => new URL(u).pathname).join(" + "), detail: title });
  return out;
}
