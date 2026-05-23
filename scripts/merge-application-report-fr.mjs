/**
 * Fusionne le corps du PDF « Système Intelligent… » avec le rapport Seller Helper existant.
 *   node scripts/merge-application-report-fr.mjs
 */

import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { normalizePunctuation } from "./normalize-report-punctuation-fr.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "reports", "Seller-Helper-Application-Documentation-fr.md");
const OUT = SRC;

const SHIFT_FROM_COLLECTE_5 = { 5: 6, 6: 7, 7: 8, 8: 9, 9: 10, 10: 11, 11: 12, 12: 13, 13: 14 };
const SHIFT_IDENTITY = { 6: 6, 7: 7, 8: 8, 9: 9, 10: 10, 11: 11, 12: 12, 13: 13, 14: 14 };

const RE_CH6_COLLECTE = /^## Chapitre 6[.:] Collecte des données/m;
const RE_CH5_COLLECTE = /^## Chapitre 5[.:] Collecte des données/m;

function technicalStartMarker(md) {
  if (RE_CH6_COLLECTE.test(md)) {
    return { marker: md.match(RE_CH6_COLLECTE)[0], shift: SHIFT_IDENTITY };
  }
  if (RE_CH5_COLLECTE.test(md)) {
    return { marker: md.match(RE_CH5_COLLECTE)[0], shift: SHIFT_FROM_COLLECTE_5 };
  }
  throw new Error("Section technique (Collecte des données) introuvable");
}

function extractTechnicalPart(md, startMarker, chapterShift) {
  const i = md.indexOf(startMarker);
  if (i < 0) throw new Error(`Technical section not found: ${startMarker}`);
  const tail = md.slice(i);
  const blocks = tail.split(/(?=^## Chapitre \d+ :)/m).filter(Boolean);
  const renumbered = blocks.map((block) => {
    const m = block.match(/^## Chapitre (\d+) :([^\n]+)/);
    if (!m) return block;
    const oldNum = Number(m[1]);
    const newNum = chapterShift[oldNum] ?? oldNum;
    let out = block.replace(/^## Chapitre \d+ :/, `## Chapitre ${newNum} :`);
    out = out.replace(new RegExp(`^### ${oldNum}\\.`, "gm"), `### ${newNum}.`);
    return out;
  });
  let joined = renumbered.join("");
  joined = joined.replace(
    "Les chapitres 5 et 6 ont posé",
    "Les chapitres 6 et 7 ont posé"
  );
  joined = joined.replace(
    "1. **Collecte** sur la boutique (chapitre 5).",
    "1. **Collecte** sur la boutique (chapitre 6)."
  );
  joined = joined.replace(
    "3. **Analyse** par règles et LLM (chapitre 6).",
    "3. **Analyse** par règles et LLM (chapitre 7)."
  );
  joined = joined.replace(
    /\n## Chapitre \d+[.:] Confidentialité, sécurité et politiques d'usage[\s\S]*?(?=\n## Chapitre \d+[.:] Impacts)/,
    "\n"
  );
  return joined;
}

function findChapterIndex(text, num, titlePrefix) {
  const re = new RegExp(`^## Chapitre ${num}[.:] ${titlePrefix}`, "m");
  const m = text.match(re);
  if (!m) return -1;
  return text.indexOf(m[0]);
}

function dedupeConfidentialityChapter(tail) {
  const re = /^## Chapitre 12[.:] Confidentialité, sécurité et politiques d'usage[^\n]*\n/gm;
  const hits = [...tail.matchAll(re)];
  if (hits.length < 2) return tail;
  const second = hits[1].index;
  const afterSecond = tail.slice(second);
  const nextChapter = afterSecond.search(/\n## Chapitre 13[.:] /);
  const removeEnd = nextChapter < 0 ? afterSecond.length : second + nextChapter;
  return tail.slice(0, second) + tail.slice(removeEnd);
}

const PARTIE_CADRE = `# Système Intelligent d'Analyse et de Recommandation pour les Sites E-Commerce

## Application Seller Helper — Plateforme Vitrina Store

**Rapport de présentation — Projet pluridisciplinaire**

Université des Sciences et de la Technologie Houari Boumediène — Faculté d'Informatique

Année universitaire : 2025 / 2026

## Remerciements

Nous remercions l'encadrement académique de la Faculté d'Informatique et l'équipe Vitrina Store pour le soutien apporté à la conception et au déploiement du système. Nous adressons également nos remerciements aux marchands qui ont testé le Seller Helper sur leurs boutiques ; leurs retours ont guidé l'organisation des écrans, la priorisation des recommandations et la formulation des actions proposées.

## Résumé

Le commerce en ligne produit beaucoup de données que les petits marchands transforment peu en décisions concrètes. Ce document décrit le système d'analyse et de recommandation développé pour les boutiques en ligne, déployé via l'application Seller Helper sur Vitrina Store.

La première partie situe le projet : contexte, difficultés rencontrées par les marchands, outils existants et motivations. La seconde expose les technologies retenues (TypeScript, Next.js, Neon, Vercel, Better Auth, Google, Brevo, modèle de langage), la collecte et le traitement des signaux, puis l'organisation de l'interface Seller Helper. Le marchand peut ainsi suivre l'activité, lancer une analyse, agir sur la boutique et mesurer l'effet de ses décisions.

## Table des matières

**Partie I — Cadre du projet**

1. Chapitre 1 — Introduction générale
2. Chapitre 2 — Problématique
3. Chapitre 3 — Étude et analyse de l'existant
4. Chapitre 4 — Motivations et besoins

**Partie II — Conception et application Seller Helper**

5. Chapitre 5 — Technologies, langages et outils utilisés
6. Chapitre 6 — Collecte des données : groupes, motivations et enregistrement
7. Chapitre 7 — Analyse des données : règles métier et intelligence artificielle (LLM)
8. Chapitre 8 — Présentation générale de l'application Seller Helper
9. Chapitre 9 — Architecture de restitution et flux dans l'interface
10. Chapitre 10 — Workflow et parcours utilisateur
11. Chapitre 11 — Description des modules de l'interface
12. Chapitre 12 — Confidentialité, sécurité et politiques d'usage
13. Chapitre 13 — Impacts et bénéfices pour le marchand
14. Chapitre 14 — Conclusion générale

## Chapitre 1 : Introduction générale

### 1.1 Introduction

Le commerce électronique s'est imposé comme un pilier majeur de l'économie numérique, mais la plupart des boutiques en ligne peinent encore à exploiter pleinement leur potentiel. Derrière des investissements importants en publicité, en acquisition de trafic et en optimisation technique, une réalité persiste : une large majorité des visiteurs quittent les sites sans acheter, faute d'une compréhension fine de leur comportement et d'outils d'aide à la décision réellement exploitables par les marchands.

L'enjeu n'est plus seulement de collecter des données, mais de les transformer en actions concrètes pour un e-commerçant souvent seul ou en petite équipe. Le travail présenté ici vise un outil d'analyse et de recommandation qui rapproche les indicateurs du terrain : passer de « voir des métriques » à « savoir quoi modifier sur la boutique ».

### 1.2 Contexte

Les e-commerçants opèrent dans un environnement concurrentiel et complexe : multiplication des canaux d'acquisition, exigences élevées des utilisateurs, diversité des appareils, pression sur les coûts publicitaires et besoin de rentabilité à court terme. Le site e-commerce concentre les efforts marketing, supporte les parcours d'achat et cristallise les décisions sur les produits, les prix et l'expérience utilisateur.

Pourtant, beaucoup de marchands disposent d'informations dispersées — statistiques d'audience, données de campagnes, indicateurs techniques — sans cadre unifié pour les interpréter et agir. Les outils existants sont souvent trop génériques, trop complexes ou peu adaptés aux petites structures sans équipe data. Dans les marchés émergents, notamment en Algérie, cette contrainte est accentuée par des ressources limitées, une forte dépendance au mobile et un recours massif aux réseaux sociaux comme point d'entrée vers la boutique.

Relier l'analyse du comportement à des recommandations précises et utilisables sur le terrain est au cœur du projet : une vision synthétique, adaptée aux objectifs de la boutique et compatible avec le temps et les compétences du marchand.

### 1.3 Objectifs du rapport

Ce rapport vise à formaliser la problématique e-commerce et le positionnement par rapport à l'existant ; expliquer pourquoi chaque famille de données est collectée et comment elle est traitée (règles et modèle de langage) ; décrire les technologies et services cloud employés (Neon, Vercel, Brevo, authentification Google, etc.) ; présenter l'application Seller Helper, ses écrans et le parcours du marchand ; enfin aborder la confidentialité et les effets attendus sur l'activité commerciale.

## Chapitre 2 : Problématique

Les e-commerçants font face à des difficultés liées entre elles. Nous les regroupons en six thèmes ; Seller Helper les prend en charge de manière coordonnée dans une même interface.

### 2.1 Manque de visibilité sur le comportement des visiteurs

Le vendeur ne sait pas toujours où cliquent ses visiteurs, jusqu'où ils font défiler les pages ni quels éléments retiennent leur attention. Seller Helper propose l'onglet Comportement utilisateur (cartes de chaleur, parcours, scroll) et enregistre les interactions spatiales (voir chapitre 6).

### 2.2 Absence d'analyse du tunnel de conversion

Les abandons entre fiche produit, panier et paiement restent souvent invisibles. L'onglet Conversion Funnel, les alertes d'abandon de panier et les recommandations issues de l'analyse couvrent ce point.

### 2.3 Difficulté à mesurer le retour sur investissement publicitaire

Sans lien clair entre campagnes et ventes, le budget publicitaire est difficile à piloter. Le Dashboard et la Timeline affichent sources de trafic et conversion dans le temps ; le contexte de campagne est intégré à la collecte (chapitre 6, premier groupe de données).

### 2.4 Performance technique insuffisante

Un site lent ou mal adapté au mobile fait fuir les visiteurs. Des alertes performance, des recommandations techniques pour le support et des signaux de lenteur en collecte (groupe 5) permettent d'agir.

### 2.5 Manque de recommandations concrètes

Les outils classiques livrent des métriques sans priorisation ni plan d'action. Les recommandations IA (règles et modèle de langage), les fiches Recommandation Vitrina, l'Inbox et l'envoi par e-mail aux rôles concernés comblent cette lacune.

### 2.6 Suivi des stocks et de la rentabilité catalogue

Ruptures et présentation produit dégradée font perdre des ventes. Des recommandations par produit, l'analyse catalogue envoyée au modèle de langage et les correctifs merchandising rapides adressent ce sujet.

Ces six thèmes sont traités depuis une interface unique, décrite à partir du chapitre 8.

## Chapitre 3 : Étude et analyse de l'existant

### 3.1 Panorama du commerce en ligne

Le commerce en ligne repose sur une multitude de petites boutiques qui, avec des moyens limités, doivent piloter des vitrines de plus en plus complexes. L'enjeu n'est plus seulement d'avoir un site ou de drainer du trafic, mais de **transformer ce trafic en ventes** avec des données fiables et compréhensibles par le marchand lui-même.

### 3.2 Contexte régional : micro-marchands et outils

Dans les marchés émergents comme l'Algérie, la trajectoire typique passe souvent des réseaux sociaux à une boutique structurée. Les marchands investissent dans la publicité et le référencement ; une fois la boutique en place, ils se retrouvent avec des sources fragmentées (réseaux sociaux, paiement, analytics génériques). Le besoin n'est pas de « plus de chiffres », mais d'un outillage qui rapproche **observation et action** sur la boutique.

### 3.3 Familles d'outils analytiques et marketing

| Famille | Exemples | Orientation |
| --- | --- | --- |
| Analytics généralistes | Google Analytics 4, Mixpanel | Mesure, segmentation, reporting |
| Heatmaps et sessions | Hotjar, Microsoft Clarity | Compréhension UX |
| Personnalisation enterprise | Dynamic Yield, Bloomreach, Optimizely | Grandes enseignes |
| Marketing automation | Klaviyo, Rebuy, Recommbee | Campagnes, CRM |

### 3.4 Comparaison synthétique avec l'existant

| Outil / famille | Rôle principal | Action rapide par produit (SKU) | Lien action → métrique | Cible typique |
| --- | --- | --- | --- | --- |
| Google Analytics 4, Mixpanel | Mesure, reporting | Non | Non | Toutes tailles |
| Hotjar, Microsoft Clarity | Heatmaps, UX | Non | Non | UX / marketing |
| Plateformes enterprise | Personnalisation, A/B | Partiel | Partiel | Grandes enseignes |
| Outils marketing (Klaviyo, etc.) | Campagnes, CRM | Indirect | Indirect | Équipes marketing |
| **Seller Helper (Vitrina Store)** | Pilotage marchand opérationnel | **Oui** (correctifs Vitrina) | **Oui** (jalons Timeline) | **Petites boutiques locales** |

Les outils existants se concentrent sur la mesure pure ou le marketing, mais laissent une lacune : un marchand seul qui doit décider rapidement quoi changer sur chaque produit, sans interprétation complexe.

### 3.5 Positionnement de la solution Seller Helper

Seller Helper ne remplace pas les solutions ci-dessus ; il les complète en se focalisant sur l'action au niveau de la boutique. Intégré à Vitrina Store, il propose des correctifs ciblés par produit, des recommandations priorisées et un suivi des effets dans le temps. Il relie visibilité et capacité à agir de manière mesurable, développée aux chapitres 5 à 13.

## Chapitre 4 : Motivations et besoins

Le projet part d'un constat fréquent sur le terrain : les e-commerçants, surtout dans les marchés émergents, investissent temps et budget (stocks, Facebook, Google, TikTok, SEO) sans outils adaptés pour mesurer, comprendre et améliorer leur site. Le taux de conversion moyen oscille souvent entre 1 % et 3 % ; la majorité des visiteurs repartent sans acheter, souvent parce que le vendeur voit peu le comportement réel.

Les solutions classiques (Google Analytics, Hotjar, etc.) restent complexes, génériques ou coûteuses pour de petites structures. Elles livrent des données brutes sans interprétation ni plan d'action clair.

Les modèles de langage récents permettent d'automatiser des analyses autrefois confiées à des consultants. Nous avons orienté le développement vers une interface simple et tournée vers l'action, pour rendre plus accessibles des pratiques e-commerce, quelle que soit la taille de la boutique.

Deux besoins principaux se dégagent : une visibilité en temps réel sur la boutique, du premier clic à la commande ; et la transformation de cette visibilité en actions concrètes, sans compétences avancées en data ou en développement.

Les sections suivantes présentent les technologies, la collecte, l'analyse par modèle de langage et l'interface Seller Helper.

`;

const CHAPITRE_5_TECHNOLOGIES = `
## Chapitre 5 : Technologies, langages et outils utilisés

Seller Helper et Vitrina Store reposent sur une application TypeScript hébergée dans le cloud, reliée à des services managés pour la base de données, l'authentification, l'e-mailing et l'analyse par modèle de langage. Nous passons ici en revue les choix technologiques et leur rôle dans le projet.

### 5.1 Principes de choix

Nous avons privilégié la maintenabilité (un seul langage côté client et serveur), un coût maîtrisé pour une boutique pilote (offres Neon et Vercel adaptées), la sécurité (authentification déléguée, secrets en variables d'environnement) et l'évolutivité (API Next.js, schéma SQL versionné, modèle de langage interchangeable).

### 5.2 Langages et frameworks applicatifs

| Composant | Technologie | Rôle dans le projet |
| --- | --- | --- |
| Langage principal | **TypeScript** | Typage statique sur tout le code applicatif et serveur ; réduction des erreurs en production. |
| Framework web | **Next.js 15** (App Router) | Pages boutique, panneau admin, routes API Seller Helper, rendu hybride serveur / client. |
| Interface utilisateur | **React 19** | Composants du Seller Helper, vitrine, formulaires et tableaux de bord. |
| Styles | **Tailwind CSS 3** | Mise en page responsive, design system partagé (panneaux, badges, graphiques). |
| Formulaires | **React Hook Form** + **Zod** | Validation des entrées admin et des sorties structurées du LLM. |
| État client | **Redux Toolkit** | État global de la boutique (panier, catalogue) en complément des hooks React. |

L'application est organisée en **monorepo** : code front et back dans le même dépôt, routes API sous le dossier applicatif Next.js, logique métier dans des modules serveur dédiés (conception, e-mail, authentification).

### 5.3 Base de données : PostgreSQL et Neon

Les événements comportementaux, alertes, recommandations, utilisateurs et catalogue sont persistés dans **PostgreSQL**.

| Élément | Détail |
| --- | --- |
| Hébergement | **Neon** — base PostgreSQL serverless, adaptée au déploiement Vercel (connexion via URL injectée : POSTGRES_URL, NEON_DATABASE_URL ou DATABASE_URL). |
| Accès données | **Drizzle ORM** — requêtes typées, schéma TypeScript aligné sur les tables SQL. |
| Migrations | Scripts SQL dans le dossier drizzle et scripts d'assurance au build (tables micro-événements, inbox, rôles e-mail, etc.). |
| Driver | **node-postgres (pg)** — connexion depuis les routes API et jobs d'analyse. |

Neon permet de **séparer** l'environnement de développement et de production, avec sauvegardes et montée en charge sans gérer un serveur PostgreSQL dédié. Les agrégations Seller Helper (funnel, timeline, heatmap) s'exécutent en SQL ou via Drizzle sur cette base unique.

### 5.4 Authentification : Better Auth et Google

L'accès au Seller Helper et à l'administration boutique est protégé par **Better Auth**, bibliothèque d'authentification intégrée à Next.js.

| Fonctionnalité | Implémentation |
| --- | --- |
| Comptes marchands | E-mail / mot de passe et **connexion Google** (OAuth 2.0 via GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET). |
| Sessions | Cookies sécurisés, plugin Next.js ; vérification du rôle **administrateur** avant exposition des données Seller Helper. |
| Persistance | Adaptateur **Drizzle** sur les tables utilisateur, session et vérification Better Auth. |

La connexion **Google** simplifie l'onboarding des marchands (un clic depuis la page de connexion). Seuls les comptes autorisés accèdent aux métriques et aux actions sensibles (analyse, envoi d'e-mails, correctifs catalogue).

### 5.5 Intelligence artificielle : Gemini et OpenRouter

L'analyse avancée (chapitre 7) s'appuie sur des **modèles de langage** accessibles par API :

| Service | Usage |
| --- | --- |
| **Google Gemini** (API Google GenAI) | Modèle principal pour générer résumé, alertes et recommandations à partir du snapshot boutique + catalogue. |
| **OpenRouter** | Passerelle alternative si Gemini est indisponible ou sans crédits ; modèle configurable par variables d'environnement. |
| **Zod** | Validation stricte du JSON renvoyé par le LLM (priorités, longueurs, champs obligatoires) avant insertion en base. |

Deux fournisseurs d'API limitent les interruptions en production tout en gardant un format de sortie uniforme pour l'interface.

### 5.6 E-mails transactionnels : Brevo

L'envoi des recommandations aux rôles marketing et support passe par **Brevo** (ex-Sendinblue), API SMTP transactionnelle.

| Aspect | Détail |
| --- | --- |
| Déclenchement | Action manuelle **Send email** sur une carte IA (pas d'envoi automatique sans validation). |
| Configuration | Clé API Brevo, expéditeur vérifié (EMAIL_FROM), modèle transactionnel optionnel. |
| Contenu | Titre, analyse, recommandation et rôle destinataire formatés pour lecture directe par l'équipe. |

Brevo a été choisi pour sa simplicité d'intégration REST, son usage courant en PME et sa compatibilité avec un volume d'e-mails modéré typique d'une boutique pilote.

### 5.7 Déploiement et hébergement : Vercel

La plateforme Vitrina Store (dont Seller Helper) est déployée sur **Vercel**, plateforme alignée sur Next.js.

| Aspect | Bénéfice |
| --- | --- |
| Build et déploiement | Pipeline lié au dépôt Git ; build Next.js avec scripts de vérification des tables avant mise en ligne. |
| Variables d'environnement | Secrets (Neon, Brevo, Google, clés LLM) configurés par environnement preview / production. |
| URL et domaine | VERCEL_URL pour les callbacks ; NEXT_PUBLIC_APP_URL pour les appels API côté client. |
| Performance | Déploiement edge / serverless des routes API ; pages statiques ou dynamiques selon le besoin. |

Vercel évite de maintenir un serveur VPS tout en offrant HTTPS, CDN et logs centralisés pour le suivi des incidents.

### 5.8 Visualisation et expérience Seller Helper

| Besoin | Technologie |
| --- | --- |
| Cartes de chaleur produit | **heatmap.js** — rendu Gaussian des clics et survols, superposé à l'aperçu fiche produit. |
| Graphiques Dashboard / Timeline | Composants **SVG** maison (courbes, barres, entonnoir) — légers, sans dépendance chart lourde. |
| Icônes et navigation | **Lucide React** |
| Carrousels recommandations Vitrina | **Swiper** |
| Notifications UI | **Sonner** / **react-hot-toast** |

### 5.9 Outils de développement et qualité

| Outil | Rôle |
| --- | --- |
| **ESLint** + config Next.js | Lint du code TypeScript / React. |
| **Drizzle Kit** | Génération et suivi des migrations schéma. |
| **tsx** | Exécution de scripts TypeScript (seed produits, simulation trafic, tests). |

### 5.10 Synthèse de l'architecture technique

Côté visiteur, la navigation sur la boutique Next.js alimente des micro-événements envoyés aux routes API puis stockés dans Neon (PostgreSQL). Côté marchand, la connexion passe par Better Auth (Google ou e-mail) pour accéder au Seller Helper. L'action Analyze now déclenche agrégation SQL, règles métier et appel Gemini ou OpenRouter, puis enregistre alertes et recommandations. Enfin, l'envoi par Brevo, le suivi dans l'Inbox et la Timeline permettent de mesurer les effets.

Les chapitres 6 et 7 détaillent la collecte et l'analyse ; les chapitres 8 à 11 décrivent l'expérience marchand dans l'application. Les figures UML du système (déploiement, classes, séquences, cas d'utilisation, activité) sont présentées au chapitre 9.

`;

const ARCHITECTURE_DIAGRAMS = `
### 9.1 Modélisation UML du système

Les schémas suivants résument l'architecture globale de Vitrina Store et Seller Helper.

#### Figure 9.1. Diagramme de déploiement

{{PLACEHOLDER:Figure 9.1 — Diagramme de déploiement (Vercel, Neon, services externes)}}

*Figure 9.1.* Le navigateur du visiteur et du marchand communique en HTTPS avec l'application Next.js hébergée sur Vercel. Les routes API et la couche serveur s'appuient sur Neon (PostgreSQL). Les services externes (Google OAuth, Gemini ou OpenRouter, Brevo, Chargily) sont appelés selon le besoin.

#### Figure 9.2. Diagramme de classes

{{PLACEHOLDER:Figure 9.2 — Diagramme de classes (couches et tables PostgreSQL)}}

*Figure 9.2.* Trois couches applicatives (présentation, API Next.js, domaine serveur) s'appuient sur les tables PostgreSQL (événements, séquences, alertes, recommandations, actions Seller Helper) et sur les services externes.

#### Figure 9.3. Diagramme de séquence

{{PLACEHOLDER:Figure 9.3 — Diagramme de séquence (visiteur, collecte, marchand, analyse, action)}}

*Figure 9.3.* Le parcours visiteur alimente la collecte ; le marchand déclenche l'analyse (règles + LLM), consulte les onglets Seller Helper et peut envoyer des e-mails, appliquer des correctifs ou gérer l'Inbox.

#### Figure 9.4. Diagramme de cas d'utilisation

{{PLACEHOLDER:Figure 9.4 — Diagramme de cas d'utilisation}}

*Figure 9.4.* Les cas d'utilisation couvrent la boutique, la collecte comportementale, le Seller Helper (analyse, recommandations, Inbox, sécurité) et les services système (règles métier, LLM, Brevo).

#### Figure 9.5. Diagramme d'activité

{{PLACEHOLDER:Figure 9.5 — Diagramme d'activité (parcours visiteur et marchand)}}

*Figure 9.5.* Deux couloirs d'activité (visiteur et marchand admin) se rejoignent sur la persistance Neon ; la boucle marchand relie consultation, analyse, action et mesure sur la Timeline.

`;

const CHAPITRE_11_INTERFACE = `
## Chapitre 11. Description des modules de l'interface

Ce chapitre détaille chaque écran : son rôle, ses éléments principaux et son apport pour la boutique.

### 11.1 Dashboard — vue d'ensemble

**Rôle.** Point d'entrée de Seller Helper : répondre à « Que se passe-t-il sur ma boutique maintenant et cette semaine ? »

**Éléments principaux.**

- Bandeau d'état (données en direct ou en attente, sessions sur quinze minutes).
- Cartes d'indicateurs : sessions sept jours, volume d'événements, visiteurs actifs, taux de conversion et évolution.
- Graphique de trafic sur vingt-quatre heures.
- Classement des pages les plus consultées.
- Répartition mobile, ordinateur, tablette.
- Renvoi vers les fiches produit les plus actives.

{{CAPTURE:Figure 11.1 — Capture d'écran, onglet Dashboard}}

**Impact.** Lecture immédiate sans export complexe ; détection rapide d'un trafic anormal ou d'une chute de conversion.

### 11.2 Timeline — suivi temporel

**Rôle.** Suivre l'évolution des métriques dans le temps, pour toute la boutique ou un produit choisi, et visualiser les actions déjà menées.

**Éléments principaux.**

- Choix de période : 24 heures, 7 jours, 30 jours.
- Métriques sélectionnables : vues, sessions, ajouts panier, ventes, taux de conversion.
- Filtre boutique entière ou produit ciblé.
- Courbes lissées avec infobulles au survol.
- Repères d'actions avec fenêtre de détail (titre, date, objectif).

{{CAPTURE:Figure 11.2 — Capture d'écran, onglet Timeline}}

**Impact.** Relier cause et effet entre une modification de vitrine et l'évolution des ventes.

### 11.3 Comportement utilisateur

**Rôle.** Montrer où les visiteurs regardent et cliquent sur les fiches produit, et comment ils avancent dans la session.

**Éléments principaux.**

- Aperçu de la page produit avec superposition colorée (vues, survols ou clics).
- Liste des pages pour choisir le produit à analyser.
- Synthèse : types de parcours, profondeur de défilement, indicateurs de session.

{{CAPTURE:Figure 11.3 — Capture d'écran, onglet Comportement utilisateur}}

**Impact.** Repositionner boutons et contenus ; augmenter les clics vers le panier sans refonte complète du site.

### 11.4 Tunnel de conversion

**Rôle.** Visualiser les pertes entre consultation produit, panier, passage au paiement et achat final.

**Éléments principaux.**

- Graphique en entonnoir avec volumes par étape.
- Taux de passage entre étapes.
- Cartes de friction lorsque le système détecte un goulet (explication et piste d'action).

{{CAPTURE:Figure 11.4 — Capture d'écran, onglet Conversion Funnel}}

**Impact.** Diagnostic lisible des abandons ; ciblage des corrections (frais de port visibles, paiement invité, formulaire mobile simplifié).

### 11.5 Recommandation Vitrina

**Rôle.** Proposer des améliorations concrètes par produit : titre, description, images, prix, stock.

**Éléments principaux.**

- Liste de suggestions par produit avec priorité et impact.
- Actions de correctif rapide ou marquage « appliqué ».
- Mise à jour après chaque analyse.

{{CAPTURE:Figure 11.5 — Capture d'écran, onglet Recommandation Vitrina}}

**Impact.** Actions opérationnelles au niveau de chaque article ; meilleure présentation catalogue et gestion des ruptures.

### 11.6 Recommandations IA

**Rôle.** Afficher les actions intelligentes encore non envoyées par e-mail.

**Éléments principaux.**

- Cartes avec priorité, recommandation actionnable, impact estimé, confiance, délai suggéré.
- Rôle destinataire (marketing ou support).
- Bouton **Send email** et panneau **Details** pour l'analyse complète.

{{CAPTURE:Figure 11.6 — Capture d'écran, onglet Recommandations IA}}

**Impact.** Plan d'action stratégique validé humainement avant communication à l'équipe.

### 11.7 Inbox

**Rôle.** Gérer les recommandations déjà communiquées : suivi d'exécution et clôture.

**Éléments principaux.**

- Filtres par rôle avec compteurs.
- Actions **Mark implemented** et **Dismiss**.
- Historique des dates d'envoi et de clôture.

{{CAPTURE:Figure 11.7 — Capture d'écran, onglet Inbox}}

**Impact.** Outil de suivi d'équipe léger ; réduction du délai entre recommandation et mise en ligne.

### 11.8 Alertes

**Rôle.** Signaler les anomalies récentes nécessitant une attention immédiate.

**Éléments principaux.**

- Liste par sévérité.
- Paramétrage des seuils (conversion, trafic, panier, erreurs, performance).
- Historique des alertes résolues avec détail (volumes, sessions concernées).

{{CAPTURE:Figure 11.8 — Capture d'écran, onglet Alertes}}

**Impact.** Réactivité pendant les campagnes ; limitation des pertes liées aux incidents techniques.

### 11.9 Sécurité

**Rôle.** Surveiller les sessions suspectes ou automatisées et documenter la fiabilité du suivi.

**Éléments principaux.**

- Synthèse des sessions à risque et motifs.
- Liste détaillée et action de remise à zéro des signaux affichés.
- Recommandations pour un suivi fiable.

{{CAPTURE:Figure 11.9 — Capture d'écran, onglet Sécurité}}

**Impact.** Confiance dans les métriques ; évitement de dépenses publicitaires sur trafic non qualifié.

`;

const CHAPITRE_CONFIDENTIALITE = `
## Chapitre 12. Confidentialité, sécurité et politiques d'usage

### 12.1 Accès réservé aux administrateurs

Le Seller Helper vérifie le rôle de l'utilisateur avant d'exposer toute donnée analytique. Un visiteur non administrateur n'accède pas aux métriques ni aux recommandations : seuls les comptes autorisés de la boutique consultent et déclenchent les actions.

### 12.2 Minimisation des données personnelles

Les micro-événements comportementaux s'appuient sur des identifiants de **session opaques**, générés aléatoirement. Aucune adresse IP, aucun nom ni e-mail n'est stocké dans ces événements. Les cartes de chaleur et les agrégats n'affichent que des **totaux par zone**, jamais une personne identifiable.

### 12.3 Réversibilité et traçabilité

Les actions du Seller Helper sont conçues pour rester **réversibles** lorsque c'est pertinent : correctifs Vitrina annulables, blocages de sessions levables, historique des alertes et recommandations conservé. Chaque mutation significative peut être reliée à un repère sur la Timeline pour audit et mesure d'impact.

### 12.4 Mutations limitées et contrôlées

L'interface ne permet pas de supprimer arbitrairement produits, commandes ou historique. Les correctifs rapides Vitrina ne modifient qu'un ensemble restreint d'attributs merchandising ; les actions sécurité se limitent au blocage ou déblocage de sessions signalées. Cette conception limite les risques d'erreur humaine tout en laissant au marchand une marge d'action opérationnelle.

### 12.5 Lien avec l'onglet Sécurité

L'onglet **Security** de l'application matérialise ces principes : synthèse des sessions suspectes, motifs d'alerte, recommandations pour préserver la **fiabilité des métriques** utilisées dans tout le reste du système (chapitre 11, section 11.9).

`;

const CHAPITRE_9_RESTITUTION_1825 = `
## Chapitre 9. Architecture de restitution et flux dans l'interface

Les chapitres 6 et 7 ont posé les étapes collecte et analyse. Le présent chapitre décrit comment les résultats sont restitués dans Seller Helper et maintenus à jour.

### 9.1 Chaîne complète en cinq temps

1. **Collecte** sur la boutique (chapitre 6).
2. **Transmission et stockage** sécurisés des événements.
3. **Analyse** par règles et LLM (chapitre 7).
4. **Restitution** dans les neuf modules de l'interface.
5. **Actualisation** continue jusqu'à la prochaine analyse.

### 9.2 Agrégation continue pour l'affichage

Même sans lancer **Analyze now**, l'interface s'appuie sur des agrégats recalculés : indicateurs du Dashboard, courbes de la Timeline, cartes de chaleur, entonnoir du Funnel. Les fenêtres temporelles (quinze minutes, vingt-quatre heures, sept jours) sont les mêmes que celles utilisées pour l'analyse, ce qui garantit la cohérence entre un graphique et une alerte.

### 9.3 Affichage et actualisation

L'interface charge en parallèle la vue d'ensemble, les alertes, les recommandations actives et la boîte de réception. Un rafraîchissement automatique (environ toutes les cinq secondes) maintient les chiffres à jour ; pendant une analyse en cours, l'actualisation est suspendue pour garantir un affichage cohérent.

`;

const CHAPITRE_9_SUITE = `
Après la collecte et l'analyse (chapitres 6 et 7), cette section explique comment les résultats s'affichent dans Seller Helper et sont maintenus à jour.

### 9.6 Chaîne complète en cinq temps

1. **Collecte** sur la boutique (chapitre 6).
2. **Transmission et stockage** sécurisés des événements.
3. **Analyse** par règles et LLM (chapitre 7).
4. **Restitution** dans les neuf modules de l'interface.
5. **Actualisation** continue jusqu'à la prochaine analyse.

### 9.7 Agrégation continue pour l'affichage

Même sans lancer **Analyze now**, l'interface s'appuie sur des agrégats recalculés, indicateurs du Dashboard, courbes de la Timeline, cartes de chaleur, entonnoir du Funnel. Les fenêtres temporelles (quinze minutes, vingt-quatre heures, sept jours) sont les mêmes que celles utilisées pour l'analyse, ce qui garantit la cohérence entre un graphique et une alerte.

### 9.8 Affichage et actualisation

L'interface charge en parallèle la vue d'ensemble, les alertes, les recommandations actives et la boîte de réception. Un rafraîchissement automatique (environ toutes les cinq secondes) maintient les chiffres à jour ; pendant une analyse en cours, l'actualisation est suspendue pour garantir un affichage cohérent.

`;

const CHAPITRE_13_IMPACTS = `
## Chapitre 13. Impacts et bénéfices pour le marchand

### 13.1 Expérience utilisateur

| Dimension | Apport |
| --- | --- |
| Simplicité | Une seule application, libellés orientés action. |
| Rapidité | Données en direct, analyse et e-mail en quelques clics. |
| Collaboration | Rôles, Inbox et e-mails pour petites équipes. |
| Pédagogie | Chaque module répond à une question métier précise. |

### 13.2 Performance commerciale

- **Conversion** : Tunnel et recommandations sur les étapes faibles.
- **Ventes** : Merchandising Vitrina et optimisation des zones cliquables.
- **Marketing** : Alertes trafic et sécurité pour un budget publicitaire mieux ciblé.
- **Réactivité** : Correctifs catalogue sans intervention développeur systématique.

### 13.3 Indicateurs de succès observables

- Amélioration des taux entre étapes du tunnel (visible sur la Timeline).
- Diminution des alertes performance et erreurs techniques.
- Taux de clôture des tâches dans l'Inbox.
- Volume de suivi stable, signe d'une boutique correctement instrumentée.

`;

function applyChapter9(tail) {
  if (process.env.REPORT_PROFILE === "1825") {
    const ch9 = findChapterIndex(tail, 9, "Architecture");
    const ch10 = findChapterIndex(tail, 10, "Workflow");
    if (ch9 < 0 || ch10 < 0) return tail;
    return tail.slice(0, ch9) + CHAPITRE_9_RESTITUTION_1825.trim() + "\n\n\n" + tail.slice(ch10);
  }
  return injectArchitectureDiagrams(tail);
}

function injectArchitectureDiagrams(tail) {
  const blockStart = tail.indexOf("### 9.1 Modélisation UML");
  if (blockStart >= 0) {
    const after = tail.slice(blockStart);
    const endRel = after.search(/\n### 9\.[678] |\n## Chapitre 10[.:] /);
    const end = endRel < 0 ? tail.length : blockStart + endRel;
    return tail.slice(0, blockStart) + ARCHITECTURE_DIAGRAMS.trim() + "\n\n\n" + tail.slice(end);
  }
  const ch9 = findChapterIndex(tail, 9, "Architecture");
  if (ch9 < 0) return tail;
  const ch10 = findChapterIndex(tail, 10, "Workflow");
  const insertAt = ch10 > ch9 ? ch10 : tail.length;
  return tail.slice(0, insertAt) + ARCHITECTURE_DIAGRAMS.trim() + "\n\n\n" + CHAPITRE_9_SUITE.trim() + "\n\n\n" + tail.slice(insertAt);
}

function ensureChapter9Suite(tail) {
  if (tail.includes("### 9.6 Chaîne complète")) return tail;
  const ch10 = findChapterIndex(tail, 10, "Workflow");
  if (ch10 < 0) return tail + CHAPITRE_9_SUITE;
  return tail.slice(0, ch10) + CHAPITRE_9_SUITE.trim() + "\n\n\n" + tail.slice(ch10);
}

function nextChapterStart(tail, afterIndex) {
  const re = /\n## Chapitre \d+[.:] /g;
  re.lastIndex = afterIndex;
  const m = re.exec(tail);
  return m ? m.index : tail.length;
}

function replaceChapter11Interface(tail) {
  const ch11 = findChapterIndex(tail, 11, "Description des modules");
  if (ch11 < 0) return tail;
  const end = nextChapterStart(tail, ch11 + 1);
  return tail.slice(0, ch11) + CHAPITRE_11_INTERFACE.trim() + "\n\n\n" + tail.slice(end);
}

function replaceChapter13Impacts(tail) {
  const ch13 = findChapterIndex(tail, 13, "Impacts");
  const ch14 = findChapterIndex(tail, 14, "Conclusion");
  if (ch13 < 0) return tail + "\n\n" + CHAPITRE_13_IMPACTS.trim();
  const end = ch14 > ch13 ? ch14 : tail.length;
  return tail.slice(0, ch13) + CHAPITRE_13_IMPACTS.trim() + "\n\n\n" + tail.slice(end);
}

function ensureClosingChapters(tail) {
  let t = tail;
  if (findChapterIndex(t, 12, "Confidentialité") < 0) {
    const ch13 = findChapterIndex(t, 13, "Impacts");
    const ch14 = findChapterIndex(t, 14, "Conclusion");
    const insertBefore = ch13 >= 0 ? ch13 : ch14 >= 0 ? ch14 : t.length;
    t =
      t.slice(0, insertBefore) +
      CHAPITRE_CONFIDENTIALITE.trim() +
      "\n\n\n" +
      t.slice(insertBefore);
  }
  if (findChapterIndex(t, 14, "Conclusion") < 0) {
    t += `\n\n## Chapitre 14. Conclusion générale

Ce projet a abouti à un système d'analyse et de recommandation pour les boutiques en ligne, déployé via Seller Helper sur Vitrina Store.

*Fin du rapport — Application Seller Helper — Vitrina Store.*

`;
  }
  return t;
}

function mergeConclusion(tail) {
  const old = tail.match(/## Chapitre 14[.:] Conclusion[\s\S]*/);
  if (!old) return tail;
  const newConclusion = `## Chapitre 14 : Conclusion générale

Ce projet a abouti à un système d'analyse et de recommandation pour les boutiques en ligne, déployé via Seller Helper sur Vitrina Store. L'essentiel ne se limite pas à l'interface : la chaîne complète — problèmes marchands, collecte ciblée, analyse par règles et par modèle de langage, restitution dans l'application et règles de confidentialité — constitue la valeur du travail.

En combinant Dashboard, Timeline, Comportement, Funnel, optimisation produit (Vitrina et correctifs rapides), recommandations IA, Inbox, alertes et sécurité, Seller Helper va au-delà de la simple visualisation de métriques pour aider le marchand à prioriser ses décisions.

Retenons notamment : une réponse coordonnée aux six freins majeurs des e-commerçants ; six groupes de signaux, chacun lié à une question commerciale ; des seuils explicables complétés par le modèle de langage ; des actions possibles depuis l'interface (correctifs Vitrina, e-mails par rôle, Inbox) ; un suivi dans le temps via la Timeline ; des politiques de confidentialité et un module Sécurité pour des métriques fiables ; enfin une chaîne technique cohérente (TypeScript, Next.js, Neon, Vercel, Better Auth, Google, Brevo).

Le travail a permis de formaliser un modèle d'événements, des règles d'alerte, un pipeline de recommandations et une interface pensée pour les micro-marchands, sur une infrastructure cloud éprouvée. Le prototype reste évolutif (montée en charge, modèles plus avancés, validation sur davantage de boutiques), mais constitue déjà une base solide pour accompagner les vendeurs en ligne.

En bref, langages, frameworks, base Neon, déploiement Vercel, authentification Google, e-mails Brevo, analyse de données et interface ont été mobilisés de façon cohérente afin d'aider le marchand à prioriser ce qu'il change sur sa boutique.

*Fin du rapport — Application Seller Helper — Vitrina Store.*

`;
  return tail.replace(old[0], newConclusion);
}

function insertConfidentialityBeforeImpacts(tail) {
  const ch12 = findChapterIndex(tail, 12, "Confidentialité");
  if (ch12 >= 0) return tail;
  const ch13 = findChapterIndex(tail, 13, "Impacts");
  if (ch13 < 0) return tail + CHAPITRE_CONFIDENTIALITE.trim();
  return tail.slice(0, ch13) + CHAPITRE_CONFIDENTIALITE.trim() + "\n\n\n" + tail.slice(ch13);
}

function main() {
  const md = fs.readFileSync(SRC, "utf8");
  const { marker, shift } = technicalStartMarker(md);
  let tail = extractTechnicalPart(md, marker, shift);
  tail = applyChapter9(tail);
  if (process.env.REPORT_PROFILE !== "1825") {
    tail = ensureChapter9Suite(tail);
  }
  tail = replaceChapter11Interface(tail);
  tail = ensureClosingChapters(tail);
  tail = dedupeConfidentialityChapter(tail);
  tail = replaceChapter13Impacts(tail);
  tail = mergeConclusion(tail);
  const full = normalizePunctuation(`${PARTIE_CADRE}\n${CHAPITRE_5_TECHNOLOGIES}\n${tail}`);
  fs.writeFileSync(OUT, full, "utf8");
  console.log("Merged report written:", OUT, "chars", full.length);

  const humanizeScript = path.join(__dirname, "humanize-report-fr.mjs");
  if (process.env.REPORT_SKIP_HUMANIZE !== "1" && fs.existsSync(humanizeScript)) {
    const humanizeArgs = [humanizeScript];
    if (process.env.REPORT_PRESERVE_CH11 === "1") humanizeArgs.push("--preserve-ch11");
    const r = spawnSync(process.execPath, humanizeArgs, { cwd: ROOT, encoding: "utf8" });
    if (r.status !== 0) {
      console.warn("Humanize skipped or failed:", r.stderr || r.stdout);
    }
  }
}

main();
