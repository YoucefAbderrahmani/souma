import { NextResponse } from "next/server";
import { migrationHintFromDbMessage } from "@/lib/db-error-migration-hint";
import { requireStaffApi } from "@/server/lib/require-staff-api";
import { resetVitrinaProductToDefault } from "@/server/seller-helper/applied-action-revert";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const gate = await requireStaffApi(req);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  try {
    const body = (await req.json()) as { actionId?: string; productId?: number };
    const actionId = typeof body.actionId === "string" ? body.actionId.trim() : undefined;
    const productId =
      typeof body.productId === "number" && Number.isFinite(body.productId) ?
        Math.trunc(body.productId)
      : undefined;

    const result = await resetVitrinaProductToDefault({
      actionId: actionId || undefined,
      productLocalId: productId,
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, message: result.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, message: result.message });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[seller-helper/applied-actions/reset-default]", error);
    return NextResponse.json(
      { error: "database_error", message: migrationHintFromDbMessage(message) ?? message },
      { status: 500 }
    );
  }
}
