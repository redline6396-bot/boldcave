"use client";

import Link from "next/link";

const FOR_HIM_HREF = "/collection?category=Men";
const DESKTOP_IMAGE = "/images/hero/men-desktop.webp";
const MOBILE_IMAGE = "/images/hero/men-mobile.webp";

export default function ForHimSection() {
  return (
    <section className="w-full bg-white">
      <Link
        href={FOR_HIM_HREF}
        aria-label="Shop For Him"
        className="block w-full cursor-pointer"
      >
        <picture>
          <source media="(max-width: 639px)" srcSet={MOBILE_IMAGE} />
          <source media="(min-width: 640px)" srcSet={DESKTOP_IMAGE} />
          <img
            src={DESKTOP_IMAGE}
            alt=""
            className="block h-auto w-full lg:h-[39vw] lg:max-h-[720px] lg:object-cover lg:object-center"
            loading="lazy"
            decoding="async"
          />
        </picture>
      </Link>
    </section>
  );
}
