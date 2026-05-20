/** Default website/domain id from https://souma.moosend.com/websites/domain/… */
export const DEFAULT_MOOSEND_DOMAIN_ID = "432057e2-9b81-45f8-853c-e9c4fe9432e7";

export function isMoosendAutomatedEmailEnabled(): boolean {
  return Boolean(process.env.MOOSEND_API_KEY?.trim());
}

export function getMoosendApiKey(): string | undefined {
  return process.env.MOOSEND_API_KEY?.trim() || undefined;
}

/** API host without path, e.g. https://api.moosend.com */
export function getMoosendApiHost(): string {
  const raw =
    process.env.MOOSEND_API_HOST?.trim() ||
    process.env.MOOSEND_API_BASE_URL?.trim()?.replace(/\/v3\/?$/, "") ||
    "https://api.moosend.com";
  return raw.replace(/\/$/, "");
}

export function getMoosendDomainId(): string {
  return process.env.MOOSEND_DOMAIN_ID?.trim() || DEFAULT_MOOSEND_DOMAIN_ID;
}

export function getMoosendTransactionalTemplateId(): string | undefined {
  return process.env.MOOSEND_TRANSACTIONAL_TEMPLATE_ID?.trim() || undefined;
}

/** Create a transactional campaign in Moosend with this exact name, or set MOOSEND_TRANSACTIONAL_TEMPLATE_ID. */
export const DEFAULT_MOOSEND_TRANSACTIONAL_TEMPLATE_NAME = "Vitrina Store AI Recommendations";

export function getMoosendTransactionalTemplateName(): string {
  const fromEnv = process.env.MOOSEND_TRANSACTIONAL_TEMPLATE_NAME?.trim();
  return fromEnv || DEFAULT_MOOSEND_TRANSACTIONAL_TEMPLATE_NAME;
}

export function getMoosendUserId(): string | undefined {
  return process.env.MOOSEND_USER_ID?.trim() || undefined;
}

export function getEmailFromRaw(): string {
  return (
    process.env.EMAIL_FROM?.trim() ||
    process.env.MOOSEND_FROM?.trim() ||
    "Vitrina Store <notifications@your-verified-domain.com>"
  );
}

export function parseEmailFromAddress(from: string): { email: string; name: string } {
  const angle = from.match(/^(.+?)\s*<([^>]+)>$/);
  if (angle) {
    return { name: angle[1].trim().replace(/^"|"$/g, ""), email: angle[2].trim() };
  }
  if (from.includes("@")) {
    return { name: "Vitrina Store", email: from };
  }
  return { name: from || "Vitrina Store", email: "" };
}

export function moosendNotConfiguredMessage(): string {
  return (
    "Automated email is not configured. In Moosend → More → Settings → API key, copy your key and set MOOSEND_API_KEY in .env.local. " +
    `Your website/domain id is ${getMoosendDomainId()} (dashboard only unless you use a transactional template).`
  );
}

export function hasMoosendTransactionalTemplate(): boolean {
  return Boolean(getMoosendTransactionalTemplateId() || getMoosendTransactionalTemplateName());
}

export function moosendTemplateRequiredMessage(): string {
  return (
    "Ajoutez MOOSEND_TRANSACTIONAL_TEMPLATE_ID dans .env.local. " +
    "1) Moosend → Campaigns → Transactional campaign → New (nom suggéré : \"" +
    DEFAULT_MOOSEND_TRANSACTIONAL_TEMPLATE_NAME +
    "\"). 2) Copiez l'ID de la campagne. 3) .env.local : MOOSEND_TRANSACTIONAL_TEMPLATE_ID=\"guid\". " +
    "4) node scripts/list-moosend-transactional-campaigns.mjs pour lister les IDs. 5) Redémarrez npm run dev."
  );
}
