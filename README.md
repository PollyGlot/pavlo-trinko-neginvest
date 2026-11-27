# Migrer 20 boutiques PrestaShop vers Medusa sans perdre le référencement

Je m'appelle Pavlo Trinko et je candidate à la mission **Senior Product
Manager freelance** de Neginvest. Plutôt qu'un CV, voici ce que j'ai fait en
lisant l'offre : prendre le problème de janvier, migrer une marque sans
casser le référencement, et le poser sur vos données publiques.

Tout vient de ce que n'importe qui peut lire : les sitemaps et les pages de
Manulevage, Gosto et Panostock, relevés le 27/11/2026. Je n'ai eu accès à
rien d'autre.

## Ce que j'ai trouvé

**1. Trois marques, trois schémas d'URL.** Manulevage écrit ses produits
`/<slug>-p-<id>.html`, Gosto `/<id>-<slug>.html`, Panostock
`/<categorie>/<id>-<slug>.html`, et les pages éditoriales changent aussi.
Pour qu'une migration ne soit plus qu'un thème et un plan de redirections, le
schéma hérité d'une marque doit tenir dans un fichier de configuration
([`sites/`](sites/)) et le plan doit en sortir tout seul. Je propose un
schéma cible commun, celui du storefront Medusa
([décision 0001](decisions/0001-schema-d-url-cible.md)).

**2. Le catalogue unique va faire apparaître des doublons.** Dans Medusa, un
handle de produit est unique. En le tirant du slug PrestaShop, 16 handles
sont revendiqués par plusieurs URL : 15 dans un même site (trois établis
`etabli-1-caisson-160x60-cm` chez Gosto, par exemple) et un entre deux
marques (`cendrier-exterieur-sur-pied`, chez Gosto et chez Panostock). Ce
sont des déclinaisons, des doublons ou des produits différents, et seul le
PIM peut le dire. C'est une décision à prendre avant la migration, pas
pendant ([décision 0002](decisions/0002-un-handle-par-produit.md)).

**3. La photo d'avant de Manulevage.**
J'ai relevé ses 434 pages, une
toutes les demi-secondes ([`data/manulevage/baseline.jsonl`](data/manulevage/baseline.jsonl)).
Le site est propre dans l'ensemble, mais son sitemap annonce des pages que
Google ne doit pas recevoir telles quelles, et la migration ne doit pas les
recopier :

- deux pages en 404 (`/prod335-p-335.html` et `/page-introuvable`) ;
- quatre pages en `noindex`, dont `/confirmation-paiement-p.html` ;
- trois fiches produit dont la canonique renvoie vers leur catégorie et qui en
  reprennent le titre, par exemple
  `/transpalette-semi-electrique-tse15-p-369.html`. Faut-il les rediriger vers
  la catégorie, comme leur canonique le dit déjà, ou vers une vraie fiche ?
  C'est la question que je poserais au webmarketing avant d'écrire la règle.

## Ce que contient le dépôt

| Dossier | Quoi |
|---|---|
| [`sites/`](sites/) | les gabarits d'URL hérités de chaque marque et le schéma cible |
| [`data/`](data/) | sitemaps relevés, plans de redirections, photo d'avant de Manulevage |
| [`tickets/`](tickets/) | trois tickets au format que je livre : contexte, critères d'acceptation, commande de test |
| [`decisions/`](decisions/) | le journal des décisions produit, deux entrées |
| [`dbt/`](dbt/) | la vue de réconciliation PrestaShop vers Medusa, sur des noms de sources supposés |
| [`.claude/skills/`](.claude/skills/recette-migration/SKILL.md) | la skill qui fait dérouler la recette par un agent et rend un go ou un no-go |

```bash
npm test                          # Node 22, aucune dépendance
npm run plan manulevage           # 434 URL, 0 problème
npm run collisions                # 16 handles partagés, code 1
npm run audit manulevage          # ce que le site actuel fait déjà mal
npm run gate manulevage <url>     # la recette avant bascule, contre une préproduction
```

Les tickets sont écrits pour être exécutés par un humain ou par un agent :
chacun se termine par la commande qui dit s'il est fini.

## Mon histoire

J'ai onze ans de produit et de développement. J'ai d'abord été développeur
mobile, puis lead de l'équipe mobile chez **Yper** (livraison collaborative,
quatre applications, dont une B2B et une pour l'entrepôt), puis **Product
Owner** de leur application principale, 250 000 utilisateurs actifs, en squad
avec le design, le mobile, le back et le front. J'y ai appris à partir du
terrain (shoppers, livreurs, entrepôt), à écrire des specs qui se livrent, et
à couper.

Depuis 2026, je mène des produits de bout en bout avec des agents IA. Mon
poste de travail, c'est des agents en parallèle sur des worktrees isolés, des
skills et des contrôles partagés qui les tiennent aux mêmes règles, une revue
par un second fournisseur d'IA, et un journal de décisions qui dit pourquoi.
Je reste responsable de ce qui sort : rien ne part sans une preuve qu'on peut
relancer. Ce dépôt a été fait de cette façon, en une demi-journée.

La mission la plus proche de la vôtre, c'est la refonte de **joriana.fr**
(organisme de formation) cet été : de WordPress à Astro sur Cloudflare.
J'ai tenu toute la partie référencement :

- l'inventaire des URL lu sur le WordPress vivant, pas sur un export ;
- 735 redirections, générées et testées, sans chaîne de 301 ;
- un contrôle avant bascule qui a trouvé, cinq jours avant la date prévue,
  103 redirections sur 206 qui n'étaient pas servies. La bascule a attendu
  qu'il soit vert : on l'a prononcée sur un critère de go écrit, pas sur une date ;
- la photo Search Console des 12 derniers mois avant la bascule, puis le
  suivi de la couverture et des requêtes après ;
- titres et H1 des pages éditoriales gelés sur un tableau validé par le client.

Sur le même projet, j'ai automatisé le parcours de devis dans HubSpot : un
devis en quatre étapes crée la transaction et un devis brouillon par
formation, le commercial n'a plus qu'à relire et envoyer.

J'habite à Tourcoing, à côté de Lille.

## Ce que je n'ai pas encore fait

Je préfère le dire ici plutôt qu'en entretien : je n'ai pas encore mis
Medusa en production, je n'ai pas travaillé sur Snowflake ni sur un projet
dbt d'équipe, et je n'ai jamais raccordé de PunchOut. Le modèle dbt de ce
dépôt n'a tourné sur aucun warehouse.

## Mes autres dépôts publics

- [google-play-cli](https://github.com/PollyGlot/google-play-cli) :
  `gplay`, un CLI en Go pour publier sur Google Play depuis une CI ou un
  agent, distribué par Homebrew ;
- [google-play-cli-skills](https://github.com/PollyGlot/google-play-cli-skills) :
  les skills d'agent qui vont avec.

## Contact

pavlo.trinko@gmail.com · [linkedin.com/in/pavlo-trinko-aa4826139](https://www.linkedin.com/in/pavlo-trinko-aa4826139)
