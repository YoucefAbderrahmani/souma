import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { categoryTable, productsTable } from "@/server/db/schema";
import categoryData from "@/components/Home/Categories/categoryData";
import shopData from "@/components/Shop/shopData";
import { parseProductContent } from "@/lib/product-content";
import { getVitrinaMerchandisingFromAdditionalInfo } from "@/lib/vitrina-merchandising";
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

export function resolveStorefrontProductId(title: string, databaseId: string) {
  const matchedStatic = shopData.find((item) => normalize(item.title) === normalize(title));
  return matchedStatic ? matchedStatic.id : toNumericId(databaseId);
}

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
        instock: productsTable.instock,
        mainimage: productsTable.mainimage,
        categoryName: categoryTable.name,
      })
      .from(productsTable)
      .innerJoin(categoryTable, eq(productsTable.categoryId, categoryTable.id));

    const mappedDbProducts: Product[] = dbProducts.map((item) => ({
      id: resolveStorefrontProductId(item.title, item.id),
      title: item.title,
      description: item.description,
      reviews: item.rating ?? 0,
      detailPrice: item.price,
      jomlaPrice: item.jomlaPrice != null ? item.jomlaPrice : undefined,
      instock: item.instock,
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

export async function getCatalogProductByRequestedId(requestedId: number): Promise<Product | null> {
  if (!Number.isFinite(requestedId) || requestedId <= 0) return null;

  const products = await getCatalogProducts();
  const direct = products.find((item) => item.id === requestedId);
  if (direct) return direct;

  const legacy = shopData.find((item) => item.id === requestedId);
  if (legacy) {
    return products.find((item) => normalize(item.title) === normalize(legacy.title)) ?? null;
  }

  try {
    const dbProducts = await db
      .select({
        id: productsTable.id,
        title: productsTable.title,
      })
      .from(productsTable);

    for (const row of dbProducts) {
      if (toNumericId(row.id) !== requestedId) continue;
      return products.find((item) => normalize(item.title) === normalize(row.title)) ?? null;
    }
  } catch {
    /* ignore */
  }

  return null;
}

export async function getCatalogProductAliasIds(productId: number): Promise<number[]> {
  if (!Number.isFinite(productId) || productId <= 0) return [];

  const products = await getCatalogProducts();
  const ids = new Set<number>([Math.trunc(productId)]);
  const product = products.find((item) => item.id === productId);
  if (product) {
    const legacy = shopData.find((item) => normalize(item.title) === normalize(product.title));
    if (legacy) ids.add(legacy.id);
    try {
      const dbProducts = await db
        .select({
          id: productsTable.id,
          title: productsTable.title,
        })
        .from(productsTable);
      for (const row of dbProducts) {
        if (normalize(row.title) !== normalize(product.title)) continue;
        ids.add(toNumericId(row.id));
      }
    } catch {
      /* ignore */
    }
  }

  const legacy = shopData.find((item) => item.id === productId);
  if (legacy) {
    const match = products.find((item) => normalize(item.title) === normalize(legacy.title));
    if (match) ids.add(match.id);
  }

  return Array.from(ids);
}

export async function getHeroReviewSnippetsByStorefrontIds(
  requestedIds: number[]
): Promise<Record<number, string>> {
  const uniqueIds = new Set(
    requestedIds
      .map((id) => Math.trunc(Number(id)))
      .filter((id) => Number.isFinite(id) && id > 0)
  );
  if (uniqueIds.size === 0) return {};

  const products = await getCatalogProducts();
  const snippets: Record<number, string> = {};

  for (const product of products) {
    if (!uniqueIds.has(product.id)) continue;
    const snippet = getVitrinaMerchandisingFromAdditionalInfo(
      parseProductContent(product.description).additionalInfo
    ).heroReviewSnippet;
    if (snippet) {
      snippets[product.id] = snippet;
    }
  }

  return snippets;
}
