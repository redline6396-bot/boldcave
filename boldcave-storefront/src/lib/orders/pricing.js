import Product from "@/models/Product";
import Coupon from "@/models/Coupon";
import Review from "@/models/Review";
import Order from "@/models/Order";
import mongoose from "mongoose";
import {
  isObjectId,
  isValidEmail,
  isValidPincode,
  normalizeCouponCode,
  toPositiveInteger,
} from "@/lib/validation";
import { normalizeImage } from "@/lib/api/products";

export async function getReviewStats(productId) {
  const productObjectId =
    typeof productId === "string" && isObjectId(productId)
      ? new mongoose.Types.ObjectId(productId)
      : productId;

  const rows = await Review.aggregate([
    {
      $match: {
        product: productObjectId,
        approved: true,
      },
    },
    {
      $group: {
        _id: "$rating",
        count: { $sum: 1 },
      },
    },
  ]);

  const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let total = 0;
  let weighted = 0;

  rows.forEach((row) => {
    breakdown[row._id] = row.count;
    total += row.count;
    weighted += row._id * row.count;
  });

  return {
    average: total ? Number((weighted / total).toFixed(1)) : 0,
    count: total,
    breakdown,
  };
}

export async function calculateCouponDiscount(code, subtotal) {
  const normalizedCode = normalizeCouponCode(code);
  if (!normalizedCode) {
    return { code: null, discount: 0, coupon: null };
  }

  const coupon = await Coupon.findOne({ code: normalizedCode });

  if (!coupon) {
    return {
      error: {
        code: "COUPON_NOT_FOUND",
        message: "Coupon code not found",
        status: 404,
      },
    };
  }

  if (!coupon.active) {
    return {
      error: {
        code: "COUPON_INACTIVE",
        message: "Coupon is no longer active",
        status: 400,
      },
    };
  }

  if (new Date(coupon.expiryDate) <= new Date()) {
    return {
      error: {
        code: "COUPON_EXPIRED",
        message: "Coupon has expired",
        status: 400,
      },
    };
  }

  if (subtotal < coupon.minimumOrder) {
    return {
      error: {
        code: "COUPON_MINIMUM_ORDER",
        message: `Minimum order amount of Rs ${coupon.minimumOrder} is required`,
        status: 422,
      },
    };
  }

  let discount = 0;
  if (coupon.discountType === "percentage") {
    discount = (subtotal * coupon.discountValue) / 100;
  } else {
    discount = coupon.discountValue;
  }

  discount = Math.min(subtotal, Math.round(discount * 100) / 100);

  return {
    code: coupon.code,
    discount,
    coupon,
  };
}

export function validateAddress(address = {}) {
  const required = ["fullName", "addressLine", "city", "state", "pincode"];
  const missing = required.filter((field) => !String(address[field] || "").trim());

  if (missing.length) {
    return { valid: false, message: `Missing address fields: ${missing.join(", ")}` };
  }

  if (!isValidPincode(address.pincode)) {
    return { valid: false, message: "Invalid pincode" };
  }

  if (address.email && !isValidEmail(address.email)) {
    return { valid: false, message: "Invalid email" };
  }

  return { valid: true };
}

export async function calculateCart({ items = [], couponCode = "" }) {
  if (!Array.isArray(items) || items.length === 0) {
    return {
      error: {
        code: "EMPTY_CART",
        message: "Cart is empty",
        status: 400,
      },
    };
  }

  const normalizedItems = [];
  const stockIssues = [];

  for (const rawItem of items) {
    const productId = rawItem.productId || rawItem.id || rawItem._id;
    const size = String(rawItem.size || "").trim();
    const quantity = toPositiveInteger(rawItem.quantity, 0);

    if (!isObjectId(productId) || !size || quantity < 1) {
      stockIssues.push({
        productId,
        size,
        requestedQuantity: quantity,
        reason: "INVALID_ITEM",
      });
      continue;
    }

    const product = await Product.findOne({
      _id: productId,
      status: "published",
    });

    if (!product) {
      stockIssues.push({
        productId,
        size,
        requestedQuantity: quantity,
        reason: "PRODUCT_UNAVAILABLE",
      });
      continue;
    }

    const variant = product.variants.find((entry) => entry.size === size);
    if (!variant) {
      stockIssues.push({
        productId,
        size,
        requestedQuantity: quantity,
        reason: "VARIANT_UNAVAILABLE",
      });
      continue;
    }

    if (variant.stock < quantity) {
      stockIssues.push({
        productId,
        size,
        requestedQuantity: quantity,
        availableStock: variant.stock,
        reason: "INSUFFICIENT_STOCK",
      });
      continue;
    }

    normalizedItems.push({
      productId: product._id,
      name: product.name,
      slug: product.slug,
      image: normalizeImage(product.images?.[0]),
      size: variant.size,
      quantity,
      unitPrice: variant.sellingPrice,
      mrp: variant.mrp,
      lineTotal: variant.sellingPrice * quantity,
    });
  }

  if (stockIssues.length) {
    return {
      error: {
        code: "STOCK_CHANGED",
        message: "Some cart items are no longer available in the requested quantity",
        status: 409,
        details: { items: stockIssues },
      },
    };
  }

  const subtotal = normalizedItems.reduce((total, item) => total + item.lineTotal, 0);
  const couponResult = await calculateCouponDiscount(couponCode, subtotal);

  if (couponResult.error) {
    return { error: couponResult.error };
  }

  const discount = couponResult.discount || 0;
  const finalAmount = Math.max(0, Math.round((subtotal - discount) * 100) / 100);

  return {
    items: normalizedItems.map(({ lineTotal, ...item }) => item),
    subtotal,
    discount,
    finalAmount,
    coupon: couponResult.code
      ? {
          code: couponResult.code,
          discount,
        }
      : {
          code: null,
          discount: 0,
        },
  };
}

export async function deductStock(items) {
  const changed = [];

  for (const item of items) {
    const result = await Product.updateOne(
      {
        _id: item.productId,
        variants: {
          $elemMatch: {
            size: item.size,
            stock: { $gte: item.quantity },
          },
        },
      },
      {
        $inc: {
          "variants.$.stock": -item.quantity,
        },
      }
    );

    if (result.modifiedCount !== 1) {
      changed.push({
        productId: String(item.productId),
        size: item.size,
        requestedQuantity: item.quantity,
      });
    }
  }

  if (changed.length) {
    const error = new Error("Stock changed");
    error.code = "STOCK_CHANGED";
    error.items = changed;
    throw error;
  }
}

export async function hasVerifiedPurchase(userId, productId) {
  const order = await Order.findOne({
    user: userId,
    "items.productId": productId,
    orderStatus: { $in: ["confirmed", "processing", "shipped", "delivered"] },
    "payment.paymentStatus": { $in: ["paid", "cod"] },
  }).select("_id");

  return Boolean(order);
}

export function generateOrderNumber() {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `ORD-${datePart}-${randomPart}`;
}
