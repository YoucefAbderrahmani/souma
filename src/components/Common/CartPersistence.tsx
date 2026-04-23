"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { useAppSelector, type AppDispatch } from "@/redux/store";
import { setCartItems, type CartItem } from "@/redux/features/cart-slice";
import { useSession } from "@/app/context/SessionProvider";
import { publicApiUrl } from "@/lib/public-api-url";

// #region agent log
/** HTTPS (Vercel) blocks http://127.0.0.1; use same-origin API → server logs + local NDJSON in dev. */
function dbgLog(hypothesisId: string, location: string, message: string, data: Record<string, unknown>) {
  const payload = {
    sessionId: "ee41ca",
    hypothesisId,
    location,
    message,
    data,
    timestamp: Date.now(),
  };
  // Browser console: filter by "cart-debug" in DevTools (works on Vercel + localhost).
  console.info("[cart-debug]", payload);
  fetch(publicApiUrl("/api/debug/cart-log"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {});
}
// #endregion

const GUEST_CART_KEY = "souma_cart_guest_v1";

function getUserCartKey(userId: string) {
  return `souma_cart_user_${userId}`;
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

/** Module scope: survives Strict Mode remounts and matches any `storage` listener instance. */
const LAST_LOCAL_CART_JSON_BY_KEY: Record<string, string> = Object.create(null);

function recordLocalCartWrite(key: string, json: string) {
  LAST_LOCAL_CART_JSON_BY_KEY[key] = json;
}

/** Stable semantic fingerprint (ignores JSON key order / object shape noise). */
function cartFingerprint(items: CartItem[]): string {
  return [...items]
    .slice()
    .sort((a, b) => a.id - b.id)
    .map((i) => [i.id, i.quantity, i.price, i.discountedPrice, i.title].join("\x1e"))
    .join("\x1f");
}

const CartPersistence = () => {
  const dispatch = useDispatch<AppDispatch>();
  const cartItems = useAppSelector((state) => state.cartReducer.items);
  const { session, isPending } = useSession();
  const cartLenRef = useRef(0);
  cartLenRef.current = cartItems.length;
  const cartItemsRef = useRef<CartItem[]>(cartItems);
  cartItemsRef.current = cartItems;
  const activeStorageKeyRef = useRef<string | null>(null);
  const hydratedRef = useRef(false);
  const [sessionResolved, setSessionResolved] = useState(false);
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(null);

  useEffect(() => {
    // #region agent log
    dbgLog("B", "CartPersistence.tsx:sessionEffect", "session gate", {
      isPending,
      userId: session?.user?.id ?? null,
    });
    // #endregion
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

    // #region agent log
    dbgLog("A", "CartPersistence.tsx:hydrate:before", "hydrate inputs", {
      targetStorageKey,
      userId: userId ?? null,
      reduxCartLen: cartLenRef.current,
      userCartLen: userCart.length,
      guestCartLen: guestCart.length,
      rawUserLen: rawUser?.length ?? 0,
      rawGuestLen: rawGuest?.length ?? 0,
      hydratedBefore: hydratedRef.current,
    });
    // #endregion

    if (userId && userCart.length === 0) {
      if (guestCart.length > 0) {
        // #region agent log
        dbgLog("A", "CartPersistence.tsx:hydrate:branch", "merge guest→user", {
          guestCartLen: guestCart.length,
        });
        // #endregion
        dispatch(setCartItems(guestCart));
        const mergedJson = JSON.stringify(guestCart);
        recordLocalCartWrite(targetStorageKey, mergedJson);
        window.localStorage.setItem(targetStorageKey, mergedJson);
        activeStorageKeyRef.current = targetStorageKey;
        hydratedRef.current = true;
        return;
      }
    }

    // #region agent log
    dbgLog("A", "CartPersistence.tsx:hydrate:setFromStorage", "dispatch setCartItems(userCart)", {
      userCartLen: userCart.length,
      reduxCartLenBefore: cartLenRef.current,
    });
    // #endregion
    dispatch(setCartItems(userCart));
    activeStorageKeyRef.current = targetStorageKey;
    hydratedRef.current = true;
  }, [dispatch, sessionResolved, targetStorageKey, userId]);

  useEffect(() => {
    // #region agent log
    dbgLog("D", "CartPersistence.tsx:persist:gate", "persist gate", {
      sessionResolved,
      hydrated: hydratedRef.current,
      activeKey: activeStorageKeyRef.current,
      targetStorageKey,
      cartLen: cartItems.length,
    });
    // #endregion
    if (!sessionResolved || !hydratedRef.current) return;
    if (activeStorageKeyRef.current !== targetStorageKey) return;
    const json = JSON.stringify(cartItems);
    recordLocalCartWrite(targetStorageKey, json);
    window.localStorage.setItem(targetStorageKey, json);
  }, [cartItems, sessionResolved, targetStorageKey]);

  useEffect(() => {
    if (!sessionResolved || !hydratedRef.current) return;

    const handleStorage = (event: StorageEvent) => {
      if (event.storageArea !== window.localStorage) return;
      if (event.key !== targetStorageKey) return;
      const key = event.key;
      if (key && event.newValue != null && event.newValue === LAST_LOCAL_CART_JSON_BY_KEY[key]) {
        // #region agent log
        dbgLog("E", "CartPersistence.tsx:storage:skipEcho", "ignored same-tab echo of own write", {
          key,
        });
        // #endregion
        return;
      }

      const parsed = parseStoredCart(event.newValue);
      if (cartFingerprint(cartItemsRef.current) === cartFingerprint(parsed)) {
        // #region agent log
        dbgLog("E", "CartPersistence.tsx:storage:skipNoop", "ignored storage; cart unchanged vs redux", {
          key,
          parsedLen: parsed.length,
        });
        // #endregion
        recordLocalCartWrite(targetStorageKey, event.newValue ?? JSON.stringify(parsed));
        return;
      }

      // #region agent log
      dbgLog("E", "CartPersistence.tsx:storage", "storage event apply", {
        key,
        newValueLen: event.newValue?.length ?? 0,
        parsedLen: parsed.length,
      });
      // #endregion
      dispatch(setCartItems(parsed));
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [dispatch, sessionResolved, targetStorageKey]);

  return null;
};

export default CartPersistence;
