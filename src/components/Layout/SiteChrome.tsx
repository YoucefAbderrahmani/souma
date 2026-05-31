"use client";

import { usePathname, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartSidebarModal from "@/components/Common/CartSidebarModal";
import PreviewSliderModal from "@/components/Common/PreviewSlider";
import ShoppingAssistant from "@/components/Common/ShoppingAssistant";
import SequenceRouteWatcher from "@/components/Common/SequenceRouteWatcher";
import StorefrontAnalyticsLanding from "@/components/Common/StorefrontAnalyticsLanding";
import FunnelPageTracker from "@/components/Common/FunnelPageTracker";
import FloatingAdminButton from "@/components/Common/FloatingAdminButton";

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const isEmbed =
    searchParams.get("embed") === "1" || searchParams.get("heatmapPreview") === "1";
  const hideFooter =
    pathname.startsWith("/admin") || pathname.startsWith("/sequence") || pathname.startsWith("/seller-helper");

  if (isEmbed) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      <div className="min-w-0">{children}</div>
      <CartSidebarModal />
      <PreviewSliderModal />
      <ShoppingAssistant />
      <SequenceRouteWatcher />
      <StorefrontAnalyticsLanding />
      <FunnelPageTracker />
      <FloatingAdminButton />
      {!hideFooter ? <Footer /> : null}
    </>
  );
}
