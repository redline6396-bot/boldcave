"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Facebook,
  Instagram,
  Youtube,
  Mail,
  Phone,
  Clock,
} from "lucide-react";

const shopLinks = [
  { label: "Atta & Flours", href: "/collection?category=Atta" },
  { label: "Rice", href: "/collection?category=Grains" },
  { label: "Pulses", href: "/collection?category=Pulses" },
  { label: "Millets", href: "/collection?category=Millets" },
  { label: "Makka", href: "/collection?category=Makka" },
];

const helpLinks = [
  { label: "Shipping & Delivery", href: "/terms" },
  { label: "Returns & Refunds", href: "/terms" },
  { label: "Payment Options", href: "/terms" },
  { label: "My Orders", href: "/orders" },
  { label: "Contact Us", href: "/contact" },
];

const aboutLinks = [
  { label: "Our Story", href: "/about" },
  { label: "Why Choose Us", href: "/about" },
];

const policyLinks = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms & Conditions", href: "/terms" },
  { label: "Refund Policy", href: "/terms" },
];

export default function Footer() {
  return (
    <footer className="w-full bg-[#263f1e] text-[#d8d2c4]">
      <div className="mx-auto max-w-[1440px] px-5 py-8 sm:px-7 md:px-8 lg:px-12 lg:py-9">
        <div className="grid gap-9 grid-cols-2 lg:grid-cols-[1.4fr_0.7fr_0.9fr_0.9fr_0.9fr_1.15fr] lg:gap-10">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-1">
            <Link href="/" className="inline-flex items-center gap-3">
              <Image
                src="/images/logo-design.png"
                alt="Green Valley Naturals"
                width={62}
                height={62}
                className="h-12 w-12 object-contain"
              />

              <div className="leading-none">
                <p className="font-display text-[28px] font-medium leading-[0.9] tracking-[-0.04em] text-[#f3e8d2]">
                  Green Valley
                </p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.38em] text-[#d7b760]">
                  Naturals
                </p>
              </div>
            </Link>

            <p className="mt-5 max-w-[270px] text-[13px] leading-6 text-[#c7c0b1]">
              Wholesome staples, honestly sourced from Indian farms to your
              family table.
            </p>

            <div className="mt-5 flex items-center gap-3">
              <SocialLink href="#" label="Instagram" icon={Instagram} />
              <SocialLink href="#" label="Facebook" icon={Facebook} />
              <SocialLink href="#" label="YouTube" icon={Youtube} />
            </div>
          </div>

          {/* Shop */}
          <FooterColumn title="Shop" links={shopLinks} />

          {/* Help */}
          <FooterColumn title="Help" links={helpLinks} />

          {/* About */}
          <FooterColumn title="About" links={aboutLinks} />

          {/* Policies */}
          <FooterColumn title="Policies" links={policyLinks} />

          {/* Contact */}
          <div>
            <h3 className="mb-4 text-[14px] font-semibold text-[#fff4dc]">
              Contact
            </h3>

            <ul className="space-y-3">
              <ContactItem
                icon={Mail}
                text="hello@greenvalleynaturals.com"
                href="mailto:hello@greenvalleynaturals.com"
              />

              <ContactItem
                icon={Phone}
                text="+91 98765 43210"
                href="tel:+919876543210"
              />

              <ContactItem icon={Clock} text="Mon - Sat: 9am to 7pm" />
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 border-t border-[#48613d] pt-5">
          <div className="flex flex-col gap-3 text-[12px] text-[#aaa394] sm:flex-row sm:items-center sm:justify-between">
            <p>© 2026 Green Valley Naturals. All rights reserved.</p>

            <div className="flex flex-wrap gap-x-5 gap-y-2">
              <Link
                href="/privacy"
                className="transition-colors hover:text-[#d7b760]"
              >
                Privacy Policy
              </Link>

              <Link
                href="/terms"
                className="transition-colors hover:text-[#d7b760]"
              >
                Terms
              </Link>

              <Link
                href="/terms"
                className="transition-colors hover:text-[#d7b760]"
              >
                Refund Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }) {
  return (
    <div>
      <h3 className="mb-4 text-[14px] font-semibold text-[#fff4dc]">
        {title}
      </h3>

      <ul className="space-y-2.5">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              href={link.href}
              className="text-[13px] leading-none text-[#c7c0b1] transition-colors hover:text-[#d7b760]"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ContactItem({ icon: Icon, text, href }) {
  const content = (
    <span className="flex items-start gap-2.5 text-[13px] leading-5 text-[#c7c0b1] transition-colors hover:text-[#d7b760]">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#d7b760]" strokeWidth={1.7} />
      <span>{text}</span>
    </span>
  );

  if (href) {
    return <li><a href={href}>{content}</a></li>;
  }

  return <li>{content}</li>;
}

function SocialLink({ href, label, icon: Icon }) {
  return (
    <a
      href={href}
      aria-label={label}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-[#607653] text-[#efe4cd] transition-colors hover:border-[#d7b760] hover:bg-[#d7b760] hover:text-[#263f1e]"
    >
      <Icon className="h-4 w-4" strokeWidth={1.8} />
    </a>
  );
}
