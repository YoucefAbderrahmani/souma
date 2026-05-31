"use client";

import {
  clearPersistedStorefrontCart,
  markCartClearedAfterPayment,
  persistEmptyServerCart,
} from "@/lib/storefront-cart-storage";
import type { AppDispatch } from "@/redux/store";
import { setCartItems } from "@/redux/features/cart-slice";

/** Empty Redux cart, local guest/user cart keys, server cart, and lock against re-hydrate. */
export async function clearStorefrontCart(
  dispatch: AppDispatch,
  userId?: string | null
): Promise<void> {
  markCartClearedAfterPayment();
  dispatch(setCartItems([]));
  clearPersistedStorefrontCart(userId);
  await persistEmptyServerCart();
}
