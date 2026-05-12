/**
 * Ensures conception_alert.dismissal_kind exists (resolved vs ignored dismissals).
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
  console.log("[ensure-conception-alert-dismissal-kind] No database URL; skip.");
  process.exit(0);
}

console.log("[ensure-conception-alert-dismissal-kind] using env:", resolved.source);

const client = new pg.Client({ connectionString: resolved.url });

try {
  await client.connect();
  await client.query(
    'ALTER TABLE "conception_alert" ADD COLUMN IF NOT EXISTS "dismissal_kind" varchar(16)'
  );
  console.log("[ensure-conception-alert-dismissal-kind] dismissal_kind column ensured");
} catch (error) {
  console.error("[ensure-conception-alert-dismissal-kind]", error?.message || error);
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
