import Link from "next/link";
import {
  FaFacebook,
  FaInstagram,
  FaYoutube,
} from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";

const brandName = "BRAND";

const brandTextShadow =
  "0 14px 22px rgba(0, 0, 0, 0.22)";

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
      { label: "Orders & Shipping", href: null },
      { label: "Cancellation & Refund Policy", href: null },
    ],
  },
];

const socialLinks = [
  { label: "X", href: null, Icon: FaXTwitter, className: "h-[19px] w-[19px]" },
  { label: "Facebook", href: null, Icon: FaFacebook, className: "h-[21px] w-[21px]" },
  { label: "Instagram", href: null, Icon: FaInstagram, className: "h-[20px] w-[20px]" },
  { label: "YouTube", href: null, Icon: FaYoutube, className: "h-[22px] w-[22px]" },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-[#e8e8e8] bg-white text-black">
      <div className="mx-auto max-w-[1360px] px-5 pt-10 md:px-10 md:pt-14 lg:px-10 lg:pt-16">
        <div className="pb-9 text-center md:pb-14 lg:pb-16">
          <Link
            href="/"
            className="inline-block text-[28px] font-semibold uppercase leading-none tracking-[0.2em] text-black md:text-[56px] lg:text-[78px]"
            style={{ textShadow: brandTextShadow }}
          >
            {brandName}
          </Link>
        </div>

        <div className="md:hidden">
          {footerColumns.map((column) => (
            <FooterAccordion key={column.title} title={column.title} links={column.links} />
          ))}

          <div className="border-b border-[#ececec] py-6">
            <h3 className="text-center text-[9px] font-semibold uppercase tracking-[0.2em] text-black">
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

        <div className="hidden grid-cols-[0.9fr_0.9fr_0.9fr_1.12fr] gap-x-12 pb-14 md:grid lg:gap-x-20">
          <div>
            <h3 className="inline-block border-b border-black pb-1 text-[14px] font-semibold uppercase leading-none tracking-[0.12em] text-black">
              FOLLOW US
            </h3>
            <div className="mt-7 flex items-center gap-8">
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
            <FooterColumn key={column.title} title={column.title} links={column.links} />
          ))}
        </div>

        <div className="border-t border-[#e8e8e8] py-5 text-center md:py-6">
          <p className="text-[9px] leading-5 font-normal text-[#777]">
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
      <h3 className="text-[9px] font-semibold uppercase tracking-[0.2em] text-black md:inline-block md:border-b md:border-black md:pb-1 md:text-[14px] md:leading-none md:tracking-[0.12em]">
        {title}
      </h3>
      <ul className="mt-4 space-y-3 md:mt-4 md:space-y-1.5">
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
    <details className="group border-b border-[#ececec] py-5">
      <summary className="flex cursor-pointer list-none items-center justify-between text-[11px] font-semibold uppercase tracking-[0.18em] text-black [&::-webkit-details-marker]:hidden">
        <span>{title}</span>
        <span className="text-[19px] font-light leading-none transition-transform duration-200 group-open:rotate-45">
          +
        </span>
      </summary>
      <ul className="mt-4 space-y-3.5">
        {links.map((link) => (
          <li key={link.label}>
            <FooterLink href={link.href}>{link.label}</FooterLink>
          </li>
        ))}
      </ul>
    </details>
  );
}

function FooterLink({ href, children }) {
  const className =
    "inline-block max-w-full break-words text-[11px] leading-6 text-[#555] transition-colors duration-200 hover:text-black hover:underline hover:underline-offset-4 md:text-[17px] md:font-medium md:leading-[1.08]";

  if (!href) {
    return <span className={className}>{children}</span>;
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

function SocialIcon({ href, label, Icon, iconClassName }) {
  const className =
    "inline-flex items-center justify-center text-black transition duration-200 hover:scale-[1.04] hover:opacity-70";

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
