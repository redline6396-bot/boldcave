export const PREPAID_DISCOUNT_PERCENT = 10;

export const DEFAULT_PREPAID_DISCOUNT_SETTINGS = {
  enabled: true,
  discountType: "percentage",
  discountValue: PREPAID_DISCOUNT_PERCENT,
  allowCouponStacking: true,
};

export function toPaise(value) {
  return Math.max(0, Math.round((Number(value) || 0) * 100));
}

export function fromPaise(value) {
  return Math.round(Number(value) || 0) / 100;
}

export function roundPayablePaiseToWholeRupee(value) {
  return Math.max(0, Math.round((Number(value) || 0) / 100) * 100);
}

function getEffectiveDiscountPaise({ subtotal = 0, shipping = 0, finalAmount = 0 }) {
  return Math.max(0, toPaise(subtotal) + toPaise(shipping) - toPaise(finalAmount));
}

export function isPrepaidPaymentMethod(paymentMethod) {
  return String(paymentMethod || "").toLowerCase() === "razorpay";
}

export function calculatePrepaidDiscount({
  subtotal = 0,
  couponDiscount = 0,
  shipping = 0,
  paymentMethod = "",
  prepaidDiscountSettings = DEFAULT_PREPAID_DISCOUNT_SETTINGS,
} = {}) {
  if (!isPrepaidPaymentMethod(paymentMethod)) return 0;
  if (prepaidDiscountSettings?.enabled === false) return 0;

  const eligiblePaise = Math.max(
    0,
    toPaise(subtotal) - toPaise(couponDiscount) + toPaise(shipping)
  );

  if (prepaidDiscountSettings?.discountType === "fixed") {
    return fromPaise(
      Math.min(eligiblePaise, toPaise(prepaidDiscountSettings.discountValue))
    );
  }

  const percent = Math.min(
    100,
    Math.max(0, Number(prepaidDiscountSettings?.discountValue) || 0)
  );

  return fromPaise(Math.round(eligiblePaise * (percent / 100)));
}

export function calculatePayableAmount({
  subtotal = 0,
  couponDiscount = 0,
  prepaidDiscount = 0,
  shipping = 0,
} = {}) {
  const payablePaise = Math.max(
    0,
    toPaise(subtotal) -
      toPaise(couponDiscount) -
      toPaise(prepaidDiscount) +
      toPaise(shipping)
  );

  return fromPaise(roundPayablePaiseToWholeRupee(payablePaise));
}

export function calculateDiscountBreakdown({
  subtotal = 0,
  couponDiscount = 0,
  shipping = 0,
  paymentMethod = "",
  prepaidDiscountSettings = DEFAULT_PREPAID_DISCOUNT_SETTINGS,
} = {}) {
  const normalizedCouponDiscount = fromPaise(toPaise(couponDiscount));
  const allowCouponStacking =
    prepaidDiscountSettings?.allowCouponStacking !== false;

  if (!isPrepaidPaymentMethod(paymentMethod)) {
    const finalAmount = calculatePayableAmount({
      subtotal,
      couponDiscount: normalizedCouponDiscount,
      shipping,
    });
    const effectiveCouponDiscount = fromPaise(
      getEffectiveDiscountPaise({ subtotal, shipping, finalAmount })
    );

    return {
      couponDiscount: effectiveCouponDiscount,
      prepaidDiscount: 0,
      finalAmount,
      discountWinner: effectiveCouponDiscount > 0 ? "coupon" : "none",
    };
  }

  if (allowCouponStacking) {
    const prepaidDiscount = calculatePrepaidDiscount({
      subtotal,
      couponDiscount: normalizedCouponDiscount,
      shipping,
      paymentMethod,
      prepaidDiscountSettings,
    });

    const finalAmount = calculatePayableAmount({
      subtotal,
      couponDiscount: normalizedCouponDiscount,
      prepaidDiscount,
      shipping,
    });
    const effectiveDiscountPaise = getEffectiveDiscountPaise({
      subtotal,
      shipping,
      finalAmount,
    });
    const rawPrepaidDiscountPaise = toPaise(prepaidDiscount);
    const couponDiscountPaise =
      rawPrepaidDiscountPaise > 0
        ? Math.min(toPaise(normalizedCouponDiscount), effectiveDiscountPaise)
        : effectiveDiscountPaise;
    const prepaidDiscountPaise = Math.max(
      0,
      effectiveDiscountPaise - couponDiscountPaise
    );

    return {
      couponDiscount: normalizedCouponDiscount,
      prepaidDiscount: fromPaise(prepaidDiscountPaise),
      finalAmount,
      discountWinner:
        normalizedCouponDiscount > 0 && prepaidDiscountPaise > 0
          ? "stacked"
          : prepaidDiscountPaise > 0
            ? "prepaid"
            : normalizedCouponDiscount > 0
              ? "coupon"
              : "none",
    };
  }

  const prepaidDiscount = calculatePrepaidDiscount({
    subtotal,
    couponDiscount: 0,
    shipping,
    paymentMethod,
    prepaidDiscountSettings,
  });

  if (prepaidDiscount > normalizedCouponDiscount) {
    const finalAmount = calculatePayableAmount({
      subtotal,
      prepaidDiscount,
      shipping,
    });

    return {
      couponDiscount: 0,
      prepaidDiscount: fromPaise(
        getEffectiveDiscountPaise({ subtotal, shipping, finalAmount })
      ),
      finalAmount,
      discountWinner: "prepaid",
    };
  }

  const finalAmount = calculatePayableAmount({
    subtotal,
    couponDiscount: normalizedCouponDiscount,
    shipping,
  });
  const effectiveCouponDiscount = fromPaise(
    getEffectiveDiscountPaise({ subtotal, shipping, finalAmount })
  );

  return {
    couponDiscount: effectiveCouponDiscount,
    prepaidDiscount: 0,
    finalAmount,
    discountWinner: effectiveCouponDiscount > 0 ? "coupon" : "none",
  };
}
