/**
 * Ensures conception_alert_settings table exists (singleton JSON for alert thresholds).
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
  console.log("[ensure-conception-alert-settings] No database URL env; skip.");
  process.exit(0);
}

console.log("[ensure-conception-alert-settings] using env:", resolved.source);

const client = new pg.Client({ connectionString: resolved.url });
await client.connect();

try {
  await client.query(`
    CREATE TABLE IF NOT EXISTS "conception_alert_settings" (
      "id" varchar(16) PRIMARY KEY DEFAULT 'default',
      "settings_json" text NOT NULL,
      "updated_at" timestamp NOT NULL DEFAULT now()
    )
  `);
  await client.query(`
    INSERT INTO "conception_alert_settings" ("id", "settings_json")
    VALUES ('default', '{}')
    ON CONFLICT ("id") DO NOTHING
  `);
  console.log("[ensure-conception-alert-settings] OK");
} finally {
  await client.end();
}
