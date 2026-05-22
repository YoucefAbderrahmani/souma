"use client";
import React, { useMemo } from "react";
import Breadcrumb from "../Common/Breadcrumb";
import { useDispatch } from "react-redux";
import { useAppSelector, type AppDispatch } from "@/redux/store";
import { removeAllItemsFromWishlist } from "@/redux/features/wishlist-slice";
import { useLiveProductInventoryMap } from "@/hooks/useLiveProductInventoryMap";
import SingleItem from "./SingleItem";

export const Wishlist = () => {
  const dispatch = useDispatch<AppDispatch>();
  const wishlistItems = useAppSelector((state) => state.wishlistReducer.items);
  const productIds = useMemo(() => wishlistItems.map((item) => item.id), [wishlistItems]);
  const { inventory } = useLiveProductInventoryMap(productIds, {
    enabled: productIds.length > 0,
  });

  return (
    <>
      <Breadcrumb title={"Wishlist"} pages={["Wishlist"]} />
      <section className="overflow-hidden py-20 bg-gray-2">
        <div className="max-w-[1170px] w-full mx-auto px-4 sm:px-8 xl:px-0">
          <div className="flex flex-wrap items-center justify-between gap-5 mb-7.5">
            <h2 className="font-medium text-dark text-2xl">Your Wishlist</h2>
            {wishlistItems.length > 0 ?
              <button
                type="button"
                className="text-blue"
                onClick={() => dispatch(removeAllItemsFromWishlist())}
              >
                Clear Wishlist
              </button>
            : null}
          </div>

          {wishlistItems.length === 0 ?
            <p className="text-dark-4">Your wishlist is empty.</p>
          : (
            <div className="bg-white rounded-[10px] shadow-1">
              <div className="w-full overflow-x-auto">
                <div className="min-w-[1170px]">
                  <div className="flex items-center py-5.5 px-10">
                    <div className="min-w-[83px]"></div>
                    <div className="min-w-[387px]">
                      <p className="text-dark">Product</p>
                    </div>

                    <div className="min-w-[205px]">
                      <p className="text-dark">Unit Price</p>
                    </div>

                    <div className="min-w-[265px]">
                      <p className="text-dark">Stock Status</p>
                    </div>

                    <div className="min-w-[150px]">
                      <p className="text-dark text-right">Action</p>
                    </div>
                  </div>

                  {wishlistItems.map((item) => (
                    <SingleItem
                      item={item}
                      key={item.id}
                      liveInstock={inventory[item.id]}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
};
