"use client";

import { useEffect, useState } from "react";
import { BadgePercent, CheckCircle2 } from "lucide-react";
import { useCoupon } from "@/context/CouponContext";
import { fetchEligibleCoupons } from "@/lib/clientApi";

const money = (value) =>
  `₹${new Intl.NumberFormat("en-IN", {
    minimumFractionDigits:
      Math.round((Number(value) || 0) * 100) % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)}`;

export default function CouponSection({
  disabled = false,
  paymentMethod = "cod",
  subtotal = 0,
  showEligibleOffers = false,
}) {
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
  const [eligibleCoupons, setEligibleCoupons] = useState([]);
  const applied = Boolean(appliedCoupon?.code);

  useEffect(() => {
    if (!showLocalFeedback) return undefined;

    const timer = window.setTimeout(() => {
      setShowLocalFeedback(false);
    }, 4500);

    return () => window.clearTimeout(timer);
  }, [showLocalFeedback, error, message]);

  useEffect(() => {
    let active = true;

    if (!showEligibleOffers || disabled) {
      setEligibleCoupons([]);
      return () => {
        active = false;
      };
    }

    fetchEligibleCoupons({ subtotal })
      .then((coupons) => {
        if (active) setEligibleCoupons(coupons);
      })
      .catch(() => {
        if (active) setEligibleCoupons([]);
      });

    return () => {
      active = false;
    };
  }, [disabled, showEligibleOffers, subtotal]);

  const handleCouponAction = async () => {
    if (applied) {
      setShowLocalFeedback(false);
      removeCoupon();
      return;
    }

    setShowLocalFeedback(true);
    await applyCoupon(undefined, { paymentMethod });
  };

  const handleApplyEligibleCoupon = async (code) => {
    if (!code || disabled || validating) return;
    setShowLocalFeedback(true);
    await applyCoupon(code, { paymentMethod });
  };

  return (
    <section>
      {showEligibleOffers && eligibleCoupons.length > 0 && !applied && (
        <div className="mb-2 rounded-[10px] border border-[#e0e4e8] bg-white px-3 py-2">
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[#364354]">
              Offers available for you
            </p>
          </div>

          <div className="grid gap-1.5">
            {eligibleCoupons.slice(0, 3).map((coupon) => (
              <button
                key={coupon.id || coupon.code}
                type="button"
                onClick={() => handleApplyEligibleCoupon(coupon.code)}
                disabled={disabled || validating}
                className="flex min-h-[36px] cursor-pointer items-center justify-between gap-3 rounded-[8px] border border-[#e7eaee] bg-[#fafafa] px-2.5 py-2 text-left transition-colors hover:border-[#cfd6de] hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[11px] font-semibold tracking-[0.04em] text-[#111b28]">
                    {coupon.code}
                  </span>
                  <span className="mt-0.5 block text-[10px] text-[#687483]">
                    Save {money(coupon.discount)}
                  </span>
                </span>
                <span className="shrink-0 text-[10px] font-semibold text-[#111b28] underline underline-offset-4">
                  Apply
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

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
        <div className="mt-2 rounded-[9px] border border-[#cde7d4] bg-[#f4fbf6] px-3 py-2">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex min-w-0 items-center gap-1.5 text-[11px] font-semibold text-[#163f27]">
              <CheckCircle2
                className="h-3.5 w-3.5 shrink-0"
                strokeWidth={1.8}
              />
              <span className="truncate">{appliedCoupon.code}</span>
            </span>
            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#176b37]">
              Applied
            </span>
          </div>
          <p className="mt-1 text-[10.5px] font-medium text-[#176b37] sm:text-[11px]">
            You saved {money(discount)}
          </p>
        </div>
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
