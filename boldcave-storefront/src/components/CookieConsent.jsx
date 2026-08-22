"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { X } from "lucide-react";

const STORAGE_KEY = "boldcave_cookie_consent";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(localStorage.getItem(STORAGE_KEY) !== "accepted");
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "accepted");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[80] w-[260px] max-w-[calc(100vw-32px)] border border-neutral-200 bg-white px-4 py-3.5 shadow-[0_6px_20px_rgba(0,0,0,0.08)]">
      <button
        type="button"
        onClick={dismiss}
        aria-label="Close cookie notice"
        className="absolute right-2.5 top-2.5 flex h-5 w-5 cursor-pointer items-center justify-center text-neutral-500 transition-opacity hover:opacity-60"
      >
        <X className="h-3.5 w-3.5" strokeWidth={1.5} />
      </button>

      <p className="pr-5 text-[10.5px] leading-[1.55] text-neutral-700">
        We use cookies to improve your shopping experience and keep essential
        site features working. See our{" "}
        <Link
          href="/privacy"
          className="cursor-pointer font-medium text-neutral-950 underline underline-offset-3"
        >
          Privacy Policy
        </Link>
        .
      </p>

      <button
        type="button"
        onClick={dismiss}
        className="mt-3 h-[31px] cursor-pointer border border-neutral-950 bg-neutral-950 px-4 text-[9px] font-semibold uppercase tracking-[0.1em] text-white transition-colors hover:bg-white hover:text-neutral-950"
      >
        Got It
      </button>
    </div>
  );
}