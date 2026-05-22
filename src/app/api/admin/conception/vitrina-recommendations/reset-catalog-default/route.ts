import { NextResponse } from "next/server";
import { migrationHintFromDbMessage } from "@/lib/db-error-migration-hint";
import { requireAdminApi } from "@/server/lib/require-admin-api";
import { resetAllVitrinaCatalogToDefaultSilent } from "@/server/seller-helper/vitrina-product-reset";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const gate = await requireAdminApi(req);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  try {
    const result = await resetAllVitrinaCatalogToDefaultSilent();
    return NextResponse.json({
      ok: true,
      updatedCount: result.updatedCount,
      message: result.message,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[vitrina-recommendations/reset-catalog-default]", error);
    return NextResponse.json(
      { error: "database_error", message: migrationHintFromDbMessage(message) ?? message },
      { status: 500 }
    );
  }
}
