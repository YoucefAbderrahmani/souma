"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { store, useAppSelector, type AppDispatch } from "@/redux/store";
import {
  setWishlistItems,
  type WishListItem,
} from "@/redux/features/wishlist-slice";
import { useSession } from "@/app/context/SessionProvider";

const GUEST_WISHLIST_KEY = "vitrina_wishlist_guest_v1";

function getUserWishlistKey(userId: string) {
  return `vitrina_wishlist_user_${userId}`;
}

function isValidWishlistItem(value: unknown): value is Partial<WishListItem> {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<WishListItem>;
  const parsedId = typeof item.id === "number" ? item.id : Number(item.id);
  const parsedPrice = typeof item.price === "number" ? item.price : Number(item.price);
  const parsedDiscountedPrice =
    typeof item.discountedPrice === "number"
      ? item.discountedPrice
      : Number(item.discountedPrice);
  return (
    Number.isFinite(parsedId) &&
    typeof item.title === "string" &&
    Number.isFinite(parsedPrice) &&
    Number.isFinite(parsedDiscountedPrice)
  );
}

function parseStoredWishlist(raw: string | null): WishListItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<number>();
    const items: WishListItem[] = [];
    for (const entry of parsed) {
      if (!isValidWishlistItem(entry)) continue;
      const id = Math.trunc(Number(entry.id));
      if (seen.has(id)) continue;
      seen.add(id);
      items.push({
        id,
        title: entry.title!.trim(),
        price: Number(entry.price),
        discountedPrice: Number(entry.discountedPrice),
        quantity: 1,
        status: entry.status,
        imgs: entry.imgs,
      });
    }
    return items;
  } catch {
    return [];
  }
}

/**
 * Persists wishlist to localStorage and hydrates Redux on load (guest + per-user keys).
 */
const WishlistPersistence = () => {
  const dispatch = useDispatch<AppDispatch>();
  const wishlistItems = useAppSelector((state) => state.wishlistReducer.items);
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
    () => (userId ? getUserWishlistKey(userId) : GUEST_WISHLIST_KEY),
    [userId]
  );

  useEffect(() => {
    if (!sessionResolved) return;

    const rawUser = window.localStorage.getItem(targetStorageKey);
    const rawGuest = window.localStorage.getItem(GUEST_WISHLIST_KEY);
    const userWishlist = parseStoredWishlist(rawUser);
    const guestWishlist = parseStoredWishlist(rawGuest);

    if (userId && userWishlist.length === 0 && guestWishlist.length > 0) {
      dispatch(setWishlistItems(guestWishlist));
      window.localStorage.setItem(targetStorageKey, JSON.stringify(guestWishlist));
      activeStorageKeyRef.current = targetStorageKey;
      hydratedRef.current = true;
      return;
    }

    const reduxWishlist = store.getState().wishlistReducer.items;
    if (userWishlist.length === 0 && reduxWishlist.length > 0) {
      window.localStorage.setItem(targetStorageKey, JSON.stringify(reduxWishlist));
      activeStorageKeyRef.current = targetStorageKey;
      hydratedRef.current = true;
      return;
    }

    dispatch(setWishlistItems(userWishlist));
    activeStorageKeyRef.current = targetStorageKey;
    hydratedRef.current = true;
  }, [dispatch, sessionResolved, targetStorageKey, userId]);

  useEffect(() => {
    if (!sessionResolved || !hydratedRef.current) return;
    if (activeStorageKeyRef.current !== targetStorageKey) return;
    window.localStorage.setItem(targetStorageKey, JSON.stringify(wishlistItems));
  }, [wishlistItems, sessionResolved, targetStorageKey]);

  return null;
};

export default WishlistPersistence;
