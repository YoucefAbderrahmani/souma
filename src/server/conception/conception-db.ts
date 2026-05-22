import { and, desc, eq, isNotNull, isNull, or } from "drizzle-orm";
import { db } from "@/server/db";
import { conceptionAlertTable, conceptionRecommendationTable } from "@/server/db/schema";
import { compareImportance, normalizeImportanceTier, sortByImportance } from "@/lib/importance-ranking";
import { ensureRecommendationEconomicsHints } from "@/lib/recommendation-economics";
import { buildRecommendationEconomicsContext } from "@/server/conception/recommendation-economics-context";
import { resolveAssignedRoleKey } from "@/server/conception/recommendation-role-assign";
import { getRoleDefinitionList } from "@/server/conception/recommendation-role-emails-db";
import { getRoleEmailMap } from "@/server/conception/recommendation-role-emails-db";
import { logAppliedAction } from "@/server/seller-helper/applied-actions";
import type {
  ConceptionAlertDto,
  ConceptionRecommendationDto,
  ConceptionResolvedAlertDto,
  RecommendationWorkflowStatus,
} from "@/types/conception-admin";

export const RECOMMENDATION_WORKFLOW_ACTIVE = "active" as const;
export const RECOMMENDATION_WORKFLOW_INBOX = "inbox" as const;
export const RECOMMENDATION_WORKFLOW_IMPLEMENTED = "implemented" as const;

function mapWorkflowStatus(value: string | null | undefined): RecommendationWorkflowStatus {
  if (value === RECOMMENDATION_WORKFLOW_INBOX || value === RECOMMENDATION_WORKFLOW_IMPLEMENTED) {
    return value;
  }
  return RECOMMENDATION_WORKFLOW_ACTIVE;
}

function activeRecommendationWhere() {
  return and(
    isNull(conceptionRecommendationTable.dismissedAt),
    or(
      eq(conceptionRecommendationTable.workflowStatus, RECOMMENDATION_WORKFLOW_ACTIVE),
      isNull(conceptionRecommendationTable.workflowStatus)
    )
  );
}

function inboxRecommendationWhere(roleKey?: string) {
  const filters = [
    isNull(conceptionRecommendationTable.dismissedAt),
    eq(conceptionRecommendationTable.workflowStatus, RECOMMENDATION_WORKFLOW_INBOX),
  ];
  if (roleKey?.trim()) {
    filters.push(eq(conceptionRecommendationTable.assignedRoleKey, roleKey.trim()));
  }
  return and(...filters);
}

function mapSeverity(t: string): ConceptionAlertDto["severity"] {
  if (t === "critical" || t === "high" || t === "medium" || t === "low") return t;
  return "medium";
}

function mapRecPriority(p: string): ConceptionRecommendationDto["priority"] {
  return normalizeImportanceTier(p);
}

function priorityLabel(p: ConceptionRecommendationDto["priority"]): string {
  if (p === "critical") return "CRITICAL PRIORITY";
  if (p === "high") return "HIGH PRIORITY";
  if (p === "medium") return "MEDIUM PRIORITY";
  return "LOW PRIORITY";
}

export type ConceptionAlertDisposition = "resolved" | "ignored";

function readAlertDismissalKind(metadataJson: string | null | undefined): ConceptionAlertDisposition | null {
  if (!metadataJson) return null;

  try {
    const metadata = JSON.parse(metadataJson) as { dismissalKind?: unknown };
    return metadata.dismissalKind === "ignored" || metadata.dismissalKind === "resolved" ?
        metadata.dismissalKind
      : null;
  } catch {
    return null;
  }
}

function isResolvedDismissedAlertRow(row: { metadataJson?: string | null }) {
  return readAlertDismissalKind(row.metadataJson) !== "ignored";
}

export async function listDismissedConceptionAlertsForAdmin(options?: {
  limit?: number;
}): Promise<ConceptionResolvedAlertDto[]> {
  const limit = Math.min(100, Math.max(1, options?.limit ?? 12));
  const rows = await db
    .select()
    .from(conceptionAlertTable)
    .where(isNotNull(conceptionAlertTable.dismissedAt))
    .orderBy(desc(conceptionAlertTable.dismissedAt))
    .limit(limit * 4);

  return rows
    .filter((row) => row.dismissedAt && isResolvedDismissedAlertRow(row))
    .slice(0, limit)
    .map((row) => ({
      id: row.id,
      alertType: row.alertType,
      title: row.title,
      description: row.description,
      detail: row.detail,
      dismissedAt: row.dismissedAt!.toISOString(),
      createdAt: row.createdAt.toISOString(),
    }));
}

export async function getConceptionAlertById(id: string) {
  const [row] = await db
    .select()
    .from(conceptionAlertTable)
    .where(eq(conceptionAlertTable.id, id))
    .limit(1);

  if (!row) return null;

  return {
    id: row.id,
    alertType: row.alertType,
    severity: mapSeverity(row.severity),
    title: row.title,
    description: row.description,
    detail: row.detail,
    affectedSessionsEstimate: row.affectedSessionsEstimate,
    metadataJson: row.metadataJson,
    createdAt: row.createdAt.toISOString(),
    dismissedAt: row.dismissedAt?.toISOString() ?? null,
  };
}

export async function listConceptionAlertsForAdmin(options?: { limit?: number }): Promise<ConceptionAlertDto[]> {
  const limit = Math.min(100, Math.max(1, options?.limit ?? 40));
  const rows = await db
    .select()
    .from(conceptionAlertTable)
    .where(isNull(conceptionAlertTable.dismissedAt))
    .orderBy(desc(conceptionAlertTable.createdAt))
    .limit(limit);

  const alerts = rows.map((r) => ({
    id: r.id,
    alertType: r.alertType,
    severity: mapSeverity(r.severity),
    title: r.title,
    description: r.description,
    detail: r.detail,
    affectedSessionsEstimate: r.affectedSessionsEstimate,
    createdAt: r.createdAt.toISOString(),
  }));

  return alerts.sort((left, right) => {
    const severityDelta = compareImportance(left.severity, right.severity);
    if (severityDelta !== 0) return severityDelta;
    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });
}

export async function dismissConceptionAlertById(
  id: string,
  disposition: ConceptionAlertDisposition = "resolved"
): Promise<boolean> {
  const [existing] = await db
    .select()
    .from(conceptionAlertTable)
    .where(eq(conceptionAlertTable.id, id))
    .limit(1);

  if (!existing) return false;

  let metadataJson = existing.metadataJson;
  try {
    const metadata =
      existing.metadataJson ?
        (JSON.parse(existing.metadataJson) as Record<string, unknown>)
      : {};
    metadata.dismissalKind = disposition;
    metadataJson = JSON.stringify(metadata);
  } catch {
    metadataJson = JSON.stringify({ dismissalKind: disposition });
  }

  const dismissedAt = new Date();
  const rows = await db
    .update(conceptionAlertTable)
    .set({ dismissedAt, metadataJson })
    .where(eq(conceptionAlertTable.id, id))
    .returning({ id: conceptionAlertTable.id });

  if (rows.length === 0) return false;

  if (disposition === "resolved") {
    await logAppliedAction({
      kind: "alert_resolved",
      title: `Alert resolved · ${existing.title}`,
      summary: existing.description,
      sourceRefId: id,
      occurredAt: dismissedAt,
      details: {
        alertId: id,
        alertType: existing.alertType,
        severity: existing.severity,
        description: existing.description,
        detail: existing.detail,
        affectedSessionsEstimate: existing.affectedSessionsEstimate,
        disposition,
      },
    });
  }

  return true;
}

export async function dismissConceptionRecommendationById(id: string): Promise<boolean> {
  const [existing] = await db
    .select()
    .from(conceptionRecommendationTable)
    .where(eq(conceptionRecommendationTable.id, id))
    .limit(1);

  if (!existing) return false;

  const dismissedAt = new Date();
  const rows = await db
    .update(conceptionRecommendationTable)
    .set({ dismissedAt })
    .where(eq(conceptionRecommendationTable.id, id))
    .returning({ id: conceptionRecommendationTable.id });

  if (rows.length === 0) return false;

  await logAppliedAction({
    kind: "ai_recommendation",
    title: `Recommendation dismissed · ${existing.title}`,
    summary: existing.recommendation,
    sourceRefId: id,
    occurredAt: dismissedAt,
    details: {
      recommendationId: id,
      assignedRoleKey: existing.assignedRoleKey,
      workflowStatus: existing.workflowStatus,
      priority: existing.priority,
      impactLabel: existing.impactLabel,
      analysis: existing.analysis,
      recommendation: existing.recommendation,
      confidence: existing.confidence,
      revenueHint: existing.revenueHint,
      implementationHint: existing.implementationHint,
      roiHint: existing.roiHint,
    },
  });

  return true;
}

/** Records a successful Brevo send while keeping the card in AI Recommendations (Analyze auto-send). */
export async function markConceptionRecommendationEmailSent(id: string): Promise<boolean> {
  const now = new Date();
  const rows = await db
    .update(conceptionRecommendationTable)
    .set({ emailSentAt: now })
    .where(
      and(
        eq(conceptionRecommendationTable.id, id),
        isNull(conceptionRecommendationTable.dismissedAt),
        or(
          eq(conceptionRecommendationTable.workflowStatus, RECOMMENDATION_WORKFLOW_ACTIVE),
          isNull(conceptionRecommendationTable.workflowStatus)
        )
      )
    )
    .returning({ id: conceptionRecommendationTable.id });

  return rows.length > 0;
}

export async function moveConceptionRecommendationToInbox(id: string): Promise<boolean> {
  const now = new Date();
  const rows = await db
    .update(conceptionRecommendationTable)
    .set({
      workflowStatus: RECOMMENDATION_WORKFLOW_INBOX,
      inboxAt: now,
      emailSentAt: now,
    })
    .where(
      and(
        eq(conceptionRecommendationTable.id, id),
        isNull(conceptionRecommendationTable.dismissedAt),
        or(
          eq(conceptionRecommendationTable.workflowStatus, RECOMMENDATION_WORKFLOW_ACTIVE),
          isNull(conceptionRecommendationTable.workflowStatus)
        )
      )
    )
    .returning({ id: conceptionRecommendationTable.id });

  return rows.length > 0;
}

export async function markConceptionRecommendationImplemented(id: string): Promise<boolean> {
  const [existing] = await db
    .select()
    .from(conceptionRecommendationTable)
    .where(eq(conceptionRecommendationTable.id, id))
    .limit(1);

  if (!existing || existing.dismissedAt) return false;
  if (existing.workflowStatus !== RECOMMENDATION_WORKFLOW_INBOX) return false;

  const implementedAt = new Date();
  const rows = await db
    .update(conceptionRecommendationTable)
    .set({
      workflowStatus: RECOMMENDATION_WORKFLOW_IMPLEMENTED,
      implementedAt,
    })
    .where(eq(conceptionRecommendationTable.id, id))
    .returning({ id: conceptionRecommendationTable.id });

  if (rows.length === 0) return false;

  await logAppliedAction({
    kind: "ai_recommendation",
    title: `Recommendation implemented · ${existing.title}`,
    summary: existing.recommendation,
    sourceRefId: id,
    occurredAt: implementedAt,
    details: {
      recommendationId: id,
      assignedRoleKey: existing.assignedRoleKey,
      priority: existing.priority,
      impactLabel: existing.impactLabel,
      analysis: existing.analysis,
      recommendation: existing.recommendation,
      confidence: existing.confidence,
      revenueHint: existing.revenueHint,
      implementationHint: existing.implementationHint,
      roiHint: existing.roiHint,
    },
  });

  return true;
}

/** Permanently deletes all rows in `conception_alert` (active and dismissed). */
export async function deleteAllConceptionAlerts(): Promise<number> {
  const rows = await db.delete(conceptionAlertTable).returning({ id: conceptionAlertTable.id });
  return rows.length;
}

/** Permanently deletes all rows in `conception_recommendation` (admin reset before a new analysis). */
export async function deleteAllConceptionRecommendations(): Promise<number> {
  const rows = await db.delete(conceptionRecommendationTable).returning({ id: conceptionRecommendationTable.id });
  return rows.length;
}

async function mapConceptionRecommendationRows(
  rows: (typeof conceptionRecommendationTable.$inferSelect)[]
): Promise<ConceptionRecommendationDto[]> {
  const [economicsCtx, roleMap, roleDefinitions] = await Promise.all([
    buildRecommendationEconomicsContext(),
    getRoleEmailMap(),
    getRoleDefinitionList(),
  ]);

  const recommendations = await Promise.all(
    rows.map(async (r) => {
      const priority = mapRecPriority(r.priority);
      const hints = ensureRecommendationEconomicsHints(
        {
          priority,
          impactLabel: r.impactLabel,
          confidence: r.confidence,
          title: r.title,
          revenueHint: r.revenueHint,
          roiHint: r.roiHint,
        },
        economicsCtx
      );
      const assignedRoleKey = resolveAssignedRoleKey(
        r.assignedRoleKey,
        { title: r.title, analysis: r.analysis, recommendation: r.recommendation },
        roleDefinitions
      );
      const roleMeta = roleMap.get(assignedRoleKey);
      return {
        id: r.id,
        priority,
        priorityLabel: priorityLabel(priority),
        impactLabel: r.impactLabel,
        title: r.title,
        analysis: r.analysis,
        recommendation: r.recommendation,
        confidence: r.confidence,
        revenueHint: hints.revenueHint,
        implementationHint: r.implementationHint,
        roiHint: hints.roiHint,
        assignedRoleKey,
        assignedRoleLabel: roleMeta?.displayName ?? assignedRoleKey.replace(/_/g, " "),
        roleEmailConfigured: Boolean(roleMeta?.email?.trim()),
        workflowStatus: mapWorkflowStatus(r.workflowStatus),
        inboxAt: r.inboxAt?.toISOString() ?? null,
        emailSentAt: r.emailSentAt?.toISOString() ?? null,
        createdAt: r.createdAt.toISOString(),
      };
    })
  );

  return sortByImportance(recommendations, (item) => item.priority);
}

export async function listConceptionRecommendationsForAdmin(options?: {
  limit?: number;
}): Promise<ConceptionRecommendationDto[]> {
  const limit = Math.min(100, Math.max(1, options?.limit ?? 30));
  const rows = await db
    .select()
    .from(conceptionRecommendationTable)
    .where(activeRecommendationWhere())
    .orderBy(desc(conceptionRecommendationTable.createdAt))
    .limit(limit);

  return mapConceptionRecommendationRows(rows);
}

export async function listConceptionInboxForAdmin(options?: {
  limit?: number;
  roleKey?: string;
}): Promise<ConceptionRecommendationDto[]> {
  const limit = Math.min(100, Math.max(1, options?.limit ?? 40));
  const rows = await db
    .select()
    .from(conceptionRecommendationTable)
    .where(inboxRecommendationWhere(options?.roleKey))
    .orderBy(desc(conceptionRecommendationTable.inboxAt), desc(conceptionRecommendationTable.createdAt))
    .limit(limit);

  return mapConceptionRecommendationRows(rows);
}

export async function getConceptionRecommendationById(id: string) {
  const [row] = await db
    .select()
    .from(conceptionRecommendationTable)
    .where(eq(conceptionRecommendationTable.id, id))
    .limit(1);
  if (!row || row.dismissedAt) return null;
  const workflow = mapWorkflowStatus(row.workflowStatus);
  if (workflow !== RECOMMENDATION_WORKFLOW_ACTIVE) return null;

  const [roleMap, roleDefinitions, economicsCtx] = await Promise.all([
    getRoleEmailMap(),
    getRoleDefinitionList(),
    buildRecommendationEconomicsContext(),
  ]);
  const priority = mapRecPriority(row.priority);
  const hints = ensureRecommendationEconomicsHints(
    {
      priority,
      impactLabel: row.impactLabel,
      confidence: row.confidence,
      title: row.title,
      revenueHint: row.revenueHint,
      roiHint: row.roiHint,
    },
    economicsCtx
  );
  const assignedRoleKey = resolveAssignedRoleKey(
    row.assignedRoleKey,
    { title: row.title, analysis: row.analysis, recommendation: row.recommendation },
    roleDefinitions
  );
  const roleMeta = roleMap.get(assignedRoleKey);

  return {
    id: row.id,
    priority,
    priorityLabel: priorityLabel(priority),
    impactLabel: row.impactLabel,
    title: row.title,
    analysis: row.analysis,
    recommendation: row.recommendation,
    confidence: row.confidence,
    revenueHint: hints.revenueHint,
    implementationHint: row.implementationHint,
    roiHint: hints.roiHint,
    assignedRoleKey,
    assignedRoleLabel: roleMeta?.displayName ?? assignedRoleKey.replace(/_/g, " "),
    roleEmail: roleMeta?.email?.trim() ?? "",
    roleEmailConfigured: Boolean(roleMeta?.email?.trim()),
    workflowStatus: workflow,
    inboxAt: row.inboxAt?.toISOString() ?? null,
    emailSentAt: row.emailSentAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}
