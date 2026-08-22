const SHIPROCKET_BASE_URL = "https://apiv2.shiprocket.in/v1/external";

function hasShiprocketConfig() {
  return Boolean(process.env.SHIPROCKET_EMAIL && process.env.SHIPROCKET_PASSWORD);
}

async function shiprocketFetch(path, options = {}) {
  if (!hasShiprocketConfig()) {
    const error = new Error("Shiprocket is not configured");
    error.code = "SHIPROCKET_NOT_CONFIGURED";
    throw error;
  }

  const token = await getShiprocketToken();
  const response = await fetch(`${SHIPROCKET_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data?.message || "Shiprocket request failed");
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

let tokenCache = {
  token: "",
  expiresAt: 0,
};

export async function getShiprocketToken() {
  if (!hasShiprocketConfig()) {
    throw new Error("Shiprocket is not configured");
  }

  if (tokenCache.token && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.token;
  }

  const response = await fetch(`${SHIPROCKET_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: process.env.SHIPROCKET_EMAIL,
      password: process.env.SHIPROCKET_PASSWORD,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.token) {
    throw new Error(data?.message || "Shiprocket authentication failed");
  }

  tokenCache = {
    token: data.token,
    expiresAt: Date.now() + 9 * 24 * 60 * 60 * 1000,
  };

  return tokenCache.token;
}

export async function checkServiceability({ deliveryPincode, cod = false }) {
  if (!/^\d{6}$/.test(String(deliveryPincode || ""))) {
    return {
      serviceable: false,
      code: "INVALID_PINCODE",
      message: "Invalid pincode",
    };
  }

  const pickupPostcode = process.env.SHIPROCKET_PICKUP_PINCODE;
  if (!pickupPostcode) {
    throw new Error("SHIPROCKET_PICKUP_PINCODE is not configured");
  }

  const params = new URLSearchParams({
    pickup_postcode: pickupPostcode,
    delivery_postcode: deliveryPincode,
    cod: cod ? "1" : "0",
    weight: "0.5",
  });

  const data = await shiprocketFetch(`/courier/serviceability/?${params.toString()}`);
  const couriers = data?.data?.available_courier_companies || [];

  if (!couriers.length) {
    return {
      serviceable: false,
      code: "UNSERVICEABLE",
      message: "This pincode is valid but not serviceable right now",
    };
  }

  return {
    serviceable: true,
    code: "SERVICEABLE",
    couriers: couriers.slice(0, 5).map((courier) => ({
      courierName: courier.courier_name,
      rate: courier.rate,
      estimatedDeliveryDays: courier.estimated_delivery_days,
      cod: Boolean(courier.cod),
    })),
  };
}

export async function createShiprocketOrder(order) {
  const payload = {
    order_id: order.orderNumber,
    order_date: order.createdAt?.toISOString().slice(0, 10) || new Date().toISOString().slice(0, 10),
    pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION || "Primary",
    billing_customer_name: order.deliveryAddress.fullName,
    billing_last_name: "",
    billing_address: order.deliveryAddress.addressLine,
    billing_city: order.deliveryAddress.city,
    billing_pincode: order.deliveryAddress.pincode,
    billing_state: order.deliveryAddress.state,
    billing_country: "India",
    billing_email: order.customer.email || order.deliveryAddress.email || "customer@example.com",
    billing_phone: order.customer.phone,
    shipping_is_billing: true,
    order_items: order.items.map((item) => ({
      name: `${item.name} ${item.size}`,
      sku: `${item.productId}-${item.size}`,
      units: item.quantity,
      selling_price: item.unitPrice,
    })),
    payment_method: order.payment.method === "cod" ? "COD" : "Prepaid",
    sub_total: order.amounts.finalAmount,
    length: 10,
    breadth: 10,
    height: 10,
    weight: 0.5,
  };

  return shiprocketFetch("/orders/create/adhoc", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getTrackingByAwb(awbCode) {
  if (!awbCode) {
    return null;
  }

  return shiprocketFetch(`/courier/track/awb/${encodeURIComponent(awbCode)}`);
}
