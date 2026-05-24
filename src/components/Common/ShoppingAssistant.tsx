"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDispatch } from "react-redux";
import shopData from "@/components/Shop/shopData";
import { updateproductDetails } from "@/redux/features/product-details";
import { useAppSelector } from "@/redux/store";
import { usePriceMode } from "@/app/context/PriceModeContext";
import { useCartModalContext } from "@/app/context/CartSidebarModalContext";
import { sequenceStartProduct } from "@/lib/sequence-client";
import { productDetailsHref } from "@/lib/product-page-link";
import { parseProductContent } from "@/lib/product-content";
import { buildProductAssistantContext } from "@/lib/product-assistant-context";
import {
  answerProductQuestionLocal,
  detectLocalAnswerLocale,
  PRODUCT_PAGE_SUGGESTED_QUESTIONS,
  STORE_SUGGESTED_QUESTIONS,
  type LocalAnswerLocale,
} from "@/lib/shopping-assistant-local-answers";
import {
  formatProductAvailableQuantity,
  productAvailableQuantity,
} from "@/components/Common/ProductAvailableQuantity";
import { useLiveProductInventory } from "@/hooks/useLiveProductInventory";
import type { Product } from "@/types/product";

const ASSISTANT_BROWSER_SESSION_KEY = "sq_browser_session";

function getAssistantBrowserSessionId() {
  if (typeof window === "undefined") return "";
  try {
    const id = window.localStorage.getItem(ASSISTANT_BROWSER_SESSION_KEY);
    return id && id.length >= 8 ? id : "";
  } catch {
    return "";
  }
}

function hasDisplayableProduct(product: Product | null | undefined) {
  return Boolean(product?.title);
}

const ShoppingAssistant = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState("");
  const [recommendations, setRecommendations] = useState<typeof shopData>([]);
  const [bundle, setBundle] = useState<typeof shopData>([]);
  const [loading, setLoading] = useState(false);
  const [lastRequestId, setLastRequestId] = useState("");
  const [lastSubmittedQuery, setLastSubmittedQuery] = useState("");
  const [lastNormalizedQuery, setLastNormalizedQuery] = useState("");
  const [answerLocale, setAnswerLocale] = useState<LocalAnswerLocale>("en");

  const { mode } = usePriceMode();
  const { isCartModalOpen } = useCartModalContext();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dispatch = useDispatch();

  const isEmbed =
    searchParams.get("embed") === "1" || searchParams.get("heatmapPreview") === "1";
  const isProductPage = pathname === "/shop-details";
  const productFromRedux = useAppSelector((state) => state.productDetailsReducer.value);

  const product = useMemo(() => {
    if (!isProductPage) return null;
    if (hasDisplayableProduct(productFromRedux)) return productFromRedux;
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem("productDetails");
      return raw ? (JSON.parse(raw) as Product) : null;
    } catch {
      return null;
    }
  }, [isProductPage, productFromRedux]);

  const productFocus = isProductPage && hasDisplayableProduct(product);

  const { instock: liveInstock } = useLiveProductInventory(
    productFocus ? product!.id : null,
    product?.instock ?? null,
    { enabled: productFocus }
  );

  const availabilityLabel = useMemo(() => {
    if (!productFocus || !product) return "";
    const availableQuantity = liveInstock ?? productAvailableQuantity(product);
    return availableQuantity != null
      ? formatProductAvailableQuantity(Math.max(0, Math.trunc(availableQuantity)))
      : "Stock status unavailable";
  }, [liveInstock, product, productFocus]);

  const parsedContent = useMemo(
    () => (productFocus && product ? parseProductContent(product.description) : null),
    [product, productFocus]
  );

  const assistantContext = useMemo(() => {
    if (!productFocus || !product) return undefined;
    return buildProductAssistantContext(product, availabilityLabel, mode);
  }, [availabilityLabel, mode, product, productFocus]);

  useEffect(() => {
    if (isCartModalOpen) setOpen(false);
  }, [isCartModalOpen]);

  useEffect(() => {
    setOpen(false);
    setResponse("");
    setRecommendations([]);
    setBundle([]);
    setQuery("");

    if (!productFocus) return;

    const timer = window.setTimeout(() => setOpen(true), 15000);
    return () => window.clearTimeout(timer);
  }, [productFocus, product?.id]);

  const openDetails = useCallback(
    (item: (typeof shopData)[number], position: number) => {
      if (lastRequestId) {
        fetch("/api/assistant/telemetry", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(getAssistantBrowserSessionId()
              ? { "X-Sequence-Session": getAssistantBrowserSessionId() }
              : {}),
          },
          body: JSON.stringify({
            eventType: "result_click",
            requestId: lastRequestId,
            mode,
            rawQuery: lastSubmittedQuery,
            normalizedQuery: lastNormalizedQuery,
            productId: item.id,
            position,
          }),
        }).catch(() => {});
      }

      if (typeof window !== "undefined") {
        window.localStorage.setItem("productDetails", JSON.stringify(item));
      }
      dispatch(updateproductDetails(item));
      sequenceStartProduct(item.title);
      router.push(productDetailsHref(item.id));
    },
    [dispatch, lastNormalizedQuery, lastRequestId, lastSubmittedQuery, mode, router]
  );

  const submitQuery = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      setLastSubmittedQuery(trimmed);
      setAnswerLocale(detectLocalAnswerLocale(trimmed));
      setLoading(true);

      if (productFocus && product && parsedContent) {
        const localAnswer = answerProductQuestionLocal({
          rawQuery: trimmed,
          parsedContent,
          availabilityLabel,
          detailPrice: product.detailPrice,
          jomlaPrice: product.jomlaPrice,
        });
        if (localAnswer) {
          setResponse(localAnswer);
          setRecommendations([]);
          setBundle([]);
          setLoading(false);
          return;
        }
      }

      try {
        const res = await fetch("/api/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: trimmed,
            mode,
            ...(assistantContext ? { contextProduct: assistantContext } : {}),
          }),
        });

        const data = (await res.json()) as {
          message?: string;
          products?: typeof shopData;
          requestId?: string;
          normalizedQuery?: string;
        };

        setResponse(
          data.message ??
            (productFocus
              ? "I can help you with this product and related items."
              : "Assistant response unavailable.")
        );
        setRecommendations(data.products ?? []);
        setLastRequestId(data.requestId ?? "");
        setLastNormalizedQuery(data.normalizedQuery ?? trimmed);

        if (!productFocus && data.products?.[0]) {
          const byCategory = shopData
            .filter((item) => item.category === data.products![0].category)
            .sort((a, b) => b.reviews - a.reviews)
            .slice(0, 2);
          setBundle(byCategory);
        } else {
          setBundle([]);
        }
      } catch {
        setResponse("Assistant is temporarily unavailable. Please try again.");
        setRecommendations([]);
        setBundle([]);
        setLastRequestId("");
        setLastNormalizedQuery("");
      } finally {
        setLoading(false);
      }
    },
    [assistantContext, availabilityLabel, loading, mode, parsedContent, product, productFocus]
  );

  const handleAsk = () => {
    void submitQuery(query);
  };

  const handleSuggestedQuestion = (question: string) => {
    setQuery(question);
    void submitQuery(question);
  };

  if (isEmbed || isCartModalOpen) return null;

  const suggestedSource = productFocus ? PRODUCT_PAGE_SUGGESTED_QUESTIONS : STORE_SUGGESTED_QUESTIONS;
  const suggested = suggestedSource[answerLocale] ?? suggestedSource.en;
  const recommendationsTitle = productFocus ? "Related picks" : "Recommended for you";
  const fabLabel = productFocus ? "Ask about this product" : "AI Assistant";
  const headerTitle = productFocus ? "Shopping Assistant" : "Shopping Assistant";
  const headerHint = productFocus
    ? "Questions are about this product unless you ask for alternatives or other items."
    : "Ask about products, budget, use, and style across the store.";

  return (
    <div className="fixed bottom-6 right-6 z-[100000]">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group relative inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue to-[#6677ff] px-5 py-3 text-sm font-medium text-white shadow-2 transition hover:brightness-110"
        >
          {productFocus ?
            <>
              <span className="absolute -left-1 -top-1 h-3 w-3 rounded-full bg-white/80 animate-ping" />
              <span className="inline-flex h-2 w-2 rounded-full bg-white animate-pulse" />
            </>
          : (
            <span className="inline-block h-2 w-2 rounded-full bg-white/90" />
          )}
          {fabLabel}
        </button>
      ) : (
        <div className="w-[390px] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-3xl border border-gray-3 bg-white shadow-2 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <div className="bg-gradient-to-r from-blue to-[#6677ff] px-5 py-4 text-white">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{headerTitle}</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg px-2.5 py-1.5 text-sm text-white/90 transition hover:bg-white/20"
              >
                Close
              </button>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-white/90">{headerHint}</p>
          </div>

          <div className="max-h-[52vh] space-y-4 overflow-y-auto bg-gray-1/30 px-5 py-5">
            {productFocus && product ?
              <div className="rounded-2xl border border-blue/15 bg-blue/5 px-3 py-2 text-xs text-blue-dark">
                Current item: <span className="font-medium">{product.title}</span>
                {availabilityLabel ? ` (${availabilityLabel})` : null}
              </div>
            : null}

            <div className="flex flex-wrap gap-1.5">
              {suggested.map((question) => (
                <button
                  key={question}
                  type="button"
                  disabled={loading}
                  onClick={() => handleSuggestedQuestion(question)}
                  className="rounded-full border border-gray-3 bg-white px-2.5 py-1 text-[11px] font-medium text-dark-3 transition hover:border-blue hover:text-blue disabled:opacity-60"
                >
                  {question}
                </button>
              ))}
            </div>

            {response ?
              <div className="rounded-2xl rounded-bl-md bg-white px-4 py-3 text-sm leading-relaxed text-dark shadow-1">
                {response}
              </div>
            : null}

            {recommendations.length ?
              <div className="space-y-3 pt-1">
                <p className="text-sm font-medium text-dark">{recommendationsTitle}</p>
                {recommendations.map((item, index) => {
                  const price =
                    mode === "detail" ? item.detailPrice : item.jomlaPrice ?? item.detailPrice;
                  const image = item.imgs?.thumbnails?.[0] ?? item.imgs?.previews?.[0] ?? "";
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => openDetails(item, index)}
                      className="w-full rounded-2xl border border-gray-3 bg-white px-4 py-3 text-left transition hover:border-blue"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-gray-2 bg-white">
                          {image ?
                            <Image
                              src={image}
                              alt={item.title}
                              width={48}
                              height={48}
                              className="h-full w-full object-cover"
                            />
                          : null}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium leading-relaxed text-dark">
                            {item.title}
                          </p>
                          <p className="mt-1 whitespace-nowrap text-custom-sm text-dark-4">
                            {price.toFixed(2)} DA
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            : null}

            {!productFocus && bundle.length === 2 ?
              <p className="rounded-2xl border border-gray-3 bg-white px-4 py-3 text-xs leading-relaxed text-dark-4">
                <span className="font-medium text-dark">People also buy:</span> {bundle[0].title} +{" "}
                {bundle[1].title}
              </p>
            : null}
          </div>

          <div className="border-t border-gray-3 bg-white px-4 py-4">
            <div className="flex items-end gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAsk();
                }}
                placeholder={
                  productFocus ? "Ask about this item..." : "Type what you need..."
                }
                className="w-full rounded-2xl border border-gray-3 px-4 py-2.5 text-sm outline-none transition focus:border-blue"
              />
              <button
                type="button"
                onClick={handleAsk}
                className="rounded-2xl bg-blue px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
                disabled={loading}
              >
                {loading ? "..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShoppingAssistant;
