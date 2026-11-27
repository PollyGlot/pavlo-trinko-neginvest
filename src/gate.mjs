const REDIRECT_CODES = new Set([301, 302, 303, 307, 308]);

function canonicalOf(html) {
  const tag = html.match(/<link[^>]+rel=["']canonical["'][^>]*>/i)?.[0];
  return tag?.match(/href=["']([^"']+)["']/i)?.[1] ?? null;
}

function noindexOf(html, headers) {
  const meta = html.match(/<meta[^>]+name=["']robots["'][^>]*>/i)?.[0] ?? "";
  const header = headers.get("x-robots-tag") ?? "";
  return /noindex/i.test(meta) || /noindex/i.test(header);
}

export async function checkRedirect({ from, to }, base, fetchImpl = fetch) {
  const errors = [];
  const first = await fetchImpl(new URL(from, base), { redirect: "manual" });

  if (to === "gone") {
    if (first.status !== 410 && first.status !== 404) errors.push(`expected 410 or 404, got ${first.status}`);
    return { from, to, ok: errors.length === 0, errors };
  }

  if (to === from) {
    if (first.status !== 200) errors.push(`expected 200 on unchanged URL, got ${first.status}`);
    return { from, to, ok: errors.length === 0, errors };
  }

  if (first.status !== 301) {
    errors.push(`expected 301, got ${first.status}`);
    return { from, to, ok: false, errors };
  }

  const location = new URL(first.headers.get("location"), new URL(from, base));
  if (location.pathname !== to) errors.push(`redirects to ${location.pathname}, expected ${to}`);

  const landing = await fetchImpl(location, { redirect: "manual" });
  if (REDIRECT_CODES.has(landing.status)) errors.push(`chain: ${location.pathname} redirects again (${landing.status})`);
  else if (landing.status !== 200) errors.push(`target answers ${landing.status}`);
  else {
    const html = await landing.text();
    const canonical = canonicalOf(html);
    if (canonical && new URL(canonical, location).pathname !== location.pathname) {
      errors.push(`target canonical points to ${new URL(canonical, location).pathname}`);
    }
    if (noindexOf(html, landing.headers)) errors.push("target is noindex");
  }
  return { from, to, ok: errors.length === 0, errors };
}

export async function runGate(redirects, base, { fetchImpl = fetch, concurrency = 4 } = {}) {
  const results = new Array(redirects.length);
  let next = 0;
  async function worker() {
    while (next < redirects.length) {
      const i = next++;
      try {
        results[i] = await checkRedirect(redirects[i], base, fetchImpl);
      } catch (error) {
        results[i] = { ...redirects[i], ok: false, errors: [`request failed: ${error.message}`] };
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}
