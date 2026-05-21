"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Info,
  Megaphone,
  Search,
  SlidersHorizontal,
  Tag,
  Zap,
} from "lucide-react";
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
  vitrinaCardRootClass,
  vitrinaOpportunityBarClass,
  vitrinaPriorityBadgeClass,
  vitrinaPriorityStripClass,
  vitrinaTopPriority,
} from "./vitrina-card-utils";
import {
  sellerHelperGrid,
  sellerHelperStack,
  sellerPanel,
  sellerPanelPadding,
  sellerIconButton,
  sellerPrimaryButton,
  sellerSecondaryButton,
  sellerGhostButton,
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

const MAX_VISIBLE_TIPS = 3;

function VitrinaPriorityIcon({ priority }: { priority: VitrinaProductMarketingRecommendation["tips"][number]["priority"] }) {
  const className = "h-3.5 w-3.5 shrink-0";
  if (priority === "high") return <Zap className={className} aria-hidden />;
  if (priority === "medium") return <Info className={className} aria-hidden />;
  return <AlertTriangle className={className} aria-hidden />;
}

function VitrinaSectionPanel({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className={cn(sellerPanel, "overflow-hidden")}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-2 bg-gradient-to-r from-orange/5 via-white to-white px-5 py-4 sm:px-6">
        <div className="space-y-1">
          <h4 className="text-base font-semibold text-dark">{title}</h4>
          {description ? <p className="text-custom-sm text-dark-4">{description}</p> : null}
        </div>
        {action}
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

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
  const topPriority = vitrinaTopPriority(item);
  const opportunity = Math.min(100, Math.max(0, Math.round(item.opportunityScore ?? 0)));
  const interaction = item.signals?.interactionScore ?? 0;
  const primaryTip = visibleTips[0];

  return (
    <article className={vitrinaCardRootClass()}>
      <div className={cn("absolute left-0 right-0 top-0 z-[2] h-1", vitrinaPriorityStripClass(topPriority))} />

      <header className="flex items-start gap-4 border-b border-gray-2 px-5 pb-4 pt-5 sm:px-6">
        <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl border border-gray-3 bg-gray-1 shadow-sm">
          <Image src={item.mainimage} alt={item.title} fill sizes="72px" className="object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <span
            className={cn(
              "mb-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide",
              vitrinaPriorityBadgeClass(topPriority)
            )}
          >
            <VitrinaPriorityIcon priority={topPriority} />
            {topPriority} priority
          </span>
          <h3 className="line-clamp-2 text-lg font-bold leading-snug tracking-tight text-dark">{item.title}</h3>
          <p className="mt-1 text-custom-sm text-dark-4">{item.categoryName}</p>
        </div>
        <div
          className="flex shrink-0 flex-col items-center gap-1 rounded-lg border border-gray-3 bg-gray-1 px-3 py-2.5 text-center"
          aria-label={`Opportunity score ${opportunity} percent`}
        >
          <span className="text-[9px] font-bold uppercase tracking-wide text-dark-4">Opportunity</span>
          <span className="text-[22px] font-extrabold leading-none tabular-nums text-dark">{opportunity}%</span>
          <div className="mt-0.5 h-1 w-full overflow-hidden rounded-sm bg-gray-3">
            <div
              className={cn("h-full rounded-sm transition-all duration-250", vitrinaOpportunityBarClass(opportunity))}
              style={{ width: `${opportunity}%` }}
            />
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 px-5 py-4 sm:px-6">
        {item.primaryRecommendation ?
          <section className="flex flex-col gap-2">
            <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-dark-3">
              <span className="h-2 w-2 shrink-0 rounded-full bg-orange" aria-hidden />
              Merchandising focus
            </span>
            <p className="text-sm font-medium leading-relaxed text-dark-3">{item.primaryRecommendation}</p>
          </section>
        : null}

        {visibleTips.length > 0 ?
          <section className="flex flex-col gap-2">
            <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-dark-3">
              <span className="h-2 w-2 shrink-0 rounded-sm bg-teal" aria-hidden />
              Suggested actions
            </span>
            <ul className="space-y-2">
              {visibleTips.map((tip) => (
                <li
                  key={`${item.productId}-${tip.label}`}
                  className="rounded-lg border border-gray-2 bg-gray-1 px-3 py-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-dark">{tip.label}</p>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                        vitrinaPriorityBadgeClass(tip.priority)
                      )}
                    >
                      {tip.priority}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-dark-4">{tip.action}</p>
                </li>
              ))}
            </ul>
          </section>
        : <p className="rounded-lg border border-dashed border-gray-4 bg-gray-1 px-4 py-3 text-center text-custom-sm text-dark-4">
            No merchandising signals yet for this product.
          </p>}

        <div className="grid grid-cols-3 gap-2 rounded-lg border border-gray-2 bg-gray-1 p-3 sm:gap-3 sm:p-4">
          <div className="flex flex-col gap-0.5 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wide text-dark-4">Price</span>
            <span className="text-sm font-bold tabular-nums text-dark">
              {item.jomlaPrice != null ? formatPrice(item.jomlaPrice) : formatPrice(item.price)}
            </span>
          </div>
          <div className="flex flex-col gap-0.5 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wide text-dark-4">Stock</span>
            <span className="text-sm font-bold tabular-nums text-dark">{item.instock}</span>
          </div>
          <div className="flex flex-col gap-0.5 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wide text-dark-4">Interaction</span>
            <span className="text-sm font-bold tabular-nums text-orange">{interaction}</span>
          </div>
        </div>

        <p className="inline-flex flex-wrap items-center gap-1.5 text-xs text-dark-4">
          <Tag className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{item.manufacturer}</span>
          {primaryTip ?
            <>
              <span aria-hidden>·</span>
              <span className="font-medium text-dark-3">{primaryTip.label}</span>
            </>
          : null}
        </p>
      </div>

      <footer className="mt-auto flex flex-col gap-2 border-t border-gray-2 px-5 pb-5 pt-4 sm:px-6">
        <button type="button" onClick={() => onEdit(item)} className={cn(sellerPrimaryButton, "w-full py-2.5 text-sm font-bold uppercase tracking-wide")}>
          Edit product
        </button>
        <button
          type="button"
          onClick={() => onApplyQuickFixes(item)}
          disabled={!hasQuickFixes}
          className={cn(
            "inline-flex w-full items-center justify-center gap-2 rounded-lg border-[1.5px] border-teal/40 bg-teal/10 px-4 py-2.5",
            "text-sm font-semibold text-teal-dark transition-colors hover:border-teal hover:bg-teal/15",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
        >
          Apply quick fixes
        </button>
        <Link
          href={productDetailsHref(item.productId)}
          className={cn(
            "inline-flex w-full min-h-[42px] items-center justify-center rounded-lg border-[1.5px] border-gray-3 bg-white px-3 py-2.5",
            "text-sm font-semibold text-dark-3 transition-colors hover:border-orange hover:bg-orange/5 hover:text-orange"
          )}
        >
          View storefront page
        </Link>
      </footer>
    </article>
  );
}

export function VitrinaRecommendationsContent({
  recommendations,
  onVitrinaQuickFixApplied,
}: {
  recommendations: VitrinaProductMarketingRecommendation[];
  onVitrinaQuickFixApplied?: (productId: string) => void | Promise<void>;
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

  const summary = useMemo(() => {
    const items = visibleRecommendations;
    const avgOpp =
      items.length > 0 ?
        Math.round(items.reduce((sum, i) => sum + (i.opportunityScore ?? 0), 0) / items.length)
      : 0;
    const highPriority = items.filter((i) => vitrinaTopPriority(i) === "high").length;
    return [
      { label: "Products", value: String(items.length) },
      { label: "Avg. opportunity", value: items.length > 0 ? `${avgOpp}%` : "—" },
      { label: "High priority", value: String(highPriority) },
    ];
  }, [visibleRecommendations]);

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
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="inline-flex items-center gap-2 text-lg font-semibold text-dark">
            <Megaphone className="h-5 w-5 text-orange" aria-hidden />
            Vitrina Recommendation
          </h3>
          {preparedRecommendations.length > 0 ?
            <span className="rounded-full bg-orange px-2.5 py-0.5 text-[13px] font-bold text-white tabular-nums">
              {preparedRecommendations.length}
            </span>
          : null}
        </div>
        <p className="text-custom-sm text-dark-4">
          Search the catalog, filter by category, and sort by interaction or merchandising priority.
        </p>
      </div>

      {preparedRecommendations.length === 0 ?
        <p className="rounded-lg border border-orange/20 bg-orange/10 px-4 py-3 text-custom-sm text-orange-dark">
          No Vitrina recommendations yet. Run analysis to generate storefront merchandising suggestions.
        </p>
      : <>
          <div className={sellerHelperGrid.three}>
            {summary.map((item) => (
              <div key={item.label} className={cn(sellerPanel, sellerPanelPadding)}>
                <p className="text-custom-sm text-dark-4">{item.label}</p>
                <p className="mt-1.5 text-2xl font-semibold text-dark">{item.value}</p>
              </div>
            ))}
          </div>

          <VitrinaSectionPanel
            title="Featured highlights"
            description="Top merchandising opportunities in a quick carousel."
            action={
              visibleRecommendations.length > 0 ?
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium tabular-nums text-dark-4">
                    {visibleRecommendations.length} item{visibleRecommendations.length === 1 ? "" : "s"}
                  </span>
                  <button type="button" onClick={handlePrev} className={sellerIconButton} aria-label="Previous products">
                    <ChevronLeft className="h-4 w-4" aria-hidden />
                  </button>
                  <button type="button" onClick={handleNext} className={sellerIconButton} aria-label="Next products">
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              : null
            }
          >
            {visibleRecommendations.length === 0 ?
              <div className="rounded-lg border border-dashed border-gray-4 bg-gray-1 px-4 py-6 text-center text-custom-sm text-dark-4">
                No products match your search or filters.
              </div>
            : <Swiper
                key={sliderKey}
                onSwiper={(swiper) => {
                  sliderRef.current = swiper;
                }}
                slidesPerView={1}
                spaceBetween={20}
                breakpoints={{
                  640: { slidesPerView: 1.15 },
                  900: { slidesPerView: 1.5 },
                  1200: { slidesPerView: 2 },
                }}
                className="!overflow-visible"
              >
                {featuredHighlightRecommendations.map((item) => (
                  <SwiperSlide key={item.productId} className="!h-auto">
                    <VitrinaProductCard
                      item={item}
                      onEdit={setEditingProduct}
                      onApplyQuickFixes={setQuickFixProduct}
                    />
                  </SwiperSlide>
                ))}
              </Swiper>
            }
          </VitrinaSectionPanel>

          <VitrinaSectionPanel title="Full catalog" description="Search, filter, and open any product card.">
            <div className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <label className="relative min-w-0 flex-1">
                  <span className="sr-only">Search products</span>
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dark-4" aria-hidden />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search by title, brand, or category"
                    className="w-full rounded-lg border border-gray-3 bg-white py-2.5 pl-9 pr-3 text-custom-sm text-dark outline-none transition focus:border-orange focus:ring-2 focus:ring-orange/15"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setFiltersOpen((open) => !open)}
                  className={cn(
                    sellerSecondaryButton,
                    "relative shrink-0",
                    filtersOpen && "border-orange bg-orange text-white hover:bg-orange-dark"
                  )}
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
                <div className={cn(sellerPanel, "border-gray-2 bg-gray-1/40 p-4")}>
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
                    <button type="button" onClick={resetFilters} className={sellerGhostButton}>
                      Reset filters
                    </button>
                  </div>
                </div>
              : null}

              <p className="text-xs font-medium uppercase tracking-wide text-dark-4">
                {categoryFilter === ALL_ITEMS_CATEGORY ? "All categories" : categoryFilter} ·{" "}
                {visibleRecommendations.length} item{visibleRecommendations.length === 1 ? "" : "s"}
              </p>

              {visibleRecommendations.length === 0 ?
                <div className="rounded-lg border border-dashed border-gray-4 bg-gray-1 px-4 py-6 text-center text-custom-sm text-dark-4">
                  No products match your search or filters.
                </div>
              : <div className="grid grid-cols-1 gap-6 md:grid-cols-[repeat(auto-fill,minmax(380px,1fr))]">
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
          </VitrinaSectionPanel>
        </>
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
