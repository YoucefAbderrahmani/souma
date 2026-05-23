/**
 * Ensures `product_page_rrweb` exists for rrweb session replay in Seller Helper.
 */
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import { exitBuildScriptOnError } from "./lib/build-script-exit.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

dotenv.config({ path: path.join(root, ".env.local") });
dotenv.config({ path: path.join(root, ".env") });

const KEYS = [
  "DATABASE_URL",
  "POSTGRES_URL",
  "NEON_DATABASE_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL_NON_POOLING",
];

function resolveUrl() {
  for (const k of KEYS) {
    const v = process.env[k]?.trim();
    if (v) return { url: v, source: k };
  }
  return null;
}

const resolved = resolveUrl();
if (!resolved) {
  console.log("[ensure-product-page-rrweb] No database URL env; skip.");
  process.exit(0);
}

console.log("[ensure-product-page-rrweb] using env:", resolved.source);

const sqlPath = path.join(root, "drizzle", "0016_product_page_rrweb.sql");
const client = new pg.Client({ connectionString: resolved.url });

try {
  await client.connect();
  const check = await client.query(
    `select 1 from information_schema.tables where table_schema = 'public' and table_name = 'product_page_rrweb' limit 1`
  );
  if (check.rowCount > 0) {
    console.log("[ensure-product-page-rrweb] table already exists.");
    process.exit(0);
  }
  const sql = fs.readFileSync(sqlPath, "utf8");
  await client.query(sql);
  console.log("[ensure-product-page-rrweb] created table from drizzle/0016_product_page_rrweb.sql");
} catch (e) {
  exitBuildScriptOnError(e, "ensure-product-page-rrweb");
} finally {
  await client.end().catch(() => {});
}
