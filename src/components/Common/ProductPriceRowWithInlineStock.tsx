"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Full-width wrapper for the primary price line (Vitrina + timer or list price). Stock is shown beside stars (`ProductCardStarsRowWithStock` / inline `ProductAvailableQuantity`).
 */
export function ProductPriceRowWithInlineStock({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("w-full min-w-0 max-w-full", className)}>{children}</div>;
}
