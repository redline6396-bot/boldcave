import Product from "@/models/Product";
import Coupon from "@/models/Coupon";
import CouponUsage from "@/models/CouponUsage";
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
import { clearProductCache } from "@/lib/productCache";
import {
  calculateDiscountBreakdown,
} from "@/lib/orders/paymentDiscounts";
import {
  getStoreSettings,
  serializePrepaidDiscountSettings,
} from "@/lib/storeSettings";
import {
  COMBO_VARIANT_SIZE,
  findVariantByIdentifier,
  getComboAvailability,
  getVariantProductImage,
  isComboProduct,
  normalizeImage,
} from "@/lib/api/products";

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

function normalizeOptionalLimit(value) {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return null;
  return Math.floor(number);
}

function userMatchesCoupon(coupon, userId) {
  const eligibleUserIds = (coupon?.eligibleUserIds || [])
    .map((id) => String(id || ""))
    .filter(Boolean);

  if (!eligibleUserIds.length) return true;
  if (!userId) return false;

  return eligibleUserIds.includes(String(userId));
}

async function hasPreviousOrder(userId, { excludeOrderId = null } = {}) {
  if (!userId || !isObjectId(userId)) return false;
  const filter = { user: userId };
  if (excludeOrderId && isObjectId(excludeOrderId)) {
    filter._id = { $ne: excludeOrderId };
  }

  const existingOrder = await Order.exists(filter);
  return Boolean(existingOrder);
}

async function getUserCouponUsageCount(couponId, userId) {
  if (!couponId || !userId || !isObjectId(userId)) return 0;
  return CouponUsage.countDocuments({ couponId, userId });
}

export async function calculateCouponDiscount(
  code,
  subtotal,
  { userId = null, excludeOrderId = null } = {}
) {
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

  if (coupon.startsAt && new Date(coupon.startsAt) > new Date()) {
    return {
      error: {
        code: "COUPON_NOT_STARTED",
        message: "This coupon is not active yet",
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

  const usageLimit = normalizeOptionalLimit(coupon.usageLimit);
  if (usageLimit !== null && Number(coupon.usedCount || 0) >= usageLimit) {
    return {
      error: {
        code: "COUPON_USAGE_LIMIT_REACHED",
        message: "Coupon usage limit reached",
        status: 409,
      },
    };
  }

  if (!userMatchesCoupon(coupon, userId)) {
    return {
      error: {
        code: "COUPON_NOT_AVAILABLE_FOR_ACCOUNT",
        message: "This coupon is not available for your account",
        status: 403,
      },
    };
  }

  if (coupon.firstOrderOnly) {
    if (!userId) {
      return {
        error: {
          code: "COUPON_LOGIN_REQUIRED",
          message: "Sign in to use this coupon",
          status: 401,
        },
      };
    }

    if (await hasPreviousOrder(userId, { excludeOrderId })) {
      return {
        error: {
          code: "COUPON_FIRST_ORDER_ONLY",
          message: "This coupon is only available on your first order",
          status: 403,
        },
      };
    }
  }

  const perCustomerLimit = normalizeOptionalLimit(coupon.perCustomerLimit);
  if (perCustomerLimit !== null) {
    if (!userId) {
      return {
        error: {
          code: "COUPON_LOGIN_REQUIRED",
          message: "Sign in to use this coupon",
          status: 401,
        },
      };
    }

    const userUsageCount = await getUserCouponUsageCount(coupon._id, userId);
    if (userUsageCount >= perCustomerLimit) {
      return {
        error: {
          code: "COUPON_PER_CUSTOMER_LIMIT_REACHED",
          message: "You have already used this coupon",
          status: 409,
        },
      };
    }
  }

  let discount = 0;
  if (coupon.discountType === "percentage") {
    discount = (subtotal * coupon.discountValue) / 100;
  } else {
    discount = coupon.discountValue;
  }

  discount = Math.min(subtotal, Math.round(discount * 100) / 100);

  return {
    couponId: coupon._id,
    code: coupon.code,
    discount,
    coupon,
  };
}

export async function consumeCouponUsageForOrder({
  coupon,
  userId,
  order,
} = {}) {
  const couponId = coupon?.couponId || coupon?._id;
  const orderId = order?._id;
  const orderNumber = String(order?.orderNumber || "").trim();

  if (!couponId || !userId || !orderId || !orderNumber) {
    return { consumed: false, skipped: true };
  }

  const existingUsage = await CouponUsage.findOne({ couponId, orderId });
  if (existingUsage) {
    return { consumed: false, idempotent: true };
  }

  const latestCoupon = await Coupon.findById(couponId);
  if (!latestCoupon) {
    const error = new Error("Coupon not found");
    error.code = "COUPON_NOT_FOUND";
    throw error;
  }

  const validation = await calculateCouponDiscount(
    latestCoupon.code,
    Number(order?.amounts?.subtotal) || 0,
    {
      userId,
      excludeOrderId: orderId,
    }
  );
  if (validation.error) {
    const error = new Error(validation.error.message);
    error.code = validation.error.code;
    error.status = validation.error.status;
    throw error;
  }

  const perCustomerLimit = normalizeOptionalLimit(latestCoupon.perCustomerLimit);
  if (perCustomerLimit !== null) {
    const usageCount = await getUserCouponUsageCount(couponId, userId);
    if (usageCount >= perCustomerLimit) {
      const error = new Error("You have already used this coupon");
      error.code = "COUPON_PER_CUSTOMER_LIMIT_REACHED";
      error.status = 409;
      throw error;
    }
  }

  const usageLimit = normalizeOptionalLimit(latestCoupon.usageLimit);
  const usageLimitFilter =
    usageLimit === null
      ? {}
      : {
          $expr: {
            $lt: [{ $ifNull: ["$usedCount", 0] }, "$usageLimit"],
          },
        };

  const incrementResult = await Coupon.updateOne(
    {
      _id: couponId,
      ...usageLimitFilter,
    },
    { $inc: { usedCount: 1 } }
  );

  if (incrementResult.modifiedCount !== 1) {
    const error = new Error("Coupon usage limit reached");
    error.code = "COUPON_USAGE_LIMIT_REACHED";
    error.status = 409;
    throw error;
  }

  try {
    await CouponUsage.create({
      couponId,
      userId,
      orderId,
      orderNumber,
      usedAt: new Date(),
    });
  } catch (error) {
    if (error?.code === 11000) {
      await Coupon.updateOne({ _id: couponId }, { $inc: { usedCount: -1 } });
      return { consumed: false, idempotent: true };
    }

    await Coupon.updateOne({ _id: couponId }, { $inc: { usedCount: -1 } });
    throw error;
  }

  return { consumed: true };
}

export async function releaseCouponUsageForOrder({ coupon, order } = {}) {
  const couponId = coupon?.couponId || coupon?._id;
  const orderId = order?._id;

  if (!couponId || !orderId) {
    return { released: false, skipped: true };
  }

  const deleteResult = await CouponUsage.deleteOne({ couponId, orderId });
  if (deleteResult.deletedCount !== 1) {
    return { released: false, skipped: true };
  }

  await Coupon.updateOne(
    { _id: couponId, usedCount: { $gt: 0 } },
    { $inc: { usedCount: -1 } }
  );

  return { released: true };
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

function addStockRequirement(requirements, { productId, variantId, quantity }) {
  const normalizedProductId = String(productId || "").trim();
  const normalizedVariantId = String(variantId || "").trim();
  const normalizedQuantity = Math.max(1, Number(quantity) || 1);

  if (!normalizedProductId || !normalizedVariantId) return;

  const key = `${normalizedProductId}:${normalizedVariantId.toLowerCase()}`;
  const current = requirements.get(key) || {
    productId: normalizedProductId,
    variantId: normalizedVariantId,
    quantity: 0,
  };
  current.quantity += normalizedQuantity;
  requirements.set(key, current);
}

function getStockRequirements(items = []) {
  const requirements = new Map();

  items.forEach((item) => {
    if (item.productType === "combo") {
      (item.comboItems || []).forEach((comboItem) => {
        addStockRequirement(requirements, {
          productId: comboItem.productId,
          variantId: comboItem.variantId || comboItem.size,
          quantity:
            Math.max(1, Number(comboItem.quantity) || 1) *
            Math.max(1, Number(item.quantity) || 1),
        });
      });
      return;
    }

    addStockRequirement(requirements, {
      productId: item.productId,
      variantId: item.size,
      quantity: item.quantity,
    });
  });

  return Array.from(requirements.values());
}

async function validateStockRequirements(requirements = []) {
  const result = await getCanonicalStockRequirements(requirements);
  const stockIssues = result.requirements
    .filter((requirement) => requirement.availableStock < requirement.quantity)
    .map((requirement) => ({
      productId: requirement.productId,
      size: requirement.size,
      requestedQuantity: requirement.quantity,
      availableStock: requirement.availableStock,
      reason: "INSUFFICIENT_STOCK",
    }));

  return [...result.issues, ...stockIssues];
}

async function getCanonicalStockRequirements(requirements = []) {
  if (!requirements.length) return { requirements: [], issues: [] };

  const productIds = Array.from(new Set(requirements.map((item) => item.productId)));
  const products = await Product.find({ _id: { $in: productIds } });
  const productsById = new Map(products.map((product) => [String(product._id), product]));
  const canonicalRequirements = new Map();
  const issues = [];

  requirements.forEach((requirement) => {
    const product = productsById.get(requirement.productId);
    const variant = findVariantByIdentifier(product, requirement.variantId);

    if (!product || !variant) {
      issues.push({
        productId: requirement.productId,
        size: requirement.variantId,
        requestedQuantity: requirement.quantity,
        availableStock: 0,
        reason: "VARIANT_UNAVAILABLE",
      });
      return;
    }

    const key = `${requirement.productId}:${String(variant.size).toLowerCase()}`;
    const current = canonicalRequirements.get(key) || {
      productId: requirement.productId,
      size: variant.size,
      quantity: 0,
      availableStock: Number(variant.stock) || 0,
    };
    current.quantity += requirement.quantity;
    current.availableStock = Number(variant.stock) || 0;
    canonicalRequirements.set(key, current);
  });

  return {
    requirements: Array.from(canonicalRequirements.values()),
    issues,
  };
}

export const SHIPPING_AMOUNT = 0;

export async function calculateCart({
  items = [],
  couponCode = "",
  paymentMethod = "cod",
  userId = null,
} = {}) {
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

    if (isComboProduct(product)) {
      const referencedIds = Array.from(
        new Set((product.comboItems || []).map((item) => String(item.productId)).filter(Boolean))
      );
      const referencedProducts = referencedIds.length
        ? await Product.find({ _id: { $in: referencedIds }, productType: { $ne: "combo" } })
        : [];
      const productsById = new Map(referencedProducts.map((entry) => [String(entry._id), entry]));
      const availableStock = getComboAvailability(product.comboItems, productsById);
      const comboVariant = product.variants?.[0];

      if (!comboVariant) {
        stockIssues.push({
          productId,
          size: COMBO_VARIANT_SIZE,
          requestedQuantity: quantity,
          reason: "VARIANT_UNAVAILABLE",
        });
        continue;
      }

      if (availableStock < quantity) {
        stockIssues.push({
          productId,
          size: COMBO_VARIANT_SIZE,
          requestedQuantity: quantity,
          availableStock,
          reason: "INSUFFICIENT_STOCK",
        });
        continue;
      }

      normalizedItems.push({
        productId: product._id,
        name: product.name,
        slug: product.slug,
        image: normalizeImage(product.images?.[0]),
        size: COMBO_VARIANT_SIZE,
        quantity,
        unitPrice: comboVariant.sellingPrice,
        mrp: comboVariant.mrp,
        sku: comboVariant.sku || "",
        hsnCode: product.hsnCode || "",
        weightKg: Number(comboVariant.weightKg) || 0,
        lengthCm: Number(comboVariant.lengthCm) || 0,
        breadthCm: Number(comboVariant.breadthCm) || 0,
        heightCm: Number(comboVariant.heightCm) || 0,
        productType: "combo",
        comboItems: (product.comboItems || []).map((item) => {
          const referencedProduct = productsById.get(String(item.productId));
          const variant = findVariantByIdentifier(referencedProduct, item.variantId);
          return {
            productId: item.productId,
            name: referencedProduct?.name || "",
            slug: referencedProduct?.slug || "",
            size: variant?.size || item.variantId,
            variantId: item.variantId,
            quantity: Number(item.quantity) || 1,
            image: getVariantProductImage(variant, referencedProduct),
          };
        }),
        lineTotal: comboVariant.sellingPrice * quantity,
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
      image: getVariantProductImage(variant, product),
      size: variant.size,
      quantity,
      unitPrice: variant.sellingPrice,
      mrp: variant.mrp,
      sku: variant.sku || "",
      hsnCode: product.hsnCode || "",
      weightKg: Number(variant.weightKg) || 0,
      lengthCm: Number(variant.lengthCm) || 0,
      breadthCm: Number(variant.breadthCm) || 0,
      heightCm: Number(variant.heightCm) || 0,
      productType: "product",
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

  const aggregateStockIssues = await validateStockRequirements(
    getStockRequirements(normalizedItems)
  );

  if (aggregateStockIssues.length) {
    return {
      error: {
        code: "STOCK_CHANGED",
        message: "Some cart items are no longer available in the requested quantity",
        status: 409,
        details: { items: aggregateStockIssues },
      },
    };
  }

  const subtotal = normalizedItems.reduce((total, item) => total + item.lineTotal, 0);
  const couponResult = await calculateCouponDiscount(couponCode, subtotal, {
    userId,
  });

  if (couponResult.error) {
    return { error: couponResult.error };
  }

  const shipping = SHIPPING_AMOUNT;
  const storeSettings = await getStoreSettings();
  const prepaidDiscountSettings = serializePrepaidDiscountSettings(
    storeSettings?.prepaidDiscount
  );
  const discountBreakdown = calculateDiscountBreakdown({
    subtotal,
    couponDiscount: couponResult.discount || 0,
    shipping,
    paymentMethod,
    prepaidDiscountSettings,
  });
  const discount = discountBreakdown.couponDiscount;
  const prepaidDiscount = discountBreakdown.prepaidDiscount;
  const finalAmount = discountBreakdown.finalAmount;
  const couponApplied = Boolean(couponResult.code && discount > 0);

  return {
    items: normalizedItems.map(({ lineTotal, ...item }) => item),
    subtotal,
    discount,
    prepaidDiscount,
    shipping,
    finalAmount,
    discountWinner: discountBreakdown.discountWinner,
    prepaidDiscountSettings,
    coupon: couponApplied
      ? {
          couponId: couponResult.couponId,
          code: couponResult.code,
          discount,
        }
      : {
          couponId: null,
          code: null,
          discount: 0,
        },
  };
}

export async function deductStock(items) {
  const canonicalResult = await getCanonicalStockRequirements(getStockRequirements(items));
  const changed = [
    ...canonicalResult.issues,
    ...canonicalResult.requirements
      .filter((requirement) => requirement.availableStock < requirement.quantity)
      .map((requirement) => ({
        productId: requirement.productId,
        size: requirement.size,
        requestedQuantity: requirement.quantity,
        availableStock: requirement.availableStock,
        reason: "INSUFFICIENT_STOCK",
      })),
  ];

  if (changed.length) {
    const error = new Error("Stock changed");
    error.code = "STOCK_CHANGED";
    error.items = changed;
    throw error;
  }

  for (const requirement of canonicalResult.requirements) {
    const result = await Product.updateOne(
      {
        _id: requirement.productId,
        variants: {
          $elemMatch: {
            size: requirement.size,
            stock: { $gte: requirement.quantity },
          },
        },
      },
      {
        $inc: {
          "variants.$.stock": -requirement.quantity,
        },
      }
    );

    if (result.modifiedCount !== 1) {
      changed.push({
        productId: requirement.productId,
        size: requirement.size,
        requestedQuantity: requirement.quantity,
      });
    }
  }

  if (changed.length) {
    const error = new Error("Stock changed");
    error.code = "STOCK_CHANGED";
    error.items = changed;
    throw error;
  }

  clearProductCache();
}

export async function restoreStock(items, { session } = {}) {
  const canonicalResult = await getCanonicalStockRequirements(getStockRequirements(items));

  if (canonicalResult.issues.length) {
    const error = new Error("Stock restoration failed");
    error.code = "STOCK_RESTORE_FAILED";
    error.items = canonicalResult.issues;
    throw error;
  }

  for (const requirement of canonicalResult.requirements) {
    const query = Product.updateOne(
      {
        _id: requirement.productId,
        "variants.size": requirement.size,
      },
      {
        $inc: {
          "variants.$.stock": requirement.quantity,
        },
      }
    );

    if (session) query.session(session);

    const result = await query;
    if (result.modifiedCount !== 1) {
      const error = new Error("Stock restoration failed");
      error.code = "STOCK_RESTORE_FAILED";
      error.items = [
        {
          productId: requirement.productId,
          size: requirement.size,
          quantity: requirement.quantity,
          reason: "VARIANT_UNAVAILABLE",
        },
      ];
      throw error;
    }
  }

  clearProductCache();
}

export async function hasVerifiedPurchase(userId, productId) {
  const order = await Order.findOne({
    user: userId,
    "items.productId": productId,
    orderStatus: {
      $in: [
        "confirmed",
        "processing",
        "shipped",
        "in_transit",
        "out_for_delivery",
        "delivered",
      ],
    },
    "payment.paymentStatus": { $in: ["paid", "cod"] },
  }).select("_id");

  return Boolean(order);
}

export function generateOrderNumber() {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `ORD-${datePart}-${randomPart}`;
}
