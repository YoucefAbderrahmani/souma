import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { categoryTable, productsTable } from "@/server/db/schema";
import categoryData from "@/components/Home/Categories/categoryData";
import shopData from "@/components/Shop/shopData";
import { parseProductContent, isStructuredProductContent } from "@/lib/product-content";
import { getVitrinaMerchandisingFromAdditionalInfo } from "@/lib/vitrina-merchandising";
import { Product } from "@/types/product";

const normalize = (value: string) => value.toLowerCase().trim().replace(/\s+/g, " ");
const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const PG_INT_MAX = 2_147_483_647;

/** Legacy UUID→int hash (unsigned 32-bit); can exceed PostgreSQL `integer` range — do not use in SQL `integer` columns. */
function legacyUnsignedHashFromUuid(databaseId: string): number {
  return databaseId.split("").reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) >>> 0, 7);
}

/** Stable positive id in `1..PG_INT_MAX` for `sales_micro_event.product_local_id` (PostgreSQL `integer`). */
function toNumericId(databaseId: string): number {
  const u = legacyUnsignedHashFromUuid(databaseId);
  const masked = u & 0x7fffffff;
  return masked === 0 ? 1 : masked;
}

export function resolveStorefrontProductId(title: string, databaseId: string) {
  const matchedStatic = shopData.find((item) => normalize(item.title) === normalize(title));
  return matchedStatic ? matchedStatic.id : toNumericId(databaseId);
}

function buildCatalogProductImages(
  mainimage: string,
  description: string | null | undefined
): { thumbnails: string[]; previews: string[]; colorImageSlots?: { colorName: string; url: string }[] } {
  if (!isStructuredProductContent(description)) {
    return { thumbnails: [mainimage, mainimage], previews: [mainimage, mainimage] };
  }
  const parsed = parseProductContent(description);
  const colors = parsed.colors?.filter((c) => c.name.trim()) ?? [];
  if (colors.length === 0) {
    return { thumbnails: [mainimage, mainimage], previews: [mainimage, mainimage] };
  }
  const slots = colors.map((c) => ({
    colorName: c.name,
    url: (c.imageUrl?.trim() || mainimage) as string,
  }));
  const urls = slots.map((s) => s.url);
  return { thumbnails: urls, previews: urls, colorImageSlots: slots };
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

    const mappedDbProducts: Product[] = dbProducts.map((item) => {
      const imgs = buildCatalogProductImages(item.mainimage, item.description);
      return {
        id: resolveStorefrontProductId(item.title, item.id),
        title: item.title,
        description: item.description,
        reviews: item.rating ?? 0,
        detailPrice: item.price,
        jomlaPrice: item.jomlaPrice != null ? item.jomlaPrice : undefined,
        instock: item.instock,
        category: mapCategoryNameToSlug(item.categoryName),
        imgs: { thumbnails: imgs.thumbnails, previews: imgs.previews },
        ...(imgs.colorImageSlots ? { colorImageSlots: imgs.colorImageSlots } : {}),
      };
    });

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
      const clamped = toNumericId(row.id);
      const raw = legacyUnsignedHashFromUuid(row.id);
      if (clamped !== requestedId && raw !== requestedId) continue;
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
  const ids = new Set<number>();

  const addSafe = (n: number) => {
    if (!Number.isFinite(n) || n <= 0) return;
    const t = Math.trunc(n);
    if (t <= PG_INT_MAX) ids.add(t);
  };

  addSafe(productId);

  let product = products.find((item) => item.id === productId);

  if (!product) {
    try {
      const dbProducts = await db
        .select({
          id: productsTable.id,
          title: productsTable.title,
        })
        .from(productsTable);

      for (const row of dbProducts) {
        const clamped = toNumericId(row.id);
        const raw = legacyUnsignedHashFromUuid(row.id);
        if (productId !== clamped && productId !== raw) continue;
        product = products.find((item) => normalize(item.title) === normalize(row.title)) ?? null;
        break;
      }
    } catch {
      /* ignore */
    }
  }

  if (!product) {
    const legacy = shopData.find((item) => item.id === productId);
    if (legacy) {
      const match = products.find((item) => normalize(item.title) === normalize(legacy.title));
      if (match) {
        addSafe(match.id);
        addSafe(legacy.id);
      }
    }
    return Array.from(ids);
  }

  addSafe(product.id);

  const legacy = shopData.find((item) => normalize(item.title) === normalize(product.title));
  if (legacy) addSafe(legacy.id);

  try {
    const dbProducts = await db
      .select({
        id: productsTable.id,
        title: productsTable.title,
      })
      .from(productsTable);
    for (const row of dbProducts) {
      if (normalize(row.title) !== normalize(product.title)) continue;
      const clamped = toNumericId(row.id);
      const raw = legacyUnsignedHashFromUuid(row.id);
      addSafe(clamped);
      if (raw !== clamped) addSafe(raw);
    }
  } catch {
    /* ignore */
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
