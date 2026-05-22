/**
 * Génère le script pitch deck Seller Helper en DOCX.
 *
 *   node scripts/build-seller-helper-pitch-docx.mjs
 *
 * Sortie : reports/Seller-Helper-Pitch-Deck-Script.docx
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const MD = path.join(ROOT, "reports", "Seller-Helper-Pitch-Deck-Script.md");
const DOCX = path.join(ROOT, "reports", "Seller-Helper-Pitch-Deck-Script.docx");

const FONT = "Calibri, Arial, sans-serif";
const INK = "#1F2937";
const ACCENT = "#B54708";

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inlineMd(text) {
  let s = escapeHtml(text);
  s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/\*(.+?)\*/g, "<em>$1</em>");
  s = s.replace(/`(.+?)`/g, "<code>$1</code>");
  return s;
}

function mdToHtml(md) {
  const lines = md.split(/\r?\n/);
  const out = [];
  let inBlockquote = false;
  let inTable = false;
  let tableRows = [];

  const flushTable = () => {
    if (!tableRows.length) return;
    out.push('<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;font-family:' + FONT + ';">');
    tableRows.forEach((row, i) => {
      const tag = i === 0 ? "th" : "td";
      const bg = i === 0 ? ' style="background:#F3F4F6;font-weight:700;"' : "";
      out.push("<tr>");
      row.forEach((cell) => {
        out.push(`<${tag}${bg}>${inlineMd(cell.trim())}</${tag}>`);
      });
      out.push("</tr>");
    });
    out.push("</table>");
    tableRows = [];
    inTable = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("|") && line.includes("|")) {
      if (/^\|[\s\-:|]+\|$/.test(line.trim())) continue;
      if (!inTable) {
        flushTable();
        inTable = true;
      }
      tableRows.push(
        line
          .trim()
          .slice(1, -1)
          .split("|")
          .map((c) => c.trim())
      );
      continue;
    }
    if (inTable) flushTable();

    if (line.startsWith("# ")) {
      out.push(
        `<h1 style="font-family:${FONT};color:${INK};font-size:22pt;margin:18pt 0 10pt;">${inlineMd(line.slice(2))}</h1>`
      );
      continue;
    }
    if (line.startsWith("## ")) {
      out.push(
        `<h2 style="font-family:${FONT};color:${ACCENT};font-size:16pt;margin:16pt 0 8pt;border-bottom:1pt solid #E5E7EB;padding-bottom:4pt;">${inlineMd(line.slice(3))}</h2>`
      );
      continue;
    }
    if (line.startsWith("### ")) {
      out.push(
        `<h3 style="font-family:${FONT};color:${INK};font-size:13pt;margin:12pt 0 6pt;">${inlineMd(line.slice(4))}</h3>`
      );
      continue;
    }

    if (line.startsWith("> ")) {
      if (!inBlockquote) {
        out.push(
          `<blockquote style="font-family:${FONT};font-size:11pt;margin:8pt 0 8pt 12pt;padding:8pt 12pt;border-left:3pt solid ${ACCENT};color:#374151;background:#FFFBEB;">`
        );
        inBlockquote = true;
      }
      out.push(`<p style="margin:4pt 0;">${inlineMd(line.slice(2))}</p>`);
      continue;
    }
    if (inBlockquote && line.trim() === "") {
      out.push("</blockquote>");
      inBlockquote = false;
      continue;
    }
    if (inBlockquote && !line.startsWith("> ")) {
      out.push("</blockquote>");
      inBlockquote = false;
    }

    if (line.startsWith("- ")) {
      out.push(`<li style="font-family:${FONT};font-size:11pt;margin:3pt 0;">${inlineMd(line.slice(2))}</li>`);
      continue;
    }

    if (line.trim() === "---") {
      out.push('<hr style="border:none;border-top:1pt solid #E5E7EB;margin:14pt 0;" />');
      continue;
    }

    if (line.trim() === "") {
      out.push("<br />");
      continue;
    }

    if (line.startsWith("**On screen:**")) {
      out.push(
        `<p style="font-family:${FONT};font-size:10pt;color:#6B7280;margin:6pt 0 2pt;"><em>${inlineMd(line)}</em></p>`
      );
      continue;
    }
    if (line.startsWith("**You say:**")) {
      out.push(
        `<p style="font-family:${FONT};font-size:11pt;font-weight:700;color:${INK};margin:8pt 0 4pt;">You say:</p>`
      );
      continue;
    }

    out.push(`<p style="font-family:${FONT};font-size:11pt;line-height:1.35;margin:4pt 0;color:${INK};">${inlineMd(line)}</p>`);
  }

  if (inBlockquote) out.push("</blockquote>");
  if (inTable) flushTable();

  return out.join("\n");
}

async function main() {
  if (!fs.existsSync(MD)) {
    console.error("MD introuvable:", MD);
    process.exit(1);
  }

  const md = fs.readFileSync(MD, "utf8");
  const body = mdToHtml(md);
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><title>Seller Helper Pitch Deck Script</title></head>
<body style="font-family:${FONT};color:${INK};max-width:720px;margin:24pt;">
${body}
</body>
</html>`;

  let HTMLtoDOCX;
  try {
    HTMLtoDOCX = (await import("html-to-docx")).default;
  } catch {
    console.error("Installez : npm install html-to-docx --save-dev");
    process.exit(1);
  }

  const buffer = await HTMLtoDOCX(html, null, {
    table: { row: { cantSplit: true } },
    footer: false,
    pageNumber: false,
  });

  fs.writeFileSync(DOCX, buffer);
  console.log("DOCX écrit :", DOCX);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
