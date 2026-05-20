import { isValidEmail } from "@/lib/recommendation-roles";
import {
  getEmailFromRaw,
  getMoosendApiHost,
  getMoosendApiKey,
  getMoosendTransactionalTemplateId,
  getMoosendTransactionalTemplateName,
  getMoosendUserId,
  isMoosendAutomatedEmailEnabled,
  moosendNotConfiguredMessage,
  moosendTemplateRequiredMessage,
  parseEmailFromAddress,
} from "@/server/email/moosend-config";

export type RecommendationEmailPayload = {
  to: string;
  roleDisplayName: string;
  title: string;
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
  const subject = `[Vitrina Store] AI recommendation — ${payload.title}`;
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

type MoosendSendResponse = {
  TotalAccepted?: number;
  TotalExcluded?: number;
  ExcludedRecipients?: { Email?: string; Reason?: string }[];
  Error?: string;
  Code?: number;
  Context?: string | null;
};

function parseMoosendApiError(parsed: MoosendSendResponse, raw: string, status: number): string {
  if (parsed.Error) {
    const code = parsed.Code != null ? ` (${parsed.Code})` : "";
    return `Moosend${code}: ${parsed.Error}`;
  }
  if (!raw && status >= 400) {
    return `Moosend HTTP ${status}`;
  }
  return raw.slice(0, 300) || `Moosend HTTP ${status}`;
}

function hasMoosendApiError(parsed: MoosendSendResponse): boolean {
  if (parsed.Error?.trim()) return true;
  if (typeof parsed.Code === "number" && parsed.Code >= 400) return true;
  return false;
}

async function sendViaMoosend(
  payload: RecommendationEmailPayload
): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiKey = getMoosendApiKey();
  if (!apiKey) {
    return { ok: false, error: moosendNotConfiguredMessage() };
  }

  const templateId = getMoosendTransactionalTemplateId();
  const templateName = getMoosendTransactionalTemplateName();

  const fromParsed = parseEmailFromAddress(getEmailFromRaw());
  if (!fromParsed.email) {
    return {
      ok: false,
      error: "Set EMAIL_FROM in .env.local to your verified Moosend sender (e.g. Vitrina Store <youcefabderrahmani1711@gmail.com>).",
    };
  }

  const { subject, html } = buildEmailBodies(payload);
  const userId = getMoosendUserId();
  const useTemplate = Boolean(templateId || templateName);

  const substitutions = {
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
  };

  // One content type per request. With a template, body HTML comes from Moosend — do not also send Content.
  const body: Record<string, unknown> = {
    Subject: subject,
    From: {
      Email: fromParsed.email,
      sendersName: fromParsed.name,
    },
    MailSettings: {
      BypassUnsubscribeManagement: { Enable: true },
      UnsubscribeLinkManagement: { IncludeUnsubscribeLink: false },
    },
    Personalizations: [
      {
        To: [{ Email: payload.to, Name: payload.roleDisplayName }],
        Substitutions: substitutions,
      },
    ],
  };

  if (userId) body.userId = userId;
  if (templateId) body.TemplateId = templateId;
  else if (templateName) body.TemplateName = templateName;

  if (!useTemplate) {
    body.Content = [{ Type: "text/html", Value: html }];
  }

  const url = `${getMoosendApiHost()}/v3/campaigns/transactional/send.json?apikey=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const raw = await response.text().catch(() => "");
  let parsed: MoosendSendResponse = {};
  try {
    parsed = raw ? (JSON.parse(raw) as MoosendSendResponse) : {};
  } catch {
    parsed = {};
  }

  if (!response.ok || hasMoosendApiError(parsed)) {
    return { ok: false, error: parseMoosendApiError(parsed, raw, response.status) };
  }

  const accepted = Number(parsed.TotalAccepted ?? 0);
  if (accepted < 1) {
    const excluded = parsed.ExcludedRecipients?.[0];
    const reason =
      parsed.Error?.trim() ||
      excluded?.Reason ||
      moosendTemplateRequiredMessage();
    return { ok: false, error: reason.includes("TemplateId") ? moosendTemplateRequiredMessage() : `Moosend did not send: ${reason}` };
  }

  return { ok: true };
}

export async function sendRecommendationRoleEmail(
  payload: RecommendationEmailPayload
): Promise<{ ok: true; method: "moosend" } | { ok: false; error: string }> {
  if (!isValidEmail(payload.to)) {
    return { ok: false, error: "No valid email configured for this role." };
  }

  if (!isMoosendAutomatedEmailEnabled()) {
    return { ok: false, error: moosendNotConfiguredMessage() };
  }

  const result = await sendViaMoosend(payload);
  if (result.ok === true) {
    return { ok: true, method: "moosend" };
  }

  return { ok: false, error: result.error };
}
