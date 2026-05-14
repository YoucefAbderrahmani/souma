import React from "react";
import ShopWithSidebar from "@/components/ShopWithSidebar";
import { getCatalogProducts } from "@/server/data-access/product-catalog";
import { connection } from "next/server";

import { Metadata } from "next";
export const metadata: Metadata = {
  title: "Shop Page | Vitrina Store Nextjs E-commerce",
  description: "This is Shop Page for Vitrina Store",
  // other metadata
};

const ShopWithSidebarPage = async () => {
  await connection();
  const products = await getCatalogProducts();

  return (
    <main>
      <ShopWithSidebar products={products} />
    </main>
  );
};

export default ShopWithSidebarPage;
