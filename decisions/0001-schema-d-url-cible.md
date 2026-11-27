# 0001. Un schéma d'URL commun à toutes les marques

Statut : proposé, à trancher avec la tech et le webmarketing.

## Contexte

Les trois marques lues ici n'ont pas le même schéma d'URL sous PrestaShop :

| Marque | Produit | Catégorie | Page |
|---|---|---|---|
| Manulevage | `/<slug>-p-<id>.html` | `/<slug>-c-<id>.html` | `/<slug>-p.html` |
| Gosto | `/<id>-<slug>.html` | `/<id>-<slug>` | `/content/<id>-<slug>`, articles `/cms/<id>/<slug>` |
| Panostock | `/<categorie>/<id>-<slug>.html` | `/<id>-<slug>` | `/content/<id>-<slug>` |

Si chaque migration garde son schéma hérité, la plateforme porte autant de
routeurs que de marques, et l'identifiant PrestaShop reste dans les URL pour
toujours, alors que le catalogue sera unique et servi par le PIM.

## Options

- **A. Garder les URL PrestaShop telles quelles.** Aucune redirection, aucun
  risque de référencement à la bascule. Mais un routeur par marque, des
  identifiants d'un système éteint dans chaque URL, et rien de prévu pour le
  pays (Espagne, Portugal, Italie).
- **B. Un schéma commun, celui du storefront Medusa** :
  `/<pays>/products/<handle>`, `/<pays>/categories/<handle>`, et une 301 en un
  seul saut depuis chaque ancienne URL. Une migration se réduit alors à un
  fichier `sites/<marque>.json` (les gabarits hérités) et au plan de
  redirections qu'il produit.

## Proposition

B. Le coût est une bascule avec des redirections, que l'on sait contrôler
avant la mise en ligne (`npm run gate`) et suivre après (Search Console). Le
gain est une plateforme qui ne connaît qu'un schéma, et des marques qui
entrent dans le pays suivant sans changer d'URL.

## Ce qui reste ouvert

- Le handle d'un produit doit être unique dans le catalogue : voir
  [0002](0002-un-handle-par-produit.md).
- Le préfixe des pages éditoriales (`/fr/<slug>` ou `/fr/pages/<slug>`) dépend
  du CMS retenu.
