/**
 * Test Moosend transactional send. Usage:
 *   node scripts/test-moosend-send.mjs you@recipient.com
 */
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env.local") });
dotenv.config({ path: path.join(root, ".env") });

const apiKey = process.env.MOOSEND_API_KEY?.trim();
const to = process.argv[2]?.trim() || process.env.MOOSEND_TEST_TO?.trim();
const host = (process.env.MOOSEND_API_HOST || "https://api.moosend.com").replace(/\/$/, "");

function parseFrom(raw) {
  const m = raw?.match(/^(.+?)\s*<([^>]+)>$/);
  if (m) return { name: m[1].trim(), email: m[2].trim() };
  return { name: "Vitrina Store", email: raw?.trim() || "" };
}

if (!apiKey) {
  console.error("Missing MOOSEND_API_KEY in .env.local");
  process.exit(1);
}
if (!to) {
  console.error("Usage: node scripts/test-moosend-send.mjs recipient@email.com");
  process.exit(1);
}

const from = parseFrom(process.env.EMAIL_FROM || process.env.MOOSEND_FROM);
if (!from.email) {
  console.error("Missing EMAIL_FROM in .env.local");
  process.exit(1);
}

const subject = "[Vitrina Store] Moosend test";
const html = "<p>Test email from Vitrina Store Seller Helper.</p>";

const templateId = process.env.MOOSEND_TRANSACTIONAL_TEMPLATE_ID?.trim();
const templateName = process.env.MOOSEND_TRANSACTIONAL_TEMPLATE_NAME?.trim();
if (!templateId && !templateName) {
  console.error(
    "Missing MOOSEND_TRANSACTIONAL_TEMPLATE_ID or MOOSEND_TRANSACTIONAL_TEMPLATE_NAME.\n" +
      "Create Campaigns → Transactional campaign in Moosend, then add the campaign GUID to .env.local"
  );
  process.exit(1);
}

const body = {
  Subject: subject,
  From: { Email: from.email, sendersName: from.name },
  MailSettings: {
    BypassUnsubscribeManagement: { Enable: true },
    UnsubscribeLinkManagement: { IncludeUnsubscribeLink: false },
  },
  Personalizations: [{ To: [{ Email: to, Name: "Test" }] }],
};
if (templateId) body.TemplateId = templateId;
else if (templateName) body.TemplateName = templateName;
else body.Content = [{ Type: "text/html", Value: html }];

const url = `${host}/v3/campaigns/transactional/send.json?apikey=${encodeURIComponent(apiKey)}`;
console.log("POST", url.replace(apiKey, "***"));
console.log("From:", from.email, "To:", to);

const res = await fetch(url, {
  method: "POST",
  headers: { Accept: "application/json", "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
const text = await res.text();
console.log("Status:", res.status);
console.log("Body:", text);
