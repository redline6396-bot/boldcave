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
      <div className="flex h-11 min-w-0 overflow-hidden rounded-[10px] border border-[#d2d0d0] bg-white transition-[border-color,box-shadow] focus-within:border-[#111b28] focus-within:shadow-[0_0_0_2px_rgba(0,0,0,0.04)] sm:h-12">
        <div className="flex w-[46px] shrink-0 items-center justify-center border-r border-[#d3d9e1] bg-white sm:w-[58px]">
          <BadgePercent
            className="h-[18px] w-[18px] text-[#111b28] sm:h-[21px] sm:w-[21px]"
            strokeWidth={1.85}
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
          className="min-w-0 flex-1 bg-white px-3 text-[12px] text-[#182231] outline-none placeholder:text-[#8a939d] disabled:cursor-not-allowed disabled:bg-[#fafafa] sm:px-3.5 sm:text-[13px]"
        />

        <button
          type="button"
          onClick={handleCouponAction}
          disabled={disabled || validating}
          className={[
            "min-w-[82px] shrink-0 border-l px-3 text-[10.5px] font-semibold disabled:cursor-not-allowed disabled:opacity-35 sm:min-w-[96px] sm:px-4 sm:text-[11px]",
            applied
              ? "cursor-pointer border-[#d3d9e1] bg-white text-[#4b5563]"
              : "cursor-pointer border-black bg-black text-white transition-opacity duration-150 hover:opacity-90",
          ].join(" ")}
        >
          {validating ? "Checking" : applied ? "Remove" : "Apply"}
        </button>
      </div>

      {applied && discount > 0 && (
        <p className="mt-1.5 pl-[46px] text-[10.5px] font-medium text-[#176b37] sm:mt-2 sm:pl-[58px] sm:text-[11px]">
          You saved {money(discount)}
        </p>
      )}

      {showLocalFeedback && (error || (!applied && message)) && (
        <p
          className={[
            "mt-1.5 pl-[46px] text-[10.5px] leading-4 sm:mt-2 sm:pl-[58px] sm:text-[11px]",
            error ? "text-red-600" : "text-[#66717e]",
          ].join(" ")}
        >
          {error || message}
        </p>
      )}
    </section>
  );
}
