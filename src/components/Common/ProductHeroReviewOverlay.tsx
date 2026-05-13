"use client";

import { useEffect, useMemo, useState } from "react";
import { ProductHeroReviewSnippet } from "@/components/Common/ProductHeroReviewSnippet";
import { readHeroReviewSnippetFromDescription } from "@/lib/vitrina-merchandising";

export function ProductHeroReviewOverlay({
  productId,
  description,
  className = "",
  variant = "default",
}: {
  productId: number;
  description?: string;
  className?: string;
  variant?: "default" | "storefront";
}) {
  const [snippet, setSnippet] = useState<string | null>(null);
  const fromDescription = useMemo(
    () => readHeroReviewSnippetFromDescription(description),
    [description]
  );

  useEffect(() => {
    if (fromDescription) {
      setSnippet(fromDescription);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/catalog/merchandising?ids=${Math.trunc(productId)}`, {
          cache: "no-store",
        });
        if (!res.ok) return;

        const body = (await res.json()) as { snippets?: Record<string, string> };
        const value = body.snippets?.[String(productId)];
        if (!cancelled && typeof value === "string" && value.trim()) {
          setSnippet(value.trim());
        }
      } catch {
        // Keep the card usable when merchandising lookup fails.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fromDescription, productId]);

  const visible = fromDescription ?? snippet;
  if (!visible) return null;

  return <ProductHeroReviewSnippet snippet={visible} className={className} variant={variant} />;
}
