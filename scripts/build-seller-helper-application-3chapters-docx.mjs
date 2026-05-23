/**
 * Réorganisation pure du rapport application (14 chapitres → 3 + intro + conclusion).
 * Aucune suppression de contenu : les anciens chapitres deviennent des sections (###).
 * Source : reports/Seller-Helper-Application-Documentation-fr.md
 */

import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { prepareDocxHtml } from "./prepare-docx-html-fr.mjs";
import { restartDocxPageNumbersAtIntroduction } from "./lib/docx-page-number-from-intro.mjs";
import {
  removeEmDashes,
  formatTocLine,
  estimateTocPageMap,
  pageFor,
} from "./lib/report-toc-pages-fr.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SRC_MD = path.join(ROOT, "reports", "Seller-Helper-Application-Documentation-fr.md");
const OUT_MD = path.join(ROOT, "reports", "Seller-Helper-Application-Documentation-3Chapters-fr.md");
const OUT_HTML = path.join(ROOT, "reports", "Seller-Helper-Application-Documentation-3Chapters-fr.html");
const OUT_DOCX = path.join(ROOT, "reports", "Seller-Helper-Application-Documentation-3Chapters-fr.docx");

/** Ajouts code mai 2026 — compléments en fin de section. */
const ENRICH_BY_OLD_CH = {
  7: `
#### Complément — validation Zod des sorties LLM (implémentation)

Le module \`src/server/conception/llm-analysis.ts\` définit \`llmAnalysisSchema\` (Zod) : \`summary\`, jusqu'à six \`alerts\`, huit \`recommendations\` avec sévérités/priorités bornées. \`parseAnalysisJson\` extrait le JSON (\`extractJsonObject\`), normalise les champs, puis \`safeParse\` — en cas d'échec, aucune persistance partielle. Snapshot utilisateur borné via \`llm-catalog-snapshot.ts\` et télémetrie Neon.
`,
  10: `
#### Complément — boucle fermée et journalisation des actions

Chaque action marchand significative peut être persistée dans \`seller_helper_applied_action\` via \`logAppliedAction()\` (écriture best-effort). Types (\`AppliedActionKind\`) : \`vitrina_quick_fix\`, \`security_block\`, \`security_unblock\`, \`alert_resolved\`, \`ai_recommendation\`. Les checkpoints alimentent les graphiques Timeline (\`timeline-series.ts\`, \`listAppliedActionsInRange\`) et le panneau **Activity log**.
`,
  11: `
#### Complément — Activity log sur l'onglet Timeline (mai 2026)

Le composant \`TimelineLogsSection.tsx\` liste les actions de la fenêtre temporelle : titre, type coloré (\`APPLIED_ACTION_KIND_META\`), produit, horodatage, résumé. Badge **conversion** (\`computeAppliedActionConversionImpact\`) : delta view→purchase (fenêtre min. 15 min). Actions : **Details** (\`AppliedActionDetailsModal\`), **Revert to chokepoint**, **Reset to default**, **Email revert request** (Brevo).

#### Complément — correctifs Vitrina et réinitialisation catalogue

\`apply-vitrina-quick-fixes.ts\` : \`default_color\`, \`default_size\`, \`promo_price\`, \`availability_note\`, \`quality_highlight\`, \`trending_countdown\`, \`promo_catalog_boost\`. Chaque application sauvegarde un chokepoint (\`jomlaPrice\`, \`description\`) puis \`logAppliedAction({ kind: "vitrina_quick_fix" })\`.

**Quality & reviews** : \`quality_highlight\` écrit \`Quality\` + \`Merch: Hero review\` depuis le meilleur avis vérifié ; bannière vitrine **uniquement** après ce correctif (\`finalizeDescriptionAfterVitrinaCatalogReset\`, \`suppressLiveHeroReviewOverlay\`).

**Reset catalogue** : \`resetAllVitrinaCatalogToDefaultSilent()\`, bouton *Reset all Vitrina changes* (\`vitrina-recommendations.tsx\`). **Réglage** : \`VitrinaFixesPerItemSetting\` (1–6 correctifs par produit).
`,
  12: `
#### Complément — capacités de réversion par type d'action

\`applied-actions.ts\` expose \`canRevertToChokepoint\`, \`canResetToDefault\`, \`canRequestRevertEmail\` selon le \`kind\` et le mode (\`chokepoint\` / \`reset_default\`). Les correctifs Vitrina conservent un snapshot JSON avant mutation ; la sécurité reste réversible via chokepoint.
`,
};

/** Titre d'un ancien chapitre sans le préfixe « Chapitre N. », ex. « Problématique ». */
function chapterTitleOnly(body) {
  const m = (body ?? "").match(/^## Chapitre \d+\.\s*(.+)\s*$/m);
  return m ? m[1].trim() : "";
}

function stripChapterHeader(body) {
  return (body ?? "").replace(/^## Chapitre \d+\.\s*[^\n]+\n+/, "").trim();
}

function extractSubchapter(body, num) {
  const b = stripChapterHeader(body);
  const re = new RegExp(`### ${num}\\.\\d+[^\\n]*[\\s\\S]*?(?=\\n### ${num}\\.\\d+|\\n### [^\\n]+|$)`);
  const all = [...b.matchAll(new RegExp(`### ${num}\\.(\\d+)\\s+([^\\n]+)`, "g"))];
  if (num === 1) {
    const intro = b.match(/### 1\.1 Introduction[\s\S]*?(?=### 1\.2|$)/)?.[0] ?? "";
    const ctx = b.match(/### 1\.2 Contexte[\s\S]*?(?=### 1\.3|$)/)?.[0] ?? "";
    const obj = b.match(/### 1\.3 Objectifs du rapport[\s\S]*?(?=### |$)/)?.[0] ?? "";
    return { intro, ctx, obj };
  }
  return b;
}

function normalizeMd(md) {
  return (md ?? "").replace(/\r\n/g, "\n");
}

function oldChapterNum(body) {
  const m = (body ?? "").match(/^## Chapitre (\d+)\./);
  return m ? Number(m[1]) : null;
}

/**
 * Corps d'une section : renumérote les sous-titres N.x de l'ancien chapitre
 * vers sectionIndex.x (Section 1 → 1.1, 1.2 · Section 2 → 2.1, 2.2 · …).
 */
function asSectionContent(body, sectionIndex) {
  const oldNum = oldChapterNum(body);
  let text = normalizeMd(stripChapterHeader(body));

  if (oldNum == null) {
    return text.trim();
  }

  const lines = text.split("\n");
  text = lines
    .map((line) => {
      const sub = line.match(new RegExp(`^### ${oldNum}\\.(\\d+)\\s+(.+)$`));
      if (sub) {
        return `#### ${sectionIndex}.${sub[1]} ${sub[2].trim()}`;
      }
      const fig = line.match(new RegExp(`^(####) Figure ${oldNum}\\.(\\d+)(.*)$`));
      if (fig) {
        return `${fig[1]} Figure ${sectionIndex}.${fig[2]}${fig[3]}`;
      }
      return line;
    })
    .join("\n");

  return text.trim();
}

/** Section numérotée sous un chapitre ; le titre reprend celui de l'ancien chapitre fusionné. */
function asSection(sectionIndex, body, oldChapterNum = null) {
  const title = chapterTitleOnly(body);
  const label = title ? `${sectionIndex} ${title}` : `${sectionIndex}`;
  let content = asSectionContent(body, sectionIndex);
  const extra =
    oldChapterNum != null ? ENRICH_BY_OLD_CH[String(oldChapterNum)] ?? "" : "";
  if (extra.trim()) content = `${content}\n\n${extra.trim()}`;
  return `### ${label}\n\n${content}`;
}

function sectionLabel(bodies, index) {
  const t = chapterTitleOnly(bodies[index]);
  return t ? `${index + 1} ${t}` : `${index + 1}`;
}

function tocSectionsWithPages(bodies, pageMap) {
  return bodies
    .map((b, i) => {
      const label = sectionLabel(bodies, i);
      return formatTocLine(label, pageFor(pageMap, label));
    })
    .join("\n");
}

function splitChapters(md) {
  const preambleEnd = md.search(/^## Chapitre 1\./m);
  const preamble = preambleEnd >= 0 ? md.slice(0, preambleEnd).trim() : "";
  const tail = preambleEnd >= 0 ? md.slice(preambleEnd) : md;
  const chapters = {};
  for (const block of tail.split(/(?=^## Chapitre \d+\.)/m)) {
    const m = block.match(/^## Chapitre (\d+)\./);
    if (m) chapters[m[1]] = block.trim();
  }
  return { preamble, chapters };
}

function extractPreamblePart(preamble, heading) {
  const re = new RegExp(`## ${heading}[\\s\\S]*?(?=\\n## |$)`);
  const block = preamble.match(re)?.[0] ?? "";
  return block.replace(new RegExp(`^## ${heading}\\s*\\n+`, "m"), "").trim();
}

function stripSubheading(md, pattern) {
  return md.replace(new RegExp(`^### ${pattern}[^\\n]*\\n+`, "m"), "").trim();
}

function buildComposedMd({ preamble, chapters }) {
  const ch = (n) => chapters[String(n)] ?? "";
  const old1 = ch("1");
  const { intro, ctx, obj } = extractSubchapter(old1, 1);
  const introBody = stripSubheading(intro, "1\\.1 Introduction");
  const ctxBody = stripSubheading(ctx, "1\\.2 Contexte");
  const objBody = stripSubheading(obj, "1\\.3 Objectifs du rapport");

  const remerciements = extractPreamblePart(preamble, "Remerciements");
  const resume = extractPreamblePart(preamble, "Résumé");

  const ch1OldNums = [2, 3, 4];
  const ch2OldNums = [6, 7, 8, 9, 10, 11, 12, 13];
  const ch1Bodies = ch1OldNums.map((n) => ch(String(n)));
  const ch2Bodies = ch2OldNums.map((n) => ch(String(n)));
  const ch3TechBody = ch("5");

  const ch3Title = "Chapitre 3 — Développement et déploiement";
  const ch3TechSectionLabel = sectionLabel([ch3TechBody], 0);

  const numberedBody = `<!-- PAGE_NUMBER_START -->

## Introduction générale

${introBody}

### Contexte

${ctxBody}

### Objectif du document

${objBody}

<!-- PAGE_BREAK -->

## Chapitre 1

${ch1Bodies.map((b, i) => asSection(i + 1, b, ch1OldNums[i])).join("\n\n")}

<!-- PAGE_BREAK -->

## Chapitre 2

${ch2Bodies.map((b, i) => asSection(i + 1, b, ch2OldNums[i])).join("\n\n")}

<!-- PAGE_BREAK -->

## ${ch3Title}

${asSection(1, ch3TechBody, 5)}

<!-- PAGE_BREAK -->

## Conclusion générale

${asSectionContent(ch("14")).replace(/\*Fin du rapport[^*]*\*/i, "").trim()}
`;

  const pageMap = estimateTocPageMap(numberedBody);
  const tocCh1 = tocSectionsWithPages(ch1Bodies, pageMap);
  const tocCh2 = tocSectionsWithPages(ch2Bodies, pageMap);

  const tocIntro = [
    formatTocLine("Introduction générale", pageFor(pageMap, "Introduction générale")),
    formatTocLine("Contexte", pageFor(pageMap, "Contexte")),
    formatTocLine("Objectif du document", pageFor(pageMap, "Objectif du document")),
  ].join("\n");

  const tocCh3 = formatTocLine(ch3TechSectionLabel, pageFor(pageMap, ch3TechSectionLabel));

  const tocConclusion = formatTocLine(
    "Conclusion générale",
    pageFor(pageMap, "Conclusion générale")
  );

  const composed = `## Remerciements

${remerciements}

<!-- PAGE_BREAK -->

## Résumé

${resume}

<!-- PAGE_BREAK -->

## Table des matières

**Introduction générale**
${tocIntro}

**Chapitre 1**
${tocCh1}

**Chapitre 2**
${tocCh2}

**Chapitre 3**
${tocCh3}

**Conclusion générale**
${tocConclusion}

<!-- PAGE_BREAK -->

${numberedBody}
`;

  return removeEmDashes(composed);
}

function buildHtmlFromMd(mdPath, htmlPath) {
  const r = spawnSync(
    process.execPath,
    [
      path.join(ROOT, "scripts", "build-seller-helper-graduation-report-fr.mjs"),
      "--application",
      "--with-code",
      `--src=${mdPath}`,
      `--out-html=${htmlPath}`,
    ],
    { cwd: ROOT, encoding: "utf8" }
  );
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout);
    process.exit(r.status ?? 1);
  }
}

async function buildDocx(htmlPath, docxPath, mdWordCount) {
  const html = fs.readFileSync(htmlPath, "utf8");
  const bodyMatch = html.match(/<main class="body">([\s\S]*)<\/main>/i);
  const coverMatch = html.match(/<section class="cover">([\s\S]*?)<\/section>/i);
  const rawFragment = `${coverMatch ? coverMatch[0] : ""}${bodyMatch ? `<main class="body">${bodyMatch[1]}</main>` : ""}`;
  const docBody = prepareDocxHtml(rawFragment);

  const fragWords = docBody.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
  if (fragWords < mdWordCount * 0.65) {
    console.warn(`Attention: DOCX ~${fragWords} mots vs MD ~${mdWordCount} mots`);
  }

  const HTMLtoDOCX = (await import("html-to-docx")).default;
  const buffer = await HTMLtoDOCX(docBody, null, {
    orientation: "portrait",
    pageSize: { width: 11906, height: 16838 },
    title: "Système Intelligent d'Analyse et de Recommandation pour les Sites E-Commerce",
    subject: "Seller Helper - documentation 3 chapitres",
    creator: "Vitrina Store",
    lang: "fr-FR",
    table: { row: { cantSplit: true } },
    header: false,
    footer: true,
    pageNumber: true,
    skipFirstHeaderFooter: true,
    font: "Cambria",
    fontSize: 20,
    margins: { top: 1440, right: 1440, bottom: 1440, left: 1440, header: 0, footer: 0, gutter: 0 },
  });

  let out = buffer;
  try {
    out = await restartDocxPageNumbersAtIntroduction(buffer);
  } catch (err) {
    console.warn("Numérotation depuis Introduction :", err.message);
  }

  try {
    fs.writeFileSync(docxPath, out);
  } catch (err) {
    if (err?.code === "EBUSY") {
      const alt = docxPath.replace(/\.docx$/i, "-restored.docx");
      fs.writeFileSync(alt, out);
      console.warn("DOCX verrouillé ; écriture alternative :", alt);
      return alt;
    }
    throw err;
  }
  return docxPath;
}

async function main() {
  if (!fs.existsSync(SRC_MD)) {
    console.error("Source introuvable:", SRC_MD);
    process.exit(1);
  }

  const source = fs.readFileSync(SRC_MD, "utf8");
  const composed = buildComposedMd(splitChapters(source));
  fs.writeFileSync(OUT_MD, composed, "utf8");

  const srcWords = source.split(/\s+/).filter(Boolean).length;
  const mdWords = composed.split(/\s+/).filter(Boolean).length;
  console.log("Markdown:", OUT_MD);
  console.log(`Mots: source ~${srcWords} → restructuré ~${mdWords} (contenu conservé + ch. 3)`);

  buildHtmlFromMd(OUT_MD, OUT_HTML);
  console.log("HTML:", OUT_HTML);

  const writtenDocx = await buildDocx(OUT_HTML, OUT_DOCX, mdWords);
  console.log("DOCX:", writtenDocx);

  const dl = path.join(
    process.env.USERPROFILE || process.env.HOME || "",
    "Downloads",
    path.basename(writtenDocx)
  );
  try {
    fs.copyFileSync(writtenDocx, dl);
    console.log("Copie:", dl);
  } catch {
    /* ignore */
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
