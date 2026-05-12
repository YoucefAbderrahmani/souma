/**
 * Ensures conception_security_block exists for Seller Helper security quick fixes.
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
  console.log("[ensure-conception-security-block] No database URL env; skip.");
  process.exit(0);
}

console.log("[ensure-conception-security-block] using env:", resolved.source);

const client = new pg.Client({ connectionString: resolved.url });
await client.connect();

try {
  await client.query(`
    CREATE TABLE IF NOT EXISTS "conception_security_block" (
      "session_key" varchar(64) PRIMARY KEY,
      "reason" text NOT NULL,
      "blocked_at" timestamp NOT NULL DEFAULT now(),
      "lifted_at" timestamp,
      "source" varchar(32) NOT NULL DEFAULT 'manual'
    )
  `);
  console.log("[ensure-conception-security-block] table ensured");
} finally {
  await client.end();
}
