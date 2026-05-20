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

      <header className="flex items-start justify-between gap-4 border-b border-gray-2 px-6 pb-4 pt-6">
        <div className="min-w-0 flex-1">
          <span
            className={cn(
              "mb-2.5 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide",
              priorityBadgeClass(rec.tier)
            )}
          >
            <PriorityIcon tier={rec.tier} />
            {rec.priority}
          </span>
          <h3 className="text-lg font-bold leading-snug tracking-tight text-dark">{rec.title}</h3>
        </div>

        <div
          className="flex shrink-0 flex-col items-center gap-1 rounded-lg border border-gray-3 bg-gray-1 px-3.5 py-2.5 text-center"
          aria-label={`AI confidence ${confPct} percent`}
        >
          <span className="text-[9px] font-bold uppercase tracking-wide text-dark-4">AI Confidence</span>
          <span className="text-[22px] font-extrabold leading-none tabular-nums text-dark">{confPct}%</span>
          <div className="mt-0.5 h-1 w-full overflow-hidden rounded-sm bg-gray-3">
            <div
              className={cn("h-full rounded-sm transition-all duration-250", confidenceBarFillClass(confTier))}
              style={{ width: `${confPct}%` }}
            />
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-5 px-6 py-5">
        <section className="flex flex-col gap-2">
          <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-dark-3">
            <span className="h-2 w-2 shrink-0 rounded-full bg-orange" aria-hidden />
            Analysis
          </span>
          <p className="text-sm leading-relaxed text-dark-4">{rec.analyse}</p>
        </section>

        <section className="flex flex-col gap-2">
          <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-dark-3">
            <span className="h-2 w-2 shrink-0 rounded-sm bg-teal" aria-hidden />
            Recommendation
          </span>
          <p className="text-sm font-medium leading-relaxed text-dark-3">{rec.recommendation}</p>
        </section>

        <p className="inline-flex flex-wrap items-center gap-1.5 text-xs text-dark-4">
          <span>Assigned to</span>
          <span className="rounded-full border border-gray-3 bg-white px-2.5 py-0.5 font-semibold text-dark">
            {rec.assignedRoleLabel}
          </span>
        </p>

        <div className="grid grid-cols-3 gap-3 rounded-lg border border-gray-2 bg-gray-1 p-4">
          <div className="flex flex-col gap-1 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wide text-dark-4">Est. Revenue</span>
            <span className="text-[15px] font-bold leading-tight tabular-nums text-teal-dark">{rec.revenue}</span>
          </div>
          <div className="flex flex-col gap-1 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wide text-dark-4">Est. ROI</span>
            <span className="text-[15px] font-bold leading-tight text-orange">{rec.roi}</span>
          </div>
          <div className="flex flex-col gap-1 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wide text-dark-4">Impact</span>
            <span className="text-[15px] font-bold leading-tight text-dark">{rec.impact}</span>
          </div>
        </div>

        {expanded ?
          <div className="rounded-lg border border-gray-3 bg-gray-1 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-dark-4">Full details</p>
            <p className="mt-2 text-sm leading-relaxed text-dark-4">{rec.analyse}</p>
            <p className="mt-3 text-sm leading-relaxed text-dark-3">{rec.recommendation}</p>
          </div>
        : null}
      </div>

      <footer className="mt-auto flex flex-col gap-3 border-t border-gray-2 px-6 pb-5 pt-4">
        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onImplement}
            className={cn(
              "inline-flex w-full items-center justify-center gap-2 rounded-lg px-5 py-3",
              "bg-orange text-sm font-bold uppercase tracking-wide text-white shadow-[0_2px_8px_rgba(242,122,26,0.35)]",
              "transition-all duration-150 hover:-translate-y-0.5 hover:bg-blue-dark hover:shadow-[0_6px_20px_rgba(242,122,26,0.45)]",
              "active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
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
                "inline-flex w-full items-center justify-center gap-2 rounded-lg border-[1.5px] border-teal/40 bg-teal/10 px-4 py-2.5",
                "text-sm font-semibold text-teal-dark transition-colors duration-150",
                "hover:border-teal hover:bg-teal/15 disabled:cursor-not-allowed disabled:opacity-50"
              )}
            >
              <Mail className="h-4 w-4 shrink-0" aria-hidden />
              <span className="min-w-0 text-center leading-snug">
                {emailBusy ?
                  "Sending…"
                : <>
                    <span className="block">Send email</span>
                    <span className="block text-xs font-medium text-teal-dark/80">
                      {rec.assignedRoleLabel}
                    </span>
                  </>
                }
              </span>
            </button>
          : null}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onToggleExpand}
              className={cn(
                "inline-flex min-h-[42px] items-center justify-center rounded-lg border-[1.5px] border-gray-3 bg-white px-3 py-2.5",
                "text-sm font-semibold text-dark-3 transition-colors duration-150",
                "hover:border-orange hover:bg-blue-light-5 hover:text-orange"
              )}
            >
              {expanded ? "Hide details" : "More details"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onDismiss}
              className={cn(
                "inline-flex min-h-[42px] items-center justify-center rounded-lg border-[1.5px] border-gray-3 bg-white px-3 py-2.5",
                "text-sm font-semibold text-dark-4 transition-colors duration-150",
                "hover:border-red hover:bg-red-light-6 hover:text-red-dark disabled:cursor-not-allowed disabled:opacity-60"
              )}
            >
              Dismiss
            </button>
          </div>
        </div>

        {onSendEmail && !rec.roleEmailConfigured ?
          <p className="text-center text-[11px] leading-snug text-dark-4">
            Set a recipient for <span className="font-semibold text-dark">{rec.assignedRoleLabel}</span> in
            Admin → Assign role emails.
          </p>
        : null}

        <div
          className={cn(
            "flex items-start gap-2.5 rounded-md border-l-[3px] px-3.5 py-3 text-xs leading-relaxed text-dark-4",
            implementationTimeClass(rec.tier)
          )}
        >
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-dark-4" aria-hidden />
          <span>
            <span className="font-semibold text-dark-3">Implementation: </span>
            {rec.implementation}
          </span>
        </div>
      </footer>
    </article>
  );
}
