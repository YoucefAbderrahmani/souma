import { NextRequest, NextResponse } from "next/server";
import { requireStaffApi } from "@/server/lib/require-staff-api";
import {
  getConceptionRecommendationById,
  moveConceptionRecommendationToInbox,
} from "@/server/conception/conception-db";
import { sendRecommendationRoleEmail } from "@/server/email/send-recommendation-email";
import { brevoNotConfiguredMessage, isBrevoAutomatedEmailEnabled } from "@/server/email/brevo-config";

export async function POST(req: NextRequest) {
  const gate = await requireStaffApi(req);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  if (!isBrevoAutomatedEmailEnabled()) {
    return NextResponse.json({ ok: false, error: brevoNotConfiguredMessage() }, { status: 503 });
  }

  try {
    const body = (await req.json()) as { recommendationId?: string };
    const recommendationId = typeof body.recommendationId === "string" ? body.recommendationId.trim() : "";
    if (!recommendationId) {
      return NextResponse.json({ error: "recommendationId is required." }, { status: 400 });
    }

    const rec = await getConceptionRecommendationById(recommendationId);
    if (!rec) {
      return NextResponse.json({ error: "Recommendation not found." }, { status: 404 });
    }
    if (!rec.roleEmailConfigured || !rec.roleEmail) {
      return NextResponse.json(
        {
          error: `No email configured for "${rec.assignedRoleLabel}". Add it in Admin → Assign role emails.`,
        },
        { status: 400 }
      );
    }

    const storeUrl =
      process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL.trim()}` : undefined);

    const result = await sendRecommendationRoleEmail({
      to: rec.roleEmail,
      roleDisplayName: rec.assignedRoleLabel,
      title: rec.title,
      priority: rec.priorityLabel,
      analysis: rec.analysis,
      recommendation: rec.recommendation,
      confidence: rec.confidence,
      revenueHint: rec.revenueHint,
      roiHint: rec.roiHint,
      implementationHint: rec.implementationHint,
      storeUrl,
    });

    if (result.ok === false) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 503 });
    }

    const movedToInbox = await moveConceptionRecommendationToInbox(recommendationId);
    if (!movedToInbox) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Email was sent via Brevo, but the recommendation could not be moved to Inbox. Refresh the page and contact support if it still appears in AI Recommendations.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      method: "brevo",
      messageId: result.messageId ?? null,
      movedToInbox: true,
      message: `Email sent to ${rec.assignedRoleLabel} (${rec.roleEmail}). Moved to Inbox.`,
    });
  } catch (e) {
    console.error("[recommendations/send-email]", e);
    return NextResponse.json({ error: "Failed to send email." }, { status: 500 });
  }
}
