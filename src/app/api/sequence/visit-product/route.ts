import { NextRequest, NextResponse } from "next/server";
import { resolveSequenceKeyMaybe } from "@/app/api/sequence/_cookie";
import { markProductVisited } from "@/server/sequence/sequence-db";
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
    await markProductVisited(sessionKey);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (isNeonDataTransferQuotaError(e)) {
      noteDatabaseOutage();
      return NextResponse.json({ ok: true, offline: true });
    }
    return NextResponse.json({ error: "Failed to mark visit" }, { status: 500 });
  }
}
