import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getVitrinaProductMarketingRecommendationByProductId } from "@/server/seller-helper/product-marketing-recommendations";
import {
  clampVitrinaFixesPerItem,
  DEFAULT_VITRINA_FIXES_PER_ITEM,
} from "@/lib/vitrina-fixes-per-item";
import {
  capVitrinaRecommendationsList,
  type VitrinaProductMarketingRecommendation,
} from "@/types/vitrina-product-recommendations";

type VitrinaRecommendationsCachePayload = {
  generatedAt: string;
  recommendations: VitrinaProductMarketingRecommendation[];
};

let memoryCache: VitrinaRecommendationsCachePayload | null = null;

function cacheFilePath() {
  const override = process.env.VITRINA_RECOMMENDATIONS_CACHE_PATH?.trim();
  if (override) return override;
  return path.join(process.cwd(), ".cache", "vitrina-recommendations.json");
}

function isRecommendationArray(value: unknown): value is VitrinaProductMarketingRecommendation[] {
  return Array.isArray(value);
}

export async function readVitrinaRecommendationsCache(
  fixesPerItem: number = DEFAULT_VITRINA_FIXES_PER_ITEM
): Promise<VitrinaProductMarketingRecommendation[]> {
  const max = clampVitrinaFixesPerItem(fixesPerItem);
  if (memoryCache && memoryCache.recommendations.length > 0) {
    return capVitrinaRecommendationsList(memoryCache.recommendations, max);
  }

  try {
    const raw = await readFile(cacheFilePath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<VitrinaRecommendationsCachePayload>;
    if (!isRecommendationArray(parsed.recommendations)) {
      return [];
    }

    if (parsed.recommendations.length > 0) {
      memoryCache = {
        generatedAt: typeof parsed.generatedAt === "string" ? parsed.generatedAt : new Date(0).toISOString(),
        recommendations: parsed.recommendations,
      };
    }
    return capVitrinaRecommendationsList(parsed.recommendations, max);
  } catch {
    return [];
  }
}

/** Uncapped recommendations as stored on disk (for merging after quick-fix refresh). */
export async function readVitrinaRecommendationsCacheRaw(): Promise<VitrinaProductMarketingRecommendation[]> {
  if (memoryCache) return memoryCache.recommendations;
  try {
    const raw = await readFile(cacheFilePath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<VitrinaRecommendationsCachePayload>;
    return isRecommendationArray(parsed.recommendations) ? parsed.recommendations : [];
  } catch {
    return [];
  }
}

/** Clears generated Vitrina recommendation cards (memory + on-disk cache). */
export async function clearVitrinaRecommendationsCache(): Promise<void> {
  await writeVitrinaRecommendationsCache([]);
}

export async function writeVitrinaRecommendationsCache(
  recommendations: VitrinaProductMarketingRecommendation[]
): Promise<void> {
  const payload: VitrinaRecommendationsCachePayload = {
    generatedAt: new Date().toISOString(),
    recommendations,
  };

  memoryCache = payload;

  try {
    const filePath = cacheFilePath();
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(payload), "utf8");
  } catch (error) {
    console.error("[vitrina-recommendations-cache] write failed", error);
  }
}

/** Recompute one row from live product + signals and merge into the on-disk / in-memory list (e.g. after quick fixes). */
export async function refreshVitrinaRecommendationInCache(
  productId: string,
  mergeWithAlternateIds?: string[]
): Promise<void> {
  const updated = await getVitrinaProductMarketingRecommendationByProductId(productId);
  if (!updated) return;

  const current = await readVitrinaRecommendationsCacheRaw();
  const primary = String(productId);
  const alternates = (mergeWithAlternateIds ?? []).map(String);
  const idx = current.findIndex(
    (r) => String(r.productId) === primary || alternates.some((alt) => String(r.productId) === alt)
  );
  const next = idx === -1 ? [...current, updated] : current.map((row, i) => (i === idx ? updated : row));
  await writeVitrinaRecommendationsCache(next);
}

/** Drop catalogue rows from the Vitrina recommendations cache after a product is deleted. */
export async function removeVitrinaRecommendationsFromCache(
  productIds: Iterable<string | number>
): Promise<void> {
  const keys = new Set<string>();
  for (const id of Array.from(productIds)) {
    const s = String(id).trim();
    if (s) keys.add(s);
  }
  if (keys.size === 0) return;

  const current = await readVitrinaRecommendationsCacheRaw();
  const next = current.filter((row) => !keys.has(String(row.productId)));
  if (next.length === current.length) return;
  await writeVitrinaRecommendationsCache(next);
}
