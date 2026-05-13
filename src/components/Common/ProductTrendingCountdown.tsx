"use client";

import React, { useEffect, useState } from "react";

function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}

export function ProductTrendingCountdown({
  endsAt,
  className = "",
}: {
  endsAt: Date;
  className?: string;
}) {
  const [remainingMs, setRemainingMs] = useState(() => Math.max(0, endsAt.getTime() - Date.now()));

  useEffect(() => {
    const tick = () => setRemainingMs(Math.max(0, endsAt.getTime() - Date.now()));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [endsAt]);

  if (remainingMs <= 0) return null;

  return (
    <p className={`text-custom-sm font-medium text-red-dark ${className}`.trim()}>
      This deal ends in <span className="font-semibold tabular-nums">{formatRemaining(remainingMs)}</span>
    </p>
  );
}
