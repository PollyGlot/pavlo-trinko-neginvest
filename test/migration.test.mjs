import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { classify as classifyWith, compileTemplates, inventory } from "../src/inventory.mjs";
import { buildPlan, handleCollisions } from "../src/redirects.mjs";
import { runGate } from "../src/gate.mjs";

const MANULEVAGE = JSON.parse(readFileSync(new URL("../sites/manulevage.json", import.meta.url)));
const TEMPLATES = compileTemplates(MANULEVAGE.templates);
const classify = (url) => classifyWith(url, TEMPLATES);

const SCHEME = {
  product: "/fr/products/{slug}",
  category: "/fr/categories/{slug}",
  cms: "/fr/pages/{slug}",
};

test("classify recognises PrestaShop URL templates", () => {
  assert.deepEqual(classify("https://www.manulevage.fr/transpalette-standard-c-38.html"), {
    url: "https://www.manulevage.fr/transpalette-standard-c-38.html",
    path: "/transpalette-standard-c-38.html",
    template: "category",
    legacyId: 38,
    slug: "transpalette-standard",
  });
  assert.equal(classify("https://x.fr/gerbeur-manuel-p-1204.html").template, "product");
  assert.equal(classify("https://x.fr/mentions-legales-p.html").template, "cms");
  assert.equal(classify("https://x.fr/plan-de-site").template, "other");
});

test("inventory reads every <loc> of a sitemap", () => {
  const xml = `<urlset><url><loc>https://x.fr/a-c-1.html</loc></url><url><loc>
    https://x.fr/b-p-2.html</loc></url></urlset>`;
  assert.deepEqual(inventory(xml, MANULEVAGE.templates).map((r) => r.template), ["category", "product"]);
});

test("plan flags collisions, chains and unmapped templates", () => {
  const rows = [
    classify("https://x.fr/transpalette-p-1.html"),
    classify("https://x.fr/transpalette-p-2.html"),
    classify("https://x.fr/plan-de-site"),
  ];
  const { problems } = buildPlan(rows, SCHEME);
  assert.deepEqual(problems.map((p) => p.kind).sort(), ["collision", "unmapped"]);

  const chained = buildPlan([classify("https://x.fr/a-c-1.html")], SCHEME, {
    "/a-c-1.html": "/b-c-2.html",
  });
  assert.equal(chained.problems.length, 0);
  const loop = buildPlan([classify("https://x.fr/a-c-1.html"), classify("https://x.fr/b-c-2.html")], SCHEME, {
    "/a-c-1.html": "/b-c-2.html",
  });
  assert.deepEqual(loop.problems.map((p) => p.kind), ["chain"]);
});

test("slugs are lowercased and lose dangling dashes", () => {
  const { redirects } = buildPlan([classify("https://x.fr/Vestiaire-Chauffant--p-9.html")], SCHEME);
  assert.equal(redirects[0].to, "/fr/products/vestiaire-chauffant");
});

test("a URL marked gone is neither a problem nor a redirect", () => {
  const { redirects, problems } = buildPlan([classify("https://x.fr/page-introuvable")], SCHEME, {
    "/page-introuvable": "gone",
  });
  assert.equal(redirects[0].to, "gone");
  assert.deepEqual(problems, []);
});

test("two sites sharing one catalog cannot both own a product handle", () => {
  const a = buildPlan([classify("https://a.fr/cendrier-exterieur-p-1.html")], SCHEME);
  const b = buildPlan([classify("https://b.fr/cendrier-exterieur-p-893.html")], SCHEME);
  assert.deepEqual(handleCollisions([{ site: "a", ...a }, { site: "b", ...b }]), [
    { to: "/fr/products/cendrier-exterieur", sources: ["a:/cendrier-exterieur-p-1.html", "b:/cendrier-exterieur-p-893.html"] },
  ]);
});

function staging(routes) {
  const server = createServer((req, res) => {
    const route = routes[req.url];
    if (!route) return res.writeHead(404).end();
    res.writeHead(route.status, route.headers ?? {}).end(route.body ?? "");
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

test("gate passes a clean one-hop 301 and catches every way a redirect breaks", async () => {
  const page = (path, extra = "") => `<html><head><link rel="canonical" href="${path}">${extra}</head></html>`;
  const server = await staging({
    "/ok-p-1.html": { status: 301, headers: { location: "/fr/products/ok" } },
    "/fr/products/ok": { status: 200, body: page("/fr/products/ok") },
    "/temp-p-2.html": { status: 302, headers: { location: "/fr/products/temp" } },
    "/chain-p-3.html": { status: 301, headers: { location: "/old/chain" } },
    "/old/chain": { status: 301, headers: { location: "/fr/products/chain" } },
    "/wrong-p-4.html": { status: 301, headers: { location: "/fr/products/other" } },
    "/fr/products/other": { status: 200, body: page("/fr/products/other") },
    "/hidden-p-5.html": { status: 301, headers: { location: "/fr/products/hidden" } },
    "/fr/products/hidden": { status: 200, body: page("/fr/products/hidden", '<meta name="robots" content="noindex">') },
    "/dup-p-6.html": { status: 301, headers: { location: "/fr/products/dup" } },
    "/fr/products/dup": { status: 200, body: page("/fr/products/ok") },
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const results = await runGate(
      [
        { from: "/ok-p-1.html", to: "/fr/products/ok" },
        { from: "/temp-p-2.html", to: "/fr/products/temp" },
        { from: "/chain-p-3.html", to: "/fr/products/chain" },
        { from: "/wrong-p-4.html", to: "/fr/products/wrong" },
        { from: "/hidden-p-5.html", to: "/fr/products/hidden" },
        { from: "/dup-p-6.html", to: "/fr/products/dup" },
        { from: "/missing-p-7.html", to: "/fr/products/missing" },
        { from: "/page-introuvable", to: "gone" },
      ],
      base,
    );
    const byFrom = Object.fromEntries(results.map((r) => [r.from, r.errors.join("; ")]));
    assert.equal(byFrom["/ok-p-1.html"], "");
    assert.match(byFrom["/temp-p-2.html"], /expected 301, got 302/);
    assert.match(byFrom["/chain-p-3.html"], /redirects to \/old\/chain.*chain:/);
    assert.match(byFrom["/wrong-p-4.html"], /expected \/fr\/products\/wrong/);
    assert.match(byFrom["/hidden-p-5.html"], /noindex/);
    assert.match(byFrom["/dup-p-6.html"], /canonical points to \/fr\/products\/ok/);
    assert.match(byFrom["/missing-p-7.html"], /got 404/);
    assert.equal(byFrom["/page-introuvable"], "");
  } finally {
    server.close();
  }
});

test("audit reports what the current site already gets wrong", async () => {
  const { findings, readPage } = await import("../src/baseline.mjs");
  const page = (url, html) => ({ url, chain: [[url, 200]], status: 200, ...readPage(html) });
  const records = [
    page("https://x.fr/a-p-1.html", '<title>A</title><link rel="canonical" href="https://x.fr/c-c-1.html"><h1>A</h1><meta name="description" content="d">'),
    page("https://x.fr/c-c-1.html", '<title>A</title><link rel="canonical" href="https://x.fr/c-c-1.html"><h1>C</h1><meta name="description" content="d">'),
    page("https://x.fr/cgv-p.html", '<title>CGV</title><meta name="robots" content="noindex,follow">'),
    { url: "https://x.fr/old-p-9.html", chain: [["https://x.fr/old-p-9.html", 404]], status: 404 },
  ];
  const kinds = findings(records).map((f) => `${f.kind} ${f.path}`).sort();
  assert.deepEqual(kinds, [
    "canonical-elsewhere /a-p-1.html",
    "duplicate-title /a-p-1.html + /c-c-1.html",
    "no-canonical /cgv-p.html",
    "no-description /cgv-p.html",
    "no-h1 /cgv-p.html",
    "noindex-in-sitemap /cgv-p.html",
    "not-200 /old-p-9.html",
  ]);
});
