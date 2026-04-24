import type { SalesMicroEventAdminRow, SalesMicroSessionAdmin } from "@/types/sales-micro-analytics";
import { salesMicroEventCategory } from "@/lib/sales-micro-event-category";
import { extractPayloadDurationMs } from "@/lib/sales-micro-payload-duration";

/** Subset of sessions whose events match category + free-text query; session stats recomputed for the visible slice. */
export function filterSessionsForTable(
  sessions: SalesMicroSessionAdmin[],
  category: string,
  query: string
): SalesMicroSessionAdmin[] {
  const needle = query.trim().toLowerCase();
  const out: SalesMicroSessionAdmin[] = [];

  for (const s of sessions) {
    const events = s.events.filter((ev) => {
      if (category && salesMicroEventCategory(ev.eventName) !== category) return false;
      if (!needle) return true;
      const hay = `${s.sessionKey} ${ev.eventName} ${ev.productTitle ?? ""} ${ev.pagePath}`.toLowerCase();
      return hay.includes(needle);
    });
    if (events.length === 0) continue;

    const first = events[0];
    const last = events[events.length - 1];
    const t0 = new Date(first.clientEventAt ?? first.createdAt).getTime();
    const t1 = new Date(last.clientEventAt ?? last.createdAt).getTime();

    out.push({
      ...s,
      events,
      eventCount: events.length,
      firstEventAt: first.clientEventAt ?? first.createdAt,
      lastEventAt: last.clientEventAt ?? last.createdAt,
      sessionDurationMs: Math.round(Math.max(0, t1 - t0)),
    });
  }
  return out;
}

export const SALES_MICRO_SCHEMA_VERSION = "souma_sales_micro_v1" as const;

/** One flat record per event — stable keys for LLMs / notebooks / ETL. */
export type SalesMicroModelRow = {
  schema_version: typeof SALES_MICRO_SCHEMA_VERSION;
  session_key: string;
  session_rank: number;
  event_rank_in_session: number;
  session_first_at: string;
  session_last_at: string;
  session_wall_ms: number;
  session_event_count: number;
  user_id: string | null;
  client_event_at: string | null;
  server_ingest_at: string;
  delta_after_prev_ms: number | null;
  ms_since_session_start: number;
  duration_ms: number | null;
  category: string;
  event_name: string;
  sequence_index: number;
  product_local_id: number | null;
  product_title: string | null;
  page_path: string;
  referrer: string | null;
  payload_json: string;
  /** Sorted `key=value` pairs for tabular models / CSV-friendly view. */
  payload_flat: string;
};

function flattenPayload(payload: Record<string, unknown> | null): string {
  if (!payload || Object.keys(payload).length === 0) return "";
  return Object.keys(payload)
    .sort()
    .map((k) => {
      const v = payload[k];
      const s =
        v !== null && typeof v === "object" ? JSON.stringify(v) : String(v ?? "");
      return `${k}=${s}`;
    })
    .join("; ");
}

function rowToModelRow(
  session: SalesMicroSessionAdmin,
  ev: SalesMicroEventAdminRow,
  sessionRank: number,
  eventRank: number
): SalesMicroModelRow {
  const duration = extractPayloadDurationMs(ev.eventName, ev.payload);
  let payloadJson = "{}";
  try {
    payloadJson = ev.payload && Object.keys(ev.payload).length > 0 ? JSON.stringify(ev.payload) : "{}";
  } catch {
    payloadJson = "{}";
  }
  return {
    schema_version: SALES_MICRO_SCHEMA_VERSION,
    session_key: session.sessionKey,
    session_rank: sessionRank,
    event_rank_in_session: eventRank,
    session_first_at: session.firstEventAt,
    session_last_at: session.lastEventAt,
    session_wall_ms: session.sessionDurationMs,
    session_event_count: session.eventCount,
    user_id: session.userId ?? ev.userId ?? null,
    client_event_at: ev.clientEventAt,
    server_ingest_at: ev.createdAt,
    delta_after_prev_ms: ev.deltaMsSincePrevious,
    ms_since_session_start: ev.msSinceSessionStart,
    duration_ms: duration,
    category: salesMicroEventCategory(ev.eventName),
    event_name: ev.eventName,
    sequence_index: ev.sequenceIndex,
    product_local_id: ev.productLocalId,
    product_title: ev.productTitle,
    page_path: ev.pagePath,
    referrer: ev.referrer,
    payload_json: payloadJson,
    payload_flat: flattenPayload(ev.payload),
  };
}

export function sessionsToModelRows(sessions: SalesMicroSessionAdmin[]): SalesMicroModelRow[] {
  const out: SalesMicroModelRow[] = [];
  let sessionRank = 0;
  for (const session of sessions) {
    sessionRank += 1;
    let eventRank = 0;
    for (const ev of session.events) {
      eventRank += 1;
      out.push(rowToModelRow(session, ev, sessionRank, eventRank));
    }
  }
  return out;
}

export function modelRowsToJsonl(rows: SalesMicroModelRow[]): string {
  return rows.map((r) => JSON.stringify(r)).join("\n");
}

export function modelRowsToJsonArray(rows: SalesMicroModelRow[]): string {
  return JSON.stringify(rows, null, 2);
}

const CSV_KEYS: (keyof SalesMicroModelRow)[] = [
  "schema_version",
  "session_key",
  "session_rank",
  "event_rank_in_session",
  "session_first_at",
  "session_last_at",
  "session_wall_ms",
  "session_event_count",
  "user_id",
  "client_event_at",
  "server_ingest_at",
  "delta_after_prev_ms",
  "ms_since_session_start",
  "duration_ms",
  "category",
  "event_name",
  "sequence_index",
  "product_local_id",
  "product_title",
  "page_path",
  "referrer",
  "payload_flat",
  "payload_json",
];

function csvEscape(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function modelRowsToCsv(rows: SalesMicroModelRow[]): string {
  const header = CSV_KEYS.join(",");
  const lines = rows.map((r) => CSV_KEYS.map((k) => csvEscape(r[k])).join(","));
  return [header, ...lines].join("\n");
}
