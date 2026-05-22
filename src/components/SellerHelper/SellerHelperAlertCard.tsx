"use client";

import { Bell, Clock, Users } from "lucide-react";
import type { ConceptionAlertDto } from "@/types/conception-admin";
import { cn } from "@/lib/utils";
import {
  alertActionPrimaryClass,
  alertActionSecondaryClass,
  alertBodyPanelClass,
  alertCardRootClass,
  alertIconWrapClass,
  alertSeverityBadgeClass,
} from "./seller-helper-alert-card-utils";

export function SellerHelperAlertCard({
  tier,
  severityLabel,
  title,
  description,
  detail,
  statusLabel,
  statusActive,
  timeAgo,
  affected,
  actions,
  className,
}: {
  tier: ConceptionAlertDto["severity"];
  severityLabel: string;
  title: string;
  description: string;
  detail?: string;
  statusLabel: string;
  statusActive?: boolean;
  timeAgo: string;
  affected: string;
  actions: React.ReactNode;
  className?: string;
}) {
  return (
    <article className={cn(alertCardRootClass(tier), className)}>
      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start gap-3">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
              alertIconWrapClass(tier)
            )}
          >
            <Bell className="h-5 w-5" aria-hidden />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                  alertSeverityBadgeClass(tier)
                )}
              >
                {severityLabel}
              </span>
              <span
                className={cn(
                  "rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                  statusActive ?
                    "border-red bg-white text-red-dark"
                  : "border-gray-4 bg-white text-dark-4"
                )}
              >
                {statusLabel}
              </span>
            </div>

            <h5 className="mt-2 text-base font-bold leading-snug text-dark">{title}</h5>

            <div className={cn(alertBodyPanelClass, "mt-3")}>{description}</div>

            {detail ?
              <p className="mt-2 text-custom-sm leading-relaxed text-dark-4">{detail}</p>
            : null}

            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-gray-2 pt-3 text-xs text-dark-4">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {timeAgo}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {affected}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-2 pt-4">{actions}</div>
      </div>
    </article>
  );
}

export { alertActionPrimaryClass, alertActionSecondaryClass };
