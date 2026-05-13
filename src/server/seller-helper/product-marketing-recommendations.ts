import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { compareImportanceTiers, IMPORTANCE_RANKS } from "@/lib/importance-ranking";
import { parseProductContent } from "@/lib/product-content";
import { getCatalogProducts } from "@/server/data-access/product-catalog";
import { db } from "@/server/db";
import { categoryTable, productsTable, salesMicroEventTable } from "@/server/db/schema";
import {
  buildVitrinaRecommendationPromptPayload,
  type VitrinaDisplaySnapshot,
  type VitrinaInteractionSnapshot,
  type VitrinaRecommendationPromptPayload,
  type VitrinaRecommendationPromptProduct,
} from "@/server/seller-helper/vitrina-recommendation-prompt";
import type {
  VitrinaProductMarketingRecommendation,
  VitrinaProductMarketingTip,
  VitrinaQuickFixId,
  VitrinaQuickFixOption,
} from "@/types/vitrina-product-recommendations";

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
const MAX_VISIBLE_PRODUCT_TIPS = 1;
const MAX_QUICK_FIXES = 4;
const SIGNAL_WINDOW_DAYS = 7;
const MS_DAY = 86_400_000;

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

function normalizeTitle(value: string) {
  return value.toLowerCase().trim().replace(/\s+/g, " ");
}

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
    titleHasBrandHint: product.title.toLowerCase().includes(product.manufacturer.toLowerCase()),
  };
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
  const viewToCartPct =
    interaction.viewToCartRate != null ? interaction.viewToCartRate * 100 : null;
  const priceSensitive =
    interaction.views >= 6 &&
    ((viewToCartPct != null && viewToCartPct < 10) ||
      (aggregate.priceZoneClicks >= 3 && interaction.addToCarts <= Math.max(1, Math.round(interaction.clicks * 0.2))));
  const wellPriced =
    product.jomlaPrice != null &&
    interaction.views >= 6 &&
    viewToCartPct != null &&
    viewToCartPct >= 10;

  if (priceSensitive || wellPriced || interaction.views >= 5) {
    tips.push({
      label: "Price",
      action:
        priceSensitive ?
          viewToCartPct != null ?
            `Shoppers check the price but only ${viewToCartPct.toFixed(1)}% of recent views add to cart. Show the selling price on the thumbnail and switch to the Vitrina promo price when the offer is competitive.`
          : "Shoppers click the price area but rarely add to cart. Surface the selling price above the fold and test a Vitrina promo price."
        : wellPriced ?
          "The Vitrina promo price is attracting attention. Keep the promo price visible on the thumbnail and reinforce the value in the title."
        : "Make the selling price obvious on the catalog card so shoppers know the offer before they open the product page.",
      priority: priceSensitive ? "high" : "medium",
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

  const qualityConcern =
    aggregate.reviewInteractions >= 3 ||
    (product.rating > 0 && product.rating < 3.5 && interaction.views >= 5);
  if (qualityConcern) {
    tips.push({
      label: "Quality concern",
      action:
        aggregate.reviewInteractions >= 3 ?
          "The reviews section is opened often, which suggests shoppers are checking quality before buying. Highlight rating proof and reassurance near the price and add-to-cart area."
        : "The rating is below shopper expectations. Surface stronger visual proof and customer reassurance before checkout.",
      priority: aggregate.reviewInteractions >= 5 ? "high" : "medium",
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

  const heroReviewOpportunity =
    (product.rating >= 4 && interaction.views >= 5) ||
    (product.rating > 0 && aggregate.imageViews >= 4 && interaction.views >= 6) ||
    (product.rating >= 3.5 && aggregate.reviewInteractions >= 2);
  if (heroReviewOpportunity) {
    tips.push({
      label: "Mini review on hero image",
      action:
        product.rating > 0 ?
          `Shoppers study the imagery before they buy. Overlay a one-liner on the main photo such as ⭐ ${product.rating.toFixed(1)} — "Even better than expected" to add trust at first glance.`
        : "Shoppers open the gallery often. Overlay a short customer-style line on the main image so the first impression feels proven.",
      priority:
        aggregate.imageViews >= 6 || product.rating >= 4.5 ? "high" : "medium",
      quickFixId: "hero_review_snippet",
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

  return tips
    .sort((left, right) => compareImportanceTiers(left.priority, right.priority))
    .slice(0, MAX_VISIBLE_PRODUCT_TIPS);
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
        label: "Quality reassurance",
        summary:
          product.rating > 0 ?
            `Add a customer-rating highlight (${product.rating.toFixed(1)}/5) to the product details.`
          : "Add a quality reassurance note to the product details.",
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
    if (tip.quickFixId === "hero_review_snippet") {
      pushFix({
        id: "hero_review_snippet",
        label: "Hero review snippet",
        summary:
          product.rating > 0 ?
            `Overlay ⭐ ${product.rating.toFixed(1)} — "Even better than expected" on the main product image.`
          : "Overlay a short customer-style review line on the main product image.",
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
    interaction.viewToCartRate != null && interaction.viewToCartRate < 0.1 ?
      (0.1 - interaction.viewToCartRate) * 40
    : 0;
  return priorityWeight + trafficWeight + frictionWeight;
}

function vitrinaProductImportanceRank(item: VitrinaProductMarketingRecommendation): number {
  if (item.tips.length === 0) return IMPORTANCE_RANKS.low;
  return Math.min(...item.tips.map((tip) => IMPORTANCE_RANKS[tip.priority]));
}

async function loadProductRows(limit: number): Promise<ProductRow[]> {
  const [rows, catalogProducts] = await Promise.all([
    db
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
        categoryName: categoryTable.name,
      })
      .from(productsTable)
      .innerJoin(categoryTable, eq(productsTable.categoryId, categoryTable.id))
      .orderBy(desc(productsTable.id))
      .limit(limit),
    getCatalogProducts(),
  ]);

  const storefrontByTitle = new Map(
    catalogProducts.map((product) => [normalizeTitle(product.title), product.id])
  );

  return rows
    .map((row) => ({
      ...row,
      storefrontProductId: storefrontByTitle.get(normalizeTitle(row.title)) ?? 0,
    }))
    .filter((row) => row.storefrontProductId > 0);
}

async function loadSignalAggregates(storefrontIds: number[], since: Date) {
  const aggregates = new Map<number, SignalAggregate>();
  for (const id of storefrontIds) {
    aggregates.set(id, createEmptySignalAggregate());
  }
  if (storefrontIds.length === 0) return aggregates;

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
      AND product_local_id::int IN (${sql.join(
        storefrontIds.map((id) => sql`${id}`),
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

  const detailRows = await db
    .select({
      productLocalId: salesMicroEventTable.productLocalId,
      eventName: salesMicroEventTable.eventName,
      payloadJson: salesMicroEventTable.payloadJson,
    })
    .from(salesMicroEventTable)
    .where(
      and(
        inArray(salesMicroEventTable.productLocalId, storefrontIds),
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
      categoryName: categoryTable.name,
    })
    .from(productsTable)
    .innerJoin(categoryTable, eq(productsTable.categoryId, categoryTable.id))
    .where(eq(productsTable.id, productId))
    .limit(1);

  if (!row) {
    return null;
  }

  const catalogProducts = await getCatalogProducts();
  const storefrontByTitle = new Map(
    catalogProducts.map((product) => [normalizeTitle(product.title), product.id])
  );
  const storefrontProductId = storefrontByTitle.get(normalizeTitle(row.title)) ?? 0;

  if (storefrontProductId <= 0) {
    return null;
  }

  const since = new Date(Date.now() - SIGNAL_WINDOW_DAYS * MS_DAY);
  const aggregates = await loadSignalAggregates([storefrontProductId], since);
  const aggregate = aggregates.get(storefrontProductId) ?? createEmptySignalAggregate();
  const product: ProductRow = { ...row, storefrontProductId };
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
