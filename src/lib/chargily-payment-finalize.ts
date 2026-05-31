"use client";

import { sequenceEndPurchase } from "@/lib/sequence-client";
import { clearStorefrontCart } from "@/lib/clear-storefront-cart";
import {
  flushProductAnalyticsNow,
  trackProductAnalytics,
} from "@/lib/product-analytics-client";
import type { AppDispatch } from "@/redux/store";
import {
  commitPendingInventoryPurchase,
  hasChargilyPaymentPending,
  isChargilyCheckoutSuccessReturn,
  isChargilyPaymentFlowActive,
  isFunnelOrderCompleteRecorded,
  markFunnelOrderCompleteRecorded,
  readChargilyPaymentSnapshot,
  readPendingPurchaseLineCount,
  restorePendingPurchaseFromBackup,
} from "@/hooks/useLiveProductInventory";

export type FinalizeChargilyPaymentResult = {
  ok: boolean;
  committed: boolean;
  alreadyRecorded: boolean;
};

export async function finalizeChargilyPaymentReturn(options: {
  dispatch: AppDispatch;
  userId?: string | null;
  source: "payment_success_return" | "go_back_to_store_click";
  chargilyCheckoutId?: string | null;
  totalPriceFallback?: number;
  cartLineItemsFallback?: number;
  itemsQtyTotalFallback?: number;
}): Promise<FinalizeChargilyPaymentResult> {
  if (typeof window === "undefined") {
    return { ok: false, committed: false, alreadyRecorded: false };
  }

  const hasChargilyReturnProof =
    isChargilyCheckoutSuccessReturn(options.chargilyCheckoutId) ||
    hasChargilyPaymentPending() ||
    isChargilyPaymentFlowActive();

  if (isFunnelOrderCompleteRecorded()) {
    await clearStorefrontCart(options.dispatch, options.userId);
    return { ok: true, committed: true, alreadyRecorded: true };
  }

  restorePendingPurchaseFromBackup();
  if (!hasChargilyReturnProof) {
    return { ok: false, committed: false, alreadyRecorded: false };
  }

  const snapshot = readChargilyPaymentSnapshot();
  const pendingLines = readPendingPurchaseLineCount();
  const lineItems = Math.max(
    options.cartLineItemsFallback ?? 0,
    pendingLines,
    snapshot?.line_items ?? 0,
    1
  );
  const totalDzd = Math.max(
    0,
    snapshot?.total_dzd ?? options.totalPriceFallback ?? 0
  );
  const itemsQtyTotal = Math.max(
    0,
    snapshot?.items_qty_total ?? options.itemsQtyTotalFallback ?? lineItems
  );

  const committed = hasChargilyPaymentPending()
    ? await commitPendingInventoryPurchase()
    : false;

  markFunnelOrderCompleteRecorded();
  sequenceEndPurchase();

  trackProductAnalytics("pa_funnel_order_complete", {
    payment_finalized: true,
    provider: "chargily",
    source: options.source,
    chargily_checkout_id: options.chargilyCheckoutId?.trim() || undefined,
    inventory_committed: committed,
    total_dzd: totalDzd,
    line_items: lineItems,
    order_value: totalDzd,
    currency: "DZD",
    items_qty_total: itemsQtyTotal > 0 ? itemsQtyTotal : lineItems,
  });
  trackProductAnalytics("pa_purchase", {
    total_dzd: totalDzd,
    line_items: lineItems,
    order_value: totalDzd,
    currency: "DZD",
    items_qty_total: itemsQtyTotal > 0 ? itemsQtyTotal : lineItems,
    provider: "chargily",
    status: "success",
    payment_finalized: true,
    inventory_committed: committed,
  });
  trackProductAnalytics("pa_checkout_step", {
    step: "payment_return",
    status: "success",
    provider: "chargily",
    payment_method: "chargily",
    payment_finalized: true,
    inventory_committed: committed,
  });
  await flushProductAnalyticsNow();

  await clearStorefrontCart(options.dispatch, options.userId);

  return { ok: true, committed, alreadyRecorded: false };
}
