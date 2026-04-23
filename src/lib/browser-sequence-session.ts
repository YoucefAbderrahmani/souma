"use client";

export const SEQUENCE_BROWSER_STORAGE_KEY = "sq_browser_session";
export const SEQUENCE_SESSION_HEADER = "X-Sequence-Session";

export function getOrCreateBrowserSequenceSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = localStorage.getItem(SEQUENCE_BROWSER_STORAGE_KEY);
    if (!id || id.length < 8) {
      id = crypto.randomUUID();
      localStorage.setItem(SEQUENCE_BROWSER_STORAGE_KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}
