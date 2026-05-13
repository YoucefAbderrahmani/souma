/**
 * Builds the Seller Helper — Feature, Technology, Prompt, Strategy & Policy Report.
 *
 *   node scripts/build-seller-helper-report.mjs           (HTML only)
 *   node scripts/build-seller-helper-report.mjs --pdf     (HTML + PDF, requires Playwright)
 *
 * The script reads source files from src/ so prompt blocks and rule catalogues
 * always reflect the current implementation.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT_HTML = path.join(ROOT, "reports", "Seller-Helper-Report.html");
const OUT_PDF = path.join(ROOT, "reports", "Seller-Helper-Report.pdf");

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function safeRead(relativePath) {
  const absolute = path.join(ROOT, relativePath);
  if (!fs.existsSync(absolute)) return null;
  return fs.readFileSync(absolute, "utf8");
}

function extractBetween(source, startMarker, endMarker) {
  if (!source) return null;
  const startIndex = source.indexOf(startMarker);
  if (startIndex === -1) return null;
  const endIndex = source.indexOf(endMarker, startIndex + startMarker.length);
  if (endIndex === -1) return null;
  return source.slice(startIndex, endIndex + endMarker.length);
}

/* -------------------------------------------------------------------------- */
/* Static narrative data                                                       */
/* -------------------------------------------------------------------------- */

const NAV_ITEMS = [
  {
    name: "Dashboard (Overview)",
    label: "Overview",
    purpose: "Traffic, devices, and top pages at a glance.",
    primarySource: "src/components/SellerHelper/SellerHelperDashboard.tsx",
    primarySignal: "All pa_* micro-events in the last 24 h / 7 d window.",
  },
  {
    name: "Timeline",
    label: "Timeline",
    purpose: "Plot any metric over time — whole store or a specific product.",
    primarySource:
      "src/components/SellerHelper/timeline-tab.tsx, src/server/seller-helper/timeline-series.ts",
    primarySignal:
      "Bucketed pa_* micro-events over the selected range (24 h hourly · 7/30/90 d daily).",
  },
  {
    name: "User Behavior",
    label: "Behavior",
    purpose: "Heatmaps, journeys, scroll depth, and session replays.",
    primarySource: "src/components/SellerHelper/sections.tsx, ProductPageHeatmap.tsx",
    primarySignal: "pa_scroll, pa_pointer_hover, pa_pointer_click, pa_product_view_time.",
  },
  {
    name: "Conversion Funnel",
    label: "Funnel",
    purpose: "Drop-offs from product view to payment.",
    primarySource: "src/server/conception/metrics.ts (funnelCounts)",
    primarySignal: "pa_product_view → pa_add_to_cart → pa_begin_checkout → pa_purchase.",
  },
  {
    name: "Vitrina Recommendation",
    label: "Vitrina",
    purpose: "Catalog and merchandising fixes by product.",
    primarySource: "src/server/seller-helper/product-marketing-recommendations.ts",
    primarySignal: "Per-product aggregates over 7 days joined with the product catalogue.",
  },
  {
    name: "AI Recommendations",
    label: "AI",
    purpose: "Prioritised actions derived from analytics signals.",
    primarySource: "src/server/conception/llm-analysis.ts, analyze.ts",
    primarySignal: "Conception overview snapshot + funnel/security signals sent to the LLM.",
  },
  {
    name: "Alerts",
    label: "Alerts",
    purpose: "Active incidents and recent resolutions.",
    primarySource: "src/server/conception/analyze.ts, alert-detail-analysis.ts",
    primarySignal: "Rule engine on rolling windows of micro-events + LLM-emitted alerts.",
  },
  {
    name: "Security",
    label: "Security",
    purpose: "Suspicious sessions, data integrity, and session blocking.",
    primarySource: "src/server/conception/security-intel.ts, apply-security-quick-fixes.ts",
    primarySignal: "Per-session aggregates over 7 days, with 14-day reference window.",
  },
];

const TECH_ROWS = [
  ["Layer", "Technology / Library", "Role inside Seller Helper"],
  ["App Router page", "Next.js 15 (React 19) — server component", "Authenticates the request, gates admin access, prefetches data for hydration."],
  ["Client dashboard", "React Client Component + Redux-aware hooks", "Renders the 7 tabs and manages the active section via local state."],
  ["Styling", "Tailwind CSS 3 + tailwind-merge + class-variance-authority", "Cohesive panel/insight/badge primitives in layout.ts shared across tabs."],
  ["Icons", "lucide-react", "Section icons (Store, Compass, AlertTriangle, Shield, Bell, Zap, Users…)."],
  ["Carousels", "Swiper", "Featured Vitrina recommendations slider with custom navigation."],
  ["Charts", "Custom SVG (TrafficChart, ThreatActivityChart, ProgressBar)", "Lightweight chart primitives in charts.tsx — no chart library dependency."],
  ["State sync", "React state + custom useConceptionAdminData hook", "Holds overview/alerts/recommendations/security data, exposes refresh/runAnalyze/dismiss handlers."],
  ["Server runtime", "Next.js Route Handlers (Node)", "Server actions for analysis, alert detail, quick fixes."],
  ["Database", "PostgreSQL through Drizzle ORM", "sales_micro_event, conception_alert, conception_recommendation, conception_security_block tables."],
  ["LLM (primary)", "OpenRouter Chat Completions API", "JSON-mode completions for the conception analysis pass."],
  ["LLM (fallback)", "Google Generative Language API (Gemini 2.0 Flash)", "Used when OpenRouter returns credit / quota errors."],
  ["Validation", "Zod schemas", "Hard schema for LLM output (severity, priority, ranges) before persisting."],
  ["Auth", "Better Auth (server)", "Session + privileged admin email gating for /seller-helper and admin APIs."],
  ["Telemetry contract", "pa_* event whitelist (event-contract.ts)", "Stable funnel + interaction event names from the storefront."],
  ["Pricing / catalog", "product-content.ts, product-page-link.ts", "Parses product description blocks, builds canonical product URLs."],
  ["Image rendering", "next/image", "Optimised thumbnails in the Vitrina cards (64×64) and modals."],
  ["Internationalisation", "Intl.NumberFormat + Intl.RelativeTimeFormat", "Dashboard uses en-US; security tab uses fr-FR (Algerian merchant audience)."],
];

const ENV_ROWS = [
  ["Variable", "Required for", "Notes"],
  ["OPENROUTER_API_KEY", "AI Recommendations (primary LLM)", "Without it, only rule-engine alerts and Vitrina heuristics are produced."],
  ["CONCEPTION_OPENROUTER_MODEL", "AI Recommendations (override)", "Falls back to ASSISTANT_FREEFLOW_MODEL, then google/gemini-2.0-flash-001."],
  ["GOOGLE_API_KEY", "AI Recommendations (Gemini fallback)", "Used when OpenRouter fails with 402/insufficient credits."],
  ["CONCEPTION_GEMINI_MODEL", "AI Recommendations (Gemini override)", "Defaults to gemini-2.0-flash."],
  ["CONCEPTION_LLM_GEMINI_FALLBACK", "Override fallback policy", "Set to 'true' to always fall back, 'false' to never fall back."],
  ["DATABASE_URL", "All Seller Helper data", "PostgreSQL connection used by Drizzle in src/server/db."],
  ["BETTER_AUTH_URL / NEXT_PUBLIC_APP_URL", "OpenRouter HTTP-Referer header", "Identifies the calling app on OpenRouter."],
];

const RULE_ENGINE = [
  {
    code: "CONVERSION_DROP",
    severity: "critical",
    window: "7 days vs previous 7 days",
    trigger: "rateNow < 0.8 × rateOld (and rateOld > 0.001)",
    detail: "Conversion rate has dropped more than 20% versus the rolling reference. Detail captures both rates so operators can compare instantly.",
    fingerprint: "Daily — one alert per UTC day.",
  },
  {
    code: "TRAFFIC_SPIKE",
    severity: "high",
    window: "Last 15 minutes vs 90-minute baseline",
    trigger: "events15m > baseline15 × 4",
    detail: "Event density at least 4× the 90-minute average over a 15-minute window. Hourly fingerprint avoids spam during sustained spikes.",
    fingerprint: "Hourly — one alert per UTC hour.",
  },
  {
    code: "CART_ABANDON_MASS",
    severity: "medium",
    window: "Rolling 2 hours",
    trigger: "cart2h ≥ 8 AND cartAbandon2h ≥ 0.8",
    detail: "At least 8 sessions added to cart in 2 hours and 80%+ never reached pa_purchase. affectedSessionsEstimate = cart2h − final2h.",
    fingerprint: "Hourly.",
  },
  {
    code: "JS_ERROR_BURST",
    severity: "high",
    window: "Rolling 2 hours",
    trigger: "jsErrorSessions / sessionsCheckout2h ≥ 0.05",
    detail: "More than 5% of checkout sessions raise pa_js_error events — usually a regression on the checkout page.",
    fingerprint: "Hourly.",
  },
  {
    code: "PERF_SLOW",
    severity: "low",
    window: "Rolling 2 hours",
    trigger: "slowNavSessions + lcpSlowSessions ≥ 5",
    detail: "Five or more sessions show slow navigation or LCP > 4 s, often image weight on the product page.",
    fingerprint: "Hourly.",
  },
];

const FUNNEL_RECOS = [
  {
    code: "REC_FUNNEL_PRODUCT_CART",
    priority: "high",
    trigger: "nCart / nProduct < 0.35 (with nProduct > 0)",
    impact: "+4–8% conversion (est.)",
    confidence: 82,
    recommendation:
      "Clarify all-in price, availability, and shipping above the fold; strengthen reviews and guarantees near the primary CTA.",
  },
  {
    code: "REC_FUNNEL_CART_CHECKOUT",
    priority: "high",
    trigger: "nCheckoutPath / nCart < 0.45 (with nCart > 0)",
    impact: "+5–10% conversion (est.)",
    confidence: 88,
    recommendation:
      "Enable guest checkout, reduce form fields on mobile, show shipping costs early, and add a funnel progress bar.",
  },
  {
    code: "REC_LCP_PERF",
    priority: "medium",
    trigger: "lcpSlowSessions ≥ 3",
    impact: "+2–4% conversion (est.)",
    confidence: 76,
    recommendation:
      "Compress visuals (WebP/AVIF), lazy-load below the fold, prioritise the hero, and limit third-party scripts on the product page.",
  },
];

const VITRINA_TIPS = [
  {
    label: "Price tip",
    priority: "high / medium",
    trigger:
      "views ≥ 6 AND ( (viewToCartRate < 10%) OR (priceZoneClicks ≥ 3 AND addToCarts low) ) — price-sensitive case; or views ≥ 6 AND viewToCartRate ≥ 10% with an active jomlaPrice — well-priced case.",
    action:
      "Surface the selling price on the catalog thumbnail; if no Vitrina promo price is set, suggest enabling one via the promo_price quick fix.",
  },
  {
    label: "Quantity & availability",
    priority: "high / medium",
    trigger: "product.instock > 0 AND (views ≥ 10 OR hovers ≥ 12 OR clicks ≥ 8 OR baseline views ≥ 6)",
    action:
      "Display in-stock copy on thumbnail and detail page; severity goes high when only 5 or fewer units remain while demand rises.",
  },
  {
    label: "Quality concern",
    priority: "high / medium",
    trigger:
      "reviewInteractions ≥ 3 OR (product.rating between 0 and 3.5 AND views ≥ 5)",
    action:
      "Highlight rating proof and reassurance near the CTA; the priority promotes to high once five or more shoppers open the reviews section.",
  },
];

const QUICK_FIXES_VITRINA = [
  {
    id: "default_color",
    label: "Default color",
    summary: "Move the most-selected colour to the first option so the PDP opens on the preferred shade.",
    effect: "Reorders the colours array in the product description (parseProductContent / serializeProductContent).",
  },
  {
    id: "promo_price",
    label: "Vitrina promo price",
    summary: "Set jomlaPrice to price ÷ (1 + 0.20) so the storefront shows a Vitrina promo with the original as strikethrough.",
    effect: "Writes a new jomlaPrice on products.jomla_price.",
  },
  {
    id: "availability_note",
    label: "Availability message",
    summary: "Upsert an Availability entry — 'In stock — N unit(s) ready to ship.' — in the product description.",
    effect: "Writes the Availability additional-info key on products.description.",
  },
  {
    id: "quality_highlight",
    label: "Quality reassurance",
    summary: "Upsert a Quality entry showing the current rating (or a generic reassurance line if there's none yet).",
    effect: "Writes the Quality additional-info key on products.description.",
  },
];

const QUICK_FIXES_SECURITY = [
  {
    id: "block_session",
    label: "Bloquer la session",
    summary: "Adds the session_key to conception_security_block with a manual reason.",
    effect: "Upserts a row; on conflict, the existing row is reactivated (blockedAt reset, liftedAt cleared).",
  },
  {
    id: "unblock_session",
    label: "Débloquer la session",
    summary: "Lifts an active block by setting conception_security_block.lifted_at = now().",
    effect: "Only the current open block (lifted_at IS NULL) is updated.",
  },
];

const SECURITY_RULES = [
  {
    code: "Bot scraping (high velocity)",
    trigger: "events ≥ 50 AND 0 < duration_s ≤ 360",
    score: "+40",
  },
  {
    code: "Bot scraping (catalogue scrape)",
    trigger: "product_views ≥ 25 AND 0 < duration_s ≤ 600",
    score: "+25",
  },
  {
    code: "Click fraud",
    trigger: "clicks ≥ 35 AND 0 < duration_s ≤ 300",
    score: "+20",
  },
  {
    code: "Fake checkout",
    trigger: "checkouts > 0 AND no pa_product_view in the same session",
    score: "+15",
  },
  {
    code: "JS error storm",
    trigger: "js_errors ≥ 3",
    score: "+10",
  },
  {
    code: "Clickfarm pattern (low engagement)",
    trigger: "hovers ≤ 1 AND clicks ≥ 10",
    score: "+8",
  },
];

const POLICIES = [
  {
    title: "Privileged access only",
    body:
      "/seller-helper resolves the current Better Auth session, joins user.role, and unions with the privileged admin email list. Anything that is not admin sees a stub page with links back to /my-account and / — no metrics are shipped to the client.",
  },
  {
    title: "Server-rendered data, hydrated once",
    body:
      "The page server-fetches the conception overview, active alerts, dismissed alerts and Vitrina recommendations in parallel (Promise.all). The client receives a typed ConceptionAdminInitialData payload and uses it as the initial state of useConceptionAdminData — no waterfall on first paint.",
  },
  {
    title: "Schema-validated LLM output",
    body:
      "Every LLM response goes through extractJsonObject, a permissive normaliser (English/French keys), then a Zod schema with hard enums (severity, priority) and clamped numeric ranges. If validation fails, the response is rejected — never written to the DB.",
  },
  {
    title: "Idempotent, deduplicated writes",
    body:
      "Alerts and recommendations use stable fingerprints (CONVERSION_DROP-2026-05-12, REC_FUNNEL_CART_CHECKOUT-2026-05-12). Inserts are onConflictDoNothing against the fingerprint, so re-running the analysis job is safe.",
  },
  {
    title: "No raw PII in micro-events",
    body:
      "session_key is an opaque identifier. The security brief explicitly notes: 'Les identités client sont dérivées des clés de session — aucune adresse IP n'est stockée dans les micro-événements.' Display identities are masked (sliced + ellipsis).",
  },
  {
    title: "Bounded prompts and JSON-only contract",
    body:
      "Both the conception system prompt and the Vitrina prompt force a single top-level JSON object with explicit keys, capped arrays (≤ 6 alerts, ≤ 8 recommendations, ≤ 3 Vitrina products), bounded string lengths and confidence ∈ [0, 100]. Temperature is fixed at 0.2.",
  },
  {
    title: "Provider fallback with retry budget",
    body:
      "OpenRouter is tried up to 3 times with exponential backoff on 429/5xx. A 402 (insufficient credits) automatically routes the same prompt to Gemini, unless CONCEPTION_LLM_GEMINI_FALLBACK overrides this default.",
  },
  {
    title: "Localised seller voice",
    body:
      "Dashboard copy is in English (en-US), but recommendation prose written by the LLM and the entire Security tab are forced to French — the Algerian merchant audience reads operational text in French and DA prices.",
  },
  {
    title: "Quick fixes are scoped and reversible",
    body:
      "Vitrina quick fixes can only mutate four whitelisted fields (jomla_price, description.colors, Availability, Quality). Security quick fixes can only block or unblock a session — never delete events.",
  },
];

const FILE_INDEX = [
  ["src/app/(site)/(pages)/seller-helper/page.tsx", "Server page — auth, admin gating, prefetch."],
  ["src/components/SellerHelper/SellerHelperDashboard.tsx", "Client dashboard shell, hero, nav and tab switcher."],
  ["src/components/SellerHelper/nav.ts", "Nav item enumeration and tab metadata (label + description)."],
  ["src/components/SellerHelper/layout.ts", "Tailwind class primitives shared across all tabs."],
  ["src/components/SellerHelper/sections.tsx", "User Behavior, Alerts and AI Recommendations tab content."],
  ["src/components/SellerHelper/timeline-tab.tsx", "Timeline tab — metric/scope/range selectors + big chart + KPI strip."],
  ["src/server/seller-helper/timeline-series.ts", "Bucketed timeline aggregator (whole store or per-product)."],
  ["src/types/seller-helper-timeline.ts", "Timeline metric, range, scope, DTO definitions and applied-action kind catalogue."],
  ["src/app/api/admin/seller-helper/timeline/route.ts", "GET endpoint returning the bucketed timeline DTO."],
  ["src/app/api/admin/seller-helper/timeline/products/route.ts", "GET endpoint listing products available for per-product timelines."],
  ["src/server/seller-helper/applied-actions.ts", "Audit logger + range reader for Timeline checkpoint markers."],
  ["src/components/SellerHelper/AppliedActionDetailsModal.tsx", "Modal that renders full context for a checkpoint when clicked on the chart."],
  ["scripts/ensure-seller-helper-applied-action.mjs", "Idempotent DDL script that ensures seller_helper_applied_action exists."],
  ["src/components/SellerHelper/vitrina-recommendations.tsx", "Vitrina tab — search/filter/sort + featured Swiper + grid."],
  ["src/components/SellerHelper/security-tab.tsx", "Security tab — KPIs, threats, incidents and blocked sessions."],
  ["src/components/SellerHelper/charts.tsx", "Custom SVG charts (TrafficChart, ThreatActivityChart, ProgressBar)."],
  ["src/components/SellerHelper/ProductPageHeatmap.tsx", "Product page heatmap visualisation."],
  ["src/components/SellerHelper/VitrinaQuickEditModal.tsx", "Inline product editor (title, price, description, colours…)."],
  ["src/components/SellerHelper/VitrinaQuickFixConfirmModal.tsx", "Confirmation modal for Vitrina quick fixes."],
  ["src/components/SellerHelper/SecurityQuickFixConfirmModal.tsx", "Confirmation modal for security block / unblock."],
  ["src/hooks/useConceptionAdminData.ts", "Hook that hydrates overview/alerts/recommendations and exposes actions."],
  ["src/server/conception/metrics.ts", "Funnel, KPIs, devices, top pages and overview DTO builder."],
  ["src/server/conception/analyze.ts", "Rule-engine + LLM orchestrator (runConceptionAnalysisJob)."],
  ["src/server/conception/llm-analysis.ts", "OpenRouter + Gemini analysis pipeline with Zod validation."],
  ["src/server/conception/alert-detail-analysis.ts", "Per-alert deterministic deep-dive used by the Alerts modal."],
  ["src/server/conception/alert-rules.ts", "Catalogue of active rules surfaced on the Alerts tab."],
  ["src/server/conception/security-intel.ts", "Security brief — KPIs, threats 24 h chart, incidents, blocks."],
  ["src/server/conception/apply-security-quick-fixes.ts", "Server logic for block_session / unblock_session quick fixes."],
  ["src/server/seller-helper/product-marketing-recommendations.ts", "Heuristic Vitrina recommendations and signal aggregation."],
  ["src/server/seller-helper/vitrina-recommendation-prompt.ts", "Prompt builder for the Vitrina LLM merchandising pass."],
  ["src/server/seller-helper/apply-vitrina-quick-fixes.ts", "Server logic for the 4 Vitrina quick fixes."],
  ["src/server/conception/event-contract.ts", "STORE_EVENT enumeration and PA_JS_ERROR constant."],
  ["src/server/lib/openrouter-client.ts", "OpenRouter HTTP client used by the LLM analysis pipeline."],
];

const GLOSSARY = [
  ["Seller Helper", "Admin-only operations console for store owners. Combines analytics, AI recommendations, alerts, and security tools behind one URL: /seller-helper."],
  ["Conception engine", "Internal name for the rule + LLM pipeline that emits alerts and recommendations from pa_* micro-events."],
  ["Vitrina recommendations", "Per-product merchandising tips computed from interaction signals — drives the Vitrina tab."],
  ["pa_* events", "Storefront micro-events (pa_product_view, pa_pointer_click, pa_add_to_cart…). The canonical telemetry contract."],
  ["session_key", "Opaque per-session identifier. No IP or raw user data is persisted in micro-events."],
  ["Quick fix", "A small, reversible mutation triggered from the dashboard — Vitrina or Security."],
  ["Fingerprint", "Deterministic string used to deduplicate alerts and recommendations across re-runs."],
  ["Opportunity score", "Composite Vitrina score combining priority weight + log(views) traffic + viewToCart friction."],
  ["Risk score", "Per-session security score in [0, 100] — adds heuristics for bot scraping, click fraud, fake checkout, JS errors."],
  ["Importance ranking", "Shared scale (critical, high, medium, low) used to sort friction items, alerts and recommendations."],
];

/* -------------------------------------------------------------------------- */
/* Source extraction helpers                                                   */
/* -------------------------------------------------------------------------- */

function extractPrompts() {
  const llmAnalysisSrc = safeRead("src/server/conception/llm-analysis.ts") ?? "";
  const vitrinaSrc = safeRead("src/server/seller-helper/vitrina-recommendation-prompt.ts") ?? "";

  const conceptionSystem = (() => {
    const block = extractBetween(
      llmAnalysisSrc,
      "function buildSystemPrompt()",
      "function buildUserPrompt"
    );
    if (!block) return "(prompt not found)";
    const backtickStart = block.indexOf("`");
    const backtickEnd = block.lastIndexOf("`");
    if (backtickStart === -1 || backtickEnd === -1 || backtickEnd <= backtickStart) {
      return "(prompt not found)";
    }
    return block.slice(backtickStart + 1, backtickEnd).trim();
  })();

  const conceptionUser = (() => {
    const block = extractBetween(
      llmAnalysisSrc,
      "function buildUserPrompt(",
      "function mapLlmOutput"
    );
    if (!block) return "(prompt not found)";
    const backtickStart = block.indexOf("`");
    const backtickEnd = block.lastIndexOf("`");
    if (backtickStart === -1 || backtickEnd === -1 || backtickEnd <= backtickStart) {
      return "(prompt not found)";
    }
    return block.slice(backtickStart + 1, backtickEnd).trim();
  })();

  const vitrinaSystem = (() => {
    const block = extractBetween(
      vitrinaSrc,
      "export function buildVitrinaRecommendationSystemPrompt()",
      "export function buildVitrinaRecommendationUserPrompt"
    );
    if (!block) return "(prompt not found)";
    const backtickStart = block.indexOf("`");
    const backtickEnd = block.lastIndexOf("`");
    if (backtickStart === -1 || backtickEnd === -1 || backtickEnd <= backtickStart) {
      return "(prompt not found)";
    }
    return block.slice(backtickStart + 1, backtickEnd).trim();
  })();

  const vitrinaUser = (() => {
    const block = extractBetween(
      vitrinaSrc,
      "export function buildVitrinaRecommendationUserPrompt(",
      "export function buildVitrinaRecommendationPromptPayload"
    );
    if (!block) return "(prompt not found)";
    const backtickStart = block.indexOf("`");
    const backtickEnd = block.lastIndexOf("`");
    if (backtickStart === -1 || backtickEnd === -1 || backtickEnd <= backtickStart) {
      return "(prompt not found)";
    }
    return block.slice(backtickStart + 1, backtickEnd).trim();
  })();

  return { conceptionSystem, conceptionUser, vitrinaSystem, vitrinaUser };
}

/* -------------------------------------------------------------------------- */
/* HTML rendering                                                              */
/* -------------------------------------------------------------------------- */

function renderTable(rows, opts = {}) {
  const cls = opts.compact ? "data data--compact" : "data";
  const head = rows[0]
    .map((cell) => `<th>${escapeHtml(cell)}</th>`)
    .join("");
  const body = rows
    .slice(1)
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td>${escapeHtml(String(cell ?? ""))}</td>`).join("")}</tr>`
    )
    .join("");
  return `<table class="${cls}"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function chapter(num, title, bodyHtml) {
  return `
  <section class="chapter" id="ch-${num}">
    <div class="chapter-kicker">Chapter ${num}</div>
    <h2>${escapeHtml(title)}</h2>
    ${bodyHtml}
  </section>`;
}

function renderArchitectureDiagram() {
  return `
  <figure class="diagram">
    <figcaption>Figure 1 — Seller Helper request and data flow</figcaption>
    <pre class="ascii">
┌─────────────────────────────────────────────────────────────────────────┐
│                 Browser  •  /seller-helper  •  Admin only               │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │     SellerHelperDashboard (Client)                                │  │
│  │  Hero · Nav · Status badges · 7 tab contents                      │  │
│  │  └─ useConceptionAdminData() → refresh / runAnalyze / dismiss     │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────▲────────────────────────────────────────┘
                              │
              Server Component prefetch (Next.js App Router)
                              │
┌─────────────────────────────▼────────────────────────────────────────┐
│  src/server/conception/*    src/server/seller-helper/*               │
│  ────────────────────────   ───────────────────────────              │
│   metrics.ts          ┐                                              │
│   security-intel.ts   ├─► buildConceptionOverview()                  │
│   alert-rules.ts      ┘                                              │
│                                                                      │
│   analyze.ts ─► rule engine + LLM (llm-analysis.ts)                  │
│                                                                      │
│   product-marketing-recommendations.ts ─► Vitrina heuristics         │
│   vitrina-recommendation-prompt.ts     ─► Vitrina LLM prompt         │
│                                                                      │
│   apply-security-quick-fixes.ts        ─► block / unblock session   │
│   apply-vitrina-quick-fixes.ts         ─► default_color, promo_price │
└──────────┬────────────────────────────────┬─────────────────────────┘
           │                                │
           ▼                                ▼
┌────────────────────┐         ┌──────────────────────────────────────┐
│ PostgreSQL         │         │  LLM providers                       │
│ sales_micro_event  │         │  OpenRouter (primary, JSON mode)     │
│ conception_alert   │         │  Gemini 2.0 Flash (fallback)         │
│ conception_recom.  │         │  Temperature 0.2 · max 2 200 tokens  │
│ conception_block   │         └──────────────────────────────────────┘
└────────────────────┘
    </pre>
  </figure>`;
}

function renderTabSequence() {
  return `
  <figure class="diagram">
    <figcaption>Figure 2 — End-to-end "Run analysis" sequence</figcaption>
    <pre class="ascii">
Admin           Dashboard          /api/admin/conception/analyze     DB        LLM
  │                 │                          │                     │         │
  │── click ───────►│                          │                     │         │
  │                 │── POST analyze ─────────►│                     │         │
  │                 │                          │── load 7d/15m/2h ──►│         │
  │                 │                          │──compute signals    │         │
  │                 │                          │──run rule engine───►│         │
  │                 │                          │   insertedAlerts++  │         │
  │                 │                          │   onConflictDoNothing         │
  │                 │                          │── runConceptionLlmAnalysis ──►│
  │                 │                          │   build context     │         │
  │                 │                          │   try OpenRouter (3 tries)    │
  │                 │                          │   if 402 → Gemini             │
  │                 │                          │◄─ parsed alerts + recos ──────│
  │                 │                          │── upsert rows ─────►│         │
  │                 │                          │── list Vitrina recos          │
  │                 │◄──── 200 JSON ───────────│                     │         │
  │                 │── refresh()              │                     │         │
  │◄── new alerts ──│                          │                     │         │
    </pre>
  </figure>`;
}

function renderTabDiagram() {
  return `
  <figure class="diagram">
    <figcaption>Figure 3 — Tabs as orthogonal lenses over the same DB</figcaption>
    <pre class="ascii">
                ┌──────────── sales_micro_event (pa_*) ────────────┐
                │  productView · addToCart · beginCheckout ·       │
                │  purchase · pointer_click/hover · scroll · etc.  │
                └─────────────────────────────────────────────────┘
                          │            │            │           │
        ┌─────────────────┴─┐  ┌───────┴──────┐  ┌──┴──────┐  ┌─┴────────┐
        │ Overview (24h KPI)│  │ Funnel (7d)  │  │Behavior │  │Security  │
        │ traffic · devices │  │ product→cart │  │heatmaps │  │incidents │
        │ top pages         │  │ →checkout    │  │journeys │  │blocks    │
        └───────────────────┘  └──────────────┘  └─────────┘  └──────────┘
                          │
                ┌─────────┴──────────┐
                │  conception_alert  │ ← rule engine + LLM
                │  conception_recom. │
                └────────────────────┘
                          │
                ┌─────────┴───────────────────────────┐
                │  Vitrina · per-product heuristics   │
                │  + optional LLM merchandising prompt │
                └──────────────────────────────────────┘
    </pre>
  </figure>`;
}

function renderPromptBlock(title, body, language = "Prompt") {
  return `
    <section class="prompt-card">
      <div class="prompt-card__head">
        <span class="prompt-card__lang">${escapeHtml(language)}</span>
        <h4>${escapeHtml(title)}</h4>
      </div>
      <pre class="code">${escapeHtml(body)}</pre>
    </section>`;
}

function renderPolicyList(items) {
  return `
    <div class="policy-grid">
      ${items
        .map(
          (item) => `
        <article class="policy-card">
          <h4>${escapeHtml(item.title)}</h4>
          <p>${escapeHtml(item.body)}</p>
        </article>`
        )
        .join("")}
    </div>`;
}

function renderRuleCards(rules) {
  return `
    <div class="rule-grid">
      ${rules
        .map(
          (rule) => `
        <article class="rule-card rule-card--${escapeHtml(rule.severity)}">
          <div class="rule-card__head">
            <span class="rule-card__code">${escapeHtml(rule.code)}</span>
            <span class="rule-card__severity">${escapeHtml(rule.severity)}</span>
          </div>
          <p class="rule-card__row"><strong>Window:</strong> ${escapeHtml(rule.window)}</p>
          <p class="rule-card__row"><strong>Trigger:</strong> ${escapeHtml(rule.trigger)}</p>
          <p class="rule-card__row"><strong>Fingerprint:</strong> ${escapeHtml(rule.fingerprint)}</p>
          <p class="rule-card__body">${escapeHtml(rule.detail)}</p>
        </article>`
        )
        .join("")}
    </div>`;
}

function buildHtml({ generatedAt, prompts }) {
  const technologiesTable = renderTable(TECH_ROWS);
  const envTable = renderTable(ENV_ROWS);

  const navTableRows = [
    ["Tab", "Label", "Purpose", "Primary source", "Primary signal"],
    ...NAV_ITEMS.map((nav) => [nav.name, nav.label, nav.purpose, nav.primarySource, nav.primarySignal]),
  ];

  const fileTable = renderTable([["File", "Role"], ...FILE_INDEX]);
  const glossaryTable = renderTable([["Term", "Definition"], ...GLOSSARY], { compact: true });
  const funnelRecoTable = renderTable([
    ["Code", "Priority", "Trigger", "Impact label", "Confidence", "Recommendation"],
    ...FUNNEL_RECOS.map((rec) => [
      rec.code,
      rec.priority,
      rec.trigger,
      rec.impact,
      String(rec.confidence),
      rec.recommendation,
    ]),
  ]);
  const vitrinaTipsTable = renderTable([
    ["Tip", "Priority logic", "Trigger", "Action"],
    ...VITRINA_TIPS.map((tip) => [tip.label, tip.priority, tip.trigger, tip.action]),
  ]);
  const vitrinaQuickFixesTable = renderTable([
    ["ID", "Label", "Summary", "Effect on DB"],
    ...QUICK_FIXES_VITRINA.map((fix) => [fix.id, fix.label, fix.summary, fix.effect]),
  ]);
  const securityQuickFixesTable = renderTable([
    ["ID", "Label", "Summary", "Effect on DB"],
    ...QUICK_FIXES_SECURITY.map((fix) => [fix.id, fix.label, fix.summary, fix.effect]),
  ]);
  const securityRulesTable = renderTable([
    ["Pattern", "Trigger", "Score contribution"],
    ...SECURITY_RULES.map((rule) => [rule.code, rule.trigger, rule.score]),
  ]);

  const TOC_TITLES = [
    "Executive summary",
    "Product context and audience",
    "Information architecture",
    "Solution architecture and tech stack",
    "Access control and routing policy",
    "Data foundation: events, alerts, security blocks, applied actions",
    "Dashboard (Overview) tab",
    "Timeline tab",
    "User Behavior tab",
    "Conversion Funnel tab",
    "Vitrina Recommendation tab",
    "AI Recommendations tab",
    "Alerts tab",
    "Security tab",
    "Rule engine — full catalogue",
    "LLM strategy and provider fallback",
    "Prompt library (verbatim)",
    "Vitrina heuristics, scoring and ranking",
    "Quick fixes (Vitrina and Security)",
    "Refresh model and side effects",
    "Privacy, integrity and operational policies",
  ];

  const chapters =
    chapter(
      1,
      "Executive summary",
      `<p class="lead">Seller Helper is the operations console packaged inside Vitrina Store at the route <code>/seller-helper</code>. It gives privileged sellers a single page to read the storefront's pulse — traffic, funnel, behaviour, security — and to act on it with curated, schema-validated AI recommendations and reversible quick fixes.</p>
      <p>The product combines a <strong>deterministic rule engine</strong> (five thresholds expressed directly in SQL/TypeScript) with a <strong>large-language-model pass</strong> (OpenRouter primary, Gemini fallback) that runs against a tight JSON snapshot of the latest signals. Every output is fingerprinted, idempotent, and scoped to fields that can be undone — there is no destructive automation.</p>
      <ul class="tight">
        <li><strong>Surface:</strong> 7 tabs — Overview, Behavior, Funnel, Vitrina, AI Recommendations, Alerts, Security.</li>
        <li><strong>Engine:</strong> rule engine on rolling 15-minute, 2-hour and 7-day windows; LLM analysis with retries and provider fallback.</li>
        <li><strong>Auditability:</strong> alerts/recos carry a stable fingerprint per UTC day or hour; insert-on-conflict-do-nothing keeps re-runs safe.</li>
        <li><strong>Reversibility:</strong> 4 Vitrina quick fixes and 2 security quick fixes — block/unblock + 4 catalogue edits, no event deletion.</li>
        <li><strong>Privacy posture:</strong> session_key only, masked in UI, French-language operator copy on Security.</li>
      </ul>`
    ) +
    chapter(
      2,
      "Product context and audience",
      `<p>Seller Helper targets store owners and operations admins of the Algerian e-commerce front end (Vitrina Store). The audience expects French operational copy on sensitive flows (Security) and DA-denominated prices, while keeping global analytics in English (en-US locale) to align with web analytics conventions.</p>
      <p>Operationally the page has two visible jobs:</p>
      <ol class="tight">
        <li><strong>Diagnose</strong> — surface what is changing in traffic, conversion, behaviour and security right now.</li>
        <li><strong>Act</strong> — apply small, reversible mutations (Vitrina catalogue tweaks, session blocks) without leaving the page.</li>
      </ol>
      <p>The hero contains a live data badge (<em>Live data · auto-refresh</em> when events are flowing) and a sessions-per-15-minute counter. Two CTAs live to the right: <em>Refresh</em> re-reads the precomputed overview; <em>Run analysis</em> triggers the rule engine + LLM pass server-side.</p>`
    ) +
    chapter(
      3,
      "Information architecture",
      `<p>The dashboard exposes a deterministic 7-tab navigation. Tab metadata lives in <code>src/components/SellerHelper/nav.ts</code> — the source of truth for the labels and tooltip descriptions visible under the nav bar.</p>
      ${renderTable(navTableRows)}
      ${renderTabDiagram()}
      <p>Each tab consumes data from the same overview DTO (<code>ConceptionOverviewDto</code>) plus its own slice. There is no tab-to-tab data fetching dependency: switching tabs is instantaneous because all data already lives in the client store after server hydration.</p>`
    ) +
    chapter(
      4,
      "Solution architecture and tech stack",
      `<p>Seller Helper is rendered through Next.js App Router. The page is a server component that authenticates, joins the user role, prefetches all initial data in parallel, and passes it as <code>initialData</code> to a client dashboard.</p>
      ${renderArchitectureDiagram()}
      <h3>Stack at a glance</h3>
      ${technologiesTable}
      <h3>Environment configuration</h3>
      ${envTable}`
    ) +
    chapter(
      5,
      "Access control and routing policy",
      `<p>The route guards itself before rendering a single byte to the client:</p>
      <ol class="tight">
        <li><code>auth.api.getSession()</code> resolves the current Better Auth session. Missing session → redirect to <code>/signin</code>.</li>
        <li>The user's row is loaded from <code>user</code> to read the <code>role</code> column.</li>
        <li>Admin is <code>role === "admin" || isPrivilegedAdminEmail(email)</code>. Non-admins receive a stub page with links back to <code>/my-account</code> and <code>/</code> — <em>no telemetry payload</em> ever reaches their browser.</li>
        <li>Only when admin is true does the page prefetch the overview, alerts, dismissed alerts and Vitrina recommendations in parallel via <code>Promise.all</code>.</li>
      </ol>
      <p>Errors during the prefetch are captured as a string and rendered as a non-blocking banner; the dashboard still hydrates with whatever data was available.</p>`
    ) +
    chapter(
      6,
      "Data foundation: events, alerts, security blocks, applied actions",
      `<p>All Seller Helper computations rely on five tables:</p>
      <ul class="tight">
        <li><strong>sales_micro_event</strong> — the storefront micro-event log (pa_* events). Columns used: <code>session_key</code>, <code>event_name</code>, <code>payload_json</code>, <code>page_path</code>, <code>product_local_id</code>, <code>created_at</code>.</li>
        <li><strong>conception_alert</strong> — persistent alerts emitted by the rule engine and the LLM. Each row has a unique <code>fingerprint</code>, severity, optional metadata JSON and an <code>affected_sessions_estimate</code>.</li>
        <li><strong>conception_recommendation</strong> — long-form recommendations with priority, impactLabel, analysis, recommendation, confidence and an evidenceJson trail.</li>
        <li><strong>conception_security_block</strong> — active session blocklist. The unique key is <code>session_key</code> with a nullable <code>lifted_at</code> field — an open block has <code>lifted_at IS NULL</code>.</li>
        <li><strong>seller_helper_applied_action</strong> — audit log of operator actions taken inside the Seller Helper (Vitrina quick fixes, security blocks, alert resolutions, AI recommendations marked as applied). Indexed on <code>occurred_at</code>, <code>product_local_id</code> and <code>kind</code>. Powers the Timeline checkpoint overlay.</li>
      </ul>
      <p>The canonical event vocabulary lives in <code>src/server/conception/event-contract.ts</code>:</p>
      <pre class="code">${escapeHtml(`export const STORE_EVENT = {
  productView: "pa_product_view",
  addToCart: "pa_add_to_cart",
  beginCheckout: "pa_begin_checkout",
  purchase: "pa_purchase",
  globalContext: "pa_global_context",
  pagePerformance: "pa_performance",
} as const;

export const PA_JS_ERROR = "pa_js_error" as const;`)}</pre>
      <p>Anything outside this whitelist is intentionally invisible to the dashboard.</p>`
    ) +
    chapter(
      7,
      "Dashboard (Overview) tab",
      `<p>The Overview tab is the landing experience. It composes four panels:</p>
      <ul class="tight">
        <li><strong>KPI strip (top, 4 cards)</strong> — labels, values and a delta line marked positive/negative against the previous period. Drives the "is the store healthy?" judgement in under a second.</li>
        <li><strong>Traffic & Sales (24 h)</strong> — a custom SVG <code>TrafficChart</code> driven by normalised hourly counts from <code>trafficHourlyNormalized()</code>. Counts are scaled to the local max so the visual is stable regardless of absolute volume.</li>
        <li><strong>Devices</strong> — distribution slices parsed from the <code>device</code> field embedded in <code>payload_json</code> (mobile / tablet / desktop residual).</li>
        <li><strong>Top performing pages</strong> — top page paths by view count, joined with their add-to-cart events to compute a per-page conversion rate.</li>
      </ul>
      <p>An empty-data fallback (<em>No metrics available yet</em>, <em>No pages with recorded traffic</em>) is rendered whenever the query returns zero rows — the dashboard never breaks on a fresh deployment.</p>`
    ) +
    chapter(
      8,
      "Timeline tab",
      `<p>The Timeline tab plots any combination of metrics over time. The X axis is always time; the Y axis is whatever the operator picks. Two Y axes are used simultaneously so volume (counts) and quality (percentages) can be compared on the same chart. Overlaid on top of the curves are <em>checkpoint markers</em> — small flag-shaped pins that mark the exact time an action was taken in any of the recommendation surfaces.</p>
      <h3>Controls</h3>
      <ul class="tight">
        <li><strong>Range</strong> — 24h (hourly buckets), 7d / 30d / 90d (daily buckets). Buckets are aligned to the current UTC hour or UTC day.</li>
        <li><strong>Scope</strong> — Whole store, or a specific product. Per-product mode uses the same alias resolution as the heatmap (storefront product ID + DB hash aliases).</li>
        <li><strong>Metrics</strong> — multi-select chips. The default set is views, add-to-carts, and purchases. Hovering each chip shows the metric's exact definition.</li>
      </ul>
      <h3>Metrics catalogue</h3>
      ${renderTable([
        ["ID", "Label", "Unit", "Definition"],
        ["views", "Product views", "count", "pa_product_view events per bucket."],
        ["uniqueSessions", "Unique sessions", "count", "Distinct session_key values per bucket."],
        ["addToCarts", "Add to cart", "count", "pa_add_to_cart events per bucket."],
        ["purchases", "Sales", "count", "pa_purchase events per bucket."],
        ["conversionRate", "Conversion rate", "percent", "100 × purchases / views per bucket (0 if views=0)."],
      ])}
      <h3>Checkpoint markers (applied-action overlay)</h3>
      <p>Every time an operator takes an action against a recommendation, a checkpoint is written to <code>seller_helper_applied_action</code> and rendered as a pin at its exact occurrence time on the Timeline chart. Hovering a pin reveals the action kind, exact timestamp and (when applicable) the product. Clicking the pin opens a details modal carrying the full recommendation context that was used at the moment of application.</p>
      ${renderTable([
        ["Kind", "Trigger", "Sourced from", "Scope"],
        ["Vitrina quick fix", "Vitrina quick-fix application from Seller Helper › Vitrina tab", "applyVitrinaQuickFixes()", "Per-product"],
        ["Recommendation applied", "AI recommendation dismissed (marked as applied) on the Alerts/Recommendations panel", "dismissConceptionRecommendationById()", "Store-wide"],
        ["Alert resolved", "Conception alert marked as resolved", "dismissConceptionAlertById() with disposition=resolved", "Store-wide"],
        ["Session blocked", "Security quick-fix block_session", "applySecurityQuickFixes()", "Store-wide"],
        ["Session unblocked", "Security quick-fix unblock_session", "applySecurityQuickFixes()", "Store-wide"],
      ])}
      <h3>Server pipeline</h3>
      <ol class="tight">
        <li><code>bucketsForRange</code> aligns the current time to UTC hour/day and emits N evenly-spaced bucket boundaries.</li>
        <li><code>loadEventCounts</code> runs one GROUP BY query on <code>sales_micro_event</code> with <code>date_trunc</code> and per-event filters (FILTER WHERE) producing one row per bucket and per metric counter.</li>
        <li>For per-product scope, an <code>IN</code> filter on <code>product_local_id</code> uses the alias set returned by <code>getCatalogProductAliasIds()</code>.</li>
        <li>Rate metrics (conversion rate) are computed at the bucket level — and at the window level for the KPI strip (sum of numerator / sum of denominator).</li>
        <li><code>listAppliedActionsInRange</code> reads the <code>seller_helper_applied_action</code> audit table in the same window. Per-product timelines include both product-bound and store-wide checkpoints so operators see all signals competing for attribution.</li>
      </ol>
      <p>Below the chart, a three-card KPI strip surfaces, per active metric, the <em>total</em> (or window rate for percent metrics), the <em>average per bucket</em>, the <em>peak value</em> and the <em>peak bucket label</em>. The chart itself is a custom SVG line chart with hover tooltip and dual Y-axes — count axis on the left, percent axis on the right — so volume and rate metrics can coexist without distorting each other. Checkpoints sit above the curves with a small color-coded legend that summarizes how many of each kind occurred inside the visible window.</p>
      <p>API surface:</p>
      <pre class="code">${escapeHtml(`GET /api/admin/seller-helper/timeline
  ?range=24h|7d|30d|90d
  &scope=store|product
  &productId=<storefront product id>    # required when scope=product
  &metrics=views,addToCarts,purchases   # comma-separated

# Response envelope (subset)
{
  "timeline": {
    "range": "24h",
    "scope": "store",
    "granularity": "hour",
    "buckets": ["2026-05-12T13:00:00.000Z", ...],
    "series": [{ "metric": "views", "values": [...], ... }],
    "appliedActions": [
      {
        "id": "uuid",
        "kind": "vitrina_quick_fix" | "ai_recommendation" | "alert_resolved" | "security_block" | "security_unblock",
        "kindLabel": "Vitrina quick fix",
        "title": "Vitrina quick fix · Product name",
        "summary": "Promote color • Add availability note",
        "occurredAt": "2026-05-12T15:43:00.000Z",
        "productId": 123 | null,
        "productTitle": "Product name" | null,
        "sourceRefId": "<uuid or session key>",
        "details": { ... }
      }
    ]
  }
}

GET /api/admin/seller-helper/timeline/products
  ?windowDays=30                        # ranks products by total views`)}</pre>`
    ) +
    chapter(
      9,
      "User Behavior tab",
      `<p>The Behavior tab renders the qualitative side of telemetry:</p>
      <ul class="tight">
        <li><strong>Heatmap bands</strong> — vertical bands shaded by intensity derived from <code>pa_scroll</code> depth distributions, attached to the most-viewed product page.</li>
        <li><strong>Product page heatmap</strong> — an SVG composite from <code>ProductPageHeatmap.tsx</code> that overlays pointer activity zones on a synthetic product layout.</li>
        <li><strong>Journeys</strong> — most frequent session journeys reconstructed from the funnel events.</li>
        <li><strong>Scroll depth metrics</strong> — the proportion of sessions reaching 75% scroll.</li>
        <li><strong>Session replays</strong> — non-video summaries: duration, device, status — opening the admin analytics for full event-by-event detail.</li>
      </ul>
      <p>Cross-navigation is wired through <code>onNavigateSection</code> — clicking <em>View funnel</em> on a behaviour insight jumps to the Conversion Funnel tab without re-fetching.</p>`
    ) +
    chapter(
      10,
      "Conversion Funnel tab",
      `<p>The funnel computes nested-subset counts over the last 7 days. The CTE is intentionally written so that each level is the intersection with the previous one — i.e. <code>n_cart</code> only counts sessions that <em>also</em> had a <code>pa_product_view</code>.</p>
      <pre class="code">${escapeHtml(`WITH pe   AS (SELECT DISTINCT session_key FROM sales_micro_event WHERE event_name = 'pa_product_view'   AND created_at >= since),
     cart AS (SELECT DISTINCT session_key FROM sales_micro_event WHERE event_name = 'pa_add_to_cart'    AND created_at >= since),
     chk  AS (SELECT DISTINCT session_key FROM sales_micro_event WHERE (event_name = 'pa_begin_checkout' OR page_path LIKE '%checkout%') AND created_at >= since),
     fin  AS (SELECT DISTINCT session_key FROM sales_micro_event WHERE event_name = 'pa_purchase'       AND created_at >= since)
SELECT
  (SELECT COUNT(*) FROM pe)                                                                                        AS n_product,
  (SELECT COUNT(*) FROM pe JOIN cart USING (session_key))                                                          AS n_cart,
  (SELECT COUNT(*) FROM pe JOIN cart USING (session_key) JOIN chk USING (session_key))                             AS n_checkout_path,
  (SELECT COUNT(*) FROM pe JOIN cart USING (session_key) JOIN fin USING (session_key))                             AS n_final;`)}</pre>
      <p>Friction items are then computed from the deltas between adjacent steps. The same numbers drive the recommendation engine — see the next chapter on the rule engine for the exact thresholds.</p>
      ${renderTable([
        ["Step", "Source event(s)", "Position in funnel"],
        ["Product view", "pa_product_view", "Entry"],
        ["Add to cart", "pa_add_to_cart", "Intent"],
        ["Begin checkout", "pa_begin_checkout OR page_path LIKE '%checkout%'", "Commit"],
        ["Purchase", "pa_purchase", "Conversion"],
      ])}`
    ) +
    chapter(
      11,
      "Vitrina Recommendation tab",
      `<p>Vitrina is the merchandising lens. It enumerates the catalogue, builds a per-product interaction snapshot over the last 7 days, computes deterministic tips, ranks the products, and renders them in two views: a featured Swiper carousel and a filtered grid with search / category / sort controls.</p>
      <h3>Pipeline</h3>
      <ol class="tight">
        <li><strong>Load catalogue rows</strong> from <code>productsTable</code> joined with <code>categoryTable</code>; cross-reference with the storefront product IDs from the catalogue helper.</li>
        <li><strong>Aggregate signals</strong> per storefront product over 7 days using a single GROUP BY query (views, hovers, clicks, add-to-carts, option selects, image views, specs interactions) plus a detail pass for view dwell time, scroll depth, click Y%, hover Y%, selected colours and review interactions.</li>
        <li><strong>Build display snapshot</strong> — title hints (colour, price, brand), descriptionLength, rating, stock.</li>
        <li><strong>Build interaction snapshot</strong> — window-normalised metrics, avg click Y%, avg hover Y%, top selected colours, viewToCartRate, clickToCartRate.</li>
        <li><strong>Build tips</strong> — see the heuristics table below.</li>
        <li><strong>Build quick fixes</strong> — at most four whitelisted IDs.</li>
        <li><strong>Score and rank</strong> by opportunity score (priority + traffic weight + friction weight).</li>
      </ol>
      <h3>Heuristic tip catalogue</h3>
      ${vitrinaTipsTable}
      <h3>Quick fixes catalogue</h3>
      ${vitrinaQuickFixesTable}
      <p>The LLM pass for Vitrina is optional — its prompts are reproduced in the Prompt Library chapter — and it consumes the top three opportunity-ranked products only, to keep the JSON payload small and the response deterministic.</p>`
    ) +
    chapter(
      12,
      "AI Recommendations tab",
      `<p>This tab is the human-readable surface of the LLM analysis. Each card is a <code>conception_recommendation</code> row with: priority, impact label, title, analysis, recommendation, confidence (0–100), and optional revenueHint / implementationHint / roiHint.</p>
      <p>Operators can mark a recommendation as <em>Dismissed</em>; the UI sorts cards by importance and supports jumping to the section that would implement the change (Vitrina, Funnel, Behavior, Alerts) via <code>resolveImplementationSection()</code> — a keyword router that reads the title and recommendation text in both English and French.</p>
      <p>The deterministic funnel-based recommendations always appear too. They are reproduced below for transparency:</p>
      ${funnelRecoTable}`
    ) +
    chapter(
      13,
      "Alerts tab",
      `<p>The Alerts tab consolidates active and dismissed incidents. Each row in <code>conception_alert</code> renders as a card carrying severity (critical / high / medium / low), title, description, optional detail, and an "Analyze in detail" action that calls <code>/api/admin/conception/alerts/detail</code>.</p>
      <p>The detail endpoint runs <code>analyzeConceptionAlertById()</code> — a deterministic, per-type deep-dive function that produces:</p>
      <ul class="tight">
        <li><strong>Key indicators</strong> — current vs reference values for the rate / volume / error count.</li>
        <li><strong>Deviations</strong> — observed value vs baseline with a tone (critical/high/medium/low) computed from the delta.</li>
        <li><strong>Clues</strong> — qualitative pointers (e.g. "Loss often concentrates between cart and checkout initiation").</li>
        <li><strong>Fix steps</strong> — actionable checklist tailored to the alert family.</li>
      </ul>
      <p>The dismissal flow accepts a disposition of <code>"resolved"</code> or <code>"ignored"</code>, persisted on the alert row; the right column lists the most recent 12 dismissed alerts so operators can compare incident lifetimes.</p>`
    ) +
    chapter(
      14,
      "Security tab",
      `<p>The Security tab is built from a dedicated brief computed by <code>buildConceptionSecurityBrief()</code>:</p>
      <ul class="tight">
        <li><strong>4 KPI cards</strong> — Bots détectés, Sessions bloquées, Tentatives de fraude, Score de sécurité.</li>
        <li><strong>Score formula card</strong> — the formula is shown verbatim to operators (see below).</li>
        <li><strong>Threat activity (24 h)</strong> — hourly series of events emitted by risky sessions; rendered through <code>ThreatActivityChart</code>.</li>
        <li><strong>Threat types (7 d)</strong> — distribution of Bot scraping / Click fraud / Fausses commandes / Erreurs JS.</li>
        <li><strong>Active incidents</strong> — top 8 risky sessions, masked identity, time-ago in French.</li>
        <li><strong>Blocked sessions table</strong> — currently active blocks with reason and time-since-block.</li>
        <li><strong>Engine notes</strong> — French-language narrative footnotes, always including the privacy reminder.</li>
      </ul>
      <p>The visible score formula:</p>
      <pre class="code">${escapeHtml(
        "Score = 100 − min(30, bots/sessions×35) − min(18, blocages/sessions×20) − min(24, fraudes×4) − min(16, pic horaire/80×16), borné entre 0 et 100."
      )}</pre>
      <h3>Per-session risk patterns</h3>
      ${securityRulesTable}
      <h3>Security quick fixes</h3>
      ${securityQuickFixesTable}
      <p>Both quick fixes are confirmed in a modal before being committed. Blocks are upserted (so re-blocking a previously lifted session reactivates the row); unblocks only update rows that are currently open.</p>`
    ) +
    chapter(
      15,
      "Rule engine — full catalogue",
      `<p>The deterministic rule engine lives in <code>src/server/conception/analyze.ts</code> and runs on every <em>Run analysis</em> click. Each rule emits an alert with a unique fingerprint so re-runs don't duplicate.</p>
      ${renderRuleCards(RULE_ENGINE)}
      <h3>Deterministic funnel recommendations</h3>
      <p>The same analysis run also writes three deterministic recommendations when the funnel ratios fall under thresholds:</p>
      ${funnelRecoTable}`
    ) +
    chapter(
      16,
      "LLM strategy and provider fallback",
      `<p>The LLM pass is orchestrated by <code>runConceptionLlmAnalysis()</code>. Its goal is to produce a French operator summary plus structured alerts and recommendations grounded in the current telemetry snapshot, never inventing metrics that aren't in the payload.</p>
      <h3>Provider chain</h3>
      <ol class="tight">
        <li><strong>OpenRouter</strong> (primary) — model picked from <code>CONCEPTION_OPENROUTER_MODEL</code> → <code>ASSISTANT_FREEFLOW_MODEL</code> → <code>google/gemini-2.0-flash-001</code>. JSON mode is enforced via <code>response_format: { type: "json_object" }</code>. Up to 3 attempts with 1.2 s × attempt back-off on 429/5xx.</li>
        <li><strong>Gemini 2.0 Flash</strong> (fallback) — used when OpenRouter fails with a 402 (insufficient credits) or when <code>CONCEPTION_LLM_GEMINI_FALLBACK=true</code>. Calls <code>generativelanguage.googleapis.com</code> with <code>responseMimeType: "application/json"</code>.</li>
      </ol>
      <h3>Validation pipeline</h3>
      <ol class="tight">
        <li><code>extractJsonObject()</code> tolerates wrapping prose / markdown fences.</li>
        <li><code>normalizeAnalysisPayload()</code> accepts both English and French keys (<code>alerts</code>/<code>alertes</code>, <code>recommendations</code>/<code>recommandations</code>, <code>analysis</code>/<code>analyse</code>) and coerces severity / priority through fuzzy matching (<code>crit</code>, <code>haute</code>, <code>moy</code>).</li>
        <li><code>llmAnalysisSchema</code> (Zod) enforces <code>severity ∈ {critical, high, medium, low}</code>, <code>confidence ∈ [0, 100]</code>, max array sizes (6 alerts, 8 recommendations), and bounded string lengths.</li>
        <li><code>mapLlmOutput()</code> appends day-fingerprints (<code>LLM-ALERT-…-2026-05-12</code>) and serialises <code>metadata_json</code>/<code>evidence_json</code> for traceability.</li>
      </ol>
      <h3>Determinism levers</h3>
      <ul class="tight">
        <li>Temperature is fixed at <code>0.2</code>.</li>
        <li><code>max_tokens</code> is capped at 2 200 for OpenRouter.</li>
        <li>The LLM only ever sees: latest overview, top 6 KPIs, funnel + summary + friction items, top 6 pages, devices, security brief and the analyze signals.</li>
      </ul>`
    ) +
    chapter(
      17,
      "Prompt library (verbatim)",
      `<p>This chapter quotes the prompts from source so reviewers can audit the exact instructions sent to the model. The strings are read from the repository at build time.</p>
      ${renderPromptBlock(
        "Conception analysis — system prompt",
        prompts.conceptionSystem,
        "src/server/conception/llm-analysis.ts"
      )}
      ${renderPromptBlock(
        "Conception analysis — user prompt template",
        prompts.conceptionUser,
        "src/server/conception/llm-analysis.ts"
      )}
      ${renderPromptBlock(
        "Vitrina merchandising — system prompt",
        prompts.vitrinaSystem,
        "src/server/seller-helper/vitrina-recommendation-prompt.ts"
      )}
      ${renderPromptBlock(
        "Vitrina merchandising — user prompt template",
        prompts.vitrinaUser,
        "src/server/seller-helper/vitrina-recommendation-prompt.ts"
      )}
      <p class="muted">Both prompts insist on French operator copy, JSON-only output, and grounding in the supplied payload. Combined with the Zod schema, this gives the dashboard predictable, audit-ready recommendations.</p>`
    ) +
    chapter(
      18,
      "Vitrina heuristics, scoring and ranking",
      `<p>Vitrina ranking is a three-component score in <code>opportunityScore()</code>:</p>
      <pre class="code">${escapeHtml(`opportunityScore = priorityWeight + trafficWeight + frictionWeight

priorityWeight  = Σ (4 - IMPORTANCE_RANKS[tip.priority])     // high=3, medium=2, low=1
trafficWeight   = min(12, log2(views + 2) × 2)
frictionWeight  = (viewToCartRate != null && viewToCartRate < 0.1)
                  ? (0.1 - viewToCartRate) × 40
                  : 0`)}</pre>
      <p>Ties are broken by the strongest tip priority (lowest IMPORTANCE_RANK). The list is then filtered:</p>
      <ul class="tight">
        <li>Default view — any product with at least one tip.</li>
        <li><code>actionableOnly</code> — products with at least one high or medium tip.</li>
      </ul>
      <p>The featured Swiper at the top of the tab shows the top three opportunity-ranked products; the grid below allows search by title/category/brand/slug, a category filter, and six sort modes (opportunity / interaction / merchandising priority — high or low).</p>
      <h3>Per-product interaction signals</h3>
      ${renderTable([
        ["Signal", "Source event", "Used in"],
        ["views", "pa_product_view", "opportunity score, price tip, quality tip"],
        ["hovers", "pa_pointer_hover (≠ heatmap_embed)", "demand classification"],
        ["clicks", "pa_pointer_click (≠ heatmap_embed)", "demand + click Y% zones"],
        ["addToCarts", "pa_add_to_cart", "viewToCartRate, clickToCartRate"],
        ["optionSelects", "pa_select_option", "default_color quick fix candidate"],
        ["imageViews", "pa_image_view_time", "interaction score"],
        ["specsInteractions", "pa_specs_interaction", "interaction score"],
        ["specsDwellMs", "pa_specs_view_time (visible_ms)", "engagement signal"],
        ["scrollDepth75Plus", "pa_scroll (depth_pct ≥ 75)", "engagement signal"],
        ["clickYTotal / clickYCount", "pa_pointer_click (y_pct)", "avg click Y, priceZoneClicks"],
        ["hoverYTotal / hoverYCount", "pa_pointer_hover (y_pct)", "avg hover Y"],
        ["reviewInteractions", "pa_review*", "quality concern tip"],
        ["priceZoneClicks", "pa_pointer_click with y_pct ≤ 35", "price tip (price-sensitive case)"],
      ])}`
    ) +
    chapter(
      19,
      "Quick fixes (Vitrina and Security)",
      `<p>Quick fixes are the only mutations the dashboard can apply. They share a strict contract:</p>
      <ol class="tight">
        <li>The client sends a structured payload (a list of <code>{ id, label, summary, context }</code>).</li>
        <li>The server validates each <code>id</code> against a whitelist of <code>VitrinaQuickFixId</code> or <code>ConceptionSecurityQuickFixId</code>.</li>
        <li>For Vitrina, the server re-reads the recommendation, so the actual fixes applied must match what was offered — no smuggling of new fix IDs.</li>
        <li>Mutations are scoped to a tiny set of columns; nothing is destructive.</li>
      </ol>
      <h3>Vitrina catalogue mutations</h3>
      ${vitrinaQuickFixesTable}
      <p>Internal constants:</p>
      <ul class="tight">
        <li><code>VITRINA_STANDARD_MARKUP = 0.20</code> — used by the <em>promo_price</em> fix: <code>jomlaPrice = round(price / 1.20)</code> with a minimum of 1.</li>
        <li><code>AVAILABILITY_KEY = "Availability"</code>, <code>QUALITY_KEY = "Quality"</code> — keys upserted in the product description's additional-info block.</li>
        <li>Maximum 4 quick fixes per request.</li>
      </ul>
      <h3>Security mutations</h3>
      ${securityQuickFixesTable}
      <p>Security mutations also surface a confirmation modal and persist the reason in <code>conception_security_block.reason</code> (default fallback: <em>"Blocage manuel"</em>).</p>`
    ) +
    chapter(
      20,
      "Refresh model and side effects",
      `<p>The dashboard maintains three explicit state-flow primitives in <code>useConceptionAdminData</code>:</p>
      <ul class="tight">
        <li><strong>refresh()</strong> — re-fetches the overview + alert lists + Vitrina list without touching the LLM. Cheap and idempotent.</li>
        <li><strong>runAnalyze()</strong> — calls the analyze endpoint, which runs the rule engine, the LLM analysis (with provider fallback), and re-lists Vitrina. The hero button shows <em>Analyzing…</em> while busy. Returns the count of inserted alerts/recommendations and the LLM summary (if any).</li>
        <li><strong>dismissAlert / dismissRecommendation</strong> — optimistic UI dismissal with a server confirmation.</li>
      </ul>
      <p>The hero status badge switches between <em>Live data · auto-refresh</em> (when <code>overview.hasEventData</code> is true) and <em>Waiting for data · auto-refresh</em>. The page is marked <code>export const dynamic = "force-dynamic"</code> so it never serves stale SSR cache.</p>`
    ) +
    chapter(
      21,
      "Privacy, integrity and operational policies",
      `<p>The following policies are enforced in code, not just in documentation. Each is observable in the source files listed below.</p>
      ${renderPolicyList(POLICIES)}
      <p>Operationally, the recommended runbook is:</p>
      <ol class="tight">
        <li>Run a daily <em>Run analysis</em> per store, or trigger it from a scheduled job hitting the same endpoint.</li>
        <li>Treat fingerprints as authoritative deduplication keys; never alter them in migrations.</li>
        <li>If OpenRouter credit is depleted, the dashboard remains functional through Gemini fallback — monitor the <code>llmModel</code> field returned from analyze to know which provider answered.</li>
        <li>When extending the prompts, update the Zod schema and the normaliser at the same time; both must accept the new shape.</li>
      </ol>`
    );

  const appendices = `
    <section class="appendix-block">
      <h3>Appendix A — Source file index</h3>
      ${fileTable}
    </section>
    <section class="appendix-block">
      <h3>Appendix B — Environment variables</h3>
      ${envTable}
    </section>
    <section class="appendix-block">
      <h3>Appendix C — Glossary</h3>
      ${glossaryTable}
    </section>`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Seller Helper — Feature, Technology, Prompt, Strategy & Policy Report</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link
    rel="stylesheet"
    href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Source+Serif+4:opsz,wght@8..60,400;8..60,500;8..60,700&display=swap"
  />
  <style>
    :root {
      --accent: #ea580c;
      --accent-dark: #b34306;
      --ink: #0f172a;
      --muted: #475569;
      --line: #e2e8f0;
      --soft: #f8fafc;
      --radius: 14px;
    }
    * { box-sizing: border-box; }
    html, body { padding: 0; margin: 0; background: #f5f7fb; color: var(--ink); }
    body {
      font-family: "Source Serif 4", "Georgia", serif;
      font-size: 11pt;
      line-height: 1.55;
    }
    h1, h2, h3, h4, .ui {
      font-family: "DM Sans", system-ui, -apple-system, "Segoe UI", sans-serif;
      color: var(--ink);
    }
    a { color: var(--accent-dark); }
    code {
      background: #f1f5f9;
      border: 1px solid var(--line);
      padding: 1px 5px;
      border-radius: 6px;
      font-size: .95em;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    }
    pre.code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 9pt;
      line-height: 1.5;
      padding: 1rem 1.1rem;
      background: #0b1220;
      color: #e2e8f0;
      border-radius: 12px;
      overflow: auto;
      white-space: pre-wrap;
      word-break: break-word;
    }
    pre.ascii {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 8.4pt;
      line-height: 1.35;
      margin: 0;
      white-space: pre;
      overflow: auto;
    }
    .cover {
      min-height: 96vh;
      padding: 4rem 8% 3rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background:
        radial-gradient(circle at 15% 20%, rgba(234,88,12,.20), transparent 55%),
        radial-gradient(circle at 85% 80%, rgba(15,23,42,.12), transparent 60%),
        linear-gradient(180deg, #ffffff, #f1f5f9);
      page-break-after: always;
    }
    .cover-brand {
      letter-spacing: .25em;
      text-transform: uppercase;
      font-weight: 700;
      color: var(--accent);
      font-family: "DM Sans", sans-serif;
      font-size: .95rem;
    }
    .cover h1 {
      font-size: 3rem;
      line-height: 1.05;
      margin: .75rem 0 1rem;
      max-width: 22ch;
    }
    .cover .subtitle {
      font-size: 1.1rem;
      max-width: 60ch;
      color: var(--muted);
    }
    .cover-badge {
      display: inline-flex;
      align-items: center;
      gap: .75rem;
      padding: .5rem .85rem;
      border-radius: 999px;
      background: rgba(15,23,42,.06);
      color: var(--ink);
      font-family: "DM Sans", sans-serif;
      font-size: .85rem;
      margin-top: 1.5rem;
    }
    .cover-meta {
      display: grid;
      grid-template-columns: repeat(2, minmax(0,1fr));
      gap: .35rem 2rem;
      font-family: "DM Sans", sans-serif;
      font-size: .85rem;
      color: var(--muted);
      max-width: 720px;
    }
    .document {
      max-width: 880px;
      margin: 0 auto;
      padding: 2.5rem 4% 4rem;
      background: #ffffff;
    }
    .abstract {
      background: #fff7ed;
      border: 1px solid rgba(234,88,12,.25);
      border-radius: var(--radius);
      padding: 1.25rem 1.5rem;
      margin-bottom: 2rem;
    }
    .toc {
      page-break-after: always;
      margin: 2rem 0 3rem;
    }
    .toc-title {
      font-size: 1.6rem;
      margin-bottom: 1rem;
    }
    .toc ol { columns: 2; gap: 2.5rem; padding-left: 1.1rem; }
    .toc li { margin: .35rem 0; }
    .toc a { color: var(--accent); text-decoration: none; }
    .toc a:hover { text-decoration: underline; }
    .chapter { margin: 2.25rem 0 2.75rem; }
    .chapter-kicker {
      color: var(--accent);
      font-weight: 700;
      letter-spacing: .12em;
      text-transform: uppercase;
      font-size: .72rem;
      margin-bottom: .35rem;
    }
    h2 {
      font-size: 1.55rem;
      margin: 0 0 1rem;
      padding-bottom: .5rem;
      border-bottom: 3px solid rgba(234,88,12,.35);
    }
    h3 { font-size: 1.15rem; margin-top: 1.5rem; }
    h4 { font-size: 1rem; margin: 1.25rem 0 .5rem; }
    .lead { font-size: 1.05rem; }
    ul.tight, ol.tight { margin: .75rem 0; padding-left: 1.2rem; }
    ul.tight li, ol.tight li { margin: .35rem 0; }
    .diagram {
      margin: 1.25rem 0;
      padding: 1rem 1rem 1.1rem;
      border-radius: var(--radius);
      border: 1px solid var(--line);
      background: linear-gradient(180deg, #ffffff, #f8fafc);
    }
    .diagram figcaption {
      font-family: "DM Sans", sans-serif;
      font-weight: 600;
      font-size: .9rem;
      margin-bottom: .75rem;
    }
    table.data {
      width: 100%;
      border-collapse: collapse;
      font-size: 9.6pt;
      margin: .75rem 0 1.25rem;
    }
    table.data th, table.data td {
      border: 1px solid var(--line);
      padding: .45rem .5rem;
      vertical-align: top;
    }
    table.data thead th {
      background: #0f172a;
      color: #f8fafc;
      font-family: "DM Sans", sans-serif;
      font-weight: 600;
      text-align: left;
    }
    table.data tbody tr:nth-child(even) { background: #f8fafc; }
    table.data--compact { font-size: 8.4pt; }
    table.data--compact th, table.data--compact td { padding: .28rem .35rem; }
    .muted { color: var(--muted); font-weight: 400; }
    .appendix-block { margin: 2rem 0; page-break-inside: avoid; }
    .prompt-card {
      margin: 1.5rem 0;
      border-radius: 14px;
      border: 1px solid var(--line);
      overflow: hidden;
      background: #0b1220;
      color: #f8fafc;
    }
    .prompt-card__head {
      display: flex;
      align-items: baseline;
      gap: .85rem;
      padding: .65rem 1rem;
      background: linear-gradient(90deg, rgba(234,88,12,.95), rgba(234,88,12,.65));
    }
    .prompt-card__head h4 { color: #fff; margin: 0; font-size: .95rem; }
    .prompt-card__lang {
      text-transform: uppercase;
      letter-spacing: .12em;
      font-size: .68rem;
      font-family: "DM Sans", sans-serif;
      font-weight: 700;
      color: rgba(255,255,255,.85);
    }
    .prompt-card pre.code {
      margin: 0;
      border-radius: 0;
      background: #0b1220;
    }
    .policy-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0,1fr));
      gap: .85rem;
      margin: 1rem 0 1.25rem;
    }
    .policy-card {
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: .9rem 1rem;
      background: #fff;
      box-shadow: 0 1px 0 rgba(15,23,42,.04);
    }
    .policy-card h4 {
      margin: 0 0 .35rem;
      font-size: .96rem;
      color: var(--accent-dark);
    }
    .policy-card p { margin: 0; font-size: .92rem; color: var(--ink); }
    .rule-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0,1fr));
      gap: .85rem;
      margin: 1rem 0 1.5rem;
    }
    .rule-card {
      border: 1px solid var(--line);
      border-left-width: 5px;
      border-radius: 12px;
      padding: .9rem 1rem;
      background: #fff;
    }
    .rule-card--critical { border-left-color: #dc2626; }
    .rule-card--high { border-left-color: #ea580c; }
    .rule-card--medium { border-left-color: #d97706; }
    .rule-card--low { border-left-color: #64748b; }
    .rule-card__head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: .75rem;
      margin-bottom: .35rem;
    }
    .rule-card__code {
      font-family: "DM Sans", sans-serif;
      font-weight: 700;
      font-size: .85rem;
      color: var(--ink);
    }
    .rule-card__severity {
      font-family: "DM Sans", sans-serif;
      font-size: .68rem;
      text-transform: uppercase;
      letter-spacing: .15em;
      color: var(--muted);
    }
    .rule-card__row {
      margin: .25rem 0;
      font-size: .88rem;
      color: var(--ink);
    }
    .rule-card__body {
      margin: .5rem 0 0;
      font-size: .88rem;
      color: var(--muted);
    }
    .colophon {
      font-size: .85rem;
      color: var(--muted);
      margin-top: 3rem;
      page-break-before: always;
    }
    @media print {
      @page { size: A4; margin: 16mm 14mm 18mm 14mm; }
      body { font-size: 10.4pt; background: #ffffff; }
      .cover { min-height: auto; padding: 3rem 8%; }
      .document { padding: 1rem 0 2rem; }
      a[href^="http"]::after { content: ""; }
      .chapter { page-break-before: always; }
      .chapter:first-of-type { page-break-before: auto; }
      .policy-grid, .rule-grid { grid-template-columns: 1fr 1fr; }
      pre.code { white-space: pre-wrap; }
    }
  </style>
</head>
<body>
  <header class="cover">
    <div>
      <div class="cover-brand">Vitrina · Seller Helper</div>
      <h1>Feature, Technology, Prompt &amp; Policy Report</h1>
      <p class="subtitle">A complete, audit-ready walkthrough of the Seller Helper console — its seven tabs, the rule engine and LLM strategy behind it, the verbatim prompts, the quick-fix catalogue, and the policies enforced in code.</p>
      <div class="cover-badge">Generated <span>${escapeHtml(generatedAt)}</span> · Confidential draft</div>
    </div>
    <div class="cover-meta">
      <div>Module path: <strong>/seller-helper</strong></div>
      <div>Engine path: <strong>src/server/conception/*</strong></div>
      <div>Heuristic path: <strong>src/server/seller-helper/*</strong></div>
      <div>UI path: <strong>src/components/SellerHelper/*</strong></div>
    </div>
  </header>

  <main class="document">
    <section class="abstract">
      <h2 style="border:none;padding:0;margin:0 0 .5rem;">Abstract</h2>
      <p>This report documents the Seller Helper console exactly as it ships in the repository: the data foundation (pa_* micro-events), the seven dashboard tabs, the deterministic rule engine and its thresholds, the LLM strategy with provider fallback, the verbatim prompts, the per-product Vitrina heuristics and scoring formulas, the quick-fix catalogue, and the privacy and operational policies enforced by the code.</p>
    </section>

    <nav class="toc">
      <div class="toc-title">Table of contents</div>
      <ol>
        ${TOC_TITLES.map((title, index) => {
          const num = index + 1;
          return `<li><a href="#ch-${num}">${num}. ${escapeHtml(title)}</a></li>`;
        }).join("")}
        <li><a href="#appendices">Appendices (source index, env, glossary)</a></li>
      </ol>
    </nav>

    ${chapters}

    <section id="appendices">
      <h2>Appendices</h2>
      <p class="muted">Reference tables to keep this document auditable against the repository.</p>
      ${appendices}
    </section>

    <section class="colophon">
      <p><strong>Colophon.</strong> Typography pairs DM Sans (headings, UI) with Source Serif 4 (body). Diagrams use plain figures for portable PDF rendering. Prompts are read from <code>src/server/conception/llm-analysis.ts</code> and <code>src/server/seller-helper/vitrina-recommendation-prompt.ts</code> at build time. To regenerate: <code>node scripts/build-seller-helper-report.mjs</code>, then <code>node scripts/build-seller-helper-report.mjs --pdf</code> with Playwright installed.</p>
    </section>
  </main>
</body>
</html>`;
}

/* -------------------------------------------------------------------------- */
/* PDF rendering                                                               */
/* -------------------------------------------------------------------------- */

async function tryPdf() {
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    console.warn("Playwright is not installed. Run: npm i -D playwright && npx playwright install chromium");
    return false;
  }
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(pathToFileURL(OUT_HTML).href, { waitUntil: "load" });
  await page.pdf({
    path: OUT_PDF,
    format: "A4",
    printBackground: true,
    margin: { top: "12mm", right: "12mm", bottom: "14mm", left: "12mm" },
  });
  await browser.close();
  console.log("PDF written:", OUT_PDF);
  return true;
}

/* -------------------------------------------------------------------------- */
/* Entry                                                                       */
/* -------------------------------------------------------------------------- */

function main() {
  fs.mkdirSync(path.dirname(OUT_HTML), { recursive: true });
  const prompts = extractPrompts();
  const generatedAt = new Date().toISOString().slice(0, 19) + "Z";
  const html = buildHtml({ generatedAt, prompts });
  fs.writeFileSync(OUT_HTML, html, "utf8");
  console.log("HTML written:", OUT_HTML);
}

main();

if (process.argv.includes("--pdf")) {
  tryPdf().then((ok) => {
    if (!ok) process.exitCode = 1;
  });
}
