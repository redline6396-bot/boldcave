import Image from "next/image";
import Link from "next/link";
import { Leaf, Sprout, Wheat } from "lucide-react";

export default function Hero() {
  return (
    <section className="w-full bg-[#fbf7ef] font-body">
      {/* =========================
          LARGE DESKTOP HERO
          Image works best as background here:
          left blank space = text area
          right side = products
      ========================== */}
      <div className="relative hidden min-h-[520px] w-full lg:block xl:min-h-[570px]">
        <Image
          src="/images/hero-image3.png"
          alt="Green Valley Naturals basmati rice, makka atta and whole wheat atta"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[67%_center] xl:object-center"
        />

        {/* Soft fade only behind copy, not across full product area */}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(251,247,239,1)_0%,rgba(251,247,239,0.98)_26%,rgba(251,247,239,0.86)_36%,rgba(251,247,239,0.35)_48%,rgba(251,247,239,0)_61%)]" />

        <div className="relative z-10 mx-auto flex min-h-[520px] max-w-[1440px] items-center px-12 xl:min-h-[570px] xl:px-20">
          <div className="w-[470px] xl:w-[530px]">
            <Eyebrow />

            <h1 className="font-display text-[64px] font-semibold leading-[0.93] tracking-[-0.055em] text-[#392719] xl:text-[74px]">
              Natural grains.
              <span className="mt-1 block text-[#43552d]">
                India&apos;s taste.
              </span>
            </h1>

            <p className="mt-6 max-w-[420px] text-[16px] leading-[1.75] text-[#5c5143]">
              From everyday flours to fragrant rice and nourishing grains,
              bring home simple food you can trust.
            </p>

            <div className="mt-8 flex items-center gap-4">
              <PrimaryButton />
              <SecondaryButton fullLabel />
            </div>

            <div className="mt-9 flex items-center gap-6 text-[13px] font-medium text-[#4d493b]">
              <TrustPoint icon={Leaf} label="No additives" />
              <Divider />
              <TrustPoint icon={Sprout} label="Farm sourced" />
              <Divider />
              <TrustPoint icon={Wheat} label="Everyday essentials" />
            </div>
          </div>
        </div>
      </div>

      {/* =========================
          MOBILE + TABLET HERO
          Keep content above image.
          Do not force desktop overlay before lg.
      ========================== */}
      <div className="lg:hidden">
        <div className="mx-auto w-full max-w-[760px] px-5 pb-6 pt-6 sm:px-8 sm:pb-9 sm:pt-9 md:px-10 md:pb-10 md:pt-10">
          <Eyebrow />

          <h1 className="font-display text-[38px] font-semibold leading-[1.0] tracking-[-0.055em] text-[#392719] min-[390px]:text-[42px] sm:text-[58px] md:text-[64px]">
            Natural grains.
            <span className="mt-1 block text-[#43552d]">
              India&apos;s taste.
            </span>
          </h1>

          <p className="mt-4 text-center text-[14px] leading-[1.6] text-[#5c5143] sm:mt-6 sm:text-left sm:text-[16px] sm:leading-[1.65] md:text-[17px]">
            From everyday flours to fragrant rice and nourishing grains, bring
            home simple food you can trust.
          </p>

          <div className="mt-6 flex w-full gap-3 sm:mt-8 sm:max-w-[470px]">
            <PrimaryButton />
            <SecondaryButton />
          </div>
        </div>

        {/* 
          Phone: slightly right-weighted crop to show products properly.
          Tablet: wider frame lets the full visual breathe.
        */}
        <div className="relative h-[215px] w-full border-y border-[#e7dcc9] bg-[#eee3d0] min-[390px]:h-[232px] sm:h-[285px] md:h-[335px]">
          <Image
            src="/images/hero-image4.png"
            alt="Green Valley Naturals product range"
            fill
            priority
            sizes="(max-width: 1023px) 100vw, 0px"
            className="object-cover object-center"
          />
        </div>

        <div className="border-b border-[#eee5d7] bg-[#fcf8f1]">
          <div className="mx-auto flex max-w-[760px] flex-wrap items-center justify-center gap-3 px-5 py-4 text-[#4d493b] sm:gap-6 sm:px-8 sm:py-5">
            <TrustPoint icon={Leaf} label="No additives" />
            <TrustPoint icon={Sprout} label="Farm sourced" />
            <TrustPoint icon={Wheat} label="Everyday essentials" />
          </div>
        </div>
      </div>
    </section>
  );
}

function Eyebrow() {
  return (
    <p className="mb-4 flex items-center gap-3 text-[10px] font-medium uppercase tracking-[0.28em] text-[#667349] sm:mb-5 sm:text-[11px] lg:text-[13px]">
      <span className="h-px w-6 bg-[#b68a41] sm:w-8" />
      Green Valley Naturals
    </p>
  );
}

function PrimaryButton() {
  return (
    <Link
      href="/collection"
      className="inline-flex h-12 flex-1 items-center justify-center rounded-[6px] bg-[#415527] px-4 text-[13px] font-medium text-white transition-colors duration-200 hover:bg-[#31421e] sm:h-[56px] sm:px-9 sm:text-[15px] lg:flex-none"
    >
      Shop Staples
    </Link>
  );
}

function SecondaryButton({ fullLabel = false }) {
  return (
    <Link
      href="/collection"
      className="inline-flex h-12 flex-1 items-center justify-center rounded-[6px] border border-[#968560] bg-transparent px-4 text-[13px] font-medium text-[#4d432f] transition-colors duration-200 hover:bg-[#f1e8d8] sm:h-[56px] sm:px-8 sm:text-[15px] lg:flex-none"
    >
      {fullLabel ? "Explore Collection" : "Explore"}
    </Link>
  );
}

function TrustPoint({ icon: Icon, label }) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#b8a77d] text-[#56673e] sm:h-9 sm:w-9">
        <Icon className="h-4 w-4" strokeWidth={1.6} />
      </span>

      <span className="whitespace-nowrap text-[12px] font-medium sm:text-[13px]">
        {label}
      </span>
    </div>
  );
}

function Divider() {
  return <span className="h-8 w-px bg-[#d8cdb9]" />;
}