"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { CartModalProvider } from "@/app/context/CartSidebarModalContext";
import { ReduxProvider } from "@/redux/provider";
import { PreviewSliderProvider } from "@/app/context/PreviewSliderContext";
import { Toaster } from "@/components/ui/sonner";
import PreLoader from "@/components/Common/PreLoader";
import { SessionProvider } from "@/app/context/SessionProvider";
import { PriceModeProvider } from "@/app/context/PriceModeContext";
import CartPersistence from "@/components/Common/CartPersistence";
import { SiteChrome } from "@/components/Layout/SiteChrome";

function shouldSkipPreloader(searchParams: URLSearchParams) {
  return searchParams.get("embed") === "1" || searchParams.get("heatmapPreview") === "1";
}

function RootAppShellInner({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const skipPreloader = shouldSkipPreloader(searchParams);
  const [loading, setLoading] = useState(!skipPreloader);

  useEffect(() => {
    if (skipPreloader) {
      setLoading(false);
      return;
    }

    const timer = window.setTimeout(() => setLoading(false), 1000);
    return () => window.clearTimeout(timer);
  }, [skipPreloader]);

  if (loading) {
    return <PreLoader />;
  }

  return (
    <SessionProvider>
      <PriceModeProvider>
        <ReduxProvider>
          <CartPersistence />
          <CartModalProvider>
            <PreviewSliderProvider>
              <Suspense fallback={children}>
                <SiteChrome>{children}</SiteChrome>
              </Suspense>
            </PreviewSliderProvider>
          </CartModalProvider>
          <Toaster />
        </ReduxProvider>
      </PriceModeProvider>
    </SessionProvider>
  );
}

export function RootAppShell({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <Suspense fallback={<PreLoader />}>
        <RootAppShellInner>{children}</RootAppShellInner>
      </Suspense>
    </ThemeProvider>
  );
}
