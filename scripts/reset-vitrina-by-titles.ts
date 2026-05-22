/**
 * Reset Vitrina quick-fix fields for named products (no timeline log).
 * Usage: npx tsx scripts/reset-vitrina-by-titles.ts
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

dotenv.config({ path: path.join(root, ".env.local") });
dotenv.config({ path: path.join(root, ".env") });

const TARGET_TITLES = [
  "Logitech MX Master 3 Mouse",
  "Apple iMac M1 24-inch 2021",
  "Pants",
];

async function main() {
  const { resetVitrinaForProductTitlesSilent, clearSuppressLiveHeroReviewOverlayForTitles } =
    await import("../src/server/seller-helper/vitrina-product-reset");

  const result = await resetVitrinaForProductTitlesSilent(TARGET_TITLES);
  console.log(result.message);
  console.log("Matched:", result.matchedTitles);
  console.log("Updated:", result.updatedCount);

  const overlay = await clearSuppressLiveHeroReviewOverlayForTitles(TARGET_TITLES);
  console.log(
    "Cleared suppressLiveHeroReviewOverlay on DB rows:",
    overlay.updatedCount,
    overlay.matchedTitles
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
