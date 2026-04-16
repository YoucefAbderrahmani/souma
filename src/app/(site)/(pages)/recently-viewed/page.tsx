"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Breadcrumb from "@/components/Common/Breadcrumb";
import { Product } from "@/types/product";

const RecentlyViewedPage = () => {
  const [product, setProduct] = useState<Product | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("productDetails");
      if (!raw) return;
      const parsed = JSON.parse(raw) as Product;
      if (parsed?.id) {
        setProduct(parsed);
      }
    } catch {
      setProduct(null);
    }
  }, []);

  return (
    <>
      <Breadcrumb title={"Recently Viewed"} pages={["Recently Viewed"]} />
      <section className="overflow-hidden py-20 bg-gray-2">
        <div className="max-w-[1170px] w-full mx-auto px-4 sm:px-8 xl:px-0">
          {product ? (
            <div className="rounded-xl bg-white p-6 shadow-1 sm:p-8">
              <h2 className="mb-6 text-xl font-semibold text-dark">Your last viewed product</h2>
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <div className="flex h-30 w-30 items-center justify-center rounded-lg bg-gray-1">
                  <Image
                    src={product.imgs?.thumbnails?.[0] ?? "/images/products/product-1-sm-1.png"}
                    alt={product.title}
                    width={120}
                    height={120}
                  />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-dark">{product.title}</h3>
                  <p className="mt-1 text-dark-4 capitalize">{product.category.replace("-", " ")}</p>
                  <p className="mt-2 font-medium text-dark">{product.detailPrice.toFixed(2)} DA</p>
                </div>
                <Link
                  href="/shop-details"
                  className="inline-flex items-center justify-center rounded-md bg-blue px-6 py-3 font-medium text-white transition hover:bg-blue-dark"
                >
                  Open Product
                </Link>
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-white p-8 text-center shadow-1">
              <h2 className="text-xl font-semibold text-dark">No recently viewed products yet</h2>
              <p className="mt-2 text-dark-4">
                Browse products and open one to see it listed here.
              </p>
              <Link
                href="/shop-with-sidebar"
                className="mt-6 inline-flex items-center justify-center rounded-md bg-blue px-6 py-3 font-medium text-white transition hover:bg-blue-dark"
              >
                Go to Shop
              </Link>
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default RecentlyViewedPage;
