import dotenv from "dotenv";
import pg from "pg";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const keys = [
  "POSTGRES_URL",
  "NEON_DATABASE_URL",
  "DATABASE_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL_NON_POOLING",
];
let connectionString;
let source;
for (const k of keys) {
  const v = process.env[k]?.trim();
  if (v) {
    connectionString = v;
    source = k;
    break;
  }
}

if (!connectionString) {
  console.error("No database URL in env (checked:", keys.join(", "), ")");
  process.exit(1);
}

const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
await client.connect();
const { rows } = await client.query(
  "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"
);
const names = rows.map((r) => r.tablename);
console.log("env_key:", source);
console.log("public_tables_count:", names.length);
const need = ["user", "session", "account", "verification"];
for (const t of need) {
  console.log(`table_${t}:`, names.includes(t) ? "ok" : "MISSING");
}
await client.end();
