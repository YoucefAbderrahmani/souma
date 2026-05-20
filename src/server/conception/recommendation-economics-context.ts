import { buildCatalogSnapshotForConceptionLlm } from "@/server/conception/llm-catalog-snapshot";
import { buildConceptionAnalyzeSignals } from "@/server/conception/metrics";
import type { RecommendationEconomicsContext } from "@/lib/recommendation-economics";
import { defaultEconomicsContext } from "@/lib/recommendation-economics";

async function resolveAvgOrderValueDzd(): Promise<number> {
  try {
    const catalog = await buildCatalogSnapshotForConceptionLlm(40);
    const prices = catalog
      .map((p) => (p.promoPriceDzd != null && p.promoPriceDzd > 0 ? p.promoPriceDzd : p.listPriceDzd))
      .filter((p) => p > 0);
    if (prices.length === 0) return defaultEconomicsContext().avgOrderValueDzd;
    return Math.round(prices.reduce((sum, p) => sum + p, 0) / prices.length);
  } catch {
    return defaultEconomicsContext().avgOrderValueDzd;
  }
}

/** Live funnel + catalogue AOV for revenue/ROI estimation. */
export async function buildRecommendationEconomicsContext(): Promise<RecommendationEconomicsContext> {
  const [signals, avgOrderValueDzd] = await Promise.all([
    buildConceptionAnalyzeSignals(),
    resolveAvgOrderValueDzd(),
  ]);
  return {
    avgOrderValueDzd,
    funnel7: signals.funnel7,
  };
}
