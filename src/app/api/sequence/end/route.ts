import { NextRequest, NextResponse } from "next/server";
import { resolveSequenceKeyMaybe } from "@/app/api/sequence/_cookie";
import { endActiveSequenceIfVisitedProduct } from "@/server/sequence/sequence-db";
import {
  isNeonDataTransferQuotaError,
  noteDatabaseOutage,
} from "@/server/db-degraded";

export async function POST(req: NextRequest) {
  try {
    const sessionKey = resolveSequenceKeyMaybe(req);
    if (!sessionKey) {
      return NextResponse.json({ ok: true });
    }

    const body = (await req.json()) as { reason?: string };
    const reason = body.reason === "purchase" ? "purchase" : "leave";

    await endActiveSequenceIfVisitedProduct(sessionKey, reason);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (isNeonDataTransferQuotaError(e)) {
      noteDatabaseOutage();
      return NextResponse.json({ ok: true, offline: true });
    }
    return NextResponse.json({ error: "Failed to end sequence" }, { status: 500 });
  }
}
