"use client";

import { usePathname, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartSidebarModal from "@/components/Common/CartSidebarModal";
import PreviewSliderModal from "@/components/Common/PreviewSlider";
import SmartShoppingAssistant from "@/components/Common/SmartShoppingAssistant";
import SequenceRouteWatcher from "@/components/Common/SequenceRouteWatcher";
import ScrollToTop from "@/components/Common/ScrollToTop";
import FloatingAdminButton from "@/components/Common/FloatingAdminButton";

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const isEmbed = searchParams.get("embed") === "1";
  const hideFooter =
    pathname.startsWith("/admin") || pathname.startsWith("/sequence") || pathname.startsWith("/seller-helper");

  if (isEmbed) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      {children}
      <CartSidebarModal />
      <PreviewSliderModal />
      <SmartShoppingAssistant />
      <SequenceRouteWatcher />
      <ScrollToTop />
      <FloatingAdminButton />
      {!hideFooter ? <Footer /> : null}
    </>
  );
}
