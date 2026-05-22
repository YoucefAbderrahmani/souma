"use client";

import React, { useCallback, useMemo, useState } from "react";
import {
  APPLIED_ACTION_KIND_META,
  type AppliedActionDto,
} from "@/types/seller-helper-timeline";
import { readJsonResponse } from "@/lib/admin-api-response";
import { cn } from "@/lib/utils";
import { AppliedActionDetailsModal } from "./AppliedActionDetailsModal";
import {
  sellerGhostButton,
  sellerPanel,
  sellerPanelPadding,
  sellerPlaceholder,
  sellerSecondaryButton,
} from "./layout";
import { ClipboardList, Mail, RotateCcw, Undo2 } from "lucide-react";

function formatLogTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function ConversionImpactBadge({ action }: { action: AppliedActionDto }) {
  const impact = action.conversionImpact;
  if (!impact) {
    return (
      <span className="text-[10px] text-dark-4" title="Not enough analytics yet">
        Conv. —
      </span>
    );
  }

  const delta = impact.deltaPctPoints;
  const deltaLabel =
    delta == null ?
      `${impact.rateSincePct.toFixed(2)}%`
    : `${delta >= 0 ? "+" : ""}${delta.toFixed(2)} pts`;

  const tone =
    delta == null ? "text-dark-4"
    : delta > 0.05 ? "text-teal-dark"
    : delta < -0.05 ? "text-red-dark"
    : "text-dark-3";

  return (
    <span
      className={cn("inline-flex flex-col items-end text-[10px] leading-tight tabular-nums", tone)}
      title={`${impact.sampleLabel}: ${impact.rateSincePct.toFixed(2)}% (${impact.purchasesSince}/${impact.viewsSince} purchases/views) vs prior window ${impact.rateBeforePct.toFixed(2)}%`}
    >
      <span className="font-semibold">{deltaLabel}</span>
      <span className="text-dark-4">{impact.sampleLabel}</span>
    </span>
  );
}

type TimelineLogsSectionProps = {
  actions: AppliedActionDto[];
  loading?: boolean;
  onRefreshTimeline?: () => void;
};

export function TimelineLogsSection({
  actions,
  loading,
  onRefreshTimeline,
}: TimelineLogsSectionProps) {
  const [activeAction, setActiveAction] = useState<AppliedActionDto | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...actions].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
    [actions]
  );

  const runAction = useCallback(
    async (actionId: string, endpoint: string, confirmText?: string) => {
      if (confirmText && !window.confirm(confirmText)) return;
      setBusyId(actionId);
      setMessage(null);
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ actionId }),
        });
        const body = await readJsonResponse<{ ok?: boolean; message?: string; error?: string }>(
          response,
          "Seller Helper log action"
        );
        if (!response.ok || body.ok === false) {
          throw new Error(body.message || body.error || "Action failed.");
        }
        setMessage(body.message ?? "Done.");
        onRefreshTimeline?.();
      } catch (cause) {
        setMessage(cause instanceof Error ? cause.message : String(cause));
      } finally {
        setBusyId(null);
      }
    },
    [onRefreshTimeline]
  );

  return (
    <div className={cn(sellerPanel, sellerPanelPadding, "space-y-4")}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h4 className="inline-flex items-center gap-2 text-base font-semibold text-dark">
            <ClipboardList className="h-4 w-4 text-orange" aria-hidden />
            Activity log
          </h4>
        </div>
        <span className="text-xs font-medium text-dark-4 tabular-nums">
          {sorted.length} {sorted.length === 1 ? "entry" : "entries"}
        </span>
      </div>

      {message ?
        <p
          className={cn(
            "rounded-lg border px-3 py-2 text-custom-sm",
            message.toLowerCase().includes("fail") || message.toLowerCase().includes("error") ?
              "border-red-light-3 bg-red-light-6 text-red-dark"
            : "border-teal/25 bg-teal/10 text-teal-dark"
          )}
        >
          {message}
        </p>
      : null}

      {loading && sorted.length === 0 ?
        <p className={sellerPlaceholder}>Loading log…</p>
      : sorted.length === 0 ?
        <p className={sellerPlaceholder}>
          No Seller Helper actions in this time range yet. Apply a Vitrina quick fix, resolve an alert, or mark a
          recommendation to see entries here.
        </p>
      : <ul className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
          {sorted.map((action) => {
            const meta = APPLIED_ACTION_KIND_META[action.kind];
            const isBusy = busyId === action.id;

            return (
              <li
                key={action.id}
                className="rounded-lg border border-gray-3 bg-white px-3 py-2.5 sm:px-4 sm:py-3"
              >
                <div className="flex flex-wrap items-start gap-3 gap-y-2">
                  <span
                    className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[11px] font-bold text-white"
                    style={{ backgroundColor: meta.color }}
                    aria-hidden
                  >
                    {meta.label[0]}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <button
                        type="button"
                        onClick={() => setActiveAction(action)}
                        className="text-left text-sm font-semibold text-dark hover:text-orange"
                      >
                        {action.title}
                      </button>
                      <time className="shrink-0 text-[11px] text-dark-4" dateTime={action.occurredAt}>
                        {formatLogTime(action.occurredAt)}
                      </time>
                    </div>
                    <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-dark-4">
                      {meta.label}
                      {action.productTitle ? ` · ${action.productTitle}` : " · Store-wide"}
                    </p>
                    {action.summary ?
                      <p className="mt-1 line-clamp-2 text-xs text-dark-3">{action.summary}</p>
                    : null}
                  </div>

                  <ConversionImpactBadge action={action} />
                </div>

                <div className="mt-2.5 flex flex-wrap gap-2 border-t border-gray-3 pt-2.5">
                  <button
                    type="button"
                    onClick={() => setActiveAction(action)}
                    className={sellerGhostButton}
                  >
                    Details
                  </button>

                  {action.canRevertToChokepoint ?
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() =>
                        void runAction(
                          action.id,
                          "/api/admin/seller-helper/applied-actions/revert",
                          "Revert this entry to the state saved at the last chokepoint?"
                        )
                      }
                      className={sellerSecondaryButton}
                    >
                      <Undo2 className={cn("h-3.5 w-3.5", isBusy && "animate-pulse")} aria-hidden />
                      {isBusy ? "Reverting…" : "Revert to chokepoint"}
                    </button>
                  : null}

                  {action.canResetToDefault ?
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() =>
                        void runAction(
                          action.id,
                          "/api/admin/seller-helper/applied-actions/reset-default",
                          "Reset this product to default Vitrina merchandising (clears promo price and quick-fix fields)?"
                        )
                      }
                      className={sellerGhostButton}
                    >
                      <RotateCcw className={cn("h-3.5 w-3.5", isBusy && "animate-spin")} aria-hidden />
                      Reset to default
                    </button>
                  : null}

                  {action.canRequestRevertEmail ?
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() =>
                        void runAction(
                          action.id,
                          "/api/admin/seller-helper/applied-actions/request-revert-email",
                          "Send an LLM-drafted email asking the assigned role to revert these recommendation changes?"
                        )
                      }
                      className={sellerSecondaryButton}
                    >
                      <Mail className={cn("h-3.5 w-3.5", isBusy && "animate-pulse")} aria-hidden />
                      {isBusy ? "Sending…" : "Email revert request"}
                    </button>
                  : null}
                </div>
              </li>
            );
          })}
        </ul>
      }

      <AppliedActionDetailsModal
        action={activeAction}
        onClose={() => setActiveAction(null)}
      />
    </div>
  );
}
