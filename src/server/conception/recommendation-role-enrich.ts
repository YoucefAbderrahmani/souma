import { resolveAssignedRoleKey } from "@/server/conception/recommendation-role-assign";
import { getRoleEmailMap } from "@/server/conception/recommendation-role-emails-db";

export async function attachAssignedRoleToRecommendationRow<T extends {
  title: string;
  analysis: string;
  recommendation: string;
  assignedRoleKey?: string | null;
}>(row: T): Promise<T & { assignedRoleKey: string }> {
  const roleMap = await getRoleEmailMap();
  const registeredKeys = Array.from(roleMap.keys());
  const assignedRoleKey = resolveAssignedRoleKey(row.assignedRoleKey, row, registeredKeys);
  return { ...row, assignedRoleKey };
}

export async function resolveRolePresentation(assignedRoleKey: string) {
  const roleMap = await getRoleEmailMap();
  const meta = roleMap.get(assignedRoleKey);
  return {
    assignedRoleKey,
    assignedRoleLabel: meta?.displayName ?? assignedRoleKey.replace(/_/g, " "),
    roleEmail: meta?.email?.trim() ?? "",
    roleEmailConfigured: Boolean(meta?.email?.trim()),
  };
}
