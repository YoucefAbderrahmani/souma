"use client";
import React from "react";
import HeroCarousel from "./HeroCarousel";
import HeroFeature from "./HeroFeature";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/redux/store";
import { updateproductDetails } from "@/redux/features/product-details";
import shopData from "@/components/Shop/shopData";
import { usePriceMode } from "@/app/context/PriceModeContext";
import { getVisibleProductsForMode } from "@/lib/price-mode";
import { sequenceStartProduct } from "@/lib/sequence-client";

const Hero = () => {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { mode } = usePriceMode();
  const visibleProducts = getVisibleProductsForMode(shopData, mode);
  const topPhone =
    visibleProducts.find((item) => item.title.includes("iPhone")) ?? visibleProducts[0];
  const topHeadphone =
    visibleProducts.find((item) => item.title === "Wireless Headphone") ?? visibleProducts[0];

  const openDetails = (product?: (typeof shopData)[number]) => {
    if (!product) return;
    dispatch(updateproductDetails({ ...product }));
    localStorage.setItem("productDetails", JSON.stringify(product));
    sequenceStartProduct(product.title);
    router.push("/shop-details");
  };

  return (
    <section className="overflow-hidden pb-10 lg:pb-12.5 xl:pb-15 pt-57.5 sm:pt-45 lg:pt-30 xl:pt-51.5 bg-[#FFF7F0]">
      <div className="max-w-[1170px] w-full mx-auto px-4 sm:px-8 xl:px-0">
        <div className="flex flex-wrap gap-5">
          <div className="xl:max-w-[757px] w-full">
            <div className="relative z-1 rounded-[10px] bg-white overflow-hidden">
              {/* <!-- bg shapes --> */}
              <Image
                src="/images/hero/hero-bg.png"
                alt="hero bg shapes"
                className="absolute right-0 bottom-0 -z-1"
                width={534}
                height={520}
              />

              <HeroCarousel />
            </div>
          </div>

          <div className="xl:max-w-[393px] w-full">
            <div className="flex flex-col sm:flex-row xl:flex-col gap-5">
              <div
                className="w-full relative rounded-[10px] bg-white p-4 sm:p-7.5 cursor-pointer"
                onClick={() => openDetails(topPhone)}
              >
                <div className="flex items-center gap-14">
                  <div>
                    <h2 className="max-w-[153px] font-semibold text-dark text-xl mb-20">
                      <button
                        type="button"
                        onClick={() => openDetails(topPhone)}
                        className="text-left hover:text-blue duration-200"
                      >
                        iPhone 14 Plus & 14 Pro Max
                      </button>
                    </h2>

                    <div>
                      <p className="font-medium text-dark-4 text-custom-sm mb-1.5">
                        limited time offer
                      </p>
                      <span className="flex items-center gap-3">
                        <span className="font-medium text-heading-5 text-red whitespace-nowrap">
                          699 DA
                        </span>
                        <span className="font-medium text-2xl text-dark-4 line-through whitespace-nowrap">
                          999 DA
                        </span>
                      </span>
                    </div>
                  </div>

                  <div>
                    <Image
                      src="/images/hero/hero-02.png"
                      alt="mobile image"
                      width={123}
                      height={161}
                    />
                  </div>
                </div>
              </div>
              <div
                className="w-full relative rounded-[10px] bg-white p-4 sm:p-7.5 cursor-pointer"
                onClick={() => openDetails(topHeadphone)}
              >
                <div className="flex items-center gap-14">
                  <div>
                    <h2 className="max-w-[153px] font-semibold text-dark text-xl mb-20">
                      <button
                        type="button"
                        onClick={() => openDetails(topHeadphone)}
                        className="text-left hover:text-blue duration-200"
                      >
                        Wireless Headphone
                      </button>
                    </h2>

                    <div>
                      <p className="font-medium text-dark-4 text-custom-sm mb-1.5">
                        limited time offer
                      </p>
                      <span className="flex items-center gap-3">
                        <span className="font-medium text-heading-5 text-red whitespace-nowrap">
                          699 DA
                        </span>
                        <span className="font-medium text-2xl text-dark-4 line-through whitespace-nowrap">
                          999 DA
                        </span>
                      </span>
                    </div>
                  </div>

                  <div>
                    <Image
                      src="/images/hero/hero-01.png"
                      alt="mobile image"
                      width={123}
                      height={161}
                    />
                  </div>
                </div>
              </div>

              
            </div>
          </div>
        </div>
      </div>

      {/* <!-- Hero features --> */}
      <HeroFeature />
    </section>
  );
};

export default Hero;
