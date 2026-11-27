# MIG-2. Recette des URL avant la bascule

**Pour qui** : la direction, qui prononce la bascule sur des faits plutôt
qu'à une date.

## Contexte

Un plan de redirections juste peut être mal servi : une règle mal écrite, un
cache, une 302 au lieu d'une 301. Sur la refonte de joriana.fr, ce contrôle a
trouvé, cinq jours avant la date prévue, 103 redirections sur 206 qui
n'étaient pas servies. La bascule a attendu qu'il soit vert.

## Critères d'acceptation

1. **Photo d'avant** : `npm run baseline` puis `audit` sur la production
   PrestaShop ; export Search Console des 16 derniers mois (requêtes et
   pages), archivé. Ces chiffres ne se reconstituent pas après coup.
2. **Les URL qui ont du trafic** : toute page de l'export Search Console avec
   au moins un clic sur 16 mois est dans le plan, même si elle n'est plus
   dans le sitemap.
3. **Recette** : `npm run gate` contre la préproduction Medusa répond 100 %.
   Chaque ancienne URL fait une 301 en un saut vers sa cible, la cible répond
   200, sa canonique est elle-même et elle n'est pas en noindex ; une URL
   `gone` répond 410.
4. **Go** : un seul échec, et on ne bascule pas.
5. **Après** : sitemap soumis le jour J ; requêtes, pages et couverture
   comparées à la photo à J+7, J+28 et J+90. Une baisse de plus de 10 % des
   clics sur une famille de pages (même gabarit) déclenche une analyse le
   jour même.

## Commande de test

```bash
npm run gate manulevage https://preprod.manulevage.example   # code 0 : tout est servi
```
