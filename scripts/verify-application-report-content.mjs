/**
 * Vérifie que le rapport application contient les sections attendues (merge + DOCX).
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const MD = path.join(ROOT, "reports", "Seller-Helper-Application-Documentation-fr.md");

const CHECKS = [
  { id: "ch1", re: /## Chapitre 1\. Introduction/ },
  { id: "ch5-tech", re: /## Chapitre 5\. Technologies/ },
  { id: "ch6-collecte", re: /## Chapitre 6\. Collecte/ },
  { id: "ch7-analyse", re: /## Chapitre 7\. Analyse/ },
  { id: "ch8-app", re: /## Chapitre 8\. Présentation/ },
  { id: "ch9-arch", re: /## Chapitre 9\. Architecture/ },
  { id: "ch9-uml", re: /### 9\.1 Modélisation UML/ },
  { id: "ch9-suite", re: /### 9\.6 Chaîne complète/ },
  { id: "ch10", re: /## Chapitre 10\. Workflow/ },
  { id: "ch11", re: /## Chapitre 11\. Description des modules/ },
  { id: "ch11-role", re: /\*\*Rôle\.\*\*/ },
  { id: "ch11-impact", re: /\*\*Impact\.\*\*/ },
  { id: "ch12", re: /## Chapitre 12\. Confidentialité/ },
  { id: "ch13", re: /## Chapitre 13\. Impacts/ },
  { id: "ch14", re: /## Chapitre 14\. Conclusion/ },
];

export function verifyApplicationReportContent(md, { minChars = 48000 } = {}) {
  const missing = CHECKS.filter((c) => !c.re.test(md)).map((c) => c.id);
  const captures = (md.match(/\{\{CAPTURE/g) || []).length;
  const placeholders = (md.match(/\{\{PLACEHOLDER/g) || []).length;
  const issues = [];

  if (missing.length) issues.push(`sections manquantes: ${missing.join(", ")}`);
  if (captures < 9) issues.push(`captures ch.11: ${captures}/9`);
  if (placeholders < 5) issues.push(`diagrammes ch.9: ${placeholders}/5`);
  if (md.length < minChars) issues.push(`taille MD faible: ${md.length} < ${minChars}`);

  return {
    ok: issues.length === 0,
    issues,
    stats: { chars: md.length, captures, placeholders, chapters: 14 - missing.length },
  };
}

function main() {
  if (!fs.existsSync(MD)) {
    console.error("MD introuvable:", MD);
    process.exit(1);
  }
  const md = fs.readFileSync(MD, "utf8");
  const result = verifyApplicationReportContent(md);
  console.log("Stats:", result.stats);
  if (!result.ok) {
    console.error("Échec vérification:", result.issues.join("; "));
    process.exit(1);
  }
  console.log("Contenu rapport OK.");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
