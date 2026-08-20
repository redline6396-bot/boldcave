"use client";

import { useEffect, useState } from "react";
import { BadgePercent } from "lucide-react";
import { useCoupon } from "@/context/CouponContext";

const money = (value) =>
  `₹${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)}`;

export default function CouponSection({ disabled = false }) {
  const {
    couponCode,
    setCouponCode,
    appliedCoupon,
    discount,
    validating,
    error,
    message,
    applyCoupon,
    removeCoupon,
  } = useCoupon();

  const [showLocalFeedback, setShowLocalFeedback] = useState(false);
  const applied = Boolean(appliedCoupon?.code);

  useEffect(() => {
    if (!showLocalFeedback) return undefined;

    const timer = window.setTimeout(() => {
      setShowLocalFeedback(false);
    }, 4500);

    return () => window.clearTimeout(timer);
  }, [showLocalFeedback, error, message]);

  const handleCouponAction = async () => {
    if (applied) {
      setShowLocalFeedback(false);
      removeCoupon();
      return;
    }

    setShowLocalFeedback(true);
    await applyCoupon();
  };

  return (
    <section>
      <div className="flex h-12 min-w-0 overflow-hidden rounded-[10px] border border-[#d2d0d0] bg-white transition-[border-color,box-shadow] focus-within:border-[#111b28] focus-within:shadow-[0_0_0_2px_rgba(0,0,0,0.04)]">
        <div className="flex w-[58px] shrink-0 items-center justify-center border-r border-[#d3d9e1] bg-white">
          <BadgePercent
            className="h-[21px] w-[21px] text-[#304b67]"
            strokeWidth={1.7}
          />
        </div>

        <input
          value={couponCode}
          readOnly={applied}
          onChange={(event) => {
            setShowLocalFeedback(false);
            setCouponCode(event.target.value.toUpperCase());
          }}
          placeholder="Enter coupon code"
          disabled={disabled}
          className="min-w-0 flex-1 bg-white px-3.5 text-[13px] text-[#182231] outline-none placeholder:text-[#8a939d] disabled:cursor-not-allowed disabled:bg-[#fafafa]"
        />

        <button
          type="button"
          onClick={handleCouponAction}
          disabled={disabled || validating}
          className={[
            "min-w-[96px] shrink-0 border-l px-4 text-[11px] font-semibold disabled:cursor-not-allowed disabled:opacity-35",
            applied
              ? "cursor-pointer border-[#d3d9e1] bg-white text-[#4b5563]"
              : "cursor-pointer border-black bg-black text-white transition-opacity duration-150 hover:opacity-90",
          ].join(" ")}
        >
          {validating ? "Checking" : applied ? "Remove" : "Apply"}
        </button>
      </div>

      {applied && discount > 0 && (
        <p className="mt-2 pl-[58px] text-[11px] font-medium text-[#176b37]">
          You saved {money(discount)}
        </p>
      )}

      {showLocalFeedback && (error || (!applied && message)) && (
        <p
          className={[
            "mt-2 pl-[58px] text-[11px] leading-4",
            error ? "text-red-600" : "text-[#66717e]",
          ].join(" ")}
        >
          {error || message}
        </p>
      )}
    </section>
  );
}
