"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import type { Product } from "@/types/product";
import shopData from "@/components/Shop/shopData";
import { updateproductDetails } from "@/redux/features/product-details";
import { usePriceMode } from "@/app/context/PriceModeContext";
import { sequenceStartProduct } from "@/lib/sequence-client";
import { parseProductContent } from "@/lib/product-content";

type ProductPageAssistantProps = {
  product: Product;
  availabilityLabel: string;
};

type LocalAnswerLocale = "ar" | "fr" | "en" | "dz";

function detectLocalAnswerLocale(query: string): LocalAnswerLocale {
  const q = query.toLowerCase();
  if (/[\u0600-\u06ff]/.test(query)) return "ar";
  if (/(kayen|kayn|wa9tach|wesh|wach|chhal|bzzaf|machi)/i.test(q)) return "dz";
  if (/(disponible|couleur|taille|arrivage|quand|stock)/i.test(q)) return "fr";
  return "en";
}

function localizeAnswer(locale: LocalAnswerLocale, key: string, vars?: Record<string, string>) {
  const templates: Record<LocalAnswerLocale, Record<string, string>> = {
    ar: {
      arrival_unknown: "موعد التوفر القادم غير مؤكد حالياً. يرجى التحقق لاحقاً.",
      colors_list: "الألوان المتوفرة: {{colors}}.",
      color_not_listed: "خيارات الألوان غير مذكورة لهذا المنتج.",
      color_yes: "نعم، اللون {{color}} متوفر.",
      color_no: "لا، اللون {{color}} غير متوفر لهذا المنتج.",
      option_yes: "نعم، خيار {{option}} متوفر ضمن {{spec}}.",
      options_list: "الخيارات المتوفرة: {{options}}",
      availability_yes: "نعم، هذا المنتج متوفر حالياً.",
      availability_status: "حالة التوفر الحالية: {{availability}}.",
    },
    fr: {
      arrival_unknown: "Le prochain arrivage n'est pas encore confirmé. Revenez bientôt.",
      colors_list: "Couleurs disponibles : {{colors}}.",
      color_not_listed: "Les couleurs ne sont pas indiquées pour cet article.",
      color_yes: "Oui, la couleur {{color}} est disponible.",
      color_no: "Non, la couleur {{color}} n'est pas disponible pour cet article.",
      option_yes: "Oui, l'option {{option}} est disponible dans {{spec}}.",
      options_list: "Options disponibles : {{options}}",
      availability_yes: "Oui, cet article est actuellement disponible.",
      availability_status: "Disponibilite actuelle : {{availability}}.",
    },
    dz: {
      arrival_unknown: "الريستوك الجاي مازال ما تأكدش. عاود شيك من بعد.",
      colors_list: "الألوان لي كاينين: {{colors}}.",
      color_not_listed: "ألوان هاد المنتج ماهمش مذكورين.",
      color_yes: "ايه، اللون {{color}} كاين.",
      color_no: "لا، اللون {{color}} ماكانش فهاد المنتج.",
      option_yes: "ايه، الأوبشن {{option}} كاين فـ {{spec}}.",
      options_list: "الأوبشنز لي كاينين: {{options}}",
      availability_yes: "ايه، هاد السلعة كاينة حالياً.",
      availability_status: "الحالة الحالية للتوفر: {{availability}}.",
    },
    en: {
      arrival_unknown: "Next arrival is not confirmed yet. Please check again soon.",
      colors_list: "Available colors: {{colors}}.",
      color_not_listed: "Color options are not listed for this item.",
      color_yes: "Yes, {{color}} color is available.",
      color_no: "No, {{color}} color is not available for this item.",
      option_yes: "Yes, {{option}} is available in {{spec}}.",
      options_list: "Available options: {{options}}",
      availability_yes: "Yes, this item is currently available.",
      availability_status: "Current availability: {{availability}}.",
    },
  };

  let out = templates[locale][key] ?? templates.en[key] ?? "";
  if (vars) {
    Object.entries(vars).forEach(([k, v]) => {
      out = out.replaceAll(`{{${k}}}`, v);
    });
  }
  return out;
}

const ProductPageAssistant = ({ product, availabilityLabel }: ProductPageAssistantProps) => {
  const router = useRouter();
  const dispatch = useDispatch();
  const { mode } = usePriceMode();

  const [visible, setVisible] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [response, setResponse] = React.useState("");
  const [recommendations, setRecommendations] = React.useState<typeof shopData>([]);
  const [loading, setLoading] = React.useState(false);
  const parsedContent = React.useMemo(
    () => parseProductContent(product.description),
    [product.description]
  );

  const answerProductQuestion = React.useCallback(
    (rawQuery: string) => {
      const q = rawQuery.toLowerCase().trim();
      const locale = detectLocalAnswerLocale(rawQuery);
      const isAvailabilityQuestion =
        /(available|availability|in stock|stock|disponible|dispo|متوفر|موجود|كاين|kayen|kayn)/i.test(
          q
        );
      const isColorQuestion = /(color|couleur|لون)/i.test(q);
      const isSizeOrSpecQuestion =
        /(size|taille|spec|specs|ram|storage|capacity|option|version|model|مقاس|حجم|نسخة|سعة|رام)/i.test(
          q
        );
      const isArrivalQuestion =
        /(arrival|arrive|restock|back in stock|when.*available|متى|وقتاش|امتى)/i.test(q);

      if (isArrivalQuestion) {
        const arrivalRow = parsedContent.additionalInfo.find((row) =>
          /(arrival|restock|availability|arrivage|next)/i.test(row.key)
        );
        return arrivalRow
          ? `${arrivalRow.key}: ${arrivalRow.value}`
          : localizeAnswer(locale, "arrival_unknown");
      }

      const colors = parsedContent.colors.map((c) => c.name.toLowerCase());
      const mentionedColor = colors.find((color) => q.includes(color));
      if (isColorQuestion || mentionedColor) {
        if (!mentionedColor) {
          return colors.length
            ? localizeAnswer(locale, "colors_list", {
                colors: parsedContent.colors.map((c) => c.name).join(", "),
              })
            : localizeAnswer(locale, "color_not_listed");
        }
        return colors.includes(mentionedColor)
          ? localizeAnswer(locale, "color_yes", { color: mentionedColor })
          : localizeAnswer(locale, "color_no", { color: mentionedColor });
      }

      if (isSizeOrSpecQuestion) {
        const allOptions = parsedContent.specifications.flatMap((spec) =>
          spec.options.map((opt) => ({ specName: spec.name, label: opt.label.toLowerCase() }))
        );
        const matchedOption = allOptions.find((opt) => q.includes(opt.label));
        if (matchedOption) {
          return localizeAnswer(locale, "option_yes", {
            option: matchedOption.label,
            spec: matchedOption.specName,
          });
        }

        if (parsedContent.specifications.length > 0) {
          const quickSpecs = parsedContent.specifications
            .map((spec) => `${spec.name}: ${spec.options.map((o) => o.label).join(", ")}`)
            .join(" | ");
          return localizeAnswer(locale, "options_list", { options: quickSpecs });
        }
      }

      if (isAvailabilityQuestion) {
        return /in stock/i.test(availabilityLabel)
          ? localizeAnswer(locale, "availability_yes")
          : localizeAnswer(locale, "availability_status", { availability: availabilityLabel });
      }

      return null;
    },
    [availabilityLabel, parsedContent.additionalInfo, parsedContent.colors, parsedContent.specifications]
  );

  React.useEffect(() => {
    setOpen(false);
    setVisible(false);
    const timer = window.setTimeout(() => {
      setVisible(true);
      setOpen(true);
    }, 15000);
    return () => window.clearTimeout(timer);
  }, [product.id]);

  const openDetails = (nextProduct: (typeof shopData)[number]) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("productDetails", JSON.stringify(nextProduct));
    }
    dispatch(updateproductDetails(nextProduct));
    sequenceStartProduct(nextProduct.title);
    router.push("/shop-details");
  };

  const handleAsk = async () => {
    const text = query.trim();
    if (!text || loading) return;

    const localAnswer = answerProductQuestion(text);
    if (localAnswer) {
      setResponse(localAnswer);
      setRecommendations([]);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: text,
          mode,
          contextProduct: {
            title: product.title,
            availability: availabilityLabel,
            category: product.category,
          },
        }),
      });

      const data = (await res.json()) as {
        message?: string;
        products?: typeof shopData;
      };

      setResponse(data.message ?? "I can help you with this product and related items.");
      setRecommendations(data.products ?? []);
    } catch {
      setResponse("Assistant is temporarily unavailable. Please try again.");
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100000]">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group relative inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue to-[#6677ff] px-5 py-3 text-sm font-medium text-white shadow-2 transition hover:brightness-110"
        >
          <span className="absolute -left-1 -top-1 h-3 w-3 rounded-full bg-white/80 animate-ping" />
          <span className="inline-flex h-2 w-2 rounded-full bg-white animate-pulse" />
          Ask about this product
        </button>
      ) : (
        <div className="w-[390px] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-3xl border border-gray-3 bg-white shadow-2 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <div className="bg-gradient-to-r from-blue to-[#6677ff] px-5 py-4 text-white">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Product AI Assistant</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg px-2.5 py-1.5 text-sm text-white/90 transition hover:bg-white/20"
              >
                Close
              </button>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-white/90">
              Ask about availability, specs, or similar products.
            </p>
          </div>

          <div className="max-h-[52vh] space-y-4 overflow-y-auto bg-gray-1/30 px-5 py-5">
            <div className="rounded-2xl border border-blue/15 bg-blue/5 px-3 py-2 text-xs text-blue-dark">
              Current item: <span className="font-medium">{product.title}</span> ({availabilityLabel})
            </div>

            {response ? (
              <div className="rounded-2xl rounded-bl-md bg-white px-4 py-3 text-sm leading-relaxed text-dark shadow-1">
                {response}
              </div>
            ) : null}

            {recommendations.length ? (
              <div className="space-y-3 pt-1">
                <p className="text-sm font-medium text-dark">Related picks</p>
                {recommendations.map((item) => {
                  const price = mode === "detail" ? item.detailPrice : item.jomlaPrice ?? item.detailPrice;
                  const image = item.imgs?.thumbnails?.[0] ?? item.imgs?.previews?.[0] ?? "";
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => openDetails(item)}
                      className="w-full rounded-2xl border border-gray-3 bg-white px-4 py-3 text-left transition hover:border-blue"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-gray-2 bg-white">
                          {image ? (
                            <Image
                              src={image}
                              alt={item.title}
                              width={48}
                              height={48}
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium leading-relaxed text-dark">{item.title}</p>
                          <p className="mt-1 text-custom-sm text-dark-4 whitespace-nowrap">
                            {price.toFixed(2)} DA
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>

          <div className="border-t border-gray-3 bg-white px-4 py-4">
            <div className="flex items-end gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAsk();
                }}
                placeholder="Ask anything about this item..."
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

export default ProductPageAssistant;
