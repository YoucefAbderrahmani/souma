import { cn } from "@/lib/utils";

export const sellerHelperSection = "overflow-hidden bg-gray-2 py-10 sm:py-14 lg:py-16";

export const sellerHelperContainer = "mx-auto w-full max-w-[1170px] px-4 sm:px-8 xl:px-0";

export const sellerHelperStack = "flex flex-col gap-5 sm:gap-6";

export const sellerHelperGrid = {
  two: "grid grid-cols-1 gap-4 sm:grid-cols-2",
  three: "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3",
  four: "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4",
} as const;

export const sellerPanel = cn(
  "rounded-xl border border-gray-3 bg-white shadow-1 transition-[box-shadow,transform] duration-200",
  "hover:shadow-md"
);

export const sellerPanelPadding = "p-4 sm:p-5";

export const sellerPanelMuted = cn(
  "rounded-xl border border-gray-3 bg-gray-1 shadow-1",
  sellerPanelPadding
);

export const sellerAccentStrip = {
  orange: "border-l-4 border-l-orange",
  teal: "border-l-4 border-l-teal",
  yellow: "border-l-4 border-l-yellow",
  red: "border-l-4 border-l-red",
  dark: "border-l-4 border-l-dark",
} as const;

export const sellerInsightShell = "overflow-hidden rounded-lg border px-3 py-2 sm:px-4 sm:py-2.5";

export const sellerInsightRow = cn(
  sellerInsightShell,
  "flex min-h-11 items-start gap-3 sm:min-h-12 sm:gap-4"
);

export const sellerInsightTone = {
  attention: cn(sellerAccentStrip.orange, "border-orange/20 bg-orange/10"),
  risk: cn(sellerAccentStrip.red, "border-red-light-3 bg-red-light-6"),
  info: cn(sellerAccentStrip.teal, "border-teal/25 bg-teal/10"),
  guidance: cn(sellerAccentStrip.yellow, "border-yellow-light-1 bg-yellow-light-2"),
} as const;

export const sellerInsightBadge = {
  attention:
    "shrink-0 rounded-md bg-orange/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-orange-dark",
  risk:
    "shrink-0 rounded-md bg-red-light-4 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-dark",
  info:
    "shrink-0 rounded-md bg-teal/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-teal-dark",
  guidance:
    "shrink-0 rounded-md bg-yellow-light-3 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-yellow-dark-2",
} as const;

export const sellerHero = cn(
  "relative overflow-hidden rounded-xl border border-gray-3 bg-white shadow-1",
  "before:pointer-events-none before:absolute before:inset-0 before:bg-gradient-to-br before:from-orange/10 before:via-white before:to-orange/5 before:opacity-95"
);

export const sellerHeroInner =
  "relative z-[1] flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-6";

export const sellerNav = cn(
  "sticky top-2 z-20 flex flex-wrap items-center gap-4 rounded-[10px] border border-gray-3 bg-white px-4 py-4 shadow-1 sm:gap-5 sm:px-6 xl:gap-8"
);

export const sellerNavButton = (active: boolean) =>
  cn(
    "relative inline-flex items-center whitespace-nowrap py-1 font-medium text-custom-sm ease-out duration-200",
    "before:absolute before:bottom-0 before:left-0 before:h-0.5 before:rounded-b-[2px] before:bg-orange before:ease-out before:duration-200",
    active ? "text-orange before:w-full" : "text-dark before:w-0 hover:text-orange hover:before:w-full"
  );

export const sellerBadge = {
  live: "inline-flex items-center gap-1.5 rounded-full border border-orange/25 bg-orange/10 px-2.5 py-0.5 text-[11px] font-semibold text-orange-dark",
  muted:
    "inline-flex items-center gap-1.5 rounded-full border border-gray-3 bg-gray-1 px-2.5 py-0.5 text-[11px] font-semibold text-dark-4",
  warning:
    "inline-flex items-center gap-1.5 rounded-full border border-yellow-light-1 bg-yellow-light-2 px-2.5 py-0.5 text-[11px] font-semibold text-yellow-dark-2",
} as const;

export const sellerPlaceholder = cn(
  "rounded-lg border border-dashed border-gray-4 bg-gray-1 px-4 py-3 text-center text-custom-sm text-dark-4"
);

export const sellerTableWrap = "overflow-x-auto -mx-1 px-1";

export const sellerTable = "w-full min-w-[520px] text-left text-custom-sm";

export const sellerTableHead = "border-b border-gray-3 text-xs uppercase tracking-wide text-dark-4";

export const sellerTableRow =
  "border-b border-gray-2 text-dark-3 transition-colors last:border-0 hover:bg-gray-1";

export const sellerPrimaryButton = cn(
  "inline-flex items-center justify-center gap-1.5 rounded-md bg-orange px-3 py-1.5 text-xs font-semibold text-white",
  "ease-out duration-200 hover:bg-orange-dark disabled:cursor-not-allowed disabled:opacity-60"
);

export const sellerSecondaryButton = cn(
  "inline-flex items-center justify-center gap-1.5 rounded-md border border-gray-3 bg-gray-1 px-3 py-1.5 text-xs font-medium text-dark",
  "ease-out duration-200 hover:border-orange hover:bg-orange hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
);

export const sellerGhostButton = cn(
  "inline-flex items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-dark-4",
  "ease-out duration-200 hover:text-orange disabled:cursor-not-allowed disabled:opacity-60"
);

export const sellerToggleButton = (active: boolean) =>
  cn(
    "inline-flex items-center justify-center rounded-md border border-gray-3 px-2.5 py-1.5 text-xs font-medium ease-out duration-200",
    active ?
      "border-orange bg-orange text-white hover:bg-orange-dark"
    : "bg-gray-1 text-dark hover:border-orange hover:bg-orange hover:text-white"
  );

export const sellerIconButton = cn(
  "inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-3 bg-gray-1 text-dark",
  "ease-out duration-200 hover:border-orange hover:bg-orange hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
);

export const sellerSoftPanel = "rounded-lg border border-orange/20 bg-orange/10";

export const sellerSoftPanelHeading = "text-xs font-semibold uppercase tracking-wide text-orange-dark";
