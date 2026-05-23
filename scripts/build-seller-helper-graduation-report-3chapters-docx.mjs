/**
 * Restructure Seller-Helper-Graduation-Report.md into 3 chapters + preliminary pages,
 * enrich with code-derived technical inserts, emit Markdown + DOCX.
 *
 *   node scripts/build-seller-helper-graduation-report-3chapters-docx.mjs
 *
 * Outputs:
 *   reports/Seller-Helper-Graduation-Report-3Chapters.md
 *   reports/Seller-Helper-Graduation-Report-3Chapters.docx
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  buildAcademicCoverHtml,
  escapeHtml,
  HTML_TO_DOCX_OPTIONS,
  markdownToPitchDocxHtml,
  wrapPitchDocxDocument,
} from "./lib/seller-helper-docx-pitch-theme.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SRC_MD = path.join(ROOT, "reports", "Seller-Helper-Graduation-Report.md");
const OUT_MD = path.join(ROOT, "reports", "Seller-Helper-Graduation-Report-3Chapters.md");
const OUT_DOCX = path.join(ROOT, "reports", "Seller-Helper-Graduation-Report-3Chapters.docx");

const META = {
  university: "Université des Sciences et de la Technologie Houari Boumediène (USTHB)",
  faculty: "Faculté d'Informatique",
  title: "Seller Helper — Decision Support & Analytics Engine for E-Commerce Platforms",
  subtitle:
    "Conception et déploiement d'un compagnon d'aide à la décision pour les petits marchands en ligne — plateforme Vitrina Store",
  authors: ["Vada Abderrahmani — Chef de projet", "Équipe graduation Vitrina Store"],
  academicYear: "Année universitaire 2025 / 2026",
};

const CODE_ENRICHMENTS = {
  ch2_architecture: `
### Enrichissement technique (code source — mai 2026)

Le dépôt de production n'utilise pas MongoDB ni Redis pour la télémétrie Seller Helper : le modèle est **PostgreSQL 14+** avec **Drizzle ORM** et **Next.js 15 (App Router)**. Les événements storefront sont normalisés dans \`sales_micro_event\` ; les actions appliquées dans \`seller_helper_applied_action\`.

\`\`\`ts
// src/server/conception/event-contract.ts — contrat d'événements canonique
export const STORE_EVENT = {
  productView: "pa_product_view",
  addToCart: "pa_add_to_cart",
  beginCheckout: "pa_begin_checkout",
  purchase: "pa_purchase",
  globalContext: "pa_global_context",
  pagePerformance: "pa_performance",
} as const;
\`\`\`

Ingestion : POST vers l'API storefront (whitelist \`pa-whitelist.ts\`), validation **Zod**, persistance via Drizzle. Chaque ligne porte un \`session_key\` anonyme (sessionStorage), un \`product_local_id\` optionnel et un \`payload_json\` flexible — base unique des agrégations Dashboard, Funnel, Behavior et Vitrina.

**Patron applicatif :** MVC adapté à Next.js — routes \`src/app/api/**\`, logique métier \`src/server/**\`, UI admin \`src/components/SellerHelper/**\`. Le cache catalogue repose sur \`revalidatePath\` après chaque quick fix (pas de couche Redis dédiée dans ce module).
`,
  ch2_modules: `
### Enrichissement — les huit modules de la console (navigation live)

La barre d'onglets est définie dans \`src/components/SellerHelper/nav.ts\` :

| Onglet (code) | Label UI | Rôle |
| --- | --- | --- |
| Dashboard | Overview | Trafic, appareils, pages fortes |
| Conversion Funnel | Funnel | Fuites view → panier → paiement |
| User Behavior | Behavior | Heatmaps, sources, scroll |
| Vitrina Recommendation | Vitrina | Correctifs catalogue par produit |
| AI Recommendations | AI | Actions priorisées (LLM borné) |
| Inbox | Inbox | Recommandations par rôle (e-mail) |
| Timeline | Timeline | Métriques + checkpoints d'actions |
| Security | Security | Sessions suspectes, blocage |
| Alerts | Alerts | Incidents actifs / résolus |

Chaque onglet consomme ou écrit le même flux d'événements ; les onglets « écriture » (Vitrina, Alerts, Security) alimentent le journal d'actions rejoué sur la Timeline.
`,
  ch2_vitrina: `
### Enrichissement — Vitrina, quick fixes et boucle fermée (évolutions code 2026)

**Moteur heuristique + LLM :** \`product-marketing-recommendations.ts\` calcule signaux (vues, view-to-cart, couleurs/tailles sélectionnées, interactions reviews) puis propose des tips ; \`apply-vitrina-quick-fixes.ts\` applique les mutations.

**Correctif « Quality & reviews concern » (\`quality_highlight\`) :** seul ce quick fix (appliqué explicitement par le marchand) peut afficher la **bannière hero** avec la meilleure review vérifiée. Le texte est persisté sous la clé \`Merch: Hero review\` dans \`additionalInfo\` (description structurée produit). Il n'y a **plus d'injection automatique** de bandeau depuis les reviews en base sur le storefront — suppression de \`withLiveHeroReviewSnippetsFromDatabase\` et de l'API \`/api/catalog/merchandising\`.

\`\`\`ts
// apply-vitrina-quick-fixes.ts — extrait quality_highlight
if (fix.id === "quality_highlight") {
  nextAdditionalInfo = upsertAdditionalInfo(nextAdditionalInfo, "Quality", ratingLabel);
  const heroSnippet = await heroSnippetFromBestVerifiedReview(product.id, product.title);
  if (heroSnippet) {
    nextAdditionalInfo = upsertAdditionalInfo(nextAdditionalInfo, "Merch: Hero review", heroSnippet);
  }
  delete nextContent.suppressLiveHeroReviewOverlay;
}
\`\`\`

**Paramètre « fixes per product » (1–6) :** \`src/lib/vitrina-fixes-per-item.ts\` — \`MIN=1\`, \`MAX=6\`, \`DEFAULT=2\` ; exposé dans l'UI \`VitrinaFixesPerItemSetting.tsx\` et propagé aux API analyze / recommendations.

**Réversibilité :** \`resetAllVitrinaCatalogToDefaultSilent()\` restaure les chokepoints (\`vitrina-chokepoint.ts\`) ou strip les champs Vitrina, puis \`finalizeDescriptionAfterVitrinaCatalogReset()\` supprime les lignes merch et pose \`suppressLiveHeroReviewOverlay\` pour empêcher tout bandeau résiduel.
`,
  ch2_economy: `
### Enrichissement — multi-tenant et modèle économique (alignement code + pitch)

- **Single-tenant aujourd'hui**, évolution documentée : colonne \`store_id\` sur \`sales_micro_event\` et catalogue (§6.7 du manuscrit).
- **Tiers produit** (pitch deck) : inclus plateforme → Pro (quick fixes illimités, Timeline) → agence / white-label multi-boutiques.
- **Coût LLM maîtrisé :** appels Gemini uniquement sur « Analyze now » et génération Vitrina, snapshot JSON **borné** (\`llm-catalog-snapshot.ts\`), empreintes idempotentes sur recommandations.
`,
  ch3_tests: `
### Enrichissement — tests et sécurité (stack réelle du dépôt)

Le projet ne contient pas de suite **Pytest** (stack TypeScript). La validation repose sur :

| Couche | Mécanisme | Exemples dans le dépôt |
| --- | --- | --- |
| Statique | \`tsc --noEmit\`, ESLint | CI locale, Table 7.2 |
| Données | Scripts idempotents \`db:ensure-*\` | \`ensure-sales-micro-event-table.mjs\`, \`ensure-seller-helper-applied-action.mjs\` |
| Trafic simulé | \`db:simulate-traffic\`, \`db:bulk-7d-activity\` | Jeux de test 7 j / 10k événements |
| Fonctionnel | Matrice F1–F15 (Table 7.1) | Scénarios manuels Seller Helper |
| Sécurité | Better Auth + rôle admin | Chaque route \`/api/admin/conception/*\` |
| Confidentialité | \`session_key\` masqué UI | Pas d'IP en payload |

\`\`\`ts
// Sécurité session — blocage storefront
// src/server/conception/apply-security-quick-fixes.ts → conception_security_block
// Middleware refuse les session_key bloquées avant tout handler.
\`\`\`
`,
  ch3_kpi: `
### Enrichissement — protocole KPI uplift 7 jours

\`action-conversion-impact.ts\` calcule l'impact post-action (fenêtre minimale 15 min) : comparaison des métriques **avant / après** chaque checkpoint Timeline pour les quick fixes Vitrina. Protocole pilote : **+1,4 pt** view-to-cart (hero review) et **+0,9 pt** (default color) sur 72 h — à replacer par mesures terrain quand les pilotes scale.
`,
};

const INTRO_GENERALE = `
Ce document reprend **intégralement** le manuscrit de graduation *Seller Helper — A Smart Decision-Support Companion for Small E-commerce Sellers*, réorganisé en **trois chapitres** pour la soutenance et enrichi par les **fonctionnalités livrées dans le code** jusqu'en mai 2026 (Vitrina, bannière review conditionnelle, slider fixes/produit, reset catalogue, etc.). Aucun paragraphe du rapport d'origine n'est supprimé : il est **reclassé** sous les sections ci-dessous.

### Contexte

**Vitrina Store** est une vitrine Next.js déployée en production (catalogue, panier, Chargily, avis, tracking). Les petits marchands **PME**, souvent **mobile-first** en **Afrique du Nord / MENA**, n'ont pas d'équipe data : ils subissent une **surcharge de métriques** (GA4, réseaux sociaux) sans couche « que faire maintenant ».

### Objectifs du document

- **Applicatifs :** boucle **Observe → Recommend → Apply → Measure** sur \`/seller-helper\`.
- **Analytiques :** funnel, heatmaps, alertes déterministes, IA bornée.
- **Sécuritaires :** sessions suspectes, journal d'actions, réversibilité des quick fixes.

### Organisation

- **Chapitre 1** — Problème, marché, besoins fonctionnels (anc. ch. 1–3).
- **Chapitre 2** — Architecture, huit modules, moteur Vitrina/IA (anc. ch. 4–5 + code).
- **Chapitre 3** — Implémentation, tests, KPI (anc. ch. 6–8).
- **Conclusion** — Bilan, feuille de route 18 mois (anc. ch. 9–10).
- **Annexes & bibliographie** — Intégrales (anc. ch. 11–12).
`;

function splitSource(md) {
  const chunks = md.split(/\n(?=## Chapter \d+)/);
  const preamble = chunks[0].trim();
  const chapters = {};
  for (const chunk of chunks.slice(1)) {
    const m = chunk.match(/^## Chapter (\d+)\s*—\s*(.+)/);
    if (m) chapters[m[1]] = { title: m[2].trim(), body: chunk.trim() };
  }
  return { preamble, chapters };
}

function stripChapterHeading(body) {
  return body.replace(/^## Chapter \d+\s*—[^\n]*\n+/, "");
}

function buildComposedMarkdown({ preamble, chapters }) {
  const remerciements = preamble.match(/## Remerciements[\s\S]*?(?=\n## |\n---|$)/)?.[0] ?? "";
  const resume = preamble.match(/## Résumé[\s\S]*?(?=\n## |\n---|$)/)?.[0] ?? "";
  const resumeEnriched = resume.replace(
    /The defining contribution/,
    "La contribution centrale — **boucle fermée Observe → Recommend → Apply → Measure** — est que chaque action appliquée est journalisée et rejouée comme **checkpoint** sur la Timeline, sur la métrique visée. The defining contribution"
  );

  const ch = (n) => chapters[String(n)]?.body ?? "";

  return `**Rapport de fin d'études restructuré (3 chapitres)**  
${META.university} · ${META.faculty}  
${META.academicYear}

---

<!-- PAGE_BREAK:remerciements -->

${remerciements || "## Remerciements\n\n*(voir manuscrit d'origine)*"}

---

<!-- PAGE_BREAK:resume -->

${resumeEnriched || "## Résumé / Abstract\n\n*(voir manuscrit d'origine)*"}

---

<!-- PAGE_BREAK:toc -->

## Table des matières

1. Introduction générale  
2. **Chapitre 1** — Analyse du problème, spécifications fonctionnelles et positionnement marché  
   - 1.1 Problématique de l'e-commerce moderne  
   - 1.2 Analyse comparative  
   - 1.3 Étude de marché et vecteur d'ancrage  
   - *Contenu intégral des anciens chapitres 1, 2 et 3*  
3. **Chapitre 2** — Architecture technique, conception du système et moteur de recommandations  
   - 2.1 Architecture globale et modèle de données  
   - 2.2 Spécifications des huit modules de la console  
   - 2.3 Moteur de recommandations et couche d'actions  
   - 2.4 Architecture multi-tenant et modèle économique  
   - *Contenu intégral des anciens chapitres 4 et 5*  
4. **Chapitre 3** — Implémentation, pipeline de tests et validation métrique  
   - 3.1 État de l'implémentation  
   - 3.2 Tests, sécurité et confidentialité  
   - 3.3 Validation des KPI  
   - *Contenu intégral des anciens chapitres 6, 7 et 8*  
5. Conclusion générale (*anciens chapitres 9 et 10*)  
6. Annexes et bibliographie (*anciens chapitres 11 et 12*)

---

<!-- PAGE_BREAK:intro -->

# Introduction générale

${INTRO_GENERALE.trim()}

---

# Chapitre 1 — Analyse du problème, spécifications fonctionnelles et positionnement marché

## 1.1 Problématique de l'e-commerce moderne (cadrage)

La montée du **CAC**, la **fatigue des dashboards** et l'absence d'actions réversibles sur les outils descriptifs (GA4, Hotjar) constituent le cœur du problème traité par Seller Helper. Le marchand non technique a besoin de **trois actions claires**, pas de cinquante graphiques.

> *Synthèse :* voir ci-dessous le **Chapitre 1 (Introduction Générale)** et les **§2.1–2.3** du manuscrit pour l'argumentation complète (long tail, mobile-first, persona Yasmine).

## 1.2 Analyse comparative (cadrage)

Positionnement vs GA4, Hotjar, suites enterprise (Dynamic Yield, Bloomreach), Shopify Magic — colonne décisive : **boucle fermée** (Table 2.1).

## 1.3 Étude de marché et vecteur d'ancrage (cadrage)

TAM global e-commerce ; SAM = **solo-marchands / PME** MENA ; beachhead = **Vitrina Store** embarqué puis module exportable.

---

## Contenu intégral — Ancien chapitre 1 : Introduction Générale

${stripChapterHeading(ch("1"))}

---

## Contenu intégral — Ancien chapitre 2 : Étude et Analyse de l'Existant

${stripChapterHeading(ch("2"))}

---

## Contenu intégral — Ancien chapitre 3 : Analyse des Besoins

${stripChapterHeading(ch("3"))}

---

# Chapitre 2 — Architecture technique, conception du système et moteur de recommandations

## 2.1 Architecture globale et modèle de données (cadrage)

Patron **Next.js + PostgreSQL + Drizzle** ; flux événements → agrégations SQL ; pas de micro-service analytics séparé (coût zéro add-on).

${CODE_ENRICHMENTS.ch2_architecture.trim()}

## 2.2 Spécifications des huit modules de la console (cadrage)

${CODE_ENRICHMENTS.ch2_modules.trim()}

## 2.3 Moteur de recommandations et couche d'actions (cadrage)

Règles d'alertes déterministes + LLM JSON strict + quick fixes catalogue réversibles + Timeline.

${CODE_ENRICHMENTS.ch2_vitrina.trim()}

## 2.4 Architecture multi-tenant et modèle économique (cadrage)

${CODE_ENRICHMENTS.ch2_economy.trim()}

---

## Contenu intégral — Ancien chapitre 4 : Conception du Système

${stripChapterHeading(ch("4"))}

---

## Contenu intégral — Ancien chapitre 5 : Implémentation et Réalisation

${stripChapterHeading(ch("5"))}

---

# Chapitre 3 — Implémentation, pipeline de tests et validation métrique

## 3.1 État de l'implémentation technologique (cadrage)

Module **en production** sur Vitrina Store : pipeline micro-événements, onglets Seller Helper, quick fixes, revalidation storefront.

## 3.2 Pipeline de tests, sécurité et confidentialité (cadrage)

${CODE_ENRICHMENTS.ch3_tests.trim()}

## 3.3 Validation des indicateurs de performance (cadrage)

${CODE_ENRICHMENTS.ch3_kpi.trim()}

---

## Contenu intégral — Ancien chapitre 6 : Sécurité et Optimisation

${stripChapterHeading(ch("6"))}

---

## Contenu intégral — Ancien chapitre 7 : Tests et Validation

${stripChapterHeading(ch("7"))}

---

## Contenu intégral — Ancien chapitre 8 : Résultats et Discussion

${stripChapterHeading(ch("8"))}

---

# Conclusion générale

## Bilan et feuille de route (cadrage)

Synthèse des objectifs O1–O8 atteints ; extensions **multi-boutiques**, **mobile companion**, **Experiments / A/B**, impact **ARPU** plateforme — détaillées dans le chapitre Perspectives ci-dessous.

---

## Contenu intégral — Ancien chapitre 9 : Conclusion Générale

${stripChapterHeading(ch("9"))}

---

## Contenu intégral — Ancien chapitre 10 : Perspectives Futures (feuille de route 18 mois)

${stripChapterHeading(ch("10"))}

---

## Contenu intégral — Ancien chapitre 11 : Annexes

${stripChapterHeading(ch("11"))}

---

## Contenu intégral — Ancien chapitre 12 : Bibliographie

${stripChapterHeading(ch("12"))}

---

*Fin du document restructuré — généré le ${new Date().toISOString().slice(0, 10)} depuis \`Seller-Helper-Graduation-Report.md\` + extraits code.*
`;
}

async function main() {
  if (!fs.existsSync(SRC_MD)) {
    console.error("Source introuvable:", SRC_MD);
    process.exit(1);
  }

  const source = fs.readFileSync(SRC_MD, "utf8");
  const composed = buildComposedMarkdown(splitSource(source));
  fs.writeFileSync(OUT_MD, composed, "utf8");
  console.log("Markdown:", OUT_MD);

  const coverHtml = buildAcademicCoverHtml({
    ...META,
    framework: "Projet de fin d'études — Vitrina Store",
  });
  const bodyHtml = markdownToPitchDocxHtml(composed);
  const html = wrapPitchDocxDocument({
    title: META.title,
    coverHtml,
    bodyHtml,
  });

  let HTMLtoDOCX;
  try {
    HTMLtoDOCX = (await import("html-to-docx")).default;
  } catch {
    console.error("Installez: npm install html-to-docx --save-dev");
    process.exit(1);
  }

  const buffer = await HTMLtoDOCX(html, null, HTML_TO_DOCX_OPTIONS);

  fs.writeFileSync(OUT_DOCX, buffer);
  console.log("DOCX:", OUT_DOCX);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
