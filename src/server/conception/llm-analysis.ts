import { z } from "zod";
import { buildConceptionAnalyzeSignals, buildConceptionOverview } from "@/server/conception/metrics";
import { buildCatalogSnapshotForConceptionLlm } from "@/server/conception/llm-catalog-snapshot";
import { extractJsonObject } from "@/lib/llm-json";
import {
  getOpenRouterApiKey,
  parseOpenRouterJsonResponse,
  requestOpenRouterChatCompletion,
} from "@/server/lib/openrouter-client";
import type { conceptionAlertTable, conceptionRecommendationTable } from "@/server/db/schema";

const severitySchema = z.enum(["critical", "high", "medium", "low"]);
const prioritySchema = z.enum(["critical", "high", "medium", "low"]);

const llmAnalysisSchema = z.object({
  summary: z.string().min(1),
  alerts: z
    .array(
      z.object({
        alertType: z.string().min(1).max(48),
        severity: severitySchema,
        title: z.string().min(1).max(200),
        description: z.string().min(1),
        detail: z.string().optional(),
        affectedSessionsEstimate: z.number().int().nonnegative().nullable().optional(),
      })
    )
    .max(6),
  recommendations: z
    .array(
      z.object({
        priority: prioritySchema,
        impactLabel: z.string().min(1).max(80),
        title: z.string().min(1).max(200),
        analysis: z.string().min(1),
        recommendation: z.string().min(1),
        confidence: z.number().int().min(0).max(100),
        revenueHint: z.string().max(64).optional(),
        implementationHint: z.string().max(64).optional(),
        roiHint: z.string().max(32).optional(),
      })
    )
    .max(8),
});

export type ConceptionLlmAnalysisResult = {
  summary: string;
  alerts: (typeof conceptionAlertTable.$inferInsert)[];
  recommendations: (typeof conceptionRecommendationTable.$inferInsert)[];
  model: string;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

/** One row per title per UTC hour so repeated Analyze runs can persist new LLM rows. */
function utcHourFingerprint(prefix: string, title: string) {
  const d = new Date();
  const day = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  const hour = String(d.getUTCHours()).padStart(2, "0");
  return `${prefix}-${slugify(title) || "item"}-${day}h${hour}`;
}

const GEMINI_MODEL = "gemini-2.0-flash";

function getGoogleApiKey() {
  return process.env.GOOGLE_API_KEY?.trim() || "";
}

function conceptionOpenRouterModel() {
  return (
    process.env.CONCEPTION_OPENROUTER_MODEL?.trim() ||
    process.env.ASSISTANT_FREEFLOW_MODEL?.trim() ||
    "google/gemini-2.0-flash-001"
  );
}

function conceptionGeminiModel() {
  return process.env.CONCEPTION_GEMINI_MODEL?.trim() || GEMINI_MODEL;
}

async function buildConceptionLlmContext() {
  const [overview, signals, catalogProducts] = await Promise.all([
    buildConceptionOverview(),
    buildConceptionAnalyzeSignals(),
    buildCatalogSnapshotForConceptionLlm(28),
  ]);

  return {
    computedAt: overview.computedAt,
    hasEventData: overview.hasEventData,
    totalEvents7d: overview.totalEvents7d,
    activeVisitors15m: overview.activeVisitors15m,
    kpis: overview.kpis.slice(0, 6),
    funnelSteps: overview.funnelSteps,
    funnelSummary: overview.funnelSummary,
    frictionItems: overview.frictionItems.slice(0, 4),
    topPages: overview.topPages.slice(0, 6),
    devices: overview.devices,
    security: overview.security,
    signals,
    catalogProducts,
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetryProvider(status: number) {
  return status === 429 || status >= 500;
}

function extractHttpStatus(message: string) {
  const match = message.match(/\((\d{3})\)/);
  return match ? Number(match[1]) : null;
}

function shouldFallbackToGemini(openRouterError: string | null) {
  if (!openRouterError) return false;
  if (process.env.CONCEPTION_LLM_GEMINI_FALLBACK === "false") return false;
  if (process.env.CONCEPTION_LLM_GEMINI_FALLBACK === "true") return true;
  return /\(402\)|insufficient credits/i.test(openRouterError);
}

function formatProviderFailure(label: string, message: string) {
  return `${label} : ${message.slice(0, 280)}`;
}

function buildSystemPrompt() {
  return `You are a senior ecommerce analytics consultant for Vitrina Store.
Analyze only the JSON provided by the user. It merges (1) live telemetry from the database (events, funnel, KPIs, signals) and (2) catalogProducts: real products currently in the catalogue (titles, categories, prices in DZD, stock levels). Use both sources together.
Return one JSON object only with exactly these top-level keys: summary, alerts, recommendations.
summary must be a plain French string, never an object.
alerts must be an array. recommendations must be an array.
severity must be exactly one of: critical, high, medium, low.
priority must be exactly one of: critical, high, medium, low.
confidence must be an integer from 0 to 100.
Write summary, titles, descriptions, analysis, and recommendation fields in French.
Do not invent metrics or products that are absent from the payload. When you cite a product, use a title that appears in catalogProducts or a metric that appears in telemetry.
Prefer actionable merchandising, pricing, stock, conversion, checkout, performance, and security insights grounded in the supplied numbers.
Each alert must include alertType (short snake_case code), severity, title, description, optional detail, optional affectedSessionsEstimate.
Each recommendation must include priority, impactLabel, title, analysis, recommendation, confidence, and optional revenueHint, implementationHint, roiHint.
If event data is sparse, produce cautious recommendations and lower confidence instead of fabricating incidents.`;
}

function buildUserPrompt(context: Awaited<ReturnType<typeof buildConceptionLlmContext>>) {
  return `Analyze this Seller Helper telemetry snapshot and return JSON only.

${JSON.stringify(context)}`;
}

function mapLlmOutput(
  parsed: z.infer<typeof llmAnalysisSchema>,
  context: Awaited<ReturnType<typeof buildConceptionLlmContext>>,
  source: "openrouter" | "gemini",
  model: string
): ConceptionLlmAnalysisResult {
  const alerts = parsed.alerts.map((alert) => ({
    alertType: alert.alertType.slice(0, 48),
    severity: alert.severity,
    title: alert.title.slice(0, 200),
    description: alert.description,
    detail: alert.detail ?? null,
    affectedSessionsEstimate: alert.affectedSessionsEstimate ?? null,
    metadataJson: JSON.stringify({ source, alertType: alert.alertType }),
    fingerprint: utcHourFingerprint("LLM-ALERT", alert.title),
  }));

  const recommendations = parsed.recommendations.map((recommendation) => ({
    priority: recommendation.priority,
    impactLabel: recommendation.impactLabel.slice(0, 80),
    title: recommendation.title.slice(0, 200),
    analysis: recommendation.analysis,
    recommendation: recommendation.recommendation,
    confidence: recommendation.confidence,
    revenueHint: recommendation.revenueHint ?? null,
    implementationHint: recommendation.implementationHint ?? null,
    roiHint: recommendation.roiHint ?? null,
    evidenceJson: JSON.stringify({
      source,
      computedAt: context.computedAt,
      hasEventData: context.hasEventData,
      catalogProductCount: context.catalogProducts.length,
    }),
    fingerprint: utcHourFingerprint("LLM-REC", recommendation.title),
  }));

  return {
    summary: parsed.summary.trim(),
    alerts,
    recommendations,
    model,
  };
}

function asString(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["text", "fr", "summary", "value", "message", "content"]) {
      const candidate = record[key];
      if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
    }
    return JSON.stringify(value);
  }
  return "";
}

function asNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(",", "."));
    if (Number.isFinite(parsed)) return Math.round(parsed);
  }
  return fallback;
}

function limitText(value: string, max: number) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

function normalizeSeverity(value: unknown): z.infer<typeof severitySchema> {
  const raw = asString(value).toLowerCase();
  if (severitySchema.safeParse(raw).success) return raw as z.infer<typeof severitySchema>;
  if (/crit/.test(raw)) return "critical";
  if (/(haute|high|eleve|élev)/.test(raw)) return "high";
  if (/(moy|medium|med)/.test(raw)) return "medium";
  return "low";
}

function normalizePriority(value: unknown): z.infer<typeof prioritySchema> {
  const raw = asString(value).toLowerCase();
  if (prioritySchema.safeParse(raw).success) return raw as z.infer<typeof prioritySchema>;
  if (/crit/.test(raw)) return "critical";
  if (/(haute|high|eleve|élev)/.test(raw)) return "high";
  if (/(moy|medium|med)/.test(raw)) return "medium";
  return "low";
}

function normalizeAlertType(value: unknown, title: string) {
  const raw = asString(value);
  if (raw) return raw.slice(0, 48);
  return slugify(title).slice(0, 48) || "llm_alert";
}

function normalizeAnalysisPayload(raw: unknown) {
  const root = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const alertsRaw = Array.isArray(root.alerts) ? root.alerts : Array.isArray(root.alertes) ? root.alertes : [];
  const recommendationsRaw =
    Array.isArray(root.recommendations) ? root.recommendations
    : Array.isArray(root.recommandations) ? root.recommandations
    : [];

  const summary =
    asString(root.summary) || asString(root.synthese) || asString(root.overview) || "Generated store analysis.";

  const alerts = alertsRaw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const alert = item as Record<string, unknown>;
      const title = asString(alert.title) || asString(alert.name);
      const description = asString(alert.description) || asString(alert.body);
      if (!title || !description) return null;
      return {
        alertType: normalizeAlertType(alert.alertType ?? alert.type ?? alert.code, title),
        severity: normalizeSeverity(alert.severity ?? alert.level ?? alert.priority),
        title: title.slice(0, 200),
        description,
        detail: asString(alert.detail) || undefined,
        affectedSessionsEstimate:
          alert.affectedSessionsEstimate == null ? undefined : (
            asNumber(alert.affectedSessionsEstimate, 0)
          ),
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .slice(0, 6);

  const recommendations = recommendationsRaw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const recommendation = item as Record<string, unknown>;
      const title = asString(recommendation.title) || asString(recommendation.name);
      const analysis = asString(recommendation.analysis) || asString(recommendation.analyse);
      const action = asString(recommendation.recommendation) || asString(recommendation.action);
      if (!title || !analysis || !action) return null;
      return {
        priority: normalizePriority(recommendation.priority ?? recommendation.level),
        impactLabel: (asString(recommendation.impactLabel) || asString(recommendation.impact) || "Estimated impact").slice(
          0,
          80
        ),
        title: title.slice(0, 200),
        analysis,
        recommendation: action,
        confidence: Math.max(0, Math.min(100, asNumber(recommendation.confidence, 70))),
        revenueHint: limitText(asString(recommendation.revenueHint), 64),
        implementationHint: limitText(asString(recommendation.implementationHint), 64),
        roiHint: limitText(asString(recommendation.roiHint), 32),
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .slice(0, 8);

  return { summary, alerts, recommendations };
}

function parseAnalysisJson(raw: string) {
  const parsed = JSON.parse(extractJsonObject(raw)) as unknown;
  const normalized = normalizeAnalysisPayload(parsed);
  const result = llmAnalysisSchema.safeParse(normalized);
  if (!result.success) {
    const issues = result.error.issues
      .slice(0, 3)
      .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
      .join(" | ");
    throw new Error(`Invalid LLM analysis payload (${issues})`);
  }
  return result.data;
}

async function requestGeminiAnalysisCompletion(
  system: string,
  user: string
): Promise<{ raw: string; model: string }> {
  const apiKey = getGoogleApiKey();
  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY is not configured.");
  }

  const model = conceptionGeminiModel();
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: `${system}\n\n${user}` }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gemini request failed (${response.status}): ${body.slice(0, 400)}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!raw) {
    throw new Error("Gemini returned an empty response.");
  }

  return { raw, model };
}

export function isConceptionLlmConfigured() {
  return Boolean(getOpenRouterApiKey() || getGoogleApiKey());
}

async function requestOpenRouterAnalysisCompletion(system: string, user: string) {
  const model = conceptionOpenRouterModel();
  let lastError: string | null = null;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const completion = await requestOpenRouterChatCompletion({
        model,
        system,
        user,
        temperature: 0.2,
        maxTokens: 2200,
      });
      return completion;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      const status = extractHttpStatus(lastError);
      if (!status || !shouldRetryProvider(status) || attempt === 3) {
        throw new Error(lastError);
      }
      await sleep(1200 * attempt);
    }
  }

  throw new Error(lastError ?? "OpenRouter request failed.");
}

export async function runConceptionLlmAnalysis(): Promise<ConceptionLlmAnalysisResult | null> {
  if (!isConceptionLlmConfigured()) {
    return null;
  }

  const context = await buildConceptionLlmContext();
  const system = buildSystemPrompt();
  const user = buildUserPrompt(context);
  const openRouterApiKey = getOpenRouterApiKey();
  const googleApiKey = getGoogleApiKey();
  let openRouterError: string | null = null;

  if (openRouterApiKey) {
    try {
      const completion = await requestOpenRouterAnalysisCompletion(system, user);
      const parsed = parseAnalysisJson(completion.raw);
      return mapLlmOutput(parsed, context, "openrouter", completion.model);
    } catch (error) {
      openRouterError = error instanceof Error ? error.message : String(error);
      if (!shouldFallbackToGemini(openRouterError)) {
        throw new Error(formatProviderFailure("OpenRouter", openRouterError));
      }
    }
  }

  if (googleApiKey && (!openRouterApiKey || shouldFallbackToGemini(openRouterError))) {
    try {
      const completion = await requestGeminiAnalysisCompletion(system, user);
      const parsed = parseAnalysisJson(completion.raw);
      return mapLlmOutput(parsed, context, "gemini", completion.model);
    } catch (error) {
      const geminiError = error instanceof Error ? error.message : String(error);
      if (openRouterError) {
        throw new Error(
          `${formatProviderFailure("OpenRouter", openRouterError)} | ${formatProviderFailure("Gemini", geminiError)}`
        );
      }
      throw new Error(formatProviderFailure("Gemini", geminiError));
    }
  }

  if (openRouterError) {
    throw new Error(formatProviderFailure("OpenRouter", openRouterError));
  }

  return null;
}
