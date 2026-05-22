import type { ConceptionAlertDto } from "@/types/conception-admin";
import { cn } from "@/lib/utils";

export function alertCardRootClass(tier: ConceptionAlertDto["severity"]) {
  return cn(
    "relative overflow-hidden rounded-lg border border-gray-3 bg-white shadow-1",
    "transition-shadow duration-200 hover:shadow-md",
    alertCardSurfaceClass(tier)
  );
}

export function alertCardSurfaceClass(tier: ConceptionAlertDto["severity"]) {
  if (tier === "critical") return "border-l-[5px] border-l-red bg-red-light-6/50";
  if (tier === "high") return "border-l-[5px] border-l-orange bg-orange/10";
  if (tier === "medium") return "border-l-[5px] border-l-yellow bg-yellow-light-4/80";
  return "border-l-[5px] border-l-gray-4 bg-gray-1";
}

export function alertSeverityBadgeClass(tier: ConceptionAlertDto["severity"]) {
  if (tier === "critical") return "bg-red text-white";
  if (tier === "high") return "bg-orange text-white";
  if (tier === "medium") return "bg-yellow-dark-2 text-white";
  return "bg-gray-5 text-white";
}

export function alertIconWrapClass(tier: ConceptionAlertDto["severity"]) {
  if (tier === "critical") return "bg-red/15 text-red-dark";
  if (tier === "high") return "bg-orange/15 text-orange-dark";
  if (tier === "medium") return "bg-yellow-light-3 text-yellow-dark-2";
  return "bg-gray-2 text-dark-4";
}

export const alertBodyPanelClass =
  "rounded-md border border-dashed border-gray-3 bg-gray-1/70 px-3 py-2.5 text-sm leading-relaxed text-dark-3";

export const alertActionPrimaryClass = cn(
  "inline-flex min-h-[36px] items-center justify-center rounded-md px-4 py-2",
  "bg-dark text-xs font-bold uppercase tracking-wide text-white",
  "transition-colors hover:bg-dark-2 disabled:cursor-not-allowed disabled:opacity-60"
);

export const alertActionSecondaryClass = cn(
  "inline-flex min-h-[36px] items-center justify-center rounded-md border border-gray-3 bg-white px-4 py-2",
  "text-xs font-semibold text-dark-3 transition-colors",
  "hover:border-dark hover:text-dark disabled:cursor-not-allowed disabled:opacity-60"
);
