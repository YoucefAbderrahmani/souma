/**
 * Copie les PNG UML exportés (assets Cursor) vers reports/diagrams/
 * node scripts/copy-report-diagrams.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DST = path.join(ROOT, "reports", "diagrams");

const ASSETS_CANDIDATES = [
  path.join(
    process.env.USERPROFILE || "",
    ".cursor",
    "projects",
    "c-Users-vada-Documents-project-E-main-project-E-main",
    "assets"
  ),
  path.join(ROOT, "assets"),
];

const MAP = [
  { glob: "qq", dest: "diagram-deployment.png" },
  { glob: "sss", dest: "diagram-class.png" },
  { glob: "ffff", dest: "diagram-sequence.png" },
  { glob: "dddd", dest: "diagram-usecase.png" },
  { glob: "ddd-71be", dest: "diagram-activity.png" },
];

function findAsset(dir, fragment) {
  if (!fs.existsSync(dir)) return null;
  return fs.readdirSync(dir).find((f) => f.includes(fragment) && f.endsWith(".png"));
}

function resolveAssetsDir() {
  for (const dir of ASSETS_CANDIDATES) {
    if (dir && fs.existsSync(dir)) return dir;
  }
  return null;
}

function main() {
  fs.mkdirSync(DST, { recursive: true });
  const assetsDir = resolveAssetsDir();
  let ok = 0;
  for (const { glob, dest } of MAP) {
    const file = assetsDir ? findAsset(assetsDir, glob) : null;
    if (!file) {
      const local = path.join(DST, dest);
      if (fs.existsSync(local)) {
        console.log("Déjà présent:", dest);
        ok += 1;
        continue;
      }
      console.warn("Introuvable:", glob);
      continue;
    }
    fs.copyFileSync(path.join(assetsDir, file), path.join(DST, dest));
    console.log("Copié:", dest);
    ok += 1;
  }
  if (ok < MAP.length) {
    console.warn("Placez les PNG dans reports/diagrams/ ou exportez docs/uml/*.puml");
  }
}

main();
