"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { sequenceEndLeave, sequenceEndLeaveOnPageExit } from "@/lib/sequence-client";
import { trackProductAnalytics } from "@/lib/product-analytics-client";

/**
 * Ends an active shopping sequence when the user navigates away from the product page,
 * but only if they had reached /shop-details and visit-product was recorded (enforced server-side).
 */
export default function SequenceRouteWatcher() {
  const pathname = usePathname();
  const prevPath = useRef<string | null>(null);

  useEffect(() => {
    const prev = prevPath.current;
    prevPath.current = pathname;
    if (prev === "/shop-details" && pathname !== "/shop-details") {
      trackProductAnalytics("pa_navigation", { kind: "route_change", to_path: pathname });
      sequenceEndLeave();
    }
  }, [pathname]);

  useEffect(() => {
    if (pathname !== "/shop-details") return;

    const onPageExit = () => {
      sequenceEndLeaveOnPageExit();
    };

    window.addEventListener("pagehide", onPageExit);
    window.addEventListener("beforeunload", onPageExit);
    return () => {
      window.removeEventListener("pagehide", onPageExit);
      window.removeEventListener("beforeunload", onPageExit);
    };
  }, [pathname]);

  return null;
}
