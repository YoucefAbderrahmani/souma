/**
 * Absolute URL for client-side fetches to this app's Route Handlers.
 * - Set NEXT_PUBLIC_APP_URL (e.g. https://your-app.vercel.app) so API calls hit the right host.
 * - Set NEXT_PUBLIC_BASE_PATH (e.g. /repo-name) for GitHub Pages subpath deploys without a custom domain.
 */
export function publicApiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  const base = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");

  // Browser: always call the host the user loaded (avoids stale NEXT_PUBLIC_APP_URL → wrong DB).
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}${base}${p}`;
  }

  const origin = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  if (origin) {
    return `${origin}${base}${p}`;
  }
  if (base) {
    return `${base}${p}`;
  }
  return p;
}
