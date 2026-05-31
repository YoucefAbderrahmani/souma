import { publicApiUrl } from "@/lib/public-api-url";

export const GUEST_CART_STORAGE_KEY = "vitrina_cart_guest_v1";

/** After Chargily success, block re-hydrate from server/local until user adds again. */
export const CART_CLEARED_AFTER_PAYMENT_KEY = "vitrina_cart_cleared_after_payment";

export function getUserCartStorageKey(userId: string): string {
  return `vitrina_cart_user_${userId.trim()}`;
}

export function isCartClearedAfterPayment(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return (
      window.sessionStorage.getItem(CART_CLEARED_AFTER_PAYMENT_KEY) === "1" ||
      window.localStorage.getItem(CART_CLEARED_AFTER_PAYMENT_KEY) === "1"
    );
  } catch {
    return false;
  }
}

export function markCartClearedAfterPayment(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(CART_CLEARED_AFTER_PAYMENT_KEY, "1");
    window.localStorage.setItem(CART_CLEARED_AFTER_PAYMENT_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function releaseCartClearedAfterPayment(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(CART_CLEARED_AFTER_PAYMENT_KEY);
    window.localStorage.removeItem(CART_CLEARED_AFTER_PAYMENT_KEY);
  } catch {
    /* ignore */
  }
}

/** Clears guest/user cart keys so CartPersistence does not re-hydrate a paid cart. */
export function clearPersistedStorefrontCart(userId?: string | null): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(GUEST_CART_STORAGE_KEY);
    const id = userId?.trim();
    if (id) window.localStorage.removeItem(getUserCartStorageKey(id));
  } catch {
    /* ignore */
  }
}

export async function persistEmptyServerCart(): Promise<boolean> {
  try {
    const res = await fetch(publicApiUrl("/api/cart"), {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [] }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
