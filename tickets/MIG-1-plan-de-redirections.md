# MIG-1. Plan de redirections d'une marque

**Pour qui** : le webmarketing, qui ne doit perdre aucune page indexée à la
bascule ; les développeurs, qui chargent le plan dans le storefront.

## Contexte

Chaque marque a ses propres gabarits d'URL PrestaShop (voir
[ADR 0001](../decisions/0001-schema-d-url-cible.md)). Le plan part de son
sitemap public, classe chaque URL par gabarit et lui donne sa cible dans le
schéma commun. Manulevage : 434 URL, dont 346 produits, 37 catégories,
48 pages et 3 cas particuliers.

## Critères d'acceptation

- Chaque URL du sitemap a une cible, ou est marquée `gone` (elle doit
  répondre 410) avec la raison dans la revue de la PR.
- Aucune chaîne : une cible n'est jamais elle-même redirigée.
- Aucune collision : deux anciennes URL n'atterrissent pas sur la même cible
  sans décision écrite (voir [ADR 0002](../decisions/0002-un-handle-par-produit.md)).
- Le sitemap relu a moins de 7 jours au moment de la recette.

## Commande de test

```bash
npm run fetch manulevage
npm run plan manulevage        # code 0 : aucun problème ; code 1 : la liste
npm run collisions             # code 0 : aucun handle partagé entre marques
```

Hors périmètre : les URL absentes du sitemap mais qui reçoivent du trafic.
Elles viennent de l'export Search Console (MIG-2).
