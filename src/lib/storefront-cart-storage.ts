import { publicApiUrl } from "@/lib/public-api-url";

export const GUEST_CART_STORAGE_KEY = "vitrina_cart_guest_v1";

export function getUserCartStorageKey(userId: string): string {
  return `vitrina_cart_user_${userId.trim()}`;
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

export async function persistEmptyServerCart(): Promise<void> {
  try {
    await fetch(publicApiUrl("/api/cart"), {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [] }),
    });
  } catch {
    /* guest or offline */
  }
}
