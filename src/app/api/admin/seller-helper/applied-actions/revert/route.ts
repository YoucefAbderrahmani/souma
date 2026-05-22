import { NextResponse } from "next/server";
import { migrationHintFromDbMessage } from "@/lib/db-error-migration-hint";
import { requireAdminApi } from "@/server/lib/require-admin-api";
import { revertAppliedActionToChokepoint } from "@/server/seller-helper/applied-action-revert";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const gate = await requireAdminApi(req);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  try {
    const body = (await req.json()) as { actionId?: string };
    const actionId = typeof body.actionId === "string" ? body.actionId.trim() : "";
    if (!actionId) {
      return NextResponse.json({ error: "actionId is required." }, { status: 400 });
    }

    const result = await revertAppliedActionToChokepoint(actionId);
    if (!result.ok) {
      return NextResponse.json({ ok: false, message: result.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, message: result.message });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[seller-helper/applied-actions/revert]", error);
    return NextResponse.json(
      { error: "database_error", message: migrationHintFromDbMessage(message) ?? message },
      { status: 500 }
    );
  }
}
