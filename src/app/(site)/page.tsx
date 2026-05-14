import Home from "@/components/Home";
import { Metadata } from "next";
import { getCatalogProducts } from "@/server/data-access/product-catalog";

export const metadata: Metadata = {
  title: "Vitrina Store",
  description: "Home page for Vitrina Store",
  // other metadata
};

export default async function HomePage() {
  const products = await getCatalogProducts();

  return (
    <>
      <Home products={products} />
    </>
  );
}
