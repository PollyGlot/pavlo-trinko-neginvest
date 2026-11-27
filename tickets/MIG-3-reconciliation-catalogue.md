# MIG-3. Vue de réconciliation du catalogue, PrestaShop vers Medusa

**Pour qui** : l'équipe e-commerce, qui doit savoir avant la bascule qu'aucun
produit vendu aujourd'hui ne manque.

## Contexte

L'offre le demande explicitement : prouver par les données que tous les
produits PrestaShop sont en ligne dans Medusa. Le modèle de départ est dans
[`dbt/models/reconciliation/`](../dbt/models/reconciliation/). Les noms de
sources sont des **hypothèses** (je n'ai pas accès au warehouse) : le premier
geste du ticket est de les remplacer par les vrais.

## Critères d'acceptation

- Une ligne par produit actif dans PrestaShop pour une marque, avec son état
  côté Medusa : `en_ligne`, `absent`, `non_publie`, `pas_dans_le_canal`.
- La réconciliation passe par l'identifiant PrestaShop gardé dans les
  métadonnées du produit Medusa, jamais par le nom.
- Le test dbt `aucun_produit_manquant` échoue tant qu'une ligne n'est pas
  `en_ligne`, sauf exception listée dans un seed avec sa raison.
- La même vue, filtrée par marque, sert à chaque migration suivante.

## Commande de test

```bash
dbt build --select rec_catalogue_prestashop_medusa   # le test échoue s'il manque un produit
```
