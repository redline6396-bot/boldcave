"use client";

import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Minus,
  Plus,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { getVariantProductImageUrl } from "@/lib/clientApi";
import CheckoutSheet from "@/features/customer/checkout/CheckoutSheet";

const FALLBACK_IMAGE =
  "https://upload.wikimedia.org/wikipedia/commons/a/a3/Image-not-found.png";

const money = (value) =>
  `₹${new Intl.NumberFormat("en-IN", {
    minimumFractionDigits:
      Math.round((Number(value) || 0) * 100) % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)}`;

export default function OrderSummary({
  open,
  onClose,
  items,
  subtotal,
  discount,
  codCharge = 0,
  total,
  couponCode,
  shipping = null,
  onUpdateQuantity,
  onRemoveItem,
}) {
  const [priceDetailsOpen, setPriceDetailsOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setPriceDetailsOpen(false);
    }
  }, [open]);

  if (!open) return null;

  const mrpTotal = items.reduce((sum, item) => {
    const mrp = Number(
      item.variant?.mrp ?? item.variant?.sellingPrice ?? 0
    );
    return sum + mrp * Number(item.quantity || 0);
  }, 0);

  const mrpDiscount = Math.max(0, mrpTotal - subtotal);
  const couponDiscount = Math.max(0, Number(discount) || 0);
  const appliedCodCharge = Math.max(
    0,
    Number(codCharge) || 0
  );
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

        <div className="summary-scroll max-h-[36svh] min-h-0 overflow-y-auto px-4 sm:max-h-none sm:flex-1 sm:px-5">
          {items.map(
            ({ productId, size, quantity, product, variant }) => {
              const image =
                getVariantProductImageUrl(product, variant) ||
                FALLBACK_IMAGE;

              const selling = Number(variant.sellingPrice) || 0;
              const mrp = Number(variant.mrp) || selling;
              const lineSelling = selling * quantity;
              const lineMrp = mrp * quantity;
              const stock = Math.max(0, Number(variant.stock) || 0);
              const isCombo = product.productType === "combo";
              const includesText = isCombo
                ? (product.comboItems || []).map((entry) => entry.name).filter(Boolean).join(", ")
                : "";

              return (
                <div
                  key={`${productId}-${size}`}
                  className="grid grid-cols-[76px_minmax(0,1fr)] gap-3 border-b border-[#e2e6ea] py-3.5"
                >
                  <div className="h-[76px] w-[76px] overflow-hidden rounded-[9px] border border-[#e0e4e8] bg-[#fafafa]">
                    <img
                      src={image}
                      alt={product.name}
                      className="h-full w-full object-contain"
                    />
                  </div>

                  <div className="min-w-0 pt-0.5">
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 truncate text-[14px] font-medium">
                        {product.name}{" "}
                        <span className="font-normal text-[#65717e]">
                          ({isCombo ? "Combo" : size})
                        </span>
                      </p>

                      <div className="shrink-0 text-right">
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

                    {includesText && (
                      <p className="mt-1 text-[11px] leading-4 text-[#65717e]">
                        Includes {includesText}
                      </p>
                    )}

                    <div className="mt-2.5 flex items-center justify-between gap-3">
                      <div className="inline-grid h-8 grid-cols-[30px_34px_30px] overflow-hidden rounded-[3px] border border-[#aeb7c1] bg-white">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateQuantity?.(
                              productId,
                              size,
                              quantity - 1
                            )
                          }
                          disabled={quantity <= 1}
                          aria-label={`Decrease ${product.name} quantity`}
                          className="flex cursor-pointer items-center justify-center border-r border-[#cbd1d7] transition-colors hover:bg-[#f5f6f7] disabled:cursor-not-allowed disabled:text-[#bcc2c8] disabled:hover:bg-white"
                        >
                          <Minus className="h-3.5 w-3.5" strokeWidth={1.8} />
                        </button>

                        <span className="flex items-center justify-center text-[12px] font-medium">
                          {quantity}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            onUpdateQuantity?.(
                              productId,
                              size,
                              quantity + 1
                            )
                          }
                          disabled={quantity >= stock}
                          aria-label={`Increase ${product.name} quantity`}
                          className="flex cursor-pointer items-center justify-center border-l border-[#cbd1d7] transition-colors hover:bg-[#f5f6f7] disabled:cursor-not-allowed disabled:text-[#bcc2c8] disabled:hover:bg-white"
                        >
                          <Plus className="h-3.5 w-3.5" strokeWidth={1.8} />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => onRemoveItem?.(productId, size)}
                        aria-label={`Remove ${product.name} from order`}
                        className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center text-[#65717e] transition-colors hover:text-[#b42318]"
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={1.6} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            }
          )}
        </div>

        <div className="shrink-0 px-4 pb-3 pt-2 sm:px-5 sm:pb-4">
          <button
            type="button"
            onClick={() => setPriceDetailsOpen((current) => !current)}
            aria-expanded={priceDetailsOpen}
            className="flex w-full cursor-pointer items-center justify-between gap-4 border-b border-[#e2e6ea] px-1 py-3 text-left text-[13px] text-[#273342]"
          >
            <span className="font-medium">Price Details</span>
            <span className="flex items-center gap-2 font-medium text-[#111b28]">
              {money(toPay)}
              {priceDetailsOpen ? (
                <ChevronUp className="h-4 w-4" strokeWidth={1.7} />
              ) : (
                <ChevronDown className="h-4 w-4" strokeWidth={1.7} />
              )}
            </span>
          </button>

          {priceDetailsOpen && (
            <div className="border-b border-[#e2e6ea] px-1 py-3 text-[13px]">
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
                  label={
                    couponCode
                      ? `Coupon (${couponCode})`
                      : "Coupon Discount"
                  }
                  value={`-${money(couponDiscount)}`}
                  positive
                />
              )}

              {appliedCodCharge > 0 && (
                <SummaryRow
                  label="COD charges"
                  value={`+${money(appliedCodCharge)}`}
                />
              )}

              <SummaryRow
                label="Shipping"
                value={
                  shippingNumber === null || shippingNumber === 0
                    ? "FREE"
                    : money(shippingNumber)
                }
              />
            </div>
          )}

          <div className="flex items-center justify-between px-1 pb-1 pt-4 text-[15px] font-medium">
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
