import { NextRequest, NextResponse } from "next/server";
import { createSiteFeedback, listSiteFeedbacks } from "@/server/reviews/reviews-db";
import {
  isNeonDataTransferQuotaError,
  noteDatabaseOutage,
} from "@/server/db-degraded";
import { tryResolveUserIdFromBetterAuthCookieCache } from "@/server/lib/auth-session-guard";

export async function GET() {
  try {
    const feedbacks = await listSiteFeedbacks(30);
    return NextResponse.json({ feedbacks });
  } catch (e) {
    if (isNeonDataTransferQuotaError(e)) {
      noteDatabaseOutage();
      return NextResponse.json({ feedbacks: [], offline: true });
    }
    return NextResponse.json({ error: "Failed to load feedbacks." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await tryResolveUserIdFromBetterAuthCookieCache(req);
    if (!userId) {
      return NextResponse.json({ error: "Please sign in to share feedback." }, { status: 401 });
    }

    const body = (await req.json()) as {
      rating?: number;
      comment?: string;
    };

    const rating = Number(body.rating ?? 0);
    const comment = String(body.comment ?? "").trim();

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5." }, { status: 400 });
    }

    if (comment.length < 6 || comment.length > 500) {
      return NextResponse.json(
        { error: "Feedback must be between 6 and 500 characters." },
        { status: 400 }
      );
    }

    await createSiteFeedback({
      userId,
      rating,
      comment,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to submit feedback." }, { status: 500 });
  }
}
