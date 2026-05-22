import { z } from "zod";
import { normalizeRoleKey } from "@/lib/recommendation-roles";
import { getRoleEmailMap } from "@/server/conception/recommendation-role-emails-db";
import {
  brevoNotConfiguredMessage,
  isBrevoAutomatedEmailEnabled,
} from "@/server/email/brevo-config";
import {
  getOpenRouterApiKey,
  parseOpenRouterJsonResponse,
  requestOpenRouterChatCompletion,
} from "@/server/lib/openrouter-client";
import { sendRecommendationRoleEmail } from "@/server/email/send-recommendation-email";
import { getAppliedActionRowById } from "@/server/seller-helper/applied-action-revert";
import type { AppliedActionKind } from "@/types/seller-helper-timeline";

const revertEmailSchema = z.object({
  subject: z.string().min(1).max(200),
  greeting: z.string().min(1).max(400),
  body: z.string().min(1).max(4000),
  closing: z.string().min(1).max(400),
});

function safeParseDetails(json: string | null | undefined): Record<string, unknown> {
  if (!json) return {};
  try {
    const parsed = JSON.parse(json);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
}

async function draftRevertEmailWithLlm(payload: {
  roleDisplayName: string;
  actionTitle: string;
  actionSummary: string | null;
  occurredAt: string;
  recommendationTitle: string;
  analysis: string;
  recommendation: string;
  implementationHint: string | null;
}) {
  const model = process.env.OPENROUTER_MODEL?.trim() || "google/gemini-2.5-flash-preview";
  const { raw } = await requestOpenRouterChatCompletion({
    model,
    temperature: 0.3,
    maxTokens: 1200,
    system: `You write professional, concise Brevo-ready emails for Vitrina Store Seller Helper.
Return JSON only: { "subject", "greeting", "body", "closing" }.
The email asks the recipient to UNDO or REVERT specific storefront changes they applied from an AI recommendation.
Be specific about what to revert using the provided context. Tone: polite, direct, operational. English.`,
    user: JSON.stringify(payload, null, 2),
  });
  return revertEmailSchema.parse(parseOpenRouterJsonResponse(raw));
}

export async function sendAppliedRecommendationRevertEmail(actionId: string): Promise<{
  ok: boolean;
  message: string;
}> {
  if (!isBrevoAutomatedEmailEnabled()) {
    return { ok: false, message: brevoNotConfiguredMessage() };
  }
  if (!getOpenRouterApiKey()) {
    return { ok: false, message: "OPENROUTER_API_KEY is not configured (needed to draft the email)." };
  }

  const row = await getAppliedActionRowById(actionId);
  if (!row) return { ok: false, message: "Log entry not found." };

  const kind = row.kind as AppliedActionKind;
  if (kind !== "ai_recommendation") {
    return { ok: false, message: "Revert emails are only available for AI recommendation log entries." };
  }

  const details = safeParseDetails(row.detailsJson);
  const assignedRoleKey =
    typeof details.assignedRoleKey === "string" ? normalizeRoleKey(details.assignedRoleKey) : "";
  const recommendationTitle = row.title
    .replace(/^Recommendation (implemented|dismissed) · /i, "")
    .trim();

  const roleMap = await getRoleEmailMap();
  const roleMeta = assignedRoleKey ? roleMap.get(assignedRoleKey) : undefined;
  const to = roleMeta?.email?.trim() ?? "";
  if (!to) {
    return {
      ok: false,
      message: assignedRoleKey ?
        `No email configured for role “${roleMeta?.displayName ?? assignedRoleKey}”. Add it in Admin → Assign role emails.`
      : "No assigned role on this recommendation. Configure role emails in Admin.",
    };
  }

  const draft = await draftRevertEmailWithLlm({
    roleDisplayName: roleMeta?.displayName ?? assignedRoleKey.replace(/_/g, " "),
    actionTitle: row.title,
    actionSummary: row.summary,
    occurredAt: row.occurredAt.toISOString(),
    recommendationTitle,
    analysis: String(details.analysis ?? row.summary ?? ""),
    recommendation: String(details.recommendation ?? row.summary ?? ""),
    implementationHint:
      typeof details.implementationHint === "string" ? details.implementationHint : null,
  });

  const storeUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL.trim()}` : undefined);

  const fullRecommendation = [
    draft.greeting,
    "",
    draft.body,
    "",
    draft.closing,
    storeUrl ? `\nStore: ${storeUrl}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const result = await sendRecommendationRoleEmail({
    to,
    roleDisplayName: roleMeta?.displayName ?? "team",
    subject: draft.subject.startsWith("[") ? draft.subject : `[Vitrina Store] ${draft.subject}`,
    title: recommendationTitle,
    priority: "revert request",
    analysis: `Applied on ${row.occurredAt.toISOString()}\n\n${row.summary ?? ""}`,
    recommendation: fullRecommendation,
    confidence: 100,
    revenueHint: null,
    roiHint: null,
    implementationHint: "Please revert the changes listed above.",
    storeUrl,
  });

  if (result.ok === false) {
    return { ok: false, message: result.error };
  }

  return {
    ok: true,
    message: `Revert request emailed to ${roleMeta?.displayName ?? assignedRoleKey} (${to}).`,
  };
}
