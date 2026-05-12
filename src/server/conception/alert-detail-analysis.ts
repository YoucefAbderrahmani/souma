import { buildConceptionAnalyzeSignals, buildConceptionOverview } from "@/server/conception/metrics";
import { getConceptionAlertById } from "@/server/conception/conception-db";
import type {
  ConceptionAlertDetailAnalysisDto,
  ConceptionAlertDetailDeviation,
  ConceptionAlertDetailIndicator,
} from "@/types/conception-admin";

type AlertRecord = NonNullable<Awaited<ReturnType<typeof getConceptionAlertById>>>;

function fmtInt(n: number) {
  return new Intl.NumberFormat("en-US").format(Math.round(n));
}

function fmtPct(p: number, digits = 1) {
  if (!Number.isFinite(p)) return "0%";
  return `${p.toFixed(digits)}%`;
}

function parseMetadata(metadataJson: string | null): Record<string, unknown> {
  if (!metadataJson) return {};
  try {
    const parsed = JSON.parse(metadataJson) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ?
        (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function deviationTone(deltaPct: number): ConceptionAlertDetailDeviation["tone"] {
  if (deltaPct <= -20) return "critical";
  if (deltaPct <= -10) return "high";
  if (deltaPct < 0) return "medium";
  return "low";
}

function buildConversionDropAnalysis(
  alert: AlertRecord,
  signals: Awaited<ReturnType<typeof buildConceptionAnalyzeSignals>>,
  overview: Awaited<ReturnType<typeof buildConceptionOverview>>
): ConceptionAlertDetailAnalysisDto {
  const deltaPct = signals.rateOld > 0 ? ((signals.rateNow - signals.rateOld) / signals.rateOld) * 100 : 0;
  const indicators: ConceptionAlertDetailIndicator[] = [
    { label: "Conversion rate (7 d)", value: fmtPct(100 * signals.rateNow, 2) },
    { label: "Reference (previous 7 d)", value: fmtPct(100 * signals.rateOld, 2) },
    { label: "Product view sessions", value: fmtInt(signals.funnel7.nProduct) },
    { label: "Completed orders", value: fmtInt(signals.funnel7.nFinal) },
    { label: "Collected events (7 d)", value: fmtInt(overview.totalEvents7d) },
  ];
  const deviations: ConceptionAlertDetailDeviation[] = [
    {
      label: "Conversion vs previous window",
      value: `${deltaPct >= 0 ? "+" : ""}${fmtPct(deltaPct, 1)}`,
      baseline: fmtPct(100 * signals.rateOld, 2),
      tone: deviationTone(deltaPct),
    },
  ];

  return {
    alertId: alert.id,
    alertType: alert.alertType,
    summary:
      `The funnel records ${fmtPct(100 * signals.rateNow, 2)} conversion over 7 days, versus ${fmtPct(100 * signals.rateOld, 2)} in the previous window.`,
    indicators,
    deviations,
    clues: [
      `${fmtInt(signals.funnel7.nProduct)} sessions reached a product page; ${fmtInt(signals.funnel7.nFinal)} completed a purchase.`,
      `${fmtInt(signals.funnel7.nCart)} sessions added to cart and ${fmtInt(signals.funnel7.nCheckoutPath)} started checkout.`,
      overview.frictionItems[0]?.body ?? "No additional major friction was isolated in the current window.",
    ],
    fixSteps: [
      "Compare the most viewed product pages with their add-to-cart rates in Seller Helper.",
      "Verify price, availability, and shipping costs above the fold.",
      "Test the mobile funnel on cart and checkout steps.",
      "Re-run analysis after fixes to measure conversion recovery.",
    ],
    computedAt: new Date().toISOString(),
    llmEnhanced: false,
  };
}

function buildTrafficSpikeAnalysis(
  alert: AlertRecord,
  signals: Awaited<ReturnType<typeof buildConceptionAnalyzeSignals>>
): ConceptionAlertDetailAnalysisDto {
  const ratio = signals.baseline15 > 0 ? signals.events15m / signals.baseline15 : 0;
  const deltaPct = (ratio - 1) * 100;
  return {
    alertId: alert.id,
    alertType: alert.alertType,
    summary: `${fmtInt(signals.events15m)} events were collected over 15 minutes, against a baseline of about ${fmtInt(Math.round(signals.baseline15))} per 15-minute window.`,
    indicators: [
      { label: "Events (15 min)", value: fmtInt(signals.events15m) },
      { label: "Expected baseline (15 min)", value: fmtInt(Math.round(signals.baseline15)) },
      { label: "Observed / expected ratio", value: `×${ratio.toFixed(2)}` },
      { label: "Active sessions (15 min)", value: fmtInt(signals.events15m > 0 ? signals.events15m : 0) },
    ],
    deviations: [
      {
        label: "Volume vs 90 min baseline",
        value: `${deltaPct >= 0 ? "+" : ""}${fmtPct(deltaPct, 0)}`,
        baseline: fmtInt(Math.round(signals.baseline15)),
        tone: deltaPct >= 300 ? "critical" : deltaPct >= 150 ? "high" : "medium",
      },
    ],
    clues: [
      "A sharp spike may come from a campaign, aggressive crawl, or a looping client script.",
      "Cross-check this signal with the Security section for high-velocity sessions.",
      alert.detail ?? "The engine detected event density inconsistent with usual traffic.",
    ],
    fixSteps: [
      "Filter abnormal IPs or user agents on ingestion if the spike is not commercial.",
      "Verify no automated test is sending pa_* events in a loop on the store.",
      "Monitor server load and response time on the most affected pages.",
    ],
    computedAt: new Date().toISOString(),
    llmEnhanced: false,
  };
}

function buildCartAbandonAnalysis(
  alert: AlertRecord,
  signals: Awaited<ReturnType<typeof buildConceptionAnalyzeSignals>>
): ConceptionAlertDetailAnalysisDto {
  const abandonPct = 100 * signals.cartAbandon2h;
  return {
    alertId: alert.id,
    alertType: alert.alertType,
    summary: `${fmtInt(signals.cart2h)} sessions with add-to-cart produced only ${fmtInt(signals.final2h)} confirmed purchases over 2 hours.`,
    indicators: [
      { label: "Cart sessions (2 h)", value: fmtInt(signals.cart2h) },
      { label: "Confirmed purchases (2 h)", value: fmtInt(signals.final2h) },
      { label: "Estimated cart abandonment", value: fmtPct(abandonPct, 1) },
      {
        label: "Affected sessions (estimate)",
        value:
          alert.affectedSessionsEstimate != null ?
            fmtInt(alert.affectedSessionsEstimate)
          : fmtInt(Math.max(0, signals.cart2h - signals.final2h)),
      },
    ],
    deviations: [
      {
        label: "Cart abandonment vs target (< 80%)",
        value: fmtPct(abandonPct, 1),
        baseline: "80.0%",
        tone: abandonPct >= 90 ? "critical" : abandonPct >= 80 ? "high" : "medium",
      },
    ],
    clues: [
      "Loss often concentrates between cart and checkout initiation.",
      `${fmtInt(signals.sessionsCheckout2h)} sessions touched checkout in the same window.`,
      alert.description,
    ],
    fixSteps: [
      "Enable or simplify guest checkout and reduce required fields on mobile.",
      "Show shipping costs and estimated delivery early.",
      "Check JavaScript errors on checkout via pa_js_error events.",
    ],
    computedAt: new Date().toISOString(),
    llmEnhanced: false,
  };
}

function buildJsErrorAnalysis(
  alert: AlertRecord,
  signals: Awaited<ReturnType<typeof buildConceptionAnalyzeSignals>>
): ConceptionAlertDetailAnalysisDto {
  const errorRate = signals.sessionsCheckout2h > 0 ? (100 * signals.jsErrorSessions) / signals.sessionsCheckout2h : 0;
  return {
    alertId: alert.id,
    alertType: alert.alertType,
    summary: `${fmtInt(signals.jsErrorSessions)} checkout sessions recorded at least one client error over 2 hours.`,
    indicators: [
      { label: "Checkout sessions (2 h)", value: fmtInt(signals.sessionsCheckout2h) },
      { label: "Sessions with pa_js_error", value: fmtInt(signals.jsErrorSessions) },
      { label: "Estimated error rate", value: fmtPct(errorRate, 1) },
    ],
    deviations: [
      {
        label: "Errors vs threshold (5%)",
        value: fmtPct(errorRate, 1),
        baseline: "5.0%",
        tone: errorRate >= 10 ? "critical" : errorRate >= 5 ? "high" : "medium",
      },
    ],
    clues: [
      "Checkout errors often block cart validation or payment.",
      alert.detail ?? "Inspect error messages reported by the client script.",
    ],
    fixSteps: [
      "Reproduce the journey on mobile and desktop with the console open.",
      "Fix third-party scripts or null property access on the payment page.",
      "Redeploy and monitor pa_js_error rate decline over 2 hours.",
    ],
    computedAt: new Date().toISOString(),
    llmEnhanced: false,
  };
}

function buildPerformanceAnalysis(
  alert: AlertRecord,
  signals: Awaited<ReturnType<typeof buildConceptionAnalyzeSignals>>
): ConceptionAlertDetailAnalysisDto {
  return {
    alertId: alert.id,
    alertType: alert.alertType,
    summary: `${fmtInt(signals.slowNavSessions)} sessions show slow navigation or elevated LCP over 2 hours.`,
    indicators: [
      { label: "Slow sessions (2 h)", value: fmtInt(signals.slowNavSessions) },
      { label: "LCP / load threshold", value: "> 4 s" },
      {
        label: "Affected sessions (estimate)",
        value:
          alert.affectedSessionsEstimate != null ?
            fmtInt(alert.affectedSessionsEstimate)
          : fmtInt(signals.slowNavSessions),
      },
    ],
    deviations: [
      {
        label: "Slow session volume",
        value: fmtInt(signals.slowNavSessions),
        baseline: "< 5 sessions",
        tone: signals.slowNavSessions >= 10 ? "critical" : signals.slowNavSessions >= 5 ? "high" : "medium",
      },
    ],
    clues: [
      "Image-heavy product pages degrade LCP and increase bounce.",
      alert.detail ?? "pa_performance events report load times above the threshold.",
    ],
    fixSteps: [
      "Compress product visuals (WebP/AVIF) and lazy-load below the fold.",
      "Reduce third-party scripts on the product page and checkout.",
      "Re-measure LCP after optimization.",
    ],
    computedAt: new Date().toISOString(),
    llmEnhanced: false,
  };
}

function buildSecurityAnalysis(
  alert: AlertRecord,
  overview: Awaited<ReturnType<typeof buildConceptionOverview>>
): ConceptionAlertDetailAnalysisDto {
  return {
    alertId: alert.id,
    alertType: alert.alertType,
    summary: `${fmtInt(overview.security.highVelocitySessions)} session(s) show event density inconsistent with human browsing over 7 days.`,
    indicators: [
      { label: "High-velocity sessions", value: fmtInt(overview.security.highVelocitySessions) },
      { label: "Suspicious sessions (7 d)", value: fmtInt(overview.security.suspiciousSessions7d) },
      { label: "Collected events (7 d)", value: fmtInt(overview.totalEvents7d) },
      {
        label: "Affected sessions (estimate)",
        value:
          alert.affectedSessionsEstimate != null ?
            fmtInt(alert.affectedSessionsEstimate)
          : fmtInt(overview.security.highVelocitySessions),
      },
    ],
    deviations: [
      {
        label: "High-velocity sessions vs threshold",
        value: fmtInt(overview.security.highVelocitySessions),
        baseline: "0 sessions",
        tone: overview.security.highVelocitySessions >= 3 ? "critical" : "high",
      },
    ],
    clues: overview.security.notes,
    fixSteps: [
      "Identify affected session_key values in admin analytics and block repetitive patterns.",
      "Verify no test script is sending pa_product_view bursts.",
      "Strengthen client-side detection (cb_* / pa_* events) if noise persists.",
    ],
    computedAt: new Date().toISOString(),
    llmEnhanced: false,
  };
}

function buildGenericAnalysis(
  alert: AlertRecord,
  overview: Awaited<ReturnType<typeof buildConceptionOverview>>,
  metadata: Record<string, unknown>
): ConceptionAlertDetailAnalysisDto {
  const indicators: ConceptionAlertDetailIndicator[] = [
    { label: "Severity", value: alert.severity.toUpperCase() },
    { label: "Events (7 d)", value: fmtInt(overview.totalEvents7d) },
    { label: "Active visitors (15 min)", value: fmtInt(overview.activeVisitors15m) },
  ];

  if (alert.affectedSessionsEstimate != null) {
    indicators.push({
      label: "Affected sessions (estimate)",
      value: fmtInt(alert.affectedSessionsEstimate),
    });
  }

  const metadataClues = Object.entries(metadata)
    .filter(([key, value]) => key !== "source" && value != null)
    .map(([key, value]) => `${key} : ${typeof value === "object" ? JSON.stringify(value) : String(value)}`);

  return {
    alertId: alert.id,
    alertType: alert.alertType,
    summary: alert.description,
    indicators,
    deviations: [],
    clues: [alert.detail ?? "No additional detail recorded for this alert.", ...metadataClues],
    fixSteps: [
      "Open Dashboard, Funnel, and Behavior sections to correlate signals.",
      "Re-run global analysis after fixes to confirm the alert clears.",
    ],
    computedAt: new Date().toISOString(),
    llmEnhanced: false,
  };
}

export async function analyzeConceptionAlertById(alertId: string): Promise<ConceptionAlertDetailAnalysisDto | null> {
  const alert = await getConceptionAlertById(alertId);
  if (!alert) return null;

  const [signals, overview] = await Promise.all([buildConceptionAnalyzeSignals(), buildConceptionOverview()]);
  const metadata = parseMetadata(alert.metadataJson);
  const type = alert.alertType.toUpperCase();

  if (type.includes("CONVERSION_DROP")) {
    return buildConversionDropAnalysis(alert, signals, overview);
  }
  if (type.includes("TRAFFIC_SPIKE")) {
    return buildTrafficSpikeAnalysis(alert, signals);
  }
  if (type.includes("CART_ABANDON")) {
    return buildCartAbandonAnalysis(alert, signals);
  }
  if (type.includes("JS_ERROR")) {
    return buildJsErrorAnalysis(alert, signals);
  }
  if (type.includes("PERF")) {
    return buildPerformanceAnalysis(alert, signals);
  }
  if (type.includes("SECURITY") || type.includes("VELOCITY") || type.includes("SUSPICIOUS")) {
    return buildSecurityAnalysis(alert, overview);
  }

  return buildGenericAnalysis(alert, overview, metadata);
}
