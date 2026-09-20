export const DEFAULT_COD_CHARGE_SETTINGS = {
  enabled: false,
  chargeType: "fixed",
  chargeValue: 0,
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

export function calculateCodCharge({
  subtotal = 0,
  couponDiscount = 0,
  shipping = 0,
  paymentMethod = "",
  codChargeSettings = DEFAULT_COD_CHARGE_SETTINGS,
} = {}) {
  if (String(paymentMethod || "").toLowerCase() !== "cod") return 0;
  if (codChargeSettings?.enabled !== true) return 0;

  const eligiblePaise = Math.max(
    0,
    toPaise(subtotal) - toPaise(couponDiscount) + toPaise(shipping)
  );

  if (codChargeSettings?.chargeType === "percentage") {
    const percent = Math.min(
      100,
      Math.max(0, Number(codChargeSettings?.chargeValue) || 0)
    );

    return fromPaise(Math.round(eligiblePaise * (percent / 100)));
  }

  return fromPaise(toPaise(codChargeSettings?.chargeValue));
}

export function calculatePricingBreakdown({
  subtotal = 0,
  couponDiscount = 0,
  shipping = 0,
  paymentMethod = "",
  codChargeSettings = DEFAULT_COD_CHARGE_SETTINGS,
} = {}) {
  const subtotalPaise = toPaise(subtotal);
  const shippingPaise = toPaise(shipping);
  const normalizedCouponPaise = Math.min(
    subtotalPaise + shippingPaise,
    toPaise(couponDiscount)
  );
  const rawCodCharge = calculateCodCharge({
    subtotal,
    couponDiscount: fromPaise(normalizedCouponPaise),
    shipping,
    paymentMethod,
    codChargeSettings,
  });
  const rawCodChargePaise = toPaise(rawCodCharge);
  const finalAmountPaise = roundPayablePaiseToWholeRupee(
    subtotalPaise -
      normalizedCouponPaise +
      shippingPaise +
      rawCodChargePaise
  );

  if (rawCodChargePaise > 0) {
    const effectiveCodChargePaise = Math.max(
      0,
      finalAmountPaise -
        (subtotalPaise - normalizedCouponPaise + shippingPaise)
    );

    return {
      couponDiscount: fromPaise(normalizedCouponPaise),
      codCharge: fromPaise(effectiveCodChargePaise),
      finalAmount: fromPaise(finalAmountPaise),
    };
  }

  const effectiveCouponPaise = Math.max(
    0,
    subtotalPaise + shippingPaise - finalAmountPaise
  );

  return {
    couponDiscount: fromPaise(effectiveCouponPaise),
    codCharge: 0,
    finalAmount: fromPaise(finalAmountPaise),
  };
}
