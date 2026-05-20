import { isGeminiConfigured, runConceptionLlmAnalysis } from "@/server/conception/llm-analysis";
import { buildCatalogSnapshotForConceptionLlm } from "@/server/conception/llm-catalog-snapshot";
import { buildConceptionAnalyzeSignals, buildConceptionOverview } from "@/server/conception/metrics";
import { buildRecommendationEconomicsContext } from "@/server/conception/recommendation-economics-context";
import { ensureRecommendationEconomicsHints } from "@/lib/recommendation-economics";
import { attachAssignedRoleToRecommendationRow } from "@/server/conception/recommendation-role-enrich";
import { listVitrinaProductMarketingRecommendations } from "@/server/seller-helper/product-marketing-recommendations";
import { writeVitrinaRecommendationsCache } from "@/server/seller-helper/vitrina-recommendations-cache";
import { db } from "@/server/db";
import { conceptionAlertTable, conceptionRecommendationTable } from "@/server/db/schema";
import type { VitrinaProductMarketingRecommendation } from "@/types/vitrina-product-recommendations";
import { autoSendRecommendationEmails } from "@/server/email/auto-send-recommendation-emails";
import { isBrevoAutomatedEmailEnabled } from "@/server/email/brevo-config";

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
  emailsSent: number;
  emailsFailed: number;
  llmUsed: boolean;
  llmSummary: string | null;
  llmError: string | null;
  llmModel: string | null;
  geminiConfigured: boolean;
  baselineRecommendationsInserted: number;
  vitrinaRecommendations: VitrinaProductMarketingRecommendation[];
};

async function insertBaselineRecommendationsIfEmpty(
  insertedSoFar: number,
  newRecommendationIds: string[],
  enrichDraft: (
    draft: typeof conceptionRecommendationTable.$inferInsert
  ) => Promise<typeof conceptionRecommendationTable.$inferInsert>
): Promise<{ total: number; baselineInserted: number }> {
  if (insertedSoFar > 0) {
    return { total: insertedSoFar, baselineInserted: 0 };
  }

  const [overview, catalog] = await Promise.all([
    buildConceptionOverview(),
    buildCatalogSnapshotForConceptionLlm(8),
  ]);

  const drafts: (typeof conceptionRecommendationTable.$inferInsert)[] = [
    {
      priority: "medium",
      impactLabel: "Catalogue & funnel (baseline)",
      title: "Refresh merchandising from live catalogue data",
      analysis: overview.hasEventData
        ? `${overview.totalEvents7d.toLocaleString("en-US")} micro-events recorded over 7 days. AI analysis was unavailable — use telemetry and catalogue data to prioritize the next actions.`
        : "Telemetry is still sparse. Strengthen product pages, pricing clarity, and checkout trust while event volume grows.",
      recommendation:
        "Review top products for stock, images, and pricing; align CTAs with shipping and returns; re-run Analyze after configuring GOOGLE_API_KEY (Gemini) or OpenRouter credits.",
      confidence: overview.hasEventData ? 68 : 55,
      revenueHint: null,
      implementationHint: "1–2 jours",
      roiHint: null,
      evidenceJson: JSON.stringify({ source: "baseline", hasEventData: overview.hasEventData }),
      fingerprint: hourFingerprint("REC_BASELINE_CATALOG"),
    },
  ];

  const lowStock = catalog.filter((p) => p.instock <= 3).slice(0, 2);
  for (const product of lowStock) {
    drafts.push({
      priority: product.instock === 0 ? "high" : "medium",
      impactLabel: product.instock === 0 ? "Out of stock" : "Low stock",
      title: product.instock === 0 ? `Restock: ${product.title}` : `Low stock: ${product.title}`,
      analysis: `${product.title} (${product.category}) — ${product.instock} unit(s) in stock, list price ${product.listPriceDzd} DZD.`,
      recommendation:
        product.instock === 0
          ? "Mark unavailable or restock urgently; hide add-to-cart until inventory returns to avoid cart abandonment."
          : "Highlight scarcity on the product page, consider a restock alert, and verify promo price vs list price.",
      confidence: 72,
      revenueHint: null,
      implementationHint: "1 jour",
      roiHint: null,
      evidenceJson: JSON.stringify({ source: "baseline", productId: product.id, instock: product.instock }),
      fingerprint: hourFingerprint(`REC_BASELINE_STOCK_${product.id}`),
    });
  }

  if (lowStock.length === 0 && catalog[0]) {
    const product = catalog[0];
    drafts.push({
      priority: "medium",
      impactLabel: "Merchandising",
      title: `Improve presentation: ${product.title}`,
      analysis: `Catalogue includes “${product.title}” (${product.category}, ${product.instock} in stock).`,
      recommendation:
        "Update hero image, short description, and social proof; test psychological pricing against list price on mobile.",
      confidence: 65,
      revenueHint: null,
      implementationHint: "2–3 jours",
      roiHint: null,
      evidenceJson: JSON.stringify({ source: "baseline", productId: product.id }),
      fingerprint: hourFingerprint(`REC_BASELINE_MERCH_${product.id}`),
    });
  }

  let baselineInserted = 0;
  let total = insertedSoFar;
  for (const draft of drafts) {
    const row = await enrichDraft(draft);
    const ins = await db
      .insert(conceptionRecommendationTable)
      .values(row)
      .onConflictDoNothing({ target: conceptionRecommendationTable.fingerprint })
      .returning({ id: conceptionRecommendationTable.id });
    if (ins.length > 0) {
      baselineInserted += 1;
      total += 1;
      newRecommendationIds.push(ins[0].id);
    }
  }

  return { total, baselineInserted };
}

/**
 * Rule engine aligned with the academic spec: conversion drop, traffic spike,
 * cart abandon, JS error density, performance — plus funnel-based recommendations.
 */
export async function runConceptionAnalysisJob(): Promise<ConceptionAnalyzeResult> {
  const s = await buildConceptionAnalyzeSignals();

  let insertedAlerts = 0;
  let insertedRecommendations = 0;
  const newRecommendationIds: string[] = [];

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

  const economicsCtx = await buildRecommendationEconomicsContext();
  const recs: (typeof conceptionRecommendationTable.$inferInsert)[] = [];
  const f = s.funnel7;

  const enrichDraft = async (
    draft: typeof conceptionRecommendationTable.$inferInsert
  ) => {
    const hints = ensureRecommendationEconomicsHints(
      {
        priority: draft.priority as "critical" | "high" | "medium" | "low",
        impactLabel: draft.impactLabel,
        confidence: draft.confidence,
        title: draft.title,
        revenueHint: draft.revenueHint,
        roiHint: draft.roiHint,
      },
      economicsCtx
    );
    return attachAssignedRoleToRecommendationRow({
      ...draft,
      revenueHint: hints.revenueHint,
      roiHint: hints.roiHint,
    });
  };

  if (f.nProduct > 0 && f.nCart / f.nProduct < 0.35) {
    recs.push(
      await enrichDraft({
        priority: "high",
        impactLabel: "+4–8% conversion (est.)",
        title: "Strengthen intent between product page and cart",
        analysis: `Only ${(100 * (f.nCart / f.nProduct)).toFixed(1)}% of product views lead to an add-to-cart click.`,
        recommendation:
          "Clarify all-in price, availability, and shipping above the fold; strengthen reviews and guarantees near the primary CTA.",
        confidence: 82,
        revenueHint: null,
        implementationHint: "2–4 jours",
        roiHint: null,
        evidenceJson: JSON.stringify({ step: "product_to_cart", ratio: f.nCart / f.nProduct }),
        fingerprint: dayFingerprint("REC_FUNNEL_PRODUCT_CART"),
      })
    );
  }

  if (f.nCart > 0 && f.nCheckoutPath / f.nCart < 0.45) {
    recs.push(
      await enrichDraft({
        priority: "high",
        impactLabel: "+5–10% conversion (est.)",
        title: "Reduce cart → checkout friction",
        analysis: `${(100 * (1 - f.nCheckoutPath / f.nCart)).toFixed(1)}% of sessions with purchase intent never reach a checkout step.`,
        recommendation:
          "Enable guest checkout, reduce form fields on mobile, show shipping costs early, and add a funnel progress bar.",
        confidence: 88,
        revenueHint: null,
        implementationHint: "3–5 jours",
        roiHint: null,
        evidenceJson: JSON.stringify({ step: "cart_to_checkout", ratio: f.nCheckoutPath / f.nCart }),
        fingerprint: dayFingerprint("REC_FUNNEL_CART_CHECKOUT"),
      })
    );
  }

  if (s.lcpSlowSessions >= 3) {
    recs.push(
      await enrichDraft({
        priority: "medium",
        impactLabel: "+2–4% conversion (est.)",
        title: "Optimize product page LCP",
        analysis: "Multiple sessions show LCP above 4 s, which increases bounce before interaction.",
        recommendation:
          "Compress visuals (WebP/AVIF), lazy-load below the fold, prioritize the hero, and limit third-party scripts on the product page.",
        confidence: 76,
        revenueHint: null,
        implementationHint: "1–3 jours",
        roiHint: null,
        evidenceJson: JSON.stringify({ lcpSlowSessions: s.lcpSlowSessions }),
        fingerprint: dayFingerprint("REC_LCP_PERF"),
      })
    );
  }

  for (const row of recs) {
    const ins = await db
      .insert(conceptionRecommendationTable)
      .values(row)
      .onConflictDoNothing({ target: conceptionRecommendationTable.fingerprint })
      .returning({ id: conceptionRecommendationTable.id });
    if (ins.length > 0) {
      insertedRecommendations += 1;
      newRecommendationIds.push(ins[0].id);
    }
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
        if (inserted.length > 0) {
          insertedRecommendations += 1;
          newRecommendationIds.push(inserted[0].id);
        }
      }
    }
  } catch (error) {
    llmError = error instanceof Error ? error.message : String(error);
    console.error("[conception/analyze][llm]", error);
  }

  let baselineRecommendationsInserted = 0;
  const baselineResult = await insertBaselineRecommendationsIfEmpty(
    insertedRecommendations,
    newRecommendationIds,
    enrichDraft
  );
  insertedRecommendations = baselineResult.total;
  baselineRecommendationsInserted = baselineResult.baselineInserted;

  let vitrinaRecommendations: VitrinaProductMarketingRecommendation[] = [];
  try {
    vitrinaRecommendations = await listVitrinaProductMarketingRecommendations({ limit: 200 });
    await writeVitrinaRecommendationsCache(vitrinaRecommendations);
  } catch (error) {
    console.error("[conception/analyze][vitrina]", error);
  }

  let emailsSent = 0;
  let emailsFailed = 0;
  const autoSendOnAnalyze =
    isBrevoAutomatedEmailEnabled() &&
    process.env.BREVO_AUTO_SEND_ON_ANALYZE?.trim().toLowerCase() !== "false";

  if (autoSendOnAnalyze && newRecommendationIds.length > 0) {
    const emailResult = await autoSendRecommendationEmails(newRecommendationIds);
    emailsSent = emailResult.sent;
    emailsFailed = emailResult.failed;
    if (emailResult.errors.length > 0) {
      console.warn("[conception/analyze][auto-email]", emailResult.errors.join("; "));
    }
  }

  return {
    insertedAlerts,
    insertedRecommendations,
    emailsSent,
    emailsFailed,
    llmUsed,
    llmSummary,
    llmError,
    llmModel,
    geminiConfigured: isGeminiConfigured(),
    baselineRecommendationsInserted,
    vitrinaRecommendations,
  };
}
