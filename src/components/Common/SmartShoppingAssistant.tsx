"use client";

import React, { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import shopData from "@/components/Shop/shopData";
import { updateproductDetails } from "@/redux/features/product-details";
import { usePriceMode } from "@/app/context/PriceModeContext";
import { useCartModalContext } from "@/app/context/CartSidebarModalContext";
import { sequenceStartProduct } from "@/lib/sequence-client";

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

const SmartShoppingAssistant = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState("");
  const [recommendations, setRecommendations] = useState<typeof shopData>([]);
  const [bundle, setBundle] = useState<typeof shopData>([]);
  const [loading, setLoading] = useState(false);
  const [assistantSource, setAssistantSource] = useState("");
  const [lastRequestId, setLastRequestId] = useState("");
  const [lastSubmittedQuery, setLastSubmittedQuery] = useState("");
  const [lastNormalizedQuery, setLastNormalizedQuery] = useState("");

  const { mode } = usePriceMode();
  const { isCartModalOpen } = useCartModalContext();
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useDispatch();
  const isProductPage = pathname === "/shop-details";

  React.useEffect(() => {
    if (isCartModalOpen) {
      setOpen(false);
    }
  }, [isCartModalOpen]);

  const openDetails = (product: (typeof shopData)[number], position: number) => {
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
          productId: product.id,
          position,
        }),
      }).catch(() => {});
    }

    if (typeof window !== "undefined") {
      window.localStorage.setItem("productDetails", JSON.stringify(product));
    }
    dispatch(updateproductDetails(product));
    sequenceStartProduct(product.title);
    router.push("/shop-details");
  };

  const handleAsk = async () => {
    const text = query.trim();
    if (!text) return;

    setLastSubmittedQuery(text);
    setLoading(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text, mode }),
      });

      const data = (await res.json()) as {
        message: string;
        products: typeof shopData;
        requestId?: string;
        normalizedQuery?: string;
        debug?: {
          source: "llm-only";
          model?: string;
          error?: string;
          cache?: "hit" | "miss";
          provider?: string;
          finalCount: number;
        };
      };

      setResponse(data.message ?? "Assistant response unavailable.");
      setRecommendations(data.products ?? []);
      setLastRequestId(data.requestId ?? "");
      setLastNormalizedQuery(data.normalizedQuery ?? text);
      setAssistantSource(
        `Provider: ${data.debug?.provider ?? "gemini"} | model: ${data.debug?.model ?? "gemini"} | cache: ${data.debug?.cache ?? "miss"} | final: ${data.debug?.finalCount ?? 0}${data.debug?.error ? ` | error: ${data.debug.error}` : ""}`
      );

      if (data.products?.[0]) {
        const byCategory = shopData
          .filter((item) => item.category === data.products[0].category)
          .sort((a, b) => b.reviews - a.reviews)
          .slice(0, 2);
        setBundle(byCategory);
      } else {
        setBundle([]);
      }
    } catch {
      setResponse("Assistant failed. Please try again.");
      setRecommendations([]);
      setBundle([]);
      setAssistantSource("");
      setLastRequestId("");
      setLastNormalizedQuery("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {!isCartModalOpen && !isProductPage ? (
        <button
          type="button"
          onClick={() => setOpen((s) => !s)}
          className="fixed bottom-6 right-6 z-[100000] inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue to-[#6677ff] text-white px-5 py-3 shadow-2 transition hover:brightness-110"
        >
          <span className="inline-block h-2 w-2 rounded-full bg-white/90" />
          AI Assistant
        </button>
      ) : null}

      {open && !isCartModalOpen && !isProductPage ? (
        <div className="fixed bottom-22 right-6 z-[100000] w-[400px] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-3xl border border-gray-3 bg-white shadow-2">
          <div className="bg-gradient-to-r from-blue to-[#6677ff] px-5 py-4 text-white">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Smart Shopping Assistant</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg px-2.5 py-1.5 text-sm text-white/90 transition hover:bg-white/20"
              >
                Close
              </button>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-white/90">
              Ask anything about products, budget, use, and style.
            </p>
          </div>

          <div className="max-h-[60vh] space-y-4 overflow-y-auto bg-gray-1/30 px-5 py-5">
            {response ? (
              <div className="rounded-2xl rounded-bl-md bg-white px-4 py-3 text-sm leading-relaxed text-dark shadow-1">
                {response}
              </div>
            ) : null}

            {recommendations.length ? (
              <div className="space-y-3 pt-1">
                <p className="text-sm font-medium text-dark">Recommended for you</p>
                {recommendations.map((item, index) => {
                  const price = mode === "detail" ? item.detailPrice : item.jomlaPrice;
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
                          {image ? (
                            <img src={image} alt={item.title} className="h-full w-full object-cover" />
                          ) : null}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium leading-relaxed text-dark">{item.title}</p>
                          <p className="mt-1 text-custom-sm text-dark-4 whitespace-nowrap">{price.toFixed(2)} DA</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : null}

            {bundle.length === 2 ? (
              <p className="rounded-2xl border border-gray-3 bg-white px-4 py-3 text-xs leading-relaxed text-dark-4">
                <span className="font-medium text-dark">People also buy:</span> {bundle[0].title} +{" "}
                {bundle[1].title}
              </p>
            ) : null}
          </div>

          <div className="border-t border-gray-3 bg-white px-4 py-4">
            <div className="flex items-end gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !loading) handleAsk();
                }}
                placeholder="Type what you need..."
                className="w-full rounded-2xl border border-gray-3 px-4 py-2.5 text-sm outline-none transition focus:border-blue"
              />
              <button
                type="button"
                onClick={handleAsk}
                className="rounded-full bg-gradient-to-r from-blue to-[#6677ff] px-4 py-2.5 text-sm font-medium text-white shadow-2 transition hover:brightness-110 disabled:opacity-60"
                disabled={loading}
              >
                {loading ? "Thinking..." : "Send"}
              </button>
            </div>
            {assistantSource ? (
              <p className="mt-2 text-[10px] leading-tight text-dark-4">{assistantSource}</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
};

export default SmartShoppingAssistant;
