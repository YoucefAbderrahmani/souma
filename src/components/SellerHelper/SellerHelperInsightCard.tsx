"use client";

import type { ConceptionRecommendationDto } from "@/types/conception-admin";
import { cn } from "@/lib/utils";
import {
  aiRecAnimationStyle,
  aiRecommendationCardRootClass,
  priorityBadgeClass,
  priorityTopStripClass,
  recommendationPanelClass,
  sellerHelperActionBtnSecondary,
} from "./ai-recommendation-card-utils";

export type SellerHelperInsightMeta = {
  icon?: React.ReactNode;
  text: string;
};

export function SellerHelperInsightCard({
  tier,
  priorityLabel,
  title,
  body,
  recommendation,
  recommendationLabel = "Recommendation",
  meta = [],
  actions,
  extraBadges,
  animationIndex = 0,
  layout = "default",
  className,
}: {
  tier: ConceptionRecommendationDto["priority"];
  priorityLabel: string;
  title: string;
  body?: string;
  recommendation?: string;
  recommendationLabel?: string;
  meta?: SellerHelperInsightMeta[];
  actions?: React.ReactNode;
  extraBadges?: React.ReactNode;
  animationIndex?: number;
  /** Single-column card with one content panel (funnel friction). */
  layout?: "default" | "unified";
  className?: string;
}) {
  if (layout === "unified") {
    return (
      <article
        className={cn(aiRecommendationCardRootClass(tier), className)}
        style={aiRecAnimationStyle(animationIndex)}
      >
        <div className={cn("absolute left-0 right-0 top-0 z-[2] h-0.5", priorityTopStripClass(tier))} />

        <div className="flex flex-col gap-3 p-3.5 pt-4 sm:p-4 sm:pt-5">
          <div className="flex flex-wrap items-start gap-2">
            <span
              className={cn(
                "inline-flex w-fit shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                priorityBadgeClass(tier)
              )}
            >
              {priorityLabel}
            </span>
            <h3 className="min-w-0 flex-1 text-left text-sm font-bold leading-snug text-dark sm:text-[15px]">
              {title}
            </h3>
          </div>

          {body || recommendation ?
            <div className={recommendationPanelClass}>
              {body ?
                <p className="text-sm leading-relaxed text-dark-3">{body}</p>
              : null}
              {recommendation ?
                <div className={body ? "mt-3 border-t border-gray-2 pt-3" : undefined}>
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-teal-dark">
                    {recommendationLabel}
                  </p>
                  <p className="text-sm leading-relaxed text-dark-3">{recommendation}</p>
                </div>
              : null}
            </div>
          : null}

          {meta.length > 0 ?
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-dark-4">
              {meta.map((item, index) => (
                <span key={`${item.text}-${index}`} className="inline-flex items-center gap-1">
                  {item.icon}
                  {item.text}
                </span>
              ))}
            </div>
          : null}
        </div>
      </article>
    );
  }

  return (
    <article
      className={cn(aiRecommendationCardRootClass(tier), className)}
      style={aiRecAnimationStyle(animationIndex)}
    >
      <div className={cn("absolute left-0 right-0 top-0 z-[2] h-0.5", priorityTopStripClass(tier))} />

      <div className="flex flex-col gap-3 p-3.5 pt-4 sm:p-4 sm:pt-5 lg:flex-row lg:gap-4">
        {actions || priorityLabel || extraBadges ?
          <aside className="flex shrink-0 flex-col lg:w-[200px] lg:border-r lg:border-gray-2 lg:pr-4 xl:w-[212px]">
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <span
                className={cn(
                  "inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                  priorityBadgeClass(tier)
                )}
              >
                {priorityLabel}
              </span>
              {extraBadges}
            </div>
            {actions ?
              <div className="mt-1 flex flex-col gap-1.5">{actions}</div>
            : null}
          </aside>
        : null}

        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          <h3 className="text-left text-sm font-bold leading-snug text-dark sm:text-[15px]">{title}</h3>

          {body ?
            <div className={recommendationPanelClass}>
              <span className="mb-2 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-dark-3">
                <span className="h-1.5 w-1.5 shrink-0 rounded-sm bg-orange" aria-hidden />
                Details
              </span>
              <p className="text-sm leading-relaxed text-dark-3">{body}</p>
            </div>
          : null}

          {recommendation ?
            <div className={recommendationPanelClass}>
              <span className="mb-2 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-dark-3">
                <span className="h-1.5 w-1.5 shrink-0 rounded-sm bg-teal" aria-hidden />
                {recommendationLabel}
              </span>
              <p className="text-sm leading-relaxed text-dark-3">{recommendation}</p>
            </div>
          : null}

          {meta.length > 0 ?
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-dark-4">
              {meta.map((item, index) => (
                <span key={`${item.text}-${index}`} className="inline-flex items-center gap-1">
                  {item.icon}
                  {item.text}
                </span>
              ))}
            </div>
          : null}
        </div>
      </div>
    </article>
  );
}

export { sellerHelperActionBtnSecondary as insightActionBtnSecondary };
