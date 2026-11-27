---
name: recette-migration
description: Check that a brand's PrestaShop to Medusa migration is ready to switch, from its public sitemap to a one-hop 301 on every legacy URL. Use when asked whether a brand can switch, to prepare or review its redirect plan, or to compare a migrated site with its pre-switch baseline.
---

# Recette d'une migration

The answer is a go or a no-go, backed by the commands below. Never say go on
a plan you did not run, and never round a single failure down to "almost".

## Steps

1. `npm run fetch <site>`, then `npm run plan <site>`. If the
   site has no `sites/<site>.json`, write its `templates` from a sample of
   its sitemap first, and show the template counts to the human before going on.
2. `npm run collisions`. A shared handle is a PIM decision
   (`decisions/0002-un-handle-par-produit.md`), not something to fix with a
   suffix on your own.
3. Before the switch: `npm run baseline <site>` and `npm run audit <site>`
   against production. Ask the human for the Search Console export; you
   cannot pull it, and URLs with traffic outside the sitemap must join the plan.
4. `npm run gate <site> <preprod-url>`. Exit code 0 only.

## Report

One table, then one line of verdict:

| Check | Result | Command |
|---|---|---|
| URLs in the plan | n / n | `npm run plan <site>` |
| Shared handles | 0 | `npm run collisions` |
| Gate | n / n OK | `npm run gate <site> <url>` |

Below it, every failing URL with its error, grouped by template. Things you
could not check (Search Console, pages outside the sitemap) are listed as
unchecked, never as passed.
