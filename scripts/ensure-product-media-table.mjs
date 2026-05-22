/**
 * Ensures `product_media` exists (Neon / Postgres) for admin image uploads without Vercel Blob.
 */
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

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
  console.log("[ensure-product-media] No database URL env; skip.");
  process.exit(0);
}

console.log("[ensure-product-media] using env:", resolved.source);

const sqlPath = path.join(root, "drizzle", "0004_product_media.sql");
const client = new pg.Client({ connectionString: resolved.url });

try {
  await client.connect();
  const check = await client.query(
    `select 1 from information_schema.tables where table_schema = 'public' and table_name = 'product_media' limit 1`
  );
  if (check.rowCount > 0) {
    console.log("[ensure-product-media] table already exists.");
    process.exit(0);
  }
  const sql = fs.readFileSync(sqlPath, "utf8");
  await client.query(sql);
  console.log("[ensure-product-media] created table from drizzle/0004_product_media.sql");
} catch (e) {
  console.error("[ensure-product-media]", e);
  process.exit(1);
} finally {
  await client.end();
}
