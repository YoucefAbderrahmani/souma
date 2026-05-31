import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import { exitBuildScriptOnError } from "./lib/build-script-exit.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

dotenv.config({ path: path.join(root, ".env.local") });
dotenv.config({ path: path.join(root, ".env") });

const KEYS = ["POSTGRES_URL", "NEON_DATABASE_URL", "DATABASE_URL", "POSTGRES_PRISMA_URL"];

function resolveUrl() {
  for (const k of KEYS) {
    const v = process.env[k]?.trim();
    if (v) return { url: v, source: k };
  }
  return null;
}

const resolved = resolveUrl();
if (!resolved) {
  console.log("[ensure-user-cart] No database URL; skip.");
  process.exit(0);
}

const client = new pg.Client({ connectionString: resolved.url });

try {
  await client.connect();
  await client.query(`
    CREATE TABLE IF NOT EXISTS user_cart (
      user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
      items_json text NOT NULL DEFAULT '[]',
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  console.log("[ensure-user-cart] table ready (env:", resolved.source + ")");
} catch (e) {
  exitBuildScriptOnError(e, "ensure-user-cart");
} finally {
  await client.end().catch(() => {});
}
