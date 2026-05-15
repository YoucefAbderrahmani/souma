import type { Metadata } from "next";
import ShopDetails from "@/components/ShopDetails";
import { parseRequestedProductId, productDetailsHref } from "@/lib/product-page-link";
import { storefrontAbsoluteOrigin, storefrontAbsoluteAssetUrl, storefrontAbsoluteUrl } from "@/lib/storefront-absolute-url";
import { buildProductJsonLd } from "@/lib/schema-org/product-jsonld";
import { parseProductContent } from "@/lib/product-content";
import { loadCatalogProductForPdp } from "./shop-details-product.loader";

const fallbackMetadata: Metadata = {
  title: "Fiche produit | Vitrina Store",
  description: "Détails, prix et achat sécurisé sur Vitrina Store.",
};

type ShopDetailsPageProps = {
  searchParams: Promise<{ productId?: string; embed?: string; heatmapPreview?: string }>;
};

/** Avoid breaking out of `<script type="application/ld+json">` if titles contain `<`. */
function safeJsonLdStringify(data: Record<string, unknown>) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export async function generateMetadata({ searchParams }: ShopDetailsPageProps): Promise<Metadata> {
  const params = await searchParams;
  if (params.embed === "1" || params.heatmapPreview === "1") return fallbackMetadata;

  const numericId = parseRequestedProductId(params.productId ?? null);
  if (!numericId) return fallbackMetadata;

  const product = await loadCatalogProductForPdp(numericId);
  if (!product) return fallbackMetadata;

  const structured = parseProductContent(product.description);
  const teaser =
    structured.description.trim().slice(0, 155) ||
    structured.careMaintenance?.trim().slice(0, 155) ||
    `${product.title} — ${product.category}`;

  const origin = storefrontAbsoluteOrigin();
  const previews = product.imgs?.previews ?? product.imgs?.thumbnails ?? [];
  const firstImageAbs =
    previews[0] && origin ? storefrontAbsoluteAssetUrl(origin, previews[0]) : previews[0] ?? undefined;

  const pathRel = productDetailsHref(numericId);
  const canonicalUrl = origin ? storefrontAbsoluteUrl(pathRel) : undefined;

  return {
    title: `${product.title} | Vitrina Store`,
    description: teaser,
    alternates: canonicalUrl ? { canonical: canonicalUrl } : undefined,
    openGraph: {
      title: product.title,
      description: teaser,
      type: "website",
      ...(firstImageAbs ? { images: [{ url: firstImageAbs }] } : {}),
    },
  };
}

export default async function ShopDetailsPage({ searchParams }: ShopDetailsPageProps) {
  const params = await searchParams;
  const numericId = parseRequestedProductId(params.productId ?? null);

  let ldJson: string | null = null;
  const showStructuredData = numericId && params.embed !== "1" && params.heatmapPreview !== "1";

  if (showStructuredData && numericId) {
    const product = await loadCatalogProductForPdp(numericId);
    if (product) {
      const pdpPath = productDetailsHref(numericId);
      const graph = buildProductJsonLd(product, pdpPath);
      if (graph && Object.keys(graph).length > 0) {
        ldJson = safeJsonLdStringify(graph);
      }
    }
  }

  return (
    <main>
      {ldJson ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson }} suppressHydrationWarning />
      ) : null}
      <ShopDetails
        initialProductId={params.productId ?? null}
        embed={params.embed === "1"}
        heatmapPreview={params.heatmapPreview === "1"}
      />
    </main>
  );
}
