export function isBrevoAutomatedEmailEnabled(): boolean {
  return Boolean(process.env.BREVO_API_KEY?.trim());
}

export function getBrevoApiKey(): string | undefined {
  return process.env.BREVO_API_KEY?.trim() || undefined;
}

export function getBrevoTransactionalTemplateId(): number | undefined {
  const raw = process.env.BREVO_TRANSACTIONAL_TEMPLATE_ID?.trim();
  if (!raw) return undefined;
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : undefined;
}

export function getEmailFromRaw(): string {
  return (
    process.env.EMAIL_FROM?.trim() ||
    process.env.BREVO_FROM?.trim() ||
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

export function brevoNotConfiguredMessage(): string {
  return (
    "AI recommendation email is not configured. In Brevo → SMTP & API → API keys, create a key and set BREVO_API_KEY in .env.local (starts with xkeysib-)."
  );
}
