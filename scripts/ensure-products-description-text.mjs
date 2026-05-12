/**
 * Ensures products.description can store structured product content (not varchar(255)).
 * Run: node scripts/ensure-products-description-text.mjs
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
  console.log("[ensure-products-description-text] No database URL env; skip.");
  process.exit(0);
}

console.log("[ensure-products-description-text] using env:", resolved.source);

const client = new pg.Client({ connectionString: resolved.url });
await client.connect();

try {
  await client.query(`
    ALTER TABLE "products"
    ALTER COLUMN "description" TYPE text
    USING "description"::text
  `);
  console.log("[ensure-products-description-text] products.description is text");
} finally {
  await client.end();
}
