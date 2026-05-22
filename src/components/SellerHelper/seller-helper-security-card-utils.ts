import type { ConceptionSecurityIncident } from "@/types/conception-admin";
import { cn } from "@/lib/utils";

/** Open / unsolved incidents (monitoring, flagged) use yellow; blocked sessions use red. */
export type SecurityCardResolution = "open" | "blocked";

export function securityResolutionFromStatus(
  status: ConceptionSecurityIncident["status"]
): SecurityCardResolution {
  return status === "blocked" ? "blocked" : "open";
}

export function securityCardRootClass(resolution: SecurityCardResolution) {
  return cn(
    "relative overflow-hidden rounded-lg border bg-white shadow-1 transition-shadow duration-200 hover:shadow-md",
    resolution === "blocked" ?
      "border-red-light-3 border-l-[5px] border-l-red bg-red-light-6/60"
    : "border-yellow-light-1 border-l-[5px] border-l-yellow bg-yellow-light-4/70"
  );
}

export function securityStatusBadgeClass(resolution: SecurityCardResolution) {
  return resolution === "blocked" ?
      "bg-red text-white"
    : "bg-yellow-dark-2 text-white";
}

export function securityIconWrapClass(resolution: SecurityCardResolution) {
  return resolution === "blocked" ?
      "bg-red/15 text-red-dark"
    : "bg-yellow-light-3 text-yellow-dark-2";
}

export function securityActionPrimaryClass(resolution: SecurityCardResolution) {
  return cn(
    "inline-flex w-full min-h-[36px] items-center justify-center rounded-md px-3 py-2",
    "text-xs font-bold uppercase tracking-wide text-white transition-colors",
    "disabled:cursor-not-allowed disabled:opacity-60",
    resolution === "blocked" ?
      "bg-red hover:bg-red-dark"
    : "bg-yellow-dark-2 hover:bg-yellow-dark-2/90"
  );
}

export function securityBlockedRowClass() {
  return "border-l-4 border-l-red bg-red-light-6/40";
}
