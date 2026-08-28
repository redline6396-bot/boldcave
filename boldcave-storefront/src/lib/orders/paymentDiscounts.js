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
  return fromPaise(
    Math.max(
      0,
      toPaise(subtotal) -
        toPaise(couponDiscount) -
        toPaise(prepaidDiscount) +
        toPaise(shipping)
    )
  );
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
    return {
      couponDiscount: normalizedCouponDiscount,
      prepaidDiscount: 0,
      finalAmount: calculatePayableAmount({
        subtotal,
        couponDiscount: normalizedCouponDiscount,
        shipping,
      }),
      discountWinner: normalizedCouponDiscount > 0 ? "coupon" : "none",
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

    return {
      couponDiscount: normalizedCouponDiscount,
      prepaidDiscount,
      finalAmount: calculatePayableAmount({
        subtotal,
        couponDiscount: normalizedCouponDiscount,
        prepaidDiscount,
        shipping,
      }),
      discountWinner:
        normalizedCouponDiscount > 0 && prepaidDiscount > 0
          ? "stacked"
          : prepaidDiscount > 0
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
    return {
      couponDiscount: 0,
      prepaidDiscount,
      finalAmount: calculatePayableAmount({
        subtotal,
        prepaidDiscount,
        shipping,
      }),
      discountWinner: "prepaid",
    };
  }

  return {
    couponDiscount: normalizedCouponDiscount,
    prepaidDiscount: 0,
    finalAmount: calculatePayableAmount({
      subtotal,
      couponDiscount: normalizedCouponDiscount,
      shipping,
    }),
    discountWinner: normalizedCouponDiscount > 0 ? "coupon" : "none",
  };
}
