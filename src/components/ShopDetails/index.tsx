"use client";
import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import Breadcrumb from "../Common/Breadcrumb";
import Image from "next/image";
import Newsletter from "../Common/Newsletter";
import RecentlyViewdItems from "./RecentlyViewd";
import { usePreviewSlider } from "@/app/context/PreviewSliderContext";
import { useAppSelector } from "@/redux/store";
import { useDispatch } from "react-redux";
import { addItemToCart, selectCartItems, selectTotalPrice } from "@/redux/features/cart-slice";
import { updateproductDetails } from "@/redux/features/product-details";
import { AppDispatch } from "@/redux/store";
import { useRouter, useSearchParams } from "next/navigation";
import { parseProductContent, isStructuredProductContent } from "@/lib/product-content";
import { sequenceVisitProduct } from "@/lib/sequence-client";
import ReviewsTab from "./ReviewsTab";
import ProductPageAssistant from "./ProductPageAssistant";
import { useProductAnalyticsTracking } from "@/hooks/useProductAnalyticsTracking";
import { trackProductAnalytics } from "@/lib/product-analytics-client";
import { useSelector } from "react-redux";
import type { Product } from "@/types/product";
import { resolveTrackingProductId } from "@/lib/product-page-link";
import { HEATMAP_REFERENCE_VIEWPORT_WIDTH_PX } from "@/lib/product-heatmap-surface";
import {
  productAvailableQuantity,
} from "@/components/Common/ProductAvailableQuantity";
import { useLiveProductInventory } from "@/hooks/useLiveProductInventory";
import { getVitrinaMerchandisingFromAdditionalInfo, isVitrinaMerchandisingKey } from "@/lib/vitrina-merchandising";
import { ProductCatalogImageWithMerch } from "@/components/Common/ProductCatalogImageWithMerch";
import {
  PRODUCT_PDP_HERO_IMAGE_SIZES,
  PRODUCT_PDP_THUMB_IMAGE_SIZES,
} from "@/lib/product-image-sizes";
import { ProductCardPromoLayer } from "@/components/Common/ProductCardPromoLayer";
import { ProductTrendingCountdown } from "@/components/Common/ProductTrendingCountdown";
import { ProductCardStarsRowWithStock } from "@/components/Common/ProductCardStarsRowWithStock";
import { ProductPriceAdjacentMeta } from "@/components/Common/ProductPriceAdjacentMeta";
import { ProductPriceRowWithInlineStock } from "@/components/Common/ProductPriceRowWithInlineStock";
import { VitrinaPriceWithPromoTimerRow } from "@/components/Common/ProductPromoPriceRowLabels";

type ShopDetailsProps = {
  initialProductId?: string | null;
  embed?: boolean;
  heatmapPreview?: boolean;
};

function readCachedProductDetails(): Product | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("productDetails");
    return raw ? (JSON.parse(raw) as Product) : null;
  } catch {
    return null;
  }
}

function sameProductId(
  left: string | number | null | undefined,
  right: string | number | null | undefined
) {
  if (left == null || right == null) return false;
  return String(left) === String(right);
}

function hasDisplayableProduct(product: Product | null | undefined) {
  return Boolean(product?.title);
}

function pickShopDetailsProduct(
  reduxProduct: Product,
  cachedProduct: Product | null,
  requestedProductId: string | null
) {
  if (requestedProductId) {
    if (hasDisplayableProduct(reduxProduct) && sameProductId(reduxProduct.id, requestedProductId)) {
      return reduxProduct;
    }
    if (hasDisplayableProduct(cachedProduct) && sameProductId(cachedProduct.id, requestedProductId)) {
      return cachedProduct;
    }
    return reduxProduct;
  }

  if (hasDisplayableProduct(reduxProduct)) return reduxProduct;
  if (hasDisplayableProduct(cachedProduct)) return cachedProduct;
  return reduxProduct;
}

const ShopDetails = ({ initialProductId = null, embed = false, heatmapPreview = false }: ShopDetailsProps) => {
  const compactEmbed = embed && !heatmapPreview;
  const dispatch = useDispatch<AppDispatch>();
  const cartItems = useAppSelector(selectCartItems);
  const totalPrice = useSelector(selectTotalPrice);
  const productFromRedux = useAppSelector((state) => state.productDetailsReducer.value);
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedProductId = searchParams.get("productId") ?? initialProductId;
  const isHeatmapPreview =
    heatmapPreview || searchParams.get("heatmapPreview") === "1";
  const [activeColor, setActiveColor] = useState("blue");
  const { openPreviewModal } = usePreviewSlider();
  const [previewImg, setPreviewImg] = useState(0);
  const [selectedSpecs, setSelectedSpecs] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);

  const [activeTab, setActiveTab] = useState("tabOne");
  const [cachedProduct, setCachedProduct] = useState<Product | null>(null);
  const [catalogRequestResolved, setCatalogRequestResolved] = useState(false);

  useLayoutEffect(() => {
    setCachedProduct(readCachedProductDetails());
  }, []);

  const product = useMemo(
    () => pickShopDetailsProduct(productFromRedux, cachedProduct, requestedProductId),
    [cachedProduct, productFromRedux, requestedProductId]
  );
  const canRenderProduct =
    hasDisplayableProduct(product) &&
    (!requestedProductId || catalogRequestResolved || sameProductId(product.id, requestedProductId));
  const trackingProductId = useMemo(() => {
    if (canRenderProduct && Number.isFinite(product.id) && product.id > 0) {
      return Math.trunc(product.id);
    }
    return resolveTrackingProductId(requestedProductId, product.id);
  }, [canRenderProduct, product.id, requestedProductId]);

  const tabs = [
    {
      id: "tabOne",
      title: "Description",
    },
    {
      id: "tabTwo",
      title: "Additional Information",
    },
    {
      id: "tabThree",
      title: "Reviews",
    },
  ];

  const parsedContent = useMemo(
    () => parseProductContent(product.description),
    [product.description]
  );
  const vitrinaMerchandising = useMemo(
    () => getVitrinaMerchandisingFromAdditionalInfo(parsedContent.additionalInfo),
    [parsedContent.additionalInfo]
  );
  const colorOptions = useMemo(
    () =>
      parsedContent.colors.length > 0
        ? parsedContent.colors
        : [{ name: "red" }, { name: "blue" }, { name: "orange" }, { name: "pink" }, { name: "purple" }],
    [parsedContent]
  );
  const colorSignature = useMemo(
    () =>
      colorOptions
        .map((color) => `${color.name}:${color.inStock === false ? "0" : "1"}`)
        .join("|"),
    [colorOptions]
  );

  const gallerySlots = useMemo((): { colorName: string; url: string }[] | null => {
    if (product.colorImageSlots && product.colorImageSlots.length > 0) {
      return product.colorImageSlots;
    }
    if (!isStructuredProductContent(product.description)) return null;
    const base = product.imgs?.previews?.[0] ?? "";
    if (!colorOptions.length) return null;
    return colorOptions.map((c) => ({
      colorName: c.name,
      url: c.imageUrl?.trim() || base,
    }));
  }, [product.colorImageSlots, product.description, colorOptions, product.imgs?.previews]);

  const displayGalleryUrls = useMemo(() => {
    if (gallerySlots && gallerySlots.length > 0) return gallerySlots.map((s) => s.url);
    const thumbs = product.imgs?.thumbnails ?? [];
    const previews = product.imgs?.previews ?? [];
    return previews.length > 0 ? previews : thumbs;
  }, [gallerySlots, product.imgs?.previews, product.imgs?.thumbnails]);

  useEffect(() => {
    setPreviewImg((i) => {
      const max = Math.max(0, displayGalleryUrls.length - 1);
      return Math.min(Math.max(0, i), max);
    });
  }, [displayGalleryUrls.length, product.id]);

  const baseDetailPrice = product.detailPrice ?? 0;
  const jomlaPrice = product.jomlaPrice;
  const { instock: liveInstock } = useLiveProductInventory(
    canRenderProduct ? product.id : null,
    product.instock ?? null,
    { enabled: canRenderProduct }
  );
  const availableQuantity = liveInstock ?? productAvailableQuantity(product);
  const maxOrderQuantity =
    availableQuantity != null ? Math.max(availableQuantity, 0) : null;

  useEffect(() => {
    if (!hasDisplayableProduct(product)) return;
    localStorage.setItem("productDetails", JSON.stringify(product));
  }, [product]);

  useEffect(() => {
    setCatalogRequestResolved(false);
    if (!requestedProductId) return;

    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(`/api/catalog/product?id=${encodeURIComponent(requestedProductId)}`, {
          cache: "no-store",
        });
        const body = await response.json();
        if (cancelled || !response.ok || !body.product) return;
        const canonicalProduct = body.product as Product;
        dispatch(updateproductDetails(canonicalProduct));
        setCachedProduct(canonicalProduct);
        localStorage.setItem("productDetails", JSON.stringify(canonicalProduct));
        setCatalogRequestResolved(true);
      } catch {
        /* ignore */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dispatch, requestedProductId]);

  useLayoutEffect(() => {
    if (embed || typeof document === "undefined") return;

    const root = document.documentElement;
    const body = document.body;
    const previousRootMinWidth = root.style.minWidth;
    const previousBodyMinWidth = body.style.minWidth;

    root.style.minWidth = `${HEATMAP_REFERENCE_VIEWPORT_WIDTH_PX}px`;
    body.style.minWidth = `${HEATMAP_REFERENCE_VIEWPORT_WIDTH_PX}px`;

    return () => {
      root.style.minWidth = previousRootMinWidth;
      body.style.minWidth = previousBodyMinWidth;
    };
  }, [embed]);

  useEffect(() => {
    if (embed || isHeatmapPreview) return;
    sequenceVisitProduct();
  }, [embed, isHeatmapPreview]);

  useEffect(() => {
    if (!embed) return;
    const root = document.documentElement;
    const body = document.body;
    const previousRootOverflow = root.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    root.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      root.style.overflow = previousRootOverflow;
      body.style.overflow = previousBodyOverflow;
    };
  }, [embed]);

  useEffect(() => {
    const preferredColor = colorOptions.find((color) => color.inStock !== false) ?? colorOptions[0];
    const name = preferredColor?.name ?? "blue";
    setActiveColor(name);
    if (gallerySlots && gallerySlots.length > 0) {
      const idx = gallerySlots.findIndex((s) => s.colorName === name);
      setPreviewImg(idx >= 0 ? idx : 0);
    } else {
      setPreviewImg(0);
    }
  }, [product.id, colorSignature, colorOptions, gallerySlots]);

  useEffect(() => {
    setQuantity(1);
  }, [product.id]);

  useEffect(() => {
    if (maxOrderQuantity == null || maxOrderQuantity <= 0) return;
    setQuantity((current) => Math.min(current, maxOrderQuantity));
  }, [maxOrderQuantity, product.id]);

  const detailPrice = useMemo(() => {
    let selectedPrice = baseDetailPrice;

    const selectedColor = colorOptions.find((color) => color.name === activeColor);
    if (parsedContent.colorHasPriceOverride && typeof selectedColor?.price === "number") {
      selectedPrice = selectedColor.price;
    }

    parsedContent.specifications.forEach((spec) => {
      if (!spec.hasPriceOverride) return;
      const selectedLabel = selectedSpecs[spec.name];
      const selectedOption = spec.options.find((option) => option.label === selectedLabel);
      if (typeof selectedOption?.price === "number") {
        selectedPrice = selectedOption.price;
      }
    });

    return selectedPrice;
  }, [activeColor, baseDetailPrice, colorOptions, parsedContent, selectedSpecs]);

  const pa = useProductAnalyticsTracking({
    productId: trackingProductId,
    productTitle: product.title,
    category: typeof product.category === "string" ? product.category : "",
    jomlaPrice: jomlaPrice ?? null,
    previewImg,
    activeTab,
    activeColor,
    selectedSpecs,
    detailPrice,
    surfaceReady: canRenderProduct,
    embed,
    disablePointerTracking: embed || isHeatmapPreview,
  });

  // pass the product here when you get the real data.
  const handlePreviewSlider = () => {
    pa.onGalleryZoom();
    openPreviewModal();
  };

  const handlePurchaseNow = () => {
    const cartItemsQty = cartItems.reduce((s, x) => s + x.quantity, 0);
    const existing = cartItems.find((x) => x.id === product.id);
    const nextLineItems = existing ? cartItems.length : cartItems.length + 1;
    const nextItemsQtyTotal = cartItemsQty + quantity;
    const nextCartTotal = totalPrice + (jomlaPrice ?? detailPrice) * quantity;
    trackProductAnalytics("pa_add_to_cart", {
      product_id: product.id,
      from: "product_page",
      quantity,
      detail_price: detailPrice,
      active_color: activeColor,
      selected_specs: selectedSpecs,
      cart_line_items: nextLineItems,
      cart_total_dzd: nextCartTotal,
      items_qty_total: nextItemsQtyTotal,
      currency: "DZD",
      page_path: typeof window !== "undefined" ? window.location.pathname : "/shop-details",
    });
    dispatch(
      addItemToCart({
        ...product,
        price: detailPrice,
        discountedPrice: jomlaPrice ?? detailPrice,
        quantity,
      })
    );
    router.push("/cart");
  };

  return (
    <>
      {!embed ?
        <Breadcrumb
          title={"Shop Details"}
          pages={["shop details"]}
          onHomeClick={() =>
            trackProductAnalytics("pa_navigation", { kind: "breadcrumb_home", href: "/" })
          }
        />
      : null}

      {!canRenderProduct ?
        requestedProductId ?
          <div className="px-4 py-16 text-center text-dark-4">Loading product…</div>
        : "Please add product"
      : (
        <>
          <div ref={pa.surfaceRef} data-product-heatmap-surface="" className="relative">
            <section
              className={
                compactEmbed ?
                  "overflow-hidden relative pb-4 pt-2"
                : "overflow-hidden relative pb-20 pt-5 lg:pt-20 xl:pt-28"
              }
            >
              <div className="max-w-[1170px] w-full mx-auto px-4 sm:px-8 xl:px-0">
              <div className="flex flex-col lg:flex-row gap-7.5 xl:gap-17.5">
                <div className="lg:max-w-[570px] w-full">
                  <div className="lg:min-h-[512px] rounded-lg shadow-1 bg-gray-2 p-4 sm:p-7.5 relative flex items-center justify-center">
                    <div className="group relative">
                      <button
                        onClick={handlePreviewSlider}
                        aria-label="button for zoom"
                        className="gallery__Image w-11 h-11 rounded-[5px] bg-gray-1 shadow-1 flex items-center justify-center ease-out duration-200 text-dark hover:text-blue absolute top-4 lg:top-6 right-4 lg:right-6 z-[60]"
                      >
                        <svg
                          className="fill-current"
                          width="22"
                          height="22"
                          viewBox="0 0 22 22"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            fillRule="evenodd"
                            clipRule="evenodd"
                            d="M9.11493 1.14581L9.16665 1.14581C9.54634 1.14581 9.85415 1.45362 9.85415 1.83331C9.85415 2.21301 9.54634 2.52081 9.16665 2.52081C7.41873 2.52081 6.17695 2.52227 5.23492 2.64893C4.31268 2.77292 3.78133 3.00545 3.39339 3.39339C3.00545 3.78133 2.77292 4.31268 2.64893 5.23492C2.52227 6.17695 2.52081 7.41873 2.52081 9.16665C2.52081 9.54634 2.21301 9.85415 1.83331 9.85415C1.45362 9.85415 1.14581 9.54634 1.14581 9.16665L1.14581 9.11493C1.1458 7.43032 1.14579 6.09599 1.28619 5.05171C1.43068 3.97699 1.73512 3.10712 2.42112 2.42112C3.10712 1.73512 3.97699 1.43068 5.05171 1.28619C6.09599 1.14579 7.43032 1.1458 9.11493 1.14581ZM16.765 2.64893C15.823 2.52227 14.5812 2.52081 12.8333 2.52081C12.4536 2.52081 12.1458 2.21301 12.1458 1.83331C12.1458 1.45362 12.4536 1.14581 12.8333 1.14581L12.885 1.14581C14.5696 1.1458 15.904 1.14579 16.9483 1.28619C18.023 1.43068 18.8928 1.73512 19.5788 2.42112C20.2648 3.10712 20.5693 3.97699 20.7138 5.05171C20.8542 6.09599 20.8542 7.43032 20.8541 9.11494V9.16665C20.8541 9.54634 20.5463 9.85415 20.1666 9.85415C19.787 9.85415 19.4791 9.54634 19.4791 9.16665C19.4791 7.41873 19.4777 6.17695 19.351 5.23492C19.227 4.31268 18.9945 3.78133 18.6066 3.39339C18.2186 3.00545 17.6873 2.77292 16.765 2.64893ZM1.83331 12.1458C2.21301 12.1458 2.52081 12.4536 2.52081 12.8333C2.52081 14.5812 2.52227 15.823 2.64893 16.765C2.77292 17.6873 3.00545 18.2186 3.39339 18.6066C3.78133 18.9945 4.31268 19.227 5.23492 19.351C6.17695 19.4777 7.41873 19.4791 9.16665 19.4791C9.54634 19.4791 9.85415 19.787 9.85415 20.1666C9.85415 20.5463 9.54634 20.8541 9.16665 20.8541H9.11494C7.43032 20.8542 6.09599 20.8542 5.05171 20.7138C3.97699 20.5693 3.10712 20.2648 2.42112 19.5788C1.73512 18.8928 1.43068 18.023 1.28619 16.9483C1.14579 15.904 1.1458 14.5696 1.14581 12.885L1.14581 12.8333C1.14581 12.4536 1.45362 12.1458 1.83331 12.1458ZM20.1666 12.1458C20.5463 12.1458 20.8541 12.4536 20.8541 12.8333V12.885C20.8542 14.5696 20.8542 15.904 20.7138 16.9483C20.5693 18.023 20.2648 18.8928 19.5788 19.5788C18.8928 20.2648 18.023 20.5693 16.9483 20.7138C15.904 20.8542 14.5696 20.8542 12.885 20.8541H12.8333C12.4536 20.8541 12.1458 20.5463 12.1458 20.1666C12.1458 19.787 12.4536 19.4791 12.8333 19.4791C14.5812 19.4791 15.823 19.4777 16.765 19.351C17.6873 19.227 18.2186 18.9945 18.6066 18.6066C18.9945 18.2186 19.227 17.6873 19.351 16.765C19.4777 15.823 19.4791 14.5812 19.4791 12.8333C19.4791 12.4536 19.787 12.1458 20.1666 12.1458Z"
                            fill=""
                          />
                        </svg>
                      </button>

                      {displayGalleryUrls[previewImg] ?
                        <ProductCatalogImageWithMerch
                          product={product}
                          src={displayGalleryUrls[previewImg]}
                          alt="products-details"
                          width={400}
                          height={400}
                          sizes={PRODUCT_PDP_HERO_IMAGE_SIZES}
                          priority={previewImg === 0}
                          heroReviewSnippet={vitrinaMerchandising.heroReviewSnippet ?? null}
                          showHeroReviewOverlay
                          showPromoLabels={false}
                          deferHeroReviewFetch={false}
                        />
                      : null}
                      {displayGalleryUrls[previewImg] ?
                        <ProductCardPromoLayer product={product} className="z-[55]" />
                      : null}
                    </div>
                  </div>

                  {/* ?  &apos;border-blue &apos; :  &apos;border-transparent&apos; */}
                  <div className="flex flex-wrap sm:flex-nowrap gap-4.5 mt-6">
                    {displayGalleryUrls.map((item, key) => (
                      <button
                        onClick={() => {
                          pa.onThumbnailSelect(key);
                          setPreviewImg(key);
                          if (gallerySlots?.[key]) {
                            setActiveColor(gallerySlots[key].colorName);
                          }
                        }}
                        key={key}
                        className={`flex items-center justify-center w-15 sm:w-25 h-15 sm:h-25 overflow-hidden rounded-lg bg-gray-2 shadow-1 ease-out duration-200 border-2 hover:border-blue ${
                          key === previewImg
                            ? "border-blue"
                            : "border-transparent"
                        }`}
                      >
                        <Image
                          width={50}
                          height={50}
                          src={item}
                          alt="thumbnail"
                          sizes={PRODUCT_PDP_THUMB_IMAGE_SIZES}
                          loading="lazy"
                          decoding="async"
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* <!-- product content --> */}
                <div className="max-w-[539px] w-full">
                  <div className="flex items-center justify-between mb-3">
                    <h2
                      ref={pa.titleRef}
                      className="font-semibold text-xl sm:text-2xl xl:text-custom-3 text-dark"
                    >
                      {product.title}
                    </h2>

                    <div className="inline-flex font-medium text-custom-sm text-white bg-blue rounded py-0.5 px-2.5">
                      30% OFF
                    </div>
                  </div>

                  <ProductCardStarsRowWithStock
                    product={{ id: product.id, instock: product.instock }}
                    className="mb-4.5"
                    stars={
                      <div className="flex items-center gap-1">
                        <svg
                          className="fill-[#FFA645]"
                          width="18"
                          height="18"
                          viewBox="0 0 18 18"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <g clipPath="url(#clip0_375_9172)">
                            <path
                              d="M16.7906 6.72187L11.7 5.93438L9.39377 1.09688C9.22502 0.759375 8.77502 0.759375 8.60627 1.09688L6.30002 5.9625L1.23752 6.72187C0.871891 6.77812 0.731266 7.25625 1.01252 7.50938L4.69689 11.3063L3.82502 16.6219C3.76877 16.9875 4.13439 17.2969 4.47189 17.0719L9.05627 14.5687L13.6125 17.0719C13.9219 17.2406 14.3156 16.9594 14.2313 16.6219L13.3594 11.3063L17.0438 7.50938C17.2688 7.25625 17.1563 6.77812 16.7906 6.72187Z"
                              fill=""
                            />
                          </g>
                          <defs>
                            <clipPath id="clip0_375_9172">
                              <rect width="18" height="18" fill="white" />
                            </clipPath>
                          </defs>
                        </svg>

                        <svg
                          className="fill-[#FFA645]"
                          width="18"
                          height="18"
                          viewBox="0 0 18 18"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <g clipPath="url(#clip0_375_9172)">
                            <path
                              d="M16.7906 6.72187L11.7 5.93438L9.39377 1.09688C9.22502 0.759375 8.77502 0.759375 8.60627 1.09688L6.30002 5.9625L1.23752 6.72187C0.871891 6.77812 0.731266 7.25625 1.01252 7.50938L4.69689 11.3063L3.82502 16.6219C3.76877 16.9875 4.13439 17.2969 4.47189 17.0719L9.05627 14.5687L13.6125 17.0719C13.9219 17.2406 14.3156 16.9594 14.2313 16.6219L13.3594 11.3063L17.0438 7.50938C17.2688 7.25625 17.1563 6.77812 16.7906 6.72187Z"
                              fill=""
                            />
                          </g>
                          <defs>
                            <clipPath id="clip0_375_9172">
                              <rect width="18" height="18" fill="white" />
                            </clipPath>
                          </defs>
                        </svg>

                        <svg
                          className="fill-[#FFA645]"
                          width="18"
                          height="18"
                          viewBox="0 0 18 18"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <g clipPath="url(#clip0_375_9172)">
                            <path
                              d="M16.7906 6.72187L11.7 5.93438L9.39377 1.09688C9.22502 0.759375 8.77502 0.759375 8.60627 1.09688L6.30002 5.9625L1.23752 6.72187C0.871891 6.77812 0.731266 7.25625 1.01252 7.50938L4.69689 11.3063L3.82502 16.6219C3.76877 16.9875 4.13439 17.2969 4.47189 17.0719L9.05627 14.5687L13.6125 17.0719C13.9219 17.2406 14.3156 16.9594 14.2313 16.6219L13.3594 11.3063L17.0438 7.50938C17.2688 7.25625 17.1563 6.77812 16.7906 6.72187Z"
                              fill=""
                            />
                          </g>
                          <defs>
                            <clipPath id="clip0_375_9172">
                              <rect width="18" height="18" fill="white" />
                            </clipPath>
                          </defs>
                        </svg>

                        <svg
                          className="fill-[#FFA645]"
                          width="18"
                          height="18"
                          viewBox="0 0 18 18"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <g clipPath="url(#clip0_375_9172)">
                            <path
                              d="M16.7906 6.72187L11.7 5.93438L9.39377 1.09688C9.22502 0.759375 8.77502 0.759375 8.60627 1.09688L6.30002 5.9625L1.23752 6.72187C0.871891 6.77812 0.731266 7.25625 1.01252 7.50938L4.69689 11.3063L3.82502 16.6219C3.76877 16.9875 4.13439 17.2969 4.47189 17.0719L9.05627 14.5687L13.6125 17.0719C13.9219 17.2406 14.3156 16.9594 14.2313 16.6219L13.3594 11.3063L17.0438 7.50938C17.2688 7.25625 17.1563 6.77812 16.7906 6.72187Z"
                              fill=""
                            />
                          </g>
                          <defs>
                            <clipPath id="clip0_375_9172">
                              <rect width="18" height="18" fill="white" />
                            </clipPath>
                          </defs>
                        </svg>

                        <svg
                          className="fill-[#FFA645]"
                          width="18"
                          height="18"
                          viewBox="0 0 18 18"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <g clipPath="url(#clip0_375_9172)">
                            <path
                              d="M16.7906 6.72187L11.7 5.93438L9.39377 1.09688C9.22502 0.759375 8.77502 0.759375 8.60627 1.09688L6.30002 5.9625L1.23752 6.72187C0.871891 6.77812 0.731266 7.25625 1.01252 7.50938L4.69689 11.3063L3.82502 16.6219C3.76877 16.9875 4.13439 17.2969 4.47189 17.0719L9.05627 14.5687L13.6125 17.0719C13.9219 17.2406 14.3156 16.9594 14.2313 16.6219L13.3594 11.3063L17.0438 7.50938C17.2688 7.25625 17.1563 6.77812 16.7906 6.72187Z"
                              fill=""
                            />
                          </g>
                          <defs>
                            <clipPath id="clip0_375_9172">
                              <rect width="18" height="18" fill="white" />
                            </clipPath>
                          </defs>
                        </svg>
                      </div>
                    }
                    trailing={<span> (See Reviews tab) </span>}
                  />

                  {vitrinaMerchandising.trendingCountdownEndsAt ?
                    <ProductTrendingCountdown
                      endsAt={vitrinaMerchandising.trendingCountdownEndsAt}
                      className="mb-4"
                    />
                  : null}

                  <div className="mb-4.5">
                    <h3
                      ref={pa.priceRef}
                      className="flex w-full max-w-full flex-col items-stretch gap-0.5"
                    >
                      {typeof jomlaPrice === "number" ? (
                        <>
                          <ProductPriceRowWithInlineStock>
                            <VitrinaPriceWithPromoTimerRow product={{ id: product.id, title: product.title }}>
                              <span className="text-lg sm:text-2xl font-semibold whitespace-nowrap text-[#FB923C]">
                                {jomlaPrice.toFixed(2)} DA
                              </span>
                            </VitrinaPriceWithPromoTimerRow>
                          </ProductPriceRowWithInlineStock>
                          <span className="text-sm sm:text-base text-dark-4 line-through whitespace-nowrap">
                            {detailPrice.toFixed(2)} DA
                          </span>
                        </>
                      ) : (
                        <ProductPriceRowWithInlineStock>
                          <span className="text-lg sm:text-2xl font-semibold whitespace-nowrap text-dark">
                            {detailPrice.toFixed(2)} DA
                          </span>
                        </ProductPriceRowWithInlineStock>
                      )}
                    </h3>
                    <ProductPriceAdjacentMeta
                      product={{
                        id: product.id,
                        title: product.title,
                        instock: availableQuantity ?? undefined,
                      }}
                    />
                  </div>

                  <ul className="flex flex-col gap-2">
                    <li className="flex items-center gap-2.5">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M13.3589 8.35863C13.603 8.11455 13.603 7.71882 13.3589 7.47475C13.1149 7.23067 12.7191 7.23067 12.4751 7.47475L8.75033 11.1995L7.5256 9.97474C7.28152 9.73067 6.8858 9.73067 6.64172 9.97474C6.39764 10.2188 6.39764 10.6146 6.64172 10.8586L8.30838 12.5253C8.55246 12.7694 8.94819 12.7694 9.19227 12.5253L13.3589 8.35863Z"
                          fill="#3C50E0"
                        />
                        <path
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M10.0003 1.04169C5.05277 1.04169 1.04199 5.05247 1.04199 10C1.04199 14.9476 5.05277 18.9584 10.0003 18.9584C14.9479 18.9584 18.9587 14.9476 18.9587 10C18.9587 5.05247 14.9479 1.04169 10.0003 1.04169ZM2.29199 10C2.29199 5.74283 5.74313 2.29169 10.0003 2.29169C14.2575 2.29169 17.7087 5.74283 17.7087 10C17.7087 14.2572 14.2575 17.7084 10.0003 17.7084C5.74313 17.7084 2.29199 14.2572 2.29199 10Z"
                          fill="#3C50E0"
                        />
                      </svg>
                      Free delivery available
                    </li>

                    <li className="flex items-center gap-2.5">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M13.3589 8.35863C13.603 8.11455 13.603 7.71882 13.3589 7.47475C13.1149 7.23067 12.7191 7.23067 12.4751 7.47475L8.75033 11.1995L7.5256 9.97474C7.28152 9.73067 6.8858 9.73067 6.64172 9.97474C6.39764 10.2188 6.39764 10.6146 6.64172 10.8586L8.30838 12.5253C8.55246 12.7694 8.94819 12.7694 9.19227 12.5253L13.3589 8.35863Z"
                          fill="#3C50E0"
                        />
                        <path
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M10.0003 1.04169C5.05277 1.04169 1.04199 5.05247 1.04199 10C1.04199 14.9476 5.05277 18.9584 10.0003 18.9584C14.9479 18.9584 18.9587 14.9476 18.9587 10C18.9587 5.05247 14.9479 1.04169 10.0003 1.04169ZM2.29199 10C2.29199 5.74283 5.74313 2.29169 10.0003 2.29169C14.2575 2.29169 17.7087 5.74283 17.7087 10C17.7087 14.2572 14.2575 17.7084 10.0003 17.7084C5.74313 17.7084 2.29199 14.2572 2.29199 10Z"
                          fill="#3C50E0"
                        />
                      </svg>
                      Sales 30% Off Use Code: PROMO30
                    </li>
                  </ul>

                  <p className="mt-5 text-custom-sm text-dark-4">
                    {parsedContent.description ||
                      "High-quality product built for reliable daily performance and comfort."}
                  </p>

                  <form onSubmit={(e) => e.preventDefault()}>
                    <div className="flex flex-col gap-4.5 border-y border-gray-3 mt-7.5 mb-9 py-9">
                      <div className="flex items-center gap-4">
                        <div className="min-w-[65px]">
                          <h4 className="font-medium text-dark">Color:</h4>
                        </div>
                        <div className="flex flex-wrap items-center gap-2.5">
                          {colorOptions.map((color, key) => (
                            <label key={key} htmlFor={`color-${color.name}-${key}`} className="cursor-pointer select-none flex items-center">
                              <div className="relative">
                                <input
                                  type="radio"
                                  name="color"
                                  id={`color-${color.name}-${key}`}
                                  className="sr-only"
                                  checked={activeColor === color.name}
                                  onChange={() => {
                                    if (color.inStock === false) {
                                      trackProductAnalytics("pa_select_option", {
                                        blocked: true,
                                        axis: "color",
                                        color: color.name,
                                      });
                                      return;
                                    }
                                    setActiveColor(color.name);
                                    if (gallerySlots && gallerySlots.length > 0) {
                                      const idx = gallerySlots.findIndex((s) => s.colorName === color.name);
                                      if (idx >= 0) setPreviewImg(idx);
                                    }
                                  }}
                                />
                                <div
                                  className={`flex items-center justify-center w-5.5 h-5.5 rounded-full ${
                                    activeColor === color.name ? "border" : ""
                                  }`}
                                  style={{ borderColor: color.name }}
                                >
                                  <span className="block w-3 h-3 rounded-full" style={{ backgroundColor: color.name }} />
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>

                      {parsedContent.specifications.map((spec) => (
                        <div key={spec.name} className="flex items-center gap-4">
                          <div className="min-w-[90px]">
                            <h4 className="font-medium text-dark">{spec.name}:</h4>
                          </div>
                          <div className="flex flex-wrap items-center gap-4">
                            {spec.options.map((option) => {
                              const optionId = `${spec.name}-${option.label}`;
                              const checked = selectedSpecs[spec.name] === option.label;
                              return (
                                <label key={optionId} htmlFor={optionId} className="flex cursor-pointer select-none items-center">
                                  <div className="relative">
                                    <input
                                      type="radio"
                                      name={`spec-${spec.name}`}
                                      id={optionId}
                                      className="sr-only"
                                      checked={checked}
                                      onChange={() =>
                                        setSelectedSpecs((prev) => ({
                                          ...prev,
                                          [spec.name]: option.label,
                                        }))
                                      }
                                    />
                                    <div
                                      className={`mr-2 flex h-4 w-4 items-center justify-center rounded border ${
                                        checked ? "border-blue bg-blue" : "border-gray-4"
                                      }`}
                                    >
                                      <span className={checked ? "opacity-100" : "opacity-0"}>
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                          <rect x="4" y="4.00006" width="16" height="16" rx="4" fill="#3C50E0" />
                                          <path
                                            fillRule="evenodd"
                                            clipRule="evenodd"
                                            d="M16.3103 9.25104C16.471 9.41178 16.5612 9.62978 16.5612 9.85707C16.5612 10.0844 16.471 10.3024 16.3103 10.4631L12.0243 14.7491C11.8635 14.9098 11.6455 15.0001 11.4182 15.0001C11.191 15.0001 10.973 14.9098 10.8122 14.7491L8.24062 12.1775C8.08448 12.0158 7.99808 11.7993 8.00003 11.5745C8.00199 11.3498 8.09214 11.1348 8.25107 10.9759C8.41 10.8169 8.62499 10.7268 8.84975 10.7248C9.0745 10.7229 9.29103 10.8093 9.4527 10.9654L11.4182 12.931L15.0982 9.25104C15.2589 9.09034 15.4769 9.00006 15.7042 9.00006C15.9315 9.00006 16.1495 9.09034 16.3103 9.25104Z"
                                            fill="white"
                                          />
                                        </svg>
                                      </span>
                                    </div>
                                  </div>
                                  {option.label}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-4.5">
                      <div className="flex items-center rounded-md border border-gray-3">
                        <button
                          aria-label="button for remove product"
                          className="flex items-center justify-center w-12 h-12 ease-out duration-200 hover:text-blue"
                          onClick={() =>
                            quantity > 1 && setQuantity(quantity - 1)
                          }
                        >
                          <svg
                            className="fill-current"
                            width="20"
                            height="20"
                            viewBox="0 0 20 20"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M3.33301 10.0001C3.33301 9.53984 3.7061 9.16675 4.16634 9.16675H15.833C16.2932 9.16675 16.6663 9.53984 16.6663 10.0001C16.6663 10.4603 16.2932 10.8334 15.833 10.8334H4.16634C3.7061 10.8334 3.33301 10.4603 3.33301 10.0001Z"
                              fill=""
                            />
                          </svg>
                        </button>

                        <span className="flex items-center justify-center w-16 h-12 border-x border-gray-4">
                          {quantity}
                        </span>

                        <button
                          onClick={() => {
                            if (maxOrderQuantity != null) {
                              setQuantity((current) => Math.min(maxOrderQuantity, current + 1));
                              return;
                            }
                            setQuantity(quantity + 1);
                          }}
                          aria-label="button for add product"
                          className="flex items-center justify-center w-12 h-12 ease-out duration-200 hover:text-blue disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={maxOrderQuantity != null && quantity >= maxOrderQuantity}
                        >
                          <svg
                            className="fill-current"
                            width="20"
                            height="20"
                            viewBox="0 0 20 20"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M3.33301 10C3.33301 9.5398 3.7061 9.16671 4.16634 9.16671H15.833C16.2932 9.16671 16.6663 9.5398 16.6663 10C16.6663 10.4603 16.2932 10.8334 15.833 10.8334H4.16634C3.7061 10.8334 3.33301 10.4603 3.33301 10Z"
                              fill=""
                            />
                            <path
                              d="M9.99967 16.6667C9.53944 16.6667 9.16634 16.2936 9.16634 15.8334L9.16634 4.16671C9.16634 3.70647 9.53944 3.33337 9.99967 3.33337C10.4599 3.33337 10.833 3.70647 10.833 4.16671L10.833 15.8334C10.833 16.2936 10.4599 16.6667 9.99967 16.6667Z"
                              fill=""
                            />
                          </svg>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handlePurchaseNow}
                        disabled={maxOrderQuantity === 0}
                        className="inline-flex font-medium text-white bg-blue py-3 px-7 rounded-md ease-out duration-200 hover:bg-blue-dark disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Purchase Now
                      </button>

                      <button
                        type="button"
                        className="flex items-center justify-center w-12 h-12 rounded-md border border-gray-3 ease-out duration-200 hover:text-white hover:bg-dark hover:border-transparent"
                      >
                        <svg
                          className="fill-current"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            fillRule="evenodd"
                            clipRule="evenodd"
                            d="M5.62436 4.42423C3.96537 5.18256 2.75 6.98626 2.75 9.13713C2.75 11.3345 3.64922 13.0283 4.93829 14.4798C6.00072 15.6761 7.28684 16.6677 8.54113 17.6346C8.83904 17.8643 9.13515 18.0926 9.42605 18.3219C9.95208 18.7366 10.4213 19.1006 10.8736 19.3649C11.3261 19.6293 11.6904 19.75 12 19.75C12.3096 19.75 12.6739 19.6293 13.1264 19.3649C13.5787 19.1006 14.0479 18.7366 14.574 18.3219C14.8649 18.0926 15.161 17.8643 15.4589 17.6346C16.7132 16.6677 17.9993 15.6761 19.0617 14.4798C20.3508 13.0283 21.25 11.3345 21.25 9.13713C21.25 6.98626 20.0346 5.18256 18.3756 4.42423C16.7639 3.68751 14.5983 3.88261 12.5404 6.02077C12.399 6.16766 12.2039 6.25067 12 6.25067C11.7961 6.25067 11.601 6.16766 11.4596 6.02077C9.40166 3.88261 7.23607 3.68751 5.62436 4.42423ZM12 4.45885C9.68795 2.39027 7.09896 2.1009 5.00076 3.05999C2.78471 4.07296 1.25 6.42506 1.25 9.13713C1.25 11.8027 2.3605 13.8361 3.81672 15.4758C4.98287 16.789 6.41022 17.888 7.67083 18.8586C7.95659 19.0786 8.23378 19.2921 8.49742 19.4999C9.00965 19.9037 9.55954 20.3343 10.1168 20.66C10.6739 20.9855 11.3096 21.25 12 21.25C12.6904 21.25 13.3261 20.9855 13.8832 20.66C14.4405 20.3343 14.9903 19.9037 15.5026 19.4999C15.7662 19.2921 16.0434 19.0786 16.3292 18.8586C17.5898 17.888 19.0171 16.789 20.1833 15.4758C21.6395 13.8361 22.75 11.8027 22.75 9.13713C22.75 6.42506 21.2153 4.07296 18.9992 3.05999C16.901 2.1009 14.3121 2.39027 12 4.45885Z"
                            fill=""
                          />
                        </svg>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </section>

          <section className="overflow-hidden bg-gray-2 py-20">
            <div className="max-w-[1170px] w-full mx-auto px-4 sm:px-8 xl:px-0">
              {/* <!--== tab header start ==--> */}
              <div className="flex flex-wrap items-center bg-white rounded-[10px] shadow-1 gap-5 xl:gap-12.5 py-4.5 px-4 sm:px-6">
                {tabs.map((item, key) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(item.id)}
                    className={`font-medium lg:text-lg ease-out duration-200 hover:text-blue relative before:h-0.5 before:bg-blue before:absolute before:left-0 before:bottom-0 before:ease-out before:duration-200 hover:before:w-full ${
                      activeTab === item.id
                        ? "text-blue before:w-full"
                        : "text-dark before:w-0"
                    }`}
                  >
                    {item.title}
                  </button>
                ))}
              </div>
              {/* <!--== tab header end ==--> */}

              {/* <!--== tab content start ==--> */}
              {/* <!-- tab content one start --> */}
              <div>
                <div
                  className={`flex-col sm:flex-row gap-7.5 xl:gap-12.5 mt-12.5 ${
                    activeTab === "tabOne" ? "flex" : "hidden"
                  }`}
                >
                  <div className="max-w-[670px] w-full">
                    <h2 className="font-medium text-2xl text-dark mb-7">
                      Specifications:
                    </h2>

                    <p className="mb-6">
                      {parsedContent.description ||
                        "This product is designed to deliver reliable quality, practical features, and strong everyday value."}
                    </p>
                    {parsedContent.specifications.length > 0 && (
                      <div className="rounded-xl bg-white shadow-1 p-4 sm:p-6">
                        {parsedContent.specifications.map((spec) => (
                          <div key={spec.name} className="rounded-md even:bg-gray-1 flex py-3 px-4 sm:px-5">
                            <div className="max-w-[220px] min-w-[140px] w-full">
                              <p className="text-sm sm:text-base text-dark">{spec.name}</p>
                            </div>
                            <div className="w-full">
                              <p className="text-sm sm:text-base text-dark">{spec.options.join(" | ")}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="max-w-[447px] w-full">
                    <h2 className="font-medium text-2xl text-dark mb-7">
                      Care & Maintenance:
                    </h2>

                    <p>
                      {parsedContent.careMaintenance ||
                        "Follow standard care and maintenance recommendations to preserve quality and performance."}
                    </p>
                  </div>
                </div>
              </div>
              {/* <!-- tab content one end --> */}

              {/* <!-- tab content two start --> */}
              <div>
                <div
                  className={`rounded-xl bg-white shadow-1 p-4 sm:p-6 mt-10 ${
                    activeTab === "tabTwo" ? "block" : "hidden"
                  }`}
                >
                  {parsedContent.additionalInfo.filter((row) => !isVitrinaMerchandisingKey(row.key)).length > 0 ? (
                    parsedContent.additionalInfo
                      .filter((row) => !isVitrinaMerchandisingKey(row.key))
                      .map((row) => (
                      <div key={row.key} className="rounded-md even:bg-gray-1 flex py-4 px-4 sm:px-5">
                        <div className="max-w-[450px] min-w-[140px] w-full">
                          <p className="text-sm sm:text-base text-dark">{row.key}</p>
                        </div>
                        <div className="w-full">
                          <p className="text-sm sm:text-base text-dark">{row.value}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-md even:bg-gray-1 flex py-4 px-4 sm:px-5">
                      <div className="w-full">
                        <p className="text-sm sm:text-base text-dark">
                          Additional information is not available for this product.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {/* <!-- tab content two end --> */}

              {/* <!-- tab content three start --> */}
              <div className={activeTab === "tabThree" ? "block" : "hidden"}>
                <ReviewsTab
                  productId={product.id}
                  productTitle={product.title}
                  salesTracking
                  reviewsTabActive={activeTab === "tabThree"}
                />
              </div>
              {/* <!-- tab content three end --> */}
              {/* <!--== tab content end ==--> */}
            </div>
          </section>
          </div>

          {!embed ?
            <>
              <RecentlyViewdItems />
              <Newsletter />
            </>
          : null}
          {!embed ?
            <ProductPageAssistant product={product} availabilityLabel="In Stock" />
          : null}
        </>
      )}
    </>
  );
};

export default ShopDetails;
