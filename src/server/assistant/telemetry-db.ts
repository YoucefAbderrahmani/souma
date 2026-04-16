import { db } from "@/server/db";
import { assistantSearchTelemetryTable } from "@/server/db/schema";

type SearchTelemetryInput = {
  requestId: string;
  sessionKey?: string | null;
  userId?: string | null;
  mode: "detail" | "jomla";
  rawQuery?: string;
  normalizedQuery?: string;
  detectedLanguage?: string;
  provider?: string;
  model?: string;
  error?: string;
  cacheStatus?: "hit" | "miss";
  resultCount: number;
  matchedIds?: number[];
};

type ClickTelemetryInput = {
  requestId: string;
  sessionKey?: string | null;
  userId?: string | null;
  mode: "detail" | "jomla";
  rawQuery?: string;
  normalizedQuery?: string;
  clickedProductId: number;
  clickedPosition: number;
};

function safeSlice(value: string | undefined, max = 500) {
  return (value ?? "").trim().slice(0, max);
}

export async function logAssistantSearchTelemetry(input: SearchTelemetryInput) {
  await db.insert(assistantSearchTelemetryTable).values({
    eventType: "search_query",
    requestId: safeSlice(input.requestId, 64),
    sessionKey: safeSlice(input.sessionKey ?? undefined, 64) || null,
    userId: safeSlice(input.userId ?? undefined, 255) || null,
    mode: input.mode,
    rawQuery: safeSlice(input.rawQuery, 4000) || null,
    normalizedQuery: safeSlice(input.normalizedQuery, 4000) || null,
    detectedLanguage: safeSlice(input.detectedLanguage, 64) || null,
    provider: safeSlice(input.provider, 64) || null,
    model: safeSlice(input.model, 128) || null,
    error: safeSlice(input.error, 500) || null,
    cacheStatus: input.cacheStatus ?? null,
    resultCount: Math.max(0, Math.min(100, Math.round(input.resultCount || 0))),
    matchedIdsJson: JSON.stringify(Array.isArray(input.matchedIds) ? input.matchedIds.slice(0, 20) : []),
  });
}

export async function logAssistantClickTelemetry(input: ClickTelemetryInput) {
  await db.insert(assistantSearchTelemetryTable).values({
    eventType: "result_click",
    requestId: safeSlice(input.requestId, 64),
    sessionKey: safeSlice(input.sessionKey ?? undefined, 64) || null,
    userId: safeSlice(input.userId ?? undefined, 255) || null,
    mode: input.mode,
    rawQuery: safeSlice(input.rawQuery, 4000) || null,
    normalizedQuery: safeSlice(input.normalizedQuery, 4000) || null,
    resultCount: 0,
    clickedProductId: Math.max(0, Math.round(input.clickedProductId)),
    clickedPosition: Math.max(0, Math.round(input.clickedPosition)),
    matchedIdsJson: "[]",
  });
}
