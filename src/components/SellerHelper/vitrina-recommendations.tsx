"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Megaphone, Search, SlidersHorizontal, Tag } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import type { Swiper as SwiperInstance } from "swiper";
import "swiper/css";
import type { VitrinaProductMarketingRecommendation } from "@/types/vitrina-product-recommendations";
import { productDetailsHref } from "@/lib/product-page-link";
import { compareImportanceTiers, IMPORTANCE_RANKS } from "@/lib/importance-ranking";
import { cn } from "@/lib/utils";
import VitrinaQuickEditModal from "./VitrinaQuickEditModal";
import VitrinaQuickFixConfirmModal from "./VitrinaQuickFixConfirmModal";
import {
  sellerHelperGrid,
  sellerHelperStack,
  sellerPanel,
  sellerPanelPadding,
  sellerPlaceholder,
  sellerIconButton,
  sellerPrimaryButton,
  sellerSecondaryButton,
} from "./layout";

const ALL_ITEMS_CATEGORY = "all";

type VitrinaSortMode =
  | "opportunity-high"
  | "opportunity-low"
  | "interaction-high"
  | "interaction-low"
  | "priority-high"
  | "priority-low";

const SORT_OPTIONS: { value: VitrinaSortMode; label: string }[] = [
  { value: "opportunity-high", label: "Opportunity: high to low" },
  { value: "opportunity-low", label: "Opportunity: low to high" },
  { value: "interaction-high", label: "Interaction: high to low" },
  { value: "interaction-low", label: "Interaction: low to high" },
  { value: "priority-high", label: "Merchandising priority: high to low" },
  { value: "priority-low", label: "Merchandising priority: low to high" },
];

function normalizeSearchValue(value: string) {
  return value.trim().toLowerCase();
}

function interactionSortValue(item: VitrinaProductMarketingRecommendation) {
  return item.signals?.interactionScore ?? 0;
}

function sortFilteredRecommendations(
  items: VitrinaProductMarketingRecommendation[],
  sortMode: VitrinaSortMode
) {
  const next = [...items];
  next.sort((left, right) => {
    if (sortMode === "opportunity-high") {
      return (right.opportunityScore ?? 0) - (left.opportunityScore ?? 0);
    }
    if (sortMode === "opportunity-low") {
      return (left.opportunityScore ?? 0) - (right.opportunityScore ?? 0);
    }
    if (sortMode === "interaction-high") {
      return interactionSortValue(right) - interactionSortValue(left);
    }
    if (sortMode === "interaction-low") {
      return interactionSortValue(left) - interactionSortValue(right);
    }
    if (sortMode === "priority-high") {
      return vitrinaProductImportanceRank(left) - vitrinaProductImportanceRank(right);
    }
    return vitrinaProductImportanceRank(right) - vitrinaProductImportanceRank(left);
  });
  return next;
}

function priorityClass(priority: VitrinaProductMarketingRecommendation["tips"][number]["priority"]) {
  if (priority === "high") return "bg-red-light-6 text-red-dark ring-1 ring-red-light-3";
  if (priority === "medium") return "bg-orange/10 text-orange-dark ring-1 ring-orange/25";
  return "bg-gray-2 text-dark-4 ring-1 ring-gray-3";
}

function formatPrice(value: number) {
  return `${new Intl.NumberFormat("en-US").format(value)} DA`;
}

function vitrinaProductImportanceRank(item: VitrinaProductMarketingRecommendation) {
  if (item.tips.length === 0) return IMPORTANCE_RANKS.low;
  return Math.min(...item.tips.map((tip) => IMPORTANCE_RANKS[tip.priority]));
}

function primarySuggestionLabel(item: VitrinaProductMarketingRecommendation) {
  return item.tips[0]?.label.trim() || "General merchandising";
}

function interleaveFeaturedHighlights(
  items: VitrinaProductMarketingRecommendation[]
): VitrinaProductMarketingRecommendation[] {
  if (items.length <= 1) return [...items];

  const buckets = new Map<string, VitrinaProductMarketingRecommendation[]>();
  for (const item of items) {
    const label = primarySuggestionLabel(item);
    const bucket = buckets.get(label) ?? [];
    bucket.push(item);
    buckets.set(label, bucket);
  }

  const queues = Array.from(buckets.entries()).map(([label, queue]) => ({
    label,
    queue: [...queue],
  }));

  const ordered: VitrinaProductMarketingRecommendation[] = [];
  let previousLabel: string | null = null;

  while (ordered.length < items.length) {
    const available = queues
      .filter((entry) => entry.queue.length > 0)
      .sort((left, right) => right.queue.length - left.queue.length);

    const picked = available.find((entry) => entry.label !== previousLabel) ?? available[0];
    if (!picked) break;

    const next = picked.queue.shift();
    if (!next) break;

    ordered.push(next);
    previousLabel = picked.label;
  }

  return ordered;
}

const MAX_VISIBLE_TIPS = 1;

function VitrinaProductCard({
  item,
  onEdit,
  onApplyQuickFixes,
}: {
  item: VitrinaProductMarketingRecommendation;
  onEdit: (item: VitrinaProductMarketingRecommendation) => void;
  onApplyQuickFixes: (item: VitrinaProductMarketingRecommendation) => void;
}) {
  const visibleTips = item.tips.slice(0, MAX_VISIBLE_TIPS);
  const hasQuickFixes = (item.quickFixes?.length ?? 0) > 0;

  return (
    <article className={cn(sellerPanel, sellerPanelPadding, "flex h-full w-full flex-col gap-3")}>
      <div className="flex items-start gap-3">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-gray-3 bg-gray-1">
          <Image src={item.mainimage} alt={item.title} fill sizes="64px" className="object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-custom-sm font-semibold text-dark">{item.title}</p>
          <p className="mt-1 text-xs text-dark-4">{item.categoryName}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 text-[11px] text-dark-4">
        <span className="inline-flex items-center gap-1 rounded-md bg-gray-1 px-2 py-1">
          <Tag className="h-3 w-3" aria-hidden />
          {item.manufacturer}
        </span>
        <span className="rounded-md bg-gray-1 px-2 py-1 tabular-nums">
          {item.jomlaPrice != null ?
            <>
              <span className="font-semibold text-orange">{formatPrice(item.jomlaPrice)}</span>
              <span className="ml-1 line-through">{formatPrice(item.price)}</span>
            </>
          : formatPrice(item.price)}
        </span>
        <span className="rounded-md bg-gray-1 px-2 py-1">Stock {item.instock}</span>
      </div>

      {visibleTips.length > 0 ?
        <ul className="space-y-1.5">
          {visibleTips.map((tip) => (
            <li
              key={`${item.productId}-${tip.label}`}
              className="rounded-md border border-gray-3 bg-gray-1 px-2.5 py-2"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-dark">{tip.label}</p>
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                    priorityClass(tip.priority)
                  )}
                >
                  {tip.priority}
                </span>
              </div>
              <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-dark-4">{tip.action}</p>
            </li>
          ))}
        </ul>
      : <p className="text-xs text-dark-4">No merchandising signals yet for this product.</p>}

      <div className="mt-auto flex flex-wrap gap-2">
        <Link href={productDetailsHref(item.productId)} className={sellerSecondaryButton}>
          View page
        </Link>
        <button
          type="button"
          onClick={() => onApplyQuickFixes(item)}
          className={sellerSecondaryButton}
          disabled={!hasQuickFixes}
        >
          Apply quick fixes
        </button>
        <button type="button" onClick={() => onEdit(item)} className={sellerPrimaryButton}>
          Edit
        </button>
      </div>
    </article>
  );
}

export function VitrinaRecommendationsContent({
  recommendations,
  onVitrinaQuickFixApplied,
}: {
  recommendations: VitrinaProductMarketingRecommendation[];
  onVitrinaQuickFixApplied?: (productId: string) => void;
}) {
  const [editingProduct, setEditingProduct] = useState<VitrinaProductMarketingRecommendation | null>(null);
  const [quickFixProduct, setQuickFixProduct] = useState<VitrinaProductMarketingRecommendation | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(ALL_ITEMS_CATEGORY);
  const [sortMode, setSortMode] = useState<VitrinaSortMode>("opportunity-high");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const sliderRef = useRef<SwiperInstance | null>(null);

  const preparedRecommendations = useMemo(
    () =>
      recommendations.map((item) => ({
        ...item,
        tips: [...item.tips].sort((left, right) => compareImportanceTiers(left.priority, right.priority)),
      })),
    [recommendations]
  );

  const categoryOptions = useMemo(() => {
    const names = new Set(preparedRecommendations.map((item) => item.categoryName));
    return Array.from(names).sort((left, right) => left.localeCompare(right));
  }, [preparedRecommendations]);

  const visibleRecommendations = useMemo(() => {
    const query = normalizeSearchValue(searchQuery);
    let items = preparedRecommendations;

    if (categoryFilter !== ALL_ITEMS_CATEGORY) {
      items = items.filter((item) => item.categoryName === categoryFilter);
    }

    if (query) {
      items = items.filter((item) => {
        const haystack = [item.title, item.categoryName, item.manufacturer, item.slug]
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      });
    }

    return sortFilteredRecommendations(items, sortMode);
  }, [categoryFilter, preparedRecommendations, searchQuery, sortMode]);

  const featuredHighlightRecommendations = useMemo(
    () => interleaveFeaturedHighlights(visibleRecommendations),
    [visibleRecommendations]
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (categoryFilter !== ALL_ITEMS_CATEGORY) count += 1;
    if (sortMode !== "opportunity-high") count += 1;
    return count;
  }, [categoryFilter, sortMode]);

  const sliderKey = `${categoryFilter}:${sortMode}:${normalizeSearchValue(searchQuery)}`;

  useEffect(() => {
    sliderRef.current?.slideTo(0, 0);
  }, [sliderKey]);

  const handlePrev = useCallback(() => {
    sliderRef.current?.slidePrev();
  }, []);

  const handleNext = useCallback(() => {
    sliderRef.current?.slideNext();
  }, []);

  const resetFilters = useCallback(() => {
    setCategoryFilter(ALL_ITEMS_CATEGORY);
    setSortMode("opportunity-high");
  }, []);

  return (
    <div className={sellerHelperStack}>
      <div className="space-y-1">
        <h3 className="inline-flex items-center gap-2 text-lg font-semibold text-dark">
          <Megaphone className="h-5 w-5 text-orange" aria-hidden />
          Vitrina Recommendation
        </h3>
        <p className="text-custom-sm text-dark-4">
          Search the catalog, filter by category, and sort by interaction or merchandising priority.
        </p>
      </div>

      {preparedRecommendations.length === 0 ?
        <div className={sellerPlaceholder}>
          No Vitrina recommendations yet. Run analysis to generate storefront merchandising suggestions.
        </div>
      : <div className="space-y-4">
          <section
            className={cn(sellerPlaceholder, "space-y-4 p-4 text-left sm:p-5")}
            aria-label="Featured highlights"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-dark-4">Featured highlights</p>

            <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium uppercase tracking-wide text-dark-4">
              {visibleRecommendations.length} item{visibleRecommendations.length === 1 ? "" : "s"}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrev}
                className={sellerIconButton}
                aria-label="Previous products"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={handleNext}
                className={sellerIconButton}
                aria-label="Next products"
              >
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>

          {visibleRecommendations.length === 0 ?
            <div className={sellerPlaceholder}>No products match your search or filters.</div>
          : <div className="overflow-hidden px-4 sm:px-5">
              <Swiper
                key={sliderKey}
                onSwiper={(swiper) => {
                  sliderRef.current = swiper;
                }}
                slidesPerView={1}
                spaceBetween={16}
                breakpoints={{
                  640: { slidesPerView: 2 },
                  1024: { slidesPerView: 3 },
                }}
                className="overflow-hidden"
              >
                {featuredHighlightRecommendations.map((item) => (
                  <SwiperSlide key={item.productId}>
                    <VitrinaProductCard
                      item={item}
                      onEdit={setEditingProduct}
                      onApplyQuickFixes={setQuickFixProduct}
                    />
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>
          }

          </section>

          <section
            className={cn(sellerPlaceholder, "space-y-4 p-4 text-left sm:p-5")}
            aria-label="Full catalog"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-dark-4">Full catalog</p>

            <div className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="relative min-w-0 flex-1">
                <span className="sr-only">Search products</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dark-4" aria-hidden />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by title, brand, or category"
                  className="w-full rounded-lg border border-gray-3 bg-white py-2 pl-9 pr-3 text-custom-sm text-dark outline-none transition focus:border-orange focus:ring-2 focus:ring-orange/15"
                />
              </label>
              <button
                type="button"
                onClick={() => setFiltersOpen((open) => !open)}
                className={cn(sellerSecondaryButton, "relative shrink-0", filtersOpen && "border-orange bg-orange text-white hover:bg-orange-dark")}
                aria-expanded={filtersOpen}
              >
                <SlidersHorizontal className="h-4 w-4" aria-hidden />
                Filters
                {activeFilterCount > 0 ?
                  <span className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-orange px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {activeFilterCount}
                  </span>
                : null}
              </button>
            </div>

            {filtersOpen ?
              <div className="rounded-xl border border-gray-3 bg-white p-3 sm:p-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wide text-dark-4">Category</span>
                    <select
                      value={categoryFilter}
                      onChange={(event) => setCategoryFilter(event.target.value)}
                      className="w-full rounded-lg border border-gray-3 bg-white px-3 py-2 text-custom-sm text-dark outline-none transition focus:border-orange focus:ring-2 focus:ring-orange/15"
                    >
                      <option value={ALL_ITEMS_CATEGORY}>All categories</option>
                      {categoryOptions.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wide text-dark-4">Sort by</span>
                    <select
                      value={sortMode}
                      onChange={(event) => setSortMode(event.target.value as VitrinaSortMode)}
                      className="w-full rounded-lg border border-gray-3 bg-white px-3 py-2 text-custom-sm text-dark outline-none transition focus:border-orange focus:ring-2 focus:ring-orange/15"
                    >
                      {SORT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="mt-3 flex justify-end">
                  <button type="button" onClick={resetFilters} className={sellerSecondaryButton}>
                    Reset filters
                  </button>
                </div>
              </div>
            : null}
          </div>

          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wide text-dark-4">
              {categoryFilter === ALL_ITEMS_CATEGORY ? "All categories" : categoryFilter} ·{" "}
              {visibleRecommendations.length} item{visibleRecommendations.length === 1 ? "" : "s"}
            </p>
            {visibleRecommendations.length === 0 ?
              <div className={sellerPlaceholder}>No products match your search or filters.</div>
            : <div className={sellerHelperGrid.three}>
                {visibleRecommendations.map((item) => (
                  <VitrinaProductCard
                    key={item.productId}
                    item={item}
                    onEdit={setEditingProduct}
                    onApplyQuickFixes={setQuickFixProduct}
                  />
                ))}
              </div>
            }
          </div>
          </section>
        </div>
      }

      {editingProduct ?
        <VitrinaQuickEditModal
          key={editingProduct.productId}
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
        />
      : null}
      {quickFixProduct ?
        <VitrinaQuickFixConfirmModal
          key={quickFixProduct.productId}
          product={quickFixProduct}
          onClose={() => setQuickFixProduct(null)}
          onApplied={onVitrinaQuickFixApplied}
        />
      : null}
    </div>
  );
}
