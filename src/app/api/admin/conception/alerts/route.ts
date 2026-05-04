import { NextResponse } from "next/server";
import { requireAdminApi } from "@/server/lib/require-admin-api";
import { listConceptionAlertsForAdmin } from "@/server/conception/conception-db";

export async function GET(req: Request) {
  const gate = await requireAdminApi(req);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  try {
    const alerts = await listConceptionAlertsForAdmin({ limit: 50 });
    return NextResponse.json({ alerts });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[conception/alerts]", e);
    return NextResponse.json(
      {
        error: "database_error",
        message:
          message.includes("conception_alert") || message.includes("does not exist")
            ? 'Missing table "conception_alert". Apply drizzle/0007_conception_intel.sql.'
            : message,
      },
      { status: 500 }
    );
  }
}
