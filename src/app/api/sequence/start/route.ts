import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/lib/auth";
import { resolveSequenceKey } from "@/app/api/sequence/_cookie";
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

    const session = await auth.api.getSession({ headers: req.headers });
    const userId = session?.user?.id ?? null;

    await supersedeActiveAndInsertSequence({
      sessionKey,
      userId,
      triggerType,
      triggerLabel,
    });

    return res;
  } catch {
    return NextResponse.json({ error: "Failed to record sequence" }, { status: 500 });
  }
}
