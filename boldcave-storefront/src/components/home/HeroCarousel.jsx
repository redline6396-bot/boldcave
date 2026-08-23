"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { fetchHomepageSettings } from "@/lib/clientApi";

const AUTOPLAY_DELAY = 3000;
const SWIPE_THRESHOLD = 48;
const TAP_THRESHOLD = 10;

const fallbackSlides = [
  {
    id: "hero-slide-1",
    desktopImage: "/images/hero/hero-1-desktop.webp",
    mobileImage: "/images/hero/hero-1-mobile.webp",
    href: "/collection",
    active: true,
  },
  {
    id: "hero-slide-2",
    desktopImage: "/images/hero/hero-1-desktop.webp",
    mobileImage: "/images/hero/hero-1-mobile.webp",
    href: "/collection",
    active: false,
  },
  {
    id: "hero-slide-3",
    desktopImage: "/images/hero/hero-1-desktop.webp",
    mobileImage: "/images/hero/hero-1-mobile.webp",
    href: "/collection",
    active: false,
  },
];

const hasHeroSlideContent = (items) =>
  Array.isArray(items) &&
  items.some((slide) => slide?.desktopImage || slide?.mobileImage || slide?.link);

const buildHeroSlides = (items) =>
  fallbackSlides.map((fallbackSlide, index) => {
    const slide = Array.isArray(items) ? items[index] || {} : {};

    return {
      id: fallbackSlide.id,
      desktopImage: slide.desktopImage || fallbackSlide.desktopImage,
      mobileImage: slide.mobileImage || fallbackSlide.mobileImage,
      href: slide.link || fallbackSlide.href,
      active: index === 0,
    };
  });

const getSlideImageKey = (slide) =>
  `${slide.id}:${slide.desktopImage}:${slide.mobileImage}`;

export default function HeroCarousel() {
  const router = useRouter();
  const [slides, setSlides] = useState(fallbackSlides);
  const [isPaused, setIsPaused] = useState(false);
  const initialSlideIndex = Math.max(
    slides.findIndex((slide) => slide.active),
    0
  );

  const [activeIndex, setActiveIndex] = useState(initialSlideIndex);
  const [loadedImages, setLoadedImages] = useState({});
  const [isInitialPositionReady, setIsInitialPositionReady] = useState(false);
  const carouselRef = useRef(null);
  const dragRef = useRef(null);
  const suppressClickRef = useRef(false);
  const scrollFrameRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    async function loadHeroSlides() {
      try {
        const settings = await fetchHomepageSettings();
        if (!mounted || !hasHeroSlideContent(settings?.heroSlides)) {
          return;
        }

        setIsInitialPositionReady(false);
        setSlides(buildHeroSlides(settings.heroSlides));
        setActiveIndex(0);
      } catch {
        // Keep the current hardcoded banners if homepage settings are unavailable.
      }
    }

    loadHeroSlides();

    return () => {
      mounted = false;
    };
  }, []);

  const markImageLoaded = useCallback((slide) => {
    const imageKey = getSlideImageKey(slide);

    setLoadedImages((currentLoadedImages) => {
      if (currentLoadedImages[imageKey]) {
        return currentLoadedImages;
      }

      return {
        ...currentLoadedImages,
        [imageKey]: true,
      };
    });
  }, []);

  const registerImage = useCallback(
    (node, slide) => {
      if (!node) {
        return;
      }

      // Important for cached images:
      // the browser may already have completed the image before React's
      // onLoad handler is attached. Reveal it immediately in that case.
      if (node.complete && node.naturalWidth > 0) {
        markImageLoaded(slide);
      }
    },
    [markImageLoaded]
  );

  const slidesSignature = slides.map(getSlideImageKey).join("|");
  const firstSlide = slides[0];
  const firstSlideLoaded = firstSlide
    ? Boolean(loadedImages[getSlideImageKey(firstSlide)])
    : false;
  const isHeroReady = isInitialPositionReady && firstSlideLoaded;

  // Reset the horizontal scroll position BEFORE paint.
  // Browsers can restore an overflow container's previous scrollLeft on refresh,
  // which is what can briefly expose slide 2/3 before React moves back to slide 1.
  useLayoutEffect(() => {
    const carousel = carouselRef.current;

    if (!carousel) {
      return;
    }

    carousel.scrollLeft = 0;
    setActiveIndex(0);
    setIsInitialPositionReady(true);
  }, [slidesSignature]);

  // When slide 1 finishes loading, guarantee position 0 once more before the
  // hidden carousel is revealed. This also covers cached-image timing.
  useLayoutEffect(() => {
    if (!firstSlideLoaded) {
      return;
    }

    const carousel = carouselRef.current;

    if (!carousel) {
      return;
    }

    carousel.scrollLeft = 0;
    setActiveIndex(0);
  }, [firstSlideLoaded, slidesSignature]);

  const scrollToSlide = useCallback((index, behavior = "smooth") => {
    const carousel = carouselRef.current;

    if (!carousel) {
      return;
    }

    const safeIndex = Math.max(0, Math.min(index, slides.length - 1));

    carousel.scrollTo({
      left: safeIndex * carousel.clientWidth,
      behavior,
    });

    setActiveIndex(safeIndex);
  }, [slides.length]);

  const syncActiveSlide = useCallback(() => {
    const carousel = carouselRef.current;

    if (!carousel || carousel.clientWidth === 0) {
      return;
    }

    const nextIndex = Math.round(carousel.scrollLeft / carousel.clientWidth);
    const safeIndex = Math.max(0, Math.min(nextIndex, slides.length - 1));

    setActiveIndex(safeIndex);
  }, [slides.length]);

  useEffect(() => {
    if (isPaused || !isHeroReady || slides.length <= 1) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      const nextIndex =
        activeIndex === slides.length - 1 ? 0 : activeIndex + 1;

      scrollToSlide(nextIndex);
    }, AUTOPLAY_DELAY);

    return () => window.clearTimeout(timer);
  }, [
    activeIndex,
    isHeroReady,
    isPaused,
    scrollToSlide,
    slides.length,
  ]);

  const handleScroll = () => {
    if (scrollFrameRef.current) {
      window.cancelAnimationFrame(scrollFrameRef.current);
    }

    scrollFrameRef.current = window.requestAnimationFrame(syncActiveSlide);
  };

  const handlePointerDown = (event) => {
    const carousel = carouselRef.current;

    if (!carousel) {
      return;
    }

    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
      scrollLeft: carousel.scrollLeft,
      isHorizontal: false,
    };

    suppressClickRef.current = false;

    if (event.currentTarget.setPointerCapture) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  };

  const handlePointerMove = (event) => {
    const carousel = carouselRef.current;

    if (!carousel || !dragRef.current) {
      return;
    }

    const deltaX = event.clientX - dragRef.current.x;
    const deltaY = event.clientY - dragRef.current.y;

    if (!dragRef.current.isHorizontal) {
      dragRef.current.isHorizontal =
        Math.abs(deltaX) > 12 && Math.abs(deltaX) > Math.abs(deltaY);
    }

    if (!dragRef.current.isHorizontal) {
      return;
    }

    suppressClickRef.current = true;
    carousel.scrollLeft = dragRef.current.scrollLeft - deltaX;
    event.preventDefault();
  };

  const handlePointerEnd = (event) => {
    const carousel = carouselRef.current;

    if (!carousel || !dragRef.current) {
      return;
    }

    const deltaX = event.clientX - dragRef.current.x;
    const deltaY = event.clientY - dragRef.current.y;
    const wasHorizontal = dragRef.current.isHorizontal;

    dragRef.current = null;

    if (!wasHorizontal) {
      if (
        Math.abs(deltaX) <= TAP_THRESHOLD &&
        Math.abs(deltaY) <= TAP_THRESHOLD
      ) {
        suppressClickRef.current = true;
        router.push(slides[activeIndex]?.href || "/collection");
      }

      return;
    }

    const currentIndex = Math.round(
      carousel.scrollLeft / carousel.clientWidth
    );

    let nextIndex = currentIndex;

    if (
      Math.abs(deltaX) >= SWIPE_THRESHOLD &&
      Math.abs(deltaX) > Math.abs(deltaY)
    ) {
      nextIndex = deltaX < 0 ? activeIndex + 1 : activeIndex - 1;
    }

    scrollToSlide(nextIndex);
  };

  const handleSlideClick = (event, href) => {
    if (!suppressClickRef.current) {
      event.preventDefault();
      router.push(href);
      return;
    }

    event.preventDefault();
    suppressClickRef.current = false;
  };

  return (
    <section className="w-full bg-white">
      <div
        ref={carouselRef}
        className={[
          "flex w-full cursor-pointer snap-x snap-mandatory touch-auto select-none overflow-y-hidden overscroll-x-contain scroll-smooth transition-opacity duration-200 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          isHeroReady
            ? "overflow-x-auto opacity-100"
            : "pointer-events-none overflow-x-hidden opacity-0",
        ].join(" ")}
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        onScroll={handleScroll}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onFocus={() => setIsPaused(true)}
        onBlur={() => setIsPaused(false)}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={() => {
          dragRef.current = null;
        }}
      >
        {slides.map((slide, index) => {
          const imageKey = getSlideImageKey(slide);
          const isImageLoaded = Boolean(loadedImages[imageKey]);

          return (
            <Link
              key={slide.id}
              href={slide.href}
              aria-label={`Open banner ${index + 1}`}
              aria-hidden={index !== activeIndex}
              tabIndex={index === activeIndex ? 0 : -1}
              onClick={(event) => handleSlideClick(event, slide.href)}
              className="block w-full min-w-full shrink-0 snap-start overflow-hidden"
            >
              <picture className="relative block aspect-square w-full bg-[#f7f5f2] sm:h-[45vw] sm:aspect-auto lg:h-[42vw] lg:max-h-[780px]">
                <source
                  media="(max-width: 639px)"
                  srcSet={slide.mobileImage}
                />
                <source
                  media="(min-width: 640px)"
                  srcSet={slide.desktopImage}
                />

                <img
                  ref={(node) => registerImage(node, slide)}
                  src={slide.desktopImage}
                  alt=""
                  className={[
                    "block h-full w-full max-w-none object-cover object-center transition-opacity duration-200 sm:h-full sm:object-cover lg:h-full lg:object-cover",
                    isImageLoaded ? "opacity-100" : "opacity-0",
                  ].join(" ")}
                  loading={index === 0 ? "eager" : "lazy"}
                  fetchPriority={index === 0 ? "high" : "auto"}
                  decoding="async"
                  onLoad={() => markImageLoaded(slide)}
                  onError={() => markImageLoaded(slide)}
                />
              </picture>
            </Link>
          );
        })}
      </div>

      <div className="flex h-[30px] items-center justify-center border-y border-[#e5e5e5] bg-white sm:h-[45px]">
        <div className="flex items-center gap-3">
          {slides.map((slide, index) => {
            const isActive = index === activeIndex;

            return (
              <button
                key={`${slide.id}-dot`}
                type="button"
                onClick={() => scrollToSlide(index)}
                aria-label={`Show banner ${index + 1}`}
                aria-current={isActive ? "true" : undefined}
                className={[
                  "h-[10px] w-[10px] cursor-pointer rounded-full border transition-colors duration-200 sm:h-3 sm:w-3",
                  isActive
                    ? "border-neutral-950 bg-neutral-950"
                    : "border-neutral-400 bg-white hover:border-neutral-950",
                ].join(" ")}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
