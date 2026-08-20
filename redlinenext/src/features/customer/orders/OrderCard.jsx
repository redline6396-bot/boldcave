"use client";

import Link from "next/link";

const formatDate = (value) =>
  value
    ? new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(value))
    : "Not available";

const formatPrice = (value) =>
  `\u20b9${new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)}`;

const labelize = (value) =>
  String(value || "pending")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const getOrderId = (order) => order._id || order.id || order.orderNumber;

const getPaymentMethodLabel = (method) => {
  const normalized = String(method || "").toLowerCase();
  if (normalized === "cod") return "COD";
  if (normalized === "razorpay") return "Razorpay";
  return labelize(method || "Payment");
};

const getPaymentStatusLabel = (status, method) => {
  const normalizedStatus = String(status || "").toLowerCase();
  const normalizedMethod = String(method || "").toLowerCase();

  if (normalizedStatus === "cod" && normalizedMethod === "cod") {
    return "Pending";
  }

  return labelize(status || "pending");
};

const getLineTotal = (item) =>
  (Number(item.unitPrice) || 0) * (Number(item.quantity) || 0);

const hasTracking = (order) =>
  Boolean(order.shiprocket?.trackingUrl || order.shiprocket?.awbCode);

export default function OrderCard({ order }) {
  const orderId = getOrderId(order);
  const items = order.items || [];
  const paymentMethod = getPaymentMethodLabel(order.payment?.method);
  const paymentStatus = getPaymentStatusLabel(
    order.payment?.paymentStatus,
    order.payment?.method
  );
  const trackingAvailable = hasTracking(order);

  return (
    <article className="border border-neutral-200 bg-white px-4 py-4 sm:px-6 sm:py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="break-all text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-950">
            {order.orderNumber || orderId}
          </p>
          <p className="mt-1.5 text-[12px] text-neutral-500">
            {formatDate(order.createdAt)}
          </p>
        </div>

        <div className="text-left sm:text-right">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-950">
            {labelize(order.orderStatus)}
          </p>
          <p className="mt-1.5 text-[11px] uppercase tracking-[0.08em] text-neutral-500">
            {paymentMethod} {"\u00b7"} {paymentStatus}
          </p>
        </div>
      </div>

      <div className="mt-5 divide-y divide-neutral-100 border-t border-neutral-200 sm:mt-6">
        {items.map((item) => (
          <div
            key={`${item.productId}-${item.size}`}
            className="grid grid-cols-[50px_minmax(0,1fr)] gap-x-4 gap-y-1 py-4 sm:grid-cols-[56px_minmax(0,1fr)_auto]"
          >
            <div className="aspect-square border border-neutral-200 bg-neutral-50">
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.name}
                  className="h-full w-full object-contain"
                />
              ) : null}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold uppercase tracking-[0.04em] text-neutral-950 sm:text-[14px]">
                {item.name}
              </p>
              <p className="mt-1.5 text-[11px] uppercase tracking-[0.07em] text-neutral-500">
                {item.size} / Qty {item.quantity}
              </p>
            </div>
            <p className="col-start-2 self-start text-[12px] font-semibold text-neutral-950 sm:col-start-auto sm:text-right sm:text-[13px]">
              {formatPrice(getLineTotal(item))}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-1 flex items-center justify-between gap-4 border-t border-neutral-200 pt-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
          Total
        </p>
        <p className="text-[14px] font-semibold text-neutral-950">
          {formatPrice(order.amounts?.finalAmount)}
        </p>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <Link
          href={`/orders/${encodeURIComponent(orderId)}`}
          className="inline-flex cursor-pointer items-center text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-950 underline underline-offset-4"
        >
          View Details
        </Link>

        {trackingAvailable ? (
          <Link
            href={`/orders/${encodeURIComponent(orderId)}`}
            className="inline-flex cursor-pointer items-center text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-950 transition-opacity hover:opacity-65"
          >
            Track Order -&gt;
          </Link>
        ) : (
          <p className="text-[11px] leading-5 text-neutral-500 sm:text-right">
            Tracking available after shipment
          </p>
        )}
      </div>
    </article>
  );
}

export { formatDate, formatPrice, labelize };
