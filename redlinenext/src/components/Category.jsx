"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const FALLBACK_IMAGE =
  "https://upload.wikimedia.org/wikipedia/commons/a/a3/Image-not-found.png";

const categories = [
  {
    name: "Atta & Flours",
    image: "/images/categories/atta-flours.png",
    href: "/collection?category=Atta",
  },
  {
    name: "Rice",
    image: "/images/categories/rice-grains.png",
    href: "/collection?category=Grains",
  },
  {
    name: "Dals & Pulses",
    image: "/images/categories/pulses-dal.png",
    href: "/collection?category=Pulses",
  },
  {
    name: "Millets",
    image: "/images/categories/millets.png",
    href: "/collection?category=Millets",
  },
  {
    name: "Makka",
    image: "/images/categories/makka.png",
    href: "/collection?category=Makka",
  },
  {
    name: "Jaggery",
    image: "/images/categories/jaggery.png",
    href: "/collection?category=Jaggery",
  },
  {
    name: "Spices",
    image: "/images/categories/spices.png",
    href: "/collection?category=Spices",
  },
  {
    name: "Dry Fruits",
    image: "/images/categories/dry-fruits.png",
    href: "/collection?category=Dry%20Fruits",
  },
];

const duplicatedCategories = [...categories, ...categories];

export default function CategoryGrid() {
  const sliderRef = useRef(null);
  const resetTimerRef = useRef(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const getStepSize = useCallback(() => {
    const slider = sliderRef.current;

    if (!slider || slider.children.length < 2) return 0;

    const firstCard = slider.children[0];
    const secondCard = slider.children[1];

    return secondCard.offsetLeft - firstCard.offsetLeft;
  }, []);

  const scrollToIndex = useCallback(
    (index, behavior = "smooth") => {
      const slider = sliderRef.current;
      const step = getStepSize();

      if (!slider || !step) return;

      slider.scrollTo({
        left: index * step,
        behavior,
      });
    },
    [getStepSize]
  );

  const goNext = useCallback(() => {
    const nextIndex = currentIndex + 1;

    if (nextIndex < categories.length) {
      setCurrentIndex(nextIndex);
      scrollToIndex(nextIndex);
      return;
    }

    /*
      Scroll to the duplicated first card, then silently jump
      back to the original first card after the animation.
    */
    scrollToIndex(categories.length);

    clearTimeout(resetTimerRef.current);

    resetTimerRef.current = setTimeout(() => {
      scrollToIndex(0, "auto");
      setCurrentIndex(0);
    }, 520);
  }, [currentIndex, scrollToIndex]);

  const goPrevious = useCallback(() => {
    if (currentIndex > 0) {
      const previousIndex = currentIndex - 1;

      setCurrentIndex(previousIndex);
      scrollToIndex(previousIndex);
      return;
    }

    /*
      Jump invisibly to the duplicated first position,
      then animate backwards to the last original category.
    */
    scrollToIndex(categories.length, "auto");

    requestAnimationFrame(() => {
      const lastIndex = categories.length - 1;
      setCurrentIndex(lastIndex);
      scrollToIndex(lastIndex);
    });
  }, [currentIndex, scrollToIndex]);

  useEffect(() => {
    if (typeof window === "undefined" || isPaused) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reducedMotion) return;

    const interval = setInterval(() => {
      goNext();
    }, 3500);

    return () => clearInterval(interval);
  }, [goNext, isPaused]);

  useEffect(() => {
    const handleResize = () => {
      scrollToIndex(currentIndex, "auto");
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(resetTimerRef.current);
    };
  }, [currentIndex, scrollToIndex]);

  return (
    <section
      className="w-full border-y border-[#e8dfd1] bg-[#fffdf8]"
      aria-label="Product categories"
    >
      <div
        className="mx-auto max-w-[1260px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onFocusCapture={() => setIsPaused(true)}
        onBlurCapture={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        <div className="relative flex items-center gap-3 lg:gap-5">
          {/* Left Arrow */}
          <button
            type="button"
            onClick={goPrevious}
            aria-label="Previous categories"
            className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#ddd2bf] bg-[#fffdf8] text-[#43552d] transition-colors duration-200 hover:border-[#a89a77] hover:bg-[#f6f0e5] lg:flex"
          >
            <ChevronLeft className="h-[19px] w-[19px]" strokeWidth={1.7} />
          </button>

          {/* Slider viewport */}
          <div className="relative min-w-0 flex-1 overflow-hidden">
            <div className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 hidden w-8 bg-gradient-to-r from-[#fffdf8] to-transparent lg:block" />
            <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 hidden w-8 bg-gradient-to-l from-[#fffdf8] to-transparent lg:block" />

            <div
              ref={sliderRef}
              className="category-slider flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-1 sm:gap-6 lg:gap-7"
            >
              {duplicatedCategories.map((category, index) => (
                <CategoryCard
                  key={`${category.name}-${index}`}
                  category={category}
                />
              ))}
            </div>
          </div>

          {/* Right Arrow */}
          <button
            type="button"
            onClick={goNext}
            aria-label="Next categories"
            className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#ddd2bf] bg-[#fffdf8] text-[#43552d] transition-colors duration-200 hover:border-[#a89a77] hover:bg-[#f6f0e5] lg:flex"
          >
            <ChevronRight className="h-[19px] w-[19px]" strokeWidth={1.7} />
          </button>
        </div>

        {/* Mobile indicators */}
        <div className="mt-4 flex justify-center gap-1.5 lg:hidden">
          {categories.map((category, index) => (
            <span
              key={category.name}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                currentIndex === index
                  ? "w-5 bg-[#405526]"
                  : "w-1.5 bg-[#d8cfbe]"
              }`}
            />
          ))}
        </div>
      </div>

      <style jsx>{`
        .category-slider {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        .category-slider::-webkit-scrollbar {
          display: none;
          height: 0;
          width: 0;
        }
      `}</style>
    </section>
  );
}

function CategoryCard({ category }) {
  const handleImageError = (event) => {
    event.currentTarget.onerror = null;
    event.currentTarget.src = FALLBACK_IMAGE;
  };

  return (
    <Link
      href={category.href}
      className="group flex w-[104px] shrink-0 snap-start flex-col items-center sm:w-[128px] lg:w-[148px]"
    >
      <div className="relative flex h-[88px] w-[88px] items-center justify-center overflow-hidden rounded-full border border-[#eadfcd] bg-[#f6f1e8] transition-colors duration-300 group-hover:border-[#b9aa85] sm:h-[106px] sm:w-[106px] lg:h-[118px] lg:w-[118px]">
        <img
          src={category.image}
          alt={category.name}
          loading="lazy"
          onError={handleImageError}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.035]"
        />
      </div>

      <p className="mt-3.5 whitespace-nowrap text-center text-[13px] font-medium text-[#443d32] transition-colors duration-200 group-hover:text-[#405526] sm:text-[14px]">
        {category.name}
      </p>
    </Link>
  );
}