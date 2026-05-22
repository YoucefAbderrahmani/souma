"use client";
import React from "react";
import { Product } from "@/types/product";
import { addItemToCart, selectCartItems, selectTotalPrice } from "@/redux/features/cart-slice";
import { AddToWishlistButton } from "@/components/Common/AddToWishlistButton";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch } from "@/redux/store";
import Link from "next/link";
import { updateproductDetails } from "@/redux/features/product-details";
import { useRouter } from "next/navigation";
import { sequenceStartProduct } from "@/lib/sequence-client";
import { trackProductAnalytics } from "@/lib/product-analytics-client";
import { useAppSelector } from "@/redux/store";
import { productDetailsHref } from "@/lib/product-page-link";
import { ProductCardStarsRowWithStock } from "@/components/Common/ProductCardStarsRowWithStock";
import { ProductPriceAdjacentMeta } from "@/components/Common/ProductPriceAdjacentMeta";
import { ProductPriceRowWithInlineStock } from "@/components/Common/ProductPriceRowWithInlineStock";
import { VitrinaPriceWithPromoTimerRow } from "@/components/Common/ProductPromoPriceRowLabels";
import { ProductCatalogImageWithMerch } from "@/components/Common/ProductCatalogImageWithMerch";
import { resolveProductImageClassNames } from "@/lib/product-image-display";
import { PRODUCT_CARD_IMAGE_FRAME_SHADOW_CLASS } from "@/lib/product-image-sizes";
import { ProductCardPromoLayer } from "@/components/Common/ProductCardPromoLayer";
import { ProductRatingStars } from "@/components/Common/ProductRatingStars";

const SingleGridItem = ({ item }: { item: Product }) => {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const cartItems = useAppSelector(selectCartItems);
  const cartTotal = useSelector(selectTotalPrice);

  const detailPrice = item.detailPrice;
  const jomlaPrice = item.jomlaPrice;

  const handleOpenQuickView = () => {
    dispatch(updateproductDetails({ ...item }));
    localStorage.setItem("productDetails", JSON.stringify(item));
    sequenceStartProduct(item.title);
    router.push(productDetailsHref(item.id));
  };

  const goToProductPage = () => {
    dispatch(updateproductDetails({ ...item }));
    localStorage.setItem("productDetails", JSON.stringify(item));
    sequenceStartProduct(item.title);
  };

  // add to cart
  const handleAddToCart = () => {
    const unitPrice = jomlaPrice ?? detailPrice;
    const existing = cartItems.find((x) => x.id === item.id);
    const nextLineItems = existing ? cartItems.length : cartItems.length + 1;
    const nextItemsQtyTotal = cartItems.reduce((s, x) => s + x.quantity, 0) + 1;
    const nextCartTotal = cartTotal + unitPrice;
    trackProductAnalytics("pa_add_to_cart", {
      product_id: item.id,
      from: "shop_grid",
      quantity: 1,
      detail_price: detailPrice,
      cart_line_items: nextLineItems,
      cart_total_dzd: nextCartTotal,
      items_qty_total: nextItemsQtyTotal,
      currency: "DZD",
      page_path: typeof window !== "undefined" ? window.location.pathname : "/",
    });
    dispatch(
      addItemToCart({
        ...item,
        price: detailPrice,
        discountedPrice: jomlaPrice ?? detailPrice,
        quantity: 1,
      })
    );
  };

  return (
    <div className="group flex h-full flex-col">
      <div className={PRODUCT_CARD_IMAGE_FRAME_SHADOW_CLASS}>
        <button
          type="button"
          onClick={handleOpenQuickView}
          aria-label={`Quick view ${item.title}`}
          className="absolute inset-0 z-10 flex items-center justify-center"
        >
          <ProductCatalogImageWithMerch
            product={item}
            src={item.imgs.previews[0]}
            alt=""
            width={250}
            height={250}
            fillFrame
            imageClassName={resolveProductImageClassNames(item.title, {
              colorName: item.colorImageSlots?.[0]?.colorName,
              surface: "card",
            })}
            heroReviewSnippet={item.heroReviewSnippet ?? null}
            showHeroReviewOverlay
            showPromoLabels={false}
          />
        </button>

        <div className="absolute left-0 bottom-0 z-20 w-full translate-y-full flex items-center justify-center gap-2.5 pb-5 ease-linear duration-200 group-hover:translate-y-0">
          <button
            onClick={handleOpenQuickView}
            id="newOne"
            aria-label="button for quick view"
            className="flex items-center justify-center w-9 h-9 rounded-[5px] shadow-1 ease-out duration-200 text-dark bg-white hover:text-blue"
          >
            <svg
              className="fill-current"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M8.00016 5.5C6.61945 5.5 5.50016 6.61929 5.50016 8C5.50016 9.38071 6.61945 10.5 8.00016 10.5C9.38087 10.5 10.5002 9.38071 10.5002 8C10.5002 6.61929 9.38087 5.5 8.00016 5.5ZM6.50016 8C6.50016 7.17157 7.17174 6.5 8.00016 6.5C8.82859 6.5 9.50016 7.17157 9.50016 8C9.50016 8.82842 8.82859 9.5 8.00016 9.5C7.17174 9.5 6.50016 8.82842 6.50016 8Z"
                fill=""
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M8.00016 2.16666C4.99074 2.16666 2.96369 3.96946 1.78721 5.49791L1.76599 5.52546C1.49992 5.87102 1.25487 6.18928 1.08862 6.5656C0.910592 6.96858 0.833496 7.40779 0.833496 8C0.833496 8.5922 0.910592 9.03142 1.08862 9.4344C1.25487 9.81072 1.49992 10.129 1.76599 10.4745L1.78721 10.5021C2.96369 12.0305 4.99074 13.8333 8.00016 13.8333C11.0096 13.8333 13.0366 12.0305 14.2131 10.5021L14.2343 10.4745C14.5004 10.129 14.7455 9.81072 14.9117 9.4344C15.0897 9.03142 15.1668 8.5922 15.1668 8C15.1668 7.40779 15.0897 6.96858 14.9117 6.5656C14.7455 6.18927 14.5004 5.87101 14.2343 5.52545L14.2131 5.49791C13.0366 3.96946 11.0096 2.16666 8.00016 2.16666ZM2.57964 6.10786C3.66592 4.69661 5.43374 3.16666 8.00016 3.16666C10.5666 3.16666 12.3344 4.69661 13.4207 6.10786C13.7131 6.48772 13.8843 6.7147 13.997 6.9697C14.1023 7.20801 14.1668 7.49929 14.1668 8C14.1668 8.50071 14.1023 8.79199 13.997 9.0303C13.8843 9.28529 13.7131 9.51227 13.4207 9.89213C12.3344 11.3034 10.5666 12.8333 8.00016 12.8333C5.43374 12.8333 3.66592 11.3034 2.57964 9.89213C2.28725 9.51227 2.11599 9.28529 2.00334 9.0303C1.89805 8.79199 1.8335 8.50071 1.8335 8C1.8335 7.49929 1.89805 7.20801 2.00334 6.9697C2.11599 6.7147 2.28725 6.48772 2.57964 6.10786Z"
                fill=""
              />
            </svg>
          </button>

          <button
            onClick={() => handleAddToCart()}
            className="inline-flex font-medium text-custom-sm py-[7px] px-5 rounded-[5px] bg-blue text-white ease-out duration-200 hover:bg-blue-dark"
          >
            Add to cart
          </button>

          <AddToWishlistButton
            id="favOne"
            from="shop_grid"
            product={{
              id: item.id,
              title: item.title,
              detailPrice,
              jomlaPrice,
              category: item.category,
              imgs: item.imgs,
            }}
          />
        </div>

        <ProductCardPromoLayer product={item} />
      </div>

      <ProductCardStarsRowWithStock
        product={item}
        stars={<ProductRatingStars rating={item.averageRating} size={15} />}
        trailing={<p className="text-custom-sm">({item.reviews})</p>}
      />

      <h3 className="font-medium text-dark ease-out duration-200 hover:text-blue mb-1.5">
        <Link href={productDetailsHref(item.id)} onClick={goToProductPage}>
          {" "}
          {item.title}{" "}
        </Link>
      </h3>

      <span className="flex w-full max-w-full flex-col items-stretch gap-0.5 font-medium">
        {typeof jomlaPrice === "number" ? (
          <>
            <ProductPriceRowWithInlineStock>
              <VitrinaPriceWithPromoTimerRow product={{ id: item.id, title: item.title }}>
                <span className="whitespace-nowrap text-[#FB923C] text-lg">
                  {jomlaPrice.toFixed(2)} DA
                </span>
              </VitrinaPriceWithPromoTimerRow>
            </ProductPriceRowWithInlineStock>
            <span className="text-dark-4 line-through whitespace-nowrap text-sm">
              {detailPrice.toFixed(2)} DA
            </span>
          </>
        ) : (
          <ProductPriceRowWithInlineStock>
            <span className="whitespace-nowrap text-dark text-lg">{detailPrice.toFixed(2)} DA</span>
          </ProductPriceRowWithInlineStock>
        )}
      </span>
      <ProductPriceAdjacentMeta product={item} />
    </div>
  );
};

export default SingleGridItem;
