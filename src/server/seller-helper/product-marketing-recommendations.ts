import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import categoryData from "@/components/Home/Categories/categoryData";
import shopData from "@/components/Shop/shopData";
import { compareImportanceTiers, IMPORTANCE_RANKS } from "@/lib/importance-ranking";
import { parseProductContent } from "@/lib/product-content";
import { resolveStorefrontProductId } from "@/server/data-access/product-catalog";
import { db } from "@/server/db";
import { categoryTable, productsTable, salesMicroEventTable } from "@/server/db/schema";
import {
  buildVitrinaRecommendationPromptPayload,
  type VitrinaDisplaySnapshot,
  type VitrinaInteractionSnapshot,
  type VitrinaRecommendationPromptPayload,
  type VitrinaRecommendationPromptProduct,
} from "@/server/seller-helper/vitrina-recommendation-prompt";
import type { Product } from "@/types/product";
import type {
  VitrinaProductMarketingRecommendation,
  VitrinaProductMarketingTip,
  VitrinaQuickFixId,
  VitrinaQuickFixOption,
} from "@/types/vitrina-product-recommendations";

/** `products.id` is UUID; bundled storefront / Vitrina fallback uses numeric string ids (e.g. `"6"`). */
const POSTGRES_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isPostgresUuid(value: string) {
  return POSTGRES_UUID_RE.test(value.trim());
}

const COLOR_WORDS = [
  "noir",
  "black",
  "blanc",
  "white",
  "rouge",
  "red",
  "bleu",
  "blue",
  "vert",
  "green",
  "gris",
  "gray",
  "grey",
  "beige",
  "rose",
  "pink",
  "jaune",
  "yellow",
  "orange",
  "marron",
  "brown",
];

const PRICE_IN_TITLE = /(\d[\d\s.,]*\s*(da|dzd|dinar|€|\$))|(\b(prix|promo|solde)\b)/i;
const DEFAULT_VITRINA_CATALOG_LIMIT = 500;
const PROMPT_TOP_RECOMMENDATIONS = 3;
const MAX_QUICK_FIXES = 4;
const SIGNAL_WINDOW_DAYS = 7;
const MS_DAY = 86_400_000;

/**
 * Vitrina “Price” tip thresholds (rolling `SIGNAL_WINDOW_DAYS` window).
 * Calibrated for typical catalogue behaviour: many stores see ~1–6% view→add-to-cart;
 * we require enough traffic before calling friction, and we separate “promo works”
 * from “list price only / weak promo”.
 */
const PRICE_MIN_VIEWS = 28;
const PRICE_MIN_VIEWS_STRONG_READ = 48;

/** Below this view→add-to-cart %, treat as likely price/offer friction. */
const VIEW_TO_CART_PCT_FRICTION = 3.25;
/** With jomla on, at or above this % the promo is doing meaningful work. */
const VIEW_TO_CART_PCT_HEALTHY_WITH_PROMO = 5.25;
/** Strong conversion — reinforce visible promo value. */
const VIEW_TO_CART_PCT_STRONG = 9.0;

/** Price-area curiosity vs views (lower third of card / price band). */
const PRICE_ZONE_CLICKS_MIN = 6;
const PRICE_ZONE_CLICKS_PER_VIEW = 0.14;

const PRICE_CLICKS_MIN = 7;
const CLICK_TO_CART_STICKY_MAX = 0.18;

/** List→promo discount %: below this, nudge “sharpen the offer”; above solid, focus on visibility. */
const PROMO_DISCOUNT_PCT_WEAK = 6.5;
const PROMO_DISCOUNT_PCT_SOLID = 14;

type ProductRow = {
  id: string;
  slug: string;
  title: string;
  mainimage: string;
  price: number;
  jomlaPrice: number | null;
  rating: number;
  description: string;
  manufacturer: string;
  instock: number;
  categoryName: string;
  storefrontProductId: number;
};

type SignalAggregate = {
  views: number;
  viewDwellMs: number;
  hovers: number;
  clicks: number;
  addToCarts: number;
  optionSelects: number;
  imageViews: number;
  specsInteractions: number;
  specsDwellMs: number;
  scrollDepth75Plus: number;
  clickYTotal: number;
  clickYCount: number;
  hoverYTotal: number;
  hoverYCount: number;
  colorCounts: Map<string, number>;
  reviewInteractions: number;
  priceZoneClicks: number;
};

function includesColorHint(title: string) {
  const normalized = title.toLowerCase();
  return COLOR_WORDS.some((word) => normalized.includes(word));
}

function includesPriceHint(title: string) {
  return PRICE_IN_TITLE.test(title);
}

function parsePayload(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as unknown;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

function readNumber(payload: Record<string, unknown> | null, key: string) {
  const value = payload?.[key];
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function readString(payload: Record<string, unknown> | null, key: string) {
  const value = payload?.[key];
  return typeof value === "string" ? value.trim() : "";
}

function isHeatmapPreviewPointerEvent(payload: Record<string, unknown> | null) {
  if (!payload) return false;
  return payload.heatmap_embed === true || payload.heatmap_embed === "true";
}

function createEmptySignalAggregate(): SignalAggregate {
  return {
    views: 0,
    viewDwellMs: 0,
    hovers: 0,
    clicks: 0,
    addToCarts: 0,
    optionSelects: 0,
    imageViews: 0,
    specsInteractions: 0,
    specsDwellMs: 0,
    scrollDepth75Plus: 0,
    clickYTotal: 0,
    clickYCount: 0,
    hoverYTotal: 0,
    hoverYCount: 0,
    colorCounts: new Map(),
    reviewInteractions: 0,
    priceZoneClicks: 0,
  };
}

function topColors(colorCounts: Map<string, number>, limit = 2) {
  return Array.from(colorCounts.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit)
    .map(([color]) => color);
}

function isColorAlreadyDefault(product: ProductRow, colorName: string) {
  const colors = parseProductContent(product.description).colors;
  if (colors.length === 0) return false;
  return colors[0].name.trim().toLowerCase() === colorName.trim().toLowerCase();
}

function buildDisplaySnapshot(product: ProductRow): VitrinaDisplaySnapshot {
  return {
    title: product.title,
    categoryName: product.categoryName,
    manufacturer: product.manufacturer,
    price: product.price,
    jomlaPrice: product.jomlaPrice,
    instock: product.instock,
    rating: product.rating,
    descriptionLength: product.description.trim().length,
    titleHasColorHint: includesColorHint(product.title),
    titleHasPriceHint: includesPriceHint(product.title),
    titleHasBrandHint:
      product.manufacturer.trim().length > 0 &&
      product.title.toLowerCase().includes(product.manufacturer.toLowerCase()),
  };
}

/** List → Vitrina promo discount as a percentage (null if no promo or invalid). */
function listToPromoDiscountPct(listPrice: number, jomla: number | null): number | null {
  if (jomla == null || listPrice <= 0 || jomla >= listPrice) return null;
  return ((listPrice - jomla) / listPrice) * 100;
}

function buildInteractionSnapshot(aggregate: SignalAggregate): VitrinaInteractionSnapshot {
  const views = aggregate.views;
  const clicks = aggregate.clicks;
  const addToCarts = aggregate.addToCarts;
  return {
    windowDays: SIGNAL_WINDOW_DAYS,
    views,
    viewDwellMs: aggregate.viewDwellMs,
    hovers: aggregate.hovers,
    clicks,
    addToCarts,
    optionSelects: aggregate.optionSelects,
    imageViews: aggregate.imageViews,
    specsInteractions: aggregate.specsInteractions,
    specsDwellMs: aggregate.specsDwellMs,
    scrollDepth75Plus: aggregate.scrollDepth75Plus,
    avgClickYpct:
      aggregate.clickYCount > 0 ? Number((aggregate.clickYTotal / aggregate.clickYCount).toFixed(1)) : null,
    avgHoverYpct:
      aggregate.hoverYCount > 0 ? Number((aggregate.hoverYTotal / aggregate.hoverYCount).toFixed(1)) : null,
    topSelectedColors: topColors(aggregate.colorCounts),
    viewToCartRate: views > 0 ? Number((addToCarts / views).toFixed(3)) : null,
    clickToCartRate: clicks > 0 ? Number((addToCarts / clicks).toFixed(3)) : null,
  };
}

function buildTips(
  product: ProductRow,
  display: VitrinaDisplaySnapshot,
  interaction: VitrinaInteractionSnapshot,
  aggregate: SignalAggregate
): VitrinaProductMarketingTip[] {
  const tips: VitrinaProductMarketingTip[] = [];
  const views = interaction.views;
  const viewToCartPct =
    interaction.viewToCartRate != null ? interaction.viewToCartRate * 100 : null;
  const discountPct = listToPromoDiscountPct(product.price, product.jomlaPrice);

  const priceZoneEngaged =
    views >= PRICE_MIN_VIEWS &&
    aggregate.priceZoneClicks >= PRICE_ZONE_CLICKS_MIN &&
    aggregate.priceZoneClicks / views >= PRICE_ZONE_CLICKS_PER_VIEW;

  const clickToCartLooksSticky =
    views >= PRICE_MIN_VIEWS &&
    interaction.clicks >= PRICE_CLICKS_MIN &&
    interaction.addToCarts <= Math.floor(interaction.clicks * CLICK_TO_CART_STICKY_MAX);

  const viewToCartFriction =
    views >= PRICE_MIN_VIEWS && viewToCartPct != null && viewToCartPct < VIEW_TO_CART_PCT_FRICTION;

  const priceSensitive =
    viewToCartFriction || (priceZoneEngaged && clickToCartLooksSticky);

  const wellPriced =
    product.jomlaPrice != null &&
    views >= PRICE_MIN_VIEWS_STRONG_READ &&
    viewToCartPct != null &&
    (viewToCartPct >= VIEW_TO_CART_PCT_STRONG ||
      (viewToCartPct >= VIEW_TO_CART_PCT_HEALTHY_WITH_PROMO && discountPct != null && discountPct >= PROMO_DISCOUNT_PCT_SOLID));

  const showGenericPriceHygiene =
    views >= Math.max(18, Math.floor(PRICE_MIN_VIEWS * 0.55)) &&
    !priceSensitive &&
    !wellPriced &&
    (!display.titleHasPriceHint || product.jomlaPrice == null);

  if (priceSensitive || wellPriced || showGenericPriceHygiene) {
    const frictionLine =
      viewToCartPct != null ?
        `In the last ${SIGNAL_WINDOW_DAYS} days, only about ${viewToCartPct.toFixed(1)}% of product views became add-to-carts — under the ~${VIEW_TO_CART_PCT_FRICTION}% band where we usually see healthy traction on catalogue items.`
      : "Shoppers interact near the price strip but add-to-cart stays flat — typical when the offer or the visible price is unclear.";

    const discountLine =
      discountPct == null ?
        ""
      : discountPct < PROMO_DISCOUNT_PCT_WEAK ?
        ` The current promo is only ~${discountPct.toFixed(0)}% below list — shoppers often need at least ~${PROMO_DISCOUNT_PCT_WEAK.toFixed(0)}–${PROMO_DISCOUNT_PCT_SOLID.toFixed(0)}% off (or a clearer “was / now” story) to notice the deal.`
      : discountPct >= PROMO_DISCOUNT_PCT_SOLID ?
        ` The ~${discountPct.toFixed(0)}% promo is meaningful; focus on showing the selling price on the thumbnail and above the fold so the saving is obvious before they bounce.`
      : "";

    tips.push({
      label: "Price",
      action:
        priceSensitive ?
          viewToCartFriction ?
            `${frictionLine}${discountLine} Show the DA selling price on the thumbnail and tighten the Vitrina promo when the maths still underperforms.`
          : `${frictionLine} Surface the DA price above the fold and test a clearer Vitrina promo or bundle cue — price-area taps are high but carts are not following.`
        : wellPriced ?
          `Promo is on and conversion sits around ${viewToCartPct?.toFixed(1)}% view→cart — at or above the ~${VIEW_TO_CART_PCT_HEALTHY_WITH_PROMO}% “healthy with promo” line. Keep the Vitrina price on the thumbnail and reinforce value in the title.`
        : `Make the DA list and promo prices obvious on the catalog card (${!display.titleHasPriceHint ? "title still hides a numeric price — " : ""}helps shoppers self-select before opening the page).`,
      priority: priceSensitive ? "high" : wellPriced ? "high" : "medium",
      quickFixId: product.jomlaPrice == null && priceSensitive ? "promo_price" : undefined,
    });
  }

  const highDemand =
    interaction.views >= 10 ||
    interaction.hovers >= 12 ||
    interaction.clicks >= 8;
  if (product.instock > 0 && (highDemand || interaction.views >= 6)) {
    tips.push({
      label: "Quantity and availability",
      action:
        product.instock <= 5 ?
          `Only ${product.instock} unit${product.instock === 1 ? "" : "s"} remain and traffic is rising. Show in-stock availability on the thumbnail and product page.`
        : highDemand ?
          "Demand is building on this item. State that it is available now so shoppers move from the catalog to the product page with confidence."
        : "Tell shoppers the item is available now on the thumbnail and near the price block.",
      priority: highDemand ? "high" : "medium",
      quickFixId: "availability_note",
    });
  }

  const qualityReviewSignal =
    aggregate.reviewInteractions >= 3 ||
    (product.rating > 0 && product.rating < 3.5 && interaction.views >= 5) ||
    (product.rating >= 4 && interaction.views >= 5) ||
    (product.rating > 0 && aggregate.imageViews >= 4 && interaction.views >= 6) ||
    (product.rating >= 3.5 && aggregate.reviewInteractions >= 2);

  if (qualityReviewSignal) {
    const priorityHigh =
      aggregate.reviewInteractions >= 5 ||
      (product.rating > 0 && product.rating < 3.5 && interaction.views >= 8) ||
      aggregate.imageViews >= 6 ||
      product.rating >= 4.5;

    const concern =
      aggregate.reviewInteractions >= 3 ||
      (product.rating > 0 && product.rating < 3.5 && interaction.views >= 5);
    const action = concern ?
      aggregate.reviewInteractions >= 3 && product.rating > 0 && product.rating < 3.5 ?
        "Shoppers keep opening reviews and the catalog rating looks soft. Add a clear Quality reassurance row in the details, then surface your best real customer review (highest stars with a written comment) as a short line on the main product photo — no scripted marketing quotes."
      : aggregate.reviewInteractions >= 3 ?
        "The reviews area gets heavy traffic — shoppers are validating quality. Reinforce trust with a Quality line in additional info and pin your top verified review on the hero image."
      : "The catalog rating is below what shoppers usually trust. Strengthen proof with a Quality note and your strongest real review excerpt on the hero photo."
    : "Shoppers linger on imagery and ratings. Add a Quality reassurance row and feature your best verified written review on the main photo so the first impression matches real buyer voices.";

    tips.push({
      label: "Quality & reviews",
      action,
      priority: priorityHigh ? "high" : "medium",
      quickFixId: "quality_highlight",
    });
  }

  const trendingItem =
    interaction.views >= 10 ||
    interaction.hovers >= 12 ||
    interaction.clicks >= 8 ||
    (interaction.views >= 8 && interaction.clicks >= 5) ||
    (interaction.addToCarts >= 2 && interaction.views >= 6);
  if (trendingItem) {
    tips.push({
      label: "Countdown timer",
      action:
        interaction.addToCarts >= 2 ?
          "This item is trending and already converting. Add a This deal ends in... countdown on the product page or catalog card to create urgency without requiring a real sale."
        : "Traffic is rising on this item. Add a This deal ends in... countdown on the hero area or thumbnail to nudge shoppers before they leave.",
      priority:
        interaction.views >= 12 || interaction.clicks >= 10 || interaction.addToCarts >= 3 ? "high" : "medium",
      quickFixId: "trending_countdown",
    });
  }

  const topColor = interaction.topSelectedColors[0];
  const runnerUpColor = interaction.topSelectedColors[1];
  const topColorSelections = topColor ? aggregate.colorCounts.get(topColor) ?? 0 : 0;
  const runnerUpSelections = runnerUpColor ? aggregate.colorCounts.get(runnerUpColor) ?? 0 : 0;
  const hasColorPreferenceSignal =
    topColor &&
    !isColorAlreadyDefault(product, topColor) &&
    (topColorSelections >= 2 ||
      interaction.optionSelects >= 3 ||
      (interaction.views >= 5 && topColorSelections >= 1));
  if (hasColorPreferenceSignal) {
    tips.push({
      label: "Default color",
      action:
        runnerUpColor && topColorSelections > runnerUpSelections ?
          `Shoppers choose "${topColor}" more often than "${runnerUpColor}". Set it as the default color so the product page opens on the most wanted shade.`
        : `"${topColor}" is the most selected color. Move it to the first swatch so the page opens on the shade shoppers want.`,
      priority:
        topColorSelections >= 4 || interaction.optionSelects >= 6 || topColorSelections >= runnerUpSelections + 2 ?
          "high"
        : "medium",
      quickFixId: "default_color",
    });
  }

  // Signal-driven tips need meaningful traffic (views, hovers, etc.). Without a cold-start path,
  // every product would be filtered out and Seller Helper would show no Vitrina rows at all.
  if (tips.length === 0) {
    const windowLabel = `${SIGNAL_WINDOW_DAYS} days`;
    let action: string;
    if (views === 0) {
      action = `No shopper micro-signals in the last ${windowLabel} yet — still tune the Vitrina card: a main image that reads at thumbnail size, numeric list and promo prices when you run a deal, and a title that states product and brand without keyword stuffing.`;
    } else if (views < 6) {
      action = `Very light traffic in the last ${windowLabel} (${views} view${views === 1 ? "" : "s"}). Sharpen the thumbnail, title, and visible pricing so early impressions convert once volume picks up.`;
    } else {
      action = `Signals are still too thin for automated price or social-proof nudges. Tighten the thumbnail, above-the-fold pricing, and a short benefits line so the listing works before traffic scales.`;
    }
    if (display.descriptionLength < 100) {
      action +=
        " Add richer detail (structured specs plus a short “why buy” line) — thin pages underperform in search.";
    }
    if (product.instock <= 0) {
      action += " Update stock or pause the listing if this SKU is not available.";
    }
    tips.push({
      label: "Catalog card",
      action,
      priority: "medium",
    });
  }

  return tips.sort((left, right) => compareImportanceTiers(left.priority, right.priority));
}

function buildQuickFixes(
  product: ProductRow,
  interaction: VitrinaInteractionSnapshot,
  aggregate: SignalAggregate,
  tips: VitrinaProductMarketingTip[]
): VitrinaQuickFixOption[] {
  const fixes: VitrinaQuickFixOption[] = [];
  const seen = new Set<VitrinaQuickFixId>();

  const pushFix = (fix: VitrinaQuickFixOption) => {
    if (seen.has(fix.id) || fixes.length >= MAX_QUICK_FIXES) return;
    seen.add(fix.id);
    fixes.push(fix);
  };

  const topColor = interaction.topSelectedColors[0];

  for (const tip of tips) {
    if (!tip.quickFixId) continue;
    if (tip.quickFixId === "default_color" && topColor) {
      pushFix({
        id: "default_color",
        label: "Default color",
        summary: `Move "${topColor}" to the first color option so the storefront opens on the most selected shade.`,
        context: { color: topColor },
      });
    }
    if (tip.quickFixId === "promo_price" && product.jomlaPrice == null) {
      pushFix({
        id: "promo_price",
        label: "Vitrina promo price",
        summary:
          "Enable the Vitrina selling price and keep the current list price as the strikethrough reference.",
      });
    }
    if (tip.quickFixId === "availability_note" && product.instock > 0) {
      pushFix({
        id: "availability_note",
        label: "Availability message",
        summary: `Add an in-stock note for ${product.instock} available unit${product.instock === 1 ? "" : "s"} on the product page.`,
      });
    }
    if (tip.quickFixId === "quality_highlight") {
      pushFix({
        id: "quality_highlight",
        label: "Quality & best review on hero",
        summary:
          "Add the Quality reassurance row and pin your highest-rated written customer review on the main product image (real review text, not a template).",
      });
    }
    if (tip.quickFixId === "trending_countdown") {
      pushFix({
        id: "trending_countdown",
        label: "Trending countdown",
        summary:
          "Add a This deal ends in... countdown on the product hero area for this trending item.",
      });
    }
  }

  return fixes;
}

function opportunityScore(
  tips: VitrinaProductMarketingTip[],
  interaction: VitrinaInteractionSnapshot
): number {
  const priorityWeight = tips.reduce((sum, tip) => sum + (4 - IMPORTANCE_RANKS[tip.priority]), 0);
  const trafficWeight = Math.min(12, Math.log2(interaction.views + 2) * 2);
  const frictionWeight =
    interaction.viewToCartRate != null && interaction.viewToCartRate * 100 < VIEW_TO_CART_PCT_FRICTION ?
      (VIEW_TO_CART_PCT_FRICTION / 100 - interaction.viewToCartRate) * 45
    : 0;
  return priorityWeight + trafficWeight + frictionWeight;
}

function vitrinaProductImportanceRank(item: VitrinaProductMarketingRecommendation): number {
  if (item.tips.length === 0) return IMPORTANCE_RANKS.low;
  return Math.min(...item.tips.map((tip) => IMPORTANCE_RANKS[tip.priority]));
}

function slugifyCatalogTitle(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function categoryDisplayNameFromSlug(categorySlug: string) {
  const match = categoryData.find((c) => c.slug === categorySlug);
  return match?.title ?? categorySlug;
}

function mapShopItemToProductRow(item: Product): ProductRow {
  const mainimage = item.imgs?.thumbnails?.[0]?.trim() || "/images/products/product-placeholder.png";
  const slug = slugifyCatalogTitle(item.title) || `product-${item.id}`;
  return {
    id: String(item.id),
    slug,
    title: item.title,
    mainimage,
    price: item.detailPrice,
    jomlaPrice: item.jomlaPrice ?? null,
    rating: 0,
    description: item.description ?? "",
    manufacturer: "",
    instock: item.instock ?? 24,
    categoryName: categoryDisplayNameFromSlug(item.category),
    storefrontProductId: item.id,
  };
}

/** When Postgres has no `products` rows yet, still surface storefront-shaped cards from bundled shop data. */
function staticCatalogProductRows(limit: number): ProductRow[] {
  return shopData.slice(0, Math.max(0, limit)).map(mapShopItemToProductRow);
}

async function loadProductRows(limit: number): Promise<ProductRow[]> {
  const rows = await db
    .select({
      id: productsTable.id,
      slug: productsTable.slug,
      title: productsTable.title,
      mainimage: productsTable.mainimage,
      price: productsTable.price,
      jomlaPrice: productsTable.jomlaPrice,
      rating: productsTable.rating,
      description: productsTable.description,
      manufacturer: productsTable.manufacturer,
      instock: productsTable.instock,
      categoryName: sql<string>`coalesce(${categoryTable.name}, 'Catalog')`.as("categoryName"),
    })
    .from(productsTable)
    .leftJoin(categoryTable, eq(productsTable.categoryId, categoryTable.id))
    .orderBy(desc(productsTable.id))
    .limit(limit);

  if (rows.length === 0) {
    return staticCatalogProductRows(limit);
  }

  return rows.map((row) => ({
    ...row,
    storefrontProductId: resolveStorefrontProductId(row.title, row.id),
  }));
}

const SIGNAL_AGGREGATE_ID_CHUNK = 120;

async function loadSignalAggregates(storefrontIds: number[], since: Date) {
  const aggregates = new Map<number, SignalAggregate>();
  for (const id of storefrontIds) {
    aggregates.set(id, createEmptySignalAggregate());
  }
  if (storefrontIds.length === 0) return aggregates;

  for (let i = 0; i < storefrontIds.length; i += SIGNAL_AGGREGATE_ID_CHUNK) {
    const slice = storefrontIds.slice(i, i + SIGNAL_AGGREGATE_ID_CHUNK);
    try {
      const countRows = await db.execute(sql`
        SELECT
          product_local_id::int AS product_id,
          COUNT(*) FILTER (WHERE event_name = 'pa_product_view')::int AS views,
          COUNT(*) FILTER (WHERE event_name = 'pa_pointer_hover')::int AS hovers,
          COUNT(*) FILTER (WHERE event_name = 'pa_pointer_click')::int AS clicks,
          COUNT(*) FILTER (WHERE event_name = 'pa_add_to_cart')::int AS add_to_carts,
          COUNT(*) FILTER (WHERE event_name = 'pa_select_option')::int AS option_selects,
          COUNT(*) FILTER (WHERE event_name = 'pa_image_view_time')::int AS image_views,
          COUNT(*) FILTER (WHERE event_name = 'pa_specs_interaction')::int AS specs_interactions
        FROM sales_micro_event
        WHERE created_at >= ${since}
          AND product_local_id IS NOT NULL
          AND product_local_id::text ~ '^-?[0-9]+$'
          AND product_local_id::int IN (${sql.join(
            slice.map((id) => sql`${id}`),
            sql`, `
          )})
        GROUP BY product_local_id
      `);

      for (const row of countRows.rows as Array<Record<string, unknown>>) {
        const productId = Number(row.product_id);
        const aggregate = aggregates.get(productId);
        if (!aggregate) continue;
        aggregate.views = Number(row.views ?? 0);
        aggregate.hovers = Number(row.hovers ?? 0);
        aggregate.clicks = Number(row.clicks ?? 0);
        aggregate.addToCarts = Number(row.add_to_carts ?? 0);
        aggregate.optionSelects = Number(row.option_selects ?? 0);
        aggregate.imageViews = Number(row.image_views ?? 0);
        aggregate.specsInteractions = Number(row.specs_interactions ?? 0);
      }
    } catch (error) {
      console.error("[vitrina] loadSignalAggregates count chunk failed", error);
    }
  }

  for (let i = 0; i < storefrontIds.length; i += SIGNAL_AGGREGATE_ID_CHUNK) {
    const slice = storefrontIds.slice(i, i + SIGNAL_AGGREGATE_ID_CHUNK);
    try {
      const detailRows = await db
        .select({
          productLocalId: salesMicroEventTable.productLocalId,
          eventName: salesMicroEventTable.eventName,
          payloadJson: salesMicroEventTable.payloadJson,
        })
        .from(salesMicroEventTable)
        .where(
          and(
            inArray(salesMicroEventTable.productLocalId, slice),
            gte(salesMicroEventTable.createdAt, since)
          )
        );

      for (const row of detailRows) {
    const productId = row.productLocalId;
    if (productId == null) continue;
    const aggregate = aggregates.get(productId);
    if (!aggregate) continue;
    const payload = parsePayload(row.payloadJson);
    const eventName = row.eventName;

    if (eventName === "pa_product_view_time") {
      aggregate.viewDwellMs += readNumber(payload, "visible_ms");
      continue;
    }

    if (eventName === "pa_specs_view_time") {
      aggregate.specsDwellMs += readNumber(payload, "visible_ms");
      continue;
    }

    if (eventName.startsWith("pa_review")) {
      aggregate.reviewInteractions += 1;
      continue;
    }

    if (eventName === "pa_pointer_click") {
      if (isHeatmapPreviewPointerEvent(payload)) {
        aggregate.clicks = Math.max(0, aggregate.clicks - 1);
        continue;
      }
      const yPct = readNumber(payload, "y_pct");
      if (yPct > 0) {
        aggregate.clickYTotal += yPct;
        aggregate.clickYCount += 1;
        if (yPct <= 35) {
          aggregate.priceZoneClicks += 1;
        }
      }
      continue;
    }

    if (eventName === "pa_pointer_hover") {
      if (isHeatmapPreviewPointerEvent(payload)) {
        aggregate.hovers = Math.max(0, aggregate.hovers - 1);
        continue;
      }
      const yPct = readNumber(payload, "y_pct");
      if (yPct > 0) {
        aggregate.hoverYTotal += yPct;
        aggregate.hoverYCount += 1;
      }
      continue;
    }

    if (eventName === "pa_scroll" && readNumber(payload, "depth_pct") >= 75) {
      aggregate.scrollDepth75Plus += 1;
      continue;
    }

    if (eventName === "pa_select_option") {
      const color = readString(payload, "color");
      if (color) {
        aggregate.colorCounts.set(color, (aggregate.colorCounts.get(color) ?? 0) + 1);
      }
    }
      }
    } catch (error) {
      console.error("[vitrina] loadSignalAggregates detail chunk failed", error);
    }
  }

  return aggregates;
}

function interactionScore(interaction: VitrinaInteractionSnapshot) {
  return (
    interaction.views +
    interaction.hovers * 2 +
    interaction.clicks * 3 +
    interaction.addToCarts * 5 +
    interaction.optionSelects +
    interaction.specsInteractions +
    interaction.imageViews
  );
}

function toRecommendation(
  product: ProductRow,
  display: VitrinaDisplaySnapshot,
  interaction: VitrinaInteractionSnapshot,
  aggregate: SignalAggregate,
  tips: VitrinaProductMarketingTip[]
): VitrinaProductMarketingRecommendation {
  const quickFixes = buildQuickFixes(product, interaction, aggregate, tips);
  const primaryRecommendation =
    tips[0]?.action ??
    "Refine the title, image, and price to clarify the offer from the catalog thumbnail.";

  return {
    productId: product.id,
    slug: product.slug,
    title: product.title,
    mainimage: product.mainimage,
    categoryName: product.categoryName,
    price: product.price,
    jomlaPrice: product.jomlaPrice,
    instock: product.instock,
    manufacturer: product.manufacturer,
    rating: product.rating,
    description: product.description,
    primaryRecommendation,
    tips,
    quickFixes,
    opportunityScore: opportunityScore(tips, interaction),
    signals: {
      views: interaction.views,
      hovers: interaction.hovers,
      clicks: interaction.clicks,
      addToCarts: interaction.addToCarts,
      viewToCartRate: interaction.viewToCartRate,
      interactionScore: interactionScore(interaction),
    },
  };
}

export function buildVitrinaRecommendationPromptContext(
  products: ProductRow[],
  aggregates: Map<number, SignalAggregate>
): VitrinaRecommendationPromptPayload {
  const promptProducts: VitrinaRecommendationPromptProduct[] = products.map((product) => {
    const aggregate = aggregates.get(product.storefrontProductId) ?? createEmptySignalAggregate();
    const display = buildDisplaySnapshot(product);
    const interaction = buildInteractionSnapshot(aggregate);
    const tips = buildTips(product, display, interaction, aggregate);
    return {
      productId: product.id,
      storefrontProductId: product.storefrontProductId,
      display,
      interaction,
      opportunityScore: opportunityScore(tips, interaction),
    };
  });

  return buildVitrinaRecommendationPromptPayload(
    promptProducts.sort((left, right) => right.opportunityScore - left.opportunityScore),
    { maxRecommendations: PROMPT_TOP_RECOMMENDATIONS }
  );
}

export async function getVitrinaProductMarketingRecommendationByProductId(
  productId: string
): Promise<VitrinaProductMarketingRecommendation | null> {
  const id = productId.trim();
  if (!id) {
    return null;
  }

  let product: ProductRow;

  if (isPostgresUuid(id)) {
    const [row] = await db
      .select({
        id: productsTable.id,
        slug: productsTable.slug,
        title: productsTable.title,
        mainimage: productsTable.mainimage,
        price: productsTable.price,
        jomlaPrice: productsTable.jomlaPrice,
        rating: productsTable.rating,
        description: productsTable.description,
        manufacturer: productsTable.manufacturer,
        instock: productsTable.instock,
        categoryName: sql<string>`coalesce(${categoryTable.name}, 'Catalog')`.as("categoryName"),
      })
      .from(productsTable)
      .leftJoin(categoryTable, eq(productsTable.categoryId, categoryTable.id))
      .where(eq(productsTable.id, id))
      .limit(1);

    if (!row) {
      return null;
    }

    product = { ...row, storefrontProductId: resolveStorefrontProductId(row.title, row.id) };
  } else {
    const numeric = Number.parseInt(id, 10);
    if (!Number.isFinite(numeric) || numeric <= 0 || String(numeric) !== id) {
      return null;
    }
    const item = shopData.find((p) => p.id === numeric);
    if (!item) {
      return null;
    }
    product = mapShopItemToProductRow(item);
  }

  const storefrontProductId = product.storefrontProductId;

  const since = new Date(Date.now() - SIGNAL_WINDOW_DAYS * MS_DAY);
  const aggregates = await loadSignalAggregates([storefrontProductId], since);
  const aggregate = aggregates.get(storefrontProductId) ?? createEmptySignalAggregate();
  const display = buildDisplaySnapshot(product);
  const interaction = buildInteractionSnapshot(aggregate);
  const tips = buildTips(product, display, interaction, aggregate);

  return toRecommendation(product, display, interaction, aggregate, tips);
}

export async function listVitrinaProductMarketingRecommendations(options?: {
  actionableOnly?: boolean;
  limit?: number;
}): Promise<VitrinaProductMarketingRecommendation[]> {
  const limit = Math.max(1, options?.limit ?? DEFAULT_VITRINA_CATALOG_LIMIT);
  const since = new Date(Date.now() - SIGNAL_WINDOW_DAYS * MS_DAY);
  const products = await loadProductRows(limit);
  const aggregates = await loadSignalAggregates(
    products.map((product) => product.storefrontProductId),
    since
  );

  const ranked = products
    .map((product) => {
      const aggregate = aggregates.get(product.storefrontProductId) ?? createEmptySignalAggregate();
      const display = buildDisplaySnapshot(product);
      const interaction = buildInteractionSnapshot(aggregate);
      const tips = buildTips(product, display, interaction, aggregate);
      return {
        product,
        display,
        interaction,
        aggregate,
        tips,
        score: opportunityScore(tips, interaction),
      };
    })
  .filter((item) => {
      if (!options?.actionableOnly) return item.tips.length > 0;
      return item.tips.some((tip) => tip.priority === "high" || tip.priority === "medium");
    })
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return vitrinaProductImportanceRank(
        toRecommendation(left.product, left.display, left.interaction, left.aggregate, left.tips)
      ) - vitrinaProductImportanceRank(
        toRecommendation(right.product, right.display, right.interaction, right.aggregate, right.tips)
      );
    });

  return ranked.map((item) =>
    toRecommendation(item.product, item.display, item.interaction, item.aggregate, item.tips)
  );
}
