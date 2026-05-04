import { NextResponse } from "next/server";
import { getEnabledPaEventMap } from "@/server/product-analytics/tracking-config";

export async function GET() {
  try {
    const enabled = await getEnabledPaEventMap();
    return NextResponse.json(
      { enabled },
      {
        headers: {
          "Cache-Control": "public, max-age=15, stale-while-revalidate=60",
        },
      }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (message.includes("product_analytics_tracking_config") || message.includes("does not exist")) {
      const { PA_EVENT_NAMES } = await import("@/lib/pa-whitelist");
      const enabled = Object.fromEntries(PA_EVENT_NAMES.map((n) => [n, true])) as Record<string, boolean>;
      return NextResponse.json({ enabled, degraded: true });
    }
    console.error("[product-analytics/tracking-config]", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
