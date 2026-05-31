import { NextResponse } from "next/server";
import { migrationHintFromDbMessage } from "@/lib/db-error-migration-hint";
import { requireStaffApi } from "@/server/lib/require-staff-api";
import { clearVitrinaRecommendationsCache } from "@/server/seller-helper/vitrina-recommendations-cache";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const gate = await requireStaffApi(req);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  try {
    await clearVitrinaRecommendationsCache();
    return NextResponse.json({
      ok: true,
      message: "Cleared all generated Vitrina recommendations. Run Analyze to generate a new set.",
      recommendations: [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[vitrina-recommendations/clear]", error);
    return NextResponse.json(
      { error: "database_error", message: migrationHintFromDbMessage(message) ?? message },
      { status: 500 }
    );
  }
}
