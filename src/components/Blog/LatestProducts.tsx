"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useDispatch } from "react-redux";
import { usePriceMode } from "@/app/context/PriceModeContext";
import { getVisibleProductsForMode } from "@/lib/price-mode";
import { updateproductDetails } from "@/redux/features/product-details";
import { AppDispatch } from "@/redux/store";
import { sequenceStartProduct } from "@/lib/sequence-client";

const LatestProducts = ({ products }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { mode } = usePriceMode();
  const visibleProducts = getVisibleProductsForMode(products, mode);

  const goToProduct = (product: (typeof products)[number]) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("productDetails", JSON.stringify(product));
    }
    dispatch(updateproductDetails({ ...product }));
    sequenceStartProduct(product.title);
  };

  return (
    <div className="shadow-1 bg-white rounded-xl mt-7.5">
      <div className="px-4 sm:px-6 py-4.5 border-b border-gray-3">
        <h2 className="font-medium text-lg text-dark">Latest Products</h2>
      </div>

      <div className="p-4 sm:p-6">
        <div className="flex flex-col gap-6">
          {/* <!-- product item --> */}
          {visibleProducts.slice(0, 3).map((product, key) => {
            const detailPrice = product.detailPrice ?? 0;
            const jomlaPrice = product.jomlaPrice;

            return (
            <div className="flex items-center gap-6" key={key}>
              <div className="flex items-center justify-center rounded-[10px] bg-gray-3 max-w-[90px] w-full h-22.5">
                <Image src={product.imgs?.thumbnails?.[0]} alt="product" width={74} height={74} />
              </div>

              <div>
                <h3 className="font-medium text-dark mb-1 ease-out duration-200 hover:text-blue">
                  <Link href="/shop-details" onClick={() => goToProduct(product)}>
                    {" "}
                    {product.title}{" "}
                  </Link>
                </h3>
                <div className="text-custom-sm">
                  {typeof jomlaPrice === "number" ? (
                    <>
                      <p className="bg-gradient-to-r from-blue to-[#6677ff] bg-clip-text text-transparent whitespace-nowrap">
                        Price: {jomlaPrice.toFixed(2)} DA
                      </p>
                      <p className="text-dark-4 text-xs whitespace-nowrap line-through">
                        {detailPrice.toFixed(2)} DA
                      </p>
                    </>
                  ) : (
                    <p className="text-dark whitespace-nowrap">
                      Price: {detailPrice.toFixed(2)} DA
                    </p>
                  )}
                </div>
              </div>
            </div>
          )})}
        </div>
      </div>
    </div>
  );
};

export default LatestProducts;
