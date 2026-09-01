"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Copy } from "lucide-react";
import { getOrderShippingSummary } from "@/lib/shipping/summary";

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

const getOrderId = (order) => order._id || order.id || order.orderNumber;

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

  return labelize(status || "pending");
};

const getLineTotal = (item) =>
  (Number(item.unitPrice) || 0) * (Number(item.quantity) || 0);

const hasTracking = (order) => {
  const shipping = getOrderShippingSummary(order);
  return Boolean(shipping.trackingUrl || shipping.awbCode);
};

const getItemCount = (items = []) =>
  items.reduce((total, item) => total + (Number(item.quantity) || 0), 0);

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

function CopyOrderIdButton({ orderId }) {
  const [copyState, setCopyState] = useState("");

  useEffect(() => {
    if (!copyState) return undefined;
    const timeout = window.setTimeout(() => setCopyState(""), 1400);
    return () => window.clearTimeout(timeout);
  }, [copyState]);

  const copyOrderId = async () => {
    try {
      await navigator.clipboard.writeText(orderId);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  };

  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={copyOrderId}
        className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-950"
        aria-label="Copy order ID"
        title="Copy order ID"
      >
        {copyState === "copied" ? (
          <Check className="h-3.5 w-3.5" strokeWidth={1.8} />
        ) : (
          <Copy className="h-3.5 w-3.5" strokeWidth={1.7} />
        )}
      </button>
      {copyState && (
        <span className="text-[10px] font-medium text-neutral-500">
          {copyState === "copied" ? "Copied" : "Copy failed"}
        </span>
      )}
    </span>
  );
}

export default function OrderCard({ order }) {
  const orderId = getOrderId(order);
  const displayOrderId = order.orderNumber || orderId;
  const items = order.items || [];
  const itemCount = getItemCount(items);
  const orderStatus = String(order.orderStatus || "confirmed").toLowerCase();
  const isCancelledOrder = orderStatus === "cancelled";

  const paymentMethod = getPaymentMethodLabel(order.payment?.method);
  const paymentStatus = getPaymentStatusLabel(
    order.payment?.paymentStatus,
    order.payment?.method
  );

  const trackingAvailable = hasTracking(order);

  return (
    <article className="w-full max-w-[900px] overflow-hidden rounded-[9px] border border-neutral-200 bg-white">
      <header className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5 sm:py-5">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
            <p className="break-all text-[13px] font-semibold text-neutral-950 sm:text-[14px]">
              {displayOrderId}
            </p>
            <CopyOrderIdButton orderId={displayOrderId} />
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-neutral-500 sm:text-[12px]">
            <span>{formatDate(order.createdAt)}</span>
            <span aria-hidden="true">·</span>
            <span>
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <span
            className={[
              "inline-flex h-7 items-center rounded-full border px-3 text-[10px] font-semibold uppercase tracking-[0.08em]",
              getStatusClass(orderStatus),
            ].join(" ")}
          >
            {labelize(orderStatus)}
          </span>

          <span className="text-[11px] text-neutral-500">
            {paymentMethod} · {paymentStatus}
          </span>
        </div>
      </header>

      <div className="border-t border-neutral-200 px-4 sm:px-5">
        <div className="divide-y divide-neutral-100">
          {items.map((item, index) => (
            <div
              key={`${item.productId}-${item.size}-${index}`}
              className="grid grid-cols-[58px_minmax(0,1fr)_auto] items-center gap-3 py-3.5 sm:grid-cols-[64px_minmax(0,1fr)_auto] sm:gap-4 sm:py-4"
            >
              <div className="h-[58px] w-[58px] overflow-hidden border border-neutral-200 bg-neutral-50 sm:h-16 sm:w-16">
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

              <p className="self-start whitespace-nowrap pt-0.5 text-right text-[12px] font-semibold text-neutral-950 sm:text-[13px]">
                {formatPrice(getLineTotal(item))}
              </p>
            </div>
          ))}
        </div>
      </div>

      <footer className="border-t border-neutral-200 bg-neutral-50/60 px-4 py-4 sm:px-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-neutral-500">
              Order Total
            </p>
            <p className="mt-1 text-[16px] font-semibold text-neutral-950">
              {formatPrice(order.amounts?.finalAmount)}
            </p>
          </div>

          <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center sm:gap-4">
            {trackingAvailable && !isCancelledOrder ? (
              <Link
                href={`/orders/${encodeURIComponent(orderId)}#order-tracking`}
                className="cursor-pointer text-[11px] font-medium text-neutral-600 transition-colors hover:text-neutral-950"
              >
                Track order
              </Link>
            ) : !isCancelledOrder ? (
              <span className="hidden text-[10px] text-neutral-400 sm:inline">
                Tracking after dispatch
              </span>
            ) : null}

            <Link
              href={`/orders/${encodeURIComponent(orderId)}`}
              className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-[6px] bg-neutral-950 px-4 text-[11px] font-semibold text-white transition-opacity hover:opacity-90"
            >
              View details
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.8} />
            </Link>
          </div>
        </div>
      </footer>
    </article>
  );
}

export { formatDate, formatPrice, labelize };
