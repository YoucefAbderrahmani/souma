/**
 * One-off migration: adds products.jomla_price if missing (Souma pricing).
 * Run: node scripts/ensure-jomla-price-column.mjs
 */
import dotenv from "dotenv";
import pg from "pg";

dotenv.config({ path: ".env.local" });
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL missing in .env.local");
  process.exit(1);
}
const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  await client.query(
    'ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "jomla_price" integer'
  );
  console.log("jomla_price column ensured");
} finally {
  await client.end();
}
