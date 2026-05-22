/**
 * Rapport academic — version française du mémoire de fin d'études
 * "Seller Helper — Compagnon d'aide à la décision..."
 *
 *   node scripts/build-seller-helper-graduation-report-fr.mjs           (HTML mémoire)
 *   node scripts/build-seller-helper-graduation-report-fr.mjs --pdf    (PDF mémoire)
 *   node scripts/build-seller-helper-graduation-report-fr.mjs --application       (HTML rapport app)
 *   node scripts/build-seller-helper-graduation-report-fr.mjs --application --pdf (PDF rapport app)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const PROFILE_KEY = process.argv.includes("--application") ? "application" : "graduation";

const PROFILES = {
  graduation: {
    srcMd: path.join(ROOT, "reports", "Seller-Helper-Graduation-Report-fr.md"),
    outHtml: path.join(ROOT, "reports", "Seller-Helper-Graduation-Report-fr.html"),
    outPdf: path.join(ROOT, "reports", "Seller-Helper-Graduation-Report-fr.pdf"),
    colophonSrc: "reports/Seller-Helper-Graduation-Report-fr.md",
    colophonScript: "scripts/build-seller-helper-graduation-report-fr.mjs",
    meta: {
      university: "Université des Sciences et de la Technologie Houari Boumediène",
      faculty: "Faculté d'Informatique",
      framework: "Projet de fin d'études — Vitrina Store",
      theme:
        "Conception et déploiement d'un compagnon d'aide à la décision intelligent (« Seller Helper ») destiné aux petits marchands en ligne, intégré à la plateforme e-commerce Vitrina Store.",
      supervisor: "Dr. — Encadrant(e) du projet de fin d'études",
      team: ["Vada Abderrahmani — Chef de projet", "Équipe projet Vitrina Store"],
      academicYear: "2025 / 2026",
      title:
        "Seller Helper — Compagnon d'aide à la décision intelligent pour les petits marchands e-commerce",
    },
  },
  application: {
    srcMd: path.join(ROOT, "reports", "Seller-Helper-Application-Documentation-fr.md"),
    outHtml: path.join(ROOT, "reports", "Seller-Helper-Application-Documentation-fr.html"),
    outPdf: path.join(ROOT, "reports", "Seller-Helper-Application-Documentation-fr.pdf"),
    colophonSrc: "reports/Seller-Helper-Application-Documentation-fr.md",
    colophonScript:
      "scripts/build-seller-helper-graduation-report-fr.mjs --application",
    meta: {
      university: "Université des Sciences et de la Technologie Houari Boumediène",
      faculty: "Faculté d'Informatique",
      framework: "Projet pluridisciplinaire — Plateforme Vitrina Store",
      coverKicker: "Rapport de présentation",
      theme:
        "Description du fonctionnement, des interfaces et du workflow de l'application Seller Helper intégrée à la boutique en ligne Vitrina Store.",
      supervisor: "Encadrement académique — Faculté d'Informatique",
      academicYear: "2025 / 2026",
      title:
        "Système Intelligent d'Analyse et de Recommandation pour les Sites E-Commerce",
      coverSubtitle:
        "Application Seller Helper — Plateforme Vitrina Store · Rapport de présentation",
      team: [
        "BELKACEMI ABDELMOUMENE",
        "ABDERRAHMANI YOUCEF",
        "CHALLAL RIAD",
        "AMINE",
      ],
    },
  },
};

const PROFILE = PROFILES[PROFILE_KEY];
const SRC_MD = PROFILE.srcMd;
const OUT_HTML = PROFILE.outHtml;
const OUT_PDF = PROFILE.outPdf;
const META = PROFILE.meta;

/* -------------------------------------------------------------------------- */

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function slugify(value) {
  return String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function renderInline(text) {
  let html = escapeHtml(text);
  if (PROFILE_KEY === "application") {
    html = html.replace(/`([^`]+)`/g, "$1");
  } else {
    html = html.replace(/`([^`]+)`/g, (_, code) => `<code>${code}</code>`);
  }
  html = html.replace(/\*\*([^*]+)\*\*/g, (_, b) => `<strong>${b}</strong>`);
  html = html.replace(/(?<![*])\*([^*]+)\*(?![*])/g, (_, i) => `<em>${i}</em>`);
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => `<a href="${href}">${label}</a>`);
  return html;
}

function tableRowCells(line) {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((cell) => cell.trim());
}

function isTableAlignmentRow(line) {
  const cells = tableRowCells(line);
  return cells.length > 0 && cells.every((cell) => /^:?-{2,}:?$/.test(cell));
}

function renderMarkdown(md) {
  const lines = md.split(/\r?\n/);
  let out = "";
  let i = 0;
  let chapterIndex = 0;

  function pushChapterOpening(title) {
    chapterIndex += 1;
    const slug = `chapter-${chapterIndex}`;
    return `<section class="chapter" id="${slug}"><h2 class="chapter-title">${renderInline(title)}</h2>`;
  }

  let inChapter = false;
  let inList = null;

  function closeListIfAny() {
    if (inList) {
      out += `</${inList}>`;
      inList = null;
    }
  }

  function closeChapterIfAny() {
    if (inChapter) {
      out += "</section>";
      inChapter = false;
    }
  }

  while (i < lines.length) {
    const line = lines[i];

    if (/^```/.test(line)) {
      closeListIfAny();
      const lang = line.replace(/^```/, "").trim();
      const code = [];
      i += 1;
      while (i < lines.length && !/^```/.test(lines[i])) {
        code.push(lines[i]);
        i += 1;
      }
      i += 1;
      if (PROFILE_KEY === "application") {
        continue;
      }
      out += `<pre class="code${lang ? ` language-${escapeHtml(lang)}` : ""}"><code>${escapeHtml(code.join("\n"))}</code></pre>`;
      continue;
    }

    if (/^---\s*$/.test(line)) {
      closeListIfAny();
      if (PROFILE_KEY !== "application") {
        out += `<hr class="divider"/>`;
      }
      i += 1;
      continue;
    }

    const mediaPhMatch = line.match(/^\{\{(PLACEHOLDER|CAPTURE|SPACE):([^}]+)\}\}\s*$/i);
    if (mediaPhMatch) {
      closeListIfAny();
      const tag = mediaPhMatch[1].toUpperCase();
      const kind =
        tag === "CAPTURE" || /capture/i.test(mediaPhMatch[2])
          ? "capture"
          : "diagram";
      out += `<div class="media-spacer is-${kind}" aria-hidden="true"></div>`;
      i += 1;
      continue;
    }

    const imgMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)\s*$/);
    if (imgMatch) {
      closeListIfAny();
      if (PROFILE_KEY === "application") {
        const kind = /capture|écran|screenshot|11\./i.test(imgMatch[1])
          ? "capture"
          : "diagram";
        out += `<div class="media-spacer is-${kind}" aria-hidden="true"></div>`;
      } else {
        const alt = imgMatch[1].trim();
        const rel = imgMatch[2].trim();
        const abs = path.isAbsolute(rel) ? rel : path.join(ROOT, rel);
        const src = fs.existsSync(abs) ? pathToFileURL(abs).href : rel;
        out += `<figure class="diagram"><img src="${escapeHtml(src)}" alt="${escapeHtml(alt || "Diagramme")}"/>`;
        if (alt) {
          out += `<figcaption>${renderInline(alt)}</figcaption>`;
        }
        out += `</figure>`;
      }
      i += 1;
      continue;
    }

    const italicCaption = line.match(/^\*Figure\s+[\d.]+\.\*\s*(.*)$/i);
    if (italicCaption) {
      closeListIfAny();
      out += `<p class="figure-caption"><em>${renderInline(italicCaption[1] || italicCaption[0])}</em></p>`;
      i += 1;
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      closeListIfAny();
      const level = headingMatch[1].length;
      const text = headingMatch[2].trim();

      if (level === 1) {
        out += `<h1 class="doc-title">${renderInline(text)}</h1>`;
        i += 1;
        continue;
      }

      if (level === 2 && /^Chapitre\s+\d+/i.test(text)) {
        closeChapterIfAny();
        out += pushChapterOpening(text);
        inChapter = true;
        i += 1;
        continue;
      }

      const slug = slugify(text);
      out += `<h${level} id="${slug}">${renderInline(text)}</h${level}>`;
      i += 1;
      continue;
    }

    if (/\|/.test(line) && i + 1 < lines.length && isTableAlignmentRow(lines[i + 1])) {
      closeListIfAny();
      const header = tableRowCells(line);
      i += 2;
      const rows = [];
      while (i < lines.length && /\|/.test(lines[i]) && lines[i].trim() !== "") {
        rows.push(tableRowCells(lines[i]));
        i += 1;
      }
      out += '<table class="data"><thead><tr>';
      header.forEach((cell) => {
        out += `<th>${renderInline(cell)}</th>`;
      });
      out += "</tr></thead><tbody>";
      rows.forEach((row) => {
        out += "<tr>";
        row.forEach((cell) => {
          out += `<td>${renderInline(cell)}</td>`;
        });
        out += "</tr>";
      });
      out += "</tbody></table>";
      continue;
    }

    const ulMatch = line.match(/^\s*[-*]\s+(.*)$/);
    if (ulMatch) {
      if (inList !== "ul") {
        closeListIfAny();
        out += "<ul>";
        inList = "ul";
      }
      out += `<li>${renderInline(ulMatch[1])}</li>`;
      i += 1;
      continue;
    }

    const olMatch = line.match(/^\s*\d+\.\s+(.*)$/);
    if (olMatch) {
      if (inList !== "ol") {
        closeListIfAny();
        out += "<ol>";
        inList = "ol";
      }
      out += `<li>${renderInline(olMatch[1])}</li>`;
      i += 1;
      continue;
    }

    if (/^\s*$/.test(line)) {
      closeListIfAny();
      i += 1;
      continue;
    }

    closeListIfAny();
    const buffer = [line];
    i += 1;
    while (
      i < lines.length &&
      !/^\s*$/.test(lines[i]) &&
      !/^#{1,6}\s+/.test(lines[i]) &&
      !/^```/.test(lines[i]) &&
      !/^---\s*$/.test(lines[i]) &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !(/\|/.test(lines[i]) && i + 1 < lines.length && isTableAlignmentRow(lines[i + 1]))
    ) {
      buffer.push(lines[i]);
      i += 1;
    }
    out += `<p>${renderInline(buffer.join(" ").trim())}</p>`;
  }

  closeListIfAny();
  closeChapterIfAny();

  return out;
}

function buildCover() {
  return `<section class="cover">
    <div class="cover-header">
      <p class="cover-univ">${escapeHtml(META.university)}</p>
      <p class="cover-faculty">${escapeHtml(META.faculty)}</p>
      <p class="cover-framework">${escapeHtml(META.framework)}</p>
    </div>

    <div class="cover-title-block">
      <p class="cover-kicker">${escapeHtml(META.coverKicker ?? "Thème")}</p>
      <h1 class="cover-title">${escapeHtml(META.title)}</h1>
      <p class="cover-subtitle">${escapeHtml(META.coverSubtitle ?? META.theme)}</p>
      ${META.coverSubtitle ? `<p class="cover-theme">${escapeHtml(META.theme)}</p>` : ""}
    </div>

    <div class="cover-people">
      <div class="cover-people-col">
        <p class="cover-label">Encadrement</p>
        <p class="cover-name">${escapeHtml(META.supervisor)}</p>
      </div>
      <div class="cover-people-col">
        <p class="cover-label">Présenté par</p>
        ${META.team.map((n) => `<p class="cover-name">${escapeHtml(n)}</p>`).join("")}
      </div>
    </div>

    <p class="cover-year">Année universitaire ${escapeHtml(META.academicYear)}</p>
  </section>`;
}

function applicationPrintCss() {
  return `
  body.document-application { font-size: 10.2pt; line-height: 1.38; }
  body.document-application main.body { padding: 10mm 14mm 8mm; }
  body.document-application h2 { margin: 0.55rem 0 0.25rem; page-break-after: avoid; }
  body.document-application h3 { margin: 0.4rem 0 0.15rem; page-break-after: avoid; }
  body.document-application p { margin: 0.22rem 0; orphans: 2; widows: 2; }
  body.document-application ul, body.document-application ol { margin: 0.15rem 0 0.35rem 1.1rem; }
  body.document-application table.data { page-break-inside: auto; margin: 0.3rem 0 0.45rem; }
  body.document-application .media-spacer {
    display: block;
    margin: 0;
    padding: 0;
    border: none;
    background: #fff;
    page-break-inside: avoid;
  }
  body.document-application .media-spacer.is-diagram {
    min-height: 70mm;
    height: 70mm;
  }
  body.document-application .media-spacer.is-capture {
    min-height: 92mm;
    height: 92mm;
  }
  body.document-application p.figure-caption {
    font-size: 9pt;
    color: #475569;
    margin: 0.2rem 0 0.5rem;
    text-align: justify;
    font-style: italic;
  }
  body.document-application .cover { min-height: auto; padding: 22mm 20mm 18mm; }
  body.document-application .chapter-title {
    font-size: 13.5pt;
    margin-top: 1rem;
    padding-bottom: 0.2rem;
  }
  body.document-application h3 { margin-top: 0.5rem; }
  body.document-application code {
    font-family: inherit;
    font-size: inherit;
    background: transparent;
    color: inherit;
    padding: 0;
    border-radius: 0;
  }
  @media print {
    body.document-application hr.divider { display: none !important; }
    body.document-application h2, body.document-application h3, body.document-application h4 {
      page-break-after: avoid;
    }
    body.document-application table.data, body.document-application p, body.document-application li {
      page-break-inside: auto;
    }
    body.document-application pre.code { display: none !important; }
    body.document-application section.chapter { page-break-before: auto; }
  }`;
}

function buildHtml(bodyHtml) {
  const generatedAt = new Date().toISOString().slice(0, 19) + "Z";
  const bodyClass = PROFILE_KEY === "application" ? "document-application" : "";
  const extraCss = PROFILE_KEY === "application" ? applicationPrintCss() : "";
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(META.title)}</title>
<style>
  :root {
    --ink: #1f2937;
    --ink-soft: #374151;
    --muted: #6b7280;
    --line: #d1d5db;
    --line-soft: #e5e7eb;
    --accent: #b54708;
    --accent-soft: #fef3c7;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #ffffff; color: var(--ink); }
  body {
    font-family: "Cambria", "Georgia", "Times New Roman", serif;
    font-size: 10pt;
    line-height: 1.3;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .document { padding: 0 0 2rem; }

  .cover {
    min-height: 100vh;
    padding: 28mm 22mm 22mm;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    text-align: center;
    page-break-after: always;
  }
  .cover-header p { margin: .15rem 0; }
  .cover-univ { font-size: 14pt; font-weight: 700; letter-spacing: .02em; }
  .cover-faculty { font-size: 13pt; font-weight: 600; }
  .cover-framework { font-size: 12pt; font-style: italic; color: var(--ink-soft); }

  .cover-title-block { margin: 1.2rem 0; }
  .cover-kicker {
    text-transform: uppercase;
    letter-spacing: .35em;
    font-size: 10pt;
    color: var(--muted);
    margin-bottom: .35rem;
  }
  .cover-title {
    font-family: "Cambria", "Georgia", serif;
    font-size: 22pt;
    font-weight: 700;
    color: #111827;
    margin: 0 0 .85rem;
    line-height: 1.25;
  }
  .cover-subtitle {
    font-size: 12pt;
    color: var(--ink-soft);
    font-style: italic;
    max-width: 145mm;
    margin: 0 auto;
    line-height: 1.45;
  }
  .cover-theme {
    font-size: 10.5pt;
    color: var(--muted);
    max-width: 145mm;
    margin: 0.5rem auto 0;
    line-height: 1.4;
  }

  .cover-people {
    display: flex;
    justify-content: space-between;
    gap: 1.5rem;
    margin: 1.5rem 0 0;
    text-align: left;
  }
  .cover-people-col { flex: 1; }
  .cover-label {
    text-transform: uppercase;
    letter-spacing: .2em;
    font-size: 9pt;
    color: var(--muted);
    margin: 0 0 .25rem;
  }
  .cover-name { margin: .1rem 0; font-size: 11pt; font-weight: 600; color: var(--ink); }

  .cover-year {
    margin-top: 1.5rem;
    font-size: 12pt;
    font-weight: 700;
    letter-spacing: .12em;
  }

  main.body {
    padding: 14mm 16mm 6mm;
  }
  .doc-title {
    font-size: 18pt;
    font-weight: 700;
    margin: 0 0 .35rem;
    color: #111827;
    line-height: 1.25;
  }
  h2 {
    font-size: 12pt;
    font-weight: 700;
    color: #0f172a;
    margin: .9rem 0 .3rem;
    padding-bottom: .15rem;
    border-bottom: 1px solid var(--line);
  }
  .chapter-title {
    font-size: 13pt;
    color: var(--accent);
    border-bottom: 2px solid var(--accent);
    margin-top: 1.1rem;
  }
  h3 {
    font-size: 10.8pt;
    margin: .6rem 0 .2rem;
    color: #0f172a;
    font-weight: 700;
  }
  h4 {
    font-size: 10.3pt;
    margin: .45rem 0 .15rem;
    color: var(--ink);
    font-weight: 700;
  }
  p { margin: .3rem 0; text-align: justify; }
  ul, ol { margin: .25rem 0 .45rem 1.2rem; padding-left: .8rem; }
  ul li, ol li { margin: .08rem 0; }
  strong { color: #111827; }
  em { color: var(--ink-soft); }
  hr.divider {
    border: none;
    border-top: 1px dashed var(--line);
    margin: 1.25rem 0;
  }
  @media print {
    hr.divider { page-break-after: always; border: none; height: 0; margin: 0; }
  }

  code {
    font-family: "Consolas", "Menlo", "Courier New", monospace;
    font-size: 9.5pt;
    background: #f5f3ff;
    color: #4338ca;
    padding: 0 .25rem;
    border-radius: 3px;
  }
  pre.code {
    background: #0f172a;
    color: #e2e8f0;
    padding: .55rem .75rem;
    border-radius: 6px;
    font-family: "Consolas", "Menlo", "Courier New", monospace;
    font-size: 8.4pt;
    overflow-x: auto;
    margin: .5rem 0 .75rem;
    line-height: 1.35;
    page-break-inside: avoid;
  }
  pre.code code {
    background: transparent;
    color: inherit;
    padding: 0;
    font-size: inherit;
    border-radius: 0;
  }

  table.data {
    width: 100%;
    border-collapse: collapse;
    margin: .4rem 0 .65rem;
    font-size: 9.4pt;
  }
  table.data th, table.data td {
    border: 1px solid var(--line);
    padding: .25rem .4rem;
    vertical-align: top;
    text-align: left;
  }
  table.data thead th {
    background: #f3f4f6;
    font-weight: 700;
    color: #111827;
  }
  table.data tbody tr:nth-child(even) { background: #fafafa; }

  section.chapter { }
  section.chapter .chapter-title { page-break-after: avoid; }

  @media print {
    @page { size: A4; margin: 12mm 13mm 14mm 13mm; }
    body { font-size: 9.9pt; }
    .cover { padding: 20mm 18mm 16mm; min-height: auto; }
    pre.code { white-space: pre-wrap; font-size: 8.1pt; }
    h2 { page-break-after: avoid; }
    h3, h4 { page-break-after: avoid; }
    table.data, pre.code, section.cover { page-break-inside: avoid; }
    hr.divider { page-break-after: always; border: none; height: 0; margin: 0; }
  }
  ${extraCss}

  .colophon {
    margin-top: 2rem;
    font-size: 9pt;
    color: var(--muted);
    border-top: 1px solid var(--line-soft);
    padding-top: .75rem;
  }
</style>
</head>
<body class="${bodyClass}">
  ${buildCover()}
  <main class="body">
    ${bodyHtml}
    <p class="colophon">Généré le ${escapeHtml(generatedAt)}${PROFILE_KEY === "application" ? " · Seller Helper — documentation fonctionnelle." : ` · Source : <code>${escapeHtml(PROFILE.colophonSrc)}</code> · Script : <code>${escapeHtml(PROFILE.colophonScript)}</code>.`}</p>
  </main>
</body>
</html>`;
}

async function tryPdf() {
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    console.warn("Playwright absent. Lancez : npx playwright install chromium");
    return false;
  }
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(pathToFileURL(OUT_HTML).href, { waitUntil: "load" });

  let outputPath = OUT_PDF;
  try {
    await page.pdf({
      path: outputPath,
      format: "A4",
      printBackground: true,
      margin: { top: "12mm", right: "13mm", bottom: "14mm", left: "13mm" },
    });
  } catch (error) {
    if (error && error.code === "EBUSY") {
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      outputPath = path.join(
        path.dirname(OUT_PDF),
        `${path.basename(OUT_PDF, ".pdf")}-${stamp}.pdf`
      );
      console.warn(`PDF verrouillé, écriture dans ${outputPath}`);
      await page.pdf({
        path: outputPath,
        format: "A4",
        printBackground: true,
        margin: { top: "12mm", right: "13mm", bottom: "14mm", left: "13mm" },
      });
    } else {
      throw error;
    }
  }

  await browser.close();
  console.log("PDF écrit :", outputPath);
  return true;
}

function main() {
  if (!fs.existsSync(SRC_MD)) {
    console.error(`Fichier source introuvable : ${SRC_MD}`);
    if (PROFILE_KEY === "graduation") {
      console.error(`Exécutez d'abord : node scripts/merge-graduation-fr.mjs`);
    }
    process.exit(1);
  }
  const md = fs.readFileSync(SRC_MD, "utf8");
  const bodyHtml = renderMarkdown(md);
  const html = buildHtml(bodyHtml);
  fs.mkdirSync(path.dirname(OUT_HTML), { recursive: true });
  fs.writeFileSync(OUT_HTML, html, "utf8");
  console.log("HTML écrit :", OUT_HTML);
}

main();

if (process.argv.includes("--pdf")) {
  tryPdf().then((ok) => {
    if (!ok) process.exitCode = 1;
  });
}
