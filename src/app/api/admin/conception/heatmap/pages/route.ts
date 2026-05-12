import { NextResponse } from "next/server";
import { migrationHintFromDbMessage } from "@/lib/db-error-migration-hint";
import { requireAdminApi } from "@/server/lib/require-admin-api";
import { listHeatmapProductPages } from "@/server/conception/product-page-heatmap";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const gate = await requireAdminApi(req);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  try {
    const url = new URL(req.url);
    const windowDays = Number(url.searchParams.get("windowDays") ?? 7);
    const pages = await listHeatmapProductPages({ windowDays });
    return NextResponse.json({ pages });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[conception/heatmap/pages]", error);
    return NextResponse.json(
      {
        error: "database_error",
        message: migrationHintFromDbMessage(message) ?? message,
      },
      { status: 500 }
    );
  }
}
