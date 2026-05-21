"use client";

import { AlertTriangle, Check, ChevronDown, Info, Mail, Zap } from "lucide-react";
import type { ConceptionRecommendationDto } from "@/types/conception-admin";
import { cn } from "@/lib/utils";
import {
  aiRecAnimationStyle,
  aiRecommendationCardRootClass,
  confidenceBarFillClass,
  confidenceTier,
  priorityBadgeClass,
  priorityTopStripClass,
  type AiRecommendationCardModel,
} from "./ai-recommendation-card-utils";

function PriorityIcon({ tier }: { tier: ConceptionRecommendationDto["priority"] }) {
  const className = "h-3 w-3 shrink-0";
  if (tier === "critical") return <AlertTriangle className={className} aria-hidden />;
  if (tier === "high") return <Zap className={className} aria-hidden />;
  if (tier === "medium") return <Info className={className} aria-hidden />;
  return <ChevronDown className={className} aria-hidden />;
}

const actionBtnSecondary = cn(
  "inline-flex min-h-[34px] w-full items-center justify-center rounded-lg border border-gray-3 bg-white px-2.5 py-1.5",
  "text-xs font-semibold transition-colors duration-150",
  "hover:border-orange hover:bg-orange/5 hover:text-orange",
  "disabled:cursor-not-allowed disabled:opacity-60"
);

const recommendationPanelClass =
  "rounded-lg border border-gray-2 bg-gray-1/60 p-3 sm:p-3.5";

export function AiRecommendationCard({
  rec,
  animationIndex,
  expanded,
  busy,
  onToggleExpand,
  onDismiss,
  onSendEmail,
  onMarkImplemented,
  emailBusy,
  markImplementedBusy,
  showEmailSentBadge,
}: {
  rec: AiRecommendationCardModel;
  animationIndex: number;
  expanded: boolean;
  busy: boolean;
  emailBusy?: boolean;
  markImplementedBusy?: boolean;
  showEmailSentBadge?: boolean;
  onToggleExpand: () => void;
  onDismiss: () => void;
  onSendEmail?: () => void;
  onMarkImplemented?: () => void;
}) {
  const confTier = confidenceTier(rec.confidence);
  const confPct = Math.min(100, Math.max(0, rec.confidence));

  return (
    <article
      className={aiRecommendationCardRootClass(rec.tier)}
      style={aiRecAnimationStyle(animationIndex)}
    >
      <div className={cn("absolute left-0 right-0 top-0 z-[2] h-0.5", priorityTopStripClass(rec.tier))} />

      <div className="flex flex-col gap-3 p-3.5 pt-4 sm:p-4 sm:pt-5 lg:flex-row lg:gap-4">
        {/* Actions (left rail) */}
        <aside className="flex shrink-0 flex-col lg:w-[200px] lg:border-r lg:border-gray-2 lg:pr-4 xl:w-[212px]">
          <span
            className={cn(
              "mb-2 inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
              priorityBadgeClass(rec.tier)
            )}
          >
            <PriorityIcon tier={rec.tier} />
            {rec.priority}
          </span>
          <p className="inline-flex flex-wrap items-center gap-1 text-[11px] text-dark-4">
            <span>Assigned to</span>
            <span className="rounded-full border border-gray-3 bg-white px-2 py-0.5 font-semibold text-dark">
              {rec.assignedRoleLabel}
            </span>
          </p>

          {showEmailSentBadge ?
            <p className="mt-2 rounded-md border border-teal/30 bg-teal/10 px-2 py-1.5 text-center text-[10px] font-semibold text-teal-dark">
              Email sent
            </p>
          : null}

          <div className="mt-3 flex flex-col gap-1.5">
            {onMarkImplemented ?
              <button
                type="button"
                disabled={busy || markImplementedBusy}
                onClick={onMarkImplemented}
                className={cn(
                  "inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2",
                  "bg-orange text-xs font-bold uppercase tracking-wide text-white",
                  "transition-colors hover:bg-orange-dark disabled:cursor-not-allowed disabled:opacity-60"
                )}
              >
                <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} aria-hidden />
                {markImplementedBusy ? "Saving…" : "Mark implemented"}
              </button>
            : null}

            {onSendEmail ?
              <button
                type="button"
                disabled={busy || emailBusy || !rec.roleEmailConfigured}
                onClick={onSendEmail}
                title={
                  rec.roleEmailConfigured ?
                    undefined
                  : `Configure an email for ${rec.assignedRoleLabel} in Admin → Assign role emails`
                }
                className={cn(
                  "inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-teal/40 bg-teal/10 px-2.5 py-2",
                  "text-xs font-semibold text-teal-dark transition-colors",
                  "hover:border-teal hover:bg-teal/15 disabled:cursor-not-allowed disabled:opacity-50"
                )}
              >
                <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {emailBusy ? "Sending…" : "Send email"}
              </button>
            : null}

            <div className="grid grid-cols-2 gap-1.5">
              <button type="button" onClick={onToggleExpand} className={actionBtnSecondary}>
                {expanded ? "Hide" : "Details"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={onDismiss}
                className={cn(actionBtnSecondary, "hover:border-red hover:bg-red-light-6 hover:text-red-dark")}
              >
                Dismiss
              </button>
            </div>
          </div>

          {onSendEmail && !rec.roleEmailConfigured ?
            <p className="mt-1.5 text-[10px] leading-snug text-dark-4">
              Configure email for {rec.assignedRoleLabel} in Admin.
            </p>
          : null}

          <div
            className="mt-3 flex items-center gap-2 rounded-lg border border-gray-3 bg-gray-1 px-2.5 py-1.5"
            aria-label={`AI confidence ${confPct} percent`}
          >
            <div className="min-w-0 flex-1">
              <span className="text-[9px] font-bold uppercase tracking-wide text-dark-4">Confidence</span>
              <span className="ml-1.5 text-sm font-extrabold tabular-nums text-dark">{confPct}%</span>
              <div className="mt-1 h-0.5 overflow-hidden rounded-sm bg-gray-3">
                <div
                  className={cn("h-full rounded-sm", confidenceBarFillClass(confTier))}
                  style={{ width: `${confPct}%` }}
                />
              </div>
            </div>
          </div>
        </aside>

        {/* Recommendation content */}
        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          <div className={recommendationPanelClass}>
            <div className="mb-2 flex items-start justify-between gap-3">
              <span className="inline-flex shrink-0 items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-dark-3">
                <span className="h-1.5 w-1.5 shrink-0 rounded-sm bg-teal" aria-hidden />
                Recommendation
              </span>
              <h3 className="max-w-[min(100%,20rem)] text-right text-sm font-bold leading-snug text-dark sm:text-[15px]">
                {rec.title}
              </h3>
            </div>
            <p
              className={cn(
                "text-sm leading-relaxed text-dark-3",
                !expanded && "line-clamp-4"
              )}
            >
              {rec.recommendation}
            </p>

            {expanded ?
              <div className="mt-3 border-t border-gray-2 pt-3">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-dark-3">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-orange" aria-hidden />
                  Analysis
                </span>
                <p className="mt-1.5 text-sm leading-relaxed text-dark-4">{rec.analyse}</p>
              </div>
            : null}
          </div>

          <div className="grid grid-cols-3 gap-1.5 rounded-lg border border-gray-2 bg-gray-1 px-2.5 py-2">
            <div className="text-center">
              <span className="text-[9px] font-bold uppercase tracking-wide text-dark-4">Revenue</span>
              <p className="text-xs font-bold tabular-nums text-teal-dark sm:text-sm">{rec.revenue}</p>
            </div>
            <div className="text-center">
              <span className="text-[9px] font-bold uppercase tracking-wide text-dark-4">ROI</span>
              <p className="text-xs font-bold text-orange sm:text-sm">{rec.roi}</p>
            </div>
            <div className="text-center">
              <span className="text-[9px] font-bold uppercase tracking-wide text-dark-4">Impact</span>
              <p className="text-xs font-bold text-dark sm:text-sm">{rec.impact}</p>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
