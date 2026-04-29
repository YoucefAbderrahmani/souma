"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { store, useAppSelector, type AppDispatch } from "@/redux/store";
import { setCartItems, type CartItem } from "@/redux/features/cart-slice";
import { useSession } from "@/app/context/SessionProvider";

const GUEST_CART_KEY = "vitrina_cart_guest_v1";

function getUserCartKey(userId: string) {
  return `vitrina_cart_user_${userId}`;
}

function isValidCartItem(value: unknown): value is Partial<CartItem> {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<CartItem>;
  const parsedId = typeof item.id === "number" ? item.id : Number(item.id);
  const parsedPrice = typeof item.price === "number" ? item.price : Number(item.price);
  const parsedDiscountedPrice =
    typeof item.discountedPrice === "number"
      ? item.discountedPrice
      : Number(item.discountedPrice);
  const parsedQuantity =
    typeof item.quantity === "number" ? item.quantity : Number(item.quantity);
  return (
    Number.isFinite(parsedId) &&
    typeof item.title === "string" &&
    Number.isFinite(parsedPrice) &&
    Number.isFinite(parsedDiscountedPrice) &&
    Number.isFinite(parsedQuantity)
  );
}

function parseStoredCart(raw: string | null): CartItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidCartItem) as CartItem[];
  } catch {
    return [];
  }
}

/**
 * Persists cart to localStorage and hydrates Redux on load.
 * Intentionally does NOT listen to `window.storage` — same-tab `setItem` can fire `storage`
 * in some browsers and caused persist ↔ dispatch feedback loops (cart flicker).
 * Cross-tab sync is omitted in favor of stable single-tab behavior.
 */
const CartPersistence = () => {
  const dispatch = useDispatch<AppDispatch>();
  const cartItems = useAppSelector((state) => state.cartReducer.items);
  const { session, isPending } = useSession();
  const activeStorageKeyRef = useRef<string | null>(null);
  const hydratedRef = useRef(false);
  const [sessionResolved, setSessionResolved] = useState(false);
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(null);

  useEffect(() => {
    if (isPending) return;
    setResolvedUserId(session?.user?.id?.trim() || null);
    setSessionResolved(true);
  }, [isPending, session?.user?.id]);

  const userId = resolvedUserId;
  const targetStorageKey = useMemo(
    () => (userId ? getUserCartKey(userId) : GUEST_CART_KEY),
    [userId]
  );

  useEffect(() => {
    if (!sessionResolved) return;

    const rawUser = window.localStorage.getItem(targetStorageKey);
    const rawGuest = window.localStorage.getItem(GUEST_CART_KEY);
    const userCart = parseStoredCart(rawUser);
    const guestCart = parseStoredCart(rawGuest);

    if (userId && userCart.length === 0) {
      if (guestCart.length > 0) {
        dispatch(setCartItems(guestCart));
        window.localStorage.setItem(targetStorageKey, JSON.stringify(guestCart));
        activeStorageKeyRef.current = targetStorageKey;
        hydratedRef.current = true;
        return;
      }
    }

    const reduxCart = store.getState().cartReducer.items;
    if (userCart.length === 0 && reduxCart.length > 0) {
      window.localStorage.setItem(targetStorageKey, JSON.stringify(reduxCart));
      activeStorageKeyRef.current = targetStorageKey;
      hydratedRef.current = true;
      return;
    }

    dispatch(setCartItems(userCart));
    activeStorageKeyRef.current = targetStorageKey;
    hydratedRef.current = true;
  }, [dispatch, sessionResolved, targetStorageKey, userId]);

  useEffect(() => {
    if (!sessionResolved || !hydratedRef.current) return;
    if (activeStorageKeyRef.current !== targetStorageKey) return;
    window.localStorage.setItem(targetStorageKey, JSON.stringify(cartItems));
  }, [cartItems, sessionResolved, targetStorageKey]);

  return null;
};

export default CartPersistence;
