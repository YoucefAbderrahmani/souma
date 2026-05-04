import { NextResponse } from "next/server";
import { migrationHintFromDbMessage } from "@/lib/db-error-migration-hint";
import { requireAdminApi } from "@/server/lib/require-admin-api";
import { buildConceptionOverview } from "@/server/conception/metrics";
import { getSafeDatabaseTargetForDebug } from "@/server/db";

export async function GET(req: Request) {
  const gate = await requireAdminApi(req);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  try {
    const overview = await buildConceptionOverview();
    return NextResponse.json({ overview });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[conception/overview]", e);
    const dbTarget = getSafeDatabaseTargetForDebug();
    const hint = migrationHintFromDbMessage(message);
    const payload = {
      sessionId: "820737",
      hypothesisId: "H1-H4",
      location: "api/admin/conception/overview/route.ts:catch",
      message: "conception_overview_failed",
      data: {
        dbTarget,
        rawErrorSnippet: message.slice(0, 500),
        hintApplied: Boolean(hint),
        responseMessage: hint ?? message.slice(0, 500),
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
    return NextResponse.json(
      {
        error: "database_error",
        message: hint ?? message,
      },
      { status: 500 }
    );
  }
}
