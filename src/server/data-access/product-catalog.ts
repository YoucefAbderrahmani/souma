import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { categoryTable, productsTable } from "@/server/db/schema";
import categoryData from "@/components/Home/Categories/categoryData";
import shopData from "@/components/Shop/shopData";
import { Product } from "@/types/product";

const normalize = (value: string) => value.toLowerCase().trim().replace(/\s+/g, " ");
const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const toNumericId = (id: string) =>
  id.split("").reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) >>> 0, 7);

const mapCategoryNameToSlug = (categoryName: string) => {
  const byExactName = categoryData.find((cat) => normalize(cat.title) === normalize(categoryName));
  if (byExactName) return byExactName.slug;

  const generatedSlug = slugify(categoryName);
  const bySlug = categoryData.find((cat) => cat.slug === generatedSlug);
  if (bySlug) return bySlug.slug;

  return generatedSlug;
};

/** One row per title (normalized); later items win — used to dedupe DB rows and prefer DB over static shopData. */
function dedupeProductsByTitle(products: Product[]): Product[] {
  const map = new Map<string, Product>();
  for (const p of products) {
    map.set(normalize(p.title), p);
  }
  return Array.from(map.values());
}

/** Static seed + DB products: same title only once; database version replaces the static card. */
function mergeCatalogWithoutDuplicateTitles(staticProducts: Product[], dbProducts: Product[]): Product[] {
  const dbDeduped = dedupeProductsByTitle(dbProducts);
  const dbTitles = new Set(dbDeduped.map((p) => normalize(p.title)));
  const staticOnly = staticProducts.filter((p) => !dbTitles.has(normalize(p.title)));
  return [...staticOnly, ...dbDeduped];
}

export async function getCatalogProducts(): Promise<Product[]> {
  try {
    const dbProducts = await db
      .select({
        id: productsTable.id,
        title: productsTable.title,
        description: productsTable.description,
        price: productsTable.price,
        jomlaPrice: productsTable.jomlaPrice,
        rating: productsTable.rating,
        mainimage: productsTable.mainimage,
        categoryName: categoryTable.name,
      })
      .from(productsTable)
      .innerJoin(categoryTable, eq(productsTable.categoryId, categoryTable.id));

    const mappedDbProducts: Product[] = dbProducts.map((item) => ({
      id: toNumericId(item.id),
      title: item.title,
      description: item.description,
      reviews: item.rating ?? 0,
      detailPrice: item.price,
      jomlaPrice: item.jomlaPrice != null ? item.jomlaPrice : undefined,
      category: mapCategoryNameToSlug(item.categoryName),
      imgs: {
        thumbnails: [item.mainimage, item.mainimage],
        previews: [item.mainimage, item.mainimage],
      },
    }));

    return mergeCatalogWithoutDuplicateTitles(shopData, mappedDbProducts);
  } catch {
    return dedupeProductsByTitle(shopData);
  }
}
