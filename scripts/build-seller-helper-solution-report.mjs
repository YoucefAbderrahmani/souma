/**
 * Builds the academic-style "Seller Helper — A Decision-Support Solution for
 * E-commerce Sellers" report (HTML + PDF), modelled on the USTHB
 * Pluridisciplinary project reports placed under `refrence report/`.
 *
 *   node scripts/build-seller-helper-solution-report.mjs          (HTML only)
 *   node scripts/build-seller-helper-solution-report.mjs --pdf    (HTML + PDF, requires Playwright)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SRC_MD = path.join(ROOT, "reports", "Seller-Helper-Solution-Report.md");
const OUT_HTML = path.join(ROOT, "reports", "Seller-Helper-Solution-Report.html");
const OUT_PDF = path.join(ROOT, "reports", "Seller-Helper-Solution-Report.pdf");

const META = {
  university: "University of Sciences and Technology Houari Boumediene",
  faculty: "Faculty of Computer Science",
  framework: "Pluridisciplinary Project — Vitrina Store",
  theme:
    "Design and implementation of a behavior-driven dashboard and an action-oriented \"Seller Helper\" module for online sellers, grafted on the Vitrina Store e-commerce platform.",
  supervisor: "Dr. — Project supervisor",
  team: [
    "Vada Abderrahmani — Lead developer",
    "Vitrina Store project group",
  ],
  academicYear: "2025 / 2026",
  title: "Seller Helper — A Decision-Support Solution for E-commerce Sellers",
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
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
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/* -------------------------------------------------------------------------- */
/* Tiny Markdown → HTML renderer                                               */
/* -------------------------------------------------------------------------- */
/* Supports: ATX headings, paragraphs, bullet lists, ordered lists,            */
/* fenced code blocks (```), inline `code`, **bold**, *italic*, horizontal     */
/* rules (---), tables, and Markdown links [text](href).                       */

function renderInline(text) {
  let html = escapeHtml(text);
  html = html.replace(/`([^`]+)`/g, (_, code) => `<code>${code}</code>`);
  html = html.replace(/\*\*([^*]+)\*\*/g, (_, b) => `<strong>${b}</strong>`);
  html = html.replace(/(?<![*])\*([^*]+)\*(?![*])/g, (_, i) => `<em>${i}</em>`);
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
    return `<a href="${href}">${label}</a>`;
  });
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
  let inList = null; // "ul" | "ol" | null

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

    // Fenced code block
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
      out += `<pre class="code${lang ? ` language-${escapeHtml(lang)}` : ""}"><code>${escapeHtml(code.join("\n"))}</code></pre>`;
      continue;
    }

    // Horizontal rule -> page divider
    if (/^---\s*$/.test(line)) {
      closeListIfAny();
      out += `<hr class="divider"/>`;
      i += 1;
      continue;
    }

    // ATX headings
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      closeListIfAny();
      const level = headingMatch[1].length;
      const text = headingMatch[2].trim();

      if (level === 1) {
        // Document title at the very top — render as document title.
        out += `<h1 class="doc-title">${renderInline(text)}</h1>`;
        i += 1;
        continue;
      }

      if (level === 2 && /^Chapter\s+\d+/i.test(text)) {
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

    // Table — header followed by alignment row
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

    // Bullet list
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

    // Ordered list
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

    // Blank line — close list / paragraph
    if (/^\s*$/.test(line)) {
      closeListIfAny();
      i += 1;
      continue;
    }

    // Paragraph — gather consecutive non-empty, non-special lines
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

/* -------------------------------------------------------------------------- */
/* Cover, TOC, page chrome                                                     */
/* -------------------------------------------------------------------------- */

function buildCover() {
  return `<section class="cover">
    <div class="cover-header">
      <p class="cover-univ">${escapeHtml(META.university)}</p>
      <p class="cover-faculty">${escapeHtml(META.faculty)}</p>
      <p class="cover-framework">${escapeHtml(META.framework)}</p>
    </div>

    <div class="cover-title-block">
      <p class="cover-kicker">Theme</p>
      <h1 class="cover-title">${escapeHtml(META.title)}</h1>
      <p class="cover-subtitle">${escapeHtml(META.theme)}</p>
    </div>

    <div class="cover-people">
      <div class="cover-people-col">
        <p class="cover-label">Supervised by</p>
        <p class="cover-name">${escapeHtml(META.supervisor)}</p>
      </div>
      <div class="cover-people-col">
        <p class="cover-label">Presented by</p>
        ${META.team.map((n) => `<p class="cover-name">${escapeHtml(n)}</p>`).join("")}
      </div>
    </div>

    <p class="cover-year">${escapeHtml(META.academicYear)}</p>
  </section>`;
}

/* -------------------------------------------------------------------------- */
/* Full HTML document                                                          */
/* -------------------------------------------------------------------------- */

function buildHtml(bodyHtml) {
  const generatedAt = new Date().toISOString().slice(0, 19) + "Z";
  return `<!doctype html>
<html lang="en">
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

  /* ---------------- Cover ---------------- */
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

  /* ---------------- Body ---------------- */
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

  /* TOC (auto-built lower) */
  section.toc h2 { border-bottom: 1px solid var(--line); }
  section.toc ol { counter-reset: chap; list-style: none; padding-left: 0; }
  section.toc ol li {
    counter-increment: chap;
    margin: .25rem 0;
    display: flex;
    align-items: baseline;
    gap: .6rem;
  }
  section.toc ol li::before {
    content: counter(chap) ".";
    font-weight: 700;
    color: var(--accent);
    min-width: 1.8rem;
  }
  section.toc a {
    color: var(--ink);
    text-decoration: none;
    border-bottom: 1px dotted var(--line);
  }

  /* Chapter container — keep title with following content but flow naturally */
  section.chapter { }
  section.chapter .chapter-title { page-break-after: avoid; }

  /* Print rules */
  @media print {
    @page { size: A4; margin: 12mm 13mm 14mm 13mm; }
    body { font-size: 9.9pt; }
    .cover { padding: 20mm 18mm 16mm; min-height: auto; }
    pre.code { white-space: pre-wrap; font-size: 8.1pt; }
    h2 { page-break-after: avoid; }
    h3, h4 { page-break-after: avoid; }
    table.data, pre.code, section.cover { page-break-inside: avoid; }
  }

  .colophon {
    margin-top: 2rem;
    font-size: 9pt;
    color: var(--muted);
    border-top: 1px solid var(--line-soft);
    padding-top: .75rem;
  }
</style>
</head>
<body>
  ${buildCover()}
  <main class="body">
    ${bodyHtml}
    <p class="colophon">Generated ${escapeHtml(generatedAt)} · Source: <code>reports/Seller-Helper-Solution-Report.md</code> · Pipeline: <code>scripts/build-seller-helper-solution-report.mjs</code>.</p>
  </main>
</body>
</html>`;
}

/* -------------------------------------------------------------------------- */
/* PDF                                                                         */
/* -------------------------------------------------------------------------- */

async function tryPdf() {
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    console.warn("Playwright is not installed. Run: npm i -D playwright && npx playwright install chromium");
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
        `Seller-Helper-Solution-Report-${stamp}.pdf`
      );
      console.warn(`Primary PDF locked, falling back to ${outputPath}`);
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
  console.log("PDF written:", outputPath);
  return true;
}

/* -------------------------------------------------------------------------- */
/* Entry                                                                       */
/* -------------------------------------------------------------------------- */

function main() {
  if (!fs.existsSync(SRC_MD)) {
    console.error(`Source markdown not found at ${SRC_MD}`);
    process.exit(1);
  }
  const md = fs.readFileSync(SRC_MD, "utf8");
  const bodyHtml = renderMarkdown(md);
  const html = buildHtml(bodyHtml);
  fs.mkdirSync(path.dirname(OUT_HTML), { recursive: true });
  fs.writeFileSync(OUT_HTML, html, "utf8");
  console.log("HTML written:", OUT_HTML);
}

main();

if (process.argv.includes("--pdf")) {
  tryPdf().then((ok) => {
    if (!ok) process.exitCode = 1;
  });
}
