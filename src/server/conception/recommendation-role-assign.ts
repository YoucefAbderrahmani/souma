import { normalizeRoleKey } from "@/lib/recommendation-roles";

const TECHNICAL_PATTERNS =
  /\b(chargily|payment|paiement|checkout|api|integration|bug|error|javascript|js_|serveur|server|database|neon|quota|performance|lcp|chargement|technique|technical|support|404|500|crash)\b/i;

const MARKETING_PATTERNS =
  /\b(conversion|marketing|merchandising|vitrina|promo|promotion|prix|price|seo|campaign|funnel|abandon|panier|cart|cta|image|title|titre|catalogue|catalog|stock|review|avis|brand|marque)\b/i;

/**
 * Picks the best role for a recommendation from registered role keys (falls back to keyword rules).
 */
export function inferAssignedRoleKey(
  input: { title: string; analysis: string; recommendation: string },
  registeredRoleKeys: string[]
): string {
  const text = `${input.title} ${input.analysis} ${input.recommendation}`;
  const keys = new Set(registeredRoleKeys.map(normalizeRoleKey).filter(Boolean));

  const preferTechnical = TECHNICAL_PATTERNS.test(text);
  const preferMarketing = MARKETING_PATTERNS.test(text);

  if (preferTechnical && !preferMarketing && keys.has("technical_support")) {
    return "technical_support";
  }
  if (preferMarketing && keys.has("marketing_agent")) {
    return "marketing_agent";
  }
  if (preferTechnical && keys.has("technical_support")) {
    return "technical_support";
  }
  if (keys.has("marketing_agent")) return "marketing_agent";
  if (keys.has("technical_support")) return "technical_support";
  return registeredRoleKeys[0] ? normalizeRoleKey(registeredRoleKeys[0]) : "marketing_agent";
}

export function resolveAssignedRoleKey(
  stored: string | null | undefined,
  input: { title: string; analysis: string; recommendation: string },
  registeredRoleKeys: string[]
): string {
  const normalized = stored ? normalizeRoleKey(stored) : "";
  if (normalized && registeredRoleKeys.map(normalizeRoleKey).includes(normalized)) {
    return normalized;
  }
  return inferAssignedRoleKey(input, registeredRoleKeys);
}
