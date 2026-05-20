"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

declare global {
  interface Window {
    mootrack?: (...args: unknown[]) => void;
  }
}

/** From Moosend → Websites → Install connection script → mootrack('init', '…') */
const DEFAULT_MOOSEND_TRACKING_ID = "432057e2-9b81-45f8-853c-e9c4fe9432e7";

const TRACKING_ID =
  process.env.NEXT_PUBLIC_MOOSEND_TRACKING_ID?.trim() || DEFAULT_MOOSEND_TRACKING_ID;

/**
 * Moosend website connection script — required for "Verified" status on
 * https://souma.moosend.com → Websites → your domain → Install connection script.
 */
export default function MoosendWebsiteTracking() {
  const pathname = usePathname();

  useEffect(() => {
    if (!TRACKING_ID || typeof window.mootrack !== "function") return;
    window.mootrack("trackPageView");
  }, [pathname]);

  if (!TRACKING_ID) return null;

  return (
    <>
      <Script id="moosend-tracker-loader" strategy="afterInteractive">
        {`
(function(a,c,e,f,b){a.MooTrackerObject=b;a[b]=a[b]||function(){a[b].q?a[b].q.push(arguments):a[b].q=[arguments]};var g=1*new Date,d=c.createElement(e);d.async=!0;d.src=f+"?ts="+g;c=c.getElementsByTagName(e)[0];c.parentNode.insertBefore(d,c)})(window,document,"script","https://cdn.stat-track.com/statics/moosend-tracking.min.js","mootrack");
        `}
      </Script>
      <Script id="moosend-tracker-init" strategy="afterInteractive">
        {`mootrack('init', ${JSON.stringify(TRACKING_ID)}); mootrack('trackPageView');`}
      </Script>
    </>
  );
}
