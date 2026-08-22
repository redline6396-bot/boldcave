import Link from "next/link";
import { ChevronDown } from "lucide-react";
import {
  FaFacebook,
  FaInstagram,
  FaYoutube,
} from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";

const brandName = "BOLD CΛVE";

/*
  Long, soft directional white shadow inspired by the AE reference.
  Important: font weight / boldness is unchanged.
*/
const brandTextShadow = `
  0 1px 0 rgba(255,255,255,0.24),
  0 6px 10px rgba(255,255,255,0.12),
  6px 14px 18px rgba(255,255,255,0.09),
  14px 24px 28px rgba(255,255,255,0.06)
`;
const footerColumns = [
  {
    title: "SHOP",
    links: [
      { label: "Shop All", href: "/collection" },
      { label: "Men", href: "/collection?category=Men" },
      { label: "Women", href: "/collection?category=Women" },
      { label: "Unisex", href: "/collection?category=Unisex" },
    ],
  },
  {
    title: "HELP",
    links: [
      { label: "Track Order", href: "/orders" },
      { label: "My Orders", href: "/orders" },
      { label: "Contact Us", href: "/contact" },
    ],
  },
  {
    title: "LEGAL",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms & Conditions", href: "/terms" },
      { label: "Shipping & Delivery", href: "/shipping" },
      { label: "Cancellation, Returns & Refunds", href: "/returns" },
    ],
  },
];

const socialLinks = [
  {
    label: "X",
    href: null,
    Icon: FaXTwitter,
    className: "h-[19px] w-[19px]",
  },
  {
    label: "Facebook",
    href: null,
    Icon: FaFacebook,
    className: "h-[21px] w-[21px]",
  },
  {
    label: "Instagram",
    href: null,
    Icon: FaInstagram,
    className: "h-[20px] w-[20px]",
  },
  {
    label: "YouTube",
    href: null,
    Icon: FaYoutube,
    className: "h-[22px] w-[22px]",
  },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-[#202020] bg-black text-white">
      <div className="mx-auto max-w-[1360px] px-5 pt-10 md:px-10 md:pt-14 lg:px-10 lg:pt-10">
        {/* BRAND */}
        <div className="pb-9 text-center md:pb-12 lg:pb-14">
          <Link
            href="/"
            className="inline-flex flex-col items-center gap-3 text-[28px] font-bold uppercase leading-none tracking-[0.12em] text-white md:text-[44px] lg:text-[52px]"
            style={{
              textShadow: brandTextShadow,
              transform: "scaleX(1.08)",
              transformOrigin: "center",
            }}
          >
            BOLD CΛVE
          </Link>

          <img
            src="/images/brand/bold-cave-icon.png"
            alt=""
            className="mx-auto mt-3 h-9 w-auto object-contain drop-shadow-[0_0_12px_rgba(255,255,255,0.22)] md:h-11 lg:h-12"
          />
        </div>

        {/* MOBILE */}
        <div className="md:hidden">
          {footerColumns.map((column) => (
            <FooterAccordion
              key={column.title}
              title={column.title}
              links={column.links}
            />
          ))}

          <div className="border-b border-[#242424] py-6">
            <h3 className="text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-white">
              FOLLOW US
            </h3>

            <div className="mx-auto mt-5 flex max-w-[270px] items-center justify-between">
              {socialLinks.map(({ label, href, Icon, className }) => (
                <SocialIcon
                  key={label}
                  href={href}
                  label={label}
                  Icon={Icon}
                  iconClassName={className}
                />
              ))}
            </div>
          </div>
        </div>

        {/* DESKTOP */}
        <div className="hidden grid-cols-[0.9fr_0.9fr_0.9fr_1.12fr] gap-x-12 pb-12 md:grid lg:gap-x-20 lg:pb-14">
          <div>
            <h3 className="inline-block border-b border-white pb-1 text-[14px] font-semibold uppercase leading-none tracking-[0.14em] text-white lg:text-[15px]">
              FOLLOW US
            </h3>

            <div className="mt-6 flex items-center gap-8">
              {socialLinks.map(({ label, href, Icon, className }) => (
                <SocialIcon
                  key={label}
                  href={href}
                  label={label}
                  Icon={Icon}
                  iconClassName={className}
                />
              ))}
            </div>
          </div>

          {footerColumns.map((column) => (
            <FooterColumn
              key={column.title}
              title={column.title}
              links={column.links}
            />
          ))}
        </div>

        {/* COPYRIGHT */}
        <div className="border-t border-[#242424] py-5 text-center md:py-6">
          <p className="text-[9px] font-normal leading-5 text-white/80 md:text-[10px]">
            &copy; {year} {brandName}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }) {
  return (
    <nav aria-label={title}>
      <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white md:inline-block md:border-b md:border-white md:pb-1 md:text-[14px] md:leading-none md:tracking-[0.14em] lg:text-[15px]">
        {title}
      </h3>

      <ul className="mt-4 space-y-3 md:mt-5 md:space-y-3">
        {links.map((link) => (
          <li key={link.label}>
            <FooterLink href={link.href}>{link.label}</FooterLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function FooterAccordion({ title, links }) {
  return (
    <details className="group border-b border-[#242424] py-5">
      <summary className="flex cursor-pointer list-none items-center justify-between text-[12px] font-semibold uppercase tracking-[0.18em] text-white [&::-webkit-details-marker]:hidden">
        <span>{title}</span>

        <ChevronDown
          className="h-4 w-4 text-white transition-transform duration-200 group-open:rotate-180"
          strokeWidth={1.8}
        />
      </summary>

      <ul className="mt-5 space-y-0 border-l border-white/15 pl-4 pb-1">
        {links.map((link) => (
          <li key={link.label} className="py-2">
            <FooterLink href={link.href}>{link.label}</FooterLink>
          </li>
        ))}
      </ul>
    </details>
  );
}

function FooterLink({ href, children }) {
  const className =
    "inline-block max-w-full break-words text-[11px] leading-6 text-white transition-[text-decoration-color] duration-200 hover:text-white hover:underline hover:underline-offset-4 md:text-[14px] md:font-normal md:leading-[1.4] lg:text-[15px]";

  if (!href) {
    return <span className={className}>{children}</span>;
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

function SocialIcon({
  href,
  label,
  Icon,
  iconClassName,
}) {
  const className =
    "inline-flex cursor-pointer items-center justify-center text-white transition-transform duration-200 hover:scale-[1.06]";

  if (!href) {
    return (
      <span aria-label={label} className={className}>
        <Icon className={iconClassName} />
      </span>
    );
  }

  return (
    <a href={href} aria-label={label} className={className}>
      <Icon className={iconClassName} />
    </a>
  );
}
