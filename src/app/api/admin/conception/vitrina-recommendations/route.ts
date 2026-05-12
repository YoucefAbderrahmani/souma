import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { migrationHintFromDbMessage } from "@/lib/db-error-migration-hint";
import { requireAdminApi } from "@/server/lib/require-admin-api";
import { listVitrinaProductMarketingRecommendations } from "@/server/seller-helper/product-marketing-recommendations";

export async function GET(req: Request) {
  const gate = await requireAdminApi(req);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  try {
    const recommendations = await listVitrinaProductMarketingRecommendations();
    return NextResponse.json({ recommendations });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[conception/vitrina-recommendations]", e);
    return NextResponse.json(
      {
        error: "database_error",
        message: migrationHintFromDbMessage(message) ?? message,
      },
      { status: 500 }
    );
  }
}
