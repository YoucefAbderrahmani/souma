import { NextResponse } from "next/server";
import { migrationHintFromDbMessage } from "@/lib/db-error-migration-hint";
import { requireAdminApi } from "@/server/lib/require-admin-api";
import { buildConceptionOverview } from "@/server/conception/metrics";
import {
  listConceptionAlertsForAdmin,
  listConceptionRecommendationsForAdmin,
} from "@/server/conception/conception-db";

type ProbeResult =
  | { ok: true; count?: number }
  | { ok: false; rawMessage: string; hintedMessage: string };

async function probeOverview(): Promise<ProbeResult> {
  try {
    const overview = await buildConceptionOverview();
    return { ok: true, count: overview.kpis?.length ?? 0 };
  } catch (e) {
    const rawMessage = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      rawMessage,
      hintedMessage: migrationHintFromDbMessage(rawMessage) ?? rawMessage,
    };
  }
}

async function probeAlerts(): Promise<ProbeResult> {
  try {
    const alerts = await listConceptionAlertsForAdmin({ limit: 5 });
    return { ok: true, count: alerts.length };
  } catch (e) {
    const rawMessage = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      rawMessage,
      hintedMessage: migrationHintFromDbMessage(rawMessage) ?? rawMessage,
    };
  }
}

async function probeRecommendations(): Promise<ProbeResult> {
  try {
    const recommendations = await listConceptionRecommendationsForAdmin({ limit: 5 });
    return { ok: true, count: recommendations.length };
  } catch (e) {
    const rawMessage = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      rawMessage,
      hintedMessage: migrationHintFromDbMessage(rawMessage) ?? rawMessage,
    };
  }
}

/**
 * Admin-only diagnostic endpoint to identify which conception backend query fails
 * and show the raw Postgres message vs mapped migration hint.
 */
export async function GET(req: Request) {
  const gate = await requireAdminApi(req);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const [overview, alerts, recommendations] = await Promise.all([
    probeOverview(),
    probeAlerts(),
    probeRecommendations(),
  ]);

  return NextResponse.json({
    overview,
    alerts,
    recommendations,
  });
}

