import { NextResponse } from "next/server";
import { migrationHintFromDbMessage } from "@/lib/db-error-migration-hint";
import { requireAdminApi } from "@/server/lib/require-admin-api";
import { getProductPageHeatmap } from "@/server/conception/product-page-heatmap";
import type { ConceptionHeatmapMetric } from "@/types/conception-heatmap";

export const dynamic = "force-dynamic";

function parseMetric(value: string | null): ConceptionHeatmapMetric {
  if (value === "hover" || value === "click") return value;
  return "view";
}

export async function GET(req: Request) {
  const gate = await requireAdminApi(req);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  try {
    const url = new URL(req.url);
    const productId = Number(url.searchParams.get("productId") ?? NaN);
    const metric = parseMetric(url.searchParams.get("metric"));
    const windowDays = Number(url.searchParams.get("windowDays") ?? 7);

    if (!Number.isFinite(productId) || productId <= 0) {
      return NextResponse.json(
        { error: "invalid_query", message: "Expected productId query parameter." },
        { status: 400 }
      );
    }

    const heatmap = await getProductPageHeatmap({ productId, metric, windowDays });
    if (!heatmap) {
      return NextResponse.json({ error: "not_found", message: "Product not found." }, { status: 404 });
    }

    return NextResponse.json({ heatmap });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[conception/heatmap]", error);
    return NextResponse.json(
      {
        error: "database_error",
        message: migrationHintFromDbMessage(message) ?? message,
      },
      { status: 500 }
    );
  }
}
