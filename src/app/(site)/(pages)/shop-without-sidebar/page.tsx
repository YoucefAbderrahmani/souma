import React from "react";
import ShopWithoutSidebar from "@/components/ShopWithoutSidebar";
import { getCatalogProducts } from "@/server/data-access/product-catalog";
import { connection } from "next/server";

import { Metadata } from "next";
export const metadata: Metadata = {
  title: "Shop Page | Vitrina Store Nextjs E-commerce",
  description: "This is Shop Page for Vitrina Store",
  // other metadata
};

const ShopWithoutSidebarPage = async () => {
  await connection();
  const products = await getCatalogProducts();

  return (
    <main>
      <ShopWithoutSidebar products={products} />
    </main>
  );
};

export default ShopWithoutSidebarPage;
