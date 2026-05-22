import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const pdfPath = path.join(
  process.env.USERPROFILE || "",
  "Downloads",
  "Système Intelligent d'Analyse et de Recommandation pour les Sites E-Commerce (2).pdf"
);
const outPath = path.join(ROOT, "reports", "_ref-ecommerce-system-extract.txt");

async function main() {
  if (!fs.existsSync(pdfPath)) {
    console.error("PDF not found:", pdfPath);
    process.exit(1);
  }
  const buf = fs.readFileSync(pdfPath);
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buf });
  const result = await parser.getText();
  const text = result.text || "";
  const numpages = result.pages?.length ?? 0;
  await parser.destroy();
  fs.writeFileSync(outPath, text, "utf8");
  console.log("pages", numpages, "chars", text.length);
  console.log("written", outPath);
  console.log("--- preview ---\n", text.slice(0, 4000));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
