/**
 * Lists Moosend transactional campaigns so you can copy MOOSEND_TRANSACTIONAL_TEMPLATE_ID.
 *   node scripts/list-moosend-transactional-campaigns.mjs
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env.local") });
dotenv.config({ path: path.join(root, ".env") });

const apiKey = process.env.MOOSEND_API_KEY?.trim();
const host = (process.env.MOOSEND_API_HOST || "https://api.moosend.com").replace(/\/$/, "");

if (!apiKey) {
  console.error("Set MOOSEND_API_KEY in .env.local first.");
  process.exit(1);
}

const url = `${host}/v3/campaigns/1.json?apikey=${encodeURIComponent(apiKey)}`;
const res = await fetch(url, { headers: { Accept: "application/json" } });
const text = await res.text();
let data;
try {
  data = JSON.parse(text);
} catch {
  console.error("Invalid JSON:", text.slice(0, 500));
  process.exit(1);
}

if (data.Code !== 0 && data.Error) {
  console.error("Moosend:", data.Error);
  process.exit(1);
}

const campaigns = data.Context?.Campaigns ?? [];
const transactional = campaigns.filter(
  (c) =>
    c.CampaignType === "Transactional" ||
    c.IsTransactional === true ||
    /transactional/i.test(String(c.CampaignType ?? ""))
);

console.log("\nTransactional campaigns in your Moosend account:\n");
if (transactional.length === 0) {
  console.log("  (none found on page 1)\n");
  console.log("Create one: Campaigns → Transactional campaign → New");
  console.log("Suggested name: Vitrina Store AI Recommendations\n");
  console.log("Then run this script again and add to .env.local:");
  console.log('  MOOSEND_TRANSACTIONAL_TEMPLATE_ID="<ID from below>"\n');
} else {
  for (const c of transactional) {
    console.log(`  Name: ${c.Name}`);
    console.log(`  ID:   ${c.ID}`);
    console.log(`  Status: ${c.Status}  Subject: ${c.Subject ?? "—"}`);
    console.log("");
  }
  console.log("Add to .env.local (use the ID of your campaign):");
  console.log(`MOOSEND_TRANSACTIONAL_TEMPLATE_ID="${transactional[0].ID}"`);
  console.log("\nOr by exact name:");
  console.log(`MOOSEND_TRANSACTIONAL_TEMPLATE_NAME="${transactional[0].Name}"`);
}
