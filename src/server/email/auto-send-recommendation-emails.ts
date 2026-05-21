import {
  getConceptionRecommendationById,
  moveConceptionRecommendationToInbox,
} from "@/server/conception/conception-db";
import { sendRecommendationRoleEmail } from "@/server/email/send-recommendation-email";
import { isBrevoAutomatedEmailEnabled } from "@/server/email/brevo-config";

export type AutoSendRecommendationEmailsResult = {
  attempted: number;
  sent: number;
  skipped: number;
  failed: number;
  errors: string[];
};

function storeUrlFromEnv(): string | undefined {
  const app = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (app) return app;
  const vercel = process.env.VERCEL_URL?.trim();
  return vercel ? `https://${vercel}` : undefined;
}

/** Sends each new recommendation to its assigned role inbox via Brevo. */
export async function autoSendRecommendationEmails(
  recommendationIds: string[]
): Promise<AutoSendRecommendationEmailsResult> {
  const uniqueIds = Array.from(new Set(recommendationIds.filter(Boolean)));
  const result: AutoSendRecommendationEmailsResult = {
    attempted: uniqueIds.length,
    sent: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  if (uniqueIds.length === 0 || !isBrevoAutomatedEmailEnabled()) {
    result.skipped = uniqueIds.length;
    return result;
  }

  const storeUrl = storeUrlFromEnv();

  for (const id of uniqueIds) {
    const rec = await getConceptionRecommendationById(id);
    if (!rec) {
      result.skipped += 1;
      continue;
    }
    if (!rec.roleEmailConfigured || !rec.roleEmail) {
      result.skipped += 1;
      continue;
    }

    const sendResult = await sendRecommendationRoleEmail({
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

    if (sendResult.ok === true && sendResult.method === "brevo") {
      await moveConceptionRecommendationToInbox(id);
      result.sent += 1;
      continue;
    }

    if (sendResult.ok === false) {
      result.failed += 1;
      if (result.errors.length < 5) {
        result.errors.push(`${rec.title}: ${sendResult.error}`);
      }
    } else {
      result.skipped += 1;
    }
  }

  return result;
}
