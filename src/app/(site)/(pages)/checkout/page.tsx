import { Metadata } from "next";
import CheckoutPageClient from "./CheckoutPageClient";

export const metadata: Metadata = {
  title: "Checkout Page | Vitrina Store Nextjs E-commerce",
  description: "This is Checkout Page for Vitrina Store",
};

export default function CheckoutPage() {
  return <CheckoutPageClient />;
}
