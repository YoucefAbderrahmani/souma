"use client";

import { AlertTriangle, Shield } from "lucide-react";
import type { ConceptionSecurityIncident } from "@/types/conception-admin";
import { cn } from "@/lib/utils";
import {
  securityCardRootClass,
  securityDetailPanelClass,
  securityIconWrapClass,
  securityResolutionFromStatus,
  securityStatusBadgeClass,
} from "./seller-helper-security-card-utils";

export function SellerHelperSecurityCard({
  incident,
  actions,
  className,
}: {
  incident: ConceptionSecurityIncident;
  actions?: React.ReactNode;
  className?: string;
}) {
  const resolution = securityResolutionFromStatus(incident.status);

  return (
    <article className={cn(securityCardRootClass(resolution), className)}>
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:gap-4 sm:p-5">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
            securityIconWrapClass(resolution)
          )}
        >
          {resolution === "blocked" ?
            <Shield className="h-5 w-5" aria-hidden />
          : <AlertTriangle className="h-5 w-5" aria-hidden />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                securityStatusBadgeClass(resolution)
              )}
            >
              {incident.statusLabel}
            </span>
            <span
              className={cn(
                "rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                resolution === "blocked" ?
                  "border-red/40 bg-white text-red-dark"
                : "border-yellow-light-1 bg-white text-yellow-dark-2"
              )}
            >
              {incident.category} · {incident.riskScore}/100
            </span>
          </div>

          <h5 className="mt-2 text-base font-bold leading-snug text-dark">{incident.title}</h5>

          <div className={cn(securityDetailPanelClass(resolution), "mt-3")}>{incident.detail}</div>

          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-dark-4">
            <span>{incident.displayIdentity}</span>
            <span aria-hidden>•</span>
            <span>{incident.location}</span>
            <span aria-hidden>•</span>
            <span>{incident.timeAgoLabel}</span>
          </div>
        </div>

        {actions ?
          <div className="flex shrink-0 flex-col justify-center sm:w-[168px]">{actions}</div>
        : null}
      </div>
    </article>
  );
}

export {
  securityActionPrimaryClass,
  securityResolutionFromStatus,
} from "./seller-helper-security-card-utils";
