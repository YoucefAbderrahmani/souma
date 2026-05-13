"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_TIMER_DURATION_MS,
  getProductPromoPriceRowLabels,
  type ProductPromoLabel,
} from "@/lib/product-demo-promo-labels";
import { formatPromoCountdownRemaining } from "@/lib/product-promo-countdown-format";
import {
  PRODUCT_PROMO_PRICE_ROW_TEXT_CLASS,
  PRODUCT_PROMO_PRICE_ROW_TIMER_COUNT_CLASS,
  PRODUCT_PROMO_PRICE_ROW_TIMER_PREFIX_CLASS,
} from "@/lib/product-promo-label-tokens";
import { usePromoTimerEndAt } from "@/hooks/usePromoTimerEndAt";
import { cn } from "@/lib/utils";

function PromoTimerPriceRow({
  prefix,
  storageKey,
  defaultDurationMs = DEFAULT_TIMER_DURATION_MS,
  className,
}: {
  prefix: string;
  storageKey: string;
  defaultDurationMs?: number;
  className?: string;
}) {
  const endAt = usePromoTimerEndAt(storageKey, defaultDurationMs);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (endAt == null) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [endAt]);

  const remainingLabel = useMemo(() => {
    if (endAt == null) return "…";
    return formatPromoCountdownRemaining(endAt - now);
  }, [endAt, now]);

  return (
    <span className={cn("inline-flex flex-col items-start gap-1", className)}>
      {prefix.trim() ?
        <>
          <span className={PRODUCT_PROMO_PRICE_ROW_TIMER_PREFIX_CLASS}>{prefix.trim()}</span>
          <span className={PRODUCT_PROMO_PRICE_ROW_TIMER_COUNT_CLASS}>{remainingLabel}</span>
        </>
      : <span className={PRODUCT_PROMO_PRICE_ROW_TEXT_CLASS}>{remainingLabel}</span>}
    </span>
  );
}

function PriceRowEntry({ entry }: { entry: ProductPromoLabel }) {
  if (entry.kind === "text") {
    return <span className={PRODUCT_PROMO_PRICE_ROW_TEXT_CLASS}>{entry.text}</span>;
  }
  return (
    <PromoTimerPriceRow
      prefix={entry.prefix}
      storageKey={entry.storageKey}
      defaultDurationMs={entry.defaultDurationMs}
    />
  );
}

/** Promo copy for the price area (black text). Timers are shown beside the orange Vitrina price via `VitrinaPriceWithPromoTimerRow`. */
export function ProductPromoPriceRowLabels({
  product,
  labels: labelsProp,
  onlyKinds,
  className,
}: {
  product: { id: number; title: string };
  /** When set, these entries are rendered instead of resolving from `product`. */
  labels?: readonly ProductPromoLabel[];
  /** Restrict to timer and/or text entries from the price-row set. */
  onlyKinds?: ReadonlyArray<"timer" | "text">;
  className?: string;
}) {
  let labels = labelsProp ?? getProductPromoPriceRowLabels(product);
  if (onlyKinds?.length) {
    labels = labels.filter((e) => onlyKinds.includes(e.kind));
  }
  if (!labels.length) return null;

  return (
    <span className={cn("inline-flex flex-wrap items-center justify-start gap-x-1.5 gap-y-0.5", className)}>
      {labels.map((entry, index) => (
        <PriceRowEntry key={`${entry.kind}-${index}`} entry={entry} />
      ))}
    </span>
  );
}

/**
 * Orange Vitrina price on the left, promo timer(s) after it with margin (not flush to the card edge).
 * Pass the orange price node as `children` (typography is up to the parent).
 */
export function VitrinaPriceWithPromoTimerRow({
  product,
  children,
  className,
}: {
  product: { id: number; title: string };
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 max-w-full flex-wrap items-center justify-start gap-x-3 gap-y-0.5 sm:gap-x-4",
        className
      )}
    >
      <div className="min-w-0 shrink-0">{children}</div>
      <ProductPromoPriceRowLabels
        product={product}
        onlyKinds={["timer"]}
        className="max-w-[min(100%,11rem)] shrink-0 text-left sm:max-w-[13rem]"
      />
    </div>
  );
}
