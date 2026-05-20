/**
 * Heuristic Est. Revenue / Est. ROI for AI recommendations (DZD, 7d funnel).
 * Used when the LLM or rule engine omits hints.
 */

export type RecommendationPriority = "critical" | "high" | "medium" | "low";

export type Funnel7Snapshot = {
  nProduct: number;
  nCart: number;
  nCheckoutPath: number;
  nFinal: number;
};

export type RecommendationEconomicsContext = {
  avgOrderValueDzd: number;
  funnel7: Funnel7Snapshot;
};

const DEFAULT_AOV_DZD = 28_000;
const DAILY_IMPL_COST_DZD = 9_000;

const PRIORITY_UPLIFT_MID: Record<RecommendationPriority, number> = {
  critical: 0.1,
  high: 0.055,
  medium: 0.028,
  low: 0.012,
};

const PRIORITY_MULT: Record<RecommendationPriority, number> = {
  critical: 1.35,
  high: 1.15,
  medium: 1,
  low: 0.75,
};

const EFFORT_DAYS: Record<RecommendationPriority, number> = {
  critical: 5,
  high: 3,
  medium: 2,
  low: 1,
};

export function isBlankEconomicsHint(value: string | null | undefined): boolean {
  if (value == null) return true;
  const t = value.trim();
  if (!t) return true;
  return /^[—\-–]+$/.test(t) || /^n\/?a$/i.test(t) || t === "—";
}

function parseImpactUpliftMid(impactLabel: string, priority: RecommendationPriority): number {
  const label = impactLabel.trim();
  const range = label.match(/\+?\s*([\d.]+)\s*[–\-]\s*([\d.]+)\s*%/i);
  if (range) {
    const low = Number(range[1]) / 100;
    const high = Number(range[2]) / 100;
    if (Number.isFinite(low) && Number.isFinite(high)) {
      return (low + high) / 2;
    }
  }
  const single = label.match(/\+?\s*([\d.]+)\s*%/i);
  if (single) {
    const p = Number(single[1]) / 100;
    if (Number.isFinite(p)) return p * 0.85;
  }
  return PRIORITY_UPLIFT_MID[priority];
}

function addressableSessions(ctx: RecommendationEconomicsContext, priority: RecommendationPriority): number {
  const f = ctx.funnel7;
  if (priority === "critical") {
    return Math.max(f.nCart, f.nCheckoutPath, f.nProduct, 8);
  }
  if (priority === "high") {
    return Math.max(f.nProduct, f.nCart, 12);
  }
  return Math.max(f.nProduct, 20);
}

function formatDzd(amount: number): string {
  const n = Math.max(0, Math.round(amount));
  return `${new Intl.NumberFormat("fr-DZ", { maximumFractionDigits: 0 }).format(n)} DA`;
}

function formatRoiMultiple(multiple: number): string {
  if (!Number.isFinite(multiple) || multiple < 0.1) return "0.5x";
  if (multiple >= 12) return "12x+";
  return `${multiple.toFixed(1)}x`;
}

function roiTierLabel(multiple: number): string {
  if (multiple >= 8) return "High";
  if (multiple >= 3) return "Medium";
  if (multiple >= 1.2) return "Moderate";
  return "Low";
}

export function estimateRecommendationEconomics(
  input: {
    priority: RecommendationPriority;
    impactLabel: string;
    confidence: number;
    title?: string;
  },
  ctx: RecommendationEconomicsContext
): { revenueHint: string; roiHint: string } {
  const aov = ctx.avgOrderValueDzd > 0 ? ctx.avgOrderValueDzd : DEFAULT_AOV_DZD;
  const confidenceFactor = Math.min(1, Math.max(0.35, input.confidence / 100));
  const upliftMid = parseImpactUpliftMid(input.impactLabel, input.priority);
  const sessions = addressableSessions(ctx, input.priority);
  const priorityMult = PRIORITY_MULT[input.priority];

  const incrementalPurchases = Math.max(
    0.25,
    sessions * upliftMid * confidenceFactor * priorityMult
  );

  let revenueDzd = incrementalPurchases * aov;

  const f = ctx.funnel7;
  if (/payment|chargily|checkout|paiement/i.test(`${input.title ?? ""} ${input.impactLabel}`)) {
    const recoverable = Math.max(0, f.nCart - f.nFinal);
    revenueDzd = Math.max(revenueDzd, recoverable * aov * 0.35 * confidenceFactor);
  }

  if (/lcp|performance|perf|vitesse|chargement/i.test(`${input.title ?? ""}`)) {
    const bounceProxy = Math.max(0, f.nProduct - f.nCart);
    revenueDzd = Math.max(revenueDzd, bounceProxy * aov * upliftMid * 0.4);
  }

  revenueDzd = Math.round(Math.max(500, revenueDzd));

  const implCost = EFFORT_DAYS[input.priority] * DAILY_IMPL_COST_DZD;
  const roiMultiple = revenueDzd / Math.max(implCost, 1);

  const roiHint =
    roiMultiple >= 6 ? `${roiTierLabel(roiMultiple)} (${formatRoiMultiple(roiMultiple)})` : formatRoiMultiple(roiMultiple);

  return {
    revenueHint: formatDzd(revenueDzd),
    roiHint,
  };
}

export function ensureRecommendationEconomicsHints(
  row: {
    priority: RecommendationPriority;
    impactLabel: string;
    confidence: number;
    title?: string;
    revenueHint?: string | null;
    roiHint?: string | null;
  },
  ctx: RecommendationEconomicsContext
): { revenueHint: string; roiHint: string } {
  const estimated = estimateRecommendationEconomics(row, ctx);
  return {
    revenueHint: isBlankEconomicsHint(row.revenueHint) ? estimated.revenueHint : row.revenueHint!.trim(),
    roiHint: isBlankEconomicsHint(row.roiHint) ? estimated.roiHint : row.roiHint!.trim(),
  };
}

export function defaultEconomicsContext(
  partial?: Partial<RecommendationEconomicsContext>
): RecommendationEconomicsContext {
  return {
    avgOrderValueDzd: partial?.avgOrderValueDzd ?? DEFAULT_AOV_DZD,
    funnel7: partial?.funnel7 ?? { nProduct: 50, nCart: 18, nCheckoutPath: 10, nFinal: 4 },
  };
}
