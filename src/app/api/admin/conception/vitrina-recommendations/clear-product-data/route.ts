import { NextResponse } from "next/server";
import { migrationHintFromDbMessage } from "@/lib/db-error-migration-hint";
import { requireAdminApi } from "@/server/lib/require-admin-api";
import { clearVitrinaProductAnalyticsData } from "@/server/seller-helper/clear-vitrina-product-analytics";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const gate = await requireAdminApi(req);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  try {
    const body = (await req.json()) as { productId?: string };
    const productId = typeof body.productId === "string" ? body.productId.trim() : "";
    if (!productId) {
      return NextResponse.json({ ok: false, message: "productId is required." }, { status: 400 });
    }

    const result = await clearVitrinaProductAnalyticsData(productId);
    if (!result.ok) {
      return NextResponse.json({ ok: false, message: result.message }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      deletedCount: result.deletedCount,
      message: result.message,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[vitrina-recommendations/clear-product-data]", error);
    return NextResponse.json(
      { error: "database_error", message: migrationHintFromDbMessage(message) ?? message },
      { status: 500 }
    );
  }
}
