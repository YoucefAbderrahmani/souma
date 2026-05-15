/**
 * Absolute site origin for SSR/SEO (canonical URLs, JSON-LD).
 * Set `NEXT_PUBLIC_APP_URL` in production (e.g. https://votre-domaine.dz).
 * On Vercel, `VERCEL_URL` is used as fallback when the public URL is unset.
 */
export function storefrontAbsoluteOrigin(): string {
  const fromEnv = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;

  const vercel = (process.env.VERCEL_URL ?? "").trim().replace(/^https?:\/\//, "");
  if (vercel) return `https://${vercel}`;

  return "";
}

/**
 * Builds an absolute URL for the storefront, respecting `NEXT_PUBLIC_BASE_PATH` when set.
 */
export function storefrontAbsoluteUrl(path: string): string {
  const origin = storefrontAbsoluteOrigin();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");

  if (!origin) {
    return `${basePath}${normalizedPath}`;
  }
  return `${origin}${basePath}${normalizedPath}`;
}

/**
 * Resolves a possibly relative asset URL (`/uploads/...`) to absolute for schema.org / Open Graph.
 */
export function storefrontAbsoluteAssetUrl(origin: string, url: string): string {
  const u = url.trim();
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  const path = u.startsWith("/") ? u : `/${u}`;
  if (!origin) return path;
  const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");
  return `${origin}${basePath}${path}`;
}
