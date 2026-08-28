"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { validateCoupon } from "@/lib/clientApi";
import { useCart } from "@/context/CartContext";

const COUPON_STORAGE_KEY = "perfume_coupon_code";
const CouponContext = createContext(undefined);

const cartPayload = (cart) =>
  cart.map(({ productId, size, quantity }) => ({
    productId,
    size,
    quantity,
  }));

export default function CouponProvider({ children }) {
  const { cart } = useCart();
  const cartSignature = useMemo(() => JSON.stringify(cartPayload(cart)), [cart]);
  const previousCartSignature = useRef(cartSignature);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [discount, setDiscount] = useState(0);
  const [serverSubtotal, setServerSubtotal] = useState(0);
  const [serverTotal, setServerTotal] = useState(0);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    try {
      const storedCode = window.localStorage.getItem(COUPON_STORAGE_KEY);
      if (storedCode) {
        setCouponCode(storedCode);
      }
    } catch {
      setCouponCode("");
    }
  }, []);

  const removeCoupon = useCallback(() => {
    setCouponCode("");
    setAppliedCoupon(null);
    setDiscount(0);
    setServerSubtotal(0);
    setServerTotal(0);
    setError("");
    setMessage("");

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(COUPON_STORAGE_KEY);
    }
  }, []);

  const applyCoupon = useCallback(
    async (codeOverride, options = {}) => {
      const code = String(codeOverride ?? couponCode).trim().toUpperCase();
      const items = cartPayload(cart);

      if (!code) {
        setError("Enter a coupon code.");
        setMessage("");
        return null;
      }

      if (!items.length) {
        setError("Add items to your cart before applying a coupon.");
        setMessage("");
        return null;
      }

      setValidating(true);
      setError("");
      setMessage("");

      try {
        const result = await validateCoupon({
          items,
          couponCode: code,
          paymentMethod: options.paymentMethod,
        });
        setCouponCode(code);
        setAppliedCoupon(result.coupon || null);
        setDiscount(Number(result.discount) || 0);
        setServerSubtotal(Number(result.subtotal) || 0);
        setServerTotal(Number(result.total) || 0);
        setMessage(result.message || "Coupon applied.");

        if (typeof window !== "undefined") {
          window.localStorage.setItem(COUPON_STORAGE_KEY, code);
        }

        return result;
      } catch (couponError) {
        setAppliedCoupon(null);
        setDiscount(0);
        setServerSubtotal(0);
        setServerTotal(0);
        setError(couponError.message || "Unable to apply coupon.");
        return null;
      } finally {
        setValidating(false);
      }
    },
    [cart, couponCode]
  );

  const revalidateCoupon = useCallback(async (options = {}) => {
    if (!appliedCoupon?.code && !couponCode) {
      return null;
    }

    return applyCoupon(appliedCoupon?.code || couponCode, options);
  }, [appliedCoupon?.code, applyCoupon, couponCode]);

  useEffect(() => {
    if (previousCartSignature.current === cartSignature) {
      return;
    }

    previousCartSignature.current = cartSignature;

    if (!cart.length) {
      removeCoupon();
      return;
    }

    if (appliedCoupon?.code) {
      revalidateCoupon();
    }
  }, [cart, appliedCoupon?.code, removeCoupon, revalidateCoupon]);

  const value = useMemo(
    () => ({
      couponCode,
      setCouponCode,
      appliedCoupon,
      discount,
      serverSubtotal,
      serverTotal,
      validating,
      error,
      message,
      applyCoupon,
      revalidateCoupon,
      removeCoupon,
    }),
    [
      appliedCoupon,
      applyCoupon,
      couponCode,
      discount,
      error,
      message,
      removeCoupon,
      revalidateCoupon,
      serverSubtotal,
      serverTotal,
      validating,
    ]
  );

  return <CouponContext.Provider value={value}>{children}</CouponContext.Provider>;
}

export function useCoupon() {
  const context = useContext(CouponContext);

  if (!context) {
    throw new Error("useCoupon must be used within CouponProvider");
  }

  return context;
}
