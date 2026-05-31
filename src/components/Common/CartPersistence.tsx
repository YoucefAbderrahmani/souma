"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { store, useAppSelector, type AppDispatch } from "@/redux/store";
import { setCartItems, type CartItem } from "@/redux/features/cart-slice";
import { useSession } from "@/app/context/SessionProvider";
import { publicApiUrl } from "@/lib/public-api-url";

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

async function fetchServerCart(): Promise<CartItem[] | null> {
  try {
    const res = await fetch(publicApiUrl("/api/cart"), {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { items?: unknown };
    if (!Array.isArray(data.items)) return [];
    return parseStoredCart(JSON.stringify(data.items));
  } catch {
    return null;
  }
}

async function persistServerCart(items: CartItem[]): Promise<void> {
  try {
    await fetch(publicApiUrl("/api/cart"), {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
  } catch {
    /* offline or guest */
  }
}

/**
 * One cart per guest (localStorage) and per logged-in user (DB + localStorage).
 * Clears Redux when the account changes so carts never leak between users.
 */
const CartPersistence = () => {
  const dispatch = useDispatch<AppDispatch>();
  const cartItems = useAppSelector((state) => state.cartReducer.items);
  const { session, isPending } = useSession();
  const activeStorageKeyRef = useRef<string | null>(null);
  const hydratedRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);
  const persistTimerRef = useRef<number | null>(null);
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

    const accountChanged = lastUserIdRef.current !== userId;
    lastUserIdRef.current = userId;

    if (accountChanged) {
      hydratedRef.current = false;
      activeStorageKeyRef.current = null;
      dispatch(setCartItems([]));
    }

    let cancelled = false;

    (async () => {
      const rawUser = window.localStorage.getItem(targetStorageKey);
      const rawGuest = window.localStorage.getItem(GUEST_CART_KEY);
      let userCart = parseStoredCart(rawUser);
      const guestCart = parseStoredCart(rawGuest);

      if (userId) {
        const serverCart = await fetchServerCart();
        if (cancelled) return;
        if (serverCart !== null) {
          userCart = serverCart;
          window.localStorage.setItem(targetStorageKey, JSON.stringify(serverCart));
        }
      }

      if (userId && userCart.length === 0 && guestCart.length > 0) {
        dispatch(setCartItems(guestCart));
        window.localStorage.setItem(targetStorageKey, JSON.stringify(guestCart));
        void persistServerCart(guestCart);
        activeStorageKeyRef.current = targetStorageKey;
        hydratedRef.current = true;
        return;
      }

      dispatch(setCartItems(userCart));
      activeStorageKeyRef.current = targetStorageKey;
      hydratedRef.current = true;
    })();

    return () => {
      cancelled = true;
    };
  }, [dispatch, sessionResolved, targetStorageKey, userId]);

  useEffect(() => {
    if (!sessionResolved || !hydratedRef.current) return;
    if (activeStorageKeyRef.current !== targetStorageKey) return;

    window.localStorage.setItem(targetStorageKey, JSON.stringify(cartItems));

    if (!userId) return;

    if (persistTimerRef.current) {
      window.clearTimeout(persistTimerRef.current);
    }
    persistTimerRef.current = window.setTimeout(() => {
      void persistServerCart(cartItems);
    }, 600);
  }, [cartItems, sessionResolved, targetStorageKey, userId]);

  useEffect(
    () => () => {
      if (persistTimerRef.current) window.clearTimeout(persistTimerRef.current);
    },
    []
  );

  return null;
};

export default CartPersistence;
