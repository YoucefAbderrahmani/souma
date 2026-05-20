/** Stable keys stored in DB (`recommendation_role_email.role_key`, `conception_recommendation.assigned_role_key`). */

export const DEFAULT_RECOMMENDATION_ROLE_KEYS = ["marketing_agent", "technical_support"] as const;

export type RecommendationRoleKey = (typeof DEFAULT_RECOMMENDATION_ROLE_KEYS)[number] | string;

export const DEFAULT_RECOMMENDATION_ROLE_DEFINITIONS: Array<{
  roleKey: string;
  displayName: string;
}> = [
  { roleKey: "marketing_agent", displayName: "Marketing agent" },
  { roleKey: "technical_support", displayName: "Technical support" },
];

export function normalizeRoleKey(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 64);
}

export function isValidRoleKey(key: string): boolean {
  return key.length >= 2 && /^[a-z][a-z0-9_]*$/.test(key);
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
