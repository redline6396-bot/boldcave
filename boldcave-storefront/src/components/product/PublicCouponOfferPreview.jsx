"use client";

import { useEffect, useState } from "react";
import { fetchPublicPromotions } from "@/lib/clientApi";

const OFFER_TEXT_COLOR = "text-[#526173]";

const formatNumber = (value) =>
  new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

function calculateExactDiscount(coupon, amount) {
  if (coupon.minimumOrder > amount) {
    return 0; // Does not meet minimum order
  }
  if (coupon.discountType === "percentage") {
    return (amount * coupon.discountValue) / 100;
  }
  return Math.min(coupon.discountValue, amount);
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

  const isFirstOrder = targetCoupon.firstOrderOnly;
  const meetsMinimum = targetCoupon.minimumOrder <= amount;
  
  // Calculate Exact Price (if minimum met)
  let exactPromotionalPrice = null;
  if (meetsMinimum) {
    const discount = calculateExactDiscount(targetCoupon, amount);
    if (discount > 0) {
      exactPromotionalPrice = Math.max(0, amount - discount);
    }
  }

  // Fallback wording if exact price cannot be used
  let fallbackText = "";
  if (isFirstOrder) {
    if (targetCoupon.discountType === "percentage") {
      fallbackText = `First order · Get ${formatNumber(targetCoupon.discountValue)}% off`;
    } else {
      fallbackText = `First order · Save ₹${formatNumber(targetCoupon.discountValue)}`;
    }
  } else {
    if (targetCoupon.minimumOrder > 0 && !meetsMinimum) {
      fallbackText = `Save ₹${formatNumber(targetCoupon.discountValue)} on orders above ₹${formatNumber(targetCoupon.minimumOrder)}`;
    } else if (targetCoupon.discountType === "percentage") {
      fallbackText = `Offer · Get ${formatNumber(targetCoupon.discountValue)}% off`;
    } else {
      fallbackText = `Offer · Save ₹${formatNumber(targetCoupon.discountValue)}`;
    }
  }

  if (placement === "detail") {
    if (exactPromotionalPrice !== null) {
      const titleText = isFirstOrder
        ? `FIRST ORDER PRICE ₹${formatNumber(exactPromotionalPrice)}`
        : `GET IT FOR ₹${formatNumber(exactPromotionalPrice)}`;
      
      return (
        <div className={`mt-2 ${OFFER_TEXT_COLOR}`}>
          <p className="text-[10.5px] font-medium uppercase leading-4 tracking-[0.08em] sm:text-[11px]">
            {titleText}
          </p>
          <p className="mt-0.5 text-[10.5px] leading-4 sm:text-[11px]">
            Use code <span className="font-medium">{targetCoupon.code}</span> at cart
          </p>
        </div>
      );
    }

    return (
      <div className={`mt-2 ${OFFER_TEXT_COLOR}`}>
        <p className="text-[10.5px] font-medium uppercase leading-4 tracking-[0.08em] sm:text-[11px]">
          {fallbackText}
        </p>
        <p className="mt-0.5 text-[10.5px] leading-4 sm:text-[11px]">
          Use code <span className="font-medium">{targetCoupon.code}</span> at cart
        </p>
      </div>
    );
  }

  // Product Card placement
  return (
    <p
      className={`mt-1.5 truncate text-[9px] font-medium leading-4 max-[450px]:text-[8.5px] sm:text-[10px] ${OFFER_TEXT_COLOR}`}
    >
      {fallbackText}
    </p>
  );
}
