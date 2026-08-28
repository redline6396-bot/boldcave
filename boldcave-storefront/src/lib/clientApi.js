"use client";

export function getProductImageUrl(image) {
  if (!image) return "";
  if (typeof image === "string") return image;
  return image.url || image.secure_url || "";
}

export function getVariantProductImageUrl(product, variant) {
  return (
    getProductImageUrl(variant?.images?.[0]) ||
    getProductImageUrl(variant?.image) ||
    getProductImageUrl(product?.images?.[0])
  );
}

export function getVariantProductGalleryUrls(product, variant) {
  const variantImages = (variant?.images || []).map(getProductImageUrl).filter(Boolean);
  if (variantImages.length) return Array.from(new Set(variantImages));

  return Array.from(
    new Set(
      [
        getProductImageUrl(variant?.image),
        ...((product?.images || []).map(getProductImageUrl).filter(Boolean)),
      ].filter(Boolean)
    )
  );
}

async function requestJson(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  let body = null;

  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok || body?.success === false) {
    const message =
      body?.error?.message || `Request failed with status ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.code = body?.error?.code || "";
    error.details = body?.error?.details;
    throw error;
  }

  return body?.data ?? body;
}

function jsonOptions(method, body) {
  return {
    method,
    body: JSON.stringify(body || {}),
  };
}

export async function fetchProducts({ category } = {}) {
  const params = new URLSearchParams();
  if (category) params.set("category", category);

  const data = await requestJson(`/api/products${params.toString() ? `?${params}` : ""}`);
  return data?.products || [];
}

export async function fetchProductBySlug(slug) {
  const data = await requestJson(`/api/products/slug/${encodeURIComponent(slug)}`);
  return data?.product || null;
}

export async function fetchRelatedProducts(productId) {
  if (!productId) return [];

  const data = await requestJson(
    `/api/products/${encodeURIComponent(productId)}/related`
  );
  return data?.products || [];
}

export async function fetchCurrentUser() {
  try {
    const data = await requestJson("/api/auth/me");
    return data?.user || null;
  } catch (error) {
    if (/unauthorized|unauthenticated|not authenticated|login|sign in/i.test(error.message)) {
      return null;
    }
    throw error;
  }
}

export async function sendLoginOtp(phone) {
  return requestJson("/api/auth/send-otp", jsonOptions("POST", { phone }));
}

export async function verifyLoginOtp({ phone, otp }) {
  const data = await requestJson(
    "/api/auth/verify-otp",
    jsonOptions("POST", { phone, otp })
  );
  return data?.user || null;
}

export async function verifyPhoneOtp({ phone, otp }) {
  return requestJson(
    "/api/auth/verify-phone-otp",
    jsonOptions("POST", { phone, otp })
  );
}

export async function updateCurrentUser(updates) {
  const data = await requestJson("/api/auth/me", jsonOptions("PATCH", updates));
  return data?.user || null;
}

export async function logoutCurrentUser() {
  return requestJson("/api/auth/logout", jsonOptions("POST"));
}

export async function validateCoupon({ items, couponCode }) {
  return requestJson(
    "/api/coupons/validate",
    jsonOptions("POST", { items, couponCode })
  );
}

export async function checkShippingServiceability({ pincode, cod = false, items = [] }) {
  return requestJson(
    "/api/shipping/serviceability",
    jsonOptions("POST", { pincode, cod, items })
  );
}

export async function fetchStoreSettings() {
  return requestJson("/api/store-settings", {
    cache: "no-store",
  });
}

export async function fetchHomepageSettings() {
  return requestJson("/api/homepage-settings", {
    cache: "no-store",
  });
}

export async function placeCodOrder({
  items,
  address,
  phone,
  phoneVerificationToken,
  couponCode,
}) {
  const data = await requestJson(
    "/api/checkout/cod",
    jsonOptions("POST", {
      items,
      address,
      phone,
      phoneVerificationToken,
      couponCode,
    })
  );
  return data?.order || null;
}

export async function createRazorpayCheckout({
  items,
  address,
  phone,
  phoneVerificationToken,
  couponCode,
}) {
  return requestJson(
    "/api/checkout/razorpay/create",
    jsonOptions("POST", {
      items,
      address,
      phone,
      phoneVerificationToken,
      couponCode,
    })
  );
}

export async function verifyRazorpayCheckout(payload) {
  const data = await requestJson(
    "/api/checkout/razorpay/verify",
    jsonOptions("POST", payload)
  );
  return data?.order || null;
}

export async function fetchMyOrders() {
  const data = await requestJson("/api/orders/my-orders");
  return data?.orders || [];
}

export async function fetchOrder(orderId) {
  const data = await requestJson(`/api/orders/${encodeURIComponent(orderId)}`);
  return data?.order || null;
}

export async function cancelCustomerOrder(orderId, reason) {
  const data = await requestJson(
    `/api/orders/${encodeURIComponent(orderId)}/cancel`,
    jsonOptions("POST", { reason })
  );
  return data?.order || null;
}

export async function fetchOrderTracking(orderId) {
  return requestJson(`/api/shipping/tracking?orderId=${encodeURIComponent(orderId)}`);
}

export async function fetchProductReviews(productId) {
  const data = await requestJson(`/api/reviews/product/${encodeURIComponent(productId)}`);
  return {
    reviews: data?.reviews || [],
    rating: data?.rating || { average: 0, count: 0, breakdown: {} },
  };
}

export async function fetchMyProductReview(productId) {
  const data = await requestJson(`/api/reviews?productId=${encodeURIComponent(productId)}`);
  return data?.review || null;
}

export async function createProductReview({ productId, rating, title, text, photos = [] }) {
  const data = await requestJson(
    "/api/reviews",
    jsonOptions("POST", { productId, rating, title, text, photos })
  );
  return data?.review || null;
}

export async function updateProductReview(reviewId, { rating, title, text, photos = [] }) {
  const data = await requestJson(
    `/api/reviews/${encodeURIComponent(reviewId)}`,
    jsonOptions("PATCH", { rating, title, text, photos })
  );
  return data?.review || null;
}

export async function deleteProductReview(reviewId) {
  return requestJson(
    `/api/reviews/${encodeURIComponent(reviewId)}`,
    jsonOptions("DELETE")
  );
}
