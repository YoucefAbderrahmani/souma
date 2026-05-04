import { NextResponse } from "next/server";
import { migrationHintFromDbMessage } from "@/lib/db-error-migration-hint";
import { requireAdminApi } from "@/server/lib/require-admin-api";
import { listConceptionRecommendationsForAdmin } from "@/server/conception/conception-db";

export async function GET(req: Request) {
  const gate = await requireAdminApi(req);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  try {
    const recommendations = await listConceptionRecommendationsForAdmin({ limit: 40 });
    return NextResponse.json({ recommendations });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[conception/recommendations]", e);
    return NextResponse.json(
      {
        error: "database_error",
        message: migrationHintFromDbMessage(message) ?? message,
      },
      { status: 500 }
    );
  }
}
