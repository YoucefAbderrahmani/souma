import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import shopData from "@/components/Shop/shopData";
import path from "path";
import { transliterate } from "transliteration";
import { auth } from "@/server/lib/auth";
import { resolveSequenceKeyMaybe } from "@/app/api/sequence/_cookie";
import { logAssistantSearchTelemetry } from "@/server/assistant/telemetry-db";

type AssistantRequest = {
  query: string;
  mode: "detail" | "jomla";
  contextProduct?: {
    title?: string;
    availability?: string;
    category?: string;
  };
};

type LlmMatch = {
  id: number;
  score: number;
  reason: string;
};

type LlmResult = {
  matches: LlmMatch[];
  summary: string;
  clarification?: string;
};

type LlmQueryResult = {
  result: LlmResult | null;
  error?: string;
  model?: string;
};

/** Wider than queryWithRetriesAndFallback return so we can assign catalog-fallback rows. */
type LlmWithProvider = LlmQueryResult & { provider?: string };
type QueryNormalizationResult = {
  normalizedQuery: string;
  detectedLanguage?: string;
};

const GEMINI_MODEL = "gemini-2.0-flash";
const FREEFLOW_MODEL = process.env.ASSISTANT_FREEFLOW_MODEL?.trim() || "openrouter/auto";
const CACHE_TTL_MS = 1000 * 60 * 5;

type CacheEntry = {
  result: LlmResult;
  expiresAt: number;
};

const responseCache = new Map<string, CacheEntry>();

function configuredGeminiFallbackModels() {
  const fromEnv = process.env.ASSISTANT_LLM_FALLBACK_MODELS ?? "";
  return fromEnv
    .split(",")
    .map((m) => m.trim())
    .filter((m) => m.length > 0 && m !== GEMINI_MODEL);
}

function configuredFreeflowFallbackModels() {
  const fromEnv = process.env.ASSISTANT_FREEFLOW_FALLBACK_MODELS ?? "";
  return fromEnv
    .split(",")
    .map((m) => m.trim())
    .filter((m) => m.length > 0 && m !== FREEFLOW_MODEL);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cacheKey(query: string, mode: "detail" | "jomla") {
  return `${mode}::${query.trim().toLowerCase()}`;
}

function getCachedResult(query: string, mode: "detail" | "jomla") {
  const key = cacheKey(query, mode);
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    responseCache.delete(key);
    return null;
  }
  return entry.result;
}

function setCachedResult(query: string, mode: "detail" | "jomla", result: LlmResult) {
  responseCache.set(cacheKey(query, mode), {
    result,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

function normalizeArabicScript(text: string) {
  return text
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[ؤئ]/g, "ء")
    .replace(/[\u064B-\u065F]/g, "");
}

function normalizeMultilingualQuery(text: string) {
  const normalizedArabic = normalizeArabicScript(text.toLowerCase())
    .replace(/[\u200E\u200F]/g, " ")
    .replace(/[’']/g, "");
  const arabiziApprox = normalizedArabic
    .replace(/3/g, "a")
    .replace(/7/g, "h")
    .replace(/9/g, "q")
    .replace(/5/g, "kh");
  const transliterated = transliterate(arabiziApprox);

  return `${normalizedArabic} ${transliterated}`.replace(/\s+/g, " ").trim();
}

function tokenize(text: string) {
  return new Set(
    normalizeMultilingualQuery(text)
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean)
  );
}

function normalizedTokens(text: string) {
  return normalizeMultilingualQuery(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/-/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => (t.endsWith("s") && t.length > 3 ? t.slice(0, -1) : t));
}

function jaccard(a: Set<string>, b: Set<string>) {
  let intersection = 0;
  a.forEach((t) => {
    if (b.has(t)) intersection += 1;
  });
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function getSimilarCachedResult(query: string, mode: "detail" | "jomla") {
  const queryTokens = tokenize(query);
  let best: { score: number; result: LlmResult } | null = null;

  for (const [key, entry] of Array.from(responseCache.entries())) {
    if (!key.startsWith(`${mode}::`)) continue;
    if (entry.expiresAt < Date.now()) continue;

    const cachedQuery = key.split("::")[1] ?? "";
    const score = jaccard(queryTokens, tokenize(cachedQuery));
    if (score >= 0.6 && (!best || score > best.score)) {
      best = { score, result: entry.result };
    }
  }

  return best?.result ?? null;
}

function buildCatalog(mode: "detail" | "jomla") {
  return shopData.map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description ?? "",
    category: p.category,
    price: mode === "detail" ? p.detailPrice : p.jomlaPrice,
    detailPrice: p.detailPrice,
    jomlaPrice: p.jomlaPrice,
    image: p.imgs?.previews?.[0] ?? p.imgs?.thumbnails?.[0] ?? "",
    images: Array.from(new Set([...(p.imgs?.previews ?? []), ...(p.imgs?.thumbnails ?? [])])).slice(0, 3),
    visualHints: extractVisualHintsForProduct(p),
  }));
}

const GENERIC_IMAGE_TOKENS = new Set([
  "image",
  "images",
  "product",
  "hero",
  "sm",
  "bg",
  "png",
  "jpg",
  "jpeg",
  "webp",
]);

function extractImageNameTokens(imagePath: string) {
  const filename = path.basename(imagePath).toLowerCase();
  return filename
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[_-]/g, " ")
    .replace(/\d+/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && !GENERIC_IMAGE_TOKENS.has(t));
}

function extractVisualHintsForProduct(product: (typeof shopData)[number]) {
  const imagePaths = [...(product.imgs?.previews ?? []), ...(product.imgs?.thumbnails ?? [])];
  const imageTokens = imagePaths.flatMap(extractImageNameTokens);
  const titleTokens = normalizedTokens(product.title);
  const categoryTokens = normalizedTokens(product.category.replace(/-/g, " "));
  const descriptionTokens = normalizedTokens(product.description ?? "");

  const extraHints: string[] = [];
  if (titleTokens.includes("headset")) extraHints.push("headphone", "audio", "over-ear");
  if (titleTokens.includes("watch")) extraHints.push("wearable", "wrist");
  if (titleTokens.includes("router")) extraHints.push("network", "wifi");
  if (titleTokens.includes("mouse")) extraHints.push("peripheral", "pointing-device");

  return Array.from(new Set([...imageTokens, ...titleTokens, ...categoryTokens, ...descriptionTokens, ...extraHints])).slice(
    0,
    30
  );
}

function retrieveFromCatalog(
  query: string,
  mode: "detail" | "jomla"
): { id: number; score: number; reason: string }[] {
  const queryTokens = normalizedTokens(query);
  if (!queryTokens.length) return [];

  const cheapIntent = /\b(cheap|cheapest|lowest|budget|affordable|under|less)\b/i.test(query);
  const expensiveIntent = /\b(expensive|premium|best|highest|over|more)\b/i.test(query);
  const stop = new Set([
    "the",
    "a",
    "an",
    "for",
    "with",
    "under",
    "over",
    "more",
    "less",
    "than",
    "best",
    "cheapest",
    "cheap",
  ]);

  const importantTokens = queryTokens.filter((t) => !stop.has(t));
  if (!importantTokens.length) return [];

  const visualIntent = /\b(look|looks|style|design|color|shape|photo|image|picture|pictured|shown)\b/i.test(
    query
  );

  const scored = buildCatalog(mode)
    .map((p) => {
      const tokens = new Set(
        normalizedTokens(
          `${p.title} ${p.category} ${p.description ?? ""} ${(p.visualHints ?? []).join(" ")}`
        )
      );
      let overlap = 0;
      for (const t of importantTokens) {
        if (tokens.has(t)) overlap += 1;
      }
      if (overlap === 0) return null;

      const base = Math.min(100, overlap * 40);
      let score = base;
      if (cheapIntent) score += Math.max(0, 20 - p.price / 100);
      if (expensiveIntent) score += Math.min(20, p.price / 100);
      if (visualIntent && p.visualHints?.length) score += 8;
      return {
        id: p.id,
        score: Math.max(1, Math.min(99, Math.round(score))),
        price: p.price,
      };
    })
    .filter((x): x is { id: number; score: number; price: number } => Boolean(x));

  if (cheapIntent) scored.sort((a, b) => a.price - b.price || b.score - a.score);
  else if (expensiveIntent) scored.sort((a, b) => b.price - a.price || b.score - a.score);
  else scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, 8).map((s) => ({
    id: s.id,
    score: s.score,
    reason: "Matched by catalog semantic fallback.",
  }));
}

function buildPrompt(
  query: string,
  mode: "detail" | "jomla",
  retrievalMode: "strict" | "relaxed" = "strict",
  contextProduct?: AssistantRequest["contextProduct"]
) {
  const catalog = buildCatalog(mode);
  const extra =
    retrievalMode === "relaxed"
      ? `\nRelaxed retrieval mode:\n- If strict exact-name match is not found, return the closest semantically relevant products.\n- Understand slug-like categories (example: "laptop-pc" means laptops/computers).\n- For requests like "cheapest X", prioritize lower price among relevant items.\n`
      : "";
  const productContext = contextProduct
    ? `\nCURRENT_PRODUCT_CONTEXT:\n${JSON.stringify({
        title: sanitizeText(contextProduct.title, 160),
        availability: sanitizeText(contextProduct.availability, 60),
        category: sanitizeText(contextProduct.category, 120),
      })}`
    : "";

  return `You are an ecommerce shopping assistant.
Given USER_QUERY and CATALOG, return strict JSON only.

Rules:
- Use semantic understanding (type, intent, use-case, style, budget, exclusions, colors, brands).
- Use visualHints and image filenames as extra visual cues (shape/style/device form), not only title.
- Handle typos naturally.
- If USER_QUERY is a direct question (e.g. availability, fit, compatibility), answer it clearly in summary even when matches are empty.
- If CURRENT_PRODUCT_CONTEXT is provided and the question is about current item availability, use it directly in summary.
- Only return products that truly match.
- If nothing matches, return empty matches.
- score must be 0..100.
- max 8 matches, sorted by score desc.
${extra}

JSON schema:
{
  "summary": string,
  "clarification": string | null,
  "matches": [
    { "id": number, "score": number, "reason": string }
  ]
}

USER_QUERY:
${query}
${productContext}

CATALOG:
${JSON.stringify(catalog)}`;
}

function parseLlmJson(raw: string): LlmResult | null {
  try {
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    const jsonText =
      firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace
        ? cleaned.slice(firstBrace, lastBrace + 1)
        : cleaned;

    const parsed = JSON.parse(jsonText) as Partial<LlmResult>;
    const matches = Array.isArray(parsed.matches)
      ? parsed.matches
          .filter((m): m is LlmMatch => typeof m?.id === "number")
          .map((m) => ({
            id: m.id,
            score:
              typeof m.score === "number" ? Math.max(0, Math.min(100, m.score)) : 0,
            reason: typeof m.reason === "string" ? m.reason : "",
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 8)
      : [];

    return {
      matches,
      summary:
        typeof parsed.summary === "string"
          ? parsed.summary
          : "Here are the best matches I found.",
      clarification:
        typeof parsed.clarification === "string" ? parsed.clarification : undefined,
    };
  } catch {
    return null;
  }
}

function parseNormalizationJson(raw: string): QueryNormalizationResult | null {
  try {
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    const jsonText =
      firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace
        ? cleaned.slice(firstBrace, lastBrace + 1)
        : cleaned;
    const parsed = JSON.parse(jsonText) as Partial<QueryNormalizationResult>;
    if (typeof parsed.normalizedQuery !== "string" || !parsed.normalizedQuery.trim()) {
      return null;
    }
    return {
      normalizedQuery: parsed.normalizedQuery.trim(),
      detectedLanguage:
        typeof parsed.detectedLanguage === "string" ? parsed.detectedLanguage : undefined,
    };
  } catch {
    return null;
  }
}

async function queryGemini(
  apiKey: string,
  query: string,
  mode: "detail" | "jomla",
  modelName: string,
  retrievalMode: "strict" | "relaxed" = "strict",
  contextProduct?: AssistantRequest["contextProduct"]
): Promise<LlmQueryResult> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: buildPrompt(query, mode, retrievalMode, contextProduct) }],
          },
        ],
        generationConfig: {
          temperature: 0.15,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!response.ok) {
    if (response.status === 429) return { result: null, error: "rate_limited", model: modelName };
    return { result: null, error: `http_${response.status}`, model: modelName };
  }

  const data = await response.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text as string | undefined;
  if (!raw) return { result: null, error: "empty_response", model: modelName };

  const parsed = parseLlmJson(raw);
  if (!parsed) return { result: null, error: "json_parse_failed", model: modelName };

  return { result: parsed, model: modelName };
}

async function queryOpenRouter(
  apiKey: string,
  query: string,
  mode: "detail" | "jomla",
  modelName: string,
  retrievalMode: "strict" | "relaxed" = "strict",
  contextProduct?: AssistantRequest["contextProduct"]
): Promise<LlmQueryResult> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelName,
      temperature: 0.15,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: buildPrompt(query, mode, retrievalMode, contextProduct) }],
    }),
  });

  if (!response.ok) {
    if (response.status === 429) return { result: null, error: "rate_limited", model: modelName };
    return { result: null, error: `http_${response.status}`, model: modelName };
  }

  const data = await response.json();
  const raw = data?.choices?.[0]?.message?.content as string | undefined;
  if (!raw) return { result: null, error: "empty_response", model: modelName };

  const parsed = parseLlmJson(raw);
  if (!parsed) return { result: null, error: "json_parse_failed", model: modelName };

  return { result: parsed, model: modelName };
}

async function queryWithRetriesAndFallback(
  googleApiKey: string | undefined,
  openRouterApiKey: string | undefined,
  query: string,
  mode: "detail" | "jomla",
  retrievalMode: "strict" | "relaxed" = "strict",
  contextProduct?: AssistantRequest["contextProduct"]
) {
  let lastError = "no_provider_key";
  let usedProvider: "gemini" | "openrouter" = "openrouter";
  let usedModel = FREEFLOW_MODEL;

  // Freeflow via OpenRouter is primary; Gemini is fallback.
  if (openRouterApiKey) {
    const models = [FREEFLOW_MODEL, ...configuredFreeflowFallbackModels()];
    for (const model of models) {
      usedProvider = "openrouter";
      usedModel = model;
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        const res = await queryOpenRouter(
          openRouterApiKey,
          query,
          mode,
          model,
          retrievalMode,
          contextProduct
        );
        if (res.result) return { ...res, provider: usedProvider };

        lastError = res.error ?? "llm_failed";
        const retryable =
          lastError === "rate_limited" ||
          lastError.startsWith("http_5") ||
          lastError === "empty_response" ||
          lastError === "json_parse_failed";
        if (!retryable || attempt === 3) break;
        await sleep(250 * 2 ** (attempt - 1));
      }
    }
  }

  if (googleApiKey) {
    const models = [GEMINI_MODEL, ...configuredGeminiFallbackModels()];
    for (const model of models) {
      usedProvider = "gemini";
      usedModel = model;
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        const res = await queryGemini(
          googleApiKey,
          query,
          mode,
          model,
          retrievalMode,
          contextProduct
        );
        if (res.result) return { ...res, provider: usedProvider };

        lastError = res.error ?? "llm_failed";
        const retryable =
          lastError === "rate_limited" ||
          lastError.startsWith("http_5") ||
          lastError === "empty_response" ||
          lastError === "json_parse_failed";
        if (!retryable || attempt === 3) break;
        await sleep(250 * 2 ** (attempt - 1));
      }
    }
  }

  return {
    result: null,
    error: lastError,
    model: usedModel,
    provider: usedProvider,
  };
}

async function normalizeQueryWithLlm(
  googleApiKey: string | undefined,
  openRouterApiKey: string | undefined,
  query: string
) {
  const preNormalized = normalizeMultilingualQuery(query);
  const prompt = `Detect the language of USER_QUERY and rewrite it into concise English ecommerce intent.
Support Algerian Darija written in Arabic script and Arabizi (Latin + numbers like 3, 5, 7, 9).
Preserve exact constraints: price limits, quantity, exclusions, colors, brands, usage.
If USER_QUERY is mixed language (Arabic/French/English), keep the intent faithful and unambiguous.
Return strict JSON only:
{
  "normalizedQuery": string,
  "detectedLanguage": string
}

USER_QUERY:
${preNormalized}

Original raw query:
${query}`;

  // Use Freeflow first for normalization to keep one primary provider.
  if (openRouterApiKey) {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openRouterApiKey}`,
      },
      body: JSON.stringify({
        model: FREEFLOW_MODEL,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (res.ok) {
      const data = await res.json();
      const raw = data?.choices?.[0]?.message?.content as string | undefined;
      if (raw) {
        const parsed = parseNormalizationJson(raw);
        if (parsed) return parsed;
      }
    }
  }

  if (googleApiKey) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${googleApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0,
            responseMimeType: "application/json",
          },
        }),
      }
    );
    if (res.ok) {
      const data = await res.json();
      const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text as string | undefined;
      if (raw) {
        const parsed = parseNormalizationJson(raw);
        if (parsed) return parsed;
      }
    }
  }

  return { normalizedQuery: preNormalized || query, detectedLanguage: "unknown" };
}

async function logSearchTelemetrySafely(input: {
  requestId: string;
  sessionKey: string | null;
  userId: string | null;
  mode: "detail" | "jomla";
  rawQuery: string;
  normalizedQuery: string;
  detectedLanguage: string;
  provider?: string;
  model?: string;
  error?: string;
  cacheStatus: "hit" | "miss";
  resultCount: number;
  matchedIds?: number[];
}) {
  try {
    await logAssistantSearchTelemetry(input);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown_error";
    console.warn("[assistant-telemetry] failed to write telemetry row:", reason);
  }
}

export async function POST(req: NextRequest) {
  const requestId = randomUUID();
  const sessionKey = resolveSequenceKeyMaybe(req);
  let userId: string | null = null;
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    userId = session?.user?.id ?? null;
  } catch {
    userId = null;
  }

  try {
    const body = (await req.json()) as AssistantRequest;
    const query = body.query?.trim();
    const mode = body.mode === "jomla" ? "jomla" : "detail";
    const contextProduct = body.contextProduct;

    if (!query) {
      return NextResponse.json({
        message: "Please type what you need.",
        products: [],
        requestId,
        debug: { source: "llm-only", model: FREEFLOW_MODEL, requestId },
      });
    }

    const googleApiKey = process.env.GOOGLE_API_KEY;
    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    const localNormalizedQuery = normalizeMultilingualQuery(query) || query;

    if (!googleApiKey && !openRouterApiKey) {
      await logSearchTelemetrySafely({
        requestId,
        sessionKey,
        userId,
        mode,
        rawQuery: query,
        normalizedQuery: localNormalizedQuery,
        detectedLanguage: "unknown",
        provider: "none",
        model: FREEFLOW_MODEL,
        error: "missing_provider_key",
        cacheStatus: "miss",
        resultCount: 0,
        matchedIds: [],
      });

      return NextResponse.json({
        message:
          "Assistant is in LLM-only mode but no provider key is set (GOOGLE_API_KEY or OPENROUTER_API_KEY).",
        products: [],
        normalizedQuery: localNormalizedQuery,
        requestId,
        debug: {
          source: "llm-only",
          model: FREEFLOW_MODEL,
          error: "missing_provider_key",
          requestId,
        },
      });
    }

    const productById = new Map(shopData.map((p) => [p.id, p]));
    const normalized = await normalizeQueryWithLlm(googleApiKey, openRouterApiKey, query);
    const effectiveQuery = normalized.normalizedQuery || localNormalizedQuery || query;
    const detectedLanguage = normalized.detectedLanguage ?? "unknown";

    const cached = getCachedResult(effectiveQuery, mode);
    if (cached) {
      const products = cached.matches
        .map((m) => productById.get(m.id))
        .filter((p): p is (typeof shopData)[number] => Boolean(p));
      const matchedIds = cached.matches.map((m) => m.id);

      await logSearchTelemetrySafely({
        requestId,
        sessionKey,
        userId,
        mode,
        rawQuery: query,
        normalizedQuery: effectiveQuery,
        detectedLanguage,
        provider: "cache",
        model: "cached",
        cacheStatus: "hit",
        resultCount: products.length,
        matchedIds,
      });

      return NextResponse.json({
        message:
          cached.summary ||
          (products.length > 0
            ? `I found ${products.length} matching products.`
            : "No related items found in store for this request."),
        products,
        explanation: cached.matches,
        clarification: cached.clarification,
        normalizedQuery: effectiveQuery,
        requestId,
        debug: {
          source: "llm-only",
          provider: "cache",
          model: "cached",
          matchedIds,
          finalCount: products.length,
          cache: "hit",
          detectedLanguage,
          requestId,
        },
      });
    }

    let llm: LlmWithProvider = await queryWithRetriesAndFallback(
      googleApiKey,
      openRouterApiKey,
      effectiveQuery,
      mode,
      "strict",
      contextProduct
    );

    if (!llm.result) {
      const similarCached = getSimilarCachedResult(effectiveQuery, mode);
      if (similarCached) {
        const products = similarCached.matches
          .map((m) => productById.get(m.id))
          .filter((p): p is (typeof shopData)[number] => Boolean(p));
        const matchedIds = similarCached.matches.map((m) => m.id);

        await logSearchTelemetrySafely({
          requestId,
          sessionKey,
          userId,
          mode,
          rawQuery: query,
          normalizedQuery: effectiveQuery,
          detectedLanguage,
          provider: "cache",
          model: "similar-cached",
          error: llm.error ?? "llm_failed",
          cacheStatus: "hit",
          resultCount: products.length,
          matchedIds,
        });

        return NextResponse.json({
          message:
            similarCached.summary ||
            (products.length > 0
              ? `I found ${products.length} matching products.`
              : "No related items found in store for this request."),
          products,
          explanation: similarCached.matches,
          clarification: similarCached.clarification,
          normalizedQuery: effectiveQuery,
          requestId,
          debug: {
            source: "llm-only",
            provider: "cache",
            model: "similar-cached",
            error: llm.error ?? "llm_failed",
            finalCount: products.length,
            cache: "hit",
            detectedLanguage,
            requestId,
          },
        });
      }

      await logSearchTelemetrySafely({
        requestId,
        sessionKey,
        userId,
        mode,
        rawQuery: query,
        normalizedQuery: effectiveQuery,
        detectedLanguage,
        provider: llm.provider ?? "unknown",
        model: llm.model ?? FREEFLOW_MODEL,
        error: llm.error ?? "llm_failed",
        cacheStatus: "miss",
        resultCount: 0,
        matchedIds: [],
      });

      return NextResponse.json({
        message:
          llm.error === "rate_limited"
            ? "All configured LLM providers are rate-limited right now. Try again in a minute."
            : "LLM request failed. Please rephrase or retry.",
        products: [],
        normalizedQuery: effectiveQuery,
        requestId,
        debug: {
          source: "llm-only",
          provider: llm.provider ?? "unknown",
          model: llm.model ?? FREEFLOW_MODEL,
          error: llm.error ?? "llm_failed",
          finalCount: 0,
          cache: "miss",
          detectedLanguage,
          requestId,
        },
      });
    }

    if (llm.result.matches.length === 0) {
      const relaxed = await queryWithRetriesAndFallback(
        googleApiKey,
        openRouterApiKey,
        effectiveQuery,
        mode,
        "relaxed",
        contextProduct
      );
      if (relaxed.result) {
        llm = relaxed;
      }
    }

    if (llm.result.matches.length === 0) {
      const fallbackMatches = retrieveFromCatalog(effectiveQuery, mode);
      if (fallbackMatches.length > 0) {
        llm = {
          result: {
            matches: fallbackMatches,
            summary: `I found ${fallbackMatches.length} catalog matches for your request.`,
          },
          provider: "catalog-fallback",
          model: "semantic-retrieval",
        };
      }
    }

    const products = llm.result.matches
      .map((m) => productById.get(m.id))
      .filter((p): p is (typeof shopData)[number] => Boolean(p));
    const matchedIds = llm.result.matches.map((m) => m.id);
    setCachedResult(effectiveQuery, mode, llm.result);

    await logSearchTelemetrySafely({
      requestId,
      sessionKey,
      userId,
      mode,
      rawQuery: query,
      normalizedQuery: effectiveQuery,
      detectedLanguage,
      provider: llm.provider ?? "unknown",
      model: llm.model ?? FREEFLOW_MODEL,
      cacheStatus: "miss",
      resultCount: products.length,
      matchedIds,
    });

    return NextResponse.json({
      message:
        llm.result.summary ||
        (products.length > 0
          ? `I found ${products.length} matching products.`
          : "No related items found in store for this request."),
      products,
      explanation: llm.result.matches,
      clarification: llm.result.clarification,
      normalizedQuery: effectiveQuery,
      requestId,
      debug: {
        source: "llm-only",
        provider: llm.provider ?? "unknown",
        model: llm.model ?? FREEFLOW_MODEL,
        matchedIds,
        finalCount: products.length,
        cache: "miss",
        detectedLanguage,
        requestId,
      },
    });
  } catch {
    return NextResponse.json(
      {
        message: "Assistant temporarily unavailable. Please try again.",
        products: [],
        requestId,
        debug: {
          source: "llm-only",
          provider: "unknown",
          model: FREEFLOW_MODEL,
          error: "server_exception",
          finalCount: 0,
          requestId,
        },
      },
      { status: 200 }
    );
  }
}

