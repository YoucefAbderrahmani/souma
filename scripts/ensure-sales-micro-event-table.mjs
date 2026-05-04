/**
 * Ensures `sales_micro_event` exists (Neon / Postgres).
 * Uses the same env priority as `src/lib/database-url.ts` (DATABASE_URL, POSTGRES_URL, …).
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
  console.log("[ensure-sales-micro-event] No DATABASE_URL / POSTGRES_URL / NEON_DATABASE_URL; skip.");
  process.exit(0);
}

console.log("[ensure-sales-micro-event] using env:", resolved.source);

const sqlPath = path.join(root, "drizzle", "0003_sales_micro_event.sql");
const client = new pg.Client({ connectionString: resolved.url });

try {
  await client.connect();
  const check = await client.query(
    `select 1 from information_schema.tables where table_schema = 'public' and table_name = 'sales_micro_event' limit 1`
  );
  if (check.rowCount > 0) {
    console.log("[ensure-sales-micro-event] table already exists.");
    process.exit(0);
  }
  const sql = fs.readFileSync(sqlPath, "utf8");
  await client.query(sql);
  console.log("[ensure-sales-micro-event] created table from drizzle/0003_sales_micro_event.sql");
} catch (e) {
  console.error("[ensure-sales-micro-event]", e?.message || e);
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
