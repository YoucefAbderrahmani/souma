import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/lib/auth";
import { insertSalesMicroEvents } from "@/server/sales-analyst/micro-events-db";
import { isPaEventName } from "@/lib/pa-whitelist";
import { getDisabledPaEventNames } from "@/server/product-analytics/tracking-config";

const MAX_EVENTS = 60;
const MAX_NAME = 80;

type IncomingEvent = {
  name?: string;
  payload?: unknown;
  clientTs?: number;
};

function parseClientTs(v: unknown): Date | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      sessionKey?: string;
      pagePath?: string;
      referrer?: string | null;
      productId?: number;
      productTitle?: string;
      events?: IncomingEvent[];
    };

    const headerSession = req.headers.get("x-sequence-session")?.trim() ?? "";
    const bodySession = typeof body.sessionKey === "string" ? body.sessionKey.trim() : "";
    const sessionKey = (headerSession.length >= 8 ? headerSession : bodySession) || "";
    if (sessionKey.length < 8) {
      return NextResponse.json({ ok: false, error: "Missing session." }, { status: 400 });
    }

    const pagePath =
      typeof body.pagePath === "string" && body.pagePath.trim() ? body.pagePath.trim() : "/";
    const referrer =
      body.referrer === null || body.referrer === undefined
        ? null
        : typeof body.referrer === "string"
          ? body.referrer
          : null;

    const rawEvents = Array.isArray(body.events) ? body.events : [];
    if (rawEvents.length === 0) {
      return NextResponse.json({ ok: true, inserted: 0 });
    }
    if (rawEvents.length > MAX_EVENTS) {
      return NextResponse.json({ ok: false, error: "Too many events." }, { status: 400 });
    }

    let userId: string | null = null;
    try {
      const session = await auth.api.getSession({ headers: req.headers });
      userId = session?.user?.id ?? null;
    } catch {
      userId = null;
    }

    const productLocalId =
      typeof body.productId === "number" && Number.isFinite(body.productId)
        ? Math.trunc(body.productId)
        : null;
    const productTitle =
      typeof body.productTitle === "string" && body.productTitle.trim()
        ? body.productTitle.trim().slice(0, 500)
        : null;

    let disabledNames: Set<string> = new Set();
    try {
      disabledNames = await getDisabledPaEventNames();
    } catch {
      disabledNames = new Set();
    }

    const rows: Parameters<typeof insertSalesMicroEvents>[0] = [];
    let seq = 0;
    for (const ev of rawEvents) {
      const name = typeof ev.name === "string" ? ev.name.trim() : "";
      if (!name || name.length > MAX_NAME) continue;
      if (!isPaEventName(name)) continue;
      if (disabledNames.has(name)) continue;
      const payload =
        ev.payload !== undefined && ev.payload !== null && typeof ev.payload === "object" && !Array.isArray(ev.payload)
          ? (ev.payload as Record<string, unknown>)
          : null;

      rows.push({
        sessionKey,
        userId,
        productLocalId,
        productTitle: productTitle ? productTitle.slice(0, 500) : null,
        pagePath,
        referrer,
        eventName: name,
        payload,
        clientEventAt: parseClientTs(ev.clientTs),
        sequenceIndex: seq++,
      });
    }

    if (rows.length === 0) {
      return NextResponse.json({ ok: true, inserted: 0 });
    }

    await insertSalesMicroEvents(rows);
    return NextResponse.json({ ok: true, inserted: rows.length });
  } catch {
    return NextResponse.json({ ok: true, inserted: 0 });
  }
}

