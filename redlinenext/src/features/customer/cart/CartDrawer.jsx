"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Minus,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useCoupon } from "@/context/CouponContext";
import { getProductImageUrl } from "@/lib/clientApi";
import CouponSection from "@/features/customer/checkout/CouponSection";

const FALLBACK_IMAGE =
  "https://upload.wikimedia.org/wikipedia/commons/a/a3/Image-not-found.png";

const formatPrice = (value) =>
  new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const formatRupees = (value) => `₹${formatPrice(value)}`;

export default function CartDrawer({ isOpen, onClose }) {
  const router = useRouter();
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);

  const {
    cart,
    getCartItems,
    getCartCount,
    getCartTotal,
    updateQuantity,
    removeFromCart,
  } = useCart();

  const { discount } = useCoupon();

  const items = getCartItems();
  const itemCount = getCartCount();
  const sellingSubtotal = getCartTotal();

  const mrpTotal = items.reduce((sum, item) => {
    const mrp = Number(item.variant?.mrp ?? item.variant?.sellingPrice ?? 0);
    return sum + mrp * Number(item.quantity || 0);
  }, 0);

  const mrpDiscount = Math.max(0, mrpTotal - sellingSubtotal);
  const finalSubtotal = Math.max(0, sellingSubtotal - discount);
  const totalSavings = mrpDiscount + Math.max(0, Number(discount) || 0);

  const isResolving = cart.length > 0 && items.length === 0;

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setIsSummaryOpen(false);
    }
  }, [isOpen]);

  const handleCheckout = () => {
    onClose();
    router.push("/place-order");
  };

  const handleShopNow = () => {
    onClose();
    router.push("/collection");
  };

  return (
    <>
      {isOpen && (
        <button
          type="button"
          aria-label="Close cart overlay"
          onClick={onClose}
          className="fixed inset-0 z-[120] cursor-pointer bg-black/45"
        />
      )}

      <aside
        aria-hidden={!isOpen}
        className={[
          "fixed bottom-0 right-0 top-0 z-[121] flex h-dvh w-full max-w-[420px] flex-col bg-white text-neutral-950 shadow-xl transition-transform duration-300 ease-out sm:max-w-[430px]",
          isOpen ? "translate-x-0" : "translate-x-[calc(100%+2px)]",
        ].join(" ")}
        style={{ fontFamily: '"Helvetica Neue", Arial, sans-serif' }}
      >
        {/* Compact header */}
        <div className="flex h-[62px] shrink-0 items-center justify-between border-b border-neutral-200 px-5 sm:px-6">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.11em] text-neutral-950">
            YOUR CART{" "}
            <span className="font-normal text-neutral-500">({itemCount})</span>
          </h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close cart"
            className="flex h-9 w-9 cursor-pointer items-center justify-center text-neutral-950"
          >
            <X className="h-[21px] w-[21px]" strokeWidth={1.45} />
          </button>
        </div>

        {/* Only products scroll. Coupon + subtotal + checkout remain visible. */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {isResolving ? (
            <div className="flex h-full min-h-[220px] items-center justify-center px-5 text-center">
              <p className="text-[12px] font-medium uppercase tracking-[0.1em] text-neutral-500">
                Refreshing cart...
              </p>
            </div>
          ) : items.length > 0 ? (
            <div className="px-5 sm:px-6">
              {items.map(
                ({ productId, size, quantity, product, variant }, index) => {
                  const stock = Number(variant.stock) || 0;
                  const image =
                    getProductImageUrl(product.images?.[0]) || FALLBACK_IMAGE;

                  const sellingPrice = Number(variant.sellingPrice) || 0;
                  const mrp = Number(variant.mrp) || sellingPrice;
                  const showMrp = mrp > sellingPrice;

                  return (
                    <div
                      key={`${productId}-${size}`}
                      className={[
                        "grid grid-cols-[88px_minmax(0,1fr)] gap-4 py-4.5",
                        index !== items.length - 1
                          ? "border-b border-neutral-200"
                          : "",
                      ].join(" ")}
                    >
                      <Link
                        href={`/product/${product.slug}`}
                        onClick={onClose}
                        className="h-[88px] w-[88px] cursor-pointer overflow-hidden bg-neutral-50"
                      >
                        <img
                          src={image}
                          alt={product.name}
                          className="h-full w-full object-contain"
                        />
                      </Link>

                      <div className="min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <Link
                              href={`/product/${product.slug}`}
                              onClick={onClose}
                              className="block cursor-pointer truncate text-[14px] font-semibold uppercase tracking-[0.04em] text-neutral-950 transition-opacity hover:opacity-60"
                            >
                              {product.name}
                            </Link>

                            <p className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-neutral-500">
                              {size}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeFromCart(productId, size)}
                            aria-label={`Remove ${product.name}`}
                            className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center text-neutral-400 transition-colors hover:text-neutral-950"
                          >
                            <Trash2
                              className="h-[15px] w-[15px]"
                              strokeWidth={1.45}
                            />
                          </button>
                        </div>

                        <div className="mt-2.5 flex items-baseline gap-2">
                          <span className="text-[16px] font-medium text-neutral-950">
                            {formatRupees(sellingPrice)}
                          </span>

                          {showMrp && (
                            <span className="text-[11px] font-medium text-neutral-500 line-through decoration-neutral-500">
                              {formatRupees(mrp)}
                            </span>
                          )}
                        </div>

                        <div className="mt-3 inline-grid h-9 grid-cols-[34px_40px_34px] overflow-hidden rounded-[3px] border border-neutral-400 bg-white">
                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(productId, size, quantity - 1)
                            }
                            disabled={quantity <= 1}
                            aria-label={`Decrease ${product.name} quantity`}
                            className="flex cursor-pointer items-center justify-center border-r border-neutral-400 text-neutral-950 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:text-neutral-300 disabled:hover:bg-white"
                          >
                            <Minus className="h-3.5 w-3.5" strokeWidth={1.6} />
                          </button>

                          <span className="flex items-center justify-center text-[13px] font-semibold text-neutral-950">
                            {quantity}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(productId, size, quantity + 1)
                            }
                            disabled={quantity >= stock}
                            aria-label={`Increase ${product.name} quantity`}
                            className="flex cursor-pointer items-center justify-center border-l border-neutral-400 text-neutral-950 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:text-neutral-300 disabled:hover:bg-white"
                          >
                            <Plus className="h-3.5 w-3.5" strokeWidth={1.6} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          ) : (
            <div className="flex h-full min-h-[260px] items-center justify-center px-6 pb-[10dvh] text-center">
              <div>
                <p className="text-[17px] font-semibold uppercase tracking-[0.08em] text-neutral-950">
                  YOUR CART IS EMPTY
                </p>

                <p className="mx-auto mt-3 max-w-[260px] text-[14px] leading-6 text-neutral-500">
                  Your next fragrance is waiting.
                </p>

                <button
                  type="button"
                  onClick={handleShopNow}
                  className="mt-6 cursor-pointer border-0 bg-transparent p-0 text-[12px] font-semibold uppercase tracking-[0.11em] text-neutral-950 underline decoration-neutral-400 decoration-[0.75px] underline-offset-[6px] transition-colors duration-200 hover:text-neutral-700 hover:decoration-neutral-700"
                >
                  EXPLORE FRAGRANCES {"\u2192"}
                </button>
              </div>
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="shrink-0 bg-white">
            {/* Exact same coupon component as checkout */}
            <div className="border-t border-neutral-200 px-4 py-4 sm:px-5">
              <CouponSection />
            </div>

            {/* Reference-style subtotal dock.
                Expanded price details are absolutely overlaid upward,
                so the coupon section never shifts. */}
            <div className="relative bg-[#f3f3f3] px-4 pb-4 pt-3">
              {isSummaryOpen && (
                <div className="absolute bottom-[118px] left-0 right-0 z-10 border-y border-neutral-200 bg-white px-5 py-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] sm:px-6">
                  <div className="space-y-3 text-[13px] leading-none">
                    <div className="flex items-center justify-between text-neutral-800">
                      <span>MRP Total</span>
                      <span className="font-medium">{formatRupees(mrpTotal)}</span>
                    </div>

                    {mrpDiscount > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-800">
                          Discount on MRP
                        </span>
                        <span className="font-medium text-[#2d7a3e]">
                          -{formatRupees(mrpDiscount)}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-neutral-800">
                      <span>Subtotal</span>
                      <span className="font-medium">
                        {formatRupees(sellingSubtotal)}
                      </span>
                    </div>

                    {discount > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-800">
                          Coupon Discount
                        </span>
                        <span className="font-medium text-[#2d7a3e]">
                          -{formatRupees(discount)}
                        </span>
                      </div>
                    )}

                    {totalSavings > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-800">
                          Total Discount
                        </span>
                        <span className="font-medium text-[#2d7a3e]">
                          -{formatRupees(totalSavings)}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-neutral-800">
                      <span>Shipping</span>
                      <span className="text-neutral-600">
                        Calculated at checkout
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setIsSummaryOpen((current) => !current)}
                aria-expanded={isSummaryOpen}
                className="flex h-12 w-full cursor-pointer items-center justify-between px-2 text-neutral-950"
              >
                <span className="flex items-center gap-2.5 text-[15px] font-medium">
                  Subtotal
                  {isSummaryOpen ? (
                    <ChevronUp className="h-4 w-4" strokeWidth={1.6} />
                  ) : (
                    <ChevronDown className="h-4 w-4" strokeWidth={1.6} />
                  )}
                </span>

                <span className="text-[16px] font-medium">
                  {formatRupees(finalSubtotal)}
                </span>
              </button>

              <button
                type="button"
                onClick={handleCheckout}
                className="flex h-[54px] w-full cursor-pointer items-center justify-center gap-2 rounded-[3px] bg-neutral-950 text-[15px] font-semibold text-white transition-opacity hover:opacity-90"
              >
                <span>Checkout</span>
                <ChevronRight className="h-5 w-5" strokeWidth={1.7} />
              </button>
            </div>          
          </div>
        )}
      </aside>
    </>
  );
}
