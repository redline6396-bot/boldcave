"use client";

import Link from "next/link";

const FALLBACK_IMAGE =
  "https://upload.wikimedia.org/wikipedia/commons/a/a3/Image-not-found.png";

export default function OurStorySection() {
  return (
    <section className="w-full border-b border-[#e8dfd1] bg-[#fffdf8] font-body">
      <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 md:px-8 lg:px-12 lg:py-8">
        <div className="grid gap-4 sm:gap-5 lg:grid-cols-[300px_1fr] lg:items-end">
          {/* Left Content */}
          <div className="flex flex-col justify-center lg:min-h-[340px] xl:min-h-[400px]">
            <h2 className="font-display text-[32px] font-medium leading-tight tracking-[-0.035em] text-[#332519] sm:text-[38px] md:text-[40px] lg:text-[36px] xl:text-[40px]">
              Our Story
            </h2>

            <p className="mt-4 max-w-[380px] text-[14px] leading-[1.7] text-[#4f463c] sm:text-[15px] md:text-[16px] lg:text-[14px] xl:text-[15px]">
              Green Valley Naturals began with a simple belief — real food
              should come from real farms. We work closely with farmers across
              India to bring you pure, natural and honestly sourced staples for
              your family.
            </p>

            <Link
              href="/about"
              className="mt-6 inline-flex h-11 w-fit items-center justify-center rounded-[4px] border border-[#405526] px-6 text-[13px] font-semibold text-[#26351f] transition-colors hover:bg-[#405526] hover:text-white sm:h-12 sm:text-[14px] sm:px-7"
            >
              Know More About Us
            </Link>
          </div>

          {/* Farm Image Card */}
          <div className="relative h-[280px] overflow-hidden rounded-[9px] border border-[#ded5c5] bg-[#f3eddf] min-[390px]:h-[310px] sm:h-[360px] lg:h-[300px] xl:h-[350px]">
            <img
              src="/images/our-story-farm.png"
              alt="Farmers working in a green field"
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = FALLBACK_IMAGE;
              }}
              className="absolute inset-0 h-full w-full object-cover object-[42%_center] lg:object-[38%_center]"
            />

            {/* Soft contrast layer */}
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.02)_0%,rgba(0,0,0,0)_45%,rgba(0,0,0,0.10)_100%)]" />

            {/* Floating Card */}
            <div className="absolute bottom-3 right-3 w-[155px] rounded-[8px] border border-[#e7dfd2] bg-[#fffdf8]/96 p-3 shadow-[0_10px_28px_rgba(38,45,30,0.12)] backdrop-blur-sm min-[390px]:w-[175px] min-[390px]:p-3.5 sm:bottom-5 sm:right-5 sm:w-[190px] sm:p-3 lg:bottom-5 lg:right-5 lg:w-[230px] lg:p-5 xl:w-[250px]">
              <h3 className="font-display text-[18px] font-medium leading-[1.1] tracking-[-0.03em] text-[#332519] min-[390px]:text-[20px] sm:text-[20px] lg:text-[26px] xl:text-[30px]">
                From our farms
                <span className="block">to your home.</span>
              </h3>

              <p className="mt-1.5 text-[9px] leading-[1.4] text-[#5d5448] min-[390px]:text-[9.5px] min-[390px]:mt-2 sm:mt-2 sm:text-[10px]">
                Traceable. Transparent.
                <span className="block">Trustworthy.</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}