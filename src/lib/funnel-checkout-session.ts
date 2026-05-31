/** Legacy: checkout page visit dedupe (no longer used for funnel; kept for reset). */
export const FUNNEL_CHECKOUT_PAGE_SENT_KEY = "vitrina_funnel_checkout_page_sent";

/** Chargily tab opened — one funnel “checkout started” per payment attempt. */
export const FUNNEL_CHARGILY_OPENED_KEY = "vitrina_funnel_chargily_opened_sent";

export function hasFunnelChargilyCheckoutBeenSent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(FUNNEL_CHARGILY_OPENED_KEY) === "1";
  } catch {
    return false;
  }
}

export function markFunnelChargilyCheckoutSent(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(FUNNEL_CHARGILY_OPENED_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function clearFunnelChargilyCheckoutSent(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(FUNNEL_CHARGILY_OPENED_KEY);
  } catch {
    /* ignore */
  }
}

export function hasFunnelCheckoutPageBeenSent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(FUNNEL_CHECKOUT_PAGE_SENT_KEY) === "1";
  } catch {
    return false;
  }
}

export function markFunnelCheckoutPageSent(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(FUNNEL_CHECKOUT_PAGE_SENT_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function clearFunnelCheckoutPageSent(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(FUNNEL_CHECKOUT_PAGE_SENT_KEY);
    window.sessionStorage.removeItem(FUNNEL_CHARGILY_OPENED_KEY);
  } catch {
    /* ignore */
  }
}
