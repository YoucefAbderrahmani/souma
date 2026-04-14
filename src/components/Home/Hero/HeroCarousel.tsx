"use client";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";

// Import Swiper styles
import "swiper/css/pagination";
import "swiper/css";

import Image from "next/image";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/redux/store";
import { updateproductDetails } from "@/redux/features/product-details";
import { useRouter } from "next/navigation";
import shopData from "@/components/Shop/shopData";
import { usePriceMode } from "@/app/context/PriceModeContext";
import { getVisibleProductsForMode } from "@/lib/price-mode";
import { sequenceStartProduct } from "@/lib/sequence-client";

const HeroCarousal = () => {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { mode } = usePriceMode();
  const visibleProducts = getVisibleProductsForMode(shopData, mode);
  const slideOneProduct = visibleProducts[0] ?? shopData[0];
  const slideTwoProduct = visibleProducts[1] ?? visibleProducts[0] ?? shopData[0];

  const openDetails = (product: (typeof shopData)[number]) => {
    dispatch(updateproductDetails({ ...product }));
    localStorage.setItem("productDetails", JSON.stringify(product));
    sequenceStartProduct(product.title);
    router.push("/shop-details");
  };

  return (
    <Swiper
      spaceBetween={30}
      centeredSlides={true}
      autoplay={{
        delay: 2500,
        disableOnInteraction: false,
      }}
      pagination={{
        clickable: true,
      }}
      modules={[Autoplay, Pagination]}
      className="hero-carousel"
    >
      <SwiperSlide>
        <div className="flex items-center pt-6 sm:pt-0 flex-col-reverse sm:flex-row">
          <div className="max-w-[394px] py-10 sm:py-15 lg:py-24.5 pl-4 sm:pl-7.5 lg:pl-12.5">
            <div className="flex items-center gap-4 mb-7.5 sm:mb-10">
              <span className="block font-semibold text-heading-3 sm:text-heading-1 text-blue">
                30%
              </span>
              <span className="block text-dark text-sm sm:text-custom-1 sm:leading-[24px]">
                Sale
                <br />
                Off
              </span>
            </div>

            <h1 className="font-semibold text-dark text-xl sm:text-3xl mb-3">
              <button
                type="button"
                onClick={() => openDetails(slideOneProduct)}
                className="text-left hover:text-blue duration-200"
              >
                True Wireless Noise Cancelling Headphone
              </button>
            </h1>

            <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi at ipsum at risus euismod lobortis in
            </p>

            <button
              type="button"
              onClick={() => openDetails(slideOneProduct)}
              className="inline-flex font-medium text-white text-custom-sm rounded-md bg-dark py-3 px-9 ease-out duration-200 hover:bg-blue mt-10"
            >
              Shop Now
            </button>
          </div>

          <div>
            <Image
              src="/images/hero/hero-01.png"
              alt="headphone"
              width={351}
              height={358}
            />
          </div>
        </div>
      </SwiperSlide>
      <SwiperSlide>
        {" "}
        <div className="flex items-center pt-6 sm:pt-0 flex-col-reverse sm:flex-row">
          <div className="max-w-[394px] py-10 sm:py-15 lg:py-26 pl-4 sm:pl-7.5 lg:pl-12.5">
            <div className="flex items-center gap-4 mb-7.5 sm:mb-10">
              <span className="block font-semibold text-heading-3 sm:text-heading-1 text-blue">
                30%
              </span>
              <span className="block text-dark text-sm sm:text-custom-1 sm:leading-[24px]">
                Sale
                <br />
                Off
              </span>
            </div>

            <h1 className="font-semibold text-dark text-xl sm:text-3xl mb-3">
              <button
                type="button"
                onClick={() => openDetails(slideTwoProduct)}
                className="text-left hover:text-blue duration-200"
              >
                True Wireless Noise Cancelling Headphone
              </button>
            </h1>

            <p>
              Lorem ipsum dolor sit, consectetur elit nunc suscipit non ipsum
              nec suscipit.
            </p>

            <button
              type="button"
              onClick={() => openDetails(slideTwoProduct)}
              className="inline-flex font-medium text-white text-custom-sm rounded-md bg-dark py-3 px-9 ease-out duration-200 hover:bg-blue mt-10"
            >
              Shop Now
            </button>
          </div>

          <div>
            <Image
              src="/images/hero/hero-01.png"
              alt="headphone"
              width={351}
              height={358}
            />
          </div>
        </div>
      </SwiperSlide>
    </Swiper>
  );
};

export default HeroCarousal;
