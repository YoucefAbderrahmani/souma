"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Keeps panel mounted after first visit; inactive panels use `hidden` (instant toggle, no layout bleed).
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
      className={cn(!active && "hidden")}
      aria-hidden={!active}
      inert={!active ? true : undefined}
    >
      {children}
    </div>
  );
}
