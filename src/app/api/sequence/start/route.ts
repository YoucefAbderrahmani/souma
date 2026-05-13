import { NextRequest, NextResponse } from "next/server";
import { resolveSequenceKey } from "@/app/api/sequence/_cookie";
import { isNeonDataTransferQuotaError, noteDatabaseOutage } from "@/server/db-degraded";
import { tryResolveUserIdFromBetterAuthCookieCache } from "@/server/lib/auth-session-guard";
import {
  supersedeActiveAndInsertSequence,
  type SequenceTriggerType,
} from "@/server/sequence/sequence-db";

const ALLOWED: SequenceTriggerType[] = ["search", "category", "product"];

export async function POST(req: NextRequest) {
  const res = NextResponse.json({ ok: true });
  try {
    let body: { triggerType?: string; triggerLabel?: string };
    try {
      body = (await req.json()) as { triggerType?: string; triggerLabel?: string };
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const sessionKey = resolveSequenceKey(req, res);
    const triggerType = body.triggerType as SequenceTriggerType;
    const triggerLabel = String(body.triggerLabel ?? "").trim();

    if (!ALLOWED.includes(triggerType) || !triggerLabel) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const userId = await tryResolveUserIdFromBetterAuthCookieCache(req);

    try {
      await supersedeActiveAndInsertSequence({
        sessionKey,
        userId,
        triggerType,
        triggerLabel,
      });
    } catch (e) {
      if (isNeonDataTransferQuotaError(e)) {
        noteDatabaseOutage();
        return NextResponse.json(
          { ok: true, offline: true },
          { status: 200, headers: res.headers }
        );
      }
      throw e;
    }

    return res;
  } catch {
    return NextResponse.json({ error: "Failed to record sequence" }, { status: 500 });
  }
}
