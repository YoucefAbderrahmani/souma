import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { migrationHintFromDbMessage } from "@/lib/db-error-migration-hint";
import { parseVitrinaFixesPerItemParam } from "@/lib/vitrina-fixes-per-item";
import { requireStaffApi } from "@/server/lib/require-staff-api";
import { listVitrinaProductMarketingRecommendations } from "@/server/seller-helper/product-marketing-recommendations";
import {
  readVitrinaRecommendationsCache,
  writeVitrinaRecommendationsCache,
} from "@/server/seller-helper/vitrina-recommendations-cache";
import { capVitrinaRecommendationsList } from "@/types/vitrina-product-recommendations";

export async function GET(req: Request) {
  const gate = await requireStaffApi(req);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const url = new URL(req.url);
  const fixesPerItem = parseVitrinaFixesPerItemParam(url.searchParams.get("fixesPerItem"));
  const regenerate = url.searchParams.get("regenerate") === "1";

  try {
    let recommendations = await readVitrinaRecommendationsCache(fixesPerItem);

    if (regenerate || recommendations.length === 0) {
      const generated = await listVitrinaProductMarketingRecommendations();
      if (generated.length > 0) {
        await writeVitrinaRecommendationsCache(generated);
      }
      recommendations = capVitrinaRecommendationsList(generated, fixesPerItem);
    }

    return NextResponse.json({ recommendations, fixesPerItem });
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
