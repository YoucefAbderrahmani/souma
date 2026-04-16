import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/lib/auth";
import { resolveSequenceKeyMaybe } from "@/app/api/sequence/_cookie";
import { logAssistantClickTelemetry } from "@/server/assistant/telemetry-db";

type AssistantTelemetryRequest = {
  eventType?: "result_click";
  requestId?: string;
  mode?: "detail" | "jomla";
  rawQuery?: string;
  normalizedQuery?: string;
  productId?: number;
  position?: number;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AssistantTelemetryRequest;
    if (body.eventType !== "result_click") {
      return NextResponse.json({ ok: false, error: "Invalid event type." }, { status: 400 });
    }

    const requestId = String(body.requestId ?? "").trim();
    const mode = body.mode === "jomla" ? "jomla" : "detail";
    const productId = Number(body.productId ?? 0);
    const position = Number(body.position ?? -1);

    if (!requestId || requestId.length < 6) {
      return NextResponse.json({ ok: false, error: "Missing requestId." }, { status: 400 });
    }
    if (!Number.isFinite(productId) || productId <= 0) {
      return NextResponse.json({ ok: false, error: "Invalid productId." }, { status: 400 });
    }
    if (!Number.isFinite(position) || position < 0) {
      return NextResponse.json({ ok: false, error: "Invalid position." }, { status: 400 });
    }

    const sessionKey = resolveSequenceKeyMaybe(req);
    let userId: string | null = null;
    try {
      const session = await auth.api.getSession({ headers: req.headers });
      userId = session?.user?.id ?? null;
    } catch {
      userId = null;
    }

    await logAssistantClickTelemetry({
      requestId,
      sessionKey,
      userId,
      mode,
      rawQuery: body.rawQuery,
      normalizedQuery: body.normalizedQuery,
      clickedProductId: productId,
      clickedPosition: position,
    });

    return NextResponse.json({ ok: true });
  } catch {
    // Never fail UI interaction for telemetry collection errors.
    return NextResponse.json({ ok: true });
  }
}
