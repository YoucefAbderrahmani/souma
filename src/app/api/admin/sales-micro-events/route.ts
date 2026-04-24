import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/server/lib/auth";
import { isPrivilegedAdminEmail } from "@/server/lib/admin-access";
import { db } from "@/server/db";
import { user } from "@/server/db/schema";
import {
  listSalesMicroEventsForSession,
  listSalesMicroSessionsForAdmin,
} from "@/server/sales-analyst/micro-events-admin";

async function requireAdmin(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return { ok: false as const, status: 401 as const, error: "Unauthorized" };
  }
  const [current] = await db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);
  if (current?.role !== "admin" && !isPrivilegedAdminEmail(session.user.email)) {
    return { ok: false as const, status: 403 as const, error: "Forbidden" };
  }
  return { ok: true as const };
}

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req);
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
