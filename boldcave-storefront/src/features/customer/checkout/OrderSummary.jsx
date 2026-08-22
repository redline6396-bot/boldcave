"use client";

import { ShoppingCart } from "lucide-react";
import { getProductImageUrl } from "@/lib/clientApi";
import CheckoutSheet from "@/features/customer/checkout/CheckoutSheet";

const FALLBACK_IMAGE =
  "https://upload.wikimedia.org/wikipedia/commons/a/a3/Image-not-found.png";

const money = (value) =>
  `₹${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)}`;

export default function OrderSummary({
  open,
  onClose,
  items,
  subtotal,
  discount,
  total,
  couponCode,
  shipping = null,
}) {
  if (!open) return null;

  const mrpTotal = items.reduce((sum, item) => {
    const mrp = Number(
      item.variant?.mrp ?? item.variant?.sellingPrice ?? 0
    );
    return sum + mrp * Number(item.quantity || 0);
  }, 0);

  const mrpDiscount = Math.max(0, mrpTotal - subtotal);
  const couponDiscount = Math.max(0, Number(discount) || 0);
  const shippingNumber =
    typeof shipping === "number" ? Math.max(0, shipping) : null;

  const toPay =
    shippingNumber === null
      ? total
      : Math.max(0, total + shippingNumber);

  return (
    <CheckoutSheet
      onClose={onClose}
      zIndex={260}
      desktopHeight={545}
      desktopMaxHeight="72vh"
      ariaLabel="Close order summary"
    >
      <div className="flex min-h-0 flex-col sm:h-full">
        <div className="flex h-[62px] shrink-0 items-center border-b border-[#e0e4e8] px-4 sm:px-5">
          <div className="flex items-center gap-2.5">
            <ShoppingCart
              className="h-[22px] w-[22px] text-[#304b67]"
              strokeWidth={1.6}
            />
            <h2 className="text-[16px] font-medium">
              Order Summary
            </h2>
          </div>
        </div>

        <div className="summary-scroll max-h-[36dvh] min-h-0 overflow-y-auto px-4 sm:max-h-none sm:flex-1 sm:px-5">
          {items.map(
            ({ productId, size, quantity, product, variant }) => {
              const image =
                getProductImageUrl(product.images?.[0]) ||
                FALLBACK_IMAGE;

              const selling = Number(variant.sellingPrice) || 0;
              const mrp = Number(variant.mrp) || selling;
              const lineSelling = selling * quantity;
              const lineMrp = mrp * quantity;
              const isCombo = product.productType === "combo";
              const includesText = isCombo
                ? (product.comboItems || []).map((entry) => entry.name).filter(Boolean).join(", ")
                : "";

              return (
                <div
                  key={`${productId}-${size}`}
                  className="grid grid-cols-[76px_minmax(0,1fr)_auto] gap-3 border-b border-[#e2e6ea] py-3.5"
                >
                  <div className="h-[76px] w-[76px] overflow-hidden rounded-[9px] border border-[#e0e4e8] bg-[#fafafa]">
                    <img
                      src={image}
                      alt={product.name}
                      className="h-full w-full object-contain"
                    />
                  </div>

                  <div className="min-w-0 pt-0.5">
                    <p className="truncate text-[14px] font-medium">
                      {product.name}{" "}
                      <span className="font-normal text-[#65717e]">
                        ({isCombo ? "Combo" : size})
                      </span>
                    </p>
                    {includesText && (
                      <p className="mt-1 text-[11px] leading-4 text-[#65717e]">
                        Includes {includesText}
                      </p>
                    )}
                    <p className="mt-1 text-[12px] text-[#526173]">
                      Qty: {quantity}
                    </p>
                  </div>

                  <div className="pt-0.5 text-right">
                    {lineMrp > lineSelling && (
                      <p className="text-[11px] text-[#6d7781] line-through">
                        {money(lineMrp)}
                      </p>
                    )}
                    <p className="mt-0.5 text-[14px] font-medium">
                      {money(lineSelling)}
                    </p>
                  </div>
                </div>
              );
            }
          )}
        </div>

        <div className="shrink-0 px-4 pb-3 pt-1 sm:px-5 sm:pb-4 sm:pt-0">
          <div className="rounded-[13px] bg-[#f8f9fa] px-4 py-3.5 text-[13px]">
            <SummaryRow label="MRP Total" value={money(mrpTotal)} />

            {mrpDiscount > 0 && (
              <SummaryRow
                label="Discount on MRP"
                value={`-${money(mrpDiscount)}`}
                positive
              />
            )}

            <SummaryRow label="Subtotal" value={money(subtotal)} />

            {couponDiscount > 0 && (
              <SummaryRow
                label="Total Discount"
                value={`-${money(couponDiscount)}`}
                positive
              />
            )}

            <SummaryRow
              label="Shipping"
              value={
                shippingNumber === null
                  ? "Calculated at checkout"
                  : shippingNumber === 0
                    ? "Free"
                    : money(shippingNumber)
              }
            />
          </div>

          <div className="flex items-center justify-between px-1 pb-1 pt-4 text-[15px] font-medium sm:pt-5">
            <span>To Pay</span>
            <span className="text-[17px]">
              {money(toPay)}
            </span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .summary-scroll {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .summary-scroll::-webkit-scrollbar {
          display: none;
          width: 0;
          height: 0;
        }
      `}</style>
    </CheckoutSheet>
  );
}

function SummaryRow({ label, value, positive = false }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <span className="text-[#273342]">{label}</span>
      <span
        className={[
          "text-right font-medium",
          positive ? "text-[#16813d]" : "text-[#111b28]",
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  );
}
