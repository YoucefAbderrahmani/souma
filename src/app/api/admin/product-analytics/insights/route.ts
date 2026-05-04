import { NextResponse } from "next/server";
import { requireAdminApi } from "@/server/lib/require-admin-api";
import { computeProductAnalyticsInsights } from "@/server/product-analytics/compute-insights";

export async function GET(req: Request) {
  const gate = await requireAdminApi(req);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  try {
    const url = new URL(req.url);
    const days = Math.min(90, Math.max(1, Number(url.searchParams.get("days")) || 7));
    const insights = await computeProductAnalyticsInsights(days);
    return NextResponse.json({ insights });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[product-analytics/insights]", e);
    return NextResponse.json({ error: "database_error", message }, { status: 500 });
  }
}
