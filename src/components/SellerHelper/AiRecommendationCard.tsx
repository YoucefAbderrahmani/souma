"use client";

import { AlertTriangle, Check, ChevronDown, Clock, Info, Mail, Zap } from "lucide-react";
import type { ConceptionRecommendationDto } from "@/types/conception-admin";
import { cn } from "@/lib/utils";
import {
  aiRecAnimationStyle,
  aiRecommendationCardRootClass,
  confidenceBarFillClass,
  confidenceTier,
  implementationTimeClass,
  priorityBadgeClass,
  priorityTopStripClass,
  type AiRecommendationCardModel,
} from "./ai-recommendation-card-utils";

function PriorityIcon({ tier }: { tier: ConceptionRecommendationDto["priority"] }) {
  const className = "h-3.5 w-3.5 shrink-0";
  if (tier === "critical") return <AlertTriangle className={className} aria-hidden />;
  if (tier === "high") return <Zap className={className} aria-hidden />;
  if (tier === "medium") return <Info className={className} aria-hidden />;
  return <ChevronDown className={className} aria-hidden />;
}

const actionBtnSecondary = cn(
  "inline-flex min-h-[38px] w-full items-center justify-center rounded-lg border-[1.5px] border-gray-3 bg-white px-3 py-2",
  "text-sm font-semibold transition-colors duration-150",
  "hover:border-orange hover:bg-orange/5 hover:text-orange",
  "disabled:cursor-not-allowed disabled:opacity-60"
);

const textPanelClass =
  "flex min-h-[11.5rem] flex-col gap-2 rounded-lg border border-gray-2 bg-gray-1/60 p-3.5 sm:min-h-[12rem] sm:p-4";

export function AiRecommendationCard({
  rec,
  animationIndex,
  expanded,
  busy,
  onToggleExpand,
  onImplement,
  onDismiss,
  onSendEmail,
  emailBusy,
}: {
  rec: AiRecommendationCardModel;
  animationIndex: number;
  expanded: boolean;
  busy: boolean;
  emailBusy?: boolean;
  onToggleExpand: () => void;
  onImplement: () => void;
  onDismiss: () => void;
  onSendEmail?: () => void;
}) {
  const confTier = confidenceTier(rec.confidence);
  const confPct = Math.min(100, Math.max(0, rec.confidence));

  return (
    <article
      className={aiRecommendationCardRootClass(rec.tier)}
      style={aiRecAnimationStyle(animationIndex)}
    >
      <div className={cn("absolute left-0 right-0 top-0 z-[2] h-1", priorityTopStripClass(rec.tier))} />

      <div className="flex flex-col gap-5 p-5 pt-6 sm:gap-6 sm:p-6 lg:flex-row lg:items-stretch lg:gap-6">
        {/* Title + actions (left rail) */}
        <aside className="flex shrink-0 flex-col border-gray-2 pb-2 lg:w-[252px] lg:border-b-0 lg:border-r lg:pb-0 lg:pr-6 xl:w-[268px]">
          <span
            className={cn(
              "mb-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide",
              priorityBadgeClass(rec.tier)
            )}
          >
            <PriorityIcon tier={rec.tier} />
            {rec.priority}
          </span>
          <h3 className="text-base font-bold leading-snug tracking-tight text-dark sm:text-lg">{rec.title}</h3>
          <p className="mt-2 inline-flex flex-wrap items-center gap-1.5 text-xs text-dark-4">
            <span>Assigned to</span>
            <span className="rounded-full border border-gray-3 bg-white px-2.5 py-0.5 font-semibold text-dark">
              {rec.assignedRoleLabel}
            </span>
          </p>

          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={onImplement}
              className={cn(
                "inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5",
                "bg-orange text-sm font-bold uppercase tracking-wide text-white shadow-[0_2px_8px_rgba(242,122,26,0.35)]",
                "transition-all duration-150 hover:bg-orange-dark",
                "disabled:cursor-not-allowed disabled:opacity-60"
              )}
            >
              <Check className="h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden />
              Implement
            </button>

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
                  "inline-flex w-full items-center justify-center gap-2 rounded-lg border-[1.5px] border-teal/40 bg-teal/10 px-3 py-2",
                  "text-sm font-semibold text-teal-dark transition-colors",
                  "hover:border-teal hover:bg-teal/15 disabled:cursor-not-allowed disabled:opacity-50"
                )}
              >
                <Mail className="h-4 w-4 shrink-0" aria-hidden />
                {emailBusy ? "Sending…" : "Send email"}
              </button>
            : null}

            <div className="grid grid-cols-2 gap-2">
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
            <p className="mt-2 text-[10px] leading-snug text-dark-4">
              Configure email for {rec.assignedRoleLabel} in Admin.
            </p>
          : null}

          <div
            className="mt-4 flex w-full flex-col items-center gap-1 rounded-lg border border-gray-3 bg-gray-1 px-3 py-2 text-center"
            aria-label={`AI confidence ${confPct} percent`}
          >
            <span className="text-[9px] font-bold uppercase tracking-wide text-dark-4">AI Confidence</span>
            <span className="text-lg font-extrabold leading-none tabular-nums text-dark">{confPct}%</span>
            <div className="h-1 w-full overflow-hidden rounded-sm bg-gray-3">
              <div
                className={cn("h-full rounded-sm transition-all duration-250", confidenceBarFillClass(confTier))}
                style={{ width: `${confPct}%` }}
              />
            </div>
          </div>

          <div
            className={cn(
              "mt-3 flex items-start gap-2 rounded-md border-l-[3px] px-3 py-2.5 text-xs leading-relaxed text-dark-4",
              implementationTimeClass(rec.tier)
            )}
          >
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-dark-4" aria-hidden />
            <span>
              <span className="font-semibold text-dark-3">Implementation: </span>
              {rec.implementation}
            </span>
          </div>
        </aside>

        {/* Analysis + recommendation (uses remaining width) */}
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
            <section className={textPanelClass}>
              <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-dark-3">
                <span className="h-2 w-2 shrink-0 rounded-full bg-orange" aria-hidden />
                Analysis
              </span>
              <p
                className={cn(
                  "flex-1 text-sm leading-[1.7] text-dark-4",
                  !expanded && "line-clamp-[7]"
                )}
              >
                {rec.analyse}
              </p>
            </section>
            <section className={textPanelClass}>
              <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-dark-3">
                <span className="h-2 w-2 shrink-0 rounded-sm bg-teal" aria-hidden />
                Recommendation
              </span>
              <p
                className={cn(
                  "flex-1 text-sm font-medium leading-[1.7] text-dark-3",
                  !expanded && "line-clamp-[7]"
                )}
              >
                {rec.recommendation}
              </p>
            </section>
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-lg border border-gray-2 bg-gray-1 p-3 sm:gap-3 sm:p-3.5">
            <div className="flex flex-col gap-0.5 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wide text-dark-4">Est. Revenue</span>
              <span className="text-sm font-bold leading-tight tabular-nums text-teal-dark sm:text-[15px]">
                {rec.revenue}
              </span>
            </div>
            <div className="flex flex-col gap-0.5 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wide text-dark-4">Est. ROI</span>
              <span className="text-sm font-bold leading-tight text-orange sm:text-[15px]">{rec.roi}</span>
            </div>
            <div className="flex flex-col gap-0.5 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wide text-dark-4">Impact</span>
              <span className="text-sm font-bold leading-tight text-dark sm:text-[15px]">{rec.impact}</span>
            </div>
          </div>

          {expanded ?
            <div className="rounded-lg border border-gray-3 bg-gray-1 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-dark-4">Full details</p>
              <p className="mt-2 text-sm leading-[1.7] text-dark-4">{rec.analyse}</p>
              <p className="mt-3 text-sm leading-[1.7] text-dark-3">{rec.recommendation}</p>
            </div>
          : null}
        </div>
      </div>
    </article>
  );
}
