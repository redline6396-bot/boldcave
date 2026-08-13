"use client";

import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Leaf,
  ShieldCheck,
} from "lucide-react";

const reviews = [
  {
    id: 1,
    name: "Priya Sharma",
    initials: "PS",
    location: "Bengaluru, Karnataka",
    rating: 5,
    product: "Whole Wheat Atta",
    review:
      "Green Valley Naturals’ whole wheat atta is really good. The rotis come out soft and the taste feels fresh.",
  },
  {
    id: 2,
    name: "Rohit Kapoor",
    initials: "RK",
    location: "Pune, Maharashtra",
    rating: 5,
    product: "Basmati Rice",
    review:
      "The rice has a clean aroma and cooks well. It has become part of our regular monthly groceries.",
  },
  {
    id: 3,
    name: "Anjali Mehta",
    initials: "AM",
    location: "Ahmedabad, Gujarat",
    rating: 5,
    product: "Toor Dal",
    review:
      "The dal quality feels clean and consistent. Good for everyday family meals without any strong smell.",
  },
  {
    id: 4,
    name: "Meera Iyer",
    initials: "MI",
    location: "Chennai, Tamil Nadu",
    rating: 4,
    product: "Multi Millet",
    review:
      "The millet blend is fresh and easy to use. Packaging is neat and the product feels thoughtfully sourced.",
  },
];

export default function ReviewsSection() {
  const [activeIndex, setActiveIndex] = useState(0);

  const goNext = () => {
    setActiveIndex((current) => (current + 1) % reviews.length);
  };

  const goPrevious = () => {
    setActiveIndex((current) =>
      current === 0 ? reviews.length - 1 : current - 1
    );
  };

  const visibleReviews = [
    reviews[activeIndex],
    reviews[(activeIndex + 1) % reviews.length],
  ];

  return (
    <section className="w-full border-y border-[#e8dfd1] bg-[#fffdf8] font-body">
      <div className="mx-auto max-w-[1440px] px-5 py-10 sm:px-7 md:px-8 lg:px-12 lg:py-12">
        <div className="grid gap-8 lg:grid-cols-[340px_1fr] lg:items-center xl:grid-cols-[380px_1fr]">
          {/* Left Summary */}
          <div>
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.26em] text-[#405526]">
              Customer Reviews
            </p>

            <h2 className="font-display text-[30px] font-medium leading-[1.02] tracking-[-0.035em] text-[#332519] sm:text-[40px] lg:text-[42px] xl:text-[46px]">
              Loved by families.
              <span className="block">Rooted in trust.</span>
            </h2>

            <div className="mt-5 flex items-center gap-1 text-[#405526]">
              <PointedStars rating={4.5} size="text-[20px]" />
            </div>

            <div className="mt-4 flex items-end gap-2">
              <p className="font-display text-[38px] font-medium leading-none tracking-[-0.04em] text-[#332519] lg:text-[48px]">
                4.8
              </p>
              <p className="pb-1.5 text-[13px] text-[#332519]">/5</p>
            </div>

            <p className="mt-1 text-[13px] text-[#5f5648]">
              based on 3,200+ verified customer reviews
            </p>

            <p className="mt-5 max-w-[330px] text-[14px] leading-6 text-[#4f463c]">
              From our farms to your homes, thank you for making Green Valley
              Naturals a part of your everyday meals.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-[12px] font-medium text-[#405526]">
              <TrustBadge icon={ShieldCheck} label="100% Natural" />
              <span className="hidden h-1 w-1 rounded-full bg-[#a89a77] sm:block" />
              <TrustBadge icon={Leaf} label="No Preservatives" />
              <span className="hidden h-1 w-1 rounded-full bg-[#a89a77] sm:block" />
              <TrustBadge icon={ShieldCheck} label="Lab Tested" />
            </div>
          </div>

          {/* Right Review Cards */}
          <div className="relative">
            <div className="grid gap-5 lg:grid-cols-2">
              {visibleReviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>

            {/* Controls */}
            <div className="mt-6 flex items-center justify-center gap-4 lg:justify-start">
              <button
                type="button"
                onClick={goPrevious}
                aria-label="Previous review"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#ded4c3] bg-[#fffdf8] text-[#405526] transition-colors hover:border-[#405526] hover:bg-[#f4eee2]"
              >
                <ChevronLeft className="h-4.5 w-4.5" strokeWidth={1.8} />
              </button>

              <div className="flex items-center gap-2">
                {reviews.map((review, index) => (
                  <button
                    key={review.id}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    aria-label={`Show review ${index + 1}`}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      activeIndex === index
                        ? "w-6 bg-[#405526]"
                        : "w-2 bg-[#d8cfbe]"
                    }`}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={goNext}
                aria-label="Next review"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#ded4c3] bg-[#fffdf8] text-[#405526] transition-colors hover:border-[#405526] hover:bg-[#f4eee2]"
              >
                <ChevronRight className="h-4.5 w-4.5" strokeWidth={1.8} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ReviewCard({ review }) {
  return (
    <article className="relative min-h-[260px] rounded-[16px] border border-[#e7dfd1] bg-[#fffaf1] p-5 shadow-[0_10px_28px_rgba(54,45,29,0.05)] sm:p-6 lg:min-h-[290px]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/70 bg-[#e9e2d2] font-display text-[20px] text-[#69743e] shadow-inner">
            {review.initials}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-[20px] font-medium leading-none text-[#332519]">
                {review.name}
              </h3>

              <ShieldCheck className="h-3.5 w-3.5 text-[#5a682f]" />
            </div>

            <p className="mt-1 text-[11px] text-[#665d50]">
              {review.location}
            </p>
          </div>
        </div>

        <div className="hidden sm:block">
          <PointedStars rating={review.rating} size="text-[17px]" />
        </div>
      </div>

      <div className="mt-5 border-t border-[#e5dbc9] pt-5">
        <p className="font-display text-[32px] leading-none text-[#5a682f]">
          “
        </p>

        <p className="-mt-3 text-[14px] leading-7 text-[#3f382f] sm:text-[15px]">
          {review.review}
        </p>
      </div>

      <div className="mt-5 rounded-[10px] bg-[#f4eddf] px-4 py-3 text-[12px] text-[#405526]">
        <span className="font-medium">Purchased:</span> {review.product}
      </div>
    </article>
  );
}

function PointedStars({ rating = 5, size = "text-xl" }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, index) => {
        const isFilled = index < Math.floor(rating);
        const isHalf = index === Math.floor(rating) && rating % 1 !== 0;
        
        return (
          <span
            key={index}
            className={`${size} leading-none relative`}
            style={{
              color: isFilled ? "#405526" : "#fffdf8",
              WebkitTextStroke: !isFilled ? "0.8px #405526" : "0px",
            }}
          >
            {isHalf ? (
              <>
                <span
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: "50%" }}
                >
                  <span style={{ color: "#405526" }}>★</span>
                </span>
                <span style={{ color: "#fffdf8", WebkitTextStroke: "0.8px #405526" }}>
                  ★
                </span>
              </>
            ) : (
              "★"
            )}
          </span>
        );
      })}
    </div>
  );
}

function TrustBadge({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5" strokeWidth={1.7} />
      <span>{label}</span>
    </div>
  );
}