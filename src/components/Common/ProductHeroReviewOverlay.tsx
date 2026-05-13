"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ProductHeroReviewSnippet } from "@/components/Common/ProductHeroReviewSnippet";
import { readHeroReviewSnippetFromDescription } from "@/lib/vitrina-merchandising";

export function ProductHeroReviewOverlay({
  productId,
  description,
  className = "",
  variant = "default",
  deferUntilVisible = true,
}: {
  productId: number;
  description?: string;
  className?: string;
  variant?: "default" | "storefront";
  /**
   * When true, defers the merchandising API call until the card is near the viewport
   * so image bytes are not competing with many parallel `/api/catalog/merchandising` requests.
   */
  deferUntilVisible?: boolean;
}) {
  const fromDescription = useMemo(() => {
    const raw = readHeroReviewSnippetFromDescription(description)?.trim();
    return raw && raw.length > 0 ? raw : null;
  }, [description]);

  if (fromDescription) {
    return (
      <ProductHeroReviewSnippet
        snippet={fromDescription}
        className={className}
        variant={variant}
      />
    );
  }

  const [snippet, setSnippet] = useState<string | null>(null);
  const [allowFetch, setAllowFetch] = useState(!deferUntilVisible);
  const sentinelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (allowFetch) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setAllowFetch(true);
          io.disconnect();
        }
      },
      { rootMargin: "360px 0px", threshold: 0.01 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [allowFetch]);

  useEffect(() => {
    if (!allowFetch) return;

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
  }, [allowFetch, productId]);

  if (snippet) {
    return (
      <ProductHeroReviewSnippet snippet={snippet} className={className} variant={variant} />
    );
  }

  if (!deferUntilVisible || allowFetch) {
    return null;
  }

  return (
    <span
      ref={sentinelRef}
      className="pointer-events-none absolute inset-x-0 bottom-0 z-[12] h-3"
      aria-hidden
    />
  );
}
