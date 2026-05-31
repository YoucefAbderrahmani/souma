"use client";

import dynamic from "next/dynamic";

const Checkout = dynamic(() => import("@/components/Checkout"), {
  ssr: false,
  loading: () => (
    <div className="py-20 text-center text-dark-4" suppressHydrationWarning>
      Loading checkout…
    </div>
  ),
});

export default function CheckoutPageClient() {
  return (
    <main suppressHydrationWarning>
      <Checkout />
    </main>
  );
}
