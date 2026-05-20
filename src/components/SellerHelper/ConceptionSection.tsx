"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Keeps section trees mounted after first visit so tab switches stay instant.
 * Inactive sections are hidden (not unmounted).
 */
/** Shared keep-alive panel for Seller Helper + admin tabs */
export function KeepAlivePanel({
  active,
  mounted,
  sectionId,
  children,
}: {
  active: boolean;
  mounted: boolean;
  sectionId: string;
  children: ReactNode;
}) {
  if (!mounted) return null;

  return (
    <div
      id={sectionId}
      className={cn(!active && "hidden")}
      aria-hidden={!active}
      inert={!active ? true : undefined}
    >
      {children}
    </div>
  );
}

export function ConceptionSection(props: {
  active: boolean;
  mounted: boolean;
  sectionId: string;
  children: ReactNode;
}) {
  return <KeepAlivePanel {...props} />;
}
