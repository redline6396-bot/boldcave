"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { fetchOrder } from "@/lib/clientApi";

const ordersHref = "/profile?section=orders";
const lifecycleSteps = ["confirmed", "processing", "shipped", "delivered"];

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

  if (normalizedMethod === "cod" && ["cod", "pending"].includes(normalizedStatus)) {
    return "Pay on delivery";
  }

  if (normalizedStatus === "paid") return "Paid";
  if (normalizedStatus === "failed") return "Failed";
  return labelize(status || "Pending");
};

function getOrderStatus(order) {
  const paymentStatus = String(order?.payment?.paymentStatus || "").toLowerCase();
  if (order?.payment?.method === "razorpay" && paymentStatus === "failed") {
    return "failed";
  }

  return String(order?.orderStatus || "confirmed").toLowerCase();
}

function formatAddressLine(...parts) {
  return parts.filter(Boolean).join(", ");
}

export default function OrderDetails() {
  const params = useParams();
  const orderId = params?.orderId;
  const { loading: authLoading, isAuthenticated, openAuth } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadOrder = useCallback(() => {
    if (!isAuthenticated || !orderId) return;

    let active = true;
    setLoading(true);
    setError("");

    fetchOrder(orderId)
      .then((result) => {
        if (active) setOrder(result);
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
          className="mt-7 h-11 cursor-pointer border border-neutral-950 bg-neutral-950 px-7 text-[12px] font-semibold uppercase tracking-[0.09em] text-white transition-colors hover:bg-white hover:text-neutral-950"
        >
          Login
        </button>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="min-h-screen bg-white px-5 py-16 text-neutral-950">
        <div className="mx-auto max-w-[760px]">
          <Link
            href={ordersHref}
            className="inline-flex cursor-pointer items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-600 transition-colors hover:text-neutral-950"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.7} />
            Back to Orders
          </Link>
          <div className="mt-10 border-t border-neutral-200 pt-8">
            <h1 className="text-[24px] font-semibold">
              {error || "Order not found."}
            </h1>
            {error && error !== "Order not found." && (
              <button
                type="button"
                onClick={loadOrder}
                className="mt-5 cursor-pointer text-[11px] font-semibold uppercase tracking-[0.1em] underline underline-offset-4"
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
  const status = getOrderStatus(order);
  const subtotal = Number(order.amounts?.subtotal) || 0;
  const discount = Number(order.amounts?.discount) || 0;
  const finalAmount = Number(order.amounts?.finalAmount) || 0;
  const hasSummaryBreakdown =
    discount > 0 || Boolean(order.coupon?.code) || subtotal !== finalAmount;
  const trackingUrl = order.shiprocket?.trackingUrl;
  const awbCode = order.shiprocket?.awbCode;
  const courierName = order.shiprocket?.courierName;
  const shipmentStatus = order.shiprocket?.shipmentStatus;

  return (
    <main className="min-h-screen bg-white px-5 py-8 text-neutral-950 sm:px-7 sm:py-10 lg:px-10">
      <div className="mx-auto max-w-[980px]">
        <Link
          href={ordersHref}
          className="inline-flex cursor-pointer items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-600 transition-colors hover:text-neutral-950"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.7} />
          Back to Orders
        </Link>

        <header className="mt-7 border-b border-neutral-200 pb-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <h1 className="text-[30px] font-semibold leading-none sm:text-[36px]">
              Order Details
            </h1>
            <div className="grid gap-3 text-[13px] sm:grid-cols-2 sm:gap-8 sm:pb-0.5 sm:text-right">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
                  Order ID
                </p>
                <p className="mt-1 break-words text-neutral-700">
                  #{order.orderNumber || getOrderId(order)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
                  Date
                </p>
                <p className="mt-1 text-neutral-700">
                  {formatDate(order.createdAt)}
                </p>
              </div>
            </div>
          </div>
        </header>

        <OrderStatus status={status} trackingUrl={trackingUrl} />

        <Section title="Items">
          <div className="space-y-1">
            {(order.items || []).map((item) => (
              <div
                key={`${item.productId}-${item.size}`}
                className="grid grid-cols-[56px_minmax(0,1fr)] gap-x-4 gap-y-1 py-3.5 sm:grid-cols-[64px_minmax(0,1fr)_auto] sm:gap-5"
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
                  <p className="truncate text-[13px] font-semibold uppercase tracking-[0.04em] sm:text-[14px]">
                    {item.name}
                  </p>
                  <p className="mt-1.5 text-[11px] uppercase tracking-[0.07em] text-neutral-500">
                    {item.size} / Qty {item.quantity}
                  </p>
                </div>
                <p className="col-start-2 self-start whitespace-nowrap text-[13px] font-semibold sm:col-start-auto sm:text-right sm:text-[14px]">
                  {formatPrice(getLineTotal(item))}
                </p>
              </div>
            ))}
          </div>
        </Section>

        <section className="grid gap-8 border-b border-neutral-200 py-7 md:grid-cols-[minmax(0,1fr)_minmax(0,0.75fr)] md:gap-12">
          <div>
            <SectionHeading>Delivery Address</SectionHeading>
            <div className="mt-4 text-[14px] leading-6 text-neutral-600">
              <p className="font-semibold text-neutral-950">
                {address.fullName || [customer.firstName, customer.lastName].filter(Boolean).join(" ") || "Customer"}
              </p>
              <div className="mt-3 space-y-1">
                {address.addressLine && <p>{address.addressLine}</p>}
                <p>
                  {formatAddressLine(address.city, address.state)}
                  {address.pincode ? ` ${address.pincode}` : ""}
                </p>
              </div>
              <div className="mt-3 space-y-1 text-neutral-500">
                {customer.phone && <p>+91 {customer.phone}</p>}
                {address.email && <p>{address.email}</p>}
                {address.type && <p>{address.type}</p>}
              </div>
            </div>
          </div>

          <div>
            <SectionHeading>Payment</SectionHeading>
            <div className="mt-4 space-y-5">
              <InfoBlock
                label="Method"
                value={getPaymentMethodLabel(order.payment?.method)}
              />
              <InfoBlock
                label="Payment"
                value={getPaymentStatusLabel(
                  order.payment?.paymentStatus,
                  order.payment?.method
                )}
              />
            </div>
          </div>
        </section>

        <Section title="Order Summary">
          <div className="max-w-[460px] space-y-3.5 text-[14px]">
            {hasSummaryBreakdown && (
              <>
                <SummaryRow label="Subtotal" value={formatPrice(subtotal)} />
                {discount > 0 && (
                  <SummaryRow label="Discount" value={`-${formatPrice(discount)}`} />
                )}
                {order.coupon?.code && (
                  <SummaryRow label="Coupon" value={order.coupon.code} />
                )}
              </>
            )}
            <div className={hasSummaryBreakdown ? "border-t border-neutral-200 pt-3.5" : ""}>
              <SummaryRow
                label="Total"
                value={formatPrice(finalAmount)}
                strong
              />
            </div>
          </div>
        </Section>

        <Section title="Tracking" id="order-tracking">
          {awbCode ? (
            <div className="max-w-[520px] space-y-3 text-[14px] leading-6 text-neutral-600">
              <p>
                <span className="text-neutral-500">Status:</span>{" "}
                <span className="font-semibold text-neutral-950">
                  {labelize(shipmentStatus || order.orderStatus)}
                </span>
              </p>
              <p>
                <span className="text-neutral-500">AWB:</span>{" "}
                <span className="font-semibold text-neutral-950">{awbCode}</span>
              </p>
              {courierName && (
                <p>
                  <span className="text-neutral-500">Courier:</span>{" "}
                  <span className="font-semibold text-neutral-950">{courierName}</span>
                </p>
              )}
              {trackingUrl && (
                <a
                  href={trackingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex cursor-pointer items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-950 transition-opacity hover:opacity-65"
                >
                  Track Shipment
                  <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.7} />
                </a>
              )}
            </div>
          ) : (
            <p className="max-w-[520px] text-[14px] leading-6 text-neutral-500">
              Tracking will be available once your order is shipped.
            </p>
          )}
        </Section>
      </div>
    </main>
  );
}

function OrderStatus({ status, trackingUrl }) {
  const normalizedStatus = String(status || "").toLowerCase();
  const trackHref = trackingUrl || "#order-tracking";
  const trackProps = trackingUrl
    ? { target: "_blank", rel: "noreferrer" }
    : {};

  if (!lifecycleSteps.includes(normalizedStatus)) {
    return (
      <section className="flex flex-col gap-4 border-b border-neutral-200 py-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <SectionHeading>Order Status</SectionHeading>
          <p className="mt-3 text-[18px] font-semibold text-neutral-950">
            {labelize(normalizedStatus)}
          </p>
        </div>
        <a
          href={trackHref}
          {...trackProps}
          className="inline-flex h-10 w-full cursor-pointer items-center justify-center border border-neutral-950 bg-neutral-950 px-5 text-[11px] font-semibold uppercase tracking-[0.1em] text-white transition-colors hover:bg-white hover:text-neutral-950 sm:w-fit"
        >
          Track Order
        </a>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-4 border-b border-neutral-200 py-6 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <SectionHeading>Order Status</SectionHeading>
        <p className="mt-3 text-[18px] font-semibold text-neutral-950">
          {labelize(normalizedStatus)}
        </p>
        <p className="mt-2 max-w-[440px] text-[13px] leading-5 text-neutral-500">
          We will update this as your order moves forward.
        </p>
      </div>
      <a
        href={trackHref}
        {...trackProps}
        className="inline-flex h-10 w-full cursor-pointer items-center justify-center border border-neutral-950 bg-neutral-950 px-5 text-[11px] font-semibold uppercase tracking-[0.1em] text-white transition-colors hover:bg-white hover:text-neutral-950 sm:w-fit"
      >
        Track Order
      </a>
    </section>
  );
}

function Section({ title, children, id }) {
  return (
    <section id={id} className="border-b border-neutral-200 py-7">
      <SectionHeading>{title}</SectionHeading>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function SectionHeading({ children }) {
  return (
    <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
      {children}
    </h2>
  );
}

function InfoBlock({ label, value }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.1em] text-neutral-500">
        {label}
      </p>
      <p className="mt-2 text-[14px] font-semibold text-neutral-950">
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
            ? "text-[13px] font-semibold uppercase tracking-[0.12em] text-neutral-950"
            : "text-neutral-500"
        }
      >
        {label}
      </span>
      <span className={strong ? "text-[16px] font-semibold" : "font-medium text-neutral-800"}>
        {value}
      </span>
    </div>
  );
}

function OrderDetailsSkeleton() {
  return (
    <main className="min-h-screen bg-white px-5 py-8 text-neutral-950 sm:px-7 sm:py-10 lg:px-10">
      <div className="mx-auto max-w-[980px]">
        <div className="h-4 w-32 animate-pulse bg-neutral-100" />
        <div className="mt-7 border-b border-neutral-200 pb-6">
          <div className="h-8 w-52 animate-pulse bg-neutral-200" />
          <div className="mt-4 h-4 w-72 max-w-full animate-pulse bg-neutral-100" />
        </div>
        <div className="border-b border-neutral-200 py-6">
          <div className="h-3 w-28 animate-pulse bg-neutral-100" />
          <div className="mt-3 h-5 w-28 animate-pulse bg-neutral-200" />
          <div className="mt-3 h-3 w-72 max-w-full animate-pulse bg-neutral-100" />
        </div>
        <div className="border-b border-neutral-200 py-7">
          <div className="h-3 w-14 animate-pulse bg-neutral-100" />
          <div className="mt-4 flex items-center gap-5 py-3.5">
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
