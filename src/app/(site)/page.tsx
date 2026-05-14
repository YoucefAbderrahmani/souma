import Home from "@/components/Home";
import { Metadata } from "next";
import { connection } from "next/server";
import { getCatalogProducts } from "@/server/data-access/product-catalog";

export const metadata: Metadata = {
  title: "Vitrina Store",
  description: "Home page for Vitrina Store",
  // other metadata
};

export default async function HomePage() {
  await connection();
  const products = await getCatalogProducts();

  return (
    <>
      <Home products={products} />
    </>
  );
}
