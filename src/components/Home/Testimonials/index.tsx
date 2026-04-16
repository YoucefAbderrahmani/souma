"use client";
import { Swiper, SwiperSlide } from "swiper/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { useSession } from "@/app/context/SessionProvider";

// Import Swiper styles
import "swiper/css/navigation";
import "swiper/css";
import SingleItem from "./SingleItem";
import { Testimonial } from "@/types/testimonial";

type SiteFeedback = {
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

const Testimonials = () => {
  const sliderRef = useRef(null);
  const { session, isPending } = useSession();
  const [feedbacks, setFeedbacks] = useState<SiteFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handlePrev = useCallback(() => {
    if (!sliderRef.current) return;
    sliderRef.current.swiper.slidePrev();
  }, []);

  const handleNext = useCallback(() => {
    if (!sliderRef.current) return;
    sliderRef.current.swiper.slideNext();
  }, []);

  const testimonials: Testimonial[] = useMemo(
    () =>
      feedbacks.map((item) => ({
        review: item.comment,
        authorName: `${item.user.name} ${item.user.lastname}`.trim(),
        authorImg:
          item.user.image && item.user.image.startsWith("/")
            ? item.user.image
            : "/images/users/user-01.jpg",
        authorRole: `User feedback • ${new Date(item.createdAt).toLocaleDateString()}`,
      })),
    [feedbacks]
  );

  const loadFeedbacks = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/feedbacks", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to fetch feedback.");
      const data = (await response.json()) as { feedbacks?: SiteFeedback[] };
      setFeedbacks(Array.isArray(data.feedbacks) ? data.feedbacks : []);
    } catch {
      toast.error("Unable to load feedback right now.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeedbacks();
  }, [loadFeedbacks]);

  const handleSubmitFeedback = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!session?.user?.id) {
      toast.error("Please sign in to share feedback.");
      return;
    }
    if (comment.trim().length < 6) {
      toast.error("Please write at least 6 characters.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/feedbacks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          comment: comment.trim(),
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Unable to submit feedback.");
      }
      setComment("");
      setRating(5);
      toast.success("Feedback posted.");
      await loadFeedbacks();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to submit feedback.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="overflow-hidden pb-16.5">
      <div className="max-w-[1170px] w-full mx-auto px-4 sm:px-8 xl:px-0">
        <div className="">
          <div className="swiper testimonial-carousel common-carousel p-5">
            {/* <!-- section title --> */}
            <div className="mb-10 flex items-center justify-between">
              <div>
                <span className="flex items-center gap-2.5 font-medium text-dark mb-1.5">
                  <Image
                    src="/images/icons/icon-08.svg"
                    alt="icon"
                    width={17}
                    height={17}
                  />
                  Testimonials
                </span>
                <h2 className="font-semibold text-xl xl:text-heading-5 text-dark">
                  User Feedbacks
                </h2>
              </div>

              <div className="flex items-center gap-3">
                <div onClick={handlePrev} className="swiper-button-prev">
                  <svg
                    className="fill-current"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M15.4881 4.43057C15.8026 4.70014 15.839 5.17361 15.5694 5.48811L9.98781 12L15.5694 18.5119C15.839 18.8264 15.8026 19.2999 15.4881 19.5695C15.1736 19.839 14.7001 19.8026 14.4306 19.4881L8.43056 12.4881C8.18981 12.2072 8.18981 11.7928 8.43056 11.5119L14.4306 4.51192C14.7001 4.19743 15.1736 4.161 15.4881 4.43057Z"
                      fill=""
                    />
                  </svg>
                </div>

                <div onClick={handleNext} className="swiper-button-next">
                  <svg
                    className="fill-current"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M8.51192 4.43057C8.82641 4.161 9.29989 4.19743 9.56946 4.51192L15.5695 11.5119C15.8102 11.7928 15.8102 12.2072 15.5695 12.4881L9.56946 19.4881C9.29989 19.8026 8.82641 19.839 8.51192 19.5695C8.19743 19.2999 8.161 18.8264 8.43057 18.5119L14.0122 12L8.43057 5.48811C8.161 5.17361 8.19743 4.70014 8.51192 4.43057Z"
                      fill=""
                    />
                  </svg>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="rounded-xl bg-white p-6 shadow-1">Loading feedback...</div>
            ) : testimonials.length === 0 ? (
              <div className="rounded-xl bg-white p-6 shadow-1 text-dark-4">
                No feedback posted yet.
              </div>
            ) : (
              <Swiper
                ref={sliderRef}
                slidesPerView={3}
                spaceBetween={20}
                breakpoints={{
                  0: {
                    slidesPerView: 1,
                  },
                  1000: {
                    slidesPerView: 2,
                  },
                  1200: {
                    slidesPerView: 3,
                  },
                }}
              >
                {testimonials.map((item, key) => (
                  <SwiperSlide key={key}>
                    <SingleItem testimonial={item} />
                  </SwiperSlide>
                ))}
              </Swiper>
            )}
          </div>

          <div className="mt-8 rounded-xl bg-white p-5 shadow-1 sm:p-7">
            <h3 className="text-xl font-semibold text-dark">Share Your Feedback</h3>
            {!isPending && !session?.user?.id ? (
              <p className="mt-2 text-dark-4">Sign in to post feedback from your account.</p>
            ) : (
              <p className="mt-2 text-dark-4">Your feedback will appear in the testimonials slider.</p>
            )}

            <form onSubmit={handleSubmitFeedback} className="mt-5">
              <div className="mb-4">
                <p className="mb-2.5">Rating</p>
                <div className="flex items-center gap-2 text-2xl">
                  {Array.from({ length: 5 }).map((_, index) => {
                    const value = index + 1;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setRating(value)}
                        className={value <= rating ? "text-[#FBB040]" : "text-gray-4"}
                        aria-label={`Set feedback rating ${value}`}
                        disabled={!session?.user?.id || submitting}
                      >
                        ★
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mb-4">
                <label htmlFor="feedback-comment" className="mb-2.5 block">
                  Feedback
                </label>
                <textarea
                  id="feedback-comment"
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  rows={4}
                  maxLength={500}
                  placeholder="Tell us about your experience"
                  className="w-full rounded-md border border-gray-3 bg-gray-1 p-4 outline-none duration-200 focus:border-transparent focus:shadow-input focus:ring-2 focus:ring-blue/20"
                  disabled={!session?.user?.id || submitting}
                />
                <p className="mt-2 text-custom-sm text-dark-4">{comment.length}/500</p>
              </div>

              <button
                type="submit"
                disabled={!session?.user?.id || submitting}
                className="inline-flex rounded-md bg-blue px-6 py-3 font-medium text-white duration-200 hover:bg-blue-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Posting..." : "Post Feedback"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
