import { NextResponse } from "next/server";
import { migrationHintFromDbMessage } from "@/lib/db-error-migration-hint";
import { parseVitrinaFixesPerItemParam } from "@/lib/vitrina-fixes-per-item";
import { requireAdminApi } from "@/server/lib/require-admin-api";
import { runConceptionAnalysisJob } from "@/server/conception/analyze";

export async function POST(req: Request) {
  const gate = await requireAdminApi(req);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  let fixesPerItem: number | undefined;
  try {
    const body = (await req.json()) as { fixesPerItem?: unknown };
    fixesPerItem = parseVitrinaFixesPerItemParam(body?.fixesPerItem);
  } catch {
    fixesPerItem = parseVitrinaFixesPerItemParam(undefined);
  }

  try {
    const result = await runConceptionAnalysisJob({ fixesPerItem });
    return NextResponse.json({ ok: true, fixesPerItem, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[conception/analyze]", e);
    return NextResponse.json(
      { error: "analyze_failed", message: migrationHintFromDbMessage(message) ?? message },
      { status: 500 }
    );
  }
}
