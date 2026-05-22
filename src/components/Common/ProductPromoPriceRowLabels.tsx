"use client";

import type { ReactNode } from "react";
import {
  getProductPromoPriceRowLabels,
  type ProductPromoLabel,
} from "@/lib/product-demo-promo-labels";
import { PRODUCT_PROMO_PRICE_ROW_TEXT_CLASS } from "@/lib/product-promo-label-tokens";
import { usePromoTimerEndAt } from "@/hooks/usePromoTimerEndAt";
import { VitrinaPromoCountdownLive } from "@/components/Common/VitrinaPromoCountdown";
import { cn } from "@/lib/utils";

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
 * Orange Vitrina price with promo timer chip aligned center-right of the price block.
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
        "flex min-w-0 max-w-full flex-wrap items-center justify-start gap-x-2.5 gap-y-2 sm:gap-x-3",
        className
      )}
    >
      <div className="min-w-0 shrink-0">{children}</div>
      <ProductPromoPriceRowLabels
        product={product}
        onlyKinds={["timer"]}
        className="shrink-0"
      />
    </div>
  );
}
