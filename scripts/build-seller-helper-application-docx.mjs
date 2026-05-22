/**

 * Génère le rapport application en DOCX.

 *

 *   node scripts/build-seller-helper-application-docx.mjs           (contenu source)

 *   node scripts/build-seller-helper-application-docx.mjs --humanized (même contenu, texte humanisé)

 *

 * Sorties :

 *   reports/Seller-Helper-Application-Documentation-fr.docx

 *   reports/Seller-Helper-Application-Documentation-fr-humanized.docx  (avec --humanized)

 */



import fs from "fs";

import path from "path";

import { spawnSync } from "child_process";

import { fileURLToPath } from "url";

import { prepareDocxHtml } from "./prepare-docx-html-fr.mjs";

import { verifyApplicationReportContent } from "./verify-application-report-content.mjs";

import { humanize } from "./humanize-report-fr.mjs";



const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ROOT = path.join(__dirname, "..");

const MD = path.join(ROOT, "reports", "Seller-Helper-Application-Documentation-fr.md");

const HTML = path.join(ROOT, "reports", "Seller-Helper-Application-Documentation-fr.html");

const DOCX = path.join(ROOT, "reports", "Seller-Helper-Application-Documentation-fr.docx");

const MD_HUMANIZED = path.join(
  ROOT,
  "reports",
  "Seller-Helper-Application-Documentation-fr-humanized.md"
);
const DOCX_HUMANIZED = path.join(
  ROOT,
  "reports",
  "Seller-Helper-Application-Documentation-fr-humanized.docx"
);



const useHumanized = process.argv.includes("--humanized");



async function main() {

  const merge = spawnSync(

    process.execPath,

    [path.join(__dirname, "merge-application-report-fr.mjs")],

    {

      cwd: ROOT,

      encoding: "utf8",

      env: {

        ...process.env,

        REPORT_SKIP_HUMANIZE: "1",

      },

    }

  );

  if (merge.status !== 0) {

    console.error(merge.stderr || merge.stdout);

    process.exit(merge.status ?? 1);

  }



  if (!fs.existsSync(MD)) {

    console.error("MD introuvable:", MD);

    process.exit(1);

  }



  const canonicalMd = fs.readFileSync(MD, "utf8");

  let mdForBuild = canonicalMd;



  if (useHumanized) {

    mdForBuild = humanize(canonicalMd, { preserveChapter11: true });
    fs.writeFileSync(MD_HUMANIZED, mdForBuild, "utf8");
    fs.writeFileSync(MD, mdForBuild, "utf8");
    console.log("Texte humanisé (structure ch.11 conservée).");
    console.log("MD humanisé :", MD_HUMANIZED);
  }



  const audit = verifyApplicationReportContent(mdForBuild);

  console.log("Vérification contenu:", audit.stats);

  if (!audit.ok) {

    if (useHumanized) fs.writeFileSync(MD, canonicalMd, "utf8");

    console.error("Contenu incomplet:", audit.issues.join("; "));

    process.exit(1);

  }



  const htmlBuild = spawnSync(

    process.execPath,

    [path.join(__dirname, "build-seller-helper-graduation-report-fr.mjs"), "--application"],

    { cwd: ROOT, encoding: "utf8" }

  );



  if (useHumanized) {

    fs.writeFileSync(MD, canonicalMd, "utf8");

  }



  if (htmlBuild.status !== 0) {

    console.error(htmlBuild.stderr || htmlBuild.stdout);

    process.exit(htmlBuild.status ?? 1);

  }



  if (!fs.existsSync(HTML)) {

    console.error("HTML introuvable:", HTML);

    process.exit(1);

  }



  let HTMLtoDOCX;

  try {

    HTMLtoDOCX = (await import("html-to-docx")).default;

  } catch {

    console.error("Installez la dépendance : npm install html-to-docx --save-dev");

    process.exit(1);

  }



  const html = fs.readFileSync(HTML, "utf8");

  const bodyMatch = html.match(/<main class="body">([\s\S]*)<\/main>/i);

  const coverMatch = html.match(/<section class="cover">([\s\S]*?)<\/section>/i);

  const titleMatch = html.match(/<title>([^<]*)<\/title>/i);

  const rawFragment = `${coverMatch ? coverMatch[0] : ""}${bodyMatch ? `<main class="body">${bodyMatch[1]}</main>` : html}`;



  const mdWords = mdForBuild.split(/\s+/).filter(Boolean).length;

  const fragWords = rawFragment

    .replace(/<[^>]+>/g, " ")

    .split(/\s+/)

    .filter(Boolean).length;

  if (fragWords < mdWords * 0.85) {

    console.warn(

      `Attention: HTML DOCX (${fragWords} mots) nettement plus court que MD (${mdWords} mots).`

    );

  }



  const docBody = prepareDocxHtml(rawFragment);

  const outDocx = useHumanized ? DOCX_HUMANIZED : DOCX;

  const meta = { title: titleMatch?.[1]?.trim() || "Seller Helper" };

  const footerPageNumberOnly = `<p style="text-align: center;"></p>`;



  const buffer = await HTMLtoDOCX(docBody, null, {

    orientation: "portrait",

    pageSize: { width: 11906, height: 16838 },

    title: meta.title,

    subject: useHumanized ?

      "Documentation Seller Helper (version humanisée)"

    : "Documentation fonctionnelle Seller Helper",

    creator: "Vitrina Store — Rapport application",

    description:

      "Description du fonctionnement, des interfaces et du workflow de l'application Seller Helper.",

    keywords: ["Seller Helper", "Vitrina Store", "e-commerce", "documentation"],

    lang: "fr-FR",

    table: { row: { cantSplit: true } },

    header: false,

    footer: true,

    pageNumber: true,

    skipFirstHeaderFooter: true,

    font: "Cambria",

    fontSize: 20,

    margins: {

      top: 1440,

      right: 1440,

      bottom: 1440,

      left: 1440,

      header: 0,

      footer: 480,

    },

  }, footerPageNumberOnly);



  fs.mkdirSync(path.dirname(outDocx), { recursive: true });

  fs.writeFileSync(outDocx, buffer);

  console.log("DOCX écrit :", outDocx);

}



main().catch((e) => {

  console.error(e);

  process.exit(1);

});


