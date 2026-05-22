import { isValidEmail } from "@/lib/recommendation-roles";
import {
  brevoNotConfiguredMessage,
  getBrevoApiKey,
  getBrevoTransactionalTemplateId,
  getEmailFromRaw,
  isBrevoAutomatedEmailEnabled,
  parseEmailFromAddress,
} from "@/server/email/brevo-config";

export type RecommendationEmailPayload = {
  to: string;
  roleDisplayName: string;
  /** Used in body; subject uses `subject` when provided. */
  title: string;
  /** Optional full subject line (skips default AI recommendation prefix). */
  subject?: string;
  priority: string;
  analysis: string;
  recommendation: string;
  confidence: number;
  revenueHint: string | null;
  roiHint: string | null;
  implementationHint: string | null;
  storeUrl?: string;
};

function buildEmailBodies(payload: RecommendationEmailPayload) {
  const subject =
    payload.subject?.trim() ||
    `[Vitrina Store] AI recommendation — ${payload.title}`;
  const text = [
    `Hello ${payload.roleDisplayName} team,`,
    "",
    "A new AI recommendation was generated for the storefront:",
    "",
    `Title: ${payload.title}`,
    `Priority: ${payload.priority}`,
    `Confidence: ${payload.confidence}%`,
    payload.revenueHint ? `Est. revenue: ${payload.revenueHint}` : null,
    payload.roiHint ? `Est. ROI: ${payload.roiHint}` : null,
    payload.implementationHint ? `Implementation: ${payload.implementationHint}` : null,
    "",
    "Analysis:",
    payload.analysis,
    "",
    "Recommended action:",
    payload.recommendation,
    "",
    payload.storeUrl ? `Store: ${payload.storeUrl}` : null,
    "",
    "— Vitrina Store Seller Helper",
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
    <p>Hello <strong>${escapeHtml(payload.roleDisplayName)}</strong> team,</p>
    <p>A new <strong>AI recommendation</strong> was assigned to your role:</p>
    <h2 style="color:#F27A1A;margin:0 0 8px">${escapeHtml(payload.title)}</h2>
    <p><strong>Priority:</strong> ${escapeHtml(payload.priority)} &nbsp;|&nbsp;
    <strong>Confidence:</strong> ${payload.confidence}%</p>
    <ul>
      ${payload.revenueHint ? `<li><strong>Est. revenue:</strong> ${escapeHtml(payload.revenueHint)}</li>` : ""}
      ${payload.roiHint ? `<li><strong>Est. ROI:</strong> ${escapeHtml(payload.roiHint)}</li>` : ""}
      ${payload.implementationHint ? `<li><strong>Implementation:</strong> ${escapeHtml(payload.implementationHint)}</li>` : ""}
    </ul>
    <h3>Analysis</h3>
    <p>${escapeHtml(payload.analysis).replace(/\n/g, "<br/>")}</p>
    <h3>Recommendation</h3>
    <p>${escapeHtml(payload.recommendation).replace(/\n/g, "<br/>")}</p>
    ${payload.storeUrl ? `<p><a href="${escapeHtml(payload.storeUrl)}">Open storefront</a></p>` : ""}
    <p style="color:#6B7280;font-size:12px">— Vitrina Store Seller Helper</p>
  `;

  return { subject, text, html };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type BrevoErrorBody = {
  message?: string;
  code?: string;
};

async function sendViaBrevo(
  payload: RecommendationEmailPayload
): Promise<{ ok: true; messageId?: string } | { ok: false; error: string }> {
  const apiKey = getBrevoApiKey();
  if (!apiKey) {
    return { ok: false, error: brevoNotConfiguredMessage() };
  }

  const fromParsed = parseEmailFromAddress(getEmailFromRaw());
  if (!fromParsed.email) {
    return {
      ok: false,
      error: "Set EMAIL_FROM in .env.local to a verified Brevo sender (e.g. Vitrina Store <you@yourdomain.com>).",
    };
  }

  const { subject, text, html } = buildEmailBodies(payload);
  const templateId = getBrevoTransactionalTemplateId();

  const body: Record<string, unknown> = {
    sender: { name: fromParsed.name, email: fromParsed.email },
    to: [{ email: payload.to, name: payload.roleDisplayName }],
    subject,
    htmlContent: html,
    textContent: text,
    params: {
      role_name: payload.roleDisplayName,
      title: payload.title,
      priority: payload.priority,
      confidence: String(payload.confidence),
      analysis: payload.analysis,
      recommendation: payload.recommendation,
      revenue_hint: payload.revenueHint ?? "",
      roi_hint: payload.roiHint ?? "",
      implementation_hint: payload.implementationHint ?? "",
      store_url: payload.storeUrl ?? "",
    },
  };

  if (templateId) {
    body.templateId = templateId;
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify(body),
  });

  const raw = await response.text().catch(() => "");
  let parsed: { messageId?: string } & BrevoErrorBody = {};
  try {
    parsed = raw ? (JSON.parse(raw) as typeof parsed) : {};
  } catch {
    parsed = {};
  }

  if (!response.ok) {
    const detail = parsed.message || raw.slice(0, 300) || response.statusText;
    return { ok: false, error: `Brevo (${response.status}): ${detail}` };
  }

  return { ok: true, messageId: parsed.messageId };
}

export async function sendRecommendationRoleEmail(
  payload: RecommendationEmailPayload
): Promise<{ ok: true; method: "brevo"; messageId?: string } | { ok: false; error: string }> {
  if (!isValidEmail(payload.to)) {
    return { ok: false, error: "No valid email configured for this role." };
  }

  if (!isBrevoAutomatedEmailEnabled()) {
    return { ok: false, error: brevoNotConfiguredMessage() };
  }

  const result = await sendViaBrevo(payload);
  if (result.ok === true) {
    return { ok: true, method: "brevo", messageId: result.messageId };
  }

  return { ok: false, error: result.error };
}
