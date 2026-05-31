/**
 * Deletes all micro-events used by the Conversion Funnel tab.
 * Usage: npx tsx scripts/clear-funnel-data.ts
 */
import { clearConversionFunnelData } from "../src/server/conception/clear-funnel-data";

async function main() {
  const result = await clearConversionFunnelData();
  console.log(result.message);
  console.log(`deletedCount=${result.deletedCount}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
