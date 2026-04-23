export type SalesMicroEventAdminRow = {
  id: string;
  sessionKey: string;
  userId: string | null;
  productLocalId: number | null;
  productTitle: string | null;
  pagePath: string;
  referrer: string | null;
  eventName: string;
  payload: Record<string, unknown> | null;
  clientEventAt: string | null;
  createdAt: string;
  sequenceIndex: number;
  /** Milliseconds since the previous event in this session (same ordering as table). */
  deltaMsSincePrevious: number | null;
  /** Milliseconds since the first event in this session. */
  msSinceSessionStart: number;
};

export type SalesMicroSessionAdmin = {
  sessionKey: string;
  userId: string | null;
  firstEventAt: string;
  lastEventAt: string;
  eventCount: number;
  /** Session wall duration (last − first) using client time when present. */
  sessionDurationMs: number;
  events: SalesMicroEventAdminRow[];
};
