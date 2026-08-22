"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "How long does the fragrance last?",
    answer:
      "Fragrance performance can vary depending on the perfume, your skin type, weather, application and how the fragrance develops through the day. Each Bold Cave product page includes its expected longevity and projection so you can understand the character and performance of that specific fragrance before ordering.",
  },
  {
    question: "Where should I apply the perfume?",
    answer:
      "For best performance, apply the fragrance to pulse points such as the neck, wrists and behind the ears. Spray from a short distance and allow it to settle naturally on the skin. Avoid rubbing the fragrance after application, as this can affect how the scent develops over time.",
  },
  {
    question: "What sizes are available?",
    answer:
      "Available sizes are shown directly on each product page and may differ depending on the fragrance and current stock. Select your preferred size before adding the product to your cart. If a particular size is unavailable, it will be clearly marked on the product page.",
  },
  {
    question: "How can I check delivery availability?",
    answer:
      "Delivery availability is checked using your pincode during checkout. Once you enter your delivery details, we verify whether the location is currently serviceable before allowing you to continue with the order. This helps prevent orders from being placed for locations we cannot currently deliver to.",
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <section className="bg-white text-neutral-950">
      <div className="mx-auto max-w-[1400px] px-5 pb-7 pt-8 sm:px-8 sm:pb-8 sm:pt-10 lg:px-10 lg:pb-10 lg:pt-12">
        <div className="text-center">
          <p className="text-[9px] font-medium uppercase tracking-[0.34em] text-neutral-500 sm:text-[10px] lg:text-[11px]">
            Frequently Asked Questions
          </p>

          <h2 className="mt-3 font-serif text-[40px] font-normal leading-none tracking-[-0.025em] sm:text-[46px] lg:text-[52px]">
            FAQ
          </h2>
        </div>

        <div className="mt-9 border-t border-neutral-200 sm:mt-10 lg:mt-11">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;

            return (
              <div
                key={faq.question}
                className="border-b border-neutral-200"
              >
                <button
                  type="button"
                  onClick={() =>
                    setOpenIndex((current) => (current === index ? null : index))
                  }
                  className={[
                    "group flex w-full cursor-pointer items-center justify-between gap-6 px-0 py-[18px] text-left transition-colors duration-200 sm:py-5 lg:py-[21px]",
                    isOpen ? "bg-black/[0.025]" : "",
                  ].join(" ")}
                  aria-expanded={isOpen}
                >
                  <span
                    className={[
                      "text-[15px] font-normal leading-[1.35] tracking-[-0.012em] text-[#3f3f3f] decoration-[1px] underline-offset-[3px] sm:text-[18px] lg:text-[21px]",
                      isOpen ? "underline" : "group-hover:underline",
                    ].join(" ")}
                  >
                    {faq.question}
                  </span>

                  <ChevronDown
                    className={[
                      "h-3.5 w-3.5 shrink-0 text-neutral-700 transition-transform duration-200 sm:h-4 sm:w-4",
                      isOpen ? "rotate-180" : "",
                    ].join(" ")}
                    strokeWidth={1.45}
                  />
                </button>

                <div
                  className={[
                    "grid overflow-hidden transition-[grid-template-rows,opacity] duration-200 ease-out",
                    isOpen
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0",
                  ].join(" ")}
                >
                  <div className="min-h-0">
                    <p className="max-w-[1280px] px-0 pb-5 pt-1 text-[13px] font-normal leading-[1.9] tracking-[0.005em] text-neutral-600 sm:pb-6 sm:text-[14px] lg:px-1 lg:text-[16px] lg:leading-[1.9]">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
