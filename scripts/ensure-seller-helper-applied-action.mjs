/**
 * Ensures seller_helper_applied_action exists.
 * Stores audit checkpoints rendered on the Seller Helper Timeline chart
 * (quick fixes, alert resolutions, recommendation dismissals, etc.).
 */
import dotenv from "dotenv";
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
  for (const key of KEYS) {
    const value = process.env[key]?.trim();
    if (value) return { url: value, source: key };
  }
  return null;
}

const resolved = resolveUrl();
if (!resolved) {
  console.log("[ensure-seller-helper-applied-action] No database URL env; skip.");
  process.exit(0);
}

console.log("[ensure-seller-helper-applied-action] using env:", resolved.source);

const client = new pg.Client({ connectionString: resolved.url });
await client.connect();

try {
  await client.query(`
    CREATE TABLE IF NOT EXISTS "seller_helper_applied_action" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "kind" varchar(32) NOT NULL,
      "title" varchar(200) NOT NULL,
      "summary" text,
      "product_local_id" integer,
      "product_title" varchar(200),
      "source_ref_id" varchar(80),
      "details_json" text,
      "occurred_at" timestamp NOT NULL DEFAULT now()
    )
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS "seller_helper_applied_action_occurred_at_idx"
      ON "seller_helper_applied_action" ("occurred_at")
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS "seller_helper_applied_action_product_local_id_idx"
      ON "seller_helper_applied_action" ("product_local_id")
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS "seller_helper_applied_action_kind_idx"
      ON "seller_helper_applied_action" ("kind")
  `);

  console.log("[ensure-seller-helper-applied-action] table ensured");
} finally {
  await client.end();
}
