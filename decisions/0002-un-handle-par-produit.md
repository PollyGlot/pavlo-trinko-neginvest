# 0002. Un handle par produit dans le catalogue unique

Statut : à instruire avec l'équipe PIM.

## Contexte

Le handle Medusa (le slug de l'URL) est unique dans une boutique. En tirant
le handle du slug PrestaShop, `npm run collisions` trouve **16 handles
revendiqués par plusieurs URL** sur les trois marques lues le 27/11/2026 :

- 15 dans un même site : Gosto (12) et Panostock (3), par exemple
  `/789-chaise-de-bureau-4-pieds-hella.html` et
  `/790-chaise-de-bureau-4-pieds-hella.html`, ou trois établis
  `/1133`, `/1134`, `/1135-etabli-1-caisson-160x60-cm.html` ;
- 1 entre deux marques : `cendrier-exterieur-sur-pied`, vendu par Gosto
  (`/1131-…`) et par Panostock (`/mobilier-urbain/893-…`).

## La question

Ces doublons sont-ils un même produit décliné (taille, coloris), des fiches
en double à fusionner, ou des produits différents mal nommés ? Vu de
l'extérieur, on ne peut pas le dire : la réponse est dans le PIM.

## Pistes, selon la réponse

- **Déclinaisons** : un produit Medusa avec des variantes, toutes les
  anciennes URL redirigent vers sa fiche.
- **Doublons** : une fiche gardée, l'autre en 301, après avoir comparé leur
  trafic organique (garder celle qui reçoit les visites).
- **Produits distincts** : un handle qui porte la différence
  (`etabli-1-caisson-160x60-cm-hetre`).
- **Même produit sur deux marques** : une fiche par site, et une règle de
  canonique à décider, sinon deux domaines du groupe se concurrencent sur la
  même requête.

Le contrôle `npm run collisions` reste dans la chaîne : une marque ne migre
pas tant qu'il trouve une collision.
