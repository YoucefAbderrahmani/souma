import { buildConceptionAnalyzeSignals } from "@/server/conception/metrics";
import { db } from "@/server/db";
import { conceptionAlertTable, conceptionRecommendationTable } from "@/server/db/schema";

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
      title: "Chute de conversion",
      description: "Taux de conversion inférieur de plus de 20 % à la moyenne de la fenêtre précédente (7 jours).",
      detail: `Taux actuel ${(100 * s.rateNow).toFixed(2)} % vs référence ${(100 * s.rateOld).toFixed(2)} %.`,
      affectedSessionsEstimate: null,
      metadataJson: JSON.stringify({ rateNow: s.rateNow, rateOld: s.rateOld }),
      fingerprint: dayFingerprint("CONVERSION_DROP"),
    });
  }

  if (s.events15m > s.baseline15 * 4) {
    alerts.push({
      alertType: "TRAFFIC_SPIKE",
      severity: "high",
      title: "Trafic anormal",
      description: "Augmentation brutale du volume d'événements sur les 15 dernières minutes.",
      detail: `${s.events15m} événements vs ~${Math.round(s.baseline15)} attendus par quinzaine de minutes (baseline 90 min).`,
      affectedSessionsEstimate: null,
      metadataJson: JSON.stringify({ events15m: s.events15m, baseline15: s.baseline15 }),
      fingerprint: hourFingerprint("TRAFFIC_SPIKE"),
    });
  }

  if (s.cart2h >= 8 && s.cartAbandon2h >= 0.8) {
    alerts.push({
      alertType: "CART_ABANDON_MASS",
      severity: "medium",
      title: "Abandon panier massif",
      description: "Taux d'abandon panier supérieur à 80 % sur une fenêtre de 2 heures.",
      detail: `${s.cart2h} sessions avec ajout panier, ${s.final2h} achats confirmés (pa_purchase).`,
      affectedSessionsEstimate: Math.max(0, s.cart2h - s.final2h),
      metadataJson: JSON.stringify({ cart2h: s.cart2h, final2h: s.final2h }),
      fingerprint: hourFingerprint("CART_ABANDON_MASS"),
    });
  }

  if (s.sessionsCheckout2h > 0 && s.jsErrorSessions / s.sessionsCheckout2h >= 0.05) {
    alerts.push({
      alertType: "JS_ERROR_BURST",
      severity: "high",
      title: "Erreur technique (client)",
      description: "Erreurs JavaScript détectées sur plus de 5 % des sessions touchant le checkout (2 h).",
      detail: `${s.jsErrorSessions} session(s) avec pa_js_error sur ${s.sessionsCheckout2h} sessions checkout.`,
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
      title: "Problème de performance",
      description: "Temps de chargement ou LCP supérieur à 4 secondes sur plusieurs sessions.",
      detail: `${perfSessions} sessions avec navigation lente ou LCP élevé (2 h).`,
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
      impactLabel: "+4–8 % de conversion (estim.)",
      title: "Renforcer l’intention entre page produit et panier",
      analysis: `Seulement ${(100 * (f.nCart / f.nProduct)).toFixed(1)} % des vues produit se traduisent par un clic d’achat.`,
      recommendation:
        "Clarifier le prix TTC, la disponibilité et la livraison au-dessus de la ligne de flottaison ; renforcer les avis et la garantie près du CTA principal.",
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
      impactLabel: "+5–10 % de conversion (estim.)",
      title: "Réduire la friction panier → paiement",
      analysis: `${(100 * (1 - f.nCheckoutPath / f.nCart)).toFixed(1)} % des sessions avec intention d’achat ne parviennent pas à une étape de paiement.`,
      recommendation:
        "Activer le paiement invité, réduire les champs du formulaire sur mobile, afficher tôt les frais de livraison et une barre de progression du tunnel.",
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
      impactLabel: "+2–4 % de conversion (estim.)",
      title: "Optimiser le LCP des pages produit",
      analysis: "Plusieurs sessions présentent un LCP supérieur à 4 s, ce qui augmente le rebond avant interaction.",
      recommendation:
        "Compresser les visuels (WebP/AVIF), lazy-load hors viewport, prioriser le hero et limiter les scripts tiers sur la fiche produit.",
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

  return { insertedAlerts, insertedRecommendations };
}
