"use client";

import {
  getProductPromoImageLabels,
  type ProductPromoLabel,
} from "@/lib/product-demo-promo-labels";
import {
  PRODUCT_PROMO_COLUMN_MAX_CLASS,
  PRODUCT_PROMO_EMBEDDED_SIDE_PAD_CLASS,
  PRODUCT_PROMO_PILL_CLASS,
  PRODUCT_PROMO_RAISED_STACK_CLASS,
  PRODUCT_PROMO_STACK_GAP_CLASS,
} from "@/lib/product-promo-label-tokens";
import { usePromoTimerEndAt } from "@/hooks/usePromoTimerEndAt";
import { VitrinaPromoCountdownLive } from "@/components/Common/VitrinaPromoCountdown";
import { DEFAULT_TIMER_DURATION_MS } from "@/lib/product-demo-promo-labels";

function TimerPromoPill({
  prefix,
  storageKey,
  defaultDurationMs = DEFAULT_TIMER_DURATION_MS,
}: {
  prefix: string;
  storageKey: string;
  defaultDurationMs?: number;
}) {
  const endAt = usePromoTimerEndAt(storageKey, defaultDurationMs);

  return (
    <VitrinaPromoCountdownLive endAt={endAt} prefix={prefix} variant="pill" />
  );
}

function PromoLabelEntryView({ entry }: { entry: ProductPromoLabel }) {
  if (entry.kind === "text") {
    return <span className={PRODUCT_PROMO_PILL_CLASS}>{entry.text}</span>;
  }
  return (
    <TimerPromoPill
      prefix={entry.prefix}
      storageKey={entry.storageKey}
      defaultDurationMs={entry.defaultDurationMs}
    />
  );
}

function labelSide(entry: ProductPromoLabel): "left" | "right" {
  return entry.align ?? "right";
}

export function ProductDemoPromoLabels({
  product,
  mode = "embedded",
}: {
  product: { id: number; title: string };
  mode?: "embedded" | "raised";
}) {
  const labels = getProductPromoImageLabels(product);
  if (!labels.length) return null;

  if (mode === "raised") {
    return (
      <div className={PRODUCT_PROMO_RAISED_STACK_CLASS} aria-hidden>
        {labels.map((entry, index) => (
          <PromoLabelEntryView key={`${entry.kind}-${index}`} entry={entry} />
        ))}
      </div>
    );
  }

  const left = labels.filter((e) => labelSide(e) === "left");
  const right = labels.filter((e) => labelSide(e) === "right");

  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {left.length > 0 ?
        <div
          className={`absolute left-0 top-0 flex flex-col items-start ${PRODUCT_PROMO_COLUMN_MAX_CLASS} ${PRODUCT_PROMO_STACK_GAP_CLASS} ${PRODUCT_PROMO_EMBEDDED_SIDE_PAD_CLASS}`}
        >
          {left.map((entry, index) => (
            <PromoLabelEntryView key={`L-${entry.kind}-${index}`} entry={entry} />
          ))}
        </div>
      : null}
      {right.length > 0 ?
        <div
          className={`absolute right-0 top-2 flex flex-col items-end ${PRODUCT_PROMO_COLUMN_MAX_CLASS} ${PRODUCT_PROMO_STACK_GAP_CLASS} ${PRODUCT_PROMO_EMBEDDED_SIDE_PAD_CLASS}`}
        >
          {right.map((entry, index) => (
            <PromoLabelEntryView key={`R-${entry.kind}-${index}`} entry={entry} />
          ))}
        </div>
      : null}
    </div>
  );
}
