import { resolveAssignedRoleKey } from "@/server/conception/recommendation-role-assign";
import { listRecommendationRoleEmails } from "@/server/conception/recommendation-role-emails-db";

export async function getRecommendationRoleDefinitions() {
  const rows = await listRecommendationRoleEmails();
  return rows.map((r) => ({
    roleKey: r.roleKey,
    displayName: r.displayName,
  }));
}

export async function attachAssignedRoleToRecommendationRow<T extends {
  title: string;
  analysis: string;
  recommendation: string;
  assignedRoleKey?: string | null;
}>(row: T): Promise<T & { assignedRoleKey: string }> {
  const roles = await getRecommendationRoleDefinitions();
  const assignedRoleKey = resolveAssignedRoleKey(row.assignedRoleKey, row, roles);
  return { ...row, assignedRoleKey };
}

export async function resolveRolePresentation(assignedRoleKey: string) {
  const roleMap = await listRecommendationRoleEmails();
  const meta = roleMap.find((r) => r.roleKey === assignedRoleKey);
  return {
    assignedRoleKey,
    assignedRoleLabel: meta?.displayName ?? assignedRoleKey.replace(/_/g, " "),
    roleEmail: meta?.email?.trim() ?? "",
    roleEmailConfigured: Boolean(meta?.email?.trim()),
  };
}
