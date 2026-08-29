"use client";

import { useEffect, useState } from "react";
import {
  BadgePercent,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import { useCoupon } from "@/context/CouponContext";
import { fetchEligibleCoupons } from "@/lib/clientApi";

const money = (value) =>
  `₹${new Intl.NumberFormat("en-IN", {
    minimumFractionDigits:
      Math.round((Number(value) || 0) * 100) % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)}`;

const formatCouponDate = (value) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
  }).format(date);
};

/* =====================================================
   CUSTOMER-FRIENDLY ERROR COPY
===================================================== */

const getFriendlyCouponError = (value) => {
  const raw = String(value || "").trim();

  if (!raw) {
    return "This coupon couldn't be applied. Please try again.";
  }

  const text = raw.toLowerCase();

  if (
    text.includes("enter a coupon") ||
    text.includes("coupon code is required") ||
    text.includes("coupon code required")
  ) {
    return "Please enter a coupon code.";
  }

  if (
    text.includes("not found") ||
    text.includes("invalid coupon") ||
    text.includes("invalid code") ||
    text.includes("does not exist")
  ) {
    return "This coupon code is invalid or unavailable.";
  }

  if (text.includes("expired")) {
    return "This coupon has expired.";
  }

  if (
    text.includes("inactive") ||
    text.includes("not active") ||
    text.includes("unavailable")
  ) {
    return "This coupon is currently unavailable.";
  }

  if (
    text.includes("minimum order") ||
    text.includes("minimum amount") ||
    text.includes("minimum cart")
  ) {
    return "Your order does not meet the minimum amount for this coupon.";
  }

  if (
    text.includes("first order") ||
    text.includes("first-order")
  ) {
    return "This coupon is only available on your first order.";
  }

  if (
    text.includes("usage limit") ||
    text.includes("limit reached") ||
    text.includes("maximum usage")
  ) {
    return "This coupon has reached its usage limit.";
  }

  if (
    text.includes("already used") ||
    text.includes("per customer") ||
    text.includes("usage per customer")
  ) {
    return "You've already used this coupon.";
  }

  if (
    text.includes("not eligible") ||
    text.includes("eligible customer") ||
    text.includes("selected customer")
  ) {
    return "This coupon isn't available for your account.";
  }

  return "This coupon couldn't be applied. Please try again.";
};

export default function CouponSection({
  disabled = false,
  paymentMethod = "cod",
  subtotal = 0,
  showEligibleOffers = false,
  maxVisibleOffers = 3,
  activeDiscount = null,
  inactiveAppliedText = "",
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

  const [showLocalFeedback, setShowLocalFeedback] =
    useState(false);

  const [localActionError, setLocalActionError] =
    useState("");

  const [eligibleCoupons, setEligibleCoupons] =
    useState([]);

  const [showAllOffers, setShowAllOffers] =
    useState(false);

  const [expandedOffers, setExpandedOffers] =
    useState([]);

  const displayDiscount =
    activeDiscount === null
      ? Number(discount) || 0
      : Number(activeDiscount) || 0;

  const applied = Boolean(appliedCoupon?.code);

  const couponContributes =
    applied && displayDiscount > 0;

  const visibleOfferLimit = Math.max(
    1,
    Number(maxVisibleOffers) || 3,
  );

  const visibleEligibleCoupons = showAllOffers
    ? eligibleCoupons
    : eligibleCoupons.slice(0, visibleOfferLimit);

  const hasMoreEligibleCoupons =
    eligibleCoupons.length > visibleOfferLimit;

  /* =====================================================
     FEEDBACK AUTO-HIDE
  ===================================================== */

  useEffect(() => {
    if (!showLocalFeedback) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setShowLocalFeedback(false);
      setLocalActionError("");
    }, 4500);

    return () => window.clearTimeout(timer);
  }, [
    showLocalFeedback,
    localActionError,
    error,
    message,
  ]);

  /* =====================================================
     FETCH ELIGIBLE COUPONS
  ===================================================== */

  useEffect(() => {
    let activeRequest = true;

    if (!showEligibleOffers || disabled) {
      setEligibleCoupons([]);

      return () => {
        activeRequest = false;
      };
    }

    fetchEligibleCoupons({ subtotal })
      .then((coupons) => {
        if (activeRequest) {
          setEligibleCoupons(
            Array.isArray(coupons) ? coupons : [],
          );
        }
      })
      .catch(() => {
        if (activeRequest) {
          setEligibleCoupons([]);
        }
      });

    return () => {
      activeRequest = false;
    };
  }, [
    disabled,
    showEligibleOffers,
    subtotal,
  ]);

  /* =====================================================
     RESET OFFER UI
  ===================================================== */

  useEffect(() => {
    setShowAllOffers(false);
    setExpandedOffers([]);
  }, [
    eligibleCoupons.length,
    showEligibleOffers,
  ]);

  /* =====================================================
     MANUAL APPLY
  ===================================================== */

  const handleCouponAction = async () => {
    if (applied || disabled || validating) {
      return;
    }

    const code = String(couponCode || "").trim();

    /*
      IMPORTANT:
      Don't call backend for empty input.
      Show our own professional message immediately.
    */

    if (!code) {
      setLocalActionError(
        "Please enter a coupon code.",
      );

      setShowLocalFeedback(true);
      return;
    }

    setLocalActionError("");
    setShowLocalFeedback(true);

    await applyCoupon(undefined, {
      paymentMethod,
    });
  };

  /* =====================================================
     ELIGIBLE COUPON APPLY
  ===================================================== */

  const handleApplyEligibleCoupon = async (
    code,
  ) => {
    if (
      !code ||
      disabled ||
      validating
    ) {
      return;
    }

    setLocalActionError("");
    setShowLocalFeedback(true);

    await applyCoupon(code, {
      paymentMethod,
    });
  };

  /* =====================================================
     OFFER DETAILS
  ===================================================== */

  const toggleOfferDetails = (code) => {
    setExpandedOffers((current) =>
      current.includes(code)
        ? current.filter(
            (item) => item !== code,
          )
        : [...current, code],
    );
  };

  /* =====================================================
     OFFER LABEL
  ===================================================== */

  const couponOfferLabel = (coupon) => {
    if (
      coupon.discountType === "percentage"
    ) {
      return `${
        Number(coupon.discountValue) || 0
      }% off`;
    }

    return `${money(
      coupon.discount ??
        coupon.discountValue,
    )} off on this order`;
  };

  /* =====================================================
     SAFE OFFER CONDITIONS
  ===================================================== */

  const couponConditions = (coupon) => {
    const conditions = [];

    if (
      Number(coupon.minimumOrder) > 0
    ) {
      conditions.push(
        `Minimum order ${money(
          coupon.minimumOrder,
        )}`,
      );
    }

    if (coupon.firstOrderOnly) {
      conditions.push(
        "First order only",
      );
    }

    const startsAt = formatCouponDate(
      coupon.startsAt,
    );

    if (startsAt) {
      conditions.push(
        `Starts ${startsAt}`,
      );
    }

    const expiry = formatCouponDate(
      coupon.expiryDate,
    );

    if (expiry) {
      conditions.push(
        `Valid till ${expiry}`,
      );
    }

    return conditions;
  };

  /* =====================================================
     PROFESSIONAL FEEDBACK COPY
  ===================================================== */

  const feedbackText = localActionError
    ? localActionError
    : error
      ? getFriendlyCouponError(error)
      : message || "";

  const hasFeedbackError =
    Boolean(localActionError) ||
    Boolean(error);
  const visibleFieldFeedback =
    !applied && showLocalFeedback && feedbackText
      ? feedbackText
      : "";

  /* =====================================================
     APPLIED SECOND LINE
  ===================================================== */

  const appliedSecondaryText =
    couponContributes
      ? `${money(displayDiscount)} saved`
      : inactiveAppliedText ||
        "Coupon entered";

  return (
    <section className="min-w-0">
      {/* =================================================
          AVAILABLE OFFERS
      ================================================= */}

      {showEligibleOffers &&
        eligibleCoupons.length > 0 &&
        !applied && (
          <div className="mb-3">
            <div className="divide-y divide-[#eceff2]">
              {visibleEligibleCoupons.map(
                (coupon) => {
                  const conditions =
                    couponConditions(coupon);

                  const expanded =
                    expandedOffers.includes(
                      coupon.code,
                    );

                  return (
                    <div
                      key={
                        coupon.id ||
                        coupon.code
                      }
                      className="py-2.5"
                    >
                      {/* MAIN ROW */}

                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="truncate text-[12px] font-semibold uppercase tracking-[0.07em] text-[#111b28]">
                            {coupon.code}
                          </p>

                          <p className="mt-0.5 text-[11px] leading-4 text-[#687483]">
                            {couponOfferLabel(
                              coupon,
                            )}
                          </p>
                        </div>

                        {/* APPLY */}

                        <button
                          type="button"
                          onClick={() =>
                            handleApplyEligibleCoupon(
                              coupon.code,
                            )
                          }
                          disabled={
                            disabled ||
                            validating
                          }
                          className="shrink-0 rounded-md px-2.5 py-1.5 text-[11px] font-semibold text-[#111b28] transition-colors hover:bg-black/[0.045] focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-neutral-500 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Apply
                        </button>
                      </div>

                      {/* VIEW DETAILS */}

                      {conditions.length >
                        0 && (
                        <div className="mt-1">
                          <button
                            type="button"
                            aria-expanded={
                              expanded
                            }
                            onClick={() =>
                              toggleOfferDetails(
                                coupon.code,
                              )
                            }
                            className="inline-flex items-center gap-1 rounded px-0.5 py-1 text-[10px] font-medium text-[#697481] transition-colors hover:text-[#111b28] focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-neutral-500"
                          >
                            {expanded
                              ? "Hide details"
                              : "View details"}

                            {expanded ? (
                              <ChevronUp
                                className="h-3 w-3"
                                strokeWidth={
                                  1.7
                                }
                              />
                            ) : (
                              <ChevronDown
                                className="h-3 w-3"
                                strokeWidth={
                                  1.7
                                }
                              />
                            )}
                          </button>

                          {/* EXPANDED INFO */}

                          {expanded && (
                            <div className="mt-1.5 border-l border-[#dde2e7] pl-3">
                              <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.09em] text-[#8a939d]">
                                Offer details
                              </p>

                              <div className="space-y-0.5">
                                {conditions.map(
                                  (
                                    condition,
                                  ) => (
                                    <p
                                      key={
                                        condition
                                      }
                                      className="text-[10.5px] leading-4 text-[#687483]"
                                    >
                                      {
                                        condition
                                      }
                                    </p>
                                  ),
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                },
              )}
            </div>

            {/* VIEW MORE */}

            {hasMoreEligibleCoupons &&
              !showAllOffers && (
                <button
                  type="button"
                  onClick={() =>
                    setShowAllOffers(
                      true,
                    )
                  }
                  className="mt-1 rounded px-1.5 py-1 text-[10px] font-medium text-[#65707d] transition-colors hover:bg-black/[0.04] hover:text-[#111b28]"
                >
                  View more offers
                </button>
              )}
          </div>
        )}

      {/* =================================================
          SAME COUPON BOX
          BEFORE + AFTER APPLY

          IMPORTANT:
          ORIGINAL HEIGHT/WIDTH PRESERVED
      ================================================= */}

      <div className="relative">
        {visibleFieldFeedback && (
          <p
            className={[
              "pointer-events-none absolute -top-[18px] left-1/2 max-w-[calc(100%-120px)] -translate-x-1/2 truncate text-center text-[10px] font-medium leading-none",
              hasFeedbackError
                ? "text-[#b42318]"
                : "text-[#66717e]",
            ].join(" ")}
            title={visibleFieldFeedback}
            aria-live="polite"
          >
            {visibleFieldFeedback}
          </p>
        )}

        <div
          className={[
            "flex h-11 min-w-0 overflow-hidden rounded-[10px] border bg-white transition-[border-color,box-shadow] sm:h-12",

            applied
              ? "border-[#cfd5d9]"
              : "border-[#d2d0d0] focus-within:border-[#111b28] focus-within:shadow-[0_0_0_2px_rgba(0,0,0,0.04)]",
          ].join(" ")}
        >
        {/* =============================================
            LEFT ICON
            SAME BEFORE / AFTER
        ============================================= */}

        <div className="flex w-[46px] shrink-0 items-center justify-center border-r border-[#d3d9e1] bg-white sm:w-[58px]">
          <BadgePercent
            className="h-[18px] w-[18px] text-[#111b28] sm:h-[21px] sm:w-[21px]"
            strokeWidth={1.85}
          />
        </div>

        {/* =============================================
            CENTER CONTENT
        ============================================= */}

        {applied ? (
          <div className="flex min-w-0 flex-1 flex-col justify-center px-3 sm:px-3.5">
            <span className="truncate text-[12px] font-semibold uppercase leading-[14px] tracking-[0.07em] text-[#111b28] sm:text-[13px]">
              {appliedCoupon.code}
            </span>

            <span
              className={[
                "mt-0.5 truncate text-[9.5px] leading-[11px] sm:text-[10px]",

                couponContributes
                  ? "text-[#66717e]"
                  : "text-[#737d87]",
              ].join(" ")}
            >
              {appliedSecondaryText}
            </span>
          </div>
        ) : (
          <input
            value={couponCode}
            onChange={(event) => {
              /*
                As soon as user types again,
                remove old local validation copy.
              */

              setShowLocalFeedback(
                false,
              );

              setLocalActionError("");

              setCouponCode(
                event.target.value.toUpperCase(),
              );
            }}
            placeholder="Enter coupon code"
            disabled={disabled}
            aria-invalid={hasFeedbackError}
            className="min-w-0 flex-1 bg-white px-3 text-[12px] text-[#182231] outline-none placeholder:text-[#8a939d] disabled:cursor-not-allowed disabled:bg-[#fafafa] sm:px-3.5 sm:text-[13px]"
          />
        )}

        {/* =============================================
            RIGHT ACTION
            SAME WIDTH BEFORE / AFTER
        ============================================= */}

        {applied ? (
          <button
            type="button"
            onClick={removeCoupon}
            disabled={disabled}
            className="min-w-[82px] shrink-0 border-l border-[#ead8d5] bg-[#fffafa] px-3 text-[10.5px] font-semibold text-[#a53329] transition-colors hover:bg-[#fff2f0] hover:text-[#8f2118] focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-[-2px] focus-visible:outline-[#b42318] disabled:cursor-not-allowed disabled:opacity-40 sm:min-w-[96px] sm:px-4 sm:text-[11px]"
          >
            Remove
          </button>
        ) : (
          <button
            type="button"
            onClick={
              handleCouponAction
            }
            disabled={
              disabled ||
              validating
            }
            className="min-w-[82px] shrink-0 border-l border-black bg-black px-3 text-[10.5px] font-semibold text-white transition-opacity duration-150 hover:opacity-90 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-[-2px] focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-35 sm:min-w-[96px] sm:px-4 sm:text-[11px]"
          >
            {validating
              ? "Checking"
              : "Apply"}
          </button>
        )}
        </div>
      </div>

    </section>
  );
}
