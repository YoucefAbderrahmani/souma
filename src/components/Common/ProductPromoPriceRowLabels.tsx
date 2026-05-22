"use client";

import type { ReactNode } from "react";
import {
  getProductPromoPriceRowLabels,
  type ProductPromoLabel,
} from "@/lib/product-demo-promo-labels";
import { PRODUCT_PROMO_PRICE_ROW_TEXT_CLASS } from "@/lib/product-promo-label-tokens";
import { usePromoTimerEndAt } from "@/hooks/usePromoTimerEndAt";
import { VitrinaPromoCountdownLive } from "@/components/Common/VitrinaPromoCountdown";
import { ProductTrendingCountdown } from "@/components/Common/ProductTrendingCountdown";
import { cn } from "@/lib/utils";

export function parseTrendingCountdownEndsAt(
  raw?: string | Date | null
): Date | null {
  if (raw == null) return null;
  const endsAt = raw instanceof Date ? raw : new Date(String(raw).trim());
  if (!Number.isFinite(endsAt.getTime())) return null;
  return endsAt;
}

function PriceRowTimer({
  prefix,
  storageKey,
  defaultDurationMs,
}: {
  prefix: string;
  storageKey: string;
  defaultDurationMs?: number;
}) {
  const endAt = usePromoTimerEndAt(storageKey, defaultDurationMs);

  return (
    <VitrinaPromoCountdownLive
      endAt={endAt}
      prefix={prefix}
      variant="inline"
    />
  );
}

function PriceRowEntry({ entry }: { entry: ProductPromoLabel }) {
  if (entry.kind === "text") {
    return <span className={PRODUCT_PROMO_PRICE_ROW_TEXT_CLASS}>{entry.text}</span>;
  }
  return (
    <PriceRowTimer
      prefix={entry.prefix}
      storageKey={entry.storageKey}
      defaultDurationMs={entry.defaultDurationMs}
    />
  );
}

/** Promo copy for the price area (black text). Timers sit beside the orange Vitrina price via `VitrinaPriceWithPromoTimerRow`. */
export function ProductPromoPriceRowLabels({
  product,
  labels: labelsProp,
  onlyKinds,
  className,
}: {
  product: { id: number; title: string };
  labels?: readonly ProductPromoLabel[];
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
 * Price on the left; promo + trending countdown chips on the right (no full-width banner).
 */
export function VitrinaPriceWithPromoTimerRow({
  product,
  children,
  trendingCountdownEndsAt,
  className,
}: {
  product: { id: number; title: string };
  children: ReactNode;
  trendingCountdownEndsAt?: string | Date | null;
  className?: string;
}) {
  const trendingEndsAt = parseTrendingCountdownEndsAt(trendingCountdownEndsAt);

  return (
    <div
      className={cn(
        "flex w-full min-w-0 max-w-full items-center justify-between gap-x-2 gap-y-1.5",
        className
      )}
    >
      <div className="min-w-0 shrink-0">{children}</div>
      <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-x-2 gap-y-1">
        <ProductPromoPriceRowLabels
          product={product}
          onlyKinds={["timer"]}
          className="justify-end"
        />
        {trendingEndsAt ?
          <ProductTrendingCountdown endsAt={trendingEndsAt} variant="inline" />
        : null}
      </div>
    </div>
  );
}
