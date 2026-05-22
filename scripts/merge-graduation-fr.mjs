/**
 * Concaténates reports/fr-parts/fr-part*.md into
 * reports/Seller-Helper-Graduation-Report-fr.md
 *
 *   node scripts/merge-graduation-fr.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const PARTS_DIR = path.join(ROOT, "reports", "fr-parts");
const OUT = path.join(ROOT, "reports", "Seller-Helper-Graduation-Report-fr.md");

function main() {
  const parts = [];
  for (let i = 1; i <= 4; i += 1) {
    const p = path.join(PARTS_DIR, `fr-part${i}.md`);
    if (!fs.existsSync(p)) {
      console.error(`Missing part file: ${p}`);
      process.exit(1);
    }
    parts.push(fs.readFileSync(p, "utf8").trim());
  }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${parts.join("\n\n")}\n`, "utf8");
  console.log("Written:", OUT);
}

main();
