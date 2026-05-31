/**
 * Probe Postgres connectivity and detect Neon data-transfer quota errors.
 *   node scripts/check-neon-quota.mjs
 */
import dotenv from "dotenv";
import pg from "pg";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const KEYS = [
  "POSTGRES_URL",
  "NEON_DATABASE_URL",
  "DATABASE_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL_NON_POOLING",
];

function resolveUrl() {
  for (const k of KEYS) {
    const v = process.env[k]?.trim();
    if (v) return { url: v, source: k };
  }
  return null;
}

function safeHostDb(url) {
  try {
    const u = new URL(url.replace(/^postgres:/, "http:"));
    return { host: u.hostname, database: (u.pathname || "/").replace(/^\//, "") || "(default)" };
  } catch {
    return { host: "(parse error)", database: "?" };
  }
}

function isQuotaError(err) {
  const text = [
    err?.message,
    err?.cause?.message,
    String(err),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return /exceeded the data transfer quota|data transfer quota|upgrade your plan|transfer limit|compute time quota|quota exceeded/i.test(
    text
  );
}

const resolved = resolveUrl();
if (!resolved) {
  console.log(JSON.stringify({ ok: false, error: "no_database_url", checked: KEYS }, null, 2));
  process.exit(1);
}

const { host, database } = safeHostDb(resolved.url);
const client = new pg.Client({
  connectionString: resolved.url,
  ssl: host.includes("neon") ? { rejectUnauthorized: false } : undefined,
});

const out = {
  envKey: resolved.source,
  host,
  database,
  connected: false,
  quotaReached: false,
  queries: {},
  error: null,
};

try {
  await client.connect();
  out.connected = true;

  const ping = await client.query("SELECT NOW() AS ts, version() AS v");
  out.queries.ping = { ok: true, ts: ping.rows[0]?.ts };

  const counts = await client.query(`
    SELECT
      (SELECT COUNT(*)::bigint FROM sales_micro_event) AS micro_events,
      (SELECT COUNT(*)::bigint FROM products) AS products,
      (SELECT COUNT(*)::bigint FROM "user") AS users
  `);
  out.queries.counts = counts.rows[0];

  const recent = await client.query(`
    SELECT COUNT(*)::bigint AS events_24h
    FROM sales_micro_event
    WHERE created_at >= NOW() - INTERVAL '24 hours'
  `);
  out.queries.eventsLast24h = recent.rows[0]?.events_24h;
} catch (e) {
  out.connected = false;
  out.quotaReached = isQuotaError(e);
  out.error = e instanceof Error ? e.message : String(e);
  if (out.quotaReached) {
    out.hint =
      "Neon data transfer (or compute) quota appears exceeded. Upgrade plan or wait for monthly reset in Neon console.";
  }
} finally {
  await client.end().catch(() => {});
}

out.status = out.quotaReached
  ? "QUOTA_REACHED"
  : out.connected
    ? "OK"
    : "ERROR";

console.log(JSON.stringify(out, null, 2));
process.exit(out.quotaReached ? 2 : out.connected ? 0 : 1);
