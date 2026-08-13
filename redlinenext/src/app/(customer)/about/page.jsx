"use client";

import Link from "next/link";
import {
  Leaf,
  Sprout,
  ShieldCheck,
  Users,
  Wheat,
  Truck,
  CheckCircle,
  ArrowRight,
  PackageCheck,
  HeartHandshake,
} from "lucide-react";

const values = [
  {
    icon: Leaf,
    title: "Pure by nature",
    text: "Simple staples without unnecessary additives or over-processing.",
  },
  {
    icon: Users,
    title: "Farmer-first sourcing",
    text: "We work with people who understand Indian soil, crops and seasons.",
  },
  {
    icon: ShieldCheck,
    title: "Honest quality",
    text: "Every product is selected with care before it reaches your kitchen.",
  },
];

const processSteps = [
  {
    number: "01",
    title: "Sourced with care",
    text: "We choose everyday staples from trusted supply partners and farming networks.",
  },
  {
    number: "02",
    title: "Cleaned and packed",
    text: "Our products are handled carefully to preserve freshness and natural quality.",
  },
  {
    number: "03",
    title: "Delivered to homes",
    text: "Every pack is made for Indian kitchens, from daily rotis to family meals.",
  },
];

const stats = [
  { value: "15+", label: "Products" },
  { value: "1k+", label: "Families served" },
  { value: "50+", label: "Farmers connected" },
];

const promiseItems = [
  {
    icon: Truck,
    title: "Careful delivery",
    text: "Packed to reach your home safely.",
  },
  {
    icon: Sprout,
    title: "Naturally sourced",
    text: "Staples selected from trusted supply partners.",
  },
  {
    icon: CheckCircle,
    title: "Quality checked",
    text: "Every product is checked before dispatch.",
  },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#fbf8f1] font-body text-[#332519]">
      {/* Hero */}
      <section className="border-b border-[#e8dfd1] bg-[#fffdf8]">
        <div className="mx-auto max-w-[1440px] px-5 py-12 sm:px-7 md:px-8 lg:px-12 lg:py-16">
          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            {/* Left Content */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#405526]">
                About Green Valley
              </p>

              <h1 className="mt-4 font-display text-[44px] font-medium leading-[0.96] tracking-[-0.055em] text-[#332519] sm:text-[62px] lg:text-[78px]">
                Real food,
                <span className="block italic text-[#405526]">
                  rooted in India.
                </span>
              </h1>

              <p className="mt-6 max-w-[600px] text-[15px] leading-7 text-[#5f5648]">
                Green Valley Naturals was built around a simple belief:
                everyday food should feel honest, familiar and trustworthy. From
                atta and rice to pulses and grains, we bring naturally sourced
                staples closer to Indian homes.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/collection"
                  className="inline-flex h-11 items-center justify-center rounded-[6px] bg-[#405526] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#30421e]"
                >
                  Shop Staples
                </Link>

                <Link
                  href="/contact"
                  className="inline-flex h-11 items-center justify-center rounded-[6px] border border-[#405526] bg-[#fffdf8] px-6 text-sm font-semibold text-[#405526] transition-colors hover:bg-[#f4eee2]"
                >
                  Contact Us
                </Link>
              </div>
            </div>

            {/* Right Editorial Card - No Image */}
            <div className="rounded-[22px] border border-[#e8dfd1] bg-[#fbf8f1] p-5 shadow-[0_18px_50px_rgba(58,45,29,0.05)] sm:p-7 lg:p-8">
              <div className="rounded-[18px] border border-[#e8dfd1] bg-[#fffdf8] p-6 sm:p-8">
                <Wheat
                  className="h-8 w-8 text-[#405526]"
                  strokeWidth={1.45}
                />

                <p className="mt-8 font-display text-[34px] font-medium leading-[1.08] tracking-[-0.045em] text-[#332519] sm:text-[44px]">
                  Staples made for everyday Indian kitchens.
                </p>

                <p className="mt-5 text-[14px] leading-7 text-[#5f5648]">
                  Simple food. Clean sourcing. Familiar taste. Better trust.
                </p>

                <div className="mt-8 grid grid-cols-3 divide-x divide-[#e8dfd1] rounded-[14px] border border-[#e8dfd1] bg-[#fbf8f1]">
                  {stats.map((stat) => (
                    <div
                      key={stat.label}
                      className="px-3 py-5 text-center sm:px-4"
                    >
                      <p className="font-display text-[26px] font-semibold leading-none tracking-[-0.04em] text-[#405526] sm:text-[34px]">
                        {stat.value}
                      </p>

                      <p className="mt-2 text-[10px] text-[#6f6658] sm:text-[11px]">
                        {stat.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="border-b border-[#e8dfd1] bg-[#fbf8f1]">
        <div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-14 sm:px-7 md:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:px-12 lg:py-16">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#405526]">
              Our Story
            </p>

            <h2 className="mt-3 font-display text-[36px] font-medium leading-[1.02] tracking-[-0.045em] text-[#332519] sm:text-[48px]">
              We started with the food Indian homes use every day.
            </h2>
          </div>

          <div>
            <p className="text-[15px] leading-8 text-[#4f463c]">
              Instead of chasing fancy food trends, Green Valley Naturals focuses
              on the basics: flour, rice, pulses, grains and pantry staples that
              families trust daily. Our goal is to make these essentials feel
              more transparent, cleaner and more reliable.
            </p>

            <p className="mt-5 text-[15px] leading-8 text-[#4f463c]">
              We believe premium does not mean complicated. Premium means honest
              sourcing, careful packing, clean design and products that feel
              right in an Indian kitchen.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-[#fffdf8]">
        <div className="mx-auto max-w-[1440px] px-5 py-14 sm:px-7 md:px-8 lg:px-12 lg:py-16">
          <div className="mx-auto max-w-[720px] text-center">
            <Leaf
              className="mx-auto h-5 w-5 text-[#405526]"
              strokeWidth={1.5}
            />

            <h2 className="mt-3 font-display text-[36px] font-medium leading-none tracking-[-0.045em] text-[#332519] sm:text-[48px]">
              What we stand for
            </h2>

            <p className="mt-4 text-[14px] leading-7 text-[#5f5648]">
              Our values are simple because the best food brands do not need to
              over-explain themselves.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {values.map((item) => (
              <ValueCard key={item.title} {...item} />
            ))}
          </div>
        </div>
      </section>

      {/* Belief Strip */}
      <section className="border-y border-[#e8dfd1] bg-[#203a19]">
        <div className="mx-auto max-w-[1440px] px-5 py-14 text-center sm:px-7 md:px-8 lg:px-12 lg:py-16">
          <HeartHandshake
            className="mx-auto h-8 w-8 text-[#d7b760]"
            strokeWidth={1.45}
          />

          <p className="mx-auto mt-7 max-w-[900px] font-display text-[34px] font-medium leading-[1.14] tracking-[-0.045em] text-[#fff4dc] sm:text-[48px]">
            “We are not trying to make food complicated. We are trying to make
            everyday food more honest.”
          </p>

          <p className="mt-6 text-[14px] text-[#c7c0b1]">
            — Team Green Valley Naturals
          </p>

          <Link
            href="/collection"
            className="mt-8 inline-flex h-11 items-center gap-2 rounded-[6px] bg-[#d7b760] px-6 text-sm font-semibold text-[#203a19] transition-opacity hover:opacity-90"
          >
            Explore Products
            <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
          </Link>
        </div>
      </section>

      {/* Process */}
      <section className="border-b border-[#e8dfd1] bg-[#fbf8f1]">
        <div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-14 sm:px-7 md:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:px-12 lg:py-16">
          <div className="lg:sticky lg:top-8 lg:self-start">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#405526]">
              Our Process
            </p>

            <h2 className="mt-3 font-display text-[36px] font-medium leading-[1.02] tracking-[-0.045em] text-[#332519] sm:text-[48px]">
              Simple steps.
              <span className="block italic text-[#405526]">
                Better staples.
              </span>
            </h2>

            <p className="mt-5 max-w-[480px] text-[14px] leading-7 text-[#5f5648]">
              We keep the journey straightforward, from sourcing to careful
              packing and delivery.
            </p>
          </div>

          <div className="space-y-3">
            {processSteps.map((step) => (
              <ProcessStep key={step.number} {...step} />
            ))}
          </div>
        </div>
      </section>

      {/* Promise */}
      <section className="bg-[#fffdf8]">
        <div className="mx-auto max-w-[1440px] px-5 py-12 sm:px-7 md:px-8 lg:px-12">
          <div className="grid gap-4 sm:grid-cols-3">
            {promiseItems.map((item) => (
              <PromiseItem key={item.title} {...item} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-[#e8dfd1] bg-[#fbf8f1]">
        <div className="mx-auto max-w-[1440px] px-5 py-14 text-center sm:px-7 md:px-8 lg:px-12 lg:py-16">
          <PackageCheck
            className="mx-auto h-8 w-8 text-[#405526]"
            strokeWidth={1.45}
          />

          <h2 className="mx-auto mt-5 max-w-[700px] font-display text-[36px] font-medium leading-[1.05] tracking-[-0.045em] text-[#332519] sm:text-[48px]">
            Bring honest pantry staples into your kitchen.
          </h2>

          <p className="mx-auto mt-4 max-w-[520px] text-[14px] leading-7 text-[#5f5648]">
            Explore naturally sourced atta, rice, pulses, grains and everyday
            essentials.
          </p>

          <Link
            href="/collection"
            className="mt-8 inline-flex h-11 items-center justify-center rounded-[6px] bg-[#405526] px-7 text-sm font-semibold text-white transition-colors hover:bg-[#30421e]"
          >
            Shop Now
          </Link>
        </div>
      </section>
    </main>
  );
}

function ValueCard({ icon: Icon, title, text }) {
  return (
    <article className="rounded-[16px] border border-[#e8dfd1] bg-[#fffdf8] p-6 transition-colors hover:border-[#c9b99c]">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f4eddf] text-[#405526]">
        <Icon className="h-5 w-5" strokeWidth={1.55} />
      </div>

      <h3 className="mt-5 text-[17px] font-semibold text-[#332519]">
        {title}
      </h3>

      <p className="mt-3 text-[13px] leading-6 text-[#5f5648]">{text}</p>
    </article>
  );
}

function ProcessStep({ number, title, text }) {
  return (
    <article className="grid gap-4 rounded-[16px] border border-[#e8dfd1] bg-[#fffdf8] p-5 sm:grid-cols-[80px_1fr] sm:p-6">
      <p className="font-display text-[34px] font-semibold leading-none tracking-[-0.04em] text-[#d7b760]">
        {number}
      </p>

      <div>
        <h3 className="text-[18px] font-semibold text-[#332519]">{title}</h3>
        <p className="mt-2 text-[13px] leading-6 text-[#5f5648]">{text}</p>
      </div>
    </article>
  );
}

function PromiseItem({ icon: Icon, title, text }) {
  return (
    <div className="flex items-start gap-4 rounded-[14px] border border-[#e8dfd1] bg-[#fffdf8] p-5">
      <Icon
        className="mt-0.5 h-5 w-5 shrink-0 text-[#405526]"
        strokeWidth={1.6}
      />

      <div>
        <h3 className="text-[14px] font-semibold text-[#332519]">{title}</h3>
        <p className="mt-1 text-[13px] leading-6 text-[#5f5648]">{text}</p>
      </div>
    </div>
  );
}