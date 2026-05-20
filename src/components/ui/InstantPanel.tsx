"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Keeps panel mounted after first visit; switching active only toggles visibility (no remount).
 */
export function InstantPanel({
  active,
  mounted,
  panelId,
  children,
}: {
  active: boolean;
  mounted: boolean;
  panelId: string;
  children: ReactNode;
}) {
  if (!mounted) return null;

  return (
    <div
      id={panelId}
      className={cn(
        active ?
          "relative z-[1] block w-full opacity-100"
        : "pointer-events-none invisible absolute left-0 top-0 z-0 h-0 w-0 overflow-hidden opacity-0"
      )}
      aria-hidden={!active}
      inert={!active ? true : undefined}
    >
      {children}
    </div>
  );
}
