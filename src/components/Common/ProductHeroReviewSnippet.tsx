import React from "react";
import { cn } from "@/lib/utils";

/** Storefront: anchored to image frame; slides right + fades on `group` hover (see `ProductCatalogImageWithMerch`). */
const STOREFRONT_SNIPPET_CLASS =
  "inset-x-0 bottom-0 z-20 rounded-none rounded-b-lg px-2 py-1 text-[10px] leading-tight opacity-100 transition-[transform,opacity] duration-150 ease-linear group-hover:translate-x-full group-hover:opacity-0 sm:inset-x-0 sm:bottom-0 sm:px-2 sm:py-1.5 sm:text-[11px]";

export function ProductHeroReviewSnippet({
  snippet,
  className = "",
  variant = "default",
}: {
  snippet: string;
  className?: string;
  variant?: "default" | "storefront";
}) {
  const text = snippet.trim();
  if (!text) return null;

  return (
      <div
        className={cn(
          "pointer-events-none absolute bg-dark/75 text-left font-medium text-white shadow-1",
          variant === "storefront" ?
            STOREFRONT_SNIPPET_CLASS
          : "inset-x-3 bottom-3 z-40 rounded-md px-3 py-2 text-custom-sm leading-snug sm:inset-x-4 sm:bottom-4",
          className
        )}
      >
        <span className="block w-full min-w-0 truncate whitespace-nowrap">{text}</span>
      </div>
  );
}
