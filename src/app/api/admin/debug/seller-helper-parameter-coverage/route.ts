import { NextResponse } from "next/server";
import { and, eq, gte, sql } from "drizzle-orm";
import { requireAdminApi } from "@/server/lib/require-admin-api";
import { db } from "@/server/db";
import { salesMicroEventTable } from "@/server/db/schema";
import { SELLER_HELPER_PARAMETER_SPECS } from "@/lib/seller-helper-parameter-spec";

function hasJsonTextKeyExpr(key: string) {
  return sql<number>`count(*) filter (where nullif(trim(coalesce(${salesMicroEventTable.payloadJson}::jsonb->>${key}, '')), '') is not null)::int`;
}

/**
 * Admin-only coverage report for Seller Helper parameters over the last 7 days.
 */
export async function GET(req: Request) {
  const gate = await requireAdminApi(req);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const report: Array<{
    event: string;
    totalRows7d: number;
    legacy: Array<{ key: string; present: number }>;
    added: Array<{ key: string; present: number }>;
    usedByDashboard: string[];
  }> = [];

  for (const spec of SELLER_HELPER_PARAMETER_SPECS) {
    const [tot] = await db
      .select({ n: sql<number>`count(*)::int`.as("n") })
      .from(salesMicroEventTable)
      .where(and(gte(salesMicroEventTable.createdAt, since), eq(salesMicroEventTable.eventName, spec.event)));
    const total = Number(tot?.n ?? 0);

    const legacy = [];
    for (const key of spec.legacyParameters) {
      const [row] = await db
        .select({ n: hasJsonTextKeyExpr(key).as("n") })
        .from(salesMicroEventTable)
        .where(and(gte(salesMicroEventTable.createdAt, since), eq(salesMicroEventTable.eventName, spec.event)));
      legacy.push({ key, present: Number(row?.n ?? 0) });
    }

    const added = [];
    for (const key of spec.newParameters) {
      const [row] = await db
        .select({ n: hasJsonTextKeyExpr(key).as("n") })
        .from(salesMicroEventTable)
        .where(and(gte(salesMicroEventTable.createdAt, since), eq(salesMicroEventTable.eventName, spec.event)));
      added.push({ key, present: Number(row?.n ?? 0) });
    }

    report.push({
      event: spec.event,
      totalRows7d: total,
      legacy,
      added,
      usedByDashboard: spec.usedByDashboard,
    });
  }

  return NextResponse.json({
    windowDays: 7,
    generatedAt: new Date().toISOString(),
    report,
  });
}

