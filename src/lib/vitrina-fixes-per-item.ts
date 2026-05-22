export const MIN_VITRINA_FIXES_PER_ITEM = 1;
export const MAX_VITRINA_FIXES_PER_ITEM = 6;
export const DEFAULT_VITRINA_FIXES_PER_ITEM = 2;

const STORAGE_KEY = "seller_helper_vitrina_fixes_per_item";

export function clampVitrinaFixesPerItem(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_VITRINA_FIXES_PER_ITEM;
  return Math.min(MAX_VITRINA_FIXES_PER_ITEM, Math.max(MIN_VITRINA_FIXES_PER_ITEM, Math.round(value)));
}

/** Parse query param, JSON body field, or FormData value. */
export function parseVitrinaFixesPerItemParam(value: unknown): number {
  if (value == null || value === "") return DEFAULT_VITRINA_FIXES_PER_ITEM;
  const parsed =
    typeof value === "number" ? value
    : typeof value === "string" ? Number.parseInt(value, 10)
    : NaN;
  return clampVitrinaFixesPerItem(parsed);
}

export function readVitrinaFixesPerItemFromStorage(): number {
  if (typeof window === "undefined") return DEFAULT_VITRINA_FIXES_PER_ITEM;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw == null) return DEFAULT_VITRINA_FIXES_PER_ITEM;
    return clampVitrinaFixesPerItem(Number.parseInt(raw, 10));
  } catch {
    return DEFAULT_VITRINA_FIXES_PER_ITEM;
  }
}

export function writeVitrinaFixesPerItemToStorage(value: number): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, String(clampVitrinaFixesPerItem(value)));
  } catch {
    /* ignore quota / private mode */
  }
}

export function vitrinaRecommendationsApiUrl(fixesPerItem: number, options?: { regenerate?: boolean }) {
  const params = new URLSearchParams({
    fixesPerItem: String(clampVitrinaFixesPerItem(fixesPerItem)),
  });
  if (options?.regenerate) params.set("regenerate", "1");
  return `/api/admin/conception/vitrina-recommendations?${params.toString()}`;
}
