import {
  pickAssignedRoleKey,
  type RecommendationRoleDefinition,
  type RecommendationTaskInput,
} from "@/lib/recommendation-role-profiles";
import { normalizeRoleKey } from "@/lib/recommendation-roles";

export type { RecommendationRoleDefinition, RecommendationTaskInput };

export function rolesFromKeys(registeredRoleKeys: string[]): RecommendationRoleDefinition[] {
  return registeredRoleKeys.map((roleKey) => ({
    roleKey: normalizeRoleKey(roleKey),
    displayName: roleKey.replace(/_/g, " "),
  }));
}

function toRoleDefinitions(
  roles: RecommendationRoleDefinition[] | string[]
): RecommendationRoleDefinition[] {
  if (roles.length === 0) return [];
  if (typeof roles[0] === "string") return rolesFromKeys(roles as string[]);
  return roles as RecommendationRoleDefinition[];
}

/** Score-based role pick from registered roles (display names improve custom roles). */
export function inferAssignedRoleKey(
  input: RecommendationTaskInput,
  roles: RecommendationRoleDefinition[] | string[]
): string {
  return pickAssignedRoleKey(input, toRoleDefinitions(roles), null);
}

/**
 * Resolves role: re-scores task against all registered roles; LLM/stored key only nudges (+2) when valid.
 */
export function resolveAssignedRoleKey(
  stored: string | null | undefined,
  input: RecommendationTaskInput,
  roles: RecommendationRoleDefinition[] | string[]
): string {
  const definitions = toRoleDefinitions(roles);
  const preferred = stored ? normalizeRoleKey(stored) : null;
  const validPreferred =
    preferred && definitions.some((r) => normalizeRoleKey(r.roleKey) === preferred) ?
      preferred
    : null;
  return pickAssignedRoleKey(input, definitions, validPreferred);
}
