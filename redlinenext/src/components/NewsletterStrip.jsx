"use client";

import { useState } from "react";
import { Gift, Sparkles, Lightbulb } from "lucide-react";

export default function NewsletterStrip() {
  const [email, setEmail] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!email.trim()) return;

    console.log("Newsletter email:", email);
    setEmail("");
  };

  return (
    <section className="w-full border-y border-[#e8dfd1] bg-[#fbf8f1] font-body">
      <div className="mx-auto max-w-[1440px] px-5 py-4 sm:px-7 md:px-8 lg:px-12">
        <div className="grid items-center gap-5 lg:grid-cols-[390px_1fr_460px] xl:grid-cols-[420px_1fr_500px]">
          {/* Left Text */}
          <div className="flex items-center gap-4">
            <NewsletterIcon />

            <div>
              <h2 className="font-display text-[25px] font-medium leading-none tracking-[-0.03em] text-[#332519] sm:text-[29px]">
                Be the first to know
              </h2>

              <p className="mt-2 max-w-[310px] text-[12px] leading-[1.55] text-[#5f5648] sm:text-[13px]">
                Get exclusive offers, healthy recipes and farm stories straight
                to your inbox.
              </p>
            </div>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="flex w-full items-center gap-2 sm:gap-3 lg:justify-center"
          >
            <label htmlFor="newsletter-email" className="sr-only">
              Email address
            </label>

            <input
              id="newsletter-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Enter your email address"
              className="h-11 min-w-0 flex-1 rounded-[5px] border border-[#ddd4c6] bg-[#fffdf8] px-4 text-[13px] text-[#332519] outline-none transition-colors placeholder:text-[#928878] focus:border-[#405526] sm:min-w-[260px] lg:max-w-[360px]"
            />

            <button
              type="submit"
              className="h-11 shrink-0 rounded-[5px] bg-[#405526] px-5 text-[13px] font-semibold text-white transition-colors hover:bg-[#30421e] sm:px-7"
            >
              Subscribe
            </button>
          </form>

          {/* Right Benefits */}
          <div className="grid grid-cols-3 items-center gap-2 border-t border-[#e8dfd1] pt-4 sm:gap-4 lg:border-t-0 lg:pt-0">
            <MiniBenefit
              icon={Gift}
              title="Exclusive"
              secondLine="Offers"
              hasDivider
            />

            <MiniBenefit
              icon={Sparkles}
              title="Early Access"
              secondLine="to New Launches"
              hasDivider
            />

            <MiniBenefit
              icon={Lightbulb}
              title="Helpful Tips &"
              secondLine="Recipes"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function NewsletterIcon() {
  return (
    <div className="hidden h-[70px] w-[70px] shrink-0 items-center justify-center rounded-full border border-[#405526] text-[#405526] sm:flex">
      <svg
        viewBox="0 0 64 64"
        fill="none"
        className="h-[50px] w-[50px]"
        stroke="currentColor"
        strokeWidth="1.25"
      >
        <circle cx="32" cy="32" r="30" />
        <path d="M15 24h34v25H15V24Z" />
        <path d="M15 24l17 14 17-14" />
        <path d="M15 49l14-15" />
        <path d="M49 49L35 34" />
      </svg>
    </div>
  );
}

function MiniBenefit({ icon: Icon, title, secondLine, hasDivider = false }) {
  return (
    <div
      className={`flex min-w-0 items-center justify-center gap-2 px-1 text-center sm:justify-start sm:text-left lg:px-5 ${
        hasDivider ? "lg:border-r lg:border-[#e1d8c9]" : ""
      }`}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center text-[#405526]">
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.55} />
      </span>

      <p className="text-[10.5px] font-medium leading-[1.25] text-[#332519] sm:text-[12px]">
        {title}
        <span className="block">{secondLine}</span>
      </p>
    </div>
  );
}