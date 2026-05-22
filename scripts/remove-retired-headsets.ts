/**
 * Permanently removes retired headset products from Postgres and registers storefront hides.
 * Run: npx tsx scripts/remove-retired-headsets.ts
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { sql } from "drizzle-orm";
import { RETIRED_STOREFRONT_PRODUCT_TITLES } from "../src/lib/storefront-hidden-products";
import { deleteProductCompletely } from "../src/server/data-access/delete-product-completely";
import { hideStorefrontProductByTitle } from "../src/lib/storefront-hidden-products";
import { db } from "../src/server/db";
import { productsTable } from "../src/server/db/schema";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

dotenv.config({ path: path.join(root, ".env.local") });
dotenv.config({ path: path.join(root, ".env") });

async function main() {
  for (const title of RETIRED_STOREFRONT_PRODUCT_TITLES) {
    const normalized = title.toLowerCase().trim().replace(/\s+/g, " ");
    const rows = await db
      .select({ id: productsTable.id, title: productsTable.title })
      .from(productsTable)
      .where(
        sql`lower(trim(regexp_replace(${productsTable.title}, '\\s+', ' ', 'g'))) = ${normalized}`
      );

    if (rows.length === 0) {
      await hideStorefrontProductByTitle(title);
      console.log(`[remove-retired-headsets] hidden (no DB row): ${title}`);
      continue;
    }

    for (const row of rows) {
      const result = await deleteProductCompletely(row.id);
      if ("success" in result && result.success) {
        console.log(`[remove-retired-headsets] deleted: ${result.title} (${row.id})`);
      } else {
        console.error(`[remove-retired-headsets] failed ${title}:`, result);
      }
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("[remove-retired-headsets]", error);
    process.exit(1);
  });
