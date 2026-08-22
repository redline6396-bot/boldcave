"use client";

import Link from "next/link";

const OUR_STORY_HREF = "/about";
const DESKTOP_IMAGE = "/images/hero/ourstory-desktop.webp";
const MOBILE_IMAGE = "/images/hero/ourstory-mobile.webp";

export default function OurStorySection() {
  return (
    <section className="w-full bg-white">
      <Link
        href={OUR_STORY_HREF}
        aria-label="Read Our Story"
        className="block w-full cursor-pointer lg:py-8"
      >
        <picture>
          <source media="(max-width: 639px)" srcSet={MOBILE_IMAGE} />
          <source media="(min-width: 640px)" srcSet={DESKTOP_IMAGE} />
          <img
            src={DESKTOP_IMAGE}
            alt=""
            className="block h-auto w-full sm:h-[470px] sm:object-cover sm:object-center lg:h-[560px] xl:h-[600px]"
            loading="lazy"
            decoding="async"
          />
        </picture>
      </Link>
    </section>
  );
}
