/**
 * Rapport PDF — Motivation des choix technologiques (Vitrina Store / Seller Helper)
 *
 *   node scripts/build-vitrina-technologies-motivation-fr.mjs --html-only
 *   node scripts/build-vitrina-technologies-motivation-fr.mjs --pdf
 */

import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SRC_MD = path.join(ROOT, "reports", "Vitrina-Technologies-Motivation-fr.md");
const OUT_HTML = path.join(ROOT, "reports", "Vitrina-Technologies-Motivation-fr.html");
const OUT_PDF = path.join(ROOT, "reports", "Vitrina-Technologies-Motivation-fr.pdf");

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderInline(text) {
  let html = escapeHtml(text);
  html = html.replace(/`([^`]+)`/g, (_, code) => `<code>${code}</code>`);
  html = html.replace(/\*\*([^*]+)\*\*/g, (_, b) => `<strong>${b}</strong>`);
  html = html.replace(/(?<![*])\*([^*]+)\*(?![*])/g, (_, i) => `<em>${i}</em>`);
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
  let inList = null;

  function closeList() {
    if (inList) {
      out += `</${inList}>`;
      inList = null;
    }
  }

  while (i < lines.length) {
    const line = lines[i];

    if (/^```/.test(line)) {
      closeList();
      const code = [];
      i += 1;
      while (i < lines.length && !/^```/.test(lines[i])) {
        code.push(lines[i]);
        i += 1;
      }
      i += 1;
      out += `<pre class="code"><code>${escapeHtml(code.join("\n"))}</code></pre>`;
      continue;
    }

    if (/^---\s*$/.test(line)) {
      closeList();
      out += `<hr class="divider"/>`;
      i += 1;
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      closeList();
      const level = headingMatch[1].length;
      const text = headingMatch[2].trim();
      if (level === 1) {
        out += `<h1 class="doc-title">${renderInline(text)}</h1>`;
      } else {
        out += `<h${level}>${renderInline(text)}</h${level}>`;
      }
      i += 1;
      continue;
    }

    if (/\|/.test(line) && i + 1 < lines.length && isTableAlignmentRow(lines[i + 1])) {
      closeList();
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
        closeList();
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
        closeList();
        out += "<ol>";
        inList = "ol";
      }
      out += `<li>${renderInline(olMatch[1])}</li>`;
      i += 1;
      continue;
    }

    if (line.trim() === "") {
      closeList();
      i += 1;
      continue;
    }

    closeList();
    out += `<p>${renderInline(line)}</p>`;
    i += 1;
  }

  closeList();
  return out;
}

function buildHtml(bodyHtml) {
  const generatedAt = new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" });
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Motivation des choix technologiques — Vitrina Store</title>
<style>
  :root {
    --ink: #1a1a1a;
    --muted: #5c5c5c;
    --accent: #1d4ed8;
    --line: #e5e5e5;
    --bg: #f8fafc;
  }
  * { box-sizing: border-box; }
  body {
    font-family: "Segoe UI", system-ui, sans-serif;
    font-size: 10.5pt;
    line-height: 1.55;
    color: var(--ink);
    margin: 0;
    background: #fff;
  }
  .cover {
    min-height: 240mm;
    padding: 22mm 18mm;
    background: linear-gradient(145deg, #eff6ff 0%, #fff 45%);
    border-bottom: 3px solid var(--accent);
    page-break-after: always;
  }
  .cover-kicker {
    font-size: 9pt;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--accent);
    font-weight: 600;
  }
  .cover h1 {
    font-size: 21pt;
    line-height: 1.2;
    margin: 1rem 0 0.5rem;
    max-width: 28em;
  }
  .cover-meta { font-size: 10pt; color: var(--muted); margin-top: 1.5rem; line-height: 1.6; }
  .cover p { color: var(--muted); max-width: 36em; }
  .body { padding: 14mm 16mm 18mm; max-width: 210mm; margin: 0 auto; }
  h1.doc-title { font-size: 16pt; color: var(--accent); margin-top: 0; }
  h2 { font-size: 13pt; margin-top: 1.6em; border-bottom: 1px solid var(--line); padding-bottom: 0.25em; }
  h3 { font-size: 11.5pt; margin-top: 1.2em; color: #1e3a8a; }
  h4 { font-size: 10.5pt; margin-top: 1em; }
  p { margin: 0.6em 0; text-align: justify; }
  ul, ol { margin: 0.5em 0 0.8em 1.2em; }
  li { margin: 0.25em 0; }
  code {
    font-family: Consolas, "Courier New", monospace;
    font-size: 0.9em;
    background: var(--bg);
    padding: 0.1em 0.35em;
    border-radius: 3px;
  }
  pre.code {
    background: #1e1e1e;
    color: #f3f3f3;
    padding: 0.85em 1em;
    border-radius: 6px;
    font-size: 8.5pt;
    overflow-x: auto;
    white-space: pre-wrap;
    page-break-inside: avoid;
  }
  pre.code code { background: none; padding: 0; color: inherit; }
  table.data {
    width: 100%;
    border-collapse: collapse;
    font-size: 9.2pt;
    margin: 0.8em 0;
    page-break-inside: avoid;
  }
  table.data th, table.data td {
    border: 1px solid var(--line);
    padding: 0.45em 0.55em;
    text-align: left;
    vertical-align: top;
  }
  table.data th { background: #eff6ff; font-weight: 600; }
  hr.divider { border: none; border-top: 1px solid var(--line); margin: 1.5em 0; }
  .colophon {
    margin-top: 2rem;
    font-size: 8.5pt;
    color: var(--muted);
    border-top: 1px solid var(--line);
    padding-top: 0.75rem;
  }
  @media print {
    @page { size: A4; margin: 12mm 13mm 14mm 13mm; }
    h2, h3 { page-break-after: avoid; }
    pre.code, table.data { page-break-inside: avoid; }
  }
</style>
</head>
<body>
  <section class="cover">
    <p class="cover-kicker">Université des Sciences et de la Technologie Houari Boumediène · Faculté d'Informatique</p>
    <h1>Motivation des choix technologiques — Vitrina Store &amp; Seller Helper</h1>
    <p>Justification de la stack (Next.js, PostgreSQL, micro-événements, IA, paiements, déploiement) au service de la boucle vendeur : observer → recommander → appliquer → mesurer.</p>
    <div class="cover-meta">
      <p><strong>Projet :</strong> Vitrina Store — module Seller Helper</p>
      <p><strong>Année universitaire :</strong> 2025 / 2026</p>
      <p><strong>Généré le :</strong> ${escapeHtml(generatedAt)}</p>
    </div>
  </section>
  <main class="body">
    ${bodyHtml}
    <p class="colophon">Source : <code>reports/Vitrina-Technologies-Motivation-fr.md</code> · Script : <code>scripts/build-vitrina-technologies-motivation-fr.mjs</code></p>
  </main>
</body>
</html>`;
}

async function tryPdf() {
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    console.warn("Playwright absent. Installez : npx playwright install chromium");
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
    if (error?.code === "EBUSY") {
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
    process.exit(1);
  }
  const md = fs.readFileSync(SRC_MD, "utf8");
  const html = buildHtml(renderMarkdown(md));
  fs.mkdirSync(path.dirname(OUT_HTML), { recursive: true });
  fs.writeFileSync(OUT_HTML, html, "utf8");
  console.log("HTML écrit :", OUT_HTML);
}

main();

const wantPdf = process.argv.includes("--pdf");
if (wantPdf) {
  tryPdf().then((ok) => {
    if (!ok) process.exitCode = 1;
  });
}
