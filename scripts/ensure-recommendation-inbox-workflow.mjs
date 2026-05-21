/**
 * Ensures conception_recommendation inbox workflow columns exist.
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
  console.log("[ensure-recommendation-inbox-workflow] No database URL env; skip.");
  process.exit(0);
}

console.log("[ensure-recommendation-inbox-workflow] using env:", resolved.source);

const client = new pg.Client({ connectionString: resolved.url });
await client.connect();

try {
  await client.query(`
    ALTER TABLE "conception_recommendation"
    ADD COLUMN IF NOT EXISTS "workflow_status" varchar(20) NOT NULL DEFAULT 'active'
  `);
  await client.query(`
    ALTER TABLE "conception_recommendation"
    ADD COLUMN IF NOT EXISTS "inbox_at" timestamp
  `);
  await client.query(`
    ALTER TABLE "conception_recommendation"
    ADD COLUMN IF NOT EXISTS "email_sent_at" timestamp
  `);
  await client.query(`
    ALTER TABLE "conception_recommendation"
    ADD COLUMN IF NOT EXISTS "implemented_at" timestamp
  `);
  console.log("[ensure-recommendation-inbox-workflow] OK");
} finally {
  await client.end();
}
