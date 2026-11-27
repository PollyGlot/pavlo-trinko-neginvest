export const GONE = "gone";

export function normalizeSlug(slug) {
  return slug.toLowerCase().replace(/-+/g, "-").replace(/^-|-$/g, "");
}

export function targetPath(row, scheme) {
  const pattern = scheme[row.template];
  if (pattern === undefined) return null;
  return pattern.replaceAll("{slug}", normalizeSlug(row.slug)).replaceAll("{id}", String(row.legacyId ?? ""));
}

export function buildPlan(rows, scheme, overrides = {}) {
  const redirects = rows.map((row) => {
    const override = overrides[row.path];
    const target = override !== undefined ? override : targetPath(row, scheme);
    return { from: row.path, to: target, template: row.template, legacyId: row.legacyId };
  });
  return { redirects, problems: findProblems(redirects) };
}

export function findProblems(redirects) {
  const problems = [];
  const sources = new Set(redirects.map((r) => r.from));
  const byTarget = new Map();

  for (const r of redirects) {
    if (r.to === GONE) continue;
    if (r.to === null) {
      problems.push({ kind: "unmapped", from: r.from, detail: `no rule for template "${r.template}"` });
      continue;
    }
    if (r.to === r.from) continue;
    if (sources.has(r.to)) {
      problems.push({ kind: "chain", from: r.from, detail: `target ${r.to} is itself redirected` });
    }
    const list = byTarget.get(r.to) ?? [];
    list.push(r.from);
    byTarget.set(r.to, list);
  }

  for (const [to, froms] of byTarget) {
    if (froms.length > 1) {
      problems.push({ kind: "collision", from: froms.join(" + "), detail: `${froms.length} legacy URLs land on ${to}` });
    }
  }
  return problems;
}

export function handleCollisions(plans) {
  const owners = new Map();
  for (const { site, redirects } of plans) {
    for (const r of redirects) {
      if (r.template !== "product" || !r.to || r.to === GONE) continue;
      const list = owners.get(r.to) ?? [];
      list.push(`${site}:${r.from}`);
      owners.set(r.to, list);
    }
  }
  return [...owners].filter(([, list]) => list.length > 1).map(([to, list]) => ({ to, sources: list }));
}

export function toCsv(redirects) {
  const lines = ["from,to,template,legacy_id"];
  for (const r of redirects) lines.push([r.from, r.to ?? "", r.template, r.legacyId ?? ""].join(","));
  return lines.join("\n") + "\n";
}

export function fromCsv(text) {
  const [header, ...lines] = text.trim().split("\n");
  const keys = header.split(",");
  return lines.map((line) => Object.fromEntries(line.split(",").map((v, i) => [keys[i], v])));
}
