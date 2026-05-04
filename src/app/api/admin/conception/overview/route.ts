import { NextResponse } from "next/server";
import { requireAdminApi } from "@/server/lib/require-admin-api";
import { buildConceptionOverview } from "@/server/conception/metrics";

export async function GET(req: Request) {
  const gate = await requireAdminApi(req);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  try {
    const overview = await buildConceptionOverview();
    return NextResponse.json({ overview });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[conception/overview]", e);
    return NextResponse.json(
      {
        error: "database_error",
        message:
          message.includes("sales_micro_event") || message.includes("does not exist")
            ? "Missing analytics tables. Apply drizzle migrations (sales_micro_event, conception_*)."
            : message,
      },
      { status: 500 }
    );
  }
}
