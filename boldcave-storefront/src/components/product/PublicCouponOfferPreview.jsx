"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import { fetchEligibleCoupons } from "@/lib/clientApi";

const OFFER_TEXT_COLOR = "text-[#526173]";
const OFFER_CACHE_TTL_MS = 30_000;
const offerRequestCache = new Map();

const formatNumber = (value) =>
  new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

function getOfferRequest({ subtotal, viewerKey }) {
  const amount = Number(subtotal) || 0;
  const cacheKey = `${viewerKey}:${amount.toFixed(2)}`;
  const cached = offerRequestCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.request;
  }

  const request = fetchEligibleCoupons({ subtotal }).catch((error) => {
    offerRequestCache.delete(cacheKey);
    throw error;
  });

  offerRequestCache.set(cacheKey, {
    expiresAt: Date.now() + OFFER_CACHE_TTL_MS,
    request,
  });

  return request;
}

function getBenefitText(coupon) {
  if (coupon?.discountType === "percentage") {
    return `Extra ${formatNumber(coupon.discountValue)}% off`;
  }

  return `Extra ₹${formatNumber(coupon?.discount)} off`;
}

export default function PublicCouponOfferPreview({
  subtotal,
  placement = "card",
  enabled = true,
}) {
  const { user, loading: authLoading } = useAuth();
  const [offer, setOffer] = useState(null);
  const amount = Number(subtotal) || 0;

  useEffect(() => {
    let active = true;

    if (!enabled || authLoading || amount <= 0) {
      setOffer(null);
      return () => {
        active = false;
      };
    }

    getOfferRequest({
      subtotal: amount,
      viewerKey: user?.id || "guest",
    })
      .then((coupons) => {
        if (active) {
          setOffer(Array.isArray(coupons) ? coupons[0] || null : null);
        }
      })
      .catch(() => {
        if (active) setOffer(null);
      });

    return () => {
      active = false;
    };
  }, [amount, authLoading, enabled, user?.id]);

  if (!offer) return null;

  const benefitText = getBenefitText(offer);
  const offerType = offer.firstOrderOnly ? "First order" : "Cart offer";

  if (placement === "detail") {
    return (
      <div className={`mt-2 ${OFFER_TEXT_COLOR}`}>
        <p className="text-[10.5px] font-medium uppercase leading-4 tracking-[0.08em] sm:text-[11px]">
          {offerType} offer <span aria-hidden="true">·</span>{" "}
          <span className="font-semibold">{benefitText}</span>
        </p>
        <p className="mt-0.5 text-[10.5px] leading-4 sm:text-[11px]">
          Use code <span className="font-medium">{offer.code}</span> at cart
        </p>
      </div>
    );
  }

  return (
    <p
      className={`mt-1.5 truncate text-[9px] font-medium leading-4 max-[450px]:text-[8.5px] sm:text-[10px] ${OFFER_TEXT_COLOR}`}
    >
      {offerType}: <span className="font-semibold">{benefitText}</span>
    </p>
  );
}
