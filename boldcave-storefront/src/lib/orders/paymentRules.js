export const MINIMUM_COD_ORDER_AMOUNT = 10;

export const COD_MINIMUM_AMOUNT_MESSAGE =
  `Cash on Delivery is unavailable for orders below ₹${MINIMUM_COD_ORDER_AMOUNT}. Please pay online.`;

export function isCodOrderAmountEligible(value) {
  const amount = Number(value);

  return Number.isFinite(amount) && amount >= MINIMUM_COD_ORDER_AMOUNT;
}
