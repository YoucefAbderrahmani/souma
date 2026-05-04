import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";

const _databaseUrl = process.env.DATABASE_URL;
export const db = drizzle(_databaseUrl!);

/** Safe for logs: hostname + database name only (no password). */
export function getSafeDatabaseTargetForDebug():
  | { host: string; database: string }
  | { error: string } {
  const raw = _databaseUrl;
  if (!raw || !String(raw).trim()) return { error: "DATABASE_URL_empty" };
  try {
    const u = new URL(raw);
    const database = (u.pathname || "").replace(/^\//, "").split("?")[0];
    return { host: u.hostname, database: database || "(none)" };
  } catch {
    return { error: "DATABASE_URL_parse_failed" };
  }
}

let _agentDb820737Logged = false;
function agentLogDb820737Init() {
  if (_agentDb820737Logged) return;
  _agentDb820737Logged = true;
  const t = getSafeDatabaseTargetForDebug();
  const payload = {
    sessionId: "820737",
    hypothesisId: "H1-H2-H3",
    location: "server/db/index.ts:init",
    message: "db_module_loaded",
    data: {
      dbTarget: t,
      hasDatabaseUrl: Boolean(_databaseUrl),
      hasPostgresUrl: Boolean(process.env.POSTGRES_URL),
      hasNeonDatabaseUrl: Boolean(process.env.NEON_DATABASE_URL),
    },
    timestamp: Date.now(),
  };
  // #region agent log
  fetch("http://127.0.0.1:7829/ingest/48cd1d4a-4901-4a42-83a9-bbccfdc314b9", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "820737" },
    body: JSON.stringify(payload),
  }).catch(() => {});
  console.error("[AGENT_DEBUG_820737]", JSON.stringify(payload));
  // #endregion
}
agentLogDb820737Init();
