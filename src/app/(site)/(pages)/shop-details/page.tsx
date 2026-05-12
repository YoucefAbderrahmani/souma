import React from "react";
import ShopDetails from "@/components/ShopDetails";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shop Details Page | Vitrina Store Nextjs E-commerce",
  description: "This is Shop Details Page for Vitrina Store",
};

type ShopDetailsPageProps = {
  searchParams: Promise<{ productId?: string; embed?: string; heatmapPreview?: string }>;
};

export default async function ShopDetailsPage({ searchParams }: ShopDetailsPageProps) {
  const params = await searchParams;

  return (
    <main>
      <ShopDetails
        initialProductId={params.productId ?? null}
        embed={params.embed === "1"}
        heatmapPreview={params.heatmapPreview === "1"}
      />
    </main>
  );
}
