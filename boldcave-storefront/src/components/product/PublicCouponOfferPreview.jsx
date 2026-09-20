"use client";

import { useEffect, useState } from "react";
import { Tag } from "lucide-react";
import { fetchPublicPromotions } from "@/lib/clientApi";

const OFFER_TEXT_COLOR = "text-[#526173]";

const formatNumber = (value) =>
  new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const roundMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;

function calculateExactPromotionalPrice(coupon, amount) {
  if (Number(coupon.minimumOrder) > amount) return null;

  const rawDiscount =
    coupon.discountType === "percentage"
      ? (amount * Number(coupon.discountValue || 0)) / 100
      : Number(coupon.discountValue || 0);
  const discount = Math.min(amount, roundMoney(rawDiscount));

  if (discount <= 0) return null;
  return Math.max(0, roundMoney(amount - discount));
}

function getFallbackText(coupon, isFirstOrder, meetsMinimum) {
  const prefix = isFirstOrder ? "First order" : "Offer";
  const benefit =
    coupon.discountType === "percentage"
      ? `Get ${formatNumber(coupon.discountValue)}% off`
      : `Save ₹${formatNumber(coupon.discountValue)}`;

  if (!meetsMinimum && Number(coupon.minimumOrder) > 0) {
    return `${prefix} · ${benefit} on orders above ₹${formatNumber(coupon.minimumOrder)}`;
  }

  return `${prefix} · ${benefit}`;
}

function getCardFallbackText(coupon, isFirstOrder, meetsMinimum) {
  const benefit =
    coupon.discountType === "percentage"
      ? `${formatNumber(coupon.discountValue)}% off`
      : `₹${formatNumber(coupon.discountValue)} off`;
  const prefix = isFirstOrder ? "1st order · " : "";
  if (!meetsMinimum && Number(coupon.minimumOrder) > 0) {
    return `${prefix}${benefit} on ₹${formatNumber(coupon.minimumOrder)}+`;
  }
  return `${prefix}${benefit}`;
}

export default function PublicCouponOfferPreview({
  subtotal,
  placement = "card",
  enabled = true,
}) {
  const [promotions, setPromotions] = useState(null);
  const amount = Number(subtotal) || 0;

  useEffect(() => {
    let active = true;

    if (!enabled || amount <= 0) {
      setPromotions(null);
      return () => {
        active = false;
      };
    }

    fetchPublicPromotions()
      .then((data) => {
        if (active) {
          setPromotions(data);
        }
      })
      .catch(() => {
        if (active) setPromotions(null);
      });

    return () => {
      active = false;
    };
  }, [amount, enabled]);

  if (!promotions) return null;

  const targetCoupon = promotions.firstOrderCoupon || promotions.generalCoupon;
  if (!targetCoupon) return null;

  const isFirstOrder = targetCoupon.firstOrderOnly === true;
  const meetsMinimum = Number(targetCoupon.minimumOrder) <= amount;
  const exactPromotionalPrice = calculateExactPromotionalPrice(
    targetCoupon,
    amount
  );

  const fallbackText = getFallbackText(
    targetCoupon,
    isFirstOrder,
    meetsMinimum
  );

  if (placement === "detail") {
    return (
      <div
        className={`mt-3 rounded-[2px] bg-neutral-100 px-3 py-2.5 sm:px-3.5 sm:py-3 ${OFFER_TEXT_COLOR}`}
      >
        <p className="text-[10px] font-semibold uppercase leading-none tracking-[0.11em] sm:text-[10.5px]">
          {isFirstOrder ? "FIRST ORDER OFFER" : "SPECIAL OFFER"}
        </p>

        {exactPromotionalPrice !== null ? (
          <p className="mt-1.5 flex items-baseline gap-1.5 text-[13px] leading-none text-neutral-700 sm:text-[14px]">
            <span>Get it for</span>
            <span className="text-[19px] font-medium tracking-[-0.01em] text-neutral-900 sm:text-[20px]">
              ₹{formatNumber(exactPromotionalPrice)}
            </span>
          </p>
        ) : (
          <p className="mt-1.5 text-[13px] font-semibold leading-5 text-neutral-900 sm:text-[14px]">
            {fallbackText}
          </p>
        )}

        <p className="mt-1.5 text-[10.5px] leading-4 text-neutral-500 sm:text-[11px]">
          Use code{" "}
          <span className="font-semibold text-neutral-700">
            {targetCoupon.code}
          </span>{" "}
          at cart
        </p>
      </div>
    );
  }

  const cardText =
    exactPromotionalPrice !== null
      ? isFirstOrder
        ? `First order: ₹${formatNumber(exactPromotionalPrice)} with coupon`
        : `₹${formatNumber(exactPromotionalPrice)} with coupon`
      : getCardFallbackText(targetCoupon, isFirstOrder, meetsMinimum);

  return (
    <p className={`mt-1.5 flex min-w-0 items-center justify-center gap-1 text-[10px] font-semibold leading-4 max-[450px]:text-[9px] sm:text-[11px] ${OFFER_TEXT_COLOR}`}>
      <Tag
        aria-hidden="true"
        className="h-3 w-3 shrink-0 stroke-[1.8]"
      />
      <span className="truncate">{cardText}</span>
    </p>
  );
}
