/**
 * Ensures `storefront_hidden_product` exists — keeps admin-deleted items off the storefront
 * even when the same title exists in bundled shopData.
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
  console.log("[ensure-storefront-hidden-product] No database URL env; skip.");
  process.exit(0);
}

console.log("[ensure-storefront-hidden-product] using env:", resolved.source);

const sqlPath = path.join(root, "drizzle", "0015_storefront_hidden_product.sql");
const client = new pg.Client({ connectionString: resolved.url });

try {
  await client.connect();
  const check = await client.query(
    `select 1 from information_schema.tables where table_schema = 'public' and table_name = 'storefront_hidden_product' limit 1`
  );
  if (check.rowCount === 0) {
    const sql = fs.readFileSync(sqlPath, "utf8");
    await client.query(sql);
    console.log("[ensure-storefront-hidden-product] created table.");
  } else {
    console.log("[ensure-storefront-hidden-product] table already exists.");
  }

  const retiredTitles = [
    "Logitech G Pro X Headset",
    "HyperX Cloud II Headset",
  ];
  for (const title of retiredTitles) {
    const normalizedTitle = title.toLowerCase().trim().replace(/\s+/g, " ");
    await client.query(
      `insert into storefront_hidden_product (normalized_title, title, hidden_at)
       values ($1, $2, now())
       on conflict (normalized_title) do update set title = excluded.title, hidden_at = now()`,
      [normalizedTitle, title]
    );
  }
  console.log("[ensure-storefront-hidden-product] ensured retired headset exclusions.");
} catch (e) {
  exitBuildScriptOnError(e, "ensure-storefront-hidden-product");
} finally {
  await client.end();
}
