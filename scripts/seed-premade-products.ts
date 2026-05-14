import dotenv from "dotenv";
import { and, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import shopData from "@/components/Shop/shopData";
import categoryData from "@/components/Home/Categories/categoryData";
import { categoryTable, imageTable, productsTable } from "@/server/db/schema";
import { resolveDatabaseConnectionString } from "@/lib/database-url";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const connectionString = resolveDatabaseConnectionString();
if (!connectionString) {
  console.error("No database URL found. Set DATABASE_URL, POSTGRES_URL, or NEON_DATABASE_URL.");
  process.exit(1);
}

const pool = new Pool({ connectionString });
const db = drizzle(pool);

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const titleToCategoryName = new Map(
  categoryData.map((category) => [category.slug, category.title])
);

const toRating = (reviews: number) => {
  if (!Number.isFinite(reviews)) return 0;
  return Math.max(0, Math.min(5, Math.round(reviews / 3)));
};

async function ensureCategoryId(categorySlug: string) {
  const categoryName = titleToCategoryName.get(categorySlug) ?? categorySlug;

  const existing = await db
    .select({ id: categoryTable.id })
    .from(categoryTable)
    .where(eq(categoryTable.name, categoryName))
    .limit(1);

  if (existing[0]?.id) return existing[0].id;

  const inserted = await db
    .insert(categoryTable)
    .values({ name: categoryName })
    .returning({ id: categoryTable.id });

  return inserted[0].id;
}

async function run() {
  let created = 0;
  let updated = 0;

  for (const product of shopData) {
    const slug = slugify(product.title);

    const before = await db
      .select({ id: productsTable.id })
      .from(productsTable)
      .where(eq(productsTable.slug, slug))
      .limit(1);

    const categoryId = await ensureCategoryId(product.category);
    const mainImage = product.imgs?.previews?.[0] ?? product.imgs?.thumbnails?.[0] ?? "/images/products/product-1-bg-1.png";

    const row = {
      slug,
      title: product.title,
      mainimage: mainImage,
      price: Math.round(Number(product.detailPrice ?? 0)),
      jomlaPrice: product.jomlaPrice != null ? Math.round(Number(product.jomlaPrice)) : null,
      rating: toRating(product.reviews),
      description: product.description ?? product.title,
      manufacturer: "Vitrina",
      instock: Math.max(10, Math.min(999_999, product.instock ?? 100)),
      categoryId,
    };

    const [result] = await db
      .insert(productsTable)
      .values(row)
      .onConflictDoUpdate({
        target: productsTable.slug,
        set: {
          title: row.title,
          mainimage: row.mainimage,
          price: row.price,
          jomlaPrice: row.jomlaPrice,
          rating: row.rating,
          description: row.description,
          manufacturer: row.manufacturer,
          instock: row.instock,
          categoryId: row.categoryId,
        },
      })
      .returning({ id: productsTable.id });

    const productId = result?.id;
    if (!productId) continue;

    if (before[0]?.id) {
      updated += 1;
    } else {
      created += 1;
    }

    const allImages = [...(product.imgs?.previews ?? []), ...(product.imgs?.thumbnails ?? [])];
    const uniqueImages = Array.from(new Set(allImages.filter(Boolean)));

    for (const image of uniqueImages) {
      const existingImage = await db
        .select({ productId: imageTable.productId })
        .from(imageTable)
        .where(and(eq(imageTable.productId, productId), eq(imageTable.image, image)))
        .limit(1);

      if (!existingImage[0]) {
        await db.insert(imageTable).values({
          productId,
          image,
        });
      }
    }
  }

  const total = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(productsTable);

  console.log(
    JSON.stringify(
      {
        shopItems: shopData.length,
        inserted: created,
        updatedBySlug: updated,
        totalProductsInDb: Number(total[0]?.count ?? 0),
      },
      null,
      2
    )
  );
}

run()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
