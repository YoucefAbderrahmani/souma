export const IMPORTANCE_RANKS = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
} as const;

export type ImportanceTier = keyof typeof IMPORTANCE_RANKS;

export function normalizeImportanceTier(value: string): ImportanceTier {
  const normalized = value.trim().toLowerCase();
  if (normalized.includes("crit")) return "critical";
  if (normalized.includes("haut") || normalized === "high") return "high";
  if (normalized.includes("moy") || normalized === "medium") return "medium";
  if (normalized.includes("bas") || normalized === "low") return "low";
  return "medium";
}

export function compareImportance(left: string, right: string): number {
  const rankDelta =
    IMPORTANCE_RANKS[normalizeImportanceTier(left)] - IMPORTANCE_RANKS[normalizeImportanceTier(right)];
  if (rankDelta !== 0) return rankDelta;
  return left.localeCompare(right, "fr");
}

export function compareImportanceTiers(left: ImportanceTier, right: ImportanceTier): number {
  return IMPORTANCE_RANKS[left] - IMPORTANCE_RANKS[right];
}

export function sortByImportance<T>(items: T[], getImportance: (item: T) => string): T[] {
  return [...items].sort((left, right) => compareImportance(getImportance(left), getImportance(right)));
}
