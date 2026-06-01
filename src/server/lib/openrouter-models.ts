/** Default OpenRouter model for Seller Helper + revert emails (see openrouter.ai/models). */
export const DEFAULT_OPENROUTER_MODEL = "google/gemini-2.5-flash";

/** Stable fallback if the primary model is unavailable on OpenRouter. */
export const FALLBACK_OPENROUTER_MODEL = "google/gemini-2.0-flash-001";

const DEPRECATED_MODEL_ALIASES: Record<string, string> = {
  "google/gemini-2.5-flash-preview": DEFAULT_OPENROUTER_MODEL,
  "google/gemini-2.5-flash-preview-05-20": DEFAULT_OPENROUTER_MODEL,
};

export function normalizeOpenRouterModelId(model: string): string {
  const trimmed = model.trim();
  return DEPRECATED_MODEL_ALIASES[trimmed] ?? trimmed;
}

/** First non-empty env value wins; unknown preview aliases are remapped. */
export function resolveOpenRouterModel(
  ...candidates: Array<string | undefined | null>
): string {
  for (const raw of candidates) {
    const trimmed = raw?.trim();
    if (!trimmed) continue;
    return normalizeOpenRouterModelId(trimmed);
  }
  return DEFAULT_OPENROUTER_MODEL;
}
