import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { migrationHintFromDbMessage } from "@/lib/db-error-migration-hint";
import { analyzeConceptionAlertById } from "@/server/conception/alert-detail-analysis";
import { requireAdminApi } from "@/server/lib/require-admin-api";

export async function POST(req: Request) {
  const gate = await requireAdminApi(req);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  try {
    const body = (await req.json()) as { id?: unknown };
    const id = typeof body.id === "string" ? body.id.trim() : "";
    if (!id) {
      return NextResponse.json({ error: "invalid_body", message: "Expected { id: string }" }, { status: 400 });
    }

    const analysis = await analyzeConceptionAlertById(id);
    if (!analysis) {
      return NextResponse.json({ error: "not_found", message: "Alert not found." }, { status: 404 });
    }

    return NextResponse.json({ analysis });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[conception/alerts/detail]", e);
    return NextResponse.json(
      {
        error: "analysis_failed",
        message: migrationHintFromDbMessage(message) ?? message,
      },
      { status: 500 }
    );
  }
}
