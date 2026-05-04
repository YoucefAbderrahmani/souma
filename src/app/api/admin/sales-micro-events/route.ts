import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/server/lib/require-admin-api";
import {
  listSalesMicroEventsForSession,
  listSalesMicroSessionsForAdmin,
} from "@/server/sales-analyst/micro-events-admin";

export async function GET(req: NextRequest) {
  const gate = await requireAdminApi(req);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  try {
    const sessionKey = req.nextUrl.searchParams.get("sessionKey")?.trim() ?? "";
    if (sessionKey.length >= 8) {
      const one = await listSalesMicroEventsForSession(sessionKey);
      if (!one) {
        return NextResponse.json({ sessions: [] });
      }
      return NextResponse.json({ sessions: [one] });
    }

    const raw = req.nextUrl.searchParams.get("maxSessions");
    const maxSessions = raw ? Math.min(200, Math.max(1, Number(raw) || 80)) : 80;
    const sessions = await listSalesMicroSessionsForAdmin({ maxSessions });
    return NextResponse.json({ sessions });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[sales-micro-events]", e);
    return NextResponse.json(
      {
        error: "database_error",
        message:
          message.includes("sales_micro_event") || message.includes("does not exist")
            ? 'Missing table "sales_micro_event". Apply drizzle/0003_sales_micro_event.sql on your database.'
            : message,
      },
      { status: 500 }
    );
  }
}
