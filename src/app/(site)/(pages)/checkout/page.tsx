import React from "react";
import Checkout from "@/components/Checkout";

import { Metadata } from "next";
export const metadata: Metadata = {
  title: "Checkout Page | Vitrina Store Nextjs E-commerce",
  description: "This is Checkout Page for Vitrina Store",
  // other metadata
};

const CheckoutPage = () => {
  return (
    <main>
      <Checkout />
    </main>
  );
};

export default CheckoutPage;
