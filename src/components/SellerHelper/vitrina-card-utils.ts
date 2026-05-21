import type { ConceptionRecommendationDto } from "@/types/conception-admin";
import type {
  VitrinaMarketingPriority,
  VitrinaProductMarketingRecommendation,
} from "@/types/vitrina-product-recommendations";
import { IMPORTANCE_RANKS } from "@/lib/importance-ranking";
import {
  confidenceBarFillClass,
  confidenceTier,
  priorityBadgeClass,
  priorityTopStripClass,
} from "./ai-recommendation-card-utils";

export function vitrinaTopPriority(
  item: VitrinaProductMarketingRecommendation
): VitrinaMarketingPriority {
  if (item.tips.length === 0) return "low";
  const rank = Math.min(...item.tips.map((t) => IMPORTANCE_RANKS[t.priority]));
  if (rank <= IMPORTANCE_RANKS.high) return "high";
  if (rank <= IMPORTANCE_RANKS.medium) return "medium";
  return "low";
}

export function vitrinaPriorityAsTier(
  priority: VitrinaMarketingPriority
): ConceptionRecommendationDto["priority"] {
  if (priority === "high") return "high";
  if (priority === "medium") return "medium";
  return "low";
}

export function vitrinaPriorityStripClass(priority: VitrinaMarketingPriority) {
  return priorityTopStripClass(vitrinaPriorityAsTier(priority));
}

export function vitrinaPriorityBadgeClass(priority: VitrinaMarketingPriority) {
  return priorityBadgeClass(vitrinaPriorityAsTier(priority));
}

export function vitrinaOpportunityBarClass(score: number) {
  return confidenceBarFillClass(confidenceTier(Math.min(100, Math.max(0, score))));
}
