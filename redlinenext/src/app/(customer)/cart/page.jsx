"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useCoupon } from "@/context/CouponContext";
import { getProductImageUrl } from "@/lib/clientApi";

const FALLBACK_IMAGE =
  "https://upload.wikimedia.org/wikipedia/commons/a/a3/Image-not-found.png";

const formatPrice = (value) =>
  `Rs. ${new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)}`;

export default function CartPage() {
  const router = useRouter();
  const { cart, getCartItems, getCartCount, getCartTotal, updateQuantity, removeFromCart } =
    useCart();
  const {
    couponCode,
    setCouponCode,
    appliedCoupon,
    discount,
    validating,
    error: couponError,
    message: couponMessage,
    applyCoupon,
    removeCoupon,
  } = useCoupon();

  const items = getCartItems();
  const subtotal = getCartTotal();
  const total = Math.max(0, subtotal - discount);
  const itemCount = getCartCount();
  const resolving = cart.length > 0 && items.length === 0;

  if (!resolving && !items.length) {
    return (
      <main className="min-h-screen bg-neutral-50 px-5 py-16 text-neutral-950">
        <div className="mx-auto max-w-[760px] border border-neutral-200 bg-white p-8 text-center">
          <ShoppingBag className="mx-auto h-8 w-8 text-neutral-500" strokeWidth={1.5} />
          <h1 className="mt-5 text-[28px] font-semibold uppercase tracking-[0.08em]">
            Your Cart Is Empty
          </h1>
          <p className="mx-auto mt-3 max-w-[420px] text-[14px] leading-6 text-neutral-500">
            Add items to your cart before checkout.
          </p>
          <Link
            href="/collection"
            className="mt-7 inline-flex h-11 items-center justify-center border border-neutral-950 bg-neutral-950 px-7 text-[12px] font-semibold uppercase tracking-[0.09em] text-white transition-colors hover:bg-white hover:text-neutral-950"
          >
            Shop Now
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-50 px-5 py-10 text-neutral-950 sm:px-7 lg:px-10">
      <div className="mx-auto max-w-[1180px]">
        <div className="border-b border-neutral-200 pb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
            Cart
          </p>
          <h1 className="mt-2 text-[34px] font-semibold uppercase tracking-[0.06em] sm:text-[44px]">
            Shopping Cart
          </h1>
          <p className="mt-2 text-[14px] text-neutral-500">
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </p>
        </div>

        {resolving ? (
          <p className="mt-8 border border-neutral-200 bg-white p-6 text-center text-[13px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
            Refreshing cart...
          </p>
        ) : (
          <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_390px]">
            <section className="space-y-4">
              {items.map(({ productId, size, quantity, product, variant }) => {
                const image = getProductImageUrl(product.images?.[0]) || FALLBACK_IMAGE;
                const stock = Number(variant.stock) || 0;

                return (
                  <article
                    key={`${productId}-${size}`}
                    className="grid grid-cols-[84px_minmax(0,1fr)] gap-4 border border-neutral-200 bg-white p-4 sm:grid-cols-[112px_minmax(0,1fr)] sm:p-5"
                  >
                    <Link
                      href={`/product/${product.slug}`}
                      className="aspect-square border border-neutral-200 bg-neutral-50"
                    >
                      <img src={image} alt={product.name} className="h-full w-full object-contain" />
                    </Link>
                    <div className="min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <Link
                            href={`/product/${product.slug}`}
                            className="block truncate text-[15px] font-semibold uppercase tracking-[0.05em]"
                          >
                            {product.name}
                          </Link>
                          <p className="mt-1 text-[12px] uppercase tracking-[0.08em] text-neutral-500">
                            {size}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFromCart(productId, size)}
                          className="flex h-9 w-9 shrink-0 items-center justify-center text-neutral-500 transition-colors hover:text-neutral-950"
                          aria-label={`Remove ${product.name}`}
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={1.7} />
                        </button>
                      </div>

                      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <p className="text-[16px] font-semibold">{formatPrice(variant.sellingPrice)}</p>
                          <p className="mt-1 text-[12px] text-neutral-500">
                            Line total {formatPrice((Number(variant.sellingPrice) || 0) * quantity)}
                          </p>
                        </div>
                        <div className="inline-grid h-10 w-[128px] grid-cols-[40px_48px_40px] border border-neutral-300">
                          <button
                            type="button"
                            onClick={() => updateQuantity(productId, size, quantity - 1)}
                            disabled={quantity <= 1}
                            aria-label={`Decrease ${product.name} quantity`}
                            className="flex items-center justify-center border-r border-neutral-300 disabled:cursor-not-allowed disabled:text-neutral-300"
                          >
                            <Minus className="h-4 w-4" strokeWidth={1.7} />
                          </button>
                          <span className="flex items-center justify-center text-[13px]">{quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(productId, size, quantity + 1)}
                            disabled={quantity >= stock}
                            aria-label={`Increase ${product.name} quantity`}
                            className="flex items-center justify-center border-l border-neutral-300 disabled:cursor-not-allowed disabled:text-neutral-300"
                          >
                            <Plus className="h-4 w-4" strokeWidth={1.7} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>

            <aside className="h-fit border border-neutral-200 bg-white p-5 sm:p-6 lg:sticky lg:top-24">
              <h2 className="text-[22px] font-semibold uppercase tracking-[0.06em]">
                Order Summary
              </h2>

              <div className="mt-5 border-b border-neutral-200 pb-5">
                <label className="text-[12px] font-semibold uppercase tracking-[0.09em] text-neutral-700">
                  Coupon
                </label>
                <div className="mt-3 flex h-11 border border-neutral-300">
                  <input
                    value={couponCode}
                    onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
                    placeholder="Enter code"
                    className="min-w-0 flex-1 px-3 text-[13px] uppercase outline-none"
                  />
                  {appliedCoupon?.code ? (
                    <button
                      type="button"
                      onClick={removeCoupon}
                      className="border-l border-neutral-300 px-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-700 hover:bg-neutral-100"
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => applyCoupon()}
                      disabled={validating}
                      className="border-l border-neutral-300 px-4 text-[11px] font-semibold uppercase tracking-[0.08em] disabled:cursor-not-allowed disabled:text-neutral-300"
                    >
                      {validating ? "Checking" : "Apply"}
                    </button>
                  )}
                </div>
                {(couponMessage || couponError) && (
                  <p className={couponError ? "mt-2 text-[12px] text-red-600" : "mt-2 text-[12px] text-neutral-600"}>
                    {couponError || couponMessage}
                  </p>
                )}
              </div>

              <div className="mt-5 space-y-3 text-[14px]">
                <SummaryRow label="Subtotal" value={formatPrice(subtotal)} />
                {discount > 0 && (
                  <SummaryRow
                    label={appliedCoupon?.code ? `Coupon (${appliedCoupon.code})` : "Coupon"}
                    value={`-${formatPrice(discount)}`}
                  />
                )}
                <div className="border-t border-neutral-200 pt-4">
                  <SummaryRow label="Total" value={formatPrice(total)} strong />
                </div>
              </div>

              <button
                type="button"
                onClick={() => router.push("/place-order")}
                className="mt-6 h-12 w-full border border-neutral-950 bg-neutral-950 text-[13px] font-semibold uppercase tracking-[0.1em] text-white transition-colors hover:bg-white hover:text-neutral-950"
              >
                Continue to Checkout
              </button>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}

function SummaryRow({ label, value, strong = false }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className={strong ? "font-semibold text-neutral-950" : "text-neutral-500"}>
        {label}
      </span>
      <span className={strong ? "text-[20px] font-semibold" : "font-semibold"}>{value}</span>
    </div>
  );
}
