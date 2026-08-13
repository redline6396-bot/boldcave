"use client";

import React, { useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShopContext } from "../../../context/ShopContext";
import { NotificationContext } from "../../../context/NotificationContext";
import CouponInput from "../../../components/CouponInput";
import { sampleProducts } from "../../../assets/sampleProducts";
import {
  Trash2,
  Plus,
  Minus,
  ArrowLeft,
  ShoppingCart,
  X,
  ShieldCheck,
  Truck,
  Tag,
  PackageCheck,
} from "lucide-react";

const FALLBACK_IMAGE =
  "https://upload.wikimedia.org/wikipedia/commons/a/a3/Image-not-found.png";

export default function Cart() {
  const router = useRouter();

  const {
    products,
    cartItems,
    updateQuantity,
    appliedCoupon,
    setAppliedCoupon,
    couponDiscount,
    setCouponDiscount,
  } = useContext(ShopContext);

  const { success } = useContext(NotificationContext);

  const [cartData, setCartData] = useState([]);
  const [showCouponField, setShowCouponField] = useState(false);

  useEffect(() => {
    const tempData = [];

    Object.keys(cartItems || {}).forEach((itemId) => {
      const value = cartItems[itemId];
      if (!value) return;

      let product =
        products.find(
          (product) =>
            String(product._id) === String(itemId) ||
            String(product.id) === String(itemId)
        ) || sampleProducts.find((product) => String(product.id) === String(itemId));

      if (!product) {
        product = {
          id: itemId,
          name: `Product ${itemId}`,
          price: 0,
          image: FALLBACK_IMAGE,
        };
      }

      if (typeof value === "object" && value !== null) {
        Object.entries(value).forEach(([variantWeight, quantity]) => {
          if (Number(quantity) > 0) {
            tempData.push({
              id: itemId,
              variantWeight,
              quantity: Number(quantity),
              product,
            });
          }
        });
      } else if (Number(value) > 0) {
        tempData.push({
          id: itemId,
          quantity: Number(value),
          product,
        });
      }
    });

    setCartData(tempData);
  }, [cartItems, products]);

  const getVariant = (item) => {
    if (item.variantWeight && item.product?.variants) {
      return item.product.variants.find(
        (variant) => variant.weight === item.variantWeight
      );
    }

    if (item.product?.variants && item.product.variants.length > 0) {
      return item.product.variants[0];
    }

    return null;
  };

  const getItemPrice = (item) => {
    const variant = getVariant(item);

    return {
      sellingPrice: Number(variant?.sellingPrice || item.product?.price || 0),
      originalPrice: Number(
        variant?.originalPrice || variant?.sellingPrice || item.product?.price || 0
      ),
    };
  };

  const getProductImage = (product) => {
    if (product?.image) return product.image;

    if (Array.isArray(product?.images) && product.images.length > 0) {
      const firstImage = product.images[0];
      if (typeof firstImage === "string") return firstImage;
      if (firstImage?.url) return firstImage.url;
    }

    return FALLBACK_IMAGE;
  };

  const handleApplyCoupon = (coupon) => {
    setAppliedCoupon(coupon.code);
    setCouponDiscount(coupon.discount);
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponDiscount(0);
  };

  const subtotal = cartData.reduce((sum, item) => {
    const { sellingPrice } = getItemPrice(item);
    return sum + sellingPrice * item.quantity;
  }, 0);

  const totalSavings = cartData.reduce((sum, item) => {
    const { sellingPrice, originalPrice } = getItemPrice(item);
    const savings = (originalPrice - sellingPrice) * item.quantity;
    return sum + (savings > 0 ? savings : 0);
  }, 0);

  const shipping = subtotal > 499 ? 0 : 50;
  const totalBeforeCoupon = subtotal + shipping;
  const total = Math.max(0, totalBeforeCoupon - couponDiscount);
  const amountForFreeShipping = Math.max(0, 499 - subtotal);
  const hasSavings = totalSavings > 0 || couponDiscount > 0;

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#fbf8f1] font-body text-[#332519]">
      {/* Header */}
      <section className="border-b border-[#e8dfd1] bg-[#fffdf8]">
        <div className="mx-auto max-w-[1440px] px-5 py-7 sm:px-7 md:px-8 lg:px-12">
          <button
            type="button"
            onClick={() => router.push("/collection")}
            className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#405526] transition-opacity hover:opacity-70"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
            Back to Shop
          </button>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#405526]">
                Your Cart
              </p>

              <h1 className="mt-3 font-display text-[42px] font-medium leading-none tracking-[-0.045em] text-[#332519] sm:text-[56px]">
                Shopping Cart
              </h1>
            </div>

            {cartData.length > 0 && (
              <p className="text-sm text-[#5f5648]">
                <span className="font-semibold text-[#332519]">
                  {cartData.length}
                </span>{" "}
                item{cartData.length !== 1 ? "s" : ""} in your cart
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 py-7 sm:px-7 md:px-8 lg:px-12 lg:py-10">
        {cartData.length === 0 ? (
          <EmptyCart onContinue={() => router.push("/collection")} />
        ) : (
          <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_390px] xl:grid-cols-[minmax(0,1fr)_420px]">
            {/* Cart Items */}
            <div className="min-w-0">
              {/* Free shipping notice */}
              <div className="mb-4 rounded-[14px] border border-[#e8dfd1] bg-[#fffdf8] p-4">
                <div className="flex items-start gap-3">
                  <Truck
                    className="mt-0.5 h-5 w-5 shrink-0 text-[#405526]"
                    strokeWidth={1.7}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#332519]">
                      {shipping === 0
                        ? "You qualify for free delivery."
                        : `Add ₹${amountForFreeShipping.toFixed(
                            0
                          )} more for free delivery.`}
                    </p>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#eee6d9]">
                      <div
                        className="h-full rounded-full bg-[#405526]"
                        style={{
                          width: `${Math.min((subtotal / 499) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {cartData.map((item) => {
                  const product = item.product;
                  const { sellingPrice, originalPrice } = getItemPrice(item);

                  const discount =
                    originalPrice > sellingPrice && sellingPrice > 0
                      ? Math.round(
                          ((originalPrice - sellingPrice) / originalPrice) * 100
                        )
                      : 0;

                  const lineTotal = sellingPrice * item.quantity;

                  return (
                    <article
                      key={`${item.id}-${item.variantWeight || "default"}`}
                      className="group rounded-[16px] border border-[#e8dfd1] bg-[#fffdf8] p-4 transition-colors hover:border-[#c9b99c] sm:p-5"
                    >
                      <div className="flex gap-4 sm:gap-5">
                        {/* Image */}
                        <button
                          type="button"
                          onClick={() => router.push(`/product/${item.id}`)}
                          className="flex h-24 w-24 shrink-0 items-center justify-center rounded-[12px] bg-[#fbf7ef] p-2 sm:h-32 sm:w-32"
                        >
                          <img
                            src={getProductImage(product)}
                            alt={product.name}
                            className="h-full w-full object-contain"
                            onError={(event) => {
                              event.currentTarget.onerror = null;
                              event.currentTarget.src = FALLBACK_IMAGE;
                            }}
                          />
                        </button>

                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-start justify-between gap-3">
                            <button
                              type="button"
                              onClick={() => router.push(`/product/${item.id}`)}
                              className="min-w-0 text-left"
                            >
                              <h2 className="line-clamp-2 text-[15px] font-semibold leading-snug text-[#332519] sm:text-[17px]">
                                {product.name}
                              </h2>

                              {item.variantWeight && (
                                <p className="mt-1 text-[12px] text-[#6f6658]">
                                  Size: {item.variantWeight}
                                </p>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                updateQuantity(item.id, 0, item.variantWeight);
                                success("Item removed from cart");
                              }}
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#eadfd0] text-[#9a4d45] transition-colors hover:border-[#c9504a] hover:bg-[#fff2f1]"
                              aria-label="Remove item"
                            >
                              <Trash2 className="h-4 w-4" strokeWidth={1.7} />
                            </button>
                          </div>

                          {discount > 0 && (
                            <span className="mt-3 inline-flex rounded-full bg-[#f4eddf] px-3 py-1 text-[11px] font-semibold text-[#405526]">
                              Save {discount}%
                            </span>
                          )}

                          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                              <div className="flex items-end gap-2">
                                <p className="text-[20px] font-bold leading-none text-[#332519]">
                                  ₹{sellingPrice}
                                </p>

                                {originalPrice > sellingPrice && (
                                  <p className="text-sm text-[#9a9183] line-through">
                                    ₹{originalPrice}
                                  </p>
                                )}
                              </div>

                              <p className="mt-1 text-[12px] text-[#6f6658]">
                                Line total:{" "}
                                <span className="font-semibold text-[#332519]">
                                  ₹{lineTotal.toFixed(0)}
                                </span>
                              </p>
                            </div>

                            <QuantityControl
                              quantity={item.quantity}
                              onDecrease={() =>
                                updateQuantity(
                                  item.id,
                                  Math.max(1, item.quantity - 1),
                                  item.variantWeight
                                )
                              }
                              onIncrease={() =>
                                updateQuantity(
                                  item.id,
                                  item.quantity + 1,
                                  item.variantWeight
                                )
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => router.push("/collection")}
                className="mt-6 inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#405526] transition-opacity hover:opacity-70"
              >
                <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
                Continue Shopping
              </button>
            </div>

            {/* Summary */}
            <aside className="min-w-0">
              <div className="sticky top-24 rounded-[18px] border border-[#e8dfd1] bg-[#fffdf8] shadow-[0_14px_40px_rgba(58,45,29,0.05)]">
                <div className="border-b border-[#e8dfd1] p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#405526]">
                    Order Summary
                  </p>

                  <h2 className="mt-2 font-display text-[30px] font-medium tracking-[-0.035em] text-[#332519]">
                    Price Details
                  </h2>
                </div>

                <div className="p-5">
                  {/* Items compact list */}
                  <div className="space-y-3 border-b border-[#eee6d9] pb-5">
                    {cartData.map((item) => {
                      const { originalPrice, sellingPrice } = getItemPrice(item);
                      const itemTotal = originalPrice * item.quantity;
                      const displayName =
                        item.product.name.length > 22
                          ? `${item.product.name.slice(0, 22)}...`
                          : item.product.name;

                      return (
                        <div
                          key={`summary-${item.id}-${item.variantWeight || "default"}`}
                          className="flex items-start justify-between gap-4 text-[13px]"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium text-[#332519]">
                              {displayName}
                            </p>
                            <p className="mt-0.5 text-[12px] text-[#7a756b]">
                              {item.variantWeight
                                ? `${item.variantWeight} × ${item.quantity}`
                                : `Qty × ${item.quantity}`}
                            </p>
                          </div>

                          <p className="shrink-0 font-semibold text-[#332519]">
                            ₹{itemTotal.toFixed(0)}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Summary rows */}
                  <div className="space-y-3 border-b border-[#eee6d9] py-5">
                    <SummaryRow
                      label="Price"
                      value={`₹${(subtotal + totalSavings).toFixed(0)}`}
                    />

                    {totalSavings > 0 && (
                      <SummaryRow
                        label="Product discount"
                        value={`−₹${totalSavings.toFixed(0)}`}
                        positive
                      />
                    )}

                    <SummaryRow
                      label="Delivery"
                      value={shipping === 0 ? "Free" : `₹${shipping}`}
                    />

                    {appliedCoupon && (
                      <SummaryRow
                        label={`Coupon (${appliedCoupon})`}
                        value={`−₹${couponDiscount.toFixed(0)}`}
                        positive
                      />
                    )}
                  </div>

                  {/* Coupon */}
                  <div className="border-b border-[#eee6d9] py-5">
                    {!appliedCoupon ? (
                      showCouponField ? (
                        <div>
                          <CouponInput
                            cartTotal={totalBeforeCoupon}
                            onApplyCoupon={handleApplyCoupon}
                          />

                          <button
                            type="button"
                            onClick={() => setShowCouponField(false)}
                            className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-[#6f6658] transition-opacity hover:opacity-70"
                          >
                            <X className="h-4 w-4" />
                            Close
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowCouponField(true)}
                          className="flex h-11 w-full items-center justify-center gap-2 rounded-[8px] border border-[#ded4c3] bg-[#fbf8f1] text-sm font-semibold text-[#405526] transition-colors hover:border-[#405526]"
                        >
                          <Tag className="h-4 w-4" strokeWidth={1.7} />
                          Apply Promo Code
                        </button>
                      )
                    ) : (
                      <div className="flex items-center justify-between rounded-[10px] border border-[#d8ceb9] bg-[#f4eddf] px-3 py-3">
                        <div>
                          <p className="text-sm font-semibold text-[#332519]">
                            {appliedCoupon}
                          </p>
                          <p className="mt-0.5 text-[12px] text-[#405526]">
                            Saved ₹{couponDiscount.toFixed(0)}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={removeCoupon}
                          className="text-[12px] font-semibold text-[#9a4d45]"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Total */}
                  <div className="pt-5">
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-[#332519]">
                          Total
                        </p>
                        <p className="mt-1 text-[12px] text-[#6f6658]">
                          Inclusive of delivery and discounts
                        </p>
                      </div>

                      <p className="font-display text-[34px] font-semibold leading-none tracking-[-0.04em] text-[#332519]">
                        ₹{total.toFixed(0)}
                      </p>
                    </div>

                    {hasSavings && (
                      <div className="mt-4 rounded-[10px] bg-[#f4eddf] px-4 py-3 text-center text-[13px] font-semibold text-[#405526]">
                        You save ₹{(totalSavings + couponDiscount).toFixed(0)}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => router.push("/place-order")}
                      className="mt-5 flex h-12 w-full items-center justify-center rounded-[6px] bg-[#405526] text-sm font-semibold text-white transition-colors hover:bg-[#30421e]"
                    >
                      Continue to Checkout
                    </button>

                    <div className="mt-5 grid gap-3 text-[12px] text-[#5f5648]">
                      <MiniAssurance
                        icon={ShieldCheck}
                        text="Secure checkout and protected payment"
                      />
                      <MiniAssurance
                        icon={PackageCheck}
                        text="Carefully packed before dispatch"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}

function QuantityControl({ quantity, onDecrease, onIncrease }) {
  return (
    <div className="inline-flex w-fit items-center rounded-full border border-[#ded4c3] bg-[#fffdf8]">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onDecrease();
        }}
        className="flex h-10 w-11 items-center justify-center text-[#5f5648] transition-colors hover:text-[#405526]"
      >
        <Minus className="h-4 w-4" strokeWidth={1.8} />
      </button>

      <span className="min-w-10 text-center text-sm font-semibold text-[#332519]">
        {quantity}
      </span>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onIncrease();
        }}
        className="flex h-10 w-11 items-center justify-center text-[#5f5648] transition-colors hover:text-[#405526]"
      >
        <Plus className="h-4 w-4" strokeWidth={1.8} />
      </button>
    </div>
  );
}

function SummaryRow({ label, value, positive = false }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-[#6f6658]">{label}</span>
      <span
        className={`font-semibold ${
          positive ? "text-[#405526]" : "text-[#332519]"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function MiniAssurance({ icon: Icon, text }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 shrink-0 text-[#405526]" strokeWidth={1.7} />
      <span>{text}</span>
    </div>
  );
}

function EmptyCart({ onContinue }) {
  return (
    <div className="mx-auto max-w-[560px] rounded-[18px] border border-[#e8dfd1] bg-[#fffdf8] px-5 py-16 text-center shadow-[0_14px_40px_rgba(58,45,29,0.04)]">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#f4eddf] text-[#405526]">
        <ShoppingCart className="h-7 w-7" strokeWidth={1.6} />
      </div>

      <h2 className="mt-6 font-display text-[36px] font-medium tracking-[-0.04em] text-[#332519]">
        Your cart is empty
      </h2>

      <p className="mx-auto mt-3 max-w-[360px] text-sm leading-6 text-[#5f5648]">
        Add atta, rice, pulses, grains and everyday staples to start your order.
      </p>

      <button
        type="button"
        onClick={onContinue}
        className="mt-8 inline-flex h-11 items-center justify-center rounded-[6px] bg-[#405526] px-7 text-sm font-semibold text-white transition-colors hover:bg-[#30421e]"
      >
        Continue Shopping
      </button>
    </div>
  );
}