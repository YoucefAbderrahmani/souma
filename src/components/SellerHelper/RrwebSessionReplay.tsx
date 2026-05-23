"use client";

import React, { useEffect, useRef, useState } from "react";
import type { eventWithTime } from "@rrweb/types";
import { sellerPlaceholder } from "./layout";

type Props = {
  productId: number;
};

export function RrwebSessionReplay({ productId }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<{ $destroy: () => void } | null>(null);
  const [events, setEvents] = useState<eventWithTime[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setEvents(null);

    void (async () => {
      try {
        const params = new URLSearchParams({ productId: String(productId) });
        const response = await fetch(`/api/admin/conception/heatmap/rrweb?${params}`, {
          credentials: "include",
          cache: "no-store",
        });
        const body = await response.json();
        if (!response.ok) {
          throw new Error(body.message || body.error || "Unable to load rrweb recording.");
        }
        if (cancelled) return;
        setEvents((body.events ?? []) as eventWithTime[]);
        setUpdatedAt(typeof body.updatedAt === "string" ? body.updatedAt : null);
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : String(fetchError));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [productId]);

  useEffect(() => {
    const target = containerRef.current;
    if (!target || !events || events.length === 0) return;

    let cancelled = false;

    void (async () => {
      playerRef.current?.$destroy();
      playerRef.current = null;
      target.innerHTML = "";

      const [{ default: RrwebPlayer }] = await Promise.all([
        import("rrweb-player"),
        import("rrweb-player/dist/style.css"),
      ]);

      if (cancelled) return;

      const width = Math.min(960, target.clientWidth || 960);
      const player = new RrwebPlayer({
        target,
        props: {
          events,
          width,
          height: Math.round(width * 0.62),
          autoPlay: false,
          showController: true,
          speedOption: [1, 2, 4],
        },
      });
      playerRef.current = player as unknown as { $destroy: () => void };
    })();

    return () => {
      cancelled = true;
      playerRef.current?.$destroy();
      playerRef.current = null;
    };
  }, [events]);

  if (loading) {
    return <div className={sellerPlaceholder}>Loading rrweb session…</div>;
  }

  if (error) {
    return (
      <p className="rounded-lg border border-red-light-3 bg-red-light-6 px-4 py-3 text-custom-sm text-red-dark">
        {error}
      </p>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className={`${sellerPlaceholder} p-8 text-center`}>
        No rrweb recording for this product yet. Open the live product page in a normal browser tab and
        interact with the page; events are saved automatically.
      </div>
    );
  }

  return (
    <div className="space-y-2 p-4">
      <p className="text-xs text-dark-4">
        rrweb replay · {events.length} events
        {updatedAt ? ` · updated ${new Date(updatedAt).toLocaleString()}` : ""}
      </p>
      <div
        ref={containerRef}
        className="overflow-hidden rounded-lg border border-gray-3 bg-gray-1"
        aria-label="rrweb session replay"
      />
    </div>
  );
}
