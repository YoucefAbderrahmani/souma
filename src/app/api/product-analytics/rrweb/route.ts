import { NextRequest, NextResponse } from "next/server";
import {
  isNeonDataTransferQuotaError,
  noteDatabaseOutage,
} from "@/server/db-degraded";
import { migrationHintFromDbMessage } from "@/lib/db-error-migration-hint";
import { appendProductPageRrwebEvents } from "@/server/product-page-rrweb";

const MAX_EVENTS_PER_REQUEST = 120;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      sessionKey?: string;
      productId?: number;
      events?: unknown[];
    };

    const headerSession = req.headers.get("x-sequence-session")?.trim() ?? "";
    const bodySession = typeof body.sessionKey === "string" ? body.sessionKey.trim() : "";
    const sessionKey = (headerSession.length >= 8 ? headerSession : bodySession) || "";
    if (sessionKey.length < 8) {
      return NextResponse.json({ ok: false, error: "Missing session." }, { status: 400 });
    }

    const productId =
      typeof body.productId === "number" && Number.isFinite(body.productId)
        ? Math.trunc(body.productId)
        : NaN;
    if (!Number.isFinite(productId) || productId <= 0) {
      return NextResponse.json({ ok: false, error: "Invalid productId." }, { status: 400 });
    }

    const events = Array.isArray(body.events) ? body.events : [];
    if (events.length === 0) {
      return NextResponse.json({ ok: true, stored: 0 });
    }
    if (events.length > MAX_EVENTS_PER_REQUEST) {
      return NextResponse.json({ ok: false, error: "Too many events." }, { status: 400 });
    }

    const { stored } = await appendProductPageRrwebEvents(productId, events);
    return NextResponse.json({ ok: true, stored });
  } catch (error) {
    if (isNeonDataTransferQuotaError(error)) {
      noteDatabaseOutage();
      return NextResponse.json({ ok: false, error: "database_unavailable" }, { status: 503 });
    }
    const message = error instanceof Error ? error.message : String(error);
    console.error("[product-analytics/rrweb]", error);
    return NextResponse.json(
      {
        ok: false,
        error: "database_error",
        message: migrationHintFromDbMessage(message) ?? message,
      },
      { status: 500 }
    );
  }
}
