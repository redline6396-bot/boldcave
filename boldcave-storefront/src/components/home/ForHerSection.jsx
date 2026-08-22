"use client";

import Link from "next/link";

const FOR_HER_HREF = "/collection?category=Women";
const DESKTOP_IMAGE = "/images/hero/women-desktop.webp";
const MOBILE_IMAGE = "/images/hero/women-mobile.webp";

export default function ForHerSection() {
  return (
    <section className="w-full bg-white">
      <Link
        href={FOR_HER_HREF}
        aria-label="Shop For Her"
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
