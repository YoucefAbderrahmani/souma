import { NextResponse } from "next/server";
import { requireAdminApi } from "@/server/lib/require-admin-api";
import { runConceptionAnalysisJob } from "@/server/conception/analyze";

export async function POST(req: Request) {
  const gate = await requireAdminApi(req);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  try {
    const result = await runConceptionAnalysisJob();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[conception/analyze]", e);
    return NextResponse.json({ error: "analyze_failed", message }, { status: 500 });
  }
}
