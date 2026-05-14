"use client";

import { cn } from "@/lib/utils";

/** Same star path as legacy PDP SVG (18×18 viewBox). */
const STAR_PATH =
  "M16.7906 6.72187L11.7 5.93438L9.39377 1.09688C9.22502 0.759375 8.77502 0.759375 8.60627 1.09688L6.30002 5.9625L1.23752 6.72187C0.871891 6.77812 0.731266 7.25625 1.01252 7.50938L4.69689 11.3063L3.82502 16.6219C3.76877 16.9875 4.13439 17.2969 4.47189 17.0719L9.05627 14.5687L13.6125 17.0719C13.9219 17.2406 14.3156 16.9594 14.2313 16.6219L13.3594 11.3063L17.0438 7.50938C17.2688 7.25625 17.1563 6.77812 16.7906 6.72187Z";

type Props = {
  /** Average 0–5 from real `product_review` rows. */
  rating: number;
  size?: number;
  className?: string;
};

/**
 * Five stars with partial fills from an average rating (e.g. 3.7 → three full + ~70% of the fourth).
 */
export function ProductRatingStars({ rating, size = 14, className }: Props) {
  const r = Math.min(5, Math.max(0, Number(rating) || 0));

  return (
    <div
      className={cn("flex items-center gap-0.5", className)}
      aria-label={`Average rating ${r.toFixed(1)} out of 5`}
    >
      {[0, 1, 2, 3, 4].map((index) => {
        const fill = Math.min(1, Math.max(0, r - index));
        return (
          <span key={index} className="relative inline-block shrink-0 align-middle" style={{ width: size, height: size }}>
            <svg
              className="block text-gray-4"
              width={size}
              height={size}
              viewBox="0 0 18 18"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden
            >
              <path d={STAR_PATH} fill="currentColor" />
            </svg>
            {fill > 0 ? (
              <span
                className="absolute left-0 top-0 h-full overflow-hidden text-[#FFA645]"
                style={{ width: `${fill * 100}%` }}
              >
                <svg
                  className="block shrink-0"
                  width={size}
                  height={size}
                  viewBox="0 0 18 18"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden
                >
                  <path d={STAR_PATH} fill="currentColor" />
                </svg>
              </span>
            ) : null}
          </span>
        );
      })}
    </div>
  );
}
