import { runConceptionLlmAnalysis } from "@/server/conception/llm-analysis";
import { buildConceptionAnalyzeSignals } from "@/server/conception/metrics";
import { listVitrinaProductMarketingRecommendations } from "@/server/seller-helper/product-marketing-recommendations";
import { db } from "@/server/db";
import { conceptionAlertTable, conceptionRecommendationTable } from "@/server/db/schema";
import type { VitrinaProductMarketingRecommendation } from "@/types/vitrina-product-recommendations";

function dayFingerprint(prefix: string): string {
  const d = new Date();
  return `${prefix}-${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function hourFingerprint(prefix: string): string {
  const d = new Date();
  return `${prefix}-${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}T${String(d.getUTCHours()).padStart(2, "0")}`;
}

export type ConceptionAnalyzeResult = {
  insertedAlerts: number;
  insertedRecommendations: number;
  llmUsed: boolean;
  llmSummary: string | null;
  llmError: string | null;
  llmModel: string | null;
  vitrinaRecommendations: VitrinaProductMarketingRecommendation[];
};

/**
 * Rule engine aligned with the academic spec: conversion drop, traffic spike,
 * cart abandon, JS error density, performance — plus funnel-based recommendations.
 */
export async function runConceptionAnalysisJob(): Promise<ConceptionAnalyzeResult> {
  const s = await buildConceptionAnalyzeSignals();

  let insertedAlerts = 0;
  let insertedRecommendations = 0;

  const alerts: (typeof conceptionAlertTable.$inferInsert)[] = [];

  if (s.rateOld > 0.001 && s.rateNow < s.rateOld * 0.8) {
    alerts.push({
      alertType: "CONVERSION_DROP",
      severity: "critical",
      title: "Conversion drop",
      description: "Conversion rate more than 20% below the previous window average (7 days).",
      detail: `Current rate ${(100 * s.rateNow).toFixed(2)}% vs reference ${(100 * s.rateOld).toFixed(2)}%.`,
      affectedSessionsEstimate: null,
      metadataJson: JSON.stringify({ rateNow: s.rateNow, rateOld: s.rateOld }),
      fingerprint: dayFingerprint("CONVERSION_DROP"),
    });
  }

  if (s.events15m > s.baseline15 * 4) {
    alerts.push({
      alertType: "TRAFFIC_SPIKE",
      severity: "high",
      title: "Abnormal traffic",
      description: "Sharp increase in event volume over the last 15 minutes.",
      detail: `${s.events15m} events vs ~${Math.round(s.baseline15)} expected per 15-minute window (90 min baseline).`,
      affectedSessionsEstimate: null,
      metadataJson: JSON.stringify({ events15m: s.events15m, baseline15: s.baseline15 }),
      fingerprint: hourFingerprint("TRAFFIC_SPIKE"),
    });
  }

  if (s.cart2h >= 8 && s.cartAbandon2h >= 0.8) {
    alerts.push({
      alertType: "CART_ABANDON_MASS",
      severity: "medium",
      title: "Mass cart abandonment",
      description: "Cart abandonment rate above 80% over a 2-hour window.",
      detail: `${s.cart2h} sessions with add-to-cart, ${s.final2h} confirmed purchases (pa_purchase).`,
      affectedSessionsEstimate: Math.max(0, s.cart2h - s.final2h),
      metadataJson: JSON.stringify({ cart2h: s.cart2h, final2h: s.final2h }),
      fingerprint: hourFingerprint("CART_ABANDON_MASS"),
    });
  }

  if (s.sessionsCheckout2h > 0 && s.jsErrorSessions / s.sessionsCheckout2h >= 0.05) {
    alerts.push({
      alertType: "JS_ERROR_BURST",
      severity: "high",
      title: "Technical error (client)",
      description: "JavaScript errors detected on more than 5% of sessions touching checkout (2 h).",
      detail: `${s.jsErrorSessions} session(s) with pa_js_error out of ${s.sessionsCheckout2h} checkout sessions.`,
      affectedSessionsEstimate: s.jsErrorSessions,
      metadataJson: JSON.stringify({ jsErrorSessions: s.jsErrorSessions, sessionsCheckout2h: s.sessionsCheckout2h }),
      fingerprint: hourFingerprint("JS_ERROR_BURST"),
    });
  }

  const perfSessions = s.slowNavSessions + s.lcpSlowSessions;
  if (perfSessions >= 5) {
    alerts.push({
      alertType: "PERF_SLOW",
      severity: "low",
      title: "Performance issue",
      description: "Load time or LCP above 4 seconds on multiple sessions.",
      detail: `${perfSessions} sessions with slow navigation or elevated LCP (2 h).`,
      affectedSessionsEstimate: perfSessions,
      metadataJson: JSON.stringify({ slowNavSessions: s.slowNavSessions, lcpSlowSessions: s.lcpSlowSessions }),
      fingerprint: hourFingerprint("PERF_SLOW"),
    });
  }

  for (const a of alerts) {
    const r = await db
      .insert(conceptionAlertTable)
      .values(a)
      .onConflictDoNothing({ target: conceptionAlertTable.fingerprint })
      .returning({ id: conceptionAlertTable.id });
    if (r.length > 0) insertedAlerts += 1;
  }

  const recs: (typeof conceptionRecommendationTable.$inferInsert)[] = [];
  const f = s.funnel7;

  if (f.nProduct > 0 && f.nCart / f.nProduct < 0.35) {
    recs.push({
      priority: "high",
      impactLabel: "+4–8% conversion (est.)",
      title: "Strengthen intent between product page and cart",
      analysis: `Only ${(100 * (f.nCart / f.nProduct)).toFixed(1)}% of product views lead to an add-to-cart click.`,
      recommendation:
        "Clarify all-in price, availability, and shipping above the fold; strengthen reviews and guarantees near the primary CTA.",
      confidence: 82,
      revenueHint: "—",
      implementationHint: "2–4 jours",
      roiHint: "—",
      evidenceJson: JSON.stringify({ step: "product_to_cart", ratio: f.nCart / f.nProduct }),
      fingerprint: dayFingerprint("REC_FUNNEL_PRODUCT_CART"),
    });
  }

  if (f.nCart > 0 && f.nCheckoutPath / f.nCart < 0.45) {
    recs.push({
      priority: "high",
      impactLabel: "+5–10% conversion (est.)",
      title: "Reduce cart → checkout friction",
      analysis: `${(100 * (1 - f.nCheckoutPath / f.nCart)).toFixed(1)}% of sessions with purchase intent never reach a checkout step.`,
      recommendation:
        "Enable guest checkout, reduce form fields on mobile, show shipping costs early, and add a funnel progress bar.",
      confidence: 88,
      revenueHint: "—",
      implementationHint: "3–5 jours",
      roiHint: "—",
      evidenceJson: JSON.stringify({ step: "cart_to_checkout", ratio: f.nCheckoutPath / f.nCart }),
      fingerprint: dayFingerprint("REC_FUNNEL_CART_CHECKOUT"),
    });
  }

  if (s.lcpSlowSessions >= 3) {
    recs.push({
      priority: "medium",
      impactLabel: "+2–4% conversion (est.)",
      title: "Optimize product page LCP",
      analysis: "Multiple sessions show LCP above 4 s, which increases bounce before interaction.",
      recommendation:
        "Compress visuals (WebP/AVIF), lazy-load below the fold, prioritize the hero, and limit third-party scripts on the product page.",
      confidence: 76,
      revenueHint: "—",
      implementationHint: "1–3 jours",
      roiHint: "—",
      evidenceJson: JSON.stringify({ lcpSlowSessions: s.lcpSlowSessions }),
      fingerprint: dayFingerprint("REC_LCP_PERF"),
    });
  }

  for (const row of recs) {
    const ins = await db
      .insert(conceptionRecommendationTable)
      .values(row)
      .onConflictDoNothing({ target: conceptionRecommendationTable.fingerprint })
      .returning({ id: conceptionRecommendationTable.id });
    if (ins.length > 0) insertedRecommendations += 1;
  }

  let llmUsed = false;
  let llmSummary: string | null = null;
  let llmError: string | null = null;
  let llmModel: string | null = null;

  try {
    const llmResult = await runConceptionLlmAnalysis();
    if (llmResult) {
      llmUsed = true;
      llmSummary = llmResult.summary;
      llmModel = llmResult.model;

      for (const alert of llmResult.alerts) {
        const inserted = await db
          .insert(conceptionAlertTable)
          .values(alert)
          .onConflictDoNothing({ target: conceptionAlertTable.fingerprint })
          .returning({ id: conceptionAlertTable.id });
        if (inserted.length > 0) insertedAlerts += 1;
      }

      for (const recommendation of llmResult.recommendations) {
        const inserted = await db
          .insert(conceptionRecommendationTable)
          .values(recommendation)
          .onConflictDoNothing({ target: conceptionRecommendationTable.fingerprint })
          .returning({ id: conceptionRecommendationTable.id });
        if (inserted.length > 0) insertedRecommendations += 1;
      }
    }
  } catch (error) {
    llmError = error instanceof Error ? error.message : String(error);
    console.error("[conception/analyze][llm]", error);
  }

  const vitrinaRecommendations = await listVitrinaProductMarketingRecommendations();

  return {
    insertedAlerts,
    insertedRecommendations,
    llmUsed,
    llmSummary,
    llmError,
    llmModel,
    vitrinaRecommendations,
  };
}
