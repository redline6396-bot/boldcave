"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

const AUTOPLAY_DELAY = 5000;
const SWIPE_THRESHOLD = 48;

const slides = [
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

export default function HeroCarousel() {
  const initialSlideIndex = Math.max(
    slides.findIndex((slide) => slide.active),
    0
  );
  const [activeIndex, setActiveIndex] = useState(initialSlideIndex);
  const carouselRef = useRef(null);
  const dragRef = useRef(null);
  const suppressClickRef = useRef(false);
  const scrollFrameRef = useRef(null);

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
  }, []);

  const syncActiveSlide = useCallback(() => {
    const carousel = carouselRef.current;

    if (!carousel || carousel.clientWidth === 0) {
      return;
    }

    const nextIndex = Math.round(carousel.scrollLeft / carousel.clientWidth);
    const safeIndex = Math.max(0, Math.min(nextIndex, slides.length - 1));
    setActiveIndex(safeIndex);
  }, []);

  useEffect(() => {
    scrollToSlide(initialSlideIndex, "auto");
  }, [initialSlideIndex, scrollToSlide]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextIndex =
        activeIndex === slides.length - 1 ? 0 : activeIndex + 1;
      scrollToSlide(nextIndex);
    }, AUTOPLAY_DELAY);

    return () => window.clearTimeout(timer);
  }, [activeIndex, scrollToSlide]);

  const handleScroll = () => {
    if (scrollFrameRef.current) {
      window.cancelAnimationFrame(scrollFrameRef.current);
    }

    scrollFrameRef.current =
      window.requestAnimationFrame(syncActiveSlide);
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

  const handleSlideClick = (event) => {
    if (!suppressClickRef.current) {
      return;
    }

    event.preventDefault();
    suppressClickRef.current = false;
  };

  return (
    <section className="w-full bg-white">
      <div
        ref={carouselRef}
        className="flex w-full cursor-grab snap-x snap-mandatory touch-auto select-none overflow-x-auto overflow-y-hidden overscroll-x-contain scroll-smooth active:cursor-grabbing [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        onScroll={handleScroll}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={() => {
          dragRef.current = null;
        }}
      >
        {slides.map((slide, index) => (
          <Link
            key={slide.id}
            href={slide.href}
            aria-label={`Open banner ${index + 1}`}
            aria-hidden={index !== activeIndex}
            tabIndex={index === activeIndex ? 0 : -1}
            onClick={handleSlideClick}
            className="block w-full min-w-full shrink-0 snap-start overflow-hidden"
          >
            <picture className="block w-full sm:h-[42vw] sm:max-h-[780px]">
              <source
                media="(max-width: 767px)"
                srcSet={slide.mobileImage}
              />
              <source
                media="(min-width: 768px)"
                srcSet={slide.desktopImage}
              />
              <img
                src={slide.desktopImage}
                alt=""
                className="block h-auto w-full max-w-none sm:h-full sm:object-cover sm:object-center"
                loading={index === 0 ? "eager" : "lazy"}
                fetchPriority={index === 0 ? "high" : "auto"}
                decoding={index === 0 ? "sync" : "async"}
              />
            </picture>
          </Link>
        ))}
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
