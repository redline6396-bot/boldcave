"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { fetchOrder, fetchOrderTracking } from "@/lib/clientApi";

const ordersHref = "/profile?section=orders";

const formatDate = (value) =>
  value
    ? new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(value))
    : "Not available";

const formatPrice = (value) =>
  `₹${new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)}`;

const labelize = (value) =>
  String(value || "pending")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const getOrderId = (order) => order?._id || order?.id || order?.orderNumber;

const getLineTotal = (item) =>
  (Number(item?.unitPrice) || 0) * (Number(item?.quantity) || 0);

const getPaymentMethodLabel = (method) => {
  const normalized = String(method || "").toLowerCase();
  if (normalized === "cod") return "Cash on Delivery";
  if (normalized === "razorpay") return "Razorpay";
  return labelize(method || "Payment");
};

const getPaymentStatusLabel = (status, method) => {
  const normalizedStatus = String(status || "").toLowerCase();
  const normalizedMethod = String(method || "").toLowerCase();

  if (
    normalizedMethod === "cod" &&
    ["cod", "pending"].includes(normalizedStatus)
  ) {
    return "Pay on delivery";
  }

  if (normalizedStatus === "paid") return "Paid";
  if (normalizedStatus === "failed") return "Failed";

  return labelize(status || "Pending");
};

function getOrderStatus(order) {
  const paymentStatus = String(
    order?.payment?.paymentStatus || ""
  ).toLowerCase();

  if (
    order?.payment?.method === "razorpay" &&
    paymentStatus === "failed"
  ) {
    return "failed";
  }

  return String(order?.orderStatus || "confirmed").toLowerCase();
}

function getStatusMessage(status) {
  const normalized = String(status || "").toLowerCase();

  if (normalized === "confirmed") {
    return "Your order has been placed successfully.";
  }
  if (normalized === "processing") {
    return "Your order is being prepared for dispatch.";
  }
  if (normalized === "shipped") {
    return "Your order is on the way.";
  }
  if (normalized === "in_transit") {
    return "Your order is moving through the courier network.";
  }
  if (normalized === "out_for_delivery") {
    return "Your order is out for delivery.";
  }
  if (normalized === "delivered") {
    return "Your order has been delivered.";
  }
  if (normalized === "cancelled") {
    return "This order has been cancelled.";
  }
  if (normalized === "failed") {
    return "This order could not be completed.";
  }

  return "We will update this as your order moves forward.";
}

function getStatusClass(status) {
  const normalized = String(status || "").toLowerCase();

  if (["cancelled", "failed"].includes(normalized)) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (normalized === "delivered") {
    return "border-neutral-300 bg-white text-neutral-950";
  }

  return "border-neutral-950 bg-neutral-950 text-white";
}

function formatAddressLine(...parts) {
  return parts.filter(Boolean).join(", ");
}

function getItemMrp(item) {
  const candidates = [item?.mrp, item?.mrpPrice, item?.originalPrice];
  const value = candidates
    .map((candidate) => Number(candidate))
    .find((candidate) => Number.isFinite(candidate) && candidate > 0);

  return value || 0;
}

function getMrpInfo(items = []) {
  if (!items.length) {
    return { complete: false, total: 0 };
  }

  let total = 0;

  for (const item of items) {
    const mrp = getItemMrp(item);

    if (!mrp) {
      return { complete: false, total: 0 };
    }

    total += mrp * (Number(item.quantity) || 0);
  }

  return { complete: true, total };
}

export default function OrderDetails() {
  const params = useParams();
  const orderId = params?.orderId;
  const { loading: authLoading, isAuthenticated, openAuth } = useAuth();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [priceDetailsOpen, setPriceDetailsOpen] = useState(false);

  const loadOrder = useCallback(() => {
    if (!isAuthenticated || !orderId) return;

    let active = true;
    setLoading(true);
    setError("");

    fetchOrder(orderId)
      .then((result) => {
        if (!active) return;

        setOrder(result);

        if (!result?.shiprocket?.awbCode) {
          return;
        }

        fetchOrderTracking(orderId)
          .then((tracking) => {
            if (!active) return;

            setOrder((current) => {
              if (!current) return current;

              return {
                ...current,
                orderStatus: tracking?.orderStatus || current.orderStatus,
                shiprocket: {
                  ...(current.shiprocket || {}),
                  shipmentStatus:
                    tracking?.status ||
                    current.shiprocket?.shipmentStatus ||
                    "",
                  trackingUrl:
                    tracking?.trackingUrl ||
                    current.shiprocket?.trackingUrl ||
                    "",
                },
              };
            });
          })
          .catch(() => {
            // Live tracking refresh should not block viewing the saved order.
          });
      })
      .catch((orderError) => {
        if (!active) return;

        if (orderError.status === 404) {
          setError("Order not found.");
        } else if (orderError.status === 403) {
          setError("You do not have access to this order.");
        } else {
          setError("We could not load this order right now.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isAuthenticated, orderId]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      openAuth(`/orders/${orderId || ""}`);
    }
  }, [authLoading, isAuthenticated, openAuth, orderId]);

  useEffect(() => loadOrder(), [loadOrder]);

  if (authLoading || loading) {
    return <OrderDetailsSkeleton />;
  }

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-white px-5 py-16 text-center text-neutral-950">
        <h1 className="text-[24px] font-semibold">Login Required</h1>
        <button
          type="button"
          onClick={() => openAuth(`/orders/${orderId || ""}`)}
          className="mt-7 h-11 cursor-pointer rounded-[6px] bg-neutral-950 px-7 text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
        >
          Login
        </button>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="min-h-screen bg-white px-5 py-12 text-neutral-950 sm:px-7">
        <div className="mx-auto max-w-[760px]">
          <Link
            href={ordersHref}
            className="inline-flex cursor-pointer items-center gap-2 text-[12px] font-medium text-neutral-600 transition-colors hover:text-neutral-950"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.7} />
            Back to Orders
          </Link>

          <div className="mt-8 rounded-[9px] border border-neutral-200 p-6 sm:p-8">
            <h1 className="text-[24px] font-semibold">
              {error || "Order not found."}
            </h1>

            {error && error !== "Order not found." && (
              <button
                type="button"
                onClick={loadOrder}
                className="mt-5 cursor-pointer text-[12px] font-semibold underline underline-offset-4"
              >
                Retry
              </button>
            )}
          </div>
        </div>
      </main>
    );
  }

  const address = order.deliveryAddress || {};
  const customer = order.customer || {};
  const items = order.items || [];
  const status = getOrderStatus(order);

  const subtotal = Number(order.amounts?.subtotal) || 0;
  const discount = Number(order.amounts?.discount) || 0;
  const finalAmount = Number(order.amounts?.finalAmount) || 0;

  const trackingUrl = order.shiprocket?.trackingUrl;
  const awbCode = order.shiprocket?.awbCode;
  const courierName = order.shiprocket?.courierName;
  const shipmentStatus = order.shiprocket?.shipmentStatus;

  const totalUnits = items.reduce(
    (total, item) => total + (Number(item.quantity) || 0),
    0
  );

  const mrpInfo = getMrpInfo(items);

  const productDiscount =
    mrpInfo.complete && mrpInfo.total > subtotal
      ? mrpInfo.total - subtotal
      : 0;

  return (
    <main className="min-h-screen bg-[#f5f5f5] px-3 py-5 text-neutral-950 sm:px-5 sm:py-7 lg:px-7 lg:py-8">
      <div className="mx-auto w-full max-w-[1040px]">
        <Link
          href={ordersHref}
          className="inline-flex cursor-pointer items-center gap-2 text-[12px] font-medium text-neutral-600 transition-colors hover:text-neutral-950"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.7} />
          Back to Orders
        </Link>

        <section className="mt-5 rounded-[10px] border border-neutral-200 bg-white p-4 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-neutral-500">
                Order Details
              </p>

              <h1 className="mt-1.5 break-all text-[20px] font-semibold leading-tight sm:text-[24px]">
                {order.orderNumber || getOrderId(order)}
              </h1>

              <p className="mt-1.5 text-[12px] text-neutral-500">
                Placed on {formatDate(order.createdAt)} · {totalUnits}{" "}
                {totalUnits === 1 ? "item" : "items"}
              </p>
            </div>

            <span
              className={[
                "inline-flex h-8 w-fit items-center rounded-full border px-3 text-[10px] font-semibold uppercase tracking-[0.08em]",
                getStatusClass(status),
              ].join(" ")}
            >
              {labelize(status)}
            </span>
          </div>

          <div className="mt-5 grid gap-4 border-t border-neutral-200 pt-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div>
              <p className="text-[13px] font-semibold text-neutral-950">
                {labelize(status)}
              </p>

              <p className="mt-1 text-[12px] leading-5 text-neutral-500">
                {getStatusMessage(status)}
              </p>

              {!trackingUrl && !awbCode && (
                <p className="mt-1 text-[11px] text-neutral-400">
                  Tracking will be available after dispatch.
                </p>
              )}
            </div>

            {trackingUrl && (
              <a
                href={trackingUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 w-fit cursor-pointer items-center justify-center gap-2 rounded-[6px] bg-neutral-950 px-4 text-[11px] font-semibold text-white transition-opacity hover:opacity-90"
              >
                Track shipment
                <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.7} />
              </a>
            )}
          </div>
        </section>

        <section className="mt-4 overflow-hidden rounded-[10px] border border-neutral-200 bg-white">
          <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6">
            <h2 className="text-[14px] font-semibold">Items</h2>

            <span className="text-[11px] text-neutral-500">
              {totalUnits} {totalUnits === 1 ? "item" : "items"}
            </span>
          </div>

          <div className="border-t border-neutral-200 px-4 sm:px-6">
            <div className="divide-y divide-neutral-100">
              {items.map((item, index) => (
                <div
                  key={`${item.productId}-${item.size}-${index}`}
                  className="grid grid-cols-[60px_minmax(0,1fr)_auto] items-center gap-3 py-3.5 sm:grid-cols-[68px_minmax(0,1fr)_auto] sm:gap-4 sm:py-4"
                >
                  <div className="h-[60px] w-[60px] overflow-hidden border border-neutral-200 bg-neutral-50 sm:h-[68px] sm:w-[68px]">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-full w-full object-contain"
                      />
                    ) : null}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-neutral-950 sm:text-[14px]">
                      {item.name}
                    </p>

                    <p className="mt-1 text-[11px] text-neutral-500">
                      {item.productType === "combo"
                        ? "Perfume Combo"
                        : item.size || "Variant"}{" "}
                      · Qty {item.quantity}
                    </p>

                    {item.productType === "combo" &&
                      item.comboItems?.length > 0 && (
                        <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-neutral-500 sm:text-[11px]">
                          Includes{" "}
                          {item.comboItems
                            .map(
                              (entry) =>
                                `${entry.name} ${entry.size} × ${entry.quantity}`
                            )
                            .join(", ")}
                        </p>
                      )}
                  </div>

                  <p className="self-start whitespace-nowrap pt-0.5 text-right text-[12px] font-semibold sm:text-[13px]">
                    {formatPrice(getLineTotal(item))}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <section className="rounded-[10px] border border-neutral-200 bg-white p-4 sm:p-5">
            <h2 className="text-[13px] font-semibold">
              Delivery Address
            </h2>

            <div className="mt-4 text-[13px] leading-6 text-neutral-600">
              <p className="font-semibold text-neutral-950">
                {address.fullName ||
                  [customer.firstName, customer.lastName]
                    .filter(Boolean)
                    .join(" ") ||
                  "Customer"}
              </p>

              {address.addressLine && (
                <p className="mt-2">{address.addressLine}</p>
              )}

              {(address.city || address.state || address.pincode) && (
                <p>
                  {formatAddressLine(address.city, address.state)}
                  {address.pincode ? ` ${address.pincode}` : ""}
                </p>
              )}

              <div className="mt-3 space-y-0.5 text-neutral-500">
                {customer.phone && <p>+91 {customer.phone}</p>}
                {address.email && <p>{address.email}</p>}
                {address.type && <p>{address.type}</p>}
              </div>
            </div>
          </section>

          <section className="rounded-[10px] border border-neutral-200 bg-white p-4 sm:p-5">
            <h2 className="text-[13px] font-semibold">Payment</h2>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
              <InfoBlock
                label="Method"
                value={getPaymentMethodLabel(order.payment?.method)}
              />

              <InfoBlock
                label="Status"
                value={getPaymentStatusLabel(
                  order.payment?.paymentStatus,
                  order.payment?.method
                )}
              />
            </div>
          </section>
        </div>

        <section className="mt-4 rounded-[10px] border border-neutral-200 bg-white p-4 sm:p-5">
          <h2 className="text-[13px] font-semibold">Order Summary</h2>

          <div className="mt-4 max-w-[520px] space-y-3 text-[13px]">
            <SummaryRow label="Subtotal" value={formatPrice(subtotal)} />
            <SummaryRow label="Shipping" value="FREE" />

            <div className="border-t border-neutral-200 pt-3">
              <SummaryRow
                label="Total"
                value={formatPrice(finalAmount)}
                strong
              />
            </div>
          </div>

          <div className="mt-4 max-w-[520px] border-t border-neutral-200 pt-4">
            <button
              type="button"
              onClick={() => setPriceDetailsOpen((current) => !current)}
              className="inline-flex cursor-pointer items-center gap-2 text-[11px] font-semibold text-neutral-700 transition-colors hover:text-neutral-950"
            >
              {priceDetailsOpen
                ? "Hide price details"
                : "View price details"}

              {priceDetailsOpen ? (
                <ChevronUp className="h-4 w-4" strokeWidth={1.7} />
              ) : (
                <ChevronDown className="h-4 w-4" strokeWidth={1.7} />
              )}
            </button>

            {priceDetailsOpen && (
              <div className="mt-4 space-y-3 rounded-[7px] bg-neutral-50 p-4 text-[12px]">
                {mrpInfo.complete && (
                  <SummaryRow
                    label="MRP Total"
                    value={formatPrice(mrpInfo.total)}
                  />
                )}

                {productDiscount > 0 && (
                  <SummaryRow
                    label="Product Discount"
                    value={`-${formatPrice(productDiscount)}`}
                  />
                )}

                {discount > 0 && (
                  <SummaryRow
                    label="Discount"
                    value={`-${formatPrice(discount)}`}
                  />
                )}

                {order.coupon?.code && (
                  <SummaryRow
                    label="Coupon"
                    value={order.coupon.code}
                  />
                )}

                <SummaryRow
                  label="Items Subtotal"
                  value={formatPrice(subtotal)}
                />
                <SummaryRow label="Shipping" value="FREE" />
                <SummaryRow
                  label="Payable Total"
                  value={formatPrice(finalAmount)}
                />
              </div>
            )}
          </div>
        </section>

        {(awbCode || trackingUrl) && (
          <section
            id="order-tracking"
            className="mt-4 rounded-[10px] border border-neutral-200 bg-white p-4 sm:p-5"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-[13px] font-semibold">Tracking</h2>

                <div className="mt-4 space-y-2 text-[12px] leading-5 text-neutral-600">
                  <p>
                    <span className="text-neutral-500">Status:</span>{" "}
                    <span className="font-medium text-neutral-950">
                      {labelize(shipmentStatus || order.orderStatus)}
                    </span>
                  </p>

                  {awbCode && (
                    <p>
                      <span className="text-neutral-500">AWB:</span>{" "}
                      <span className="font-medium text-neutral-950">
                        {awbCode}
                      </span>
                    </p>
                  )}

                  {courierName && (
                    <p>
                      <span className="text-neutral-500">Courier:</span>{" "}
                      <span className="font-medium text-neutral-950">
                        {courierName}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              {trackingUrl && (
                <a
                  href={trackingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 w-fit cursor-pointer items-center justify-center gap-2 rounded-[6px] bg-neutral-950 px-4 text-[11px] font-semibold text-white transition-opacity hover:opacity-90"
                >
                  Track shipment
                  <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.7} />
                </a>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function InfoBlock({ label, value }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-neutral-500">
        {label}
      </p>

      <p className="mt-1.5 text-[13px] font-semibold text-neutral-950">
        {value}
      </p>
    </div>
  );
}

function SummaryRow({ label, value, strong = false }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span
        className={
          strong
            ? "text-[13px] font-semibold text-neutral-950"
            : "text-neutral-500"
        }
      >
        {label}
      </span>

      <span
        className={
          strong
            ? "text-[16px] font-semibold text-neutral-950"
            : "font-medium text-neutral-800"
        }
      >
        {value}
      </span>
    </div>
  );
}

function OrderDetailsSkeleton() {
  return (
    <main className="min-h-screen bg-[#f5f5f5] px-3 py-5 text-neutral-950 sm:px-5 sm:py-7">
      <div className="mx-auto w-full max-w-[1040px]">
        <div className="h-4 w-28 animate-pulse bg-neutral-200" />

        <div className="mt-5 rounded-[10px] border border-neutral-200 bg-white p-5">
          <div className="h-3 w-24 animate-pulse bg-neutral-100" />
          <div className="mt-3 h-7 w-64 max-w-full animate-pulse bg-neutral-200" />
          <div className="mt-3 h-3 w-52 max-w-full animate-pulse bg-neutral-100" />

          <div className="mt-5 border-t border-neutral-200 pt-5">
            <div className="h-4 w-28 animate-pulse bg-neutral-200" />
            <div className="mt-2 h-3 w-72 max-w-full animate-pulse bg-neutral-100" />
          </div>
        </div>

        <div className="mt-4 rounded-[10px] border border-neutral-200 bg-white p-5">
          <div className="h-4 w-16 animate-pulse bg-neutral-200" />

          <div className="mt-5 flex items-center gap-4">
            <div className="h-16 w-16 animate-pulse bg-neutral-100" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-32 animate-pulse bg-neutral-200" />
              <div className="h-3 w-24 animate-pulse bg-neutral-100" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
