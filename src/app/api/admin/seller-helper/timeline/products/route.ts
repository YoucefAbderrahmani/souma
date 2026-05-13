import { NextResponse } from "next/server";
import { migrationHintFromDbMessage } from "@/lib/db-error-migration-hint";
import { requireAdminApi } from "@/server/lib/require-admin-api";
import { listHeatmapProductPages } from "@/server/conception/product-page-heatmap";
import type { TimelineProductOption } from "@/types/seller-helper-timeline";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const gate = await requireAdminApi(req);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  try {
    const url = new URL(req.url);
    const windowDaysRaw = Number(url.searchParams.get("windowDays") ?? 30);
    const windowDays = Number.isFinite(windowDaysRaw) ? windowDaysRaw : 30;

    const pages = await listHeatmapProductPages({ windowDays });
    const products: TimelineProductOption[] = pages.map((page) => ({
      productId: page.productId,
      title: page.title,
      views: page.views,
    }));

    return NextResponse.json({ products });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[seller-helper/timeline/products]", error);
    return NextResponse.json(
      {
        error: "database_error",
        message: migrationHintFromDbMessage(message) ?? message,
      },
      { status: 500 }
    );
  }
}
