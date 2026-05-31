import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { migrationHintFromDbMessage } from "@/lib/db-error-migration-hint";
import { clearAllSecurityBlocks } from "@/server/conception/apply-security-quick-fixes";
import { requireStaffApi } from "@/server/lib/require-staff-api";

export async function DELETE(req: Request) {
  const gate = await requireStaffApi(req);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  try {
    const lifted = await clearAllSecurityBlocks();
    return NextResponse.json({ success: true, lifted });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[conception/security DELETE]", e);
    return NextResponse.json(
      {
        error: "database_error",
        message: migrationHintFromDbMessage(message) ?? message,
      },
      { status: 500 }
    );
  }
}
