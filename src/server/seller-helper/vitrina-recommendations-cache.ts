import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getVitrinaProductMarketingRecommendationByProductId } from "@/server/seller-helper/product-marketing-recommendations";
import type { VitrinaProductMarketingRecommendation } from "@/types/vitrina-product-recommendations";

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

export async function readVitrinaRecommendationsCache(): Promise<VitrinaProductMarketingRecommendation[]> {
  if (memoryCache && memoryCache.recommendations.length > 0) {
    return memoryCache.recommendations;
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
    return parsed.recommendations;
  } catch {
    return [];
  }
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

  const current = await readVitrinaRecommendationsCache();
  const primary = String(productId);
  const alternates = (mergeWithAlternateIds ?? []).map(String);
  const idx = current.findIndex(
    (r) => String(r.productId) === primary || alternates.some((alt) => String(r.productId) === alt)
  );
  const next = idx === -1 ? [...current, updated] : current.map((row, i) => (i === idx ? updated : row));
  await writeVitrinaRecommendationsCache(next);
}
