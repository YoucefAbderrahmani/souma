import type { SalesMicroEventAdminRow } from "@/types/sales-micro-analytics";

export type ProductMicroAggregateRow = {
  productLocalId: number;
  productTitle: string | null;
  eventCount: number;
  sessionCount: number;
  firstEventAt: string;
  lastEventAt: string;
};

/** Per `event_name` within a single shopping-sequence product-phase slice. */
export type ProductMicroEventNameBreakdown = {
  count: number;
  avgPayloadDurationMs: number | null;
  avgDeltaAfterPrevMs: number | null;
};

/**
 * All analytics for one `shopping_sequence` product phase (after `product_visited_at` until `ended_at`).
 * No cross-sequence pooling.
 */
export type ProductMicroSequenceSlice = {
  sequenceId: string;
  sessionKey: string;
  triggerType: string;
  triggerLabel: string;
  status: string;
  startedAt: string;
  productVisitedAt: string | null;
  endedAt: string | null;
  eventCount: number;
  /** Pooled payload durations within this sequence slice only. */
  avgPayloadDurationMs: number | null;
  /** Pooled Δ-after-previous within this slice (deltas recomputed along this sequence’s timeline). */
  avgDeltaAfterPrevMs: number | null;
  byEventName: Record<string, number>;
  byEventNameDetail: Record<string, ProductMicroEventNameBreakdown>;
  events: SalesMicroEventAdminRow[];
};

export type ProductMicroDetailResponse = {
  productLocalId: number;
  /** One entry per shopping funnel row that has `product_visited_at` for a session that emitted events (newest first). */
  sequences: ProductMicroSequenceSlice[];
};
