"use client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import "../css/euclid-circular-a-font.css";
import "../css/style.css";
import Header from "../../components/Header";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import Footer from "../../components/Footer";

import { CartModalProvider } from "../context/CartSidebarModalContext";
import { ReduxProvider } from "@/redux/provider";
import CartSidebarModal from "@/components/Common/CartSidebarModal";
import { PreviewSliderProvider } from "../context/PreviewSliderContext";
import PreviewSliderModal from "@/components/Common/PreviewSlider";
import { Toaster } from "@/components/ui/sonner";

import ScrollToTop from "@/components/Common/ScrollToTop";
import PreLoader from "@/components/Common/PreLoader";
import { SessionProvider } from "../context/SessionProvider";
import { PriceModeProvider } from "../context/PriceModeContext";
import SmartShoppingAssistant from "@/components/Common/SmartShoppingAssistant";
import SequenceRouteWatcher from "@/components/Common/SequenceRouteWatcher";
import CartPersistence from "@/components/Common/CartPersistence";
import FloatingAdminButton from "@/components/Common/FloatingAdminButton";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState<boolean>(true);
  const pathname = usePathname();
  const hideFooter = pathname.startsWith("/admin") || pathname.startsWith("/sequence");

  useEffect(() => {
    setTimeout(() => setLoading(false), 1000);
  }, []);

  return (
    <html lang="en" suppressHydrationWarning={true}>
      <head>
        <title>Souma Store</title>
        <meta name="description" content="Souma Store ecommerce website" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body suppressHydrationWarning={true}>
        <ThemeProvider>
          {loading ? (
            <PreLoader />
          ) : (
            <>
              <SessionProvider>
                <PriceModeProvider>
                  <ReduxProvider>
                    <CartPersistence />
                    <CartModalProvider>
                      <PreviewSliderProvider>
                        <Header />
                        {children}

                        <CartSidebarModal />
                        <PreviewSliderModal />
                        <SmartShoppingAssistant />
                        <SequenceRouteWatcher />
                      </PreviewSliderProvider>
                    </CartModalProvider>
                    <Toaster />
                    <ScrollToTop />
                    <FloatingAdminButton />
                    {!hideFooter ? <Footer /> : null}
                  </ReduxProvider>
                </PriceModeProvider>
              </SessionProvider>
            </>
          )}
        </ThemeProvider>
      </body>
    </html>
  );
}
