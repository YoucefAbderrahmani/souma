/**
 * Supprime les séparateurs « : » et « — » typiques des titres et listes du rapport.
 * node scripts/normalize-report-punctuation-fr.mjs [fichier.md]
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DEFAULT = path.join(ROOT, "reports", "Seller-Helper-Application-Documentation-fr.md");

export function normalizePunctuation(text) {
  let inCode = false;
  const lines = text.split("\n");

  const out = lines.map((line) => {
    if (line.trim().startsWith("```")) {
      inCode = !inCode;
      return line;
    }
    if (inCode) return line;
    if (/^!\[[^\]]*\]\([^)]+\)\s*$/.test(line.trim())) return line;
    if (/^\{\{(PLACEHOLDER|CAPTURE):/.test(line.trim())) return line;

    if (line.trim().startsWith("|")) {
      return line.replace(/ — /g, ", ").replace(/, , /g, ", ");
    }

    let l = line;

    l = l.replace(/^## Chapitre (\d+) : /, "## Chapitre $1. ");
    l = l.replace(/^(\d+)\. Chapitre (\d+) — /, "$1. Chapitre $2. ");
    l = l.replace(/\*\*Partie ([IVX]+) — /, "**Partie $1, ");
    l = l.replace(/\*\*Rapport de présentation — /, "**Rapport de présentation, ");
    l = l.replace(/^## Application Seller Helper — /, "## Application Seller Helper, ");
    l = l.replace(/^### ([^|]+) : /, "### $1, ");
    l = l.replace(/Année universitaire : /, "Année universitaire ");
    l = l.replace(/ — /g, ", ");
    l = l.replace(/, , /g, ", ");

    if (/^#{1,3} /.test(l) || /^\d+\. Chapitre/.test(l)) {
      l = l.replace(/ : /g, ", ");
    } else if (!/^\s*[-*]/.test(l) && !/^\d+\.\s/.test(l)) {
      l = l.replace(/ : /g, ", ");
    }

    return l;
  });

  return out.join("\n");
}

function main() {
  const target = process.argv[2]
    ? path.resolve(process.argv[2])
    : DEFAULT;
  if (!fs.existsSync(target)) {
    console.error("Fichier introuvable:", target);
    process.exit(1);
  }
  const raw = fs.readFileSync(target, "utf8");
  const normalized = normalizePunctuation(raw);
  fs.writeFileSync(target, normalized, "utf8");
  console.log("Ponctuation normalisée:", target);
}

const isCli =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isCli) main();
