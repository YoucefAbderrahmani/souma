"use client";

import React, { useEffect, useState } from "react";
import { VitrinaPromoCountdown } from "@/components/Common/VitrinaPromoCountdown";

export function ProductTrendingCountdown({
  endsAt,
  className = "",
  variant = "banner",
}: {
  endsAt: Date;
  className?: string;
  /** `banner` on PDP; `card` on catalog thumbnails */
  variant?: "banner" | "card";
}) {
  const [remainingMs, setRemainingMs] = useState(() => Math.max(0, endsAt.getTime() - Date.now()));

  useEffect(() => {
    const tick = () => setRemainingMs(Math.max(0, endsAt.getTime() - Date.now()));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [endsAt]);

  return (
    <VitrinaPromoCountdown
      remainingMs={remainingMs}
      prefix="Limited offer ends in"
      variant={variant}
      className={className}
    />
  );
}
