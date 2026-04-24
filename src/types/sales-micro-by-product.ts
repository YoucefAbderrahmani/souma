import type { SalesMicroEventAdminRow } from "@/types/sales-micro-analytics";

export type ProductMicroAggregateRow = {
  productLocalId: number;
  productTitle: string | null;
  eventCount: number;
  sessionCount: number;
  firstEventAt: string;
  lastEventAt: string;
};

export type ProductMicroDetailStats = {
  avgPayloadDurationMs: number | null;
  avgDeltaAfterPrevMs: number | null;
  byEventName: Record<string, number>;
};

export type ProductMicroDetailResponse = {
  productLocalId: number;
  stats: ProductMicroDetailStats;
  events: SalesMicroEventAdminRow[];
};
