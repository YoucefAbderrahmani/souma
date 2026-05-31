import { NextResponse } from "next/server";
import { migrationHintFromDbMessage } from "@/lib/db-error-migration-hint";
import { clearConversionFunnelData } from "@/server/conception/clear-funnel-data";
import { requireStaffApi } from "@/server/lib/require-staff-api";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const gate = await requireStaffApi(req);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  try {
    const result = await clearConversionFunnelData();
    return NextResponse.json({
      ok: true,
      deletedCount: result.deletedCount,
      message: result.message,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[conception/funnel/clear]", error);
    return NextResponse.json(
      { error: "database_error", message: migrationHintFromDbMessage(message) ?? message },
      { status: 500 }
    );
  }
}
