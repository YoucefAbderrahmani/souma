import type { ConceptionRecommendationDto } from "@/types/conception-admin";
import {
  defaultEconomicsContext,
  ensureRecommendationEconomicsHints,
  isBlankEconomicsHint,
} from "@/lib/recommendation-economics";
import { cn } from "@/lib/utils";

export type AiRecommendationCardModel = {
  key: string;
  priority: string;
  tier: ConceptionRecommendationDto["priority"];
  impact: string;
  title: string;
  confidence: number;
  analyse: string;
  recommendation: string;
  revenue: string;
  implementation: string;
  roi: string;
  assignedRoleKey: string;
  assignedRoleLabel: string;
  roleEmailConfigured: boolean;
  emailSentAt: string | null;
};

export function mapConceptionRecommendationToCard(
  rec: ConceptionRecommendationDto
): AiRecommendationCardModel {
  const needsEconomics =
    isBlankEconomicsHint(rec.revenueHint) || isBlankEconomicsHint(rec.roiHint);
  const hints = needsEconomics
    ? ensureRecommendationEconomicsHints(
        {
          priority: rec.priority,
          impactLabel: rec.impactLabel ?? "",
          confidence: rec.confidence,
          title: rec.title,
          revenueHint: rec.revenueHint,
          roiHint: rec.roiHint,
        },
        defaultEconomicsContext()
      )
    : {
        revenueHint: rec.revenueHint!.trim(),
        roiHint: rec.roiHint!.trim(),
      };

  return {
    key: rec.id,
    priority: rec.priorityLabel,
    tier: rec.priority,
    impact: rec.impactLabel ?? "—",
    title: rec.title,
    confidence: rec.confidence,
    analyse: rec.analysis,
    recommendation: rec.recommendation,
    revenue: hints.revenueHint,
    implementation: rec.implementationHint?.trim() || "—",
    roi: hints.roiHint,
    assignedRoleKey: rec.assignedRoleKey,
    assignedRoleLabel: rec.assignedRoleLabel,
    roleEmailConfigured: rec.roleEmailConfigured,
    emailSentAt: rec.emailSentAt,
  };
}

export function confidenceTier(confidence: number): "high" | "medium" | "low" {
  if (confidence >= 80) return "high";
  if (confidence >= 60) return "medium";
  return "low";
}

export function priorityTopStripClass(tier: ConceptionRecommendationDto["priority"]) {
  if (tier === "critical") return "bg-gradient-to-r from-red to-red-dark";
  if (tier === "high") return "bg-gradient-to-r from-orange to-yellow";
  if (tier === "medium") return "bg-gradient-to-r from-blue to-blue-light";
  return "bg-gradient-to-r from-gray-5 to-gray-4";
}

export function priorityBadgeClass(tier: ConceptionRecommendationDto["priority"]) {
  if (tier === "critical") return "bg-red-light-6 text-red-dark";
  if (tier === "high") return "bg-blue-light-5 text-blue-dark";
  if (tier === "medium") return "bg-teal/10 text-teal-dark";
  return "bg-gray-2 text-dark-4";
}

export function confidenceBarFillClass(tier: ReturnType<typeof confidenceTier>) {
  if (tier === "high") return "bg-teal";
  if (tier === "medium") return "bg-yellow";
  return "bg-orange";
}

export function implementationTimeClass(tier: ConceptionRecommendationDto["priority"]) {
  if (tier === "critical") return "border-l-red bg-red-light-6";
  if (tier === "high") return "border-l-orange bg-blue-light-5";
  if (tier === "medium") return "border-l-teal bg-teal/10";
  return "border-l-gray-4 bg-gray-1";
}

export const recommendationPanelClass =
  "rounded-lg border border-gray-2 bg-gray-1/60 p-3 sm:p-3.5";

export const sellerHelperActionBtnSecondary = cn(
  "inline-flex min-h-[34px] w-full items-center justify-center rounded-lg border border-gray-3 bg-white px-2.5 py-1.5",
  "text-xs font-semibold transition-colors duration-150",
  "hover:border-orange hover:bg-orange/5 hover:text-orange",
  "disabled:cursor-not-allowed disabled:opacity-60"
);

export function aiRecommendationCardRootClass(_tier: ConceptionRecommendationDto["priority"]) {
  return cn(
    "group relative flex w-full flex-col overflow-hidden rounded-xl border border-gray-3 bg-white shadow-1",
    "transition-all duration-250 ease-out hover:border-gray-4 hover:shadow-md",
    "motion-safe:animate-ai-rec-slide-in motion-safe:opacity-0"
  );
}

export function priorityFromLabel(label: string): ConceptionRecommendationDto["priority"] {
  const upper = label.toUpperCase();
  if (upper.includes("CRITICAL")) return "critical";
  if (upper.includes("HIGH")) return "high";
  if (upper.includes("MEDIUM")) return "medium";
  return "low";
}

export function securityToneToPriority(
  tone: "risk" | "attention" | "guidance"
): ConceptionRecommendationDto["priority"] {
  if (tone === "risk") return "critical";
  if (tone === "attention") return "high";
  return "medium";
}

export function aiRecAnimationStyle(animationIndex: number): { animationDelay: string } {
  return { animationDelay: `${Math.min(animationIndex, 8) * 50 + 50}ms` };
}
