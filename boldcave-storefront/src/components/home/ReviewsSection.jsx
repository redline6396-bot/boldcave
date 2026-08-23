"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { fetchHomepageSettings } from "@/lib/clientApi";

const hasCompleteFeaturedReviews = (items) =>
  Array.isArray(items) &&
  items.length === 3 &&
  items.every((review) => review?.image && review?.name && review?.text);

const buildFeaturedReviews = (items) =>
  items.map((review, index) => ({
    id: `review-${index + 1}`,
    image: review.image,
    text: review.text,
    name: review.name,
  }));

export default function ReviewsSection() {
  const scrollerRef = useRef(null);
  const scrollFrameRef = useRef(null);
  const [reviews, setReviews] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loadedImages, setLoadedImages] = useState({});

  useEffect(() => {
    let mounted = true;

    async function loadFeaturedReviews() {
      try {
        const settings = await fetchHomepageSettings();
        if (!mounted || !hasCompleteFeaturedReviews(settings?.featuredReviews)) {
          return;
        }

        setReviews(buildFeaturedReviews(settings.featuredReviews));
        setActiveIndex(0);
      } catch {
        // Keep reviews empty if homepage settings are unavailable.
      }
    }

    loadFeaturedReviews();

    return () => {
      mounted = false;
    };
  }, []);

  const syncActiveReview = () => {
    const scroller = scrollerRef.current;

    if (!scroller) {
      return;
    }

    const firstCard = scroller.querySelector("[data-review-card]");
    const cardWidth = firstCard?.getBoundingClientRect().width || 1;
    const styles = window.getComputedStyle(scroller);
    const gap = parseFloat(styles.columnGap || styles.gap || "0") || 0;
    const nextIndex = Math.round(scroller.scrollLeft / (cardWidth + gap));

    setActiveIndex(Math.max(0, Math.min(nextIndex, reviews.length - 1)));
  };

  const handleScroll = () => {
    if (scrollFrameRef.current) {
      window.cancelAnimationFrame(scrollFrameRef.current);
    }

    scrollFrameRef.current = window.requestAnimationFrame(syncActiveReview);
  };

  const scrollToReview = (index) => {
    const scroller = scrollerRef.current;

    if (!scroller) {
      return;
    }

    const safeIndex = Math.max(0, Math.min(index, reviews.length - 1));
    const cards = scroller.querySelectorAll("[data-review-card]");
    const target = cards[safeIndex];

    target?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "start",
    });

    setActiveIndex(safeIndex);
  };

  const markImageLoaded = (id) => {
    setLoadedImages((currentLoadedImages) => {
      if (currentLoadedImages[id]) {
        return currentLoadedImages;
      }

      return {
        ...currentLoadedImages,
        [id]: true,
      };
    });
  };

  if (reviews.length === 0) {
    return null;
  }

  return (
    <section className="bg-white text-neutral-950">
      <div className="mx-auto max-w-[1380px] px-0 pt-5 sm:px-6 sm:pb-7 sm:pt-7 lg:px-8 lg:pb-7 lg:pt-7 xl:pb-7 xl:pt-5">
        <h2 className="px-6 text-center font-serif text-[38px] font-normal leading-none tracking-[-0.02em] text-neutral-950 sm:px-0 sm:text-[44px] lg:text-[48px] xl:text-[54px]">
          Reviews
        </h2>

        {/* Mobile */}
        <div className="mt-6 overflow-x-hidden pl-5 sm:hidden">
          <div
            ref={scrollerRef}
            className="reviews-scrollbar-hidden flex w-full snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            onScroll={handleScroll}
          >
            {reviews.map((review) => (
              <ReviewItem
                key={review.id}
                review={review}
                loaded={Boolean(loadedImages[review.id])}
                onImageLoad={() => markImageLoaded(review.id)}
                className="w-[84vw] max-w-[350px] shrink-0 snap-start"
                mobile
              />
            ))}
          </div>
        </div>

        <style jsx>{`
          .reviews-scrollbar-hidden::-webkit-scrollbar {
            display: none;
            height: 0;
            width: 0;
          }
        `}</style>

        <div className="mt-5 flex items-center justify-center gap-7 text-neutral-500 sm:hidden">
          <button
            type="button"
            onClick={() => scrollToReview(activeIndex - 1)}
            disabled={activeIndex === 0}
            className="flex h-8 w-8 cursor-pointer items-center justify-center transition-colors hover:text-neutral-950 disabled:cursor-default disabled:text-neutral-300"
            aria-label="Previous review"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={1.4} />
          </button>

          <span className="min-w-[38px] text-center text-[11px] text-neutral-500">
            {activeIndex + 1}/{reviews.length}
          </span>

          <button
            type="button"
            onClick={() => scrollToReview(activeIndex + 1)}
            disabled={activeIndex === reviews.length - 1}
            className="flex h-8 w-8 cursor-pointer items-center justify-center transition-colors hover:text-neutral-950 disabled:cursor-default disabled:text-neutral-300"
            aria-label="Next review"
          >
            <ChevronRight className="h-4 w-4" strokeWidth={1.4} />
          </button>
        </div>

        {/* Tablet */}
        <div className="mt-8 hidden gap-10 sm:grid lg:hidden">
          {reviews.map((review) => (
            <ReviewItem
              key={review.id}
              review={review}
              loaded={Boolean(loadedImages[review.id])}
              onImageLoad={() => markImageLoaded(review.id)}
              className="mx-auto w-full max-w-[560px]"
              tablet
            />
          ))}
        </div>

        {/* Desktop */}
        <div className="mt-7 hidden grid-cols-3 gap-6 lg:grid xl:gap-7 2xl:gap-8">
          {reviews.map((review) => (
            <ReviewItem
              key={review.id}
              review={review}
              loaded={Boolean(loadedImages[review.id])}
              onImageLoad={() => markImageLoaded(review.id)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function ReviewItem({
  review,
  loaded,
  onImageLoad,
  className = "",
  mobile = false,
  tablet = false,
}) {
  return (
    <article className={className} data-review-card>
      <div
        className={[
          "w-full overflow-hidden bg-neutral-100",
          mobile
            ? "aspect-[4/5]"
            : tablet
              ? "mx-auto"
              : "h-[460px] xl:h-[500px] 2xl:h-[535px]",
        ].join(" ")}
      >
        <img
          src={review.image}
          alt=""
          className={[
            "h-full w-full object-cover object-center transition-opacity duration-200",
            tablet ? "h-auto object-contain" : "",
            loaded ? "opacity-100" : "opacity-0",
          ].join(" ")}
          loading="eager"
          fetchPriority="low"
          decoding="async"
          onLoad={onImageLoad}
          onError={onImageLoad}
          ref={(node) => {
            if (node?.complete && node.naturalWidth > 0) {
              onImageLoad();
            }
          }}
        />
      </div>

      <p
        className={[
          "text-neutral-700",
          mobile
            ? "mt-4 text-[15px] leading-[1.65]"
            : tablet
              ? "mt-5 max-w-[650px] text-[17px] leading-[1.65]"
              : "mt-5 max-w-[420px] text-[16px] leading-[1.65] text-neutral-700 xl:text-[17px]",
        ].join(" ")}
      >
        {review.text}
      </p>

      <p
        className={[
          "font-semibold text-neutral-950",
          mobile ? "mt-2 text-[14px]" : "mt-2.5 text-[15px]",
        ].join(" ")}
      >
        {review.name}
      </p>
    </article>
  );
}
