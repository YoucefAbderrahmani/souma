import type { Product } from "@/types/product";
import { parseProductContent } from "@/lib/product-content";
import { storefrontAbsoluteOrigin, storefrontAbsoluteAssetUrl, storefrontAbsoluteUrl } from "@/lib/storefront-absolute-url";

const MAX_DESCRIPTION_LEN = 5000;
const MAX_SPECS_FOR_SCHEMA = 12;

/** ISO 4217 — storefront uses Algerian dinar elsewhere (cart, checkout). */
const PRICE_CURRENCY = "DZD";

/** Default brand shown in rich results when not derivable from the product payload. */
const DEFAULT_STORE_BRAND =
  typeof process.env.NEXT_PUBLIC_STORE_BRAND === "string" && process.env.NEXT_PUBLIC_STORE_BRAND.trim()
    ? process.env.NEXT_PUBLIC_STORE_BRAND.trim()
    : "Vitrina Store";

function plainDescriptionSnippet(product: Product): string {
  const raw = parseProductContent(product.description);
  const base = `${raw.description} ${raw.careMaintenance ?? ""}`.replace(/\s+/g, " ").trim();
  if (!base.length) return product.title;
  return base.length > MAX_DESCRIPTION_LEN ? `${base.slice(0, MAX_DESCRIPTION_LEN - 1)}…` : base;
}

function collectUniquePreviewImages(product: Product, origin: string): string[] {
  const previews = product.imgs?.previews ?? product.imgs?.thumbnails ?? [];
  const urls: string[] = [];
  const seen = new Set<string>();
  for (const p of previews) {
    const absolute = storefrontAbsoluteAssetUrl(origin, p);
    if (absolute && !seen.has(absolute)) {
      seen.add(absolute);
      urls.push(absolute);
      if (urls.length >= 8) break;
    }
  }
  return urls;
}

function deriveBrandFromStructured(product: Product): string | null {
  const parsed = parseProductContent(product.description);
  const candidates = parsed.additionalInfo
    .filter((kv) => /^(brand|marque)$/i.test(kv.key.trim()))
    .map((kv) => kv.value.trim())
    .filter(Boolean);
  return candidates[0] ?? null;
}

function buildAdditionalProperties(product: Product): Array<{ "@type": "PropertyValue"; name: string; value: string }> {
  const parsed = parseProductContent(product.description);
  const props: Array<{ "@type": "PropertyValue"; name: string; value: string }> = [];

  for (const kv of parsed.additionalInfo.slice(0, MAX_SPECS_FOR_SCHEMA)) {
    const name = kv.key.trim();
    const value = kv.value.trim();
    if (name && value && !/^(brand|marque)$/i.test(name)) {
      props.push({ "@type": "PropertyValue", name, value });
    }
  }

  for (const spec of parsed.specifications) {
    if (props.length >= MAX_SPECS_FOR_SCHEMA) break;
    const specName = spec.name.trim();
    if (!specName) continue;
    const optionLabels = spec.options.map((o) => o.label.trim()).filter(Boolean);
    if (optionLabels.length) {
      props.push({ "@type": "PropertyValue", name: specName, value: optionLabels.join(", ") });
    }
  }

  return props;
}

function availabilityUrl(instock: number | undefined): string {
  if (instock === undefined) return "https://schema.org/InStock";
  return instock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock";
}

/**
 * JSON-LD object for https://schema.org/Product (Google product rich results).
 * When `NEXT_PUBLIC_APP_URL` (or Vercel URL) is missing, offer/image URLs may be relative; Google prefers absolute URLs.
 */
export function buildProductJsonLd(product: Product, productPagePath: string): Record<string, unknown> {
  const origin = storefrontAbsoluteOrigin();
  const productUrl = origin ? storefrontAbsoluteUrl(productPagePath) : productPagePath;

  const images = collectUniquePreviewImages(product, origin);
  const brandName = deriveBrandFromStructured(product) ?? DEFAULT_STORE_BRAND;

  const json: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: plainDescriptionSnippet(product),
    sku: String(product.id),
    category: product.category,
    brand: {
      "@type": "Brand",
      name: brandName,
    },
    offers: {
      "@type": "Offer",
      url: productUrl,
      priceCurrency: PRICE_CURRENCY,
      price: product.detailPrice.toFixed(2),
      availability: availabilityUrl(product.instock),
      itemCondition: "https://schema.org/NewCondition",
      priceValidUntil: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      seller: {
        "@type": "Organization",
        name: DEFAULT_STORE_BRAND,
      },
    },
  };

  if (images.length > 0) {
    json.image = images.length === 1 ? images[0] : images;
  }

  const additional = buildAdditionalProperties(product);
  if (additional.length) {
    json.additionalProperty = additional;
  }

  if (product.reviews > 0 && product.averageRating > 0) {
    json.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: Math.min(5, Math.max(0, product.averageRating)).toFixed(1),
      reviewCount: String(product.reviews),
    };
  }

  return json;
}