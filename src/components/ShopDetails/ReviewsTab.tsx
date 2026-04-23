"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { useSession } from "@/app/context/SessionProvider";
import { trackSalesMicroEvent } from "@/lib/sales-analyst-client";

type ProductReview = {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    lastname: string;
    image: string | null;
  };
};

const renderStars = (rating: number) =>
  Array.from({ length: 5 }).map((_, index) => (
    <span key={index} className={index < rating ? "text-[#FBB040]" : "text-gray-4"}>
      ★
    </span>
  ));

type ReviewsTabProps = {
  productId: number;
  productTitle: string;
  /** When true, emits review_filter_applied, review_scroll_depth, etc. */
  salesTracking?: boolean;
};

const ReviewsTab = ({ productId, productTitle, salesTracking }: ReviewsTabProps) => {
  const { session, isPending } = useSession();
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<"all" | 1 | 2 | 3 | 4 | 5>("all");
  const listRef = useRef<HTMLDivElement | null>(null);
  const scrollDepthTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const averageRating = useMemo(() => {
    if (!reviews.length) return 0;
    const total = reviews.reduce((sum, item) => sum + item.rating, 0);
    return total / reviews.length;
  }, [reviews]);

  const loadReviews = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/reviews?productId=${productId}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to fetch reviews.");
      const data = (await response.json()) as { reviews?: ProductReview[] };
      setReviews(Array.isArray(data.reviews) ? data.reviews : []);
    } catch {
      toast.error("Unable to load reviews right now.");
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const filteredReviews = useMemo(() => {
    if (!salesTracking || reviewFilter === "all") return reviews;
    return reviews.filter((r) => r.rating === reviewFilter);
  }, [reviews, reviewFilter, salesTracking]);

  const emitScrollDepth = useCallback(
    (seenCount: number) => {
      if (!salesTracking) return;
      if (scrollDepthTimer.current) clearTimeout(scrollDepthTimer.current);
      scrollDepthTimer.current = setTimeout(() => {
        trackSalesMicroEvent("review_scroll_depth", {
          reviews_seen_count: seenCount,
          filter_rating: reviewFilter === "all" ? null : reviewFilter,
          total_loaded: reviews.length,
        });
      }, 900);
    },
    [reviewFilter, reviews.length, salesTracking]
  );

  useEffect(() => {
    return () => {
      if (scrollDepthTimer.current) clearTimeout(scrollDepthTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!salesTracking || !listRef.current || filteredReviews.length === 0) return;
    const root = listRef.current;
    const seen = new Set<number>();
    const cards = root.querySelectorAll("[data-review-card]");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting || !(en.target instanceof HTMLElement)) return;
          const idx = Number(en.target.dataset.reviewIdx);
          if (Number.isFinite(idx)) seen.add(idx);
        });
        emitScrollDepth(seen.size);
      },
      { root: null, threshold: 0.55 }
    );
    cards.forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, [emitScrollDepth, filteredReviews, salesTracking]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!session?.user?.id) {
      toast.error("Please sign in to post a review.");
      return;
    }
    if (comment.trim().length < 6) {
      toast.error("Please write at least 6 characters.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          productTitle,
          rating,
          comment: comment.trim(),
        }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Failed to submit review.");
      }

      setComment("");
      setRating(5);
      toast.success("Review submitted.");
      await loadReviews();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to submit review.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-col sm:flex-row gap-7.5 xl:gap-12.5 mt-12.5 flex">
      <div className="max-w-[570px] w-full">
        <h2 className="font-medium text-2xl text-dark mb-2">Product Reviews</h2>
        <p className="mb-7 text-dark-4">
          {reviews.length} review{reviews.length === 1 ? "" : "s"} • Average{" "}
          {averageRating ? averageRating.toFixed(1) : "0.0"} / 5
        </p>

        {loading ? (
          <div className="rounded-xl bg-white shadow-1 p-5">Loading reviews...</div>
        ) : reviews.length === 0 ? (
          <div className="rounded-xl bg-white shadow-1 p-5 text-dark-4">
            No reviews yet. Be the first to review this product.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {salesTracking && (
              <div className="flex flex-wrap gap-2">
                {(["all", 1, 2, 3, 4, 5] as const).map((f) => (
                  <button
                    key={f === "all" ? "all" : `star-${f}`}
                    type="button"
                    onClick={() => {
                      setReviewFilter(f);
                      if (f !== "all" && salesTracking) {
                        trackSalesMicroEvent("review_filter_applied", {
                          rating: f,
                          one_star_seeker: f === 1,
                        });
                      }
                    }}
                    className={`rounded-full border px-3 py-1 text-custom-sm font-medium duration-200 ${
                      reviewFilter === f
                        ? "border-blue bg-blue text-white"
                        : "border-gray-3 bg-white text-dark hover:border-blue"
                    }`}
                  >
                    {f === "all" ? "All" : `${f}★`}
                  </button>
                ))}
              </div>
            )}
            <div ref={listRef} className="flex flex-col gap-6">
            {filteredReviews.map((review, idx) => (
              <div
                key={review.id}
                data-review-card
                data-review-idx={idx}
                className="rounded-xl bg-white shadow-1 p-4 sm:p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-1 flex items-center justify-center">
                      {review.user.image && review.user.image.startsWith("/") ? (
                        <Image
                          src={review.user.image}
                          alt={review.user.name}
                          width={48}
                          height={48}
                          className="h-12 w-12 object-cover"
                        />
                      ) : (
                        <span className="text-sm font-semibold text-dark">
                          {review.user.name?.[0] ?? "U"}
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium text-dark">
                        {review.user.name} {review.user.lastname}
                      </h3>
                      <p className="text-custom-xs text-dark-4">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-lg">{renderStars(review.rating)}</div>
                </div>
                <p className="text-dark mt-4">{review.comment}</p>
              </div>
            ))}
            </div>
          </div>
        )}
      </div>

      <div className="max-w-[550px] w-full">
        <form onSubmit={handleSubmit}>
          <h2 className="font-medium text-2xl text-dark mb-3.5">Add a Review</h2>

          {!isPending && !session?.user?.id ? (
            <p className="mb-6 text-dark-4">
              You must be signed in to post a review.{" "}
              <Link href="/signin" className="text-blue hover:text-blue-dark">
                Sign in
              </Link>
            </p>
          ) : (
            <p className="mb-6 text-dark-4">Your review will be posted with your account name.</p>
          )}

          <div className="rounded-xl bg-white shadow-1 p-4 sm:p-6">
            <div className="mb-5">
              <label className="block mb-2.5">Your Rating*</label>
              <div className="flex items-center gap-2 text-2xl">
                {Array.from({ length: 5 }).map((_, index) => {
                  const value = index + 1;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRating(value)}
                      className={value <= rating ? "text-[#FBB040]" : "text-gray-4"}
                      aria-label={`Set rating ${value}`}
                      disabled={!session?.user?.id || submitting}
                    >
                      ★
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-5">
              <label htmlFor="review-comment" className="block mb-2.5">
                Comments
              </label>
              <textarea
                id="review-comment"
                rows={5}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Share your experience with this product"
                className="rounded-md border border-gray-3 bg-gray-1 placeholder:text-dark-5 w-full p-5 outline-none duration-200 focus:border-transparent focus:shadow-input focus:ring-2 focus:ring-blue/20"
                maxLength={500}
                disabled={!session?.user?.id || submitting}
              />
              <span className="mt-2.5 flex items-center justify-between text-custom-sm text-dark-4">
                <span>Minimum 6 characters</span>
                <span>{comment.length}/500</span>
              </span>
            </div>

            <button
              type="submit"
              disabled={!session?.user?.id || submitting}
              className="inline-flex font-medium text-white bg-blue py-3 px-7 rounded-md ease-out duration-200 hover:bg-blue-dark disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? "Submitting..." : "Submit Review"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReviewsTab;
