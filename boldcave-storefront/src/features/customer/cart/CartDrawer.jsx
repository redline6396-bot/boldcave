"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { useStoreSettings } from "@/context/StoreSettingsContext";
import { getVariantProductImageUrl } from "@/lib/clientApi";
import { requestCheckoutOpen } from "@/lib/cartEvents";
import CouponSection from "@/features/customer/checkout/CouponSection";
import {
  getCloudinaryImageUrl,
  getCloudinarySrcSet,
} from "@/lib/cloudinary/images";

const FALLBACK_IMAGE =
  "https://upload.wikimedia.org/wikipedia/commons/a/a3/Image-not-found.png";

const formatPrice = (value) =>
  new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const formatRupees = (value) => `₹${formatPrice(value)}`;

const CART_KEYBOARD_BREAKPOINT = "(max-width: 1023px)";
const KEYBOARD_HEIGHT_THRESHOLD = 80;

function getCartViewport() {
  if (typeof window === "undefined") {
    return {
      bottom: null,
      height: null,
      isCompact: false,
      isKeyboardOpen: false,
      top: 0,
    };
  }

  const viewport = window.visualViewport;
  const isCompact = window.matchMedia(CART_KEYBOARD_BREAKPOINT).matches;
  const bottom = viewport
    ? viewport.offsetTop + viewport.height
    : window.innerHeight;
  const isKeyboardOpen = Boolean(
    viewport &&
      isCompact &&
      viewport.height < window.innerHeight - KEYBOARD_HEIGHT_THRESHOLD,
  );

  return {
    bottom:
      Number.isFinite(bottom) && bottom > 0
        ? Math.floor(bottom)
        : null,
    height: viewport ? Math.floor(viewport.height) : null,
    isCompact,
    isKeyboardOpen,
    top: viewport ? Math.floor(viewport.offsetTop) : 0,
  };
}

function useCartViewport(isOpen) {
  const [cartViewport, setCartViewport] = useState({
    bottom: null,
    height: null,
    isCompact: false,
    isKeyboardOpen: false,
    top: 0,
  });

  useEffect(() => {
    if (!isOpen) return undefined;

    const updateViewport = () => {
      setCartViewport(getCartViewport());
    };

    updateViewport();

    const viewport = window.visualViewport;
    viewport?.addEventListener("resize", updateViewport);
    viewport?.addEventListener("scroll", updateViewport);
    window.addEventListener("resize", updateViewport);
    window.addEventListener("orientationchange", updateViewport);

    return () => {
      viewport?.removeEventListener("resize", updateViewport);
      viewport?.removeEventListener("scroll", updateViewport);
      window.removeEventListener("resize", updateViewport);
      window.removeEventListener("orientationchange", updateViewport);
    };
  }, [isOpen]);

  return cartViewport;
}

export default function CartDrawer({ isOpen, onClose }) {
  const router = useRouter();
  const cartViewport = useCartViewport(isOpen);
  const scrollAreaRef = useRef(null);
  const couponAreaRef = useRef(null);
  const focusGuardTimerRef = useRef(null);

  const [isSummaryOpen, setIsSummaryOpen] =
    useState(false);
  const [isCouponInputFocused, setIsCouponInputFocused] =
    useState(false);
  const [areCartActionsVisible, setAreCartActionsVisible] =
    useState(false);
  const [isCheckoutVisible, setIsCheckoutVisible] =
    useState(false);

  const {
    cart,
    getCartItems,
    getCartCount,
    getCartTotal,
    updateQuantity,
    removeFromCart,
  } = useCart();

  const { discount } = useCoupon();

  const {
    acceptingOrders,
    refreshStoreSettings,
  } = useStoreSettings();

  const items = getCartItems();
  const itemCount = getCartCount();
  const sellingSubtotal = getCartTotal();

  const mrpTotal = items.reduce((sum, item) => {
    const mrp = Number(
      item.variant?.mrp ??
        item.variant?.sellingPrice ??
        0,
    );

    return (
      sum +
      mrp * Number(item.quantity || 0)
    );
  }, 0);

  const mrpDiscount = Math.max(
    0,
    mrpTotal - sellingSubtotal,
  );

  const finalSubtotal = Math.max(
    0,
    sellingSubtotal - discount,
  );

  const totalSavings =
    mrpDiscount +
    Math.max(
      0,
      Number(discount) || 0,
    );

  const isResolving =
    cart.length > 0 &&
    items.length === 0;

  const isKeyboardMode =
    cartViewport.isKeyboardOpen ||
    (cartViewport.isCompact && isCouponInputFocused);

  const keepCouponInputVisible = useCallback(() => {
    const scrollArea = scrollAreaRef.current;
    const couponArea = couponAreaRef.current;
    const focusedElement = document.activeElement;

    if (
      !scrollArea ||
      !couponArea ||
      !focusedElement ||
      !couponArea.contains(focusedElement) ||
      !focusedElement.matches("input, textarea, select")
    ) {
      return;
    }

    const viewport = window.visualViewport;
    const scrollRect = scrollArea.getBoundingClientRect();
    const fieldRect = focusedElement.getBoundingClientRect();
    const visibleTop = Math.max(
      scrollRect.top,
      viewport?.offsetTop || 0,
    ) + 16;
    const visibleBottom = Math.min(
      scrollRect.bottom,
      viewport
        ? viewport.offsetTop + viewport.height
        : window.innerHeight,
    ) - 16;

    if (fieldRect.bottom > visibleBottom) {
      scrollArea.scrollBy({
        top: fieldRect.bottom - visibleBottom,
        behavior: "smooth",
      });
    } else if (fieldRect.top < visibleTop) {
      scrollArea.scrollBy({
        top: fieldRect.top - visibleTop,
        behavior: "smooth",
      });
    }
  }, []);

  const handleCouponFocus = useCallback(
    (event) => {
      if (!event.target.matches("input, textarea, select")) {
        return;
      }

      setIsCouponInputFocused(true);
      window.clearTimeout(focusGuardTimerRef.current);
      focusGuardTimerRef.current = window.setTimeout(
        () => setIsCouponInputFocused(false),
        700,
      );
      window.requestAnimationFrame(keepCouponInputVisible);
      window.setTimeout(keepCouponInputVisible, 180);
      window.setTimeout(keepCouponInputVisible, 360);
    },
    [keepCouponInputVisible],
  );

  const handleCouponBlur = useCallback((event) => {
    if (event.target.matches("input, textarea, select")) {
      window.clearTimeout(focusGuardTimerRef.current);
      setIsCouponInputFocused(false);
    }
  }, []);

  useEffect(
    () => () => window.clearTimeout(focusGuardTimerRef.current),
    [],
  );

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const originalOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.body.style.overflow =
        originalOverflow;

      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setIsSummaryOpen(false);
      setIsCouponInputFocused(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (
      !isOpen ||
      isKeyboardMode ||
      isResolving ||
      items.length === 0
    ) {
      setAreCartActionsVisible(false);
      return undefined;
    }

    const timer = window.setTimeout(
      () => setAreCartActionsVisible(true),
      100,
    );

    return () => window.clearTimeout(timer);
  }, [isKeyboardMode, isOpen, isResolving, items.length]);

  useEffect(() => {
    if (
      !isOpen ||
      isKeyboardMode ||
      isResolving ||
      items.length === 0
    ) {
      setIsCheckoutVisible(false);
      return undefined;
    }

    const timer = window.setTimeout(
      () => setIsCheckoutVisible(true),
      320,
    );

    return () => window.clearTimeout(timer);
  }, [isKeyboardMode, isOpen, isResolving, items.length]);

  useEffect(() => {
    if (isOpen && cartViewport.isKeyboardOpen) {
      window.requestAnimationFrame(keepCouponInputVisible);
    }
  }, [
    cartViewport.height,
    cartViewport.isKeyboardOpen,
    isOpen,
    keepCouponInputVisible,
  ]);

  useEffect(() => {
    if (isOpen) {
      refreshStoreSettings();
    }
  }, [
    isOpen,
    refreshStoreSettings,
  ]);

  const handleCheckout = () => {
    if (!acceptingOrders) {
      return;
    }

    requestCheckoutOpen();
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
          "fixed inset-y-0 right-0 z-[121] flex min-h-0 w-full max-w-[420px] flex-col overflow-hidden bg-white text-neutral-950 shadow-xl transition-transform duration-300 ease-out sm:max-w-[430px]",
          isOpen
            ? "translate-x-0"
            : "translate-x-[calc(100%+2px)]",
        ].join(" ")}
        style={{
          fontFamily:
            '"Helvetica Neue", Arial, sans-serif',
          ...(cartViewport.isKeyboardOpen && cartViewport.height
            ? {
                bottom: "auto",
                height: `${cartViewport.height}px`,
                top: `${cartViewport.top}px`,
              }
            : {}),
        }}
      >
        {/* Compact header */}

        <div className="flex h-[56px] shrink-0 items-center justify-between border-b border-neutral-200 px-5 sm:h-[62px] sm:px-6">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.11em] text-neutral-950">
            YOUR CART{" "}
            <span className="font-normal text-neutral-500">
              ({itemCount})
            </span>
          </h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close cart"
            className="-mr-1 flex h-8 w-8 cursor-pointer items-center justify-center text-black sm:mr-0 sm:h-9 sm:w-9"
          >
            <X
              className="h-[21px] w-[21px]"
              strokeWidth={1.85}
            />
          </button>
        </div>

        {/* Products + coupon scroll together. Scrollbar stays hidden visually. */}

        <div
          ref={scrollAreaRef}
          className="cart-drawer-scroll min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            WebkitOverflowScrolling: "touch",
            touchAction: "pan-y",
          }}
        >
          {isResolving ? (
            <div className="flex h-full min-h-[220px] items-center justify-center px-5 text-center">
              <p className="text-[12px] font-medium uppercase tracking-[0.1em] text-neutral-500">
                Refreshing cart...
              </p>
            </div>
          ) : items.length > 0 ? (
            <div className="flex min-h-full flex-col px-5 sm:px-6">
              {items.map(
                (
                  {
                    productId,
                    size,
                    quantity,
                    product,
                    variant,
                  },
                  index,
                ) => {
                  const stock =
                    Number(
                      variant.stock,
                    ) || 0;

                  const image =
                    getVariantProductImageUrl(
                      product,
                      variant,
                    ) ||
                    FALLBACK_IMAGE;

                  const sellingPrice =
                    Number(
                      variant.sellingPrice,
                    ) || 0;

                  const mrp =
                    Number(
                      variant.mrp,
                    ) ||
                    sellingPrice;

                  const showMrp =
                    mrp >
                    sellingPrice;

                  const isCombo =
                    product.productType ===
                    "combo";

                  const includesText =
                    isCombo
                      ? (
                          product.comboItems ||
                          []
                        )
                          .map(
                            (entry) =>
                              entry.name,
                          )
                          .filter(Boolean)
                          .join(", ")
                      : "";

                  return (
                    <div
                      key={`${productId}-${size}`}
                      className={[
                        "grid grid-cols-[88px_minmax(0,1fr)] gap-4 py-4.5",

                        index !==
                        items.length - 1
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
                          src={getCloudinaryImageUrl(
                            image,
                            {
                              width: 176,
                            },
                          )}
                          srcSet={
                            getCloudinarySrcSet(
                              image,
                              [
                                88,
                                176,
                                264,
                              ],
                            ) ||
                            undefined
                          }
                          sizes="88px"
                          alt={product.name}
                          className="h-full w-full object-contain"
                          loading={index === 0 ? "eager" : "lazy"}
                          fetchPriority={index === 0 ? "high" : "low"}
                          decoding="async"
                        />
                      </Link>

                      <div className="min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <Link
                              href={`/product/${product.slug}`}
                              onClick={
                                onClose
                              }
                              className="block cursor-pointer truncate text-[14px] font-semibold uppercase tracking-[0.04em] text-neutral-950 transition-opacity hover:opacity-60"
                            >
                              {
                                product.name
                              }
                            </Link>

                            <p className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-neutral-500">
                              {isCombo
                                ? "Perfume Combo"
                                : size}
                            </p>

                            {includesText && (
                              <p className="mt-1 text-[11px] leading-4 text-neutral-500">
                                Includes{" "}
                                {
                                  includesText
                                }
                              </p>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              removeFromCart(
                                productId,
                                size,
                              )
                            }
                            aria-label={`Remove ${product.name}`}
                            className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center text-neutral-400 transition-colors hover:text-neutral-950"
                          >
                            <Trash2
                              className="h-[15px] w-[15px]"
                              strokeWidth={
                                1.45
                              }
                            />
                          </button>
                        </div>

                        <div className="mt-2.5 flex items-baseline gap-2">
                          <span className="text-[16px] font-medium text-neutral-950">
                            {formatRupees(
                              sellingPrice,
                            )}
                          </span>

                          {showMrp && (
                            <span className="text-[11px] font-medium text-neutral-500 line-through decoration-neutral-500">
                              {formatRupees(
                                mrp,
                              )}
                            </span>
                          )}
                        </div>

                        <div className="mt-3 inline-grid h-9 grid-cols-[34px_40px_34px] overflow-hidden rounded-[3px] border border-neutral-400 bg-white">
                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(
                                productId,
                                size,
                                quantity -
                                  1,
                              )
                            }
                            disabled={
                              quantity <=
                              1
                            }
                            aria-label={`Decrease ${product.name} quantity`}
                            className="flex cursor-pointer items-center justify-center border-r border-neutral-400 text-neutral-950 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:text-neutral-300 disabled:hover:bg-white"
                          >
                            <Minus
                              className="h-3.5 w-3.5"
                              strokeWidth={
                                1.6
                              }
                            />
                          </button>

                          <span className="flex items-center justify-center text-[13px] font-semibold text-neutral-950">
                            {quantity}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(
                                productId,
                                size,
                                quantity +
                                  1,
                              )
                            }
                            disabled={
                              quantity >=
                              stock
                            }
                            aria-label={`Increase ${product.name} quantity`}
                            className="flex cursor-pointer items-center justify-center border-l border-neutral-400 text-neutral-950 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:text-neutral-300 disabled:hover:bg-white"
                          >
                            <Plus
                              className="h-3.5 w-3.5"
                              strokeWidth={
                                1.6
                              }
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                },
              )}

              {/* Keep coupons directly after the products. Anchoring this block to
                  the bottom makes it jump upward when the pricing panel expands. */}

              <div
                ref={couponAreaRef}
                onFocusCapture={handleCouponFocus}
                onBlurCapture={handleCouponBlur}
                className="border-t border-neutral-200 pb-4 pt-3 sm:pb-5 sm:pt-4"
              >
                <CouponSection
                  subtotal={
                    sellingSubtotal
                  }
                  showEligibleOffers
                  maxVisibleOffers={
                    2
                  }
                />
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-[260px] items-center justify-center px-6 pb-[10svh] text-center">
              <div>
                <p className="text-[17px] font-semibold uppercase tracking-[0.08em] text-neutral-950">
                  YOUR CART IS EMPTY
                </p>

                <p className="mx-auto mt-3 max-w-[260px] text-[14px] leading-6 text-neutral-500">
                  Your next fragrance is
                  waiting.
                </p>

                <button
                  type="button"
                  onClick={
                    handleShopNow
                  }
                  className="mt-6 cursor-pointer border-0 bg-transparent p-0 text-[12px] font-semibold uppercase tracking-[0.11em] text-neutral-950 underline decoration-neutral-400 decoration-[0.75px] underline-offset-[6px] transition-colors duration-200 hover:text-neutral-700 hover:decoration-neutral-700"
                >
                  EXPLORE FRAGRANCES{" "}
                  {"\u2192"}
                </button>
              </div>
            </div>
          )}
        </div>

        {items.length > 0 && !isKeyboardMode && (
          <div
            className={[
              "cart-drawer-scroll mb-[78px] min-h-0 max-h-[min(42svh,320px)] shrink overflow-y-auto bg-white transition-opacity duration-200",
              areCartActionsVisible
                ? "opacity-100"
                : "pointer-events-none opacity-0",
            ].join(" ")}
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {/* Pricing details can scroll without pushing checkout off-screen. */}

            <div className="relative bg-[#f3f3f3] px-4 pb-3 pt-3">
              <button
                type="button"
                onClick={() =>
                  setIsSummaryOpen(
                    (current) =>
                      !current,
                  )
                }
                aria-expanded={
                  isSummaryOpen
                }
                className="flex h-12 w-full cursor-pointer items-center justify-between px-2 text-neutral-950 transition-colors hover:text-neutral-700 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-neutral-500"
              >
                <span className="flex items-center gap-2.5 text-[15px] font-medium">
                  Subtotal

                  {isSummaryOpen ? (
                    <ChevronUp
                      className="h-4 w-4"
                      strokeWidth={
                        1.6
                      }
                    />
                  ) : (
                    <ChevronDown
                      className="h-4 w-4"
                      strokeWidth={
                        1.6
                      }
                    />
                  )}
                </span>

                <span className="text-[16px] font-medium">
                  {formatRupees(
                    finalSubtotal,
                  )}
                </span>
              </button>

              {isSummaryOpen && (
                <div className="mb-3 border-y border-neutral-200 bg-white px-2 py-3">
                  <div className="space-y-3 text-[13px] leading-none">
                    <div className="flex items-center justify-between text-neutral-800">
                      <span>
                        MRP Total
                      </span>

                      <span className="font-medium">
                        {formatRupees(
                          mrpTotal,
                        )}
                      </span>
                    </div>

                    {mrpDiscount >
                      0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-800">
                          Discount on
                          MRP
                        </span>

                        <span className="font-medium text-[#2d7a3e]">
                          -
                          {formatRupees(
                            mrpDiscount,
                          )}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-neutral-800">
                      <span>
                        Subtotal
                      </span>

                      <span className="font-medium">
                        {formatRupees(
                          sellingSubtotal,
                        )}
                      </span>
                    </div>

                    {discount >
                      0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-800">
                          Coupon
                          Discount
                        </span>

                        <span className="font-medium text-[#2d7a3e]">
                          -
                          {formatRupees(
                            discount,
                          )}
                        </span>
                      </div>
                    )}

                    {totalSavings >
                      0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-800">
                          Total
                          Discount
                        </span>

                        <span className="font-medium text-[#2d7a3e]">
                          -
                          {formatRupees(
                            totalSavings,
                          )}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-neutral-800">
                      <span>
                        Shipping
                      </span>

                      <span className="font-medium text-neutral-950">
                        FREE
                      </span>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

      </aside>

      {items.length > 0 && !isKeyboardMode && (
          <div
            className={[
              "fixed bottom-auto right-0 z-[122] w-full max-w-[420px] transition-[transform,opacity] duration-300 ease-out sm:max-w-[430px]",
              isCheckoutVisible
                ? "translate-y-0 opacity-100"
                : "pointer-events-none translate-y-full opacity-0",
            ].join(" ")}
            style={{
              top: cartViewport.bottom
                ? `${cartViewport.bottom}px`
                : "100svh",
            }}
          >
          <div className="-translate-y-full border-t border-neutral-200 bg-white px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_rgba(0,0,0,0.08)]">
            <button
              type="button"
              onClick={handleCheckout}
              disabled={!acceptingOrders}
              className="flex h-[54px] w-full cursor-pointer items-center justify-center gap-2 rounded-[3px] bg-neutral-950 text-[15px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-600 disabled:hover:opacity-100"
            >
              <span>
                {acceptingOrders
                  ? "Checkout"
                  : "Currently Not Accepting Orders"}
              </span>

              {acceptingOrders && (
                <ChevronRight
                  className="h-5 w-5"
                  strokeWidth={1.7}
                />
              )}
            </button>
          </div>
          </div>
        )}

      <style jsx>{`
        .cart-drawer-scroll::-webkit-scrollbar {
          width: 0;
          height: 0;
          display: none;
        }
      `}</style>
    </>
  );
}
