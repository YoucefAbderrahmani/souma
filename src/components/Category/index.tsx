"use client";

import React, { useEffect } from "react";
import { sequenceStartCategory } from "@/lib/sequence-client";
import Breadcrumb from "@/components/Common/Breadcrumb";
import ProductItem from "@/components/Common/ProductItem";
import categories from "@/components/Home/Categories/categoryData";
import { usePriceMode } from "@/app/context/PriceModeContext";
import { getVisibleProductsForMode } from "@/lib/price-mode";
import { Product } from "@/types/product";

const Category = ({ slug, products }: { slug: string; products: Product[] }) => {
  const { mode } = usePriceMode();

  useEffect(() => {
    sequenceStartCategory(slug);
  }, [slug]);

  const category = categories.find((item) => item.slug === slug);
  const visibleProducts = getVisibleProductsForMode(products, mode);
  const filteredProducts = visibleProducts.filter((item) => item.category === slug);

  return (
    <>
      <Breadcrumb
        title={category ? category.title : "Category"}
        pages={["shop", "/", category ? category.title : "category"]}
      />

      <section className="overflow-hidden pb-20 pt-5 lg:pt-20 xl:pt-28">
        <div className="max-w-[1170px] w-full mx-auto px-4 sm:px-8 xl:px-0">
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-7.5 gap-y-9">
              {filteredProducts.map((item) => (
                <ProductItem item={item} key={item.id} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-gray-3 p-8 text-center">
              <h2 className="font-semibold text-dark mb-2">No products found</h2>
              <p>We will add products to this category soon.</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default Category;
