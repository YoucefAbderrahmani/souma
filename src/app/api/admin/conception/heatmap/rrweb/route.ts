import { NextResponse } from "next/server";
import { migrationHintFromDbMessage } from "@/lib/db-error-migration-hint";
import { requireAdminApi } from "@/server/lib/require-admin-api";
import { getProductPageRrwebEvents } from "@/server/product-page-rrweb";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const gate = await requireAdminApi(req);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  try {
    const url = new URL(req.url);
    const productId = Number(url.searchParams.get("productId") ?? NaN);
    if (!Number.isFinite(productId) || productId <= 0) {
      return NextResponse.json(
        { error: "invalid_query", message: "Expected productId query parameter." },
        { status: 400 }
      );
    }

    const recording = await getProductPageRrwebEvents(productId);
    if (!recording) {
      return NextResponse.json({
        recording: null,
        productId,
        events: [],
        updatedAt: null,
      });
    }

    return NextResponse.json({
      recording: {
        productId: recording.productId,
        eventCount: recording.events.length,
        updatedAt: recording.updatedAt?.toISOString() ?? null,
      },
      productId: recording.productId,
      events: recording.events,
      updatedAt: recording.updatedAt?.toISOString() ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[conception/heatmap/rrweb]", error);
    return NextResponse.json(
      {
        error: "database_error",
        message: migrationHintFromDbMessage(message) ?? message,
      },
      { status: 500 }
    );
  }
}
