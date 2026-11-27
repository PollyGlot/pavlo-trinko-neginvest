export function urlsFromSitemap(xml) {
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
}

export function compileTemplates(templates) {
  return templates.map(({ template, pattern }) => ({ template, pattern: new RegExp(pattern) }));
}

export function classify(url, templates) {
  const { pathname } = new URL(url);
  for (const { template, pattern } of templates) {
    const match = pathname.match(pattern);
    if (match) {
      const groups = match.groups ?? {};
      return {
        url,
        path: pathname,
        template,
        legacyId: groups.id ? Number(groups.id) : null,
        slug: groups.slug ?? null,
      };
    }
  }
  return { url, path: pathname, template: "other", legacyId: null, slug: pathname.replace(/^\//, "") };
}

export function inventory(xml, templates) {
  const compiled = compileTemplates(templates);
  return urlsFromSitemap(xml).map((url) => classify(url, compiled));
}

export function countByTemplate(rows) {
  const counts = {};
  for (const { template } of rows) counts[template] = (counts[template] ?? 0) + 1;
  return counts;
}
