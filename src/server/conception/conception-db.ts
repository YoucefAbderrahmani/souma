import { desc, isNull } from "drizzle-orm";
import { db } from "@/server/db";
import { conceptionAlertTable, conceptionRecommendationTable } from "@/server/db/schema";
import type { ConceptionAlertDto, ConceptionRecommendationDto } from "@/types/conception-admin";

function mapSeverity(t: string): ConceptionAlertDto["severity"] {
  if (t === "critical" || t === "high" || t === "medium" || t === "low") return t;
  return "medium";
}

function mapRecPriority(p: string): ConceptionRecommendationDto["priority"] {
  if (p === "high" || p === "medium" || p === "low") return p;
  return "medium";
}

function priorityLabel(p: ConceptionRecommendationDto["priority"]): string {
  if (p === "high") return "PRIORITÉ HAUTE";
  if (p === "medium") return "PRIORITÉ MOYENNE";
  return "PRIORITÉ BASSE";
}

export async function listConceptionAlertsForAdmin(options?: { limit?: number }): Promise<ConceptionAlertDto[]> {
  const limit = Math.min(100, Math.max(1, options?.limit ?? 40));
  const rows = await db
    .select()
    .from(conceptionAlertTable)
    .where(isNull(conceptionAlertTable.dismissedAt))
    .orderBy(desc(conceptionAlertTable.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    alertType: r.alertType,
    severity: mapSeverity(r.severity),
    title: r.title,
    description: r.description,
    detail: r.detail,
    affectedSessionsEstimate: r.affectedSessionsEstimate,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function listConceptionRecommendationsForAdmin(options?: {
  limit?: number;
}): Promise<ConceptionRecommendationDto[]> {
  const limit = Math.min(100, Math.max(1, options?.limit ?? 30));
  const rows = await db
    .select()
    .from(conceptionRecommendationTable)
    .where(isNull(conceptionRecommendationTable.dismissedAt))
    .orderBy(desc(conceptionRecommendationTable.createdAt))
    .limit(limit);

  return rows.map((r) => {
    const priority = mapRecPriority(r.priority);
    return {
      id: r.id,
      priority,
      priorityLabel: priorityLabel(priority),
      impactLabel: r.impactLabel,
      title: r.title,
      analysis: r.analysis,
      recommendation: r.recommendation,
      confidence: r.confidence,
      revenueHint: r.revenueHint,
      implementationHint: r.implementationHint,
      roiHint: r.roiHint,
      createdAt: r.createdAt.toISOString(),
    };
  });
}
