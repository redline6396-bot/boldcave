import Link from "next/link";
import { ChevronDown } from "lucide-react";
import {
  FaFacebook,
  FaInstagram,
  FaYoutube,
} from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";

const brandName = "BOLD CΛVE";

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
      { label: "Track Order", href: "/profile?section=orders" },
      { label: "My Orders", href: "/profile?section=orders" },
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
    href: "https://x.com/boldcave",
    Icon: FaXTwitter,
    className: "h-[19px] w-[19px]",
  },
  {
    label: "Facebook",
    href: "https://www.facebook.com/profile.php?id=61593546664572",
    Icon: FaFacebook,
    className: "h-[21px] w-[21px]",
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/bold_cave/",
    Icon: FaInstagram,
    className: "h-[20px] w-[20px]",
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com/@BoldCave",
    Icon: FaYoutube,
    className: "h-[22px] w-[22px]",
  },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-[#202020] bg-black text-white">
      <div className="mx-auto max-w-[1360px] px-5 pt-4 md:px-10 md:pt-5 lg:px-10 lg:pt-4">
        {/* BRAND */}
        <div className="pb-2 text-center md:pb-4 lg:pb-5">
          <Link
            href="/"
            aria-label="Bold Cave home"
            className="inline-flex h-[92px] w-[92px] max-w-full items-center justify-center overflow-hidden sm:h-[104px] sm:w-[104px] md:h-[118px] md:w-[118px] lg:h-[126px] lg:w-[126px]"
          >
            <img
              src="/images/brand/bold-cave-icon.png"
              alt="Bold Cave"
              className="block h-full w-full object-contain"
            />
          </Link>
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
    <a
      href={href}
      aria-label={label}
      className={className}
      target="_blank"
      rel="noopener noreferrer"
    >
      <Icon className={iconClassName} />
    </a>
  );
}
