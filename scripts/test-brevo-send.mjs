/**
 * Test Brevo transactional send. Usage:
 *   node scripts/test-brevo-send.mjs recipient@email.com
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env.local") });
dotenv.config({ path: path.join(root, ".env") });

const apiKey = process.env.BREVO_API_KEY?.trim();
const to = process.argv[2]?.trim() || process.env.BREVO_TEST_TO?.trim();

function parseFrom(raw) {
  const m = raw?.match(/^(.+?)\s*<([^>]+)>$/);
  if (m) return { name: m[1].trim(), email: m[2].trim() };
  return { name: "Vitrina Store", email: raw?.trim() || "" };
}

if (!apiKey) {
  console.error("Missing BREVO_API_KEY in .env.local");
  process.exit(1);
}
if (!to) {
  console.error("Usage: node scripts/test-brevo-send.mjs recipient@email.com");
  process.exit(1);
}

const from = parseFrom(process.env.EMAIL_FROM || process.env.BREVO_FROM);
if (!from.email) {
  console.error("Missing EMAIL_FROM in .env.local");
  process.exit(1);
}

const body = {
  sender: { name: from.name, email: from.email },
  to: [{ email: to, name: "Test" }],
  subject: "[Vitrina Store] Brevo test",
  htmlContent: "<p>Test email from Vitrina Store Seller Helper via Brevo.</p>",
  textContent: "Test email from Vitrina Store Seller Helper via Brevo.",
};

const templateId = process.env.BREVO_TRANSACTIONAL_TEMPLATE_ID?.trim();
if (templateId) body.templateId = Number(templateId);

const res = await fetch("https://api.brevo.com/v3/smtp/email", {
  method: "POST",
  headers: {
    accept: "application/json",
    "content-type": "application/json",
    "api-key": apiKey,
  },
  body: JSON.stringify(body),
});

const text = await res.text();
console.log("Status:", res.status);
console.log("Body:", text);
