import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import {
  resolveDatabaseConnectionSource,
  resolveDatabaseConnectionString,
  safeDatabaseHostAndDatabase,
} from "@/lib/database-url";
import { requireAdminApi } from "@/server/lib/require-admin-api";
import { db } from "@/server/db";

/**
 * Admin-only: which env var supplied the DB URL, host/database (no secrets),
 * and whether `public.sales_micro_event` exists on that connection.
 */
export async function GET(req: Request) {
  const gate = await requireAdminApi(req);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const raw = resolveDatabaseConnectionString();
  const source = resolveDatabaseConnectionSource();
  if (!raw) {
    return NextResponse.json(
      {
        error: "no_database_url",
        resolvedFrom: null,
        hint: "Set POSTGRES_URL / NEON_DATABASE_URL (preferred on Vercel), or set DATABASE_URL.",
      },
      { status: 500 }
    );
  }

  const target = safeDatabaseHostAndDatabase(raw);
  if ("error" in target) {
    return NextResponse.json(
      { resolvedFrom: source, parseError: target.error, tableSalesMicroEvent: null },
      { status: 500 }
    );
  }

  let tableSalesMicroEvent: string | null = null;
  let probeError: string | null = null;
  try {
    const r = await db.execute(
      sql`SELECT to_regclass('public.sales_micro_event')::text AS t`
    );
    const row = r.rows[0] as { t?: unknown } | undefined;
    const t = row?.t;
    tableSalesMicroEvent = t == null || t === "" ? null : String(t);
  } catch (e) {
    probeError = e instanceof Error ? e.message : String(e);
  }

  return NextResponse.json({
    resolvedFrom: source,
    ...target,
    tableSalesMicroEvent,
    probeError,
    hint:
      tableSalesMicroEvent == null
        ? "This server’s DB URL points at a database without public.sales_micro_event. Run drizzle/0003 on THIS database, or copy Neon’s connection string into POSTGRES_URL / NEON_DATABASE_URL (or DATABASE_URL) and redeploy."
        : "Table exists on this connection. If Seller Helper still errors, check Network tab for /api/admin/conception/overview.",
  });
}
