import type { SalesMicroEventAdminRow } from "@/types/sales-micro-analytics";

export type ProductMicroAggregateRow = {
  productLocalId: number;
  productTitle: string | null;
  eventCount: number;
  sessionCount: number;
  firstEventAt: string;
  lastEventAt: string;
};

/** Per `event_name`: counts and averages computed only from rows of that name (not pooled across types). */
export type ProductMicroEventNameBreakdown = {
  count: number;
  avgPayloadDurationMs: number | null;
  avgDeltaAfterPrevMs: number | null;
};

export type ProductMicroDetailStats = {
  /** Pooled across all event types (legacy / quick glance). Prefer `byEventNameDetail`. */
  avgPayloadDurationMs: number | null;
  avgDeltaAfterPrevMs: number | null;
  byEventName: Record<string, number>;
  byEventNameDetail: Record<string, ProductMicroEventNameBreakdown>;
  /**
   * Mean count of each event name per `shopping_sequence` row, among sequences where
   * at least one product micro-event falls in that sequence’s time window (same `session_key`).
   */
  avgPerShoppingSequenceByEventName: Record<string, number>;
  /** Distinct shopping sequences that received ≥1 matched micro-event for this product. */
  shoppingSequencesMatched: number;
};

export type ProductMicroDetailResponse = {
  productLocalId: number;
  stats: ProductMicroDetailStats;
  events: SalesMicroEventAdminRow[];
};
