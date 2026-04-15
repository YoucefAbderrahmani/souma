"use client";

import { useEffect, useMemo, useRef } from "react";
import { useDispatch } from "react-redux";
import { useAppSelector, type AppDispatch } from "@/redux/store";
import { setCartItems, type CartItem } from "@/redux/features/cart-slice";
import { useSession } from "@/app/context/SessionProvider";

const GUEST_CART_KEY = "souma_cart_guest_v1";

function getUserCartKey(userId: string) {
  return `souma_cart_user_${userId}`;
}

function isValidCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<CartItem>;
  return (
    typeof item.id === "number" &&
    typeof item.title === "string" &&
    typeof item.price === "number" &&
    typeof item.discountedPrice === "number" &&
    typeof item.quantity === "number"
  );
}

function parseStoredCart(raw: string | null): CartItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidCartItem);
  } catch {
    return [];
  }
}

const CartPersistence = () => {
  const dispatch = useDispatch<AppDispatch>();
  const cartItems = useAppSelector((state) => state.cartReducer.items);
  const { session, isPending } = useSession();
  const activeStorageKeyRef = useRef<string | null>(null);
  const hydratedRef = useRef(false);

  const userId = session?.user?.id?.trim() || null;
  const targetStorageKey = useMemo(
    () => (userId ? getUserCartKey(userId) : GUEST_CART_KEY),
    [userId]
  );

  useEffect(() => {
    if (isPending) return;

    const userCart = parseStoredCart(window.localStorage.getItem(targetStorageKey));

    if (userId && userCart.length === 0) {
      const guestCart = parseStoredCart(window.localStorage.getItem(GUEST_CART_KEY));
      if (guestCart.length > 0) {
        dispatch(setCartItems(guestCart));
        window.localStorage.setItem(targetStorageKey, JSON.stringify(guestCart));
        activeStorageKeyRef.current = targetStorageKey;
        hydratedRef.current = true;
        return;
      }
    }

    dispatch(setCartItems(userCart));
    activeStorageKeyRef.current = targetStorageKey;
    hydratedRef.current = true;
  }, [dispatch, isPending, targetStorageKey, userId]);

  useEffect(() => {
    if (isPending || !hydratedRef.current) return;
    if (activeStorageKeyRef.current !== targetStorageKey) return;
    window.localStorage.setItem(targetStorageKey, JSON.stringify(cartItems));
  }, [cartItems, isPending, targetStorageKey]);

  return null;
};

export default CartPersistence;
