import React from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

const promoPanelShell =
  "relative z-1 overflow-hidden rounded-xl border border-gray-3/80 shadow-1 transition-shadow duration-200 hover:shadow-md";

const promoCta =
  "inline-flex items-center justify-center font-medium text-custom-sm text-white py-3 px-8 rounded-lg ease-out duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

const PromoBanner = () => {
  return (
    <section className="overflow-hidden py-12 sm:py-16 lg:py-20" aria-label="Promotions">
      <div className="max-w-[1170px] w-full mx-auto px-4 sm:px-8 xl:px-0">
        {/* Hero promo — lisibilité mobile + image sans recouvrir le texte */}
        <div
          className={cn(
            promoPanelShell,
            "mb-7.5 bg-[#F5F5F7] px-5 py-8 sm:px-8 sm:py-10 lg:px-14 lg:py-12 xl:px-16 xl:py-14",
            "flex min-h-[380px] flex-col lg:min-h-[400px] lg:flex-row lg:items-center"
          )}
        >
          <div className="relative z-10 flex w-full flex-1 flex-col justify-center lg:max-w-[52%] lg:pr-6">
            <span className="mb-2 inline-flex w-fit rounded-full bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-dark-4 ring-1 ring-gray-3/60">
              Apple iPhone 14 Plus
            </span>

            <h2 className="mb-4 font-extrabold tracking-tight text-dark">
              <span className="block text-3xl leading-tight sm:text-4xl lg:text-heading-4 xl:text-heading-3">
                UP TO{" "}
                <span className="text-orange-dark">30%</span> OFF
              </span>
            </h2>

            <p className="max-w-[480px] text-base leading-relaxed text-dark-3 sm:text-lg">
              iPhone 14 has the same superspeedy chip that’s in iPhone 13 Pro, A15 Bionic, with a
              5‑core GPU, powers all the latest features.
            </p>

            <Link
              href="/shop-with-sidebar"
              className={cn(
                promoCta,
                "mt-6 w-fit bg-blue hover:bg-blue-dark focus-visible:ring-blue sm:mt-8"
              )}
            >
              Buy Now
            </Link>
          </div>

          <div className="relative mx-auto mt-6 flex w-full max-w-[280px] shrink-0 items-end justify-center lg:mt-0 lg:max-w-[42%] lg:justify-end">
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 top-1/3 bg-gradient-to-t from-[#F5F5F7] via-[#F5F5F7]/80 to-transparent lg:hidden"
              aria-hidden
            />
            <Image
              src="/images/promo/promo-01.png"
              alt="iPhone 14 Plus promotion"
              className="relative z-[1] h-auto w-full max-h-[280px] object-contain object-bottom sm:max-h-[320px] lg:absolute lg:bottom-0 lg:right-6 lg:max-h-[360px] lg:w-auto lg:max-w-[min(100%,340px)] xl:right-10"
              width={340}
              height={400}
              sizes="(max-width: 1024px) 280px, 340px"
              priority
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-7.5">
          {/* Treadmill */}
          <div
            className={cn(
              promoPanelShell,
              "flex min-h-[300px] flex-col justify-between bg-[#DBF4F3] px-5 py-8 sm:min-h-[320px] sm:px-8 sm:py-10 xl:px-10"
            )}
          >
            <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className="relative mx-auto h-[180px] w-[180px] shrink-0 sm:mx-0 sm:h-[200px] sm:w-[200px]">
                <Image
                  src="/images/promo/promo-02.png"
                  alt="Foldable Motorised Treadmill"
                  fill
                  sizes="200px"
                  className="object-contain object-center"
                />
              </div>

              <div className="flex flex-1 flex-col text-center sm:text-right">
                <span className="mb-1 block text-base font-medium text-dark-3 sm:text-lg">
                  Foldable Motorised Treadmill
                </span>

                <h3 className="mb-2 font-bold text-2xl leading-tight text-dark sm:text-heading-5 lg:text-heading-4">
                  Workout At Home
                </h3>

                <p className="text-lg font-bold text-teal-dark sm:text-xl">Flat 20% off</p>

                <Link
                  href="/shop-with-sidebar"
                  className={cn(
                    promoCta,
                    "mx-auto mt-5 w-fit bg-teal hover:bg-teal-dark focus-visible:ring-teal sm:ml-auto sm:mr-0"
                  )}
                >
                  Grab Now
                </Link>
              </div>
            </div>
          </div>

          {/* Apple Watch */}
          <div
            className={cn(
              promoPanelShell,
              "flex min-h-[300px] flex-col justify-between bg-[#FFECE1] px-5 py-8 sm:min-h-[320px] sm:px-8 sm:py-10 xl:px-10"
            )}
          >
            <div className="relative z-10 flex flex-col gap-6 sm:flex-row-reverse sm:items-center">
              <div className="relative mx-auto h-[160px] w-[160px] shrink-0 sm:mx-0 sm:h-[200px] sm:w-[200px]">
                <Image
                  src="/images/promo/promo-03.png"
                  alt="Apple Watch Ultra"
                  fill
                  sizes="200px"
                  className="object-contain object-center"
                />
              </div>

              <div className="flex flex-1 flex-col">
                <span className="mb-1 block text-base font-medium text-dark-3 sm:text-lg">
                  Apple Watch Ultra
                </span>

                <h3 className="mb-2 font-bold text-2xl leading-tight text-dark sm:text-heading-5 lg:text-heading-4">
                  Up to <span className="text-orange">40%</span> off
                </h3>

                <p className="max-w-[320px] text-base leading-relaxed text-dark-3">
                  The aerospace-grade titanium case strikes the perfect balance of everything.
                </p>

                <Link
                  href="/shop-with-sidebar"
                  className={cn(
                    promoCta,
                    "mt-5 w-fit bg-orange hover:bg-orange-dark focus-visible:ring-orange"
                  )}
                >
                  Buy Now
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PromoBanner;
