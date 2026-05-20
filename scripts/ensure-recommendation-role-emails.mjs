/**
 * Ensures recommendation_role_email table and conception_recommendation.assigned_role_key exist.
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
  console.log("[ensure-recommendation-role-emails] No database URL env; skip.");
  process.exit(0);
}

console.log("[ensure-recommendation-role-emails] using env:", resolved.source);

const client = new pg.Client({ connectionString: resolved.url });
await client.connect();

try {
  await client.query(`
    CREATE TABLE IF NOT EXISTS "recommendation_role_email" (
      "role_key" varchar(64) PRIMARY KEY NOT NULL,
      "display_name" varchar(120) NOT NULL,
      "email" varchar(255) NOT NULL DEFAULT '',
      "updated_at" timestamp NOT NULL DEFAULT now(),
      "created_at" timestamp NOT NULL DEFAULT now()
    )
  `);
  await client.query(`
    INSERT INTO "recommendation_role_email" ("role_key", "display_name", "email")
    VALUES
      ('marketing_agent', 'Marketing agent', ''),
      ('technical_support', 'Technical support', '')
    ON CONFLICT ("role_key") DO NOTHING
  `);
  await client.query(`
    ALTER TABLE "conception_recommendation"
    ADD COLUMN IF NOT EXISTS "assigned_role_key" varchar(64)
  `);
  console.log("[ensure-recommendation-role-emails] OK");
} finally {
  await client.end();
}
