export function calculateShipmentWeightKg(items = []) {
  if (!Array.isArray(items) || items.length === 0) {
    return 0;
  }

  let totalWeightKg = 0;

  for (const item of items) {
    const itemWeightKg = Number(item?.weightKg);
    const quantity = Number(item?.quantity);

    if (
      !Number.isFinite(itemWeightKg) ||
      itemWeightKg <= 0 ||
      !Number.isFinite(quantity) ||
      quantity <= 0
    ) {
      return 0;
    }

    totalWeightKg += itemWeightKg * quantity;
  }

  return Number(totalWeightKg.toFixed(3));
}
