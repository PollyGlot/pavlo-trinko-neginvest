#!/usr/bin/env node
import { readFile, writeFile, mkdir, appendFile } from "node:fs/promises";
import { inventory, countByTemplate } from "../src/inventory.mjs";
import { buildPlan, handleCollisions, toCsv, fromCsv } from "../src/redirects.mjs";
import { runGate } from "../src/gate.mjs";
import { snapshot, findings } from "../src/baseline.mjs";

const USAGE = `usage:
  migration.mjs fetch <site>            download the live sitemap to data/<site>/sitemap.xml
  migration.mjs baseline <site>         snapshot every sitemap URL to data/<site>/baseline.jsonl, before the switch
  migration.mjs audit <site>            what the baseline already gets wrong, by kind
  migration.mjs plan <site>             write data/<site>/redirects.csv, exit 1 on any problem
  migration.mjs collisions <site>...    product handles that two sites would share in one catalog
  migration.mjs gate <site> <base-url>  check every redirect against a staging or live host`;

const ROOT = new URL("..", import.meta.url);
const path = (p) => new URL(p, ROOT);
const site = async (name) => JSON.parse(await readFile(path(`sites/${name}.json`), "utf8"));

async function planOf(name) {
  const config = await site(name);
  const rows = inventory(await readFile(path(`data/${name}/sitemap.xml`), "utf8"), config.templates);
  return { site: name, rows, ...buildPlan(rows, config.scheme, config.overrides) };
}

const commands = {
  async fetch([name]) {
    const config = await site(name);
    const response = await fetch(config.sitemap, { headers: { "user-agent": "prestashop-medusa-migration" } });
    if (!response.ok) throw new Error(`${config.sitemap}: ${response.status}`);
    await mkdir(path(`data/${name}/`), { recursive: true });
    await writeFile(path(`data/${name}/sitemap.xml`), await response.text());
    return 0;
  },

  async baseline([name]) {
    const config = await site(name);
    const rows = inventory(await readFile(path(`data/${name}/sitemap.xml`), "utf8"), config.templates);
    const out = path(`data/${name}/baseline.jsonl`);
    await writeFile(out, "");
    for (const { url } of rows) {
      await appendFile(out, JSON.stringify(await snapshot(url)) + "\n");
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    return 0;
  },

  async audit([name]) {
    const records = (await readFile(path(`data/${name}/baseline.jsonl`), "utf8")).trim().split("\n").map((l) => JSON.parse(l));
    const found = findings(records);
    const byKind = {};
    for (const f of found) (byKind[f.kind] ??= []).push(f.detail ? `${f.path} (${f.detail})` : f.path);
    console.log(JSON.stringify({ site: name, pages: records.length, byKind }, null, 2));
    return 0;
  },

  async plan([name]) {
    const { rows, redirects, problems } = await planOf(name);
    await writeFile(path(`data/${name}/redirects.csv`), toCsv(redirects));
    console.log(JSON.stringify({ site: name, urls: rows.length, byTemplate: countByTemplate(rows), problems }, null, 2));
    return problems.length === 0 ? 0 : 1;
  },

  async collisions(names) {
    const collisions = handleCollisions(await Promise.all(names.map(planOf)));
    console.log(JSON.stringify({ sites: names, collisions: collisions.length, examples: collisions.slice(0, 10) }, null, 2));
    return collisions.length === 0 ? 0 : 1;
  },

  async gate([name, base]) {
    const redirects = fromCsv(await readFile(path(`data/${name}/redirects.csv`), "utf8")).filter((r) => r.to);
    const results = await runGate(redirects, base);
    const failed = results.filter((r) => !r.ok);
    for (const r of failed) console.log(`FAIL ${r.from} -> ${r.to}: ${r.errors.join("; ")}`);
    console.log(`gate: ${results.length - failed.length}/${results.length} OK`);
    return failed.length === 0 ? 0 : 1;
  },
};

const [command, ...args] = process.argv.slice(2);
if (!commands[command] || args.length === 0) {
  console.error(USAGE);
  process.exit(2);
}
process.exit(await commands[command](args));
