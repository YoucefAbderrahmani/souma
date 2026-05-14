import { eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { categoryTable, productsTable } from "@/server/db/schema";
import categoryData from "@/components/Home/Categories/categoryData";
import shopData from "@/components/Shop/shopData";
import { parseProductContent, isStructuredProductContent } from "@/lib/product-content";
import { getVitrinaMerchandisingFromAdditionalInfo, getStorefrontMerchHeroStripFromAdditionalInfo } from "@/lib/vitrina-merchandising";
import { getProductReviewAggregatesByLocalIds } from "@/server/reviews/reviews-db";
import { Product } from "@/types/product";

const normalize = (value: string) => value.toLowerCase().trim().replace(/\s+/g, " ");
const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const PG_INT_MAX = 2_147_483_647;

/** Same shape as UUID primary keys on `products.id`. */
const POSTGRES_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

/**
 * Every storefront numeric id that may refer to the same DB row for inventory/checkout.
 * Carts and URLs may use the static shopData id, the clamped UUID hash, or (when it fits
 * PostgreSQL integer) the legacy unsigned hash — see {@link getCatalogProductAliasIds}.
 */
export function getStorefrontInventoryAliasIds(title: string, databaseId: string): number[] {
  if (databaseId.startsWith("__offline__:")) {
    const id = resolveStorefrontProductId(title, databaseId);
    const t = Math.trunc(id);
    return Number.isFinite(t) && t > 0 && t <= PG_INT_MAX ? [t] : [];
  }

  const ids = new Set<number>();
  const addSafe = (n: number) => {
    if (!Number.isFinite(n) || n <= 0) return;
    const t = Math.trunc(n);
    if (t <= PG_INT_MAX) ids.add(t);
  };

  addSafe(resolveStorefrontProductId(title, databaseId));
  addSafe(toNumericId(databaseId));
  addSafe(legacyUnsignedHashFromUuid(databaseId));

  const legacy = shopData.find((item) => normalize(item.title) === normalize(title));
  if (legacy) addSafe(legacy.id);

  return Array.from(ids);
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

function withVitrinaStorefrontFieldsFromDescription(product: Product): Product {
  const parsed = parseProductContent(product.description);
  const additional = parsed.additionalInfo;
  const strip = getStorefrontMerchHeroStripFromAdditionalInfo(additional);
  const trending = getVitrinaMerchandisingFromAdditionalInfo(additional).trendingCountdownEndsAt;
  return {
    ...product,
    ...(strip ? { heroReviewSnippet: strip } : {}),
    ...(trending ? { trendingCountdownEndsAt: trending.toISOString() } : {}),
  };
}

async function withReviewAggregatesFromDatabase(products: Product[]): Promise<Product[]> {
  if (products.length === 0) return products;
  const aggMap = await getProductReviewAggregatesByLocalIds(products.map((p) => p.id));
  return products.map((p) => {
    const agg = aggMap.get(p.id) ?? { count: 0, averageRating: 0 };
    return {
      ...p,
      reviews: agg.count,
      averageRating: agg.averageRating,
    };
  });
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
        categoryName: sql<string>`coalesce(${categoryTable.name}, 'Catalog')`.as("categoryName"),
      })
      .from(productsTable)
      .leftJoin(categoryTable, eq(productsTable.categoryId, categoryTable.id));

    const mappedDbProducts: Product[] = dbProducts.map((item) => {
      const imgs = buildCatalogProductImages(item.mainimage, item.description);
      return {
        id: resolveStorefrontProductId(item.title, item.id),
        title: item.title,
        description: item.description,
        reviews: 0,
        averageRating: 0,
        detailPrice: item.price,
        jomlaPrice: item.jomlaPrice != null ? item.jomlaPrice : undefined,
        instock: item.instock,
        category: mapCategoryNameToSlug(item.categoryName),
        imgs: { thumbnails: imgs.thumbnails, previews: imgs.previews },
        ...(imgs.colorImageSlots ? { colorImageSlots: imgs.colorImageSlots } : {}),
      };
    });

    const merged = mergeCatalogWithoutDuplicateTitles(shopData, mappedDbProducts).map(withVitrinaStorefrontFieldsFromDescription);
    return await withReviewAggregatesFromDatabase(merged);
  } catch {
    const deduped = dedupeProductsByTitle(shopData);
    const merged = deduped.map(withVitrinaStorefrontFieldsFromDescription);
    return await withReviewAggregatesFromDatabase(merged);
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
    const snippet =
      product.heroReviewSnippet?.trim() ||
      getStorefrontMerchHeroStripFromAdditionalInfo(parseProductContent(product.description).additionalInfo);
    if (snippet) {
      snippets[product.id] = snippet;
    }
  }

  return snippets;
}

const categorySlugToDisplayName = new Map(categoryData.map((c) => [c.slug, c.title]));

function toRatingFromReviewCount(reviews: number) {
  if (!Number.isFinite(reviews)) return 0;
  return Math.max(0, Math.min(5, Math.round(reviews / 3)));
}

async function ensureCategoryIdForShopSlug(categorySlug: string): Promise<string> {
  const categoryName = categorySlugToDisplayName.get(categorySlug) ?? categorySlug;

  const existing = await db
    .select({ id: categoryTable.id })
    .from(categoryTable)
    .where(eq(categoryTable.name, categoryName))
    .limit(1);

  if (existing[0]?.id) return existing[0].id;

  const inserted = await db.insert(categoryTable).values({ name: categoryName }).returning({ id: categoryTable.id });
  return inserted[0]!.id;
}

/**
 * Insert or update a row in `products` from bundled `shopData` (same rules as `scripts/seed-premade-products.ts`).
 * Used when Seller Helper applies a quick fix against a numeric storefront id with no matching DB row yet.
 */
export async function upsertShopDataProductIntoDatabase(item: Product): Promise<string> {
  const slug = slugify(item.title) || `product-${item.id}`;
  const categoryId = await ensureCategoryIdForShopSlug(item.category);
  const mainImage =
    item.imgs?.previews?.[0] ?? item.imgs?.thumbnails?.[0] ?? "/images/products/product-1-bg-1.png";

  const row = {
    slug,
    title: item.title,
    mainimage: mainImage,
    price: Math.round(Number(item.detailPrice ?? 0)),
    jomlaPrice: item.jomlaPrice != null ? Math.round(Number(item.jomlaPrice)) : null,
    rating:
      (item.reviews ?? 0) > 0 ?
        Math.round(Math.min(5, Math.max(0, item.averageRating ?? 0)))
      : toRatingFromReviewCount(item.reviews ?? 0),
    description: item.description?.trim() || item.title,
    manufacturer: "Vitrina",
    instock: Math.max(10, Math.min(999_999, item.instock ?? 100)),
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
        categoryId: row.categoryId,
      },
    })
    .returning({ id: productsTable.id });

  if (!result?.id) {
    throw new Error("upsertShopDataProductIntoDatabase: missing returning id");
  }
  return result.id;
}

/** Upsert every bundled storefront item into Postgres (idempotent). Call from admin boot or `npm run db:seed-products`. */
export async function ensureAllShopDataProductsInDatabase(): Promise<{ ok: number; failed: number }> {
  let ok = 0;
  let failed = 0;
  for (const item of shopData) {
    try {
      await upsertShopDataProductIntoDatabase(item);
      ok += 1;
    } catch (error) {
      failed += 1;
      console.error("[product-catalog] ensureAllShopDataProductsInDatabase failed for", item.title, error);
    }
  }
  return { ok, failed };
}

/**
 * Map a Seller Helper / storefront `productId` to Postgres `products.id`.
 * Accepts a UUID, or a legacy numeric id from `shopData` (match by slug/title, or auto-upsert from `shopData`).
 */
export async function resolveDatabaseProductIdFromClientProductId(
  clientProductId: string
): Promise<string | null> {
  const raw = clientProductId.trim();
  if (!raw) return null;
  if (POSTGRES_UUID_RE.test(raw)) return raw;

  const numeric = Number.parseInt(raw, 10);
  if (!Number.isFinite(numeric) || numeric <= 0 || String(numeric) !== raw) return null;

  const staticItem = shopData.find((item) => item.id === numeric);
  if (!staticItem) return null;

  const slug = slugify(staticItem.title) || `product-${staticItem.id}`;
  const bySlug = await db
    .select({ id: productsTable.id })
    .from(productsTable)
    .where(eq(productsTable.slug, slug))
    .limit(1);
  if (bySlug[0]?.id) return bySlug[0].id;

  const targetTitle = normalize(staticItem.title);
  const rows = await db.select({ id: productsTable.id, title: productsTable.title }).from(productsTable);
  for (const row of rows) {
    if (normalize(row.title) === targetTitle) {
      return row.id;
    }
  }

  try {
    return await upsertShopDataProductIntoDatabase(staticItem);
  } catch (error) {
    console.error("[product-catalog] resolveDatabaseProductIdFromClientProductId upsert failed", error);
    return null;
  }
}
