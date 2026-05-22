#!/usr/bin/env node
/**
 * Render docs/uml/*.puml to PNG/SVG when Java+PlantUML or Docker is available.
 * Usage: node scripts/render-uml.mjs [--svg]
 */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const umlDir = path.join(root, "docs", "uml");
const outDir = path.join(umlDir, "out");
const format = process.argv.includes("--svg") ? "svg" : "png";

mkdirSync(outDir, { recursive: true });

function tryDocker() {
  execSync(
    `docker run --rm -v "${umlDir.replace(/\\/g, "/")}:/data" plantuml/plantuml -t${format} -o out /data/*.puml`,
    { stdio: "inherit", cwd: root }
  );
  console.log(`Rendered to docs/uml/out/*.${format}`);
}

function tryJava() {
  execSync(`plantuml -t${format} -o out *.puml`, { stdio: "inherit", cwd: umlDir });
  console.log(`Rendered to docs/uml/out/*.${format}`);
}

try {
  tryDocker();
} catch {
  try {
    tryJava();
  } catch (e) {
    console.error(
      "Could not render UML: install Docker (plantuml/plantuml) or Java+PlantUML CLI.\n" +
        "Preview .puml files with the PlantUML VS Code extension, or open docs/uml/mermaid/*.md in Cursor."
    );
    process.exit(1);
  }
}
