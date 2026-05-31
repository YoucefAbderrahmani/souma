import { NextRequest, NextResponse } from "next/server";
import { migrationHintFromDbMessage } from "@/lib/db-error-migration-hint";
import { requireStaffApi } from "@/server/lib/require-staff-api";
import {
  getProductMicroDetailAdmin,
  listProductMicroAggregatesAdmin,
} from "@/server/sales-analyst/micro-events-by-product";

export async function GET(req: NextRequest) {
  const gate = await requireStaffApi(req);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  try {
    const productIdRaw = req.nextUrl.searchParams.get("productId")?.trim();
    if (productIdRaw) {
      const productId = Number(productIdRaw);
      if (!Number.isFinite(productId) || productId < 1) {
        return NextResponse.json({ error: "invalid_product_id" }, { status: 400 });
      }
      const limitRaw = req.nextUrl.searchParams.get("limit");
      const limit = limitRaw ? Math.min(2000, Math.max(1, Number(limitRaw) || 800)) : 800;
      const detail = await getProductMicroDetailAdmin(productId, { limit });
      if (!detail) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
      }
      return NextResponse.json(detail);
    }

    const maxRaw = req.nextUrl.searchParams.get("limit");
    const max = maxRaw ? Math.min(250, Math.max(1, Number(maxRaw) || 150)) : 150;
    const aggregates = await listProductMicroAggregatesAdmin({ limit: max });
    return NextResponse.json({ aggregates });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[sales-micro-by-product]", e);
    return NextResponse.json(
      {
        error: "database_error",
        message: migrationHintFromDbMessage(message) ?? message,
      },
      { status: 500 }
    );
  }
}
