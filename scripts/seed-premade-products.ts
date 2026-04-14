import dotenv from "dotenv";
import { and, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import shopData from "@/components/Shop/shopData";
import categoryData from "@/components/Home/Categories/categoryData";
import { categoryTable, imageTable, productsTable } from "@/server/db/schema";

dotenv.config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
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
  let skipped = 0;

  for (const product of shopData) {
    const slug = slugify(product.title);

    const existingProduct = await db
      .select({ id: productsTable.id })
      .from(productsTable)
      .where(eq(productsTable.slug, slug))
      .limit(1);

    if (existingProduct[0]?.id) {
      skipped += 1;
      continue;
    }

    const categoryId = await ensureCategoryId(product.category);
    const mainImage = product.imgs?.previews?.[0] ?? product.imgs?.thumbnails?.[0] ?? "/images/products/product-1-bg-1.png";

    const inserted = await db
      .insert(productsTable)
      .values({
        slug,
        title: product.title,
        mainimage: mainImage,
        price: Number(product.detailPrice ?? 0),
        jomlaPrice: product.jomlaPrice != null ? Math.round(Number(product.jomlaPrice)) : null,
        rating: toRating(product.reviews),
        description: product.description ?? product.title,
        manufacturer: "Souma",
        instock: 50,
        categoryId,
      })
      .returning({ id: productsTable.id });

    const productId = inserted[0]?.id;
    if (!productId) continue;

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

    created += 1;
  }

  const total = await db
    .select({ count: sql<number>`count(*)` })
    .from(productsTable);

  console.log(
    JSON.stringify(
      {
        created,
        skipped,
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
